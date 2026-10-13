import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { runWithAuthRecovery } from '@/lib/supabase/auth-recovery'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Users,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  CalendarDays,
  Clock,
  Sparkles,
  PieChart as PieIcon,
  BarChart3,
  AlertTriangle,
  ClipboardList,
  Info,
  DollarSign,
  Hourglass,
  Zap,
  Timer,
  CheckCircle2,
  XCircle,
  Layers,
  HelpCircle,
  Send,
  FileSpreadsheet,
  LayoutDashboard,
  MessageSquare,
  Calculator,
  Briefcase,
  UserCheck,
} from 'lucide-react'
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  PieChart,
  Pie,
} from 'recharts'
import { cleanColumnTitle, ATENDIMENTO_ABAS } from '@/components/comercial/constants'
import { CoorteConversaoTab } from './CoorteConversaoTab'
import { FunilRealSubTab } from './FunilRealSubTab'
import type {
  AtendimentosMetrics,
  NovoContatoMetrics,
  OrcamentosMetrics,
  ConsultoriaMetrics,
  TempoColunaItem,
  TempoColunasMetrics,
  OrigemDespachoPerdaItem,
  OrigemDespachoPerdaComparativoItem,
} from './types'

const ORIGIN_COLORS = [
  '#e1306c', // instagram pink
  '#8b5cf6', // indicação purple
  '#0284c7', // recompra blue
  '#4285f4', // google blue
  '#1877F2', // meta ads blue
  '#f59e0b', // corretor amber
  '#f97316', // porta orange
  '#06b6d4', // arquiteto cyan
  '#3b82f6', // bender conecta blue
  '#7c3aed', // inteligência artificial violet
  '#c2410c', // mídias físicas terracotta/amber
  '#64748b', // a definir slate
]

const ORIGIN_COLOR_MAP: Record<string, string> = {
  Instagram: '#e1306c',
  Indicação: '#8b5cf6',
  Recompra: '#0284c7',
  Google: '#4285f4',
  'Meta Ads': '#1877F2',
  Corretor: '#f59e0b',
  Porta: '#f97316',
  Arquiteto: '#06b6d4',
  'Bender Conecta': '#3b82f6',
  'Inteligência Artificial': '#7c3aed',
  'Mídias Físicas': '#c2410c',
  'A definir': '#64748b',
}

function getOriginColor(originName: string, fallbackIdx = 0): string {
  return ORIGIN_COLOR_MAP[originName] || ORIGIN_COLORS[fallbackIdx % ORIGIN_COLORS.length]
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const STATUS_LABELS: Record<string, { label: string; badge: string }> = {
  em_atendimento: {
    label: 'Em Atendimento',
    badge: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
  },
  aguardando_resposta: {
    label: 'Aguardando Resposta',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  },
  nao_informado: {
    label: 'Não Informado',
    badge: 'bg-muted text-muted-foreground',
  },
  // Fallbacks de compatibilidade caso haja legados
  não_informado: {
    label: 'Não Informado',
    badge: 'bg-muted text-muted-foreground',
  },
}

export interface DateRangeProps {
  from: string | null
  to: string | null
}

export function AtendimentosTab({
  data,
  dateRange,
}: {
  data: AtendimentosMetrics
  dateRange?: DateRangeProps
}) {
  const [activeSubTab, setActiveSubTab] = useState<
    'funil_real' | 'visao_geral' | 'novo_contato' | 'consultoria' | 'orcamentos'
  >('funil_real')

  // Estado local para Origens: Despacho e Perda
  const [origensDespachoPerda, setOrigensDespachoPerda] = useState<
    OrigemDespachoPerdaComparativoItem[]
  >([])
  const [loadingDespachoPerda, setLoadingDespachoPerda] = useState<boolean>(true)
  const [errorDespachoPerda, setErrorDespachoPerda] = useState<string | null>(null)

  // Filtro por consultor na seção Origens: Despacho e Perda
  const [selectedConsultorId, setSelectedConsultorId] = useState<string>('todos')
  const [consultoresList, setConsultoresList] = useState<{ id: string; nome: string }[]>([])

  // Carregar lista de consultores para o filtro
  useEffect(() => {
    let isMounted = true
    const carregarConsultores = async () => {
      try {
        const { data: usersData, error } = await supabase
          .from('users')
          .select('id, nome, eh_consultor, status')
          .or('eh_consultor.eq.true,status.eq.true')
          .order('nome', { ascending: true })

        if (error) {
          console.error('[AtendimentosTab] Erro ao carregar consultores:', error)
          return
        }

        if (isMounted && usersData) {
          // Filtrar usuários que são consultores ou têm papel comercial
          const consultores = usersData
            .filter((u) => u.id && u.nome)
            .map((u) => ({ id: u.id, nome: u.nome.trim() }))
          setConsultoresList(consultores)
        }
      } catch (err) {
        console.error('[AtendimentosTab] Exceção ao carregar consultores:', err)
      }
    }

    carregarConsultores()
    return () => {
      isMounted = false
    }
  }, [])

  const fetchDespachoPerda = useCallback(async () => {
    setLoadingDespachoPerda(true)
    setErrorDespachoPerda(null)
    try {
      const consultorParam =
        selectedConsultorId && selectedConsultorId !== 'todos' ? selectedConsultorId : null

      // Calcular período anterior equivalente
      let prevStartDate: string | null = null
      let prevEndDate: string | null = null

      if (dateRange?.from && dateRange?.to) {
        const currentStart = new Date(dateRange.from).getTime()
        const currentEnd = new Date(dateRange.to).getTime()
        const durationMs = Math.max(0, currentEnd - currentStart)

        const prevEndMs = currentStart - 1
        const prevStartMs = prevEndMs - durationMs

        prevStartDate = new Date(prevStartMs).toISOString()
        prevEndDate = new Date(prevEndMs).toISOString()
      } else if (dateRange?.from && !dateRange?.to) {
        const currentStart = new Date(dateRange.from).getTime()
        const nowMs = Date.now()
        const durationMs = Math.max(0, nowMs - currentStart)

        const prevEndMs = currentStart - 1
        const prevStartMs = prevEndMs - durationMs

        prevStartDate = new Date(prevStartMs).toISOString()
        prevEndDate = new Date(prevEndMs).toISOString()
      }

      // Buscar período atual e período anterior em paralelo com runWithAuthRecovery
      const [resAtual, resAnterior] = await Promise.all([
        runWithAuthRecovery<OrigemDespachoPerdaItem[]>(() =>
          supabase.rpc('get_origens_despacho_perda_consultor', {
            p_start_date: dateRange?.from ?? null,
            p_end_date: dateRange?.to ?? null,
            p_consultor_id: consultorParam,
          }),
        ),
        prevStartDate
          ? runWithAuthRecovery<OrigemDespachoPerdaItem[]>(() =>
              supabase.rpc('get_origens_despacho_perda_consultor', {
                p_start_date: prevStartDate,
                p_end_date: prevEndDate,
                p_consultor_id: consultorParam,
              }),
            )
          : Promise.resolve({ data: [] as OrigemDespachoPerdaItem[], error: null }),
      ])

      if (resAtual.error) {
        console.error(
          '[AtendimentosTab] Erro ao carregar origens_despacho_perda_consultor:',
          resAtual.error,
        )
        setErrorDespachoPerda(
          resAtual.error?.message ||
            'Não foi possível carregar as métricas de despacho e perda por origem.',
        )
      } else {
        const dadosAtuais: OrigemDespachoPerdaItem[] = Array.isArray(resAtual.data)
          ? resAtual.data
          : []
        const dadosAnteriores: OrigemDespachoPerdaItem[] = Array.isArray(resAnterior.data)
          ? resAnterior.data
          : []

        // Mapear dados anteriores por nome de origem para merge rápido
        const prevMap = new Map<string, OrigemDespachoPerdaItem>()
        dadosAnteriores.forEach((item) => {
          if (item?.origem) {
            prevMap.set(item.origem.toLowerCase().trim(), item)
          }
        })

        // Combinar dados atuais com o período anterior
        const comparativo: OrigemDespachoPerdaComparativoItem[] = dadosAtuais.map((item) => {
          const prev = prevMap.get((item.origem || '').toLowerCase().trim())
          const prevTotal = prev ? prev.total_leads : 0
          const prevDespachados = prev ? prev.despachados : 0
          const prevTaxaDespacho = prev ? prev.taxa_despacho : 0
          const prevPerdidos = prev ? prev.perdidos : 0
          const prevTaxaPerda = prev ? prev.taxa_perda : 0

          return {
            ...item,
            prev_total_leads: prevTotal,
            prev_despachados: prevDespachados,
            prev_taxa_despacho: prevTaxaDespacho,
            prev_perdidos: prevPerdidos,
            prev_taxa_perda: prevTaxaPerda,
            delta_total_leads: item.total_leads - prevTotal,
            delta_despachados: item.despachados - prevDespachados,
            delta_taxa_despacho: Number((item.taxa_despacho - prevTaxaDespacho).toFixed(1)),
            delta_perdidos: item.perdidos - prevPerdidos,
            delta_taxa_perda: Number((item.taxa_perda - prevTaxaPerda).toFixed(1)),
          }
        })

        setOrigensDespachoPerda(comparativo)
      }
    } catch (err: any) {
      console.error(
        '[AtendimentosTab] Exceção ao consultar get_origens_despacho_perda_consultor:',
        err,
      )
      setErrorDespachoPerda(
        err?.message || 'Erro inesperado ao consultar dados de despacho e perda.',
      )
    } finally {
      setLoadingDespachoPerda(false)
    }
  }, [dateRange?.from, dateRange?.to, selectedConsultorId])

  useEffect(() => {
    fetchDespachoPerda()
  }, [fetchDespachoPerda])

  const {
    total_leads,
    convertidos,
    taxa_conversao,
    media_dia,
    vendas_com_data_qtd,
    vendas_total_para_cobertura,
    origens: rawOrigens,
    ticket_medio_origens,
    ciclo_vendas,
    motivos_perda,
    evolucao_mensal: rawEvolucaoMensal,
    dias_semana: rawDiasSemana,
    leads_sem_origem,
    leads_sem_consultor_consultoria,
    performance_periodo,
    raio_x_atual,
    regua_coortes: rawReguaCoortes,
    novo_contato,
    consultoria,
    orcamentos,
    tempo_colunas,
  } = data

  const origens = rawOrigens ?? []
  const evolucao_mensal = rawEvolucaoMensal ?? []
  const dias_semana = rawDiasSemana ?? []
  const regua_coortes = rawReguaCoortes ?? []
  const status_atendimento = data.status_atendimento ?? []

  const vendasPeriodoQtd =
    performance_periodo?.vendas_concluidas ?? data.vendas_periodo_qtd ?? convertidos
  const consultoriasIniciadasQtd =
    performance_periodo?.consultorias_iniciadas ?? data.consultorias_iniciadas_periodo ?? 0
  const perdasPeriodoQtd = performance_periodo?.perdas_periodo ?? motivos_perda?.total_perdas ?? 0
  const ticketMedioPeriodo =
    performance_periodo?.ticket_medio_periodo ?? data.vendas_periodo_ticket_medio ?? 0
  const taxaConversaoPeriodo = performance_periodo?.taxa_conversao_periodo ?? taxa_conversao

  const formatDias = (dias: number | undefined | null) => {
    if (dias === undefined || dias === null || isNaN(dias)) return '0,0 dias'
    return `${dias.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} dias`
  }

  const cicloGeral = ciclo_vendas?.geral
  const cicloGeralComStandby = ciclo_vendas?.geral_com_standby
  const cicloOrigens = ciclo_vendas?.por_origem ?? []
  const temDadosCiclo =
    ((cicloGeral?.qtd_vendas ?? 0) > 0 || (cicloGeralComStandby?.qtd_vendas ?? 0) > 0) &&
    cicloOrigens.length > 0
  const maxCicloOrigem =
    cicloOrigens.length > 0
      ? Math.max(
          ...cicloOrigens.map((item) =>
            Math.max(item.ciclo_medio_dias || 0, item.ciclo_medio_com_standby || 0),
          ),
        )
      : 0

  const ticketOrigensOrdenado = [...(ticket_medio_origens ?? [])].sort(
    (a, b) => b.ticket_medio - a.ticket_medio,
  )
  const maxTicketMedio =
    ticketOrigensOrdenado.length > 0
      ? Math.max(...ticketOrigensOrdenado.map((item) => item.ticket_medio))
      : 0
  const totalVendasTicket = ticketOrigensOrdenado.reduce((acc, cur) => acc + cur.qtd_vendas, 0)
  const totalValorTicket = ticketOrigensOrdenado.reduce((acc, cur) => acc + cur.valor_total, 0)

  // Bloco Motivos de Perda
  const perdasPorMotivo = motivos_perda?.por_motivo ?? []
  const perdasPorEtapa = motivos_perda?.por_etapa ?? []
  const totalPerdas = motivos_perda?.total_perdas ?? 0
  const qtdOutro = motivos_perda?.qtd_outro ?? 0
  const temDadosPerda = totalPerdas > 0 && (perdasPorMotivo.length > 0 || perdasPorEtapa.length > 0)

  const maxQtdMotivo =
    perdasPorMotivo.length > 0 ? Math.max(...perdasPorMotivo.map((m) => m.qtd_perdas)) : 0
  const maxQtdEtapa =
    perdasPorEtapa.length > 0 ? Math.max(...perdasPorEtapa.map((e) => e.qtd_perdas)) : 0

  // Origens com pelo menos 1 lead para o gráfico donut
  const origensComLeads = origens.filter((o) => o.total > 0)

  // Dados para o Alerta de Origem Não Registrada (prioriza metrics.leads_sem_origem com fallback seguro)
  const origemADefinir = origens.find((o) => o.origem === 'A definir')
  const totalSemOrigem = leads_sem_origem?.total ?? (origemADefinir?.total || 0)
  const convertidosSemOrigem = leads_sem_origem?.convertidos ?? (origemADefinir?.convertidos || 0)
  const taxaSemOrigem =
    totalSemOrigem > 0 ? Number(((convertidosSemOrigem / totalSemOrigem) * 100).toFixed(1)) : 0
  const temSemOrigem = totalSemOrigem > 0

  // Dados para o Alerta de Leads Sem Consultor (Consultoria)
  const totalSemConsultor = leads_sem_consultor_consultoria?.total ?? 0
  const convertidosSemConsultor = leads_sem_consultor_consultoria?.convertidos ?? 0
  const taxaSemConsultor =
    totalSemConsultor > 0
      ? Number(((convertidosSemConsultor / totalSemConsultor) * 100).toFixed(1))
      : 0
  const temSemConsultor = totalSemConsultor > 0

  // Cobertura de data_venda (Item 5)
  const qtdVendasData = vendas_com_data_qtd ?? 0
  const qtdVendasTotal = vendas_total_para_cobertura ?? convertidos

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Seletor de Sub-abas Internas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <Tabs
          value={activeSubTab}
          onValueChange={(val) =>
            setActiveSubTab(
              val as 'funil_real' | 'visao_geral' | 'novo_contato' | 'consultoria' | 'orcamentos',
            )
          }
          className="w-full sm:w-auto"
        >
          <TabsList className="bg-muted p-1 rounded-lg border border-border h-10 w-full sm:w-auto grid grid-cols-2 sm:grid-cols-5 sm:flex">
            <TabsTrigger
              value="funil_real"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground text-xs font-semibold gap-1.5 px-3.5"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Funil real
            </TabsTrigger>
            <TabsTrigger
              value="visao_geral"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground text-xs font-semibold gap-1.5 px-3.5"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger
              value="novo_contato"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground text-xs font-semibold gap-1.5 px-3.5"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Novo Contato
            </TabsTrigger>
            <TabsTrigger
              value="consultoria"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground text-xs font-semibold gap-1.5 px-3.5"
            >
              <Briefcase className="w-3.5 h-3.5" />
              Consultoria
            </TabsTrigger>
            <TabsTrigger
              value="orcamentos"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground text-xs font-semibold gap-1.5 px-3.5"
            >
              <Calculator className="w-3.5 h-3.5" />
              Leads p/ Orçamento
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="text-xs text-muted-foreground flex items-center gap-1.5 self-end sm:self-auto">
          {activeSubTab === 'funil_real' && (
            <span className="font-medium">Funil analítico real calculado pelo banco de dados</span>
          )}
          {activeSubTab === 'visao_geral' && (
            <span className="font-medium">Métricas consolidadas com origem comercial válida</span>
          )}
          {activeSubTab === 'novo_contato' && (
            <span className="font-medium">Esteira completa SDR (Aba 01) · Todas as origens</span>
          )}
          {activeSubTab === 'consultoria' && (
            <span className="font-medium">Esteira de Consultoria (Aba 02) · Todas as origens</span>
          )}
          {activeSubTab === 'orcamentos' && (
            <span className="font-medium">Esteira de Orçamentos (Aba 05) · Todas as origens</span>
          )}
        </div>
      </div>

      {/* SUB-ABA 0: FUNIL REAL */}
      {activeSubTab === 'funil_real' && <FunilRealSubTab dateRange={dateRange} />}

      {/* SUB-ABA 1: VISÃO GERAL (CONTEÚDO EXISTENTE INTOCADO) */}
      {activeSubTab === 'visao_geral' && (
        <div className="space-y-6">
          {(temSemOrigem || temSemConsultor) && (
            <div className="space-y-3">
              {temSemOrigem && (
                <div className="p-4 rounded-xl border border-amber-300/80 bg-amber-50/90 dark:border-amber-900/60 dark:bg-amber-950/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-500 text-white shrink-0 shadow-sm mt-0.5 sm:mt-0">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs uppercase font-extrabold text-amber-800 dark:text-amber-300 tracking-wider">
                          Atenção: Origem Não Registrada
                        </span>
                        <Badge
                          variant="outline"
                          className="border-amber-400 text-amber-800 dark:text-amber-300 bg-amber-100/60 dark:bg-amber-900/40 text-[10px] py-0 px-2 font-bold"
                        >
                          {taxaSemOrigem}% de conversão
                        </Badge>
                      </div>
                      <p className="text-xs sm:text-sm text-amber-900 dark:text-amber-200 mt-1 font-medium">
                        Existem{' '}
                        <strong className="font-extrabold text-amber-950 dark:text-amber-100">
                          {totalSemOrigem} leads comerciais
                        </strong>{' '}
                        com origem não preenchida ou pendente ({convertidosSemOrigem} deles já
                        viraram vendas). Para manter as métricas de captação precisas, atribua a
                        origem correta para esses contatos.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-stretch md:self-auto shrink-0 justify-between sm:justify-end">
                    <div className="text-xs text-amber-800 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-900/50 px-3 py-1.5 rounded-md border border-amber-200 dark:border-amber-800 font-semibold text-center whitespace-nowrap">
                      {convertidosSemOrigem}/{totalSemOrigem} fechados
                    </div>
                    <Button
                      asChild
                      size="sm"
                      className="bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-600 dark:hover:bg-amber-500 font-semibold gap-1.5 shadow-sm text-xs whitespace-nowrap"
                    >
                      <Link to="/leads-sem-origem?fila=sem_origem">
                        <ClipboardList className="h-4 w-4" />
                        Ver e corrigir leads sem origem
                      </Link>
                    </Button>
                  </div>
                </div>
              )}

              {temSemConsultor && (
                <div className="p-4 rounded-xl border border-amber-300/80 bg-amber-50/90 dark:border-amber-900/60 dark:bg-amber-950/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-500 text-white shrink-0 shadow-sm mt-0.5 sm:mt-0">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs uppercase font-extrabold text-amber-800 dark:text-amber-300 tracking-wider">
                          Atenção: Sem Consultor — Consultoria ({totalSemConsultor})
                        </span>
                        <Badge
                          variant="outline"
                          className="border-amber-400 text-amber-800 dark:text-amber-300 bg-amber-100/60 dark:bg-amber-900/40 text-[10px] py-0 px-2 font-bold"
                        >
                          {taxaSemConsultor}% de conversão
                        </Badge>
                      </div>
                      <p className="text-xs sm:text-sm text-amber-900 dark:text-amber-200 mt-1 font-medium">
                        Existem{' '}
                        <strong className="font-extrabold text-amber-950 dark:text-amber-100">
                          {totalSemConsultor} leads do funil de Consultoria
                        </strong>{' '}
                        sem consultor responsável atribuído ({convertidosSemConsultor} deles já
                        viraram vendas). Atribua um consultor para garantir o andamento e o
                        acompanhamento das negociações.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-stretch md:self-auto shrink-0 justify-between sm:justify-end">
                    <div className="text-xs text-amber-800 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-900/50 px-3 py-1.5 rounded-md border border-amber-200 dark:border-amber-800 font-semibold text-center whitespace-nowrap">
                      {convertidosSemConsultor}/{totalSemConsultor} fechados
                    </div>
                    <Button
                      asChild
                      size="sm"
                      className="bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-600 dark:hover:bg-amber-500 font-semibold gap-1.5 shadow-sm text-xs whitespace-nowrap"
                    >
                      <Link to="/leads-sem-origem?fila=sem_consultor">
                        <ClipboardList className="h-4 w-4" />
                        Ver e corrigir sem consultor
                      </Link>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Seção 1: PERFORMANCE DO PERÍODO (Eventos com filtro de data) */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-border/80 pb-2">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-600" />
                <h3 className="text-sm font-bold tracking-tight text-foreground uppercase">
                  (1) Performance do Período
                </h3>
                <Badge
                  variant="outline"
                  className="text-[10px] font-semibold py-0 text-blue-600 border-blue-300"
                >
                  Eventos no Filtro
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Vendas por <strong className="text-foreground">data_venda</strong>, consultorias
                iniciadas e leads entrados (<strong className="text-foreground">criado_em</strong>)
              </p>
            </div>

            {/* 6 Cards de Performance do Período */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
              <Card className="border-border shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold text-muted-foreground">
                    Leads Chegados
                  </CardTitle>
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <Users className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl sm:text-3xl font-extrabold text-foreground">
                    {total_leads}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1 font-medium">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    Média de <strong className="text-foreground">{media_dia}</strong> leads/dia
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold text-muted-foreground">
                    Vendas do Período
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <TooltipProvider>
                      <UITooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            aria-label="Critério de Vendas"
                            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          >
                            <Info className="h-3 w-3" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs text-xs">
                          <p className="font-semibold">Vendas Concluídas no Período</p>
                          <p className="text-muted-foreground mt-0.5">
                            Filtro estrito por data_venda dentro do intervalo selecionado. Não
                            mistura com leads antigos.
                          </p>
                        </TooltipContent>
                      </UITooltip>
                    </TooltipProvider>

                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <Target className="h-4 w-4" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl sm:text-3xl font-extrabold text-foreground">
                    {vendasPeriodoQtd}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 font-medium">
                    Por <strong className="text-foreground">data_venda</strong> no período
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold text-muted-foreground">
                    Consultorias Iniciadas
                  </CardTitle>
                  <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                    <Send className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl sm:text-3xl font-extrabold text-foreground">
                    {consultoriasIniciadasQtd}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 font-medium">
                    Histórico kanban no período
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold text-muted-foreground">
                    Perdas no Período
                  </CardTitle>
                  <div className="p-2 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl sm:text-3xl font-extrabold text-foreground">
                    {perdasPeriodoQtd}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 font-medium">
                    Perdas com evento no período
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold text-muted-foreground">
                    Ticket Médio Vendas
                  </CardTitle>
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <DollarSign className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-extrabold text-foreground truncate">
                    {ticketMedioPeriodo > 0
                      ? currencyFormatter.format(ticketMedioPeriodo)
                      : 'R$ 0,00'}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 font-medium">
                    Vendas com data no período
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold text-muted-foreground">
                    Taxa do Período
                  </CardTitle>
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    <div className="text-2xl sm:text-3xl font-extrabold text-foreground">
                      {taxaConversaoPeriodo}%
                    </div>
                    <Badge
                      variant="outline"
                      className="text-[9px] py-0 px-1 border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950/40"
                    >
                      Em construção
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 font-medium leading-tight">
                    Vendas (data_venda) ÷ Chegados (criado_em)
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Seção 2: RAIO-X ATUAL (Sem filtro de período - Estado de Hoje) */}
          <div className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-border/80 pb-2">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-500" />
                <h3 className="text-sm font-bold tracking-tight text-foreground uppercase">
                  (2) Raio-X Atual (Estado de Hoje)
                </h3>
                <Badge
                  variant="outline"
                  className="text-[10px] font-semibold py-0 text-amber-700 border-amber-300 bg-amber-50 dark:bg-amber-950/40"
                >
                  Sem Filtro de Data
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Tempo parado por coluna, gargalos e clientes estagnados na esteira
              </p>
            </div>

            {/* Alerta de Leads Parados & Bloco de Permanência das Colunas */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="p-3.5 rounded-xl border border-rose-200/90 bg-rose-50/70 dark:border-rose-900/50 dark:bg-rose-950/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-rose-900 dark:text-rose-300">
                    Parados há &gt; 90 dias
                  </span>
                  <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                </div>
                <div className="text-2xl font-extrabold text-rose-950 dark:text-rose-100 mt-1">
                  {raio_x_atual?.mais_90_dias ?? data.raio_x_estagnados?.parados_mais_90d ?? 0}
                </div>
                <p className="text-[11px] text-rose-800/80 dark:text-rose-300/80 mt-0.5">
                  Aparecem aqui, nunca na performance
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-amber-200/90 bg-amber-50/70 dark:border-amber-900/50 dark:bg-amber-950/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-amber-900 dark:text-amber-300">
                    Parados entre 60 e 90 dias
                  </span>
                  <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="text-2xl font-extrabold text-amber-950 dark:text-amber-100 mt-1">
                  {raio_x_atual?.entre_60_90_dias ?? data.raio_x_estagnados?.parados_mais_60d ?? 0}
                </div>
                <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                  Sem movimentação há 2 meses
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-border bg-muted/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Parados entre 30 e 60 dias
                  </span>
                  <Timer className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-2xl font-extrabold text-foreground mt-1">
                  {raio_x_atual?.entre_30_60_dias ?? data.raio_x_estagnados?.parados_mais_30d ?? 0}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">Exigem ação do consultor</p>
              </div>

              <div className="p-3.5 rounded-xl border border-border bg-muted/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Total Ativos no Funil Hoje
                  </span>
                  <Layers className="h-4 w-4 text-primary" />
                </div>
                <div className="text-2xl font-extrabold text-foreground mt-1">
                  {raio_x_atual?.total_ativos ?? data.raio_x_estagnados?.total_ativos ?? 0}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Média: {raio_x_atual?.media_dias_parado ?? 0} dias parado
                </p>
              </div>
            </div>

            {/* Lista dos Maiores Estagnados no Raio-X Atual */}
            {raio_x_atual?.top_estagnados && raio_x_atual.top_estagnados.length > 0 && (
              <Card className="border-border shadow-sm">
                <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                      Leads mais estagnados na esteira hoje (sem movimentação recente)
                    </CardTitle>
                  </div>
                  <Badge variant="outline" className="text-[10px] text-muted-foreground">
                    Top {raio_x_atual.top_estagnados.length}
                  </Badge>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {raio_x_atual.top_estagnados.slice(0, 5).map((est) => (
                      <div
                        key={est.id}
                        className="flex items-center justify-between px-4 py-2.5 text-xs hover:bg-muted/30 transition-colors"
                      >
                        <div className="space-y-0.5">
                          <p className="font-semibold text-foreground">{est.nome}</p>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            <span>{est.esteira}</span>
                            <span>•</span>
                            <span className="font-medium text-foreground/80">{est.status}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge
                            variant="outline"
                            className={
                              est.dias_parado >= 90
                                ? 'border-rose-400 text-rose-600 bg-rose-50 dark:bg-rose-950/30 font-bold'
                                : est.dias_parado >= 60
                                  ? 'border-amber-400 text-amber-600 bg-amber-50 dark:bg-amber-950/30 font-bold'
                                  : 'border-border text-muted-foreground'
                            }
                          >
                            {est.dias_parado} dias parado
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Bloco de Tempo dos Leads por Coluna */}
            {tempo_colunas?.consultoria && tempo_colunas.consultoria.length > 0 && (
              <BlocoTempoColunas
                abaId="lead-consultoria"
                items={tempo_colunas.consultoria}
                descricao="Permanência dos leads HOJE em cada estágio (now − última movimentação real no Kanban)"
              />
            )}
          </div>

          {/* Seção 3: RÉGUA DE COORTE PARA CONVERSÃO (Maturidade Real) */}
          <div className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-border/80 pb-2">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-purple-600" />
                <h3 className="text-sm font-bold tracking-tight text-foreground uppercase">
                  (3) Régua de Coorte para Conversão
                </h3>
                <Badge
                  variant="outline"
                  className="text-[10px] font-semibold py-0 text-purple-700 border-purple-300 bg-purple-50 dark:bg-purple-950/40"
                >
                  Maturidade Histórica
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Leads chegados há X meses e o percentual que fechou até hoje (sem misturar ciclos)
              </p>
            </div>

            <Card className="border-border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  Evolução por Safra de Chegada (Últimos 6 meses)
                </CardTitle>
                <CardDescription>
                  Taxa acumulada de fechamentos até hoje para cada mês de captação
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(!regua_coortes || regua_coortes.length === 0) &&
                (!data.regua_coortes || data.regua_coortes.length === 0) ? (
                  <p className="text-xs text-muted-foreground py-6 text-center">
                    Sem dados históricos de safras disponíveis
                  </p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6 pt-1">
                    {(regua_coortes && regua_coortes.length > 0
                      ? regua_coortes
                      : (data.regua_coortes ?? [])
                    )
                      .slice(0, 6)
                      .map((coorte, idx) => {
                        const rotulo = coorte.safra ?? coorte.rotulo_mes ?? 'Safra'
                        const taxa = coorte.taxa_conversao ?? coorte.taxa_conversao_coorte ?? 0
                        const fechados =
                          coorte.fechados_ate_hoje ?? coorte.convertidos_ate_hoje ?? 0
                        const totalChegados =
                          coorte.total_chegados ?? coorte.total_leads_coorte ?? 0
                        const key = coorte.safra_iso ?? coorte.mes_iso ?? `coorte-${idx}`

                        return (
                          <div
                            key={key}
                            className="p-3 rounded-xl border border-border bg-card/60 flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-foreground">{rotulo}</span>
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  Safra
                                </span>
                              </div>
                              <div className="text-2xl font-extrabold text-purple-600 dark:text-purple-400 mt-2">
                                {taxa}%
                              </div>
                            </div>
                            <div className="text-[11px] text-muted-foreground pt-2 border-t border-border/60 mt-2 flex items-center justify-between">
                              <span className="font-semibold text-foreground/80">
                                {fechados} fechados
                              </span>
                              <span className="text-muted-foreground/70">de {totalChegados}</span>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Linha 1: Gráfico de Evolução Mensal (Leads Entrados x Vendidos) + Status Atendimento */}
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2 border-border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    Evolução Mensal: Leads Entrados × Vendidos
                  </CardTitle>
                  <CardDescription>Acompanhamento histórico recente mês a mês</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[280px] w-full pt-4">
                  {evolucao_mensal.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                      Sem dados para o período selecionado
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={evolucao_mensal}
                        margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                        <XAxis
                          dataKey="mes"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 12, fill: 'currentColor' }}
                          className="text-muted-foreground"
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 12, fill: 'currentColor' }}
                          className="text-muted-foreground"
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const dataItem = payload[0].payload as any
                              const tx =
                                dataItem.leads > 0
                                  ? ((dataItem.vendidos / dataItem.leads) * 100).toFixed(1)
                                  : '0'
                              return (
                                <div className="bg-popover border border-border p-3 rounded-lg shadow-md text-xs space-y-1">
                                  <p className="font-bold text-foreground">{dataItem.mes}</p>
                                  <p className="text-blue-600 dark:text-blue-400">
                                    Leads Entrados: <strong>{dataItem.leads}</strong>
                                  </p>
                                  <p className="text-emerald-600 dark:text-emerald-400">
                                    Vendas Fechadas: <strong>{dataItem.vendidos}</strong>
                                  </p>
                                  <p className="text-muted-foreground font-medium pt-1 border-t border-border">
                                    Conversão no mês: <strong>{tx}%</strong>
                                  </p>
                                </div>
                              )
                            }
                            return null
                          }}
                        />
                        <Legend
                          verticalAlign="top"
                          height={36}
                          formatter={(value) => (
                            <span className="text-xs font-medium text-foreground">{value}</span>
                          )}
                        />
                        <Bar
                          dataKey="leads"
                          name="Leads Entrados"
                          fill="#3b82f6"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="vendidos"
                          name="Vendas Concluídas"
                          fill="#10b981"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Status de Atendimento */}
            <Card className="border-border shadow-sm flex flex-col justify-between">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Status de Atendimento
                </CardTitle>
                <CardDescription>Distribuição atual da triagem de leads</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                {status_atendimento.length === 0 ? (
                  <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
                    Nenhum lead com status no período
                  </div>
                ) : (
                  <div className="space-y-3">
                    {status_atendimento.map((item) => {
                      const meta = STATUS_LABELS[item.status] || {
                        label: item.status.replace(/_/g, ' '),
                        badge: 'bg-muted text-muted-foreground',
                      }
                      const pct =
                        total_leads > 0 ? ((item.count / total_leads) * 100).toFixed(0) : '0'

                      return (
                        <div
                          key={item.status}
                          className="p-3 rounded-lg border border-border bg-muted/30 flex items-center justify-between"
                        >
                          <div className="space-y-1">
                            <span
                              className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-md ${meta.badge}`}
                            >
                              {meta.label}
                            </span>
                            <div className="text-xs text-muted-foreground">
                              {pct}% do total de leads
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-xl font-extrabold text-foreground">
                              {item.count}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Linha 2: Frequência por Dia da Semana + Tabela das 8 Origens Oficiais */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Leads por dia da semana */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  Frequência por Dia da Semana
                </CardTitle>
                <CardDescription>Dias com maior entrada de contatos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[260px] w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={dias_semana}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                      <XAxis
                        dataKey="dia"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11, fill: 'currentColor' }}
                        className="text-muted-foreground"
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11, fill: 'currentColor' }}
                        className="text-muted-foreground"
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload as any
                            return (
                              <div className="bg-popover border border-border p-2 rounded shadow text-xs">
                                <p className="font-bold text-foreground">{d.dia}</p>
                                <p className="text-blue-600 dark:text-blue-400">
                                  Leads: <strong>{d.total}</strong>
                                </p>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Bar dataKey="total" name="Leads" fill="#6366f1" radius={[4, 4, 0, 0]}>
                        {dias_semana.map((entry, index) => (
                          <Cell
                            key={`cell-dow-${index}`}
                            fill={
                              entry.total === Math.max(...dias_semana.map((d) => d.total))
                                ? '#4f46e5'
                                : '#818cf8'
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Origens Oficiais × Conversão */}
            <Card className="lg:col-span-2 border-border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <PieIcon className="h-4 w-4 text-primary" />
                    Origem × Conversão
                  </CardTitle>
                  <CardDescription>
                    Relação entre canal de captação e taxa de fechamento de contratos
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-12 gap-4 items-center">
                  {/* Gráfico Donut de Origens */}
                  <div className="md:col-span-4 h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={origensComLeads}
                          dataKey="total"
                          nameKey="origem"
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={75}
                          paddingAngle={2}
                        >
                          {origensComLeads.map((item, index) => (
                            <Cell
                              key={`cell-pie-${index}`}
                              fill={getOriginColor(item.origem, index)}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const item = payload[0].payload as any
                              return (
                                <div className="bg-popover border border-border p-2 rounded shadow text-xs">
                                  <p className="font-bold text-foreground">{item.origem}</p>
                                  <p>Total: {item.total} leads</p>
                                  <p className="text-emerald-600 font-semibold">
                                    Vendas: {item.convertidos} ({item.taxa}%)
                                  </p>
                                </div>
                              )
                            }
                            return null
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Tabela de Origens Oficiais */}
                  <div className="md:col-span-8 overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border">
                        <tr>
                          <th className="py-2 px-3">Origem Oficial</th>
                          <th className="py-2 px-3 text-right">Leads</th>
                          <th className="py-2 px-3 text-right">Vendas</th>
                          <th className="py-2 px-3 text-right">Conversão</th>
                          <th className="py-2 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {origens.map((item, idx) => (
                          <tr
                            key={item.origem}
                            className={`hover:bg-muted/30 transition-colors ${
                              item.origem === 'A definir' ? 'bg-amber-500/5' : ''
                            }`}
                          >
                            <td className="py-2.5 px-3 font-semibold text-foreground flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                                style={{ backgroundColor: getOriginColor(item.origem, idx) }}
                              />
                              <span className="flex items-center gap-1.5">
                                {item.origem}
                                {item.origem === 'A definir' && item.total > 0 && (
                                  <Badge
                                    variant="outline"
                                    className="text-[9px] py-0 px-1.5 border-amber-300 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50"
                                  >
                                    Preenchimento pendente
                                  </Badge>
                                )}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-medium text-foreground">
                              {item.total}
                            </td>
                            <td className="py-2.5 px-3 text-right font-medium text-emerald-600 dark:text-emerald-400">
                              {item.convertidos}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-foreground">
                              {item.taxa}%
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {item.taxa >= 30 ? (
                                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 hover:bg-emerald-100 text-[10px] py-0">
                                  Alta
                                </Badge>
                              ) : item.taxa > 0 ? (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] py-0 text-amber-600 border-amber-300"
                                >
                                  Média
                                </Badge>
                              ) : item.total > 0 ? (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] py-0 text-muted-foreground"
                                >
                                  0%
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-[10px]">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bloco Origens: Despacho e Perda */}
          <Card className="border-border shadow-sm">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Send className="h-4 w-4 text-primary" />
                  Origens: Despacho e Perda
                </CardTitle>
                <CardDescription>
                  Volume de leads triados no período, despacho para esteiras comerciais avançadas,
                  perdas acumuladas e evolução vs. período anterior
                </CardDescription>
              </div>

              {/* Filtro por Consultor Responsável */}
              <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                <UserCheck className="h-4 w-4 text-muted-foreground" />
                <Select
                  value={selectedConsultorId}
                  onValueChange={(val) => setSelectedConsultorId(val)}
                >
                  <SelectTrigger className="w-[200px] h-8 text-xs font-medium bg-background border-border">
                    <SelectValue placeholder="Todos os consultores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os consultores</SelectItem>
                    {consultoresList.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              {loadingDespachoPerda ? (
                <div className="space-y-2 py-4">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : errorDespachoPerda ? (
                <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 my-2">
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-destructive">
                        Erro ao carregar dados de despacho e perda
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {errorDespachoPerda}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchDespachoPerda}
                    className="text-xs font-medium shrink-0 self-end sm:self-auto"
                  >
                    Tentar novamente
                  </Button>
                </div>
              ) : origensDespachoPerda.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  Nenhum lead encontrado para o período{' '}
                  {selectedConsultorId !== 'todos' ? 'e consultor selecionados' : 'selecionado'}.
                </div>
              ) : (
                (() => {
                  const somaTotal = origensDespachoPerda.reduce(
                    (acc, cur) => acc + (cur.total_leads || 0),
                    0,
                  )
                  const somaDespachados = origensDespachoPerda.reduce(
                    (acc, cur) => acc + (cur.despachados || 0),
                    0,
                  )
                  const somaPerdidos = origensDespachoPerda.reduce(
                    (acc, cur) => acc + (cur.perdidos || 0),
                    0,
                  )
                  const somaPrevTotal = origensDespachoPerda.reduce(
                    (acc, cur) => acc + (cur.prev_total_leads || 0),
                    0,
                  )
                  const somaPrevDespachados = origensDespachoPerda.reduce(
                    (acc, cur) => acc + (cur.prev_despachados || 0),
                    0,
                  )
                  const somaPrevPerdidos = origensDespachoPerda.reduce(
                    (acc, cur) => acc + (cur.prev_perdidos || 0),
                    0,
                  )

                  const taxaGlobalDespachoNum =
                    somaTotal > 0 ? (somaDespachados / somaTotal) * 100 : 0
                  const taxaGlobalPerdaNum = somaTotal > 0 ? (somaPerdidos / somaTotal) * 100 : 0
                  const prevTaxaGlobalDespachoNum =
                    somaPrevTotal > 0 ? (somaPrevDespachados / somaPrevTotal) * 100 : 0
                  const prevTaxaGlobalPerdaNum =
                    somaPrevTotal > 0 ? (somaPrevPerdidos / somaPrevTotal) * 100 : 0

                  const deltaTotalGlobal = somaTotal - somaPrevTotal
                  const deltaTaxaDespachoGlobal = Number(
                    (taxaGlobalDespachoNum - prevTaxaGlobalDespachoNum).toFixed(1),
                  )
                  const deltaTaxaPerdaGlobal = Number(
                    (taxaGlobalPerdaNum - prevTaxaGlobalPerdaNum).toFixed(1),
                  )

                  const formatDeltaPp = (delta: number | undefined) => {
                    if (delta === undefined || isNaN(delta)) return null
                    const sinal =
                      delta > 0
                        ? `+${delta.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`
                        : delta.toLocaleString('pt-BR', {
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 1,
                          })
                    return `${sinal} pp`
                  }

                  const formatDeltaCount = (delta: number | undefined) => {
                    if (delta === undefined || isNaN(delta)) return null
                    return delta > 0 ? `+${delta}` : `${delta}`
                  }

                  return (
                    <div className="space-y-3">
                      <div className="overflow-x-auto rounded-lg border border-border">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border">
                            <tr>
                              <th className="py-2.5 px-3 font-semibold min-w-[130px]">Origem</th>
                              <th className="py-2.5 px-3 text-right font-semibold min-w-[90px]">
                                Total (vs ant.)
                              </th>
                              <th className="py-2.5 px-3 text-right font-semibold min-w-[200px]">
                                Despachados / Taxa
                              </th>
                              <th className="py-2.5 px-3 text-right font-semibold min-w-[200px]">
                                Perdidos / Taxa
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border bg-card">
                            {origensDespachoPerda.map((item, idx) => {
                              const pctDespachoClamped = Math.min(
                                100,
                                Math.max(0, item.taxa_despacho || 0),
                              )
                              const pctPerdaClamped = Math.min(
                                100,
                                Math.max(0, item.taxa_perda || 0),
                              )

                              // Variação de Despacho (mais despacho = melhor, verde; menos = pior, vermelho)
                              const deltaDesp = item.delta_taxa_despacho ?? 0
                              const deltaDespColor =
                                deltaDesp > 0
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : deltaDesp < 0
                                    ? 'text-rose-600 dark:text-rose-400'
                                    : 'text-muted-foreground'

                              // Variação de Perda (mais perda = PIOR, vermelho; menos perda = MELHOR, verde)
                              const deltaPerda = item.delta_taxa_perda ?? 0
                              const deltaPerdaColor =
                                deltaPerda > 0
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : deltaPerda < 0
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-muted-foreground'

                              return (
                                <tr
                                  key={item.origem || `origem-${idx}`}
                                  className="hover:bg-muted/30 transition-colors"
                                >
                                  {/* Coluna Origem */}
                                  <td className="py-2.5 px-3 font-semibold text-foreground">
                                    <div className="flex items-center gap-2">
                                      <span
                                        className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                                        style={{
                                          backgroundColor: getOriginColor(item.origem, idx),
                                        }}
                                      />
                                      <span className="truncate">{item.origem}</span>
                                    </div>
                                  </td>

                                  {/* Coluna Total Leads com evolução */}
                                  <td className="py-2.5 px-3 text-right font-medium text-foreground">
                                    <div className="flex flex-col items-end">
                                      <span className="font-bold">{item.total_leads}</span>
                                      {item.prev_total_leads !== undefined && (
                                        <span
                                          className={`text-[10px] inline-flex items-center gap-0.5 ${
                                            (item.delta_total_leads ?? 0) > 0
                                              ? 'text-emerald-600 dark:text-emerald-400'
                                              : (item.delta_total_leads ?? 0) < 0
                                                ? 'text-rose-600 dark:text-rose-400'
                                                : 'text-muted-foreground'
                                          }`}
                                          title={`Período anterior: ${item.prev_total_leads} leads`}
                                        >
                                          {(item.delta_total_leads ?? 0) > 0 ? (
                                            <TrendingUp className="w-2.5 h-2.5 inline" />
                                          ) : (item.delta_total_leads ?? 0) < 0 ? (
                                            <TrendingDown className="w-2.5 h-2.5 inline" />
                                          ) : (
                                            <Minus className="w-2.5 h-2.5 inline" />
                                          )}
                                          {formatDeltaCount(item.delta_total_leads)}
                                        </span>
                                      )}
                                    </div>
                                  </td>

                                  {/* Coluna Despachados com Mini-Barra Visual e Evolução */}
                                  <td className="py-2.5 px-3 text-right font-medium">
                                    <div className="flex flex-col items-end gap-1.5">
                                      <div className="inline-flex items-center gap-1.5 justify-end">
                                        <span className="text-foreground">{item.despachados}</span>
                                        <Badge
                                          variant="outline"
                                          className="text-[10px] py-0 px-1.5 font-semibold text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/40"
                                        >
                                          {item.taxa_despacho.toLocaleString('pt-BR', {
                                            minimumFractionDigits: 1,
                                            maximumFractionDigits: 1,
                                          })}
                                          %
                                        </Badge>
                                        {/* Evolução vs período anterior */}
                                        {item.prev_taxa_despacho !== undefined && (
                                          <span
                                            className={`text-[10px] font-semibold inline-flex items-center gap-0.5 ${deltaDespColor}`}
                                            title={`Período anterior: ${item.prev_taxa_despacho}% (${item.prev_despachados} despachados)`}
                                          >
                                            {deltaDesp > 0 ? (
                                              <TrendingUp className="w-2.5 h-2.5 inline" />
                                            ) : deltaDesp < 0 ? (
                                              <TrendingDown className="w-2.5 h-2.5 inline" />
                                            ) : (
                                              <Minus className="w-2.5 h-2.5 inline" />
                                            )}
                                            {formatDeltaPp(item.delta_taxa_despacho)}
                                          </span>
                                        )}
                                      </div>

                                      {/* Mini-barra visual horizontal proporcional */}
                                      <div
                                        className="w-full h-1.5 bg-muted/70 rounded-full overflow-hidden"
                                        title={`Taxa de despacho: ${item.taxa_despacho}%`}
                                      >
                                        <div
                                          className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-300"
                                          style={{ width: `${pctDespachoClamped}%` }}
                                        />
                                      </div>
                                    </div>
                                  </td>

                                  {/* Coluna Perdidos com Mini-Barra Visual e Evolução */}
                                  <td className="py-2.5 px-3 text-right font-medium">
                                    <div className="flex flex-col items-end gap-1.5">
                                      <div className="inline-flex items-center gap-1.5 justify-end">
                                        <span className="text-foreground">{item.perdidos}</span>
                                        <Badge
                                          variant="outline"
                                          className={`text-[10px] py-0 px-1.5 font-semibold ${
                                            pctPerdaClamped >= 30
                                              ? 'text-rose-700 dark:text-rose-200 border-rose-400 dark:border-rose-600 bg-rose-100/80 dark:bg-rose-950/70 font-bold'
                                              : 'text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/40'
                                          }`}
                                        >
                                          {item.taxa_perda.toLocaleString('pt-BR', {
                                            minimumFractionDigits: 1,
                                            maximumFractionDigits: 1,
                                          })}
                                          %
                                        </Badge>
                                        {/* Evolução vs período anterior */}
                                        {item.prev_taxa_perda !== undefined && (
                                          <span
                                            className={`text-[10px] font-semibold inline-flex items-center gap-0.5 ${deltaPerdaColor}`}
                                            title={`Período anterior: ${item.prev_taxa_perda}% (${item.prev_perdidos} perdidos)`}
                                          >
                                            {deltaPerda > 0 ? (
                                              <TrendingUp className="w-2.5 h-2.5 inline" />
                                            ) : deltaPerda < 0 ? (
                                              <TrendingDown className="w-2.5 h-2.5 inline" />
                                            ) : (
                                              <Minus className="w-2.5 h-2.5 inline" />
                                            )}
                                            {formatDeltaPp(item.delta_taxa_perda)}
                                          </span>
                                        )}
                                      </div>

                                      {/* Mini-barra visual horizontal proporcional */}
                                      <div
                                        className="w-full h-1.5 bg-muted/70 rounded-full overflow-hidden"
                                        title={`Taxa de perda: ${item.taxa_perda}%`}
                                      >
                                        <div
                                          className={`h-full rounded-full transition-all duration-300 ${
                                            pctPerdaClamped >= 30
                                              ? 'bg-rose-600 dark:bg-rose-500'
                                              : 'bg-rose-500/80 dark:bg-rose-400'
                                          }`}
                                          style={{ width: `${pctPerdaClamped}%` }}
                                        />
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                          <tfoot className="border-t border-border bg-muted/40 font-semibold text-foreground">
                            <tr>
                              <td className="py-2.5 px-3 font-bold">Total Consolidado</td>
                              <td className="py-2.5 px-3 text-right font-bold">
                                <div className="flex flex-col items-end">
                                  <span>{somaTotal}</span>
                                  {somaPrevTotal > 0 && (
                                    <span
                                      className={`text-[10px] inline-flex items-center gap-0.5 font-bold ${
                                        deltaTotalGlobal > 0
                                          ? 'text-emerald-600 dark:text-emerald-400'
                                          : deltaTotalGlobal < 0
                                            ? 'text-rose-600 dark:text-rose-400'
                                            : 'text-muted-foreground'
                                      }`}
                                      title={`Período anterior: ${somaPrevTotal} leads totais`}
                                    >
                                      {deltaTotalGlobal > 0 ? (
                                        <TrendingUp className="w-2.5 h-2.5 inline" />
                                      ) : deltaTotalGlobal < 0 ? (
                                        <TrendingDown className="w-2.5 h-2.5 inline" />
                                      ) : (
                                        <Minus className="w-2.5 h-2.5 inline" />
                                      )}
                                      {formatDeltaCount(deltaTotalGlobal)}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold">
                                <div className="flex flex-col items-end gap-1.5">
                                  <div className="inline-flex items-center gap-1.5 justify-end">
                                    <span>{somaDespachados}</span>
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] py-0 px-1.5 font-bold text-blue-800 dark:text-blue-200 border-blue-400 dark:border-blue-700 bg-blue-100/60 dark:bg-blue-900/40"
                                    >
                                      {taxaGlobalDespachoNum.toLocaleString('pt-BR', {
                                        minimumFractionDigits: 1,
                                        maximumFractionDigits: 1,
                                      })}
                                      %
                                    </Badge>
                                    {somaPrevTotal > 0 && (
                                      <span
                                        className={`text-[10px] font-bold inline-flex items-center gap-0.5 ${
                                          deltaTaxaDespachoGlobal > 0
                                            ? 'text-emerald-600 dark:text-emerald-400'
                                            : deltaTaxaDespachoGlobal < 0
                                              ? 'text-rose-600 dark:text-rose-400'
                                              : 'text-muted-foreground'
                                        }`}
                                        title={`Período anterior: ${prevTaxaGlobalDespachoNum.toFixed(1)}%`}
                                      >
                                        {deltaTaxaDespachoGlobal > 0 ? (
                                          <TrendingUp className="w-2.5 h-2.5 inline" />
                                        ) : deltaTaxaDespachoGlobal < 0 ? (
                                          <TrendingDown className="w-2.5 h-2.5 inline" />
                                        ) : (
                                          <Minus className="w-2.5 h-2.5 inline" />
                                        )}
                                        {formatDeltaPp(deltaTaxaDespachoGlobal)}
                                      </span>
                                    )}
                                  </div>
                                  <div className="w-full h-1.5 bg-muted/70 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-blue-700 dark:bg-blue-400 rounded-full transition-all duration-300"
                                      style={{
                                        width: `${Math.min(100, Math.max(0, taxaGlobalDespachoNum))}%`,
                                      }}
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold">
                                <div className="flex flex-col items-end gap-1.5">
                                  <div className="inline-flex items-center gap-1.5 justify-end">
                                    <span>{somaPerdidos}</span>
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] py-0 px-1.5 font-bold text-rose-800 dark:text-rose-200 border-rose-400 dark:border-rose-700 bg-rose-100/60 dark:bg-rose-900/40"
                                    >
                                      {taxaGlobalPerdaNum.toLocaleString('pt-BR', {
                                        minimumFractionDigits: 1,
                                        maximumFractionDigits: 1,
                                      })}
                                      %
                                    </Badge>
                                    {somaPrevTotal > 0 && (
                                      <span
                                        className={`text-[10px] font-bold inline-flex items-center gap-0.5 ${
                                          deltaTaxaPerdaGlobal > 0
                                            ? 'text-rose-600 dark:text-rose-400'
                                            : deltaTaxaPerdaGlobal < 0
                                              ? 'text-emerald-600 dark:text-emerald-400'
                                              : 'text-muted-foreground'
                                        }`}
                                        title={`Período anterior: ${prevTaxaGlobalPerdaNum.toFixed(1)}%`}
                                      >
                                        {deltaTaxaPerdaGlobal > 0 ? (
                                          <TrendingUp className="w-2.5 h-2.5 inline" />
                                        ) : deltaTaxaPerdaGlobal < 0 ? (
                                          <TrendingDown className="w-2.5 h-2.5 inline" />
                                        ) : (
                                          <Minus className="w-2.5 h-2.5 inline" />
                                        )}
                                        {formatDeltaPp(deltaTaxaPerdaGlobal)}
                                      </span>
                                    )}
                                  </div>
                                  <div className="w-full h-1.5 bg-muted/70 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-rose-700 dark:bg-rose-400 rounded-full transition-all duration-300"
                                      style={{
                                        width: `${Math.min(100, Math.max(0, taxaGlobalPerdaNum))}%`,
                                      }}
                                    />
                                  </div>
                                </div>
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>

                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-muted-foreground pt-1">
                        <div className="flex items-center gap-1.5">
                          <Info className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span>
                            Nota: Um lead pode ter sido despachado e posteriormente marcado como
                            perdido — as duas taxas são independentes e não se somam.
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground shrink-0">
                          Comparações vs. período anterior equivalente
                        </div>
                      </div>
                    </div>
                  )
                })()
              )}
            </CardContent>
          </Card>

          {/* Bloco Ciclo Médio de Vendas */}
          <Card className="border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Hourglass className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  Ciclo de Vendas (Duas Réguas: Fluxo Direto vs. Com Stand By)
                </CardTitle>
                <CardDescription>
                  Tempo do primeiro contato até o fechamento. O tempo em Vendido jamais entra e
                  leads que passaram por Stand By são analisados em régua separada.
                </CardDescription>
              </div>
              {temDadosCiclo && (
                <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 px-3 py-1 rounded-md border border-border">
                  <span>Amostra analisada:</span>
                  <strong className="text-foreground font-semibold">
                    {(cicloGeral?.qtd_vendas ?? 0) + (cicloGeralComStandby?.qtd_vendas ?? 0)} vendas
                    totais
                  </strong>
                  <span className="text-muted-foreground/60">•</span>
                  <span className="text-blue-600 dark:text-blue-400 font-medium">
                    {cicloGeral?.qtd_vendas ?? 0} direto
                  </span>
                  <span className="text-muted-foreground/60">/</span>
                  <span className="text-amber-600 dark:text-amber-400 font-medium">
                    {cicloGeralComStandby?.qtd_vendas ?? 0} com Stand By
                  </span>
                </div>
              )}
            </CardHeader>
            <CardContent className="pt-2">
              {!temDadosCiclo ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  Sem vendas com data registradas no período
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Grid das 2 Réguas Principais */}
                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Régua 1: Fluxo Direto */}
                    <div className="p-4 rounded-xl border border-blue-200/80 bg-blue-50/50 dark:border-blue-900/50 dark:bg-blue-950/20 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" />
                          <span className="text-xs font-bold uppercase tracking-wider text-blue-950 dark:text-blue-200">
                            Fluxo Direto (Sem Stand By)
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className="border-blue-300 text-blue-800 dark:border-blue-800 dark:text-blue-300 bg-blue-100/60 dark:bg-blue-900/40 text-[11px] font-semibold"
                        >
                          {cicloGeral?.qtd_vendas ?? 0}{' '}
                          {cicloGeral?.qtd_vendas === 1 ? 'venda' : 'vendas'}
                        </Badge>
                      </div>

                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-blue-950 dark:text-blue-100">
                          {formatDias(cicloGeral?.media_dias)}
                        </span>
                        <span className="text-xs text-blue-800/80 dark:text-blue-300/80">
                          ciclo médio
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-blue-200/60 dark:border-blue-900/40 text-[11px]">
                        <div>
                          <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                            Mediana
                          </span>
                          <span className="font-bold text-foreground">
                            {formatDias(cicloGeral?.mediana_dias)}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                            Mais Rápido
                          </span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {formatDias(cicloGeral?.min_dias)}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                            Mais Lento
                          </span>
                          <span className="font-bold text-rose-600 dark:text-rose-400">
                            {formatDias(cicloGeral?.max_dias)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Régua 2: Com Stand By */}
                    <div className="p-4 rounded-xl border border-amber-200/80 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                          <span className="text-xs font-bold uppercase tracking-wider text-amber-950 dark:text-amber-200">
                            Com Passagem por Stand By
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className="border-amber-300 text-amber-800 dark:border-amber-800 dark:text-amber-300 bg-amber-100/60 dark:bg-amber-900/40 text-[11px] font-semibold"
                        >
                          {cicloGeralComStandby?.qtd_vendas ?? 0}{' '}
                          {cicloGeralComStandby?.qtd_vendas === 1 ? 'venda' : 'vendas'}
                        </Badge>
                      </div>

                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-amber-950 dark:text-amber-100">
                          {formatDias(cicloGeralComStandby?.media_dias)}
                        </span>
                        <span className="text-xs text-amber-800/80 dark:text-amber-300/80">
                          ciclo médio
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-amber-200/60 dark:border-amber-900/40 text-[11px]">
                        <div>
                          <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                            Mediana
                          </span>
                          <span className="font-bold text-foreground">
                            {formatDias(cicloGeralComStandby?.mediana_dias)}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                            Mais Rápido
                          </span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {formatDias(cicloGeralComStandby?.min_dias)}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px] uppercase font-semibold">
                            Mais Lento
                          </span>
                          <span className="font-bold text-rose-600 dark:text-rose-400">
                            {formatDias(cicloGeralComStandby?.max_dias)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Seção Ciclo por Origem */}
                  <div className="space-y-3 pt-2 border-t border-border">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-foreground">
                          Ciclo por Origem (Duas Réguas)
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Desdobramento do ciclo em fluxo direto e histórico com passagem por Stand
                          By
                        </p>
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {cicloOrigens.length} {cicloOrigens.length === 1 ? 'origem' : 'origens'}
                      </span>
                    </div>

                    <div className="grid lg:grid-cols-12 gap-6 items-start pt-1">
                      {/* Barras horizontais por origem (Fluxo Direto) */}
                      <div className="lg:col-span-6 space-y-4">
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between pb-1 border-b border-border/60">
                          <span>Fluxo Direto por Origem</span>
                          <span className="text-[10px] text-blue-600 font-bold">Sem Stand By</span>
                        </div>
                        {cicloOrigens.map((item, idx) => {
                          const color = getOriginColor(item.origem, idx)
                          const percentWidth =
                            maxCicloOrigem > 0
                              ? Math.max(
                                  6,
                                  Math.round((item.ciclo_medio_dias / maxCicloOrigem) * 100),
                                )
                              : 0

                          return (
                            <div key={item.origem} className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs font-medium">
                                <div className="flex items-center gap-2 truncate">
                                  <span
                                    className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                                    style={{ backgroundColor: color }}
                                  />
                                  <span className="font-semibold text-foreground truncate">
                                    {item.origem}
                                  </span>
                                  <span className="text-muted-foreground text-[11px] truncate">
                                    · {item.qtd_vendas} {item.qtd_vendas === 1 ? 'venda' : 'vendas'}
                                  </span>
                                </div>
                                <span className="font-bold text-foreground shrink-0 ml-2">
                                  {formatDias(item.ciclo_medio_dias)}
                                </span>
                              </div>
                              <div className="h-3 w-full bg-muted/60 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-500 ease-out"
                                  style={{
                                    width: `${percentWidth}%`,
                                    backgroundColor: color,
                                  }}
                                  title={`${item.origem} (Direto) — ${formatDias(item.ciclo_medio_dias)} · ${item.qtd_vendas} vendas`}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {/* Tabela completa com as duas réguas lado a lado */}
                      <div className="lg:col-span-6 overflow-x-auto rounded-lg border border-border">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border">
                            <tr>
                              <th className="py-2.5 px-3 font-semibold">Origem</th>
                              <th className="py-2.5 px-3 text-right font-semibold text-blue-600">
                                Direto
                              </th>
                              <th className="py-2.5 px-3 text-right font-semibold text-blue-600">
                                Ciclo Direto
                              </th>
                              <th className="py-2.5 px-3 text-right font-semibold text-amber-600">
                                c/ StandBy
                              </th>
                              <th className="py-2.5 px-3 text-right font-semibold text-amber-600">
                                Ciclo c/ SB
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border bg-card">
                            {cicloOrigens.map((item, idx) => (
                              <tr key={item.origem} className="hover:bg-muted/30 transition-colors">
                                <td className="py-2.5 px-3 font-semibold text-foreground flex items-center gap-2">
                                  <span
                                    className="w-2 h-2 rounded-full inline-block shrink-0"
                                    style={{ backgroundColor: getOriginColor(item.origem, idx) }}
                                  />
                                  <span className="truncate">{item.origem}</span>
                                </td>
                                <td className="py-2.5 px-3 text-right font-medium text-foreground">
                                  {item.qtd_vendas}
                                </td>
                                <td className="py-2.5 px-3 text-right font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                                  {formatDias(item.ciclo_medio_dias)}
                                </td>
                                <td className="py-2.5 px-3 text-right font-medium text-muted-foreground">
                                  {item.qtd_vendas_com_standby ?? 0}
                                </td>
                                <td className="py-2.5 px-3 text-right font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                                  {item.ciclo_medio_com_standby !== null &&
                                  item.ciclo_medio_com_standby !== undefined
                                    ? formatDias(item.ciclo_medio_com_standby)
                                    : '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="border-t border-border bg-muted/40 font-semibold text-foreground">
                            <tr>
                              <td className="py-2 px-3">Geral Empresa</td>
                              <td className="py-2 px-3 text-right font-medium">
                                {cicloGeral?.qtd_vendas ?? 0}
                              </td>
                              <td className="py-2 px-3 text-right font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                                {formatDias(cicloGeral?.media_dias)}
                              </td>
                              <td className="py-2 px-3 text-right font-medium text-muted-foreground">
                                {cicloGeralComStandby?.qtd_vendas ?? 0}
                              </td>
                              <td className="py-2 px-3 text-right font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                                {formatDias(cicloGeralComStandby?.media_dias)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bloco Ticket Médio por Origem */}
          <Card className="border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  Ticket Médio por Origem
                </CardTitle>
                <CardDescription>
                  Valor médio contratado por canal de captação de clientes vendidos
                </CardDescription>
              </div>
              {ticketOrigensOrdenado.length > 0 && (
                <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 px-3 py-1 rounded-md border border-border">
                  <span>Total somado:</span>
                  <strong className="text-foreground font-semibold">
                    {currencyFormatter.format(totalValorTicket)}
                  </strong>
                  <span className="text-muted-foreground/60">•</span>
                  <strong className="text-foreground font-semibold">
                    {totalVendasTicket} vendas
                  </strong>
                </div>
              )}
            </CardHeader>
            <CardContent className="pt-2">
              {ticketOrigensOrdenado.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  Sem vendas com valor registradas no período
                </div>
              ) : (
                <div className="grid lg:grid-cols-12 gap-6 items-start">
                  {/* Barras horizontais por origem */}
                  <div className="lg:col-span-7 space-y-4">
                    {ticketOrigensOrdenado.map((item, idx) => {
                      const color = getOriginColor(item.origem, idx)
                      const percentWidth =
                        maxTicketMedio > 0
                          ? Math.max(6, Math.round((item.ticket_medio / maxTicketMedio) * 100))
                          : 0

                      return (
                        <div key={item.origem} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-medium">
                            <div className="flex items-center gap-2 truncate">
                              <span
                                className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                                style={{ backgroundColor: color }}
                              />
                              <span className="font-semibold text-foreground truncate">
                                {item.origem}
                              </span>
                              <span className="text-muted-foreground text-[11px] truncate">
                                · {item.qtd_vendas} {item.qtd_vendas === 1 ? 'venda' : 'vendas'}
                              </span>
                            </div>
                            <span className="font-bold text-foreground shrink-0 ml-2">
                              {currencyFormatter.format(item.ticket_medio)}
                            </span>
                          </div>
                          <div className="h-3 w-full bg-muted/60 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500 ease-out"
                              style={{
                                width: `${percentWidth}%`,
                                backgroundColor: color,
                              }}
                              title={`${item.origem} — ${currencyFormatter.format(item.ticket_medio)} · ${item.qtd_vendas} vendas`}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Mini-tabela resumo ao lado */}
                  <div className="lg:col-span-5 overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border">
                        <tr>
                          <th className="py-2.5 px-3 font-semibold">Origem</th>
                          <th className="py-2.5 px-3 text-right font-semibold">Vendas</th>
                          <th className="py-2.5 px-3 text-right font-semibold">Valor Total</th>
                          <th className="py-2.5 px-3 text-right font-semibold">Ticket Médio</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border bg-card">
                        {ticketOrigensOrdenado.map((item, idx) => (
                          <tr key={item.origem} className="hover:bg-muted/30 transition-colors">
                            <td className="py-2.5 px-3 font-semibold text-foreground flex items-center gap-2">
                              <span
                                className="w-2 h-2 rounded-full inline-block shrink-0"
                                style={{ backgroundColor: getOriginColor(item.origem, idx) }}
                              />
                              <span className="truncate">{item.origem}</span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-medium text-foreground">
                              {item.qtd_vendas}
                            </td>
                            <td className="py-2.5 px-3 text-right font-medium text-muted-foreground">
                              {currencyFormatter.format(item.valor_total)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                              {currencyFormatter.format(item.ticket_medio)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="border-t border-border bg-muted/40 font-semibold text-foreground">
                        <tr>
                          <td className="py-2 px-3">Total</td>
                          <td className="py-2 px-3 text-right">{totalVendasTicket}</td>
                          <td className="py-2 px-3 text-right font-medium">
                            {currencyFormatter.format(totalValorTicket)}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                            {totalVendasTicket > 0
                              ? currencyFormatter.format(totalValorTicket / totalVendasTicket)
                              : currencyFormatter.format(0)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bloco Motivos de Perda */}
          <Card className="border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  Motivos de Perda
                </CardTitle>
                <CardDescription>
                  Ranking de motivos e análise das etapas comerciais onde as oportunidades mais
                  morrem
                </CardDescription>
              </div>
              {temDadosPerda && (
                <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 px-3 py-1 rounded-md border border-border">
                  <span>Total de perdas registradas:</span>
                  <strong className="text-foreground font-semibold">
                    {totalPerdas} {totalPerdas === 1 ? 'perda' : 'perdas'}
                  </strong>
                  {qtdOutro > 0 && (
                    <>
                      <span className="text-muted-foreground/60">•</span>
                      <span className="text-muted-foreground">
                        {qtdOutro} {qtdOutro === 1 ? 'outro' : 'outros'}
                      </span>
                    </>
                  )}
                </div>
              )}
            </CardHeader>
            <CardContent className="pt-2">
              {!temDadosPerda ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  Nenhuma perda registrada no período
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Grid 2 colunas: Ranking de Motivos (esquerda) e Onde as Vendas Morrem (direita) */}
                  <div className="grid lg:grid-cols-2 gap-8 items-start">
                    {/* Lado esquerdo: Ranking de Motivos */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-border pb-2">
                        <div>
                          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                            <XCircle className="h-4 w-4 text-rose-500" />
                            Ranking de Motivos
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            Por que os clientes não fecharam conosco
                          </p>
                        </div>
                        <Badge variant="outline" className="text-[11px] font-semibold">
                          {perdasPorMotivo.length}{' '}
                          {perdasPorMotivo.length === 1 ? 'motivo' : 'motivos'}
                        </Badge>
                      </div>

                      {perdasPorMotivo.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-4 text-center">
                          Sem motivos detalhados no período
                        </p>
                      ) : (
                        <div className="space-y-3.5">
                          {perdasPorMotivo.map((item) => {
                            const isOutro = item.motivo.toLowerCase() === 'outro'
                            const pctRelativo =
                              maxQtdMotivo > 0
                                ? Math.max(6, Math.round((item.qtd_perdas / maxQtdMotivo) * 100))
                                : 0
                            const pctTotal =
                              totalPerdas > 0
                                ? Math.round((item.qtd_perdas / totalPerdas) * 100)
                                : 0

                            return (
                              <div key={item.motivo} className="space-y-1.5">
                                <div className="flex items-center justify-between text-xs font-medium">
                                  <div className="flex items-center gap-2 truncate">
                                    <span
                                      className={`w-2.5 h-2.5 rounded-full inline-block shrink-0 ${
                                        isOutro ? 'bg-slate-400' : 'bg-rose-500'
                                      }`}
                                    />
                                    <span
                                      className={`font-semibold truncate ${
                                        isOutro ? 'text-muted-foreground' : 'text-foreground'
                                      }`}
                                    >
                                      {item.motivo}
                                    </span>
                                    {isOutro && (
                                      <Badge
                                        variant="outline"
                                        className="text-[9px] py-0 px-1 text-muted-foreground border-border"
                                      >
                                        Motivo aberto
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0 ml-2">
                                    <span className="text-[11px] text-muted-foreground font-normal">
                                      {pctTotal}%
                                    </span>
                                    <span className="font-bold text-foreground">
                                      {item.qtd_perdas} {item.qtd_perdas === 1 ? 'perda' : 'perdas'}
                                    </span>
                                  </div>
                                </div>
                                <div className="h-3 w-full bg-muted/60 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ease-out ${
                                      isOutro ? 'bg-slate-400/80' : 'bg-rose-500'
                                    }`}
                                    style={{ width: `${pctRelativo}%` }}
                                    title={`${item.motivo} — ${item.qtd_perdas} perdas (${pctTotal}% do total)`}
                                  />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* Lado direito: Onde as vendas morrem (Etapa da perda) */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-border pb-2">
                        <div>
                          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                            <Layers className="h-4 w-4 text-amber-500" />
                            Onde as vendas morrem
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            Fase do funil em que o lead estava ao ser perdido
                          </p>
                        </div>
                        <Badge variant="outline" className="text-[11px] font-semibold">
                          {perdasPorEtapa.length} {perdasPorEtapa.length === 1 ? 'etapa' : 'etapas'}
                        </Badge>
                      </div>

                      {perdasPorEtapa.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-4 text-center">
                          Nenhuma etapa registrada para as perdas do período
                        </p>
                      ) : (
                        <div className="space-y-3.5">
                          {perdasPorEtapa.map((item, idx) => {
                            const pctRelativo =
                              maxQtdEtapa > 0
                                ? Math.max(6, Math.round((item.qtd_perdas / maxQtdEtapa) * 100))
                                : 0
                            const pctTotal =
                              totalPerdas > 0
                                ? Math.round((item.qtd_perdas / totalPerdas) * 100)
                                : 0
                            // Destaque para a etapa mais crítica (primeira da lista)
                            const isGargalo = idx === 0

                            return (
                              <div key={item.etapa} className="space-y-1.5">
                                <div className="flex items-center justify-between text-xs font-medium">
                                  <div className="flex items-center gap-2 truncate">
                                    <span
                                      className={`w-2.5 h-2.5 rounded-full inline-block shrink-0 ${
                                        isGargalo ? 'bg-amber-500' : 'bg-blue-500'
                                      }`}
                                    />
                                    <span className="font-semibold text-foreground truncate">
                                      {item.etapa}
                                    </span>
                                    {isGargalo && (
                                      <Badge
                                        variant="outline"
                                        className="text-[9px] py-0 px-1 border-amber-300 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50"
                                      >
                                        Mais fatal
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0 ml-2">
                                    <span className="text-[11px] text-muted-foreground font-normal">
                                      {pctTotal}%
                                    </span>
                                    <span className="font-bold text-foreground">
                                      {item.qtd_perdas} {item.qtd_perdas === 1 ? 'perda' : 'perdas'}
                                    </span>
                                  </div>
                                </div>
                                <div className="h-3 w-full bg-muted/60 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ease-out ${
                                      isGargalo ? 'bg-amber-500' : 'bg-blue-500'
                                    }`}
                                    style={{ width: `${pctRelativo}%` }}
                                    title={`${item.etapa} — ${item.qtd_perdas} perdas (${pctTotal}% do total)`}
                                  />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Rodapé informativo discreto */}
                  <div className="pt-3 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <HelpCircle className="h-3.5 w-3.5" />
                      <span>
                        Contabiliza todos os leads com motivo registrado nas abas comerciais no
                        período selecionado.
                      </span>
                    </div>
                    <div className="font-semibold text-foreground shrink-0">
                      Total de {totalPerdas}{' '}
                      {totalPerdas === 1 ? 'perda analisada' : 'perdas analisadas'}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* SUB-ABA 2: NOVO CONTATO */}
      {activeSubTab === 'novo_contato' && (
        <NovoContatoSubTab data={novo_contato} tempoColunas={tempo_colunas?.novo_contato} />
      )}

      {/* SUB-ABA 3: CONSULTORIA */}
      {activeSubTab === 'consultoria' && (
        <ConsultoriaSubTab
          data={consultoria}
          tempoColunas={tempo_colunas?.consultoria}
          atendimentosMetrics={data}
        />
      )}

      {/* SUB-ABA 4: LEADS P/ ORÇAMENTO */}
      {activeSubTab === 'orcamentos' && (
        <OrcamentosSubTab data={orcamentos} tempoColunas={tempo_colunas?.orcamentos} />
      )}
    </div>
  )
}

// -------------------------------------------------------------
// Componente Reutilizável: Tempo dos Leads por Coluna
// -------------------------------------------------------------
interface BlocoTempoColunasProps {
  abaId: string
  items?: TempoColunaItem[]
  descricao?: string
}

function BlocoTempoColunas({ abaId, items = [], descricao }: BlocoTempoColunasProps) {
  const abaConfig = ATENDIMENTO_ABAS.find((a) => a.id === abaId)
  const colunasConfig = abaConfig?.colunas ?? []

  // Mapear itens por coluna original e por título limpo
  const mapItens = new Map<string, TempoColunaItem>()
  for (const it of items) {
    if (!it || !it.coluna) continue
    mapItens.set(it.coluna, it)
    const limpo = cleanColumnTitle(it.coluna)
    if (limpo && !mapItens.has(limpo)) {
      mapItens.set(limpo, it)
    }
  }

  // Montar lista respeitando estritamente a ordem do funil oficial de ATENDIMENTO_ABAS
  // Nenhuma coluna fora da lista oficial pode ser exibida
  const colunasOrdenadas: {
    rotulo: string
    colunaReal: string
    qtd: number
    tempoMedio: number
    tempoMax: number
  }[] = []

  for (const col of colunasConfig) {
    const limpo = cleanColumnTitle(col)
    // Filtrar defensivamente as colunas Vendido e Perdido do tempo por coluna (fim de fluxo)
    const lowerCol = (col || '').toLowerCase().trim()
    const lowerLimpo = (limpo || '').toLowerCase().trim()
    if (
      lowerCol === 'vendido' ||
      lowerLimpo === 'vendido' ||
      lowerCol === 'perdido' ||
      lowerLimpo === 'perdido' ||
      lowerCol.includes('perdido')
    ) {
      continue
    }

    // Tenta correspondência exata, depois limpa
    const it = mapItens.get(col) ?? mapItens.get(limpo)
    colunasOrdenadas.push({
      rotulo: limpo || col,
      colunaReal: it?.coluna || col,
      qtd: it?.qtd_cards ?? 0,
      tempoMedio: it?.tempo_medio_dias ?? 0,
      tempoMax: it?.tempo_max_dias ?? 0,
    })
  }

  const totalCards = colunasOrdenadas.reduce((acc, c) => acc + c.qtd, 0)
  const maxTempoMedio =
    colunasOrdenadas.length > 0 ? Math.max(...colunasOrdenadas.map((c) => c.tempoMedio)) : 0

  const formatDiasNum = (dias: number) => {
    return `${dias.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} dias`
  }

  // Cores contextuais: vermelho nas colunas com maior tempo médio relativo
  const getBarColor = (tempoMedio: number) => {
    if (tempoMedio <= 0 || maxTempoMedio <= 0) return '#94a3b8' // slate neutro
    const ratio = tempoMedio / maxTempoMedio
    if (ratio >= 0.75) return '#ef4444' // vermelho (maior tempo)
    if (ratio >= 0.45) return '#f59e0b' // âmbar
    if (ratio >= 0.2) return '#3b82f6' // azul
    return '#10b981' // verde
  }

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Hourglass className="h-4 w-4 text-primary" />
              Tempo dos Leads por Coluna
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              {descricao ||
                'Permanência média dos leads HOJE em cada estágio da esteira (now − última movimentação)'}
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className="text-xs font-semibold self-start sm:self-auto shrink-0"
          >
            {totalCards} {totalCards === 1 ? 'card ativo' : 'cards ativos'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-1">
        {totalCards === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-1.5">
            <Clock className="h-5 w-5 text-muted-foreground/60" />
            <span>Nenhum lead presente nesta esteira atualmente.</span>
          </div>
        ) : (
          <div className="space-y-3.5">
            {colunasOrdenadas.map((c) => {
              const percentWidth =
                maxTempoMedio > 0 && c.tempoMedio > 0
                  ? Math.max(5, Math.round((c.tempoMedio / maxTempoMedio) * 100))
                  : c.qtd > 0
                    ? 3
                    : 0
              const barColor = getBarColor(c.tempoMedio)
              const isPiorCaso = maxTempoMedio > 0 && c.tempoMedio === maxTempoMedio && c.qtd > 0

              return (
                <div key={c.colunaReal} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-semibold text-foreground truncate">{c.rotulo}</span>
                      {isPiorCaso && (
                        <Badge
                          variant="destructive"
                          className="text-[10px] py-0 px-1.5 font-bold uppercase tracking-wider shrink-0"
                        >
                          Maior tempo
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="text-[11px] text-muted-foreground font-medium">
                        {c.qtd} {c.qtd === 1 ? 'lead' : 'leads'}
                      </span>
                      <span className="font-extrabold text-foreground min-w-[70px] text-right">
                        {formatDiasNum(c.tempoMedio)}
                      </span>
                      {c.tempoMax > 0 && (
                        <TooltipProvider>
                          <UITooltip>
                            <TooltipTrigger asChild>
                              <Badge
                                variant="outline"
                                className="text-[10px] py-0 px-1.5 text-muted-foreground hover:text-foreground cursor-help font-mono border-dashed"
                              >
                                máx: {formatDiasNum(c.tempoMax)}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                              Pior caso nesta coluna: lead há {formatDiasNum(c.tempoMax)} sem
                              movimentação
                            </TooltipContent>
                          </UITooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </div>
                  <div className="h-2.5 w-full bg-muted/60 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500 ease-out"
                      style={{
                        width: `${percentWidth}%`,
                        backgroundColor: barColor,
                      }}
                      title={`${c.rotulo}: média de ${formatDiasNum(c.tempoMedio)} (${c.qtd} leads)`}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// -------------------------------------------------------------
// Componente da Sub-aba Novo Contato (Aba 01 / SDR)
// -------------------------------------------------------------
function NovoContatoSubTab({
  data,
  tempoColunas,
}: {
  data?: NovoContatoMetrics
  tempoColunas?: TempoColunaItem[]
}) {
  const total = data?.total ?? 0
  const criadosNoPeriodo = data?.criados_no_periodo ?? 0
  const porStatusRaw = data?.por_status ?? []
  const porOrigem = data?.por_origem ?? []
  const taxaDespacho = data?.taxa_despacho ?? 0

  // Quantidade de despachos reais (enviados para Consultoria ou Orçamentos)
  const totalDespachados = data?.despachados_real ?? 0

  // Limpar títulos de status e consolidar
  const statusMap = new Map<string, number>()
  for (const item of porStatusRaw) {
    const cleanTitle = cleanColumnTitle(item.status) || 'Novo contato'
    statusMap.set(cleanTitle, (statusMap.get(cleanTitle) ?? 0) + item.qtd)
  }

  // Ordenar conforme as 8 colunas oficiais da aba 01 quando presentes
  const colunasOrdemPadrao = [
    'Novo contato',
    'Em contato',
    'Follow up 1',
    'Follow up 2',
    'Follow up 3',
    'Stand By',
    'Perdido',
    'Não é lead',
  ]

  const statusList: { status: string; qtd: number }[] = []
  // Primeiro as padrão que existem no map
  for (const col of colunasOrdemPadrao) {
    if (statusMap.has(col)) {
      statusList.push({ status: col, qtd: statusMap.get(col)! })
      statusMap.delete(col)
    }
  }
  // Restantes ordenados por qtd desc
  const restantes = Array.from(statusMap.entries()).map(([status, qtd]) => ({ status, qtd }))
  restantes.sort((a, b) => b.qtd - a.qtd)
  statusList.push(...restantes)

  const maxQtdOrigem = porOrigem.length > 0 ? Math.max(...porOrigem.map((o) => o.qtd)) : 0

  if (total === 0) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground">
                Total de Leads
              </CardTitle>
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Users className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold text-foreground">0</div>
              <p className="text-xs text-muted-foreground mt-1">
                Nenhum lead na esteira no período
              </p>
            </CardContent>
          </Card>
        </div>
        <Card className="border-border shadow-sm p-12 text-center text-sm text-muted-foreground">
          Nenhum lead encontrado na esteira Novo Contato para o período selecionado.
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 4 Cards Resumo */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">
              Total de Leads
            </CardTitle>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Users className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-foreground">{total}</div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              Leads na esteira de triagem SDR
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">
              Criados no Período
            </CardTitle>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <CalendarDays className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-foreground">{criadosNoPeriodo}</div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              Novas conversas registradas no range
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">
              Despachados
            </CardTitle>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Send className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-foreground">{totalDespachados}</div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              Despachados p/ Consultoria ou Orçamentos
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">
              Taxa de Despacho
            </CardTitle>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-foreground">
              {taxaDespacho.toLocaleString('pt-BR', {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}
              %
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              Despacho real ÷ total Novo Contato
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Barras por Status / Coluna (Títulos Limpos) + Bloco de Origens */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Distribuição por Status */}
        <Card className="lg:col-span-7 border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Distribuição por Coluna / Status
            </CardTitle>
            <CardDescription>
              Volume de contatos em cada estágio do fluxo de pré-atendimento (SDR)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusList} margin={{ top: 10, right: 10, left: -15, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis
                    dataKey="status"
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                    tick={{ fontSize: 11, fill: 'currentColor' }}
                    className="text-muted-foreground"
                    height={45}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: 'currentColor' }}
                    className="text-muted-foreground"
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload as { status: string; qtd: number }
                        const pct = total > 0 ? ((item.qtd / total) * 100).toFixed(1) : '0'
                        return (
                          <div className="bg-popover border border-border p-2.5 rounded-lg shadow-md text-xs space-y-1">
                            <p className="font-bold text-foreground">{item.status}</p>
                            <p className="text-blue-600 dark:text-blue-400">
                              Quantidade: <strong>{item.qtd} leads</strong>
                            </p>
                            <p className="text-muted-foreground">
                              Participação: <strong>{pct}%</strong>
                            </p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Bar dataKey="qtd" name="Leads" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                    {statusList.map((entry, index) => (
                      <Cell
                        key={`cell-nc-status-${index}`}
                        fill={
                          entry.status === 'Perdido' || entry.status === 'Não é lead'
                            ? '#f43f5e'
                            : '#3b82f6'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Bloco Origens (Barras Horizontais com Todas as Origens, sem Exclusão) */}
        <Card className="lg:col-span-5 border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <PieIcon className="h-4 w-4 text-primary" />
              Origens de Entrada
            </CardTitle>
            <CardDescription>
              Canais declarados de todos os leads da esteira (inclui WhatsApp e A definir)
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            {porOrigem.length === 0 ? (
              <p className="text-xs text-muted-foreground py-10 text-center">
                Sem origens registradas no período
              </p>
            ) : (
              <div className="space-y-3.5 max-h-[320px] overflow-y-auto pr-1">
                {porOrigem.map((item, idx) => {
                  const color = getOriginColor(item.origem, idx)
                  const percentWidth =
                    maxQtdOrigem > 0 ? Math.max(6, Math.round((item.qtd / maxQtdOrigem) * 100)) : 0
                  const pctTotal = total > 0 ? Math.round((item.qtd / total) * 100) : 0

                  return (
                    <div key={item.origem} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <div className="flex items-center gap-2 truncate">
                          <span
                            className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <span className="font-semibold text-foreground truncate">
                            {item.origem}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className="text-[11px] text-muted-foreground font-normal">
                            {pctTotal}%
                          </span>
                          <span className="font-bold text-foreground">
                            {item.qtd} {item.qtd === 1 ? 'lead' : 'leads'}
                          </span>
                        </div>
                      </div>
                      <div className="h-2.5 w-full bg-muted/60 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500 ease-out"
                          style={{
                            width: `${percentWidth}%`,
                            backgroundColor: color,
                          }}
                          title={`${item.origem} — ${item.qtd} leads (${pctTotal}%)`}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bloco Tempo dos Leads por Coluna */}
      <BlocoTempoColunas
        abaId="novo-contato"
        items={tempoColunas}
        descricao="Permanência média dos leads HOJE em cada coluna da esteira SDR (ordem do funil)"
      />
    </div>
  )
}

// -------------------------------------------------------------
// Componente da Sub-aba Consultoria (Aba 02 / Comercial)
// -------------------------------------------------------------
function ConsultoriaSubTab({
  data,
  tempoColunas,
  atendimentosMetrics,
}: {
  data?: ConsultoriaMetrics
  tempoColunas?: TempoColunaItem[]
  atendimentosMetrics?: AtendimentosMetrics
}) {
  const [consultoriaView, setConsultoriaView] = useState<'esteira' | 'coortes'>('esteira')

  return (
    <div className="space-y-6">
      {/* Navegação de Sub-abas de Consultoria */}
      <div className="flex items-center justify-between border-b border-border pb-2">
        <Tabs
          value={consultoriaView}
          onValueChange={(val) => setConsultoriaView(val as 'esteira' | 'coortes')}
          className="w-auto"
        >
          <TabsList className="bg-muted p-1 rounded-lg border border-border h-9">
            <TabsTrigger
              value="esteira"
              className="data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground text-xs font-semibold gap-1.5 px-3"
            >
              <Briefcase className="w-3.5 h-3.5" />
              Funil / Esteira de Consultoria
            </TabsTrigger>
            <TabsTrigger
              value="coortes"
              className="data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground text-xs font-semibold gap-1.5 px-3"
            >
              <TrendingUp className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              Conversão por Coorte
              <Badge
                variant="outline"
                className="ml-1 text-[9px] py-0 px-1 border-purple-300 text-purple-700 bg-purple-50 dark:bg-purple-950/40"
              >
                Novo
              </Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="text-xs text-muted-foreground hidden sm:block">
          {consultoriaView === 'esteira'
            ? 'Métricas de fluxo atual da consultoria (período selecionado)'
            : 'Agrupamento de leads por mês de chegada (criado_em) e defasagem de vendas'}
        </div>
      </div>

      {consultoriaView === 'coortes' ? (
        <CoorteConversaoTab atendimentosMetrics={atendimentosMetrics} />
      ) : (
        <ConsultoriaEsteiraConteudo data={data} tempoColunas={tempoColunas} />
      )}
    </div>
  )
}

function ConsultoriaEsteiraConteudo({
  data,
  tempoColunas,
}: {
  data?: ConsultoriaMetrics
  tempoColunas?: TempoColunaItem[]
}) {
  const total = data?.total ?? 0
  const vendidos = data?.vendidos ?? 0
  const taxaConversao = data?.taxa_conversao ?? 0
  const ticketMedio = data?.ticket_medio_consultoria ?? 0
  const cicloMedio = data?.ciclo_medio_dias
  const porStatusRaw = data?.por_status ?? []
  const porOrigem = data?.por_origem ?? []

  // Limpar e consolidar status
  const statusMap = new Map<string, number>()
  for (const item of porStatusRaw) {
    const cleanTitle = cleanColumnTitle(item.status) || 'Consultoria Inicial'
    statusMap.set(cleanTitle, (statusMap.get(cleanTitle) ?? 0) + item.qtd)
  }

  // Ordenar conforme as colunas padrão da aba 02
  const colunasOrdemPadrao = [
    'Consultoria Inicial',
    'Projeto',
    'Apresentação',
    'Negociação',
    'Stand By',
    'Vendido',
    'Perdido',
    'Aguardando Consultor',
    'Ação Gerente',
    'Designar Consultor',
  ]

  const statusList: { status: string; qtd: number }[] = []
  for (const col of colunasOrdemPadrao) {
    if (statusMap.has(col)) {
      statusList.push({ status: col, qtd: statusMap.get(col)! })
      statusMap.delete(col)
    }
  }
  const restantes = Array.from(statusMap.entries()).map(([status, qtd]) => ({ status, qtd }))
  restantes.sort((a, b) => b.qtd - a.qtd)
  statusList.push(...restantes)

  const maxQtdOrigem = porOrigem.length > 0 ? Math.max(...porOrigem.map((o) => o.qtd)) : 0

  if (total === 0) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card className="border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground">
                Iniciaram consultoria (período)
              </CardTitle>
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Users className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold text-foreground">0</div>
              <p className="text-xs text-muted-foreground mt-1">
                Histórico de status desde 24/set · leads anteriores contados pela data de criação
              </p>
            </CardContent>
          </Card>
        </div>
        <Card className="border-border shadow-sm p-12 text-center text-sm text-muted-foreground">
          Nenhum lead encontrado na esteira Lead p/ Consultoria para o período selecionado.
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 5 Cards Resumo — Baseados em iniciaram consultoria e data_venda para vendas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">
              Iniciaram consultoria (período)
            </CardTitle>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Users className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-foreground">{total}</div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              Histórico de status desde 24/set · leads anteriores contados pela data de criação
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">
              Vendas Concluídas
            </CardTitle>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Target className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-foreground">{vendidos}</div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              Evento de venda (<strong className="text-foreground">data_venda</strong>) no período
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">
              Taxa de Conversão
            </CardTitle>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-extrabold text-foreground">
                {taxaConversao.toLocaleString('pt-BR', {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })}
                %
              </div>
              <Badge
                variant="outline"
                className="text-[9px] py-0 px-1 border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950/40"
              >
                Em construção
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              Vendas concluídas ÷ Iniciaram consultoria
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">
              Ticket Médio
            </CardTitle>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-extrabold text-foreground truncate">
              {currencyFormatter.format(ticketMedio || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              Vendas com data no período
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">
              Ciclo Médio
            </CardTitle>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Hourglass className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-foreground">
              {cicloMedio !== null && cicloMedio !== undefined && !isNaN(cicloMedio)
                ? `${cicloMedio.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} dias`
                : '—'}
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              Do contato à venda concluída
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Barras por Status / Coluna + Bloco de Origens */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Distribuição por Status */}
        <Card className="lg:col-span-7 border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Distribuição por Coluna / Estágio
            </CardTitle>
            <CardDescription>
              Volume de contatos em cada estágio do funil consultivo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusList} margin={{ top: 10, right: 10, left: -15, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis
                    dataKey="status"
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                    tick={{ fontSize: 11, fill: 'currentColor' }}
                    className="text-muted-foreground"
                    height={45}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: 'currentColor' }}
                    className="text-muted-foreground"
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload as { status: string; qtd: number }
                        const pct = total > 0 ? ((item.qtd / total) * 100).toFixed(1) : '0'
                        return (
                          <div className="bg-popover border border-border p-2.5 rounded-lg shadow-md text-xs space-y-1">
                            <p className="font-bold text-foreground">{item.status}</p>
                            <p className="text-blue-600 dark:text-blue-400">
                              Quantidade: <strong>{item.qtd} leads</strong>
                            </p>
                            <p className="text-muted-foreground">
                              Participação: <strong>{pct}%</strong>
                            </p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Bar dataKey="qtd" name="Leads" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                    {statusList.map((entry, index) => (
                      <Cell
                        key={`cell-cons-status-${index}`}
                        fill={
                          entry.status === 'Vendido'
                            ? '#10b981'
                            : entry.status === 'Perdido'
                              ? '#f43f5e'
                              : entry.status === 'Negociação' || entry.status === 'Apresentação'
                                ? '#8b5cf6'
                                : '#3b82f6'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Bloco Origens (Barras Horizontais, sem Exclusão de Origem) */}
        <Card className="lg:col-span-5 border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <PieIcon className="h-4 w-4 text-primary" />
              Origens de Entrada
            </CardTitle>
            <CardDescription>
              Canais declarados de todos os leads da consultoria (todas as origens)
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            {porOrigem.length === 0 ? (
              <p className="text-xs text-muted-foreground py-10 text-center">
                Sem origens registradas no período
              </p>
            ) : (
              <div className="space-y-3.5 max-h-[320px] overflow-y-auto pr-1">
                {porOrigem.map((item, idx) => {
                  const color = getOriginColor(item.origem, idx)
                  const percentWidth =
                    maxQtdOrigem > 0 ? Math.max(6, Math.round((item.qtd / maxQtdOrigem) * 100)) : 0
                  const pctTotal = total > 0 ? Math.round((item.qtd / total) * 100) : 0

                  return (
                    <div key={item.origem} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <div className="flex items-center gap-2 truncate">
                          <span
                            className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <span className="font-semibold text-foreground truncate">
                            {item.origem}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className="text-[11px] text-muted-foreground font-normal">
                            {pctTotal}%
                          </span>
                          <span className="font-bold text-foreground">
                            {item.qtd} {item.qtd === 1 ? 'lead' : 'leads'}
                          </span>
                        </div>
                      </div>
                      <div className="h-2.5 w-full bg-muted/60 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500 ease-out"
                          style={{
                            width: `${percentWidth}%`,
                            backgroundColor: color,
                          }}
                          title={`${item.origem} — ${item.qtd} leads (${pctTotal}%)`}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bloco Tempo dos Leads por Coluna */}
      <BlocoTempoColunas
        abaId="lead-consultoria"
        items={tempoColunas}
        descricao="Permanência média dos leads HOJE em cada coluna da esteira de Consultoria (ordem do funil)"
      />
    </div>
  )
}

// -------------------------------------------------------------
// Componente da Sub-aba Leads p/ Orçamento (Aba 05)
// -------------------------------------------------------------
function OrcamentosSubTab({
  data,
  tempoColunas,
}: {
  data?: OrcamentosMetrics
  tempoColunas?: TempoColunaItem[]
}) {
  const total = data?.total ?? 0
  const convertidos = data?.convertidos ?? 0
  const taxaConversao = data?.taxa_conversao ?? 0
  const ticketMedio = data?.ticket_medio_orcamentos ?? 0
  const cicloMedio = data?.ciclo_medio_dias
  const porStatusRaw = data?.por_status ?? []
  const porOrigem = data?.por_origem ?? []

  // Limpar e consolidar status
  const statusMap = new Map<string, number>()
  for (const item of porStatusRaw) {
    const cleanTitle = cleanColumnTitle(item.status) || 'Novo Orçamento'
    statusMap.set(cleanTitle, (statusMap.get(cleanTitle) ?? 0) + item.qtd)
  }

  const colunasOrdemPadrao = [
    'Novo Orçamento',
    'Em andamento',
    'Orçamento Concluido',
    'Vendido',
    'Perdido',
  ]

  const statusList: { status: string; qtd: number }[] = []
  for (const col of colunasOrdemPadrao) {
    if (statusMap.has(col)) {
      statusList.push({ status: col, qtd: statusMap.get(col)! })
      statusMap.delete(col)
    }
  }
  const restantes = Array.from(statusMap.entries()).map(([status, qtd]) => ({ status, qtd }))
  restantes.sort((a, b) => b.qtd - a.qtd)
  statusList.push(...restantes)

  const maxQtdOrigem = porOrigem.length > 0 ? Math.max(...porOrigem.map((o) => o.qtd)) : 0

  if (total === 0) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card className="border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground">
                Total de Orçamentos
              </CardTitle>
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold text-foreground">0</div>
              <p className="text-xs text-muted-foreground mt-1">Nenhum orçamento no período</p>
            </CardContent>
          </Card>
        </div>
        <Card className="border-border shadow-sm p-12 text-center text-sm text-muted-foreground">
          Nenhum lead encontrado na esteira Leads p/ Orçamento para o período selecionado.
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 5 Cards Resumo */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">
              Total de Orçamentos
            </CardTitle>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-foreground">{total}</div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              Solicitações na esteira de orçamentos
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Vendidos</CardTitle>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Target className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-foreground">{convertidos}</div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              Vendas de categoria Orçamento
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">
              Taxa de Conversão
            </CardTitle>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-foreground">
              {taxaConversao.toLocaleString('pt-BR', {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}
              %
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              Vendidos ÷ total de orçamentos
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">
              Ticket Médio
            </CardTitle>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-extrabold text-foreground truncate">
              {currencyFormatter.format(ticketMedio || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              Média dos fechamentos com valor
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">
              Ciclo Médio
            </CardTitle>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Hourglass className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-foreground">
              {cicloMedio !== null && cicloMedio !== undefined && !isNaN(cicloMedio)
                ? `${cicloMedio.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} dias`
                : '—'}
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              Do pedido à venda concluída
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Barras por Status / Coluna + Bloco de Origens */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Distribuição por Status */}
        <Card className="lg:col-span-7 border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Distribuição por Coluna / Estágio
            </CardTitle>
            <CardDescription>
              Status atual das solicitações de orçamento na esteira operacional
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusList} margin={{ top: 10, right: 10, left: -15, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis
                    dataKey="status"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: 'currentColor' }}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: 'currentColor' }}
                    className="text-muted-foreground"
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload as { status: string; qtd: number }
                        const pct = total > 0 ? ((item.qtd / total) * 100).toFixed(1) : '0'
                        return (
                          <div className="bg-popover border border-border p-2.5 rounded-lg shadow-md text-xs space-y-1">
                            <p className="font-bold text-foreground">{item.status}</p>
                            <p className="text-blue-600 dark:text-blue-400">
                              Quantidade: <strong>{item.qtd} orçamentos</strong>
                            </p>
                            <p className="text-muted-foreground">
                              Participação: <strong>{pct}%</strong>
                            </p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Bar dataKey="qtd" name="Orçamentos" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                    {statusList.map((entry, index) => (
                      <Cell
                        key={`cell-orc-status-${index}`}
                        fill={
                          entry.status === 'Vendido'
                            ? '#10b981'
                            : entry.status === 'Perdido'
                              ? '#f43f5e'
                              : entry.status === 'Orçamento Concluido' ||
                                  entry.status === 'Orçamento Concluído'
                                ? '#8b5cf6'
                                : '#3b82f6'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Bloco Origens (Barras Horizontais, sem Exclusão de Origem) */}
        <Card className="lg:col-span-5 border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <PieIcon className="h-4 w-4 text-primary" />
              Origens dos Orçamentos
            </CardTitle>
            <CardDescription>
              Canais que demandam orçamentos (todas as origens contabilizadas)
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            {porOrigem.length === 0 ? (
              <p className="text-xs text-muted-foreground py-10 text-center">
                Sem origens registradas no período
              </p>
            ) : (
              <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
                {porOrigem.map((item, idx) => {
                  const color = getOriginColor(item.origem, idx)
                  const percentWidth =
                    maxQtdOrigem > 0 ? Math.max(6, Math.round((item.qtd / maxQtdOrigem) * 100)) : 0
                  const pctTotal = total > 0 ? Math.round((item.qtd / total) * 100) : 0

                  return (
                    <div key={item.origem} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <div className="flex items-center gap-2 truncate">
                          <span
                            className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <span className="font-semibold text-foreground truncate">
                            {item.origem}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className="text-[11px] text-muted-foreground font-normal">
                            {pctTotal}%
                          </span>
                          <span className="font-bold text-foreground">
                            {item.qtd} {item.qtd === 1 ? 'orçamento' : 'orçamentos'}
                          </span>
                        </div>
                      </div>
                      <div className="h-2.5 w-full bg-muted/60 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500 ease-out"
                          style={{
                            width: `${percentWidth}%`,
                            backgroundColor: color,
                          }}
                          title={`${item.origem} — ${item.qtd} orçamentos (${pctTotal}%)`}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bloco Tempo dos Leads por Coluna */}
      <BlocoTempoColunas
        abaId="lead-orcamentos"
        items={tempoColunas}
        descricao="Permanência média dos leads HOJE em cada coluna da esteira de Orçamentos (ordem do funil)"
      />
    </div>
  )
}
