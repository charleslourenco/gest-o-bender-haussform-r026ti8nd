import { useState } from 'react'
import { FileDropzone } from '@/components/ui/file-dropzone'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { fileToBase64, uploadFileToStorage } from '@/services/ocr'
import { processarOrcamentoOcr } from '@/services/orcamento-ocr'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Trash2, ArrowLeft, Save, FileText } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'

export default function UploadOrcamento() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any>(null)
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const { toast } = useToast()
  const navigate = useNavigate()
  const { user } = useAuth()

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile)
    setLoading(true)
    try {
      const url = await uploadFileToStorage(selectedFile)
      setFileUrl(url)

      const base64 = await fileToBase64(selectedFile)
      const ocrData = await processarOrcamentoOcr(base64, selectedFile.type, selectedFile.name)

      if (ocrData.confianca < 70) {
        toast({
          title: 'Atenção na revisão',
          description:
            'A leitura do documento teve baixa confiança. Por favor, revise os dados com cuidado.',
          variant: 'destructive',
        })
      }

      setData({
        cliente: ocrData.cliente || '',
        ambiente: ocrData.ambiente || '',
        descricao: ocrData.descricao || '',
        itens: Array.isArray(ocrData.itens)
          ? ocrData.itens.map((i: any) => ({
              id: Math.random().toString(),
              nome_item: i.nome_item || '',
              quantidade: Number(i.quantidade) || 1,
              custo_unitario: Number(i.custo_unitario) || 0,
            }))
          : [],
      })
    } catch (error: any) {
      toast({
        title: 'Erro no processamento',
        description: error.message,
        variant: 'destructive',
      })
      setFile(null)
    } finally {
      setLoading(false)
    }
  }

  const handleItemChange = (id: string, field: string, value: any) => {
    setData((prev: any) => ({
      ...prev,
      itens: prev.itens.map((item: any) => (item.id === id ? { ...item, [field]: value } : item)),
    }))
  }

  const removeItem = (id: string) => {
    setData((prev: any) => ({
      ...prev,
      itens: prev.itens.filter((item: any) => item.id !== id),
    }))
  }

  const addItem = () => {
    setData((prev: any) => ({
      ...prev,
      itens: [
        ...prev.itens,
        { id: Math.random().toString(), nome_item: 'Novo Item', quantidade: 1, custo_unitario: 0 },
      ],
    }))
  }

  const handleSave = async () => {
    try {
      if (!data) return

      const valorTotal = data.itens.reduce(
        (acc: number, item: any) => acc + item.quantidade * item.custo_unitario,
        0,
      )

      const { data: orcamento, error: orcError } = await supabase
        .from('orcamentos')
        .insert({
          ambiente: data.ambiente,
          descricao: data.descricao,
          user_id: user?.id,
          status: 'Rascunho',
          valor_total: valorTotal,
          arquivo_url: fileUrl,
        })
        .select()
        .single()

      if (orcError) throw orcError

      if (data.itens.length > 0) {
        const itensToInsert = data.itens.map((item: any) => ({
          orcamento_id: orcamento.id,
          nome_item: item.nome_item,
          quantidade: item.quantidade,
          preco_custo: item.custo_unitario,
          preco_venda: item.custo_unitario * 2.5, // Default markup base
        }))

        const { error: itensError } = await supabase.from('itens_orcamento').insert(itensToInsert)
        if (itensError) throw itensError
      }

      toast({ title: 'Orçamento salvo com sucesso!' })
      navigate('/orcamentos')
    } catch (error: any) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' })
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="h-6 w-6 text-emerald-500" />
            Importar Orçamento via OCR
          </h1>
          <p className="text-gray-500 mt-1">
            Faça upload de um documento para preencher automaticamente os dados.
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/orcamentos')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
      </div>

      {!data && (
        <Card>
          <CardContent className="pt-6">
            <FileDropzone onFileSelect={handleFileSelect} loading={loading} />
          </CardContent>
        </Card>
      )}

      {data && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Dados Gerais</CardTitle>
              <CardDescription>Revise as informações extraídas do documento.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cliente Extraído</Label>
                  <Input
                    value={data.cliente}
                    onChange={(e) => setData({ ...data, cliente: e.target.value })}
                    placeholder="Nome do cliente (apenas referência)"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ambiente</Label>
                  <Input
                    value={data.ambiente}
                    onChange={(e) => setData({ ...data, ambiente: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descrição / Notas</Label>
                <Textarea
                  value={data.descricao}
                  onChange={(e) => setData({ ...data, descricao: e.target.value })}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Itens do Orçamento</CardTitle>
                <CardDescription>Revise os valores e quantidades extraídos.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={addItem}>
                Adicionar Item
              </Button>
            </CardHeader>
            <CardContent>
              {data.itens.length === 0 ? (
                <p className="text-center text-gray-500 py-4">Nenhum item extraído.</p>
              ) : (
                <div className="space-y-3">
                  {data.itens.map((item: any) => (
                    <div
                      key={item.id}
                      className="flex flex-wrap md:flex-nowrap gap-3 items-end p-3 border rounded-lg bg-gray-50/50"
                    >
                      <div className="space-y-1 flex-1 min-w-[200px]">
                        <Label className="text-xs">Descrição do Item</Label>
                        <Input
                          value={item.nome_item}
                          onChange={(e) => handleItemChange(item.id, 'nome_item', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1 w-[100px]">
                        <Label className="text-xs">Qtd.</Label>
                        <Input
                          type="number"
                          value={item.quantidade}
                          onChange={(e) =>
                            handleItemChange(item.id, 'quantidade', Number(e.target.value))
                          }
                        />
                      </div>
                      <div className="space-y-1 w-[140px]">
                        <Label className="text-xs">Custo Unitário (R$)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.custo_unitario}
                          onChange={(e) =>
                            handleItemChange(item.id, 'custo_unitario', Number(e.target.value))
                          }
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setData(null)}>
              Cancelar / Re-importar
            </Button>
            <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700">
              <Save className="h-4 w-4 mr-2" />
              Salvar Orçamento
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
