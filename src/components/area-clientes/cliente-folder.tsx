import { useState, useEffect } from 'react'
import { ArrowLeft, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { DocumentRow } from './document-row'
import { Timeline } from './timeline'

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

  useEffect(() => {
    async function load() {
      const { data: form } = await supabase
        .from('formulario_comercial')
        .select('id, datas, produtos_servicos, cliente:clientes(id, nome), usuario_id')
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
    if (formId) load()
  }, [formId])

  return (
    <div className="p-4 md:p-6 flex flex-col h-full overflow-hidden space-y-6 animate-in fade-in duration-300 bg-midnight-navy">
      <div className="bg-dark-denim p-4 md:p-6 rounded-xl flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 shrink-0 text-off-white shadow-md border border-pale-cornflower">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="text-off-white hover:bg-steel-blue hover:text-off-white shrink-0"
        >
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <div className="flex-1 grid grid-cols-2 md:flex md:flex-row gap-4 md:gap-8 w-full">
          <div className="border-r border-pale-cornflower pr-4 md:pr-8">
            <p className="text-xs text-off-white/70 uppercase font-semibold">Projeto</p>
            <p className="text-sm md:text-lg font-bold text-off-white">#{data?.numero || '-'}</p>
          </div>
          <div className="border-r border-pale-cornflower pr-4 md:pr-8">
            <p className="text-xs text-off-white/70 uppercase font-semibold">Cliente</p>
            <p className="text-sm md:text-lg font-bold text-off-white">{data?.cliente || '-'}</p>
          </div>
          <div className="border-r border-pale-cornflower pr-4 md:pr-8">
            <p className="text-xs text-off-white/70 uppercase font-semibold">Data Venda</p>
            <p className="text-sm md:text-lg font-bold text-off-white">
              {data?.data_venda && data.data_venda !== '-'
                ? new Date(data.data_venda).toLocaleDateString('pt-BR')
                : '-'}
            </p>
          </div>
          <div className="border-r border-pale-cornflower pr-4 md:pr-8">
            <p className="text-xs text-off-white/70 uppercase font-semibold">Valor</p>
            <p className="text-sm md:text-lg font-bold text-off-white">
              {data
                ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    data.valor,
                  )
                : '-'}
            </p>
          </div>
          <div className="col-span-2 md:col-span-1">
            <p className="text-xs text-off-white/70 uppercase font-semibold">Vendedor</p>
            <p className="text-sm md:text-lg font-bold text-off-white">{data?.vendedor || '-'}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row flex-1 gap-6 min-h-0">
        <div className="flex-1 bg-midnight-navy rounded-xl shadow-sm border border-pale-cornflower overflow-y-auto p-4 md:p-6 space-y-8">
          {SECTIONS.map((section, idx) => (
            <div key={idx}>
              <h3 className="text-xs md:text-sm font-bold text-off-white mb-4 bg-midnight-navy border-b border-pale-cornflower p-3 rounded-t-md">
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
            <div className="flex items-center justify-between bg-midnight-navy border-b border-pale-cornflower p-3 rounded-t-md mb-4">
              <h3 className="text-xs md:text-sm font-bold text-off-white">SEÇÃO 5 — DOCS EXTRAS</h3>
              <Button
                size="sm"
                className="bg-steel-blue text-off-white hover:bg-midnight-navy hover:border hover:border-steel-blue h-8"
              >
                <Plus className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" /> Adicionar Documento
              </Button>
            </div>
            <div className="pl-2 text-sm text-off-white/60 italic">
              Nenhum documento extra adicionado.
            </div>
          </div>
        </div>

        <div className="w-full lg:w-[350px] bg-dark-denim rounded-xl shadow-sm border border-pale-cornflower overflow-y-auto p-4 md:p-6">
          <Timeline />
        </div>
      </div>
    </div>
  )
}
