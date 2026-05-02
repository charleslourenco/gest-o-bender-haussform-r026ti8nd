import { useState, useEffect } from 'react'
import { ArrowLeft, Plus, FileText, Loader2, Download } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { DocumentRow } from './document-row'
import { Timeline } from './timeline'
import { useToast } from '@/components/ui/use-toast'
import { gerarDocumentoCliente } from '@/services/gerar-documento-cliente'

const SECTIONS = [
  {
    title: 'SEÇÃO 1 — DOCS OBRIGATÓRIOS VINDOS DE TEMPLATES',
    docs: [
      {
        id: 'contrato',
        title: '01 | Contrato',
        actions: ['trocar', 'editar', 'ler', 'baixar', 'enviar'],
      },
      {
        id: 'termo_conclusao',
        title: '02 | Termo de conclusão e vistoria',
        actions: ['trocar', 'editar', 'ler', 'baixar', 'enviar'],
      },
      {
        id: 'termo_garantia',
        title: '03 | Termo de garantia',
        actions: ['trocar', 'editar', 'ler', 'baixar', 'enviar'],
      },
    ],
  },
  {
    title: 'SEÇÃO 2 — DOCS OBRIGATÓRIOS QUE PRECISAM SER SUBIDOS E ASSINADOS',
    docs: [
      {
        id: 'ata_reuniao',
        title: '04 | Ata de reunião de Análise',
        actions: ['trocar', 'editar', 'ler', 'baixar', 'enviar'],
      },
      {
        id: 'caderno_tecnico',
        title: '05 | Caderno Técnico',
        actions: ['trocar', 'editar', 'ler', 'baixar', 'enviar'],
      },
    ],
  },
  {
    title: 'SEÇÃO 3 — DOCS OBRIGATÓRIOS QUE NÃO PRECISAM DE ASSINATURA',
    docs: [
      { id: 'renders', title: '06 | Renders', actions: ['trocar', 'ler', 'baixar'] },
      {
        id: 'arquivo_projeto',
        title: '07 | Arquivo do projeto',
        actions: ['trocar', 'ler', 'baixar'],
      },
      {
        id: 'drafts_medida',
        title: '08 | Drafts de medida fina',
        actions: ['trocar', 'ler', 'baixar'],
      },
    ],
  },
  {
    title: 'SEÇÃO 4 — DOCS ÚTEIS VINDOS DE TEMPLATES E NÃO OBRIGATÓRIOS',
    docs: [
      {
        id: 'termo_recusa',
        title: '09 | Termo de Recusa de participação em reunião de análise',
        actions: ['trocar', 'editar', 'ler', 'baixar', 'enviar'],
      },
      {
        id: 'termo_representacao',
        title: '10 | Termo de Representação em Reunião de Análise',
        actions: ['trocar', 'editar', 'ler', 'baixar', 'enviar'],
      },
      {
        id: 'termo_nao_conformidade',
        title: '11 | Termo de Não conformidade',
        actions: ['trocar', 'editar', 'ler', 'baixar', 'enviar'],
      },
    ],
  },
]

export function ClienteFolder({ formId, onBack }: { formId: string; onBack: () => void }) {
  const [data, setData] = useState<any>(null)
  const [documents, setDocuments] = useState<any[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const { toast } = useToast()

  const loadDocuments = async () => {
    if (!formId) return
    const { data: docs } = await supabase
      .from('documentos_cliente')
      .select('*')
      .eq('projeto_id', formId)
      .order('criado_em', { ascending: false })

    setDocuments(docs || [])
  }

  const handleGerarDossie = async () => {
    if (!data?.id || !data?.cliente_id) {
      toast({
        title: 'Erro',
        description: 'Dados do projeto não encontrados.',
        variant: 'destructive',
      })
      return
    }

    setIsGenerating(true)
    try {
      const res = await gerarDocumentoCliente({
        cliente_id: data.cliente_id,
        projeto_id: data.id,
      })

      if (res.error) throw res.error

      const result = res.data

      if (result.erros && result.erros.length > 0) {
        toast({
          title: 'Atenção',
          description: `Dossiê gerado com sucesso para ${result.gerados?.length || 0} templates. Erros em: ${result.erros.map((e: any) => e.template || e.tipo).join(', ')}`,
          variant: 'default',
        })
      } else {
        toast({
          title: 'Sucesso!',
          description: 'Dossiê gerado com sucesso para todos os templates.',
        })
      }

      await loadDocuments()
    } catch (err: any) {
      toast({
        title: 'Erro ao gerar dossiê',
        description: err.message || 'Tente novamente em alguns instantes.',
        variant: 'destructive',
      })
    } finally {
      setIsGenerating(false)
    }
  }

  useEffect(() => {
    async function load() {
      const { data: form } = await supabase
        .from('formulario_comercial')
        .select('id, cliente_id, datas, produtos_servicos, cliente:clientes(id, nome), usuario_id')
        .or(`id.eq.${formId},cliente_id.eq.${formId}`)
        .order('criado_em', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (form) {
        const { data: user } = await supabase
          .from('users')
          .select('nome')
          .eq('id', form.usuario_id)
          .maybeSingle()
        const valor = Array.isArray(form.produtos_servicos)
          ? form.produtos_servicos.reduce((acc, p) => acc + (Number(p.valor_total) || 0), 0)
          : 0

        setData({
          id: form.id,
          cliente_id:
            form.cliente_id ||
            (Array.isArray(form.cliente) && form.cliente[0]
              ? form.cliente[0].id
              : form.cliente?.id),
          numero: form.id.slice(0, 8),
          cliente: form.cliente
            ? Array.isArray(form.cliente)
              ? form.cliente[0].nome
              : form.cliente.nome
            : 'Sem Nome',
          data_venda: form.datas?.data_venda || '-',
          valor,
          vendedor: user?.nome || '-',
        })
      }
    }
    if (formId) {
      load()
      loadDocuments()
    }
  }, [formId])

  return (
    <div className="p-4 md:p-6 flex flex-col h-full overflow-hidden space-y-6 animate-in fade-in duration-300 bg-background">
      <div className="bg-card p-4 md:p-6 rounded-xl flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 shrink-0 text-card-foreground shadow-sm border border-border">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="text-muted-foreground hover:bg-muted hover:text-foreground shrink-0"
        >
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <div className="flex-1 grid grid-cols-2 md:flex md:flex-row gap-4 md:gap-8 w-full">
          <div className="border-r border-border pr-4 md:pr-8">
            <p className="text-xs text-muted-foreground uppercase font-semibold">Projeto</p>
            <p className="text-sm md:text-lg font-bold text-foreground">#{data?.numero || '-'}</p>
          </div>
          <div className="border-r border-border pr-4 md:pr-8">
            <p className="text-xs text-muted-foreground uppercase font-semibold">Cliente</p>
            <p className="text-sm md:text-lg font-bold text-foreground">{data?.cliente || '-'}</p>
          </div>
          <div className="border-r border-border pr-4 md:pr-8">
            <p className="text-xs text-muted-foreground uppercase font-semibold">Data Venda</p>
            <p className="text-sm md:text-lg font-bold text-foreground">
              {data?.data_venda && data.data_venda !== '-'
                ? new Date(data.data_venda).toLocaleDateString('pt-BR')
                : '-'}
            </p>
          </div>
          <div className="border-r border-border pr-4 md:pr-8">
            <p className="text-xs text-muted-foreground uppercase font-semibold">Valor</p>
            <p className="text-sm md:text-lg font-bold text-foreground">
              {data
                ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    data.valor,
                  )
                : '-'}
            </p>
          </div>
          <div className="col-span-2 md:col-span-1">
            <p className="text-xs text-muted-foreground uppercase font-semibold">Vendedor</p>
            <p className="text-sm md:text-lg font-bold text-foreground">{data?.vendedor || '-'}</p>
          </div>
          <div className="col-span-2 md:col-span-1 md:ml-auto self-end md:self-center pt-2 md:pt-0">
            <Button
              id="gerar-dossie"
              className="gerar-dossie w-full md:w-auto bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleGerarDossie}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Gerando...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" /> Gerar Dossiê
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row flex-1 gap-6 min-h-0">
        <div className="flex-1 bg-background rounded-xl shadow-sm border border-border overflow-y-auto p-4 md:p-6 space-y-8">
          {documents.length > 0 && (
            <div>
              <h3 className="text-xs md:text-sm font-bold text-foreground mb-4 bg-muted/30 border-b border-border p-3 rounded-t-md flex items-center justify-between">
                <span>DOCUMENTOS GERADOS NO DOSSIÊ</span>
                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs">
                  {documents.length}
                </span>
              </h3>
              <div className="space-y-2 pl-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 border border-border rounded-lg bg-card shadow-sm hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {doc.template_nome || doc.tipo || 'Documento'}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          Status: {doc.status.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                    {doc.arquivo_url && (
                      <a href={doc.arquivo_url} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="outline" className="h-8 gap-2">
                          <Download className="w-3.5 h-3.5" /> Baixar
                        </Button>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {SECTIONS.map((section, idx) => (
            <div key={idx}>
              <h3 className="text-xs md:text-sm font-bold text-foreground mb-4 bg-muted/30 border-b border-border p-3 rounded-t-md">
                {section.title}
              </h3>
              <div className="space-y-2 pl-2">
                {section.docs.map((doc) => (
                  <DocumentRow key={doc.id} doc={doc} />
                ))}
              </div>
            </div>
          ))}

          <div>
            <div className="flex items-center justify-between bg-muted/30 border-b border-border p-3 rounded-t-md mb-4">
              <h3 className="text-xs md:text-sm font-bold text-foreground">
                SEÇÃO 5 — DOCS EXTRAS
              </h3>
              <Button
                size="sm"
                className="bg-primary text-primary-foreground hover:bg-primary/90 h-8"
              >
                <Plus className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" /> Adicionar Documento
              </Button>
            </div>
            <div className="pl-2 text-sm text-muted-foreground italic">
              Nenhum documento extra adicionado.
            </div>
          </div>
        </div>

        <div className="w-full lg:w-[350px] bg-card rounded-xl shadow-sm border border-border overflow-y-auto p-4 md:p-6">
          <Timeline />
        </div>
      </div>
    </div>
  )
}
