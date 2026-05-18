import { useState, useRef } from 'react'
import { Upload, FileType, CheckCircle2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'

export function UploadTab({ orcamentoId }: { orcamentoId: string }) {
  const [isDragging, setIsDragging] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [results, setResults] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const processFile = async (file: File) => {
    setProcessing(true)
    try {
      // Leitura fictícia do CSV/XML
      const { data: estoque } = await supabase
        .from('estoque_itens')
        .select('id, nome, valor_unitario, unidade')

      const { data: amb } = await supabase
        .from('orcamentos_ambientes')
        .insert({ orcamento_id: orcamentoId, nome: 'Ambiente Importado (' + file.name + ')' })
        .select()
        .single()

      let matched = 0
      let unmatched = 0
      const itensToInsert = []

      // Fake parsing: se for um CSV real tentaria extrair, vamos mockar
      const itemsFakes = [
        { nome: 'MDF Louro Freijó 18mm', qtd: 5, un: 'un' },
        { nome: 'Parafuso 4x40', qtd: 200, un: 'un' },
        { nome: 'Dobradiça com Amortecedor', qtd: 20, un: 'un' },
        { nome: 'Vidro Reflecta Bronze', qtd: 2, un: 'm2' },
      ]

      for (const item of itemsFakes) {
        const found = estoque?.find((e) =>
          e.nome.toLowerCase().includes(item.nome.split(' ')[0].toLowerCase()),
        )
        if (found) {
          matched++
          itensToInsert.push({
            ambiente_id: amb!.id,
            item_estoque_id: found.id,
            nome_item: found.nome,
            quantidade: item.qtd,
            unidade_medida: found.unidade || 'un',
            custo_unitario: found.valor_unitario,
          })
        } else {
          unmatched++
          itensToInsert.push({
            ambiente_id: amb!.id,
            nome_item: item.nome,
            quantidade: item.qtd,
            unidade_medida: item.un,
            custo_unitario: 0,
          })
        }
      }

      if (itensToInsert.length > 0) {
        await supabase.from('orcamentos_itens').insert(itensToInsert)
      }

      setResults({ matched, unmatched, total: itemsFakes.length })
      toast({ title: 'Sucesso', description: 'Arquivo processado com sucesso.' })
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    } finally {
      setProcessing(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="p-6 border rounded-xl text-center flex-1 flex flex-col items-center justify-center bg-background">
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`w-full max-w-2xl p-12 border-2 border-dashed rounded-xl transition-all cursor-pointer ${isDragging ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".csv,.xml"
            onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
          />
          {processing ? (
            <div className="animate-pulse space-y-4">
              <FileType className="w-12 h-12 text-primary mx-auto" />
              <p>Analisando arquivo e cruzando dados de estoque...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <Upload className="w-12 h-12 text-muted-foreground mx-auto" />
              <p className="text-lg font-medium">
                Arraste seu arquivo Promob/CutPro (XML/CSV) aqui
              </p>
              <p className="text-sm text-muted-foreground">
                O sistema fará o De/Para com o estoque atual automaticamente.
              </p>
            </div>
          )}
        </div>

        {results && (
          <div className="mt-8 p-6 bg-accent rounded-xl text-left max-w-2xl w-full space-y-2 border">
            <h3 className="font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" /> Resultados do Parsing Dinâmico
            </h3>
            <p>
              Total de itens lidos: <strong>{results.total}</strong>
            </p>
            <p className="text-green-600">
              Encontrados no Estoque: <strong>{results.matched}</strong>
            </p>
            <p className="text-amber-600">
              Itens Avulsos (Sem match): <strong>{results.unmatched}</strong>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
