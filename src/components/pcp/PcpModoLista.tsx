import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import {
  PcpCardItem,
  fetchPcpCards,
  updateCardSemanaPlanejada,
  updateCardMesPlanejado,
  getProntidaoTecnica,
  PcpLinhaOperacao,
} from '@/services/pcp-planejamento'
import { formatBRL, getIsoWeeksForMonth, semanaLabelComAno } from '@/lib/pcp-capacity'
import { PcpSideDrawer } from './PcpSideDrawer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  ExternalLink,
  Eye,
  RefreshCw,
  Layers,
  Filter,
  CheckCircle2,
  Clock,
  ShieldAlert,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type SortColumn =
  | 'cliente'
  | 'ambiente'
  | 'valor'
  | 'prontidao'
  | 'status'
  | 'periodo'
  | 'responsavel'
type SortDirection = 'asc' | 'desc'

interface PcpModoListaProps {
  initialZoom?: 'anual' | 'mensal' | 'semanal'
}

export const MESES_OPCOES = [
  { key: '01', label: 'Janeiro' },
  { key: '02', label: 'Fevereiro' },
  { key: '03', label: 'Março' },
  { key: '04', label: 'Abril' },
  { key: '05', label: 'Maio' },
  { key: '06', label: 'Junho' },
  { key: '07', label: 'Julho' },
  { key: '08', label: 'Agosto' },
  { key: '09', label: 'Setembro' },
  { key: '10', label: 'Outubro' },
  { key: '11', label: 'Novembro' },
  { key: '12', label: 'Dezembro' },
]

export const PcpModoLista: React.FC<PcpModoListaProps> = ({ initialZoom = 'mensal' }) => {
  const navigate = useNavigate()
  const today = useMemo(() => new Date(), [])
  const currentYear = today.getFullYear()
  const currentMonth = today.getMonth()

  const [cards, setCards] = useState<PcpCardItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Filtros
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('todos')
  const [linhaFilter, setLinhaFilter] = useState<'todas' | PcpLinhaOperacao>('todas')

  // Ordenação
  const [sortColumn, setSortColumn] = useState<SortColumn>('cliente')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  // Drawer
  const [selectedCard, setSelectedCard] = useState<PcpCardItem | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Semanas disponíveis para seleção rápida
  const availableWeeks = useMemo(() => {
    return getIsoWeeksForMonth(currentYear, currentMonth)
  }, [currentYear, currentMonth])

  // Carregar dados
  const loadCards = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true)
    else setRefreshing(true)
    try {
      const data = await fetchPcpCards()
      setCards(data)
    } catch (err: any) {
      toast.error('Erro ao carregar dados do PCP: ' + (err.message || 'Erro desconhecido'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadCards()
  }, [loadCards])

  // Real-Time
  useEffect(() => {
    const channel = supabase
      .channel('pcp_modo_lista_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'produtos_servicos_projeto',
        },
        () => {
          loadCards(true)
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadCards])

  // Helper para obter nome do cliente
  const getClientName = (card: PcpCardItem) =>
    card.cliente?.nome ||
    card.formulario?.cliente?.nome ||
    card.formulario?.nome_cliente ||
    'Cliente não informado'

  // Helper para porcentagem de prontidão técnica
  const getProntidaoPercentual = (card: PcpCardItem): { pct: number; label: string } => {
    const st = card.status_analise || 'iniciar'
    if (st === 'pendencia') return { pct: 0, label: 'Pendência (0%)' }
    if (card.is_outsourced && !card.terceirizado_validado) {
      return { pct: 25, label: 'Terceirizado (25%)' }
    }
    switch (st) {
      case 'iniciar':
      case 'aguardando_liberacao':
        return { pct: 15, label: '15%' }
      case 'medida_fina':
        return { pct: 35, label: '35%' }
      case 'reuniao_analise':
        return { pct: 50, label: '50%' }
      case 'alteracao_projeto':
        return { pct: 60, label: '60%' }
      case 'lista_materiais':
        return { pct: 75, label: '75%' }
      case 'aguardando_plano_corte':
      case 'caderno_tecnico':
      case 'router':
      case 'coladeira':
      case 'bancada':
      case 'embalagem':
      case 'concluido':
        return { pct: 100, label: '100% (Pronto)' }
      default:
        return { pct: 20, label: '20%' }
    }
  }

  // Determinar status real no Kanban
  const getStatusRealKanban = (card: PcpCardItem) => {
    const st = card.status_analise || 'iniciar'
    // Se está em etapas de produção
    const etapasProducao = ['router', 'coladeira', 'bancada', 'embalagem', 'expedicao']
    const etapasMontagem = ['aguardando_agenda', 'transporte', 'montagem', 'assistencia']

    if (etapasProducao.includes(st)) {
      return {
        etapa: 'Produção',
        coluna: st ? st.charAt(0).toUpperCase() + st.slice(1) : '',
        badgeClass: 'bg-amber-500/10 text-amber-700 border-amber-300 dark:border-amber-700',
        route: '/pcp/producao',
      }
    }
    if (etapasMontagem.includes(st)) {
      return {
        etapa: 'Montagem',
        coluna: st.replace(/_/g, ' '),
        badgeClass: 'bg-purple-500/10 text-purple-700 border-purple-300 dark:border-purple-700',
        route: '/pcp/montagem',
      }
    }
    return {
      etapa: 'Análise Técnica',
      coluna: st.replace(/_/g, ' '),
      badgeClass: 'bg-blue-500/10 text-blue-700 border-blue-300 dark:border-blue-700',
      route: '/pcp/analise-tecnica',
    }
  }

  // Alternar ordenação
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  // Opções de dias da semana (1: Segunda a 6: Sábado)
  const DIAS_SEMANA_OPCOES = [
    { num: 1, label: 'Segunda-feira', sigla: 'Seg' },
    { num: 2, label: 'Terça-feira', sigla: 'Ter' },
    { num: 3, label: 'Quarta-feira', sigla: 'Qua' },
    { num: 4, label: 'Quinta-feira', sigla: 'Qui' },
    { num: 5, label: 'Sexta-feira', sigla: 'Sex' },
    { num: 6, label: 'Sábado', sigla: 'Sáb' },
  ]

  // Helper para obter o dia da semana a partir de uma data (YYYY-MM-DD)
  const getDiaSemanaFromDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return 'none'
    const clean = dateStr.slice(0, 10)
    const d = new Date(`${clean}T12:00:00`)
    if (isNaN(d.getTime())) return 'none'
    const day = d.getDay() // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
    return String(day === 0 ? 7 : day)
  }

  // Helper para calcular a data ISO YYYY-MM-DD a partir de semana ISO (ex: S40) e dia da semana (1-6)
  const calcularDataPorSemanaEDia = (
    semanaLabel: string,
    diaNum: number,
    ano: number = currentYear,
  ): string | null => {
    const wNum = parseWeekNumber(semanaLabel)
    if (!wNum) return null
    // Obter data da segunda-feira da semana ISO
    // Regra ISO: 4 de janeiro é semana 1
    const jan4 = new Date(Date.UTC(ano, 0, 4))
    const dayOfWeek = jan4.getUTCDay() || 7
    const mondayFirstWeek = new Date(jan4.getTime() - (dayOfWeek - 1) * 86400000)
    const targetMonday = new Date(mondayFirstWeek.getTime() + (wNum - 1) * 7 * 86400000)

    // Somar os dias: diaNum 1 = Segunda (+0 dias), 2 = Terça (+1), etc.
    const targetDate = new Date(targetMonday.getTime() + (diaNum - 1) * 86400000)
    const yyyy = targetDate.getUTCFullYear()
    const mm = String(targetDate.getUTCMonth() + 1).padStart(2, '0')
    const dd = String(targetDate.getUTCDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }

  // Validação de regras e bloqueios de sequência:
  // Produção sem Análise definida -> toast
  // Montagem sem Produção -> toast
  // Cronologia: Produção não pode ser anterior à Análise; Montagem não pode ser anterior à Produção
  const validarSequenciaAgendamento = (
    faseAlvo: PcpLinhaOperacao,
    semanaAlvo: string | null,
    dataAlvo: string | null,
    cardAtual: PcpCardItem,
  ): boolean => {
    if (!semanaAlvo && !dataAlvo) return true // Remoção é permitida

    if (faseAlvo === 'producao') {
      const temAnalise = Boolean(
        (cardAtual.semana_planejada_analise && cardAtual.semana_planejada_analise.trim() !== '') ||
        (cardAtual.data_planejada_analise && cardAtual.data_planejada_analise.trim() !== ''),
      )
      if (!temAnalise) {
        toast.error('Defina primeiro a data da Análise Técnica antes de agendar a Produção.')
        return false
      }

      // Validar cronologia se houver datas completas ou semanas
      if (dataAlvo && cardAtual.data_planejada_analise) {
        if (dataAlvo < cardAtual.data_planejada_analise) {
          toast.error('A data da Produção não pode ser anterior à data da Análise Técnica.')
          return false
        }
      } else if (semanaAlvo && cardAtual.semana_planejada_analise) {
        const wProd = parseWeekNumber(semanaAlvo)
        const wAna = parseWeekNumber(cardAtual.semana_planejada_analise)
        if (wProd && wAna && wProd < wAna) {
          toast.error('A semana da Produção não pode ser anterior à semana da Análise Técnica.')
          return false
        }
      }
    }

    if (faseAlvo === 'montagem') {
      const temProducao = Boolean(
        (cardAtual.semana_planejada_producao &&
          cardAtual.semana_planejada_producao.trim() !== '') ||
        (cardAtual.data_planejada_producao && cardAtual.data_planejada_producao.trim() !== ''),
      )
      if (!temProducao) {
        toast.error('Defina primeiro a data da Produção antes de agendar a Montagem.')
        return false
      }

      if (dataAlvo && cardAtual.data_planejada_producao) {
        if (dataAlvo < cardAtual.data_planejada_producao) {
          toast.error('A data da Montagem não pode ser anterior à data da Produção.')
          return false
        }
      } else if (semanaAlvo && cardAtual.semana_planejada_producao) {
        const wMont = parseWeekNumber(semanaAlvo)
        const wProd = parseWeekNumber(cardAtual.semana_planejada_producao)
        if (wMont && wProd && wMont < wProd) {
          toast.error('A semana da Montagem não pode ser anterior à semana da Produção.')
          return false
        }
      }
    }

    return true
  }

  // Alteração inline de semana e dia para qualquer linha operacional
  const handleTriadeChange = async (
    card: PcpCardItem,
    fase: PcpLinhaOperacao,
    tipo: 'semana' | 'dia',
    valor: string,
  ) => {
    let novaSemana =
      fase === 'analise'
        ? card.semana_planejada_analise
        : fase === 'producao'
          ? card.semana_planejada_producao
          : card.semana_planejada_montagem

    let novaData =
      fase === 'analise'
        ? card.data_planejada_analise
        : fase === 'producao'
          ? card.data_planejada_producao
          : card.data_planejada_montagem

    const diaAtualNum = getDiaSemanaFromDate(novaData)

    if (tipo === 'semana') {
      novaSemana = valor === 'none' ? null : valor
      if (novaSemana && diaAtualNum !== 'none') {
        novaData = calcularDataPorSemanaEDia(novaSemana, Number(diaAtualNum))
      } else if (!novaSemana) {
        novaData = null
      }
    } else if (tipo === 'dia') {
      if (valor === 'none') {
        novaData = null
      } else if (novaSemana) {
        novaData = calcularDataPorSemanaEDia(novaSemana, Number(valor))
      } else {
        toast.error('Defina primeiro a Semana ISO antes de selecionar o dia.')
        return
      }
    }

    // Validar regras de precedência
    if (!validarSequenciaAgendamento(fase, novaSemana, novaData, card)) {
      return
    }

    // Atualização otimista
    const colSemana =
      fase === 'analise'
        ? 'semana_planejada_analise'
        : fase === 'producao'
          ? 'semana_planejada_producao'
          : 'semana_planejada_montagem'
    const colData =
      fase === 'analise'
        ? 'data_planejada_analise'
        : fase === 'producao'
          ? 'data_planejada_producao'
          : 'data_planejada_montagem'

    setCards((prevList) =>
      prevList.map((c) =>
        c.id === card.id ? { ...c, [colSemana]: novaSemana, [colData]: novaData } : c,
      ),
    )

    try {
      const { updateCardDataPlanejada } = await import('@/services/pcp-planejamento')
      await updateCardSemanaPlanejada(
        card.id,
        fase,
        novaSemana,
        card[colSemana],
        `Atualizado tríade ${fase} via Modo Lista`,
      )
      if (novaData !== card[colData]) {
        await updateCardDataPlanejada(
          card.id,
          fase,
          novaData,
          card[colData] || null,
          `Atualizado data ${fase} via Modo Lista`,
        )
      }
      toast.success(
        `Agenda de ${fase === 'analise' ? 'Análise' : fase === 'producao' ? 'Produção' : 'Montagem'} atualizada!`,
      )
    } catch (err: any) {
      toast.error('Erro ao atualizar agenda: ' + (err.message || 'Erro'))
      loadCards(true)
    }
  }

  // Ação "Aplicar para todos os ambientes do contrato"
  const handleAplicarParaTodos = async (sourceCard: PcpCardItem) => {
    // Achar todos os cards com o mesmo contrato (formulario_comercial_id) ou card_pai_id
    const formId = sourceCard.formulario_comercial_id
    const paiId = sourceCard.card_pai_id || sourceCard.id

    const targetCards = cards.filter((c) => {
      if (formId && c.formulario_comercial_id === formId) return true
      if (c.card_pai_id === paiId || c.id === paiId) return true
      return false
    })

    if (targetCards.length <= 1) {
      toast.info('Não há outros ambientes neste contrato para replicar.')
      return
    }

    const cardIds = targetCards.map((c) => c.id)

    // Atualização otimista
    setCards((prevList) =>
      prevList.map((c) => {
        if (!cardIds.includes(c.id)) return c
        return {
          ...c,
          semana_planejada_analise: sourceCard.semana_planejada_analise,
          data_planejada_analise: sourceCard.data_planejada_analise,
          semana_planejada_producao: sourceCard.semana_planejada_producao,
          data_planejada_producao: sourceCard.data_planejada_producao,
          semana_planejada_montagem: sourceCard.semana_planejada_montagem,
          data_planejada_montagem: sourceCard.data_planejada_montagem,
        }
      }),
    )

    try {
      const { updateMultipleCardsSemanaPlanejada, updateMultipleCardsDataPlanejada } =
        await import('@/services/pcp-planejamento')

      // 1. Análise
      await updateMultipleCardsSemanaPlanejada(
        cardIds,
        'analise',
        sourceCard.semana_planejada_analise,
        'Replicado para todos os ambientes do contrato',
      )
      if (sourceCard.data_planejada_analise) {
        await updateMultipleCardsDataPlanejada(
          cardIds,
          'analise',
          sourceCard.data_planejada_analise,
          'Replicado data de análise para todos do contrato',
        )
      }

      // 2. Produção
      await updateMultipleCardsSemanaPlanejada(
        cardIds,
        'producao',
        sourceCard.semana_planejada_producao,
        'Replicado para todos os ambientes do contrato',
      )
      if (sourceCard.data_planejada_producao) {
        await updateMultipleCardsDataPlanejada(
          cardIds,
          'producao',
          sourceCard.data_planejada_producao,
          'Replicado data de produção para todos do contrato',
        )
      }

      // 3. Montagem
      await updateMultipleCardsSemanaPlanejada(
        cardIds,
        'montagem',
        sourceCard.semana_planejada_montagem,
        'Replicado para todos os ambientes do contrato',
      )
      if (sourceCard.data_planejada_montagem) {
        await updateMultipleCardsDataPlanejada(
          cardIds,
          'montagem',
          sourceCard.data_planejada_montagem,
          'Replicado data de montagem para todos do contrato',
        )
      }

      toast.success(`Tríade de datas replicada para ${targetCards.length} ambientes do contrato!`)
    } catch (err: any) {
      toast.error('Erro ao replicar datas do contrato: ' + (err.message || 'Erro'))
      loadCards(true)
    }
  }

  // Filtragem
  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      // Busca textual
      if (search.trim()) {
        const term = search.toLowerCase()
        const cli = getClientName(card).toLowerCase()
        const prod = (card.nome_produto || '').toLowerCase()
        const cod = (card.codigo_rastreio || '').toLowerCase()
        const resp = (card.analista?.nome || '').toLowerCase()
        if (
          !cli.includes(term) &&
          !prod.includes(term) &&
          !cod.includes(term) &&
          !resp.includes(term)
        ) {
          return false
        }
      }

      // Filtro por Linha
      if (
        linhaFilter === 'analise' &&
        !card.semana_planejada_analise &&
        !card.mes_planejado_analise
      ) {
        return false
      }
      if (
        linhaFilter === 'producao' &&
        !card.semana_planejada_producao &&
        !card.mes_planejado_producao
      ) {
        return false
      }
      if (
        linhaFilter === 'montagem' &&
        !card.semana_planejada_montagem &&
        !card.mes_planejado_montagem
      ) {
        return false
      }

      // Filtro por Status
      if (statusFilter !== 'todos') {
        const pront = getProntidaoTecnica(card).status
        if (statusFilter === 'pronto' && pront !== 'pronto') return false
        if (statusFilter === 'em_analise' && pront !== 'em_analise') return false
        if (statusFilter === 'bloqueado' && pront !== 'bloqueado') return false
      }

      return true
    })
  }, [cards, search, linhaFilter, statusFilter])

  // Ordenação
  const sortedCards = useMemo(() => {
    const list = [...filteredCards]
    list.sort((a, b) => {
      let compA: any = ''
      let compB: any = ''

      switch (sortColumn) {
        case 'cliente':
          compA = getClientName(a).toLowerCase()
          compB = getClientName(b).toLowerCase()
          break
        case 'ambiente':
          compA = (a.nome_produto || '').toLowerCase()
          compB = (b.nome_produto || '').toLowerCase()
          break
        case 'valor':
          compA = a.valor_total || 0
          compB = b.valor_total || 0
          break
        case 'prontidao':
          compA = getProntidaoPercentual(a).pct
          compB = getProntidaoPercentual(b).pct
          break
        case 'status':
          compA = a.status_analise || ''
          compB = b.status_analise || ''
          break
        case 'periodo':
          compA = a.semana_planejada_producao || a.mes_planejado_producao || ''
          compB = b.semana_planejada_producao || b.mes_planejado_producao || ''
          break
        case 'responsavel':
          compA = a.analista?.nome || ''
          compB = b.analista?.nome || ''
          break
      }

      if (compA < compB) return sortDirection === 'asc' ? -1 : 1
      if (compA > compB) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
    return list
  }, [filteredCards, sortColumn, sortDirection])

  // Totalizador fixo em R$ no rodapé
  const somaTotalFiltrados = useMemo(() => {
    return filteredCards.reduce((acc, c) => acc + (c.valor_total || 0), 0)
  }, [filteredCards])

  const renderSortIndicator = (column: SortColumn) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="w-3 h-3 text-muted-foreground/60 ml-1 inline" />
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-primary ml-1 inline" />
    ) : (
      <ArrowDown className="w-3 h-3 text-primary ml-1 inline" />
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* Barra de Filtros e Busca da Lista */}
      <div className="px-6 py-2.5 bg-card border-b border-border flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-2xs">
        {/* Busca */}
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente, ambiente, código ou responsável..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs bg-background border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => loadCards(true)}
            disabled={refreshing}
            title="Atualizar dados"
            className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', refreshing && 'animate-spin')} />
          </Button>
        </div>

        {/* Filtros de Linha e Prontidão */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filtro Linha Operacional */}
          <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/50 text-xs">
            {(['todas', 'analise', 'producao', 'montagem'] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLinhaFilter(l)}
                className={cn(
                  'px-2.5 py-1 rounded text-[11px] font-semibold transition-all capitalize',
                  linhaFilter === l
                    ? 'bg-background text-foreground shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {l === 'todas'
                  ? 'Todas Linhas'
                  : l === 'analise'
                    ? '📐 Análise'
                    : l === 'producao'
                      ? '🏭 Produção'
                      : '🔧 Montagem'}
              </button>
            ))}
          </div>

          {/* Filtro Prontidão Técnica */}
          <div className="w-36">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-xs bg-background">
                <SelectValue placeholder="Prontidão" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos Status</SelectItem>
                <SelectItem value="pronto">✅ Pronto</SelectItem>
                <SelectItem value="em_analise">⏳ Em Análise</SelectItem>
                <SelectItem value="bloqueado">⚠️ Bloqueado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Tabela Interativa de Itens */}
      <div className="flex-1 overflow-auto bg-background">
        <Table>
          <TableHeader className="sticky top-0 z-20 bg-card border-b border-border shadow-2xs">
            <TableRow className="hover:bg-transparent">
              <TableHead
                onClick={() => handleSort('cliente')}
                className="cursor-pointer select-none font-bold text-xs text-foreground min-w-[200px]"
              >
                Cliente / Projeto {renderSortIndicator('cliente')}
              </TableHead>

              <TableHead
                onClick={() => handleSort('ambiente')}
                className="cursor-pointer select-none font-bold text-xs text-foreground min-w-[180px]"
              >
                Ambiente {renderSortIndicator('ambiente')}
              </TableHead>

              <TableHead
                onClick={() => handleSort('valor')}
                className="cursor-pointer select-none font-bold text-xs text-foreground text-right min-w-[130px]"
              >
                Valor R$ {renderSortIndicator('valor')}
              </TableHead>

              <TableHead
                onClick={() => handleSort('prontidao')}
                className="cursor-pointer select-none font-bold text-xs text-foreground min-w-[160px]"
              >
                Prontidão Técnica {renderSortIndicator('prontidao')}
              </TableHead>

              <TableHead
                onClick={() => handleSort('status')}
                className="cursor-pointer select-none font-bold text-xs text-foreground min-w-[160px]"
              >
                Status Real no Kanban {renderSortIndicator('status')}
              </TableHead>

              <TableHead className="select-none font-bold text-xs text-foreground min-w-[460px]">
                Tríade de Agendamento (📐 Análise | 🏭 Produção | 🔧 Montagem)
              </TableHead>

              <TableHead
                onClick={() => handleSort('responsavel')}
                className="cursor-pointer select-none font-bold text-xs text-foreground min-w-[150px]"
              >
                Responsável {renderSortIndicator('responsavel')}
              </TableHead>

              <TableHead className="font-bold text-xs text-foreground text-center min-w-[100px]">
                Ações
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {sortedCards.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-48 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Layers className="w-8 h-8 opacity-40" />
                    <p className="text-sm font-semibold text-foreground">
                      {search
                        ? 'Nenhum item encontrado com o filtro atual'
                        : 'Nenhum card cadastrado'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {search
                        ? 'Tente remover os filtros ou buscar por outro termo.'
                        : 'Itens gerados no Comercial surgirão aqui para planejamento.'}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              sortedCards.map((card) => {
                const clientName = getClientName(card)
                const isSubcard = Boolean(card.card_pai_id)
                const prontidao = getProntidaoTecnica(card)
                const prontPercentual = getProntidaoPercentual(card)
                const statusKanban = getStatusRealKanban(card)
                const responsavelNome = card.analista?.nome || 'Não atribuído'

                return (
                  <TableRow
                    key={card.id}
                    className="hover:bg-muted/40 transition-colors group cursor-default"
                  >
                    {/* [ Cliente / Projeto ] */}
                    <TableCell className="font-semibold text-xs text-foreground">
                      <div className="flex items-center gap-2">
                        {card.cor_vinculo && (
                          <div
                            className="w-2 h-8 rounded-full shrink-0"
                            style={{ backgroundColor: card.cor_vinculo }}
                          />
                        )}
                        <div>
                          <p className="font-bold text-foreground group-hover:text-primary transition-colors">
                            {clientName}
                          </p>
                          {card.codigo_rastreio && (
                            <span className="font-mono text-[10px] text-muted-foreground">
                              {card.codigo_rastreio}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* [ Ambiente ] */}
                    <TableCell className="text-xs">
                      <div className="flex items-center gap-1.5">
                        {isSubcard && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 font-medium shrink-0">
                            <Layers className="w-3 h-3 text-primary" />↳
                          </span>
                        )}
                        <span className="font-semibold text-foreground">{card.nome_produto}</span>
                        {isSubcard && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                            Subcard
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    {/* [ Valor R$ ] */}
                    <TableCell className="text-right font-extrabold text-xs text-primary">
                      {formatBRL(card.valor_total || 0)}
                    </TableCell>

                    {/* [ Prontidão Técnica ] (Barra % de avanço na Análise) */}
                    <TableCell className="text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-medium text-muted-foreground">
                            {prontPercentual.label}
                          </span>
                          <span className="font-bold text-foreground">{prontPercentual.pct}%</span>
                        </div>
                        <Progress value={prontPercentual.pct} className="h-1.5 bg-muted" />
                      </div>
                    </TableCell>

                    {/* [ Status Real no Kanban ] */}
                    <TableCell className="text-xs">
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px] font-semibold px-2 py-0.5 border flex items-center gap-1 w-fit cursor-pointer hover:opacity-80 transition-opacity',
                          statusKanban.badgeClass,
                        )}
                        onClick={() => navigate(statusKanban.route)}
                        title={`Ir para o Kanban de ${statusKanban.etapa}`}
                      >
                        <span>{statusKanban.etapa}:</span>
                        <strong className="capitalize">{statusKanban.coluna}</strong>
                        <ExternalLink className="w-2.5 h-2.5 opacity-60 ml-0.5" />
                      </Badge>
                    </TableCell>

                    {/* [ Tríade de Agendamento: Análise, Produção, Montagem + Aplicar para todos ] */}
                    <TableCell className="text-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* 1. Análise Técnica */}
                        <div className="flex items-center gap-1 p-1 rounded bg-muted/40 border border-border/60">
                          <span
                            className="text-[10px] font-bold text-primary"
                            title="Análise Técnica"
                          >
                            📐
                          </span>
                          <Select
                            value={card.semana_planejada_analise || 'none'}
                            onValueChange={(val) =>
                              handleTriadeChange(card, 'analise', 'semana', val)
                            }
                          >
                            <SelectTrigger className="h-6 text-[10px] w-[64px] bg-background px-1">
                              <SelectValue placeholder="Sxx" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">--</SelectItem>
                              {availableWeeks.map((w) => (
                                <SelectItem
                                  key={w.key}
                                  value={semanaLabelComAno(w)}
                                  className="text-xs"
                                >
                                  {semanaLabelComAno(w)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select
                            value={getDiaSemanaFromDate(card.data_planejada_analise)}
                            onValueChange={(val) => handleTriadeChange(card, 'analise', 'dia', val)}
                          >
                            <SelectTrigger className="h-6 text-[10px] w-[58px] bg-background px-1">
                              <SelectValue placeholder="Dia" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">--</SelectItem>
                              {DIAS_SEMANA_OPCOES.map((d) => (
                                <SelectItem key={d.num} value={String(d.num)} className="text-xs">
                                  {d.sigla}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* 2. Produção */}
                        <div className="flex items-center gap-1 p-1 rounded bg-muted/40 border border-border/60">
                          <span
                            className="text-[10px] font-bold text-amber-600 dark:text-amber-400"
                            title="Produção Fabril"
                          >
                            🏭
                          </span>
                          <Select
                            value={card.semana_planejada_producao || 'none'}
                            onValueChange={(val) =>
                              handleTriadeChange(card, 'producao', 'semana', val)
                            }
                          >
                            <SelectTrigger className="h-6 text-[10px] w-[64px] bg-background px-1">
                              <SelectValue placeholder="Sxx" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">--</SelectItem>
                              {availableWeeks.map((w) => (
                                <SelectItem
                                  key={w.key}
                                  value={semanaLabelComAno(w)}
                                  className="text-xs"
                                >
                                  {semanaLabelComAno(w)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select
                            value={getDiaSemanaFromDate(card.data_planejada_producao)}
                            onValueChange={(val) =>
                              handleTriadeChange(card, 'producao', 'dia', val)
                            }
                          >
                            <SelectTrigger className="h-6 text-[10px] w-[58px] bg-background px-1">
                              <SelectValue placeholder="Dia" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">--</SelectItem>
                              {DIAS_SEMANA_OPCOES.map((d) => (
                                <SelectItem key={d.num} value={String(d.num)} className="text-xs">
                                  {d.sigla}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* 3. Montagem */}
                        <div className="flex items-center gap-1 p-1 rounded bg-muted/40 border border-border/60">
                          <span
                            className="text-[10px] font-bold text-purple-600 dark:text-purple-400"
                            title="Montagem"
                          >
                            🔧
                          </span>
                          <Select
                            value={card.semana_planejada_montagem || 'none'}
                            onValueChange={(val) =>
                              handleTriadeChange(card, 'montagem', 'semana', val)
                            }
                          >
                            <SelectTrigger className="h-6 text-[10px] w-[64px] bg-background px-1">
                              <SelectValue placeholder="Sxx" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">--</SelectItem>
                              {availableWeeks.map((w) => (
                                <SelectItem
                                  key={w.key}
                                  value={semanaLabelComAno(w)}
                                  className="text-xs"
                                >
                                  {semanaLabelComAno(w)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select
                            value={getDiaSemanaFromDate(card.data_planejada_montagem)}
                            onValueChange={(val) =>
                              handleTriadeChange(card, 'montagem', 'dia', val)
                            }
                          >
                            <SelectTrigger className="h-6 text-[10px] w-[58px] bg-background px-1">
                              <SelectValue placeholder="Dia" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">--</SelectItem>
                              {DIAS_SEMANA_OPCOES.map((d) => (
                                <SelectItem key={d.num} value={String(d.num)} className="text-xs">
                                  {d.sigla}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Botão "Aplicar para todos" do contrato */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAplicarParaTodos(card)}
                          className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-primary font-medium border border-dashed border-border hover:border-primary shrink-0"
                          title="Replicar esta tríade de datas para todos os ambientes deste contrato"
                        >
                          Aplicar p/ todos
                        </Button>
                      </div>
                    </TableCell>

                    {/* [ Responsável ] (Avatar e nome do analista/montador) */}
                    <TableCell className="text-xs">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6 border border-border">
                          {card.analista?.foto_perfil && (
                            <AvatarImage src={card.analista.foto_perfil} alt={responsavelNome} />
                          )}
                          <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">
                            {(responsavelNome || 'NA').slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span
                          className="font-medium text-foreground truncate max-w-[110px]"
                          title={responsavelNome}
                        >
                          {responsavelNome}
                        </span>
                      </div>
                    </TableCell>

                    {/* [ Ações ] */}
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedCard(card)
                            setDrawerOpen(true)
                          }}
                          title="Abrir Painel Lateral de Detalhes"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(statusKanban.route)}
                          title={`Ir para o Kanban de ${statusKanban.etapa}`}
                          className="h-7 w-7 text-muted-foreground hover:text-primary"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Totalizador fixo no rodapé calculando a SOMA TOTAL em R$ dos itens filtrados */}
      <div className="px-6 py-3 bg-card border-t border-border flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-lg z-20">
        <div className="flex items-center gap-3 text-xs">
          <span className="text-muted-foreground font-medium">
            Exibindo <strong className="text-foreground">{sortedCards.length}</strong> de{' '}
            <strong className="text-foreground">{cards.length}</strong> itens
          </span>

          <span className="text-muted-foreground">•</span>

          <span className="text-muted-foreground text-[11px]">
            Soma dos itens filtrados na tela:
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">TOTAL:</span>
          <span className="text-base font-black text-primary px-3 py-1 rounded-md bg-primary/10 border border-primary/20">
            {formatBRL(somaTotalFiltrados)}
          </span>
        </div>
      </div>

      {/* Side Drawer para edição detalhada */}
      <PcpSideDrawer
        card={selectedCard}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        availableWeeks={availableWeeks}
        onUpdateSemana={async (cardId, linha, novaSemana, semanaAnterior, motivo) => {
          await updateCardSemanaPlanejada(cardId, linha, novaSemana, semanaAnterior, motivo)
          loadCards(true)
        }}
        onUpdateMes={async (cardId, linha, novoMes, mesAnterior, motivo) => {
          await updateCardMesPlanejado(cardId, linha, novoMes, mesAnterior, motivo)
          loadCards(true)
        }}
      />
    </div>
  )
}
