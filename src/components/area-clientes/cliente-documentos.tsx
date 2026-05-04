import { useState, useEffect } from 'react'
import { FileText, Download, Upload, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function ClienteDocumentos({ dossie, onReload }: { dossie: any; onReload: () => void }) {
  const [docs, setDocs] = useState<any[]>([])
  const [templates, setTemplates] = useState<any[]>([])
  const [generating, setGenerating] = useState(false)

  const loadDocs = async () => {
    const { data } = await supabase
      .from('documentos_cliente')
      .select('*')
      .eq('cliente_id', dossie.cliente_id)
    if (data) setDocs(data)
  }

  const loadTemplates = async () => {
    const { data } = await supabase.from('templates').select('*').eq('status', 'ativo')
    if (data) setTemplates(data)
  }

  useEffect(() => {
    loadDocs()
    loadTemplates()
  }, [dossie.cliente_id])

  const form = dossie.formulario || {}
  const prods =
    typeof form.produtos_servicos === 'string'
      ? JSON.parse(form.produtos_servicos || '[]')
      : form.produtos_servicos || []
  const valTot = Array.isArray(prods)
    ? prods.reduce(
        (a: number, p: any) => a + Number(p.valor_unitario || 0) * Number(p.qtd || 1),
        0,
      ) - (Number(form.desconto) || 0)
    : 0

  const hasContratoGerado = docs.some(
    (d) => d.tipo === 'contrato' || d.template_nome?.toLowerCase().includes('contrato'),
  )

  const handleGerarContrato = async () => {
    setGenerating(true)
    toast.info('Gerando contrato...', { id: 'gerar-doc' })
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token

      const valFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
        valTot,
      )

      const body = {
        cliente: dossie.cliente?.nome || '',
        valor: valFmt,
        vendedor: dossie.vendedorNome || '',
        data: (form.datas as any)?.data_venda || new Date().toISOString().split('T')[0],
      }

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gerar_documento_cliente`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        },
      )

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Erro na edge function')
      }

      const json = await res.json()

      await supabase.from('documentos_cliente').insert({
        cliente_id: dossie.cliente_id,
        tipo: 'contrato',
        status: 'Gerado',
        arquivo_url: json.documento_url,
        template_nome: 'Contrato Gerado',
      })

      toast.dismiss('gerar-doc')
      toast.success('Contrato gerado com sucesso!')
      loadDocs()
      onReload()
    } catch (e: any) {
      toast.dismiss('gerar-doc')
      toast.error('Falha ao gerar contrato: ' + e.message)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 items-center mb-6">
        {!hasContratoGerado && (
          <Button
            onClick={handleGerarContrato}
            disabled={generating}
            className="bg-dark-denim hover:bg-dark-denim/90 font-bold"
          >
            <FileText className="w-4 h-4 mr-2" /> 📄 Gerar Contrato
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="font-bold border-2 border-steel-blue">
              <Plus className="w-4 h-4 mr-2" /> Acrescentar documento ▼
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {templates.length === 0 ? (
              <DropdownMenuItem disabled>Nenhum template ativo</DropdownMenuItem>
            ) : (
              templates.map((t) => <DropdownMenuItem key={t.id}>{t.nome}</DropdownMenuItem>)
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="outline" className="font-bold border-2 border-steel-blue">
          <Upload className="w-4 h-4 mr-2" /> Upload de arquivo
        </Button>
      </div>

      <div className="bg-off-white border-2 border-steel-blue rounded-lg p-6">
        <h3 className="font-bold text-lg mb-4 text-midnight-navy">Documentos Gerados</h3>
        {docs.length === 0 ? (
          <p className="text-steel-blue italic">Nenhum documento encontrado para este cliente.</p>
        ) : (
          <div className="space-y-3">
            {docs.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between bg-pale-cornflower p-4 rounded border border-steel-blue"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-midnight-navy" />
                  <div>
                    <p className="font-bold text-midnight-navy">{doc.template_nome || doc.tipo}</p>
                    <p className="text-xs text-steel-blue">
                      Gerado em: {new Date(doc.criado_em).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
                {doc.arquivo_url && (
                  <Button variant="ghost" size="sm" asChild>
                    <a href={doc.arquivo_url} target="_blank" rel="noopener noreferrer">
                      <Download className="w-4 h-4" />
                    </a>
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
