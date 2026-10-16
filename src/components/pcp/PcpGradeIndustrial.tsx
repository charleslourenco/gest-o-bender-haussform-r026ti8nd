import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { Calendar as CalendarIcon, Search, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  fetchPcpCards,
  PcpCardItem,
  PcpLinhaOperacao,
  updateCardDataPlanejada,
  updateMultipleCardsDataPlanejada,
  updateCardSemanaPlanejada,
  updateMultipleCardsSemanaPlanejada,
  updateCardMesPlanejado,
} from '@/services/pcp-planejamento'
import {
  IsoWeekRange,
  getIsoWeeksForYear,
  getDiasSemanaIndustrial,
  DiaSemanaIndustrial,
  avaliarCapacidadeFinanceira,
  somarCardsComAntiDuplaContagem,
  calcularDatasDerivadasPcp,
  formatBRL,
  matchWeek,
  semanaLabelComAno,
} from '@/lib/pcp-capacity'
import { contarCardsParaAgendar } from '@/lib/pcp-carteira'
import { PcpCarteiraSidebar } from './PcpCarteiraSidebar'
import { PcpSideDrawer } from './PcpSideDrawer'
import { PcpCard } from './PcpCard'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const MESES_NOMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

export const PcpGradeIndustrial: React.FC = () => {
  // Filtros diretos conforme Spec 1.1:
  // [ 📅 Ano: 2026 ▾ ] [ 🗓️ Período de Meses: ex: Setembro a Outubro ▾ ] [ 🔍 Buscar Cliente... ]
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear())
  const [mesInicio, setMesInicio] = useState<number>(() => Math.max(0, new Date().getMonth() - 1))
  const [mesFim, setMesFim] = useState<number>(() => Math.min(11, new Date().getMonth() + 2))
  const [searchTerm, setSearchTerm] = useState<string>('')

  // Estado dos cards
  const [cards, setCards] = useState<PcpCardItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Drawer e Carteira Lateral
  const [selectedCard, setSelectedCard] = useState<PcpCardItem | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Drag over target key
  const [dragOverKey, setDragOverKey] = useState<string | null>(null)

  // Carregar cards
  const loadCards = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true)
    else setRefreshing(true)
    try {
      const data = await fetchPcpCards()
      setCards(Array.isArray(data) ? data : [])
    } catch (err: any) {
      toast.error('Erro ao carregar cards do PCP: ' + (err.message || 'Erro'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadCards()
  }, [loadCards])

  // Real-time listener
  useEffect(() => {
    const channel = supabase
      .channel('pcp_grade_industrial_realtime')
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

  // Semanas ISO do ano selecionado, filtradas pelo Período de Meses
  const semanasFiltradas = useMemo<IsoWeekRange[]>(() => {
    const allWeeks = getIsoWeeksForYear(selectedYear)
    // Uma semana pertence ao intervalo se sua data de início ou término cruzar o período [mesInicio, mesFim]
    return allWeeks.filter((w) => {
      const start = new Date(w.startDate)
      const end = new Date(w.endDate)
      const mStart = start.getMonth()
      const mEnd = end.getMonth()
      const yStart = start.getFullYear()
      const yEnd = end.getFullYear()

      // Verificar se o ano bate (ou cruza na virada)
      const intersects =
        (yStart === selectedYear && mStart >= mesInicio && mStart <= mesFim) ||
        (yEnd === selectedYear && mEnd >= mesInicio && mEnd <= mesFim)
      return intersects
    })
  }, [selectedYear, mesInicio, mesFim])

  // Filtragem de busca por cliente ou ambiente
  const searchNormalized = searchTerm.trim().toLowerCase()

  const matchesSearch = useCallback(
    (card: PcpCardItem): boolean => {
      if (!searchNormalized) return true
      const clientName = (
        card.cliente?.nome ||
        card.formulario?.cliente?.nome ||
        card.formulario?.nome_cliente ||
        ''
      ).toLowerCase()
      const prodName = (card.nome_produto || '').toLowerCase()
      const codigo = (card.codigo_rastreio || '').toLowerCase()
      return (
        clientName.includes(searchNormalized) ||
        prodName.includes(searchNormalized) ||
        codigo.includes(searchNormalized)
      )
    },
    [searchNormalized],
  )

  // Agrupamento de cards por Dia exato (YYYY-MM-DD) ou por Semana
  // Se o card tem data_planejada_producao, aloca no dia exato.
  // Se tem apenas semana_planejada_producao (mas sem data), colocamos no primeiro dia útil da semana (Segunda-feira) como fallback.
  // Também suporta cards agendados na Análise ou Montagem na respectiva data caso a visualização seja por dia.
  const getCardsForDia = useCallback(
    (dia: DiaSemanaIndustrial, week: IsoWeekRange): PcpCardItem[] => {
      if (!cards || cards.length === 0) return []

      return cards.filter((c) => {
        if (!c) return false
        if (c.visivel_pcp === false) return false
        if (c.arquivado_producao || c.excluido_producao) return false
        if (!matchesSearch(c)) return false

        // 1. Se tem data exata igual ao dia na produção
        if (typeof c.data_planejada_producao === 'string' && c.data_planejada_producao.trim()) {
          const cardDateStr = c.data_planejada_producao.slice(0, 10)
          return cardDateStr === dia.dateStr
        }

        // 2. Se não tem data exata de produção mas a semana de produção bate com a semana atual e é Segunda-feira (dia 0)
        if (
          matchWeek(c.semana_planejada_producao, week, c.semana_producao_inicio) &&
          dia.dayIndex === 0
        ) {
          return true
        }

        return false
      })
    },
    [cards, matchesSearch],
  )

  // Cards de toda a semana (para o somatório financeiro da semana ISO)
  const getCardsForWeek = useCallback(
    (week: IsoWeekRange): PcpCardItem[] => {
      if (!cards || cards.length === 0) return []

      const weekDias = getDiasSemanaIndustrial(week)
      const weekDatesSet = new Set(weekDias.map((d) => d.dateStr))

      return cards.filter((c) => {
        if (!c) return false
        if (c.visivel_pcp === false) return false
        if (c.arquivado_producao || c.excluido_producao) return false
        if (!matchesSearch(c)) return false

        // Match por data_planejada_producao dentro dos 6 dias
        if (typeof c.data_planejada_producao === 'string' && c.data_planejada_producao.trim()) {
          const cardDateStr = c.data_planejada_producao.slice(0, 10)
          if (weekDatesSet.has(cardDateStr)) return true
        }

        // Match por semana_planejada_producao
        if (matchWeek(c.semana_planejada_producao, week, c.semana_producao_inicio)) return true

        return false
      })
    },
    [cards, matchesSearch],
  )

  // HANDLER DE DROP NA COLUNA DIÁRIA ATIVA
  // Grava: semana_planejada_producao, data_planejada_producao, data_limite_analise (-2 sem) e data_obra_montagem (+4 sem)
  const handleDropOnDia = async (
    dia: DiaSemanaIndustrial,
    week: IsoWeekRange,
    e: React.DragEvent,
  ) => {
    e.preventDefault()
    setDragOverKey(null)

    const cardId = e.dataTransfer.getData('cardId')
    if (!cardId) return

    const subcardIdsRaw = e.dataTransfer.getData('subcardIds')
    let subcardIds: string[] | undefined
    if (subcardIdsRaw) {
      try {
        subcardIds = JSON.parse(subcardIdsRaw)
      } catch {
        // ignore
      }
    }

    const card = cards.find((c) => c.id === cardId)
    const isParent = card ? !card.card_pai_id : false

    const childrenIds =
      subcardIds && subcardIds.length > 0
        ? subcardIds.filter((id) => id !== cardId)
        : isParent && card
          ? cards.filter((c) => c.card_pai_id === cardId).map((c) => c.id)
          : []

    const allAffectedIds = Array.from(new Set([cardId, ...childrenIds].filter(Boolean)))

    const { dataLimiteAnalise, dataObraMontagem } = calcularDatasDerivadasPcp(dia.dateStr)
    const semanaLabel = semanaLabelComAno(week)
    const targetData = dia.dateStr

    // Atualização otimista imediata no estado local
    setCards((prev) =>
      prev.map((c) => {
        if (!allAffectedIds.includes(c.id)) return c
        return {
          ...c,
          semana_planejada_producao: semanaLabel,
          data_planejada_producao: targetData,
          data_limite_analise: dataLimiteAnalise,
          data_obra_montagem: dataObraMontagem,
        }
      }),
    )

    try {
      if (allAffectedIds.length > 1) {
        await updateMultipleCardsDataPlanejada(
          allAffectedIds,
          'producao',
          targetData,
          `Programado grupo para ${dia.sigla} ${dia.formattedDiaMes} (${semanaLabel})`,
          {
            semanaPlanejada: semanaLabel,
            dataLimiteAnalise,
            dataObraMontagem,
          },
        )
        toast.success(
          `Grupo [${card?.nome_produto || 'Projeto'}] e ${childrenIds.length} ambiente(s) programados para ${dia.sigla} (${dia.formattedDiaMes})!`,
        )
      } else {
        await updateCardDataPlanejada(
          cardId,
          'producao',
          targetData,
          card?.data_planejada_producao || null,
          `Programado para ${dia.sigla} ${dia.formattedDiaMes} (${semanaLabel})`,
          {
            semanaPlanejada: semanaLabel,
            dataLimiteAnalise,
            dataObraMontagem,
          },
        )
        toast.success(
          `Card [${card?.nome_produto || 'Projeto'}] programado para ${dia.sigla} (${dia.formattedDiaMes})!`,
        )
      }
    } catch (err: any) {
      toast.error('Erro ao programar data/semana: ' + (err.message || 'Erro'))
      loadCards(true)
    }
  }

  // DESAGENDAR PARA A CARTEIRA
  const handleDesagendarParaCarteira = async (
    cardId: string,
    _linha: PcpLinhaOperacao,
    isParent: boolean,
    subcardIds?: string[],
  ) => {
    const card = cards.find((c) => c.id === cardId)
    const actuallyIsParent = isParent || (card ? !card.card_pai_id : false)
    const childrenIds =
      subcardIds && subcardIds.length > 0
        ? subcardIds.filter((id) => id !== cardId)
        : actuallyIsParent && card
          ? cards.filter((c) => c.card_pai_id === cardId).map((c) => c.id)
          : []

    const allAffectedIds = Array.from(new Set([cardId, ...childrenIds].filter(Boolean)))

    // Atualização otimista
    setCards((prev) =>
      prev.map((c) => {
        if (!allAffectedIds.includes(c.id)) return c
        return {
          ...c,
          semana_planejada_producao: null,
          data_planejada_producao: null,
          mes_planejado_producao: null,
        }
      }),
    )

    try {
      if (allAffectedIds.length > 1) {
        await updateMultipleCardsDataPlanejada(
          allAffectedIds,
          'producao',
          null,
          'Retornado para a Carteira',
          {
            semanaPlanejada: null,
          },
        )
        await updateMultipleCardsSemanaPlanejada(
          allAffectedIds,
          'producao',
          null,
          'Retornado para a Carteira',
        )
        toast.success(
          `Grupo [${card?.nome_produto || 'Projeto'}] e ${childrenIds.length} ambiente(s) retornados para a Carteira!`,
        )
      } else {
        await updateCardDataPlanejada(
          cardId,
          'producao',
          null,
          card?.data_planejada_producao || null,
          'Retornado para a Carteira',
          { semanaPlanejada: null },
        )
        await updateCardSemanaPlanejada(
          cardId,
          'producao',
          null,
          card?.semana_planejada_producao || null,
          'Retornado para a Carteira',
        )
        toast.success(`Card [${card?.nome_produto || 'Projeto'}] retornado para a Carteira!`)
      }
    } catch (err: any) {
      toast.error('Erro ao desagendar: ' + (err.message || 'Erro'))
      loadCards(true)
    }
  }

  const unassignedCount = useMemo(() => contarCardsParaAgendar(cards), [cards])

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* 1.1 SELEÇÃO SIMPLIFICADA DE PERÍODO (NO TOPO DA GRADE) */}
      <div className="px-4 lg:px-6 py-2.5 bg-card border-b border-border flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-2xs">
        {/* Lado Esquerdo: Filtros diretos [ 📅 Ano: 2026 ▾ ] [ 🗓️ Período de Meses: Setembro a Outubro ▾ ] [ 🔍 Buscar Cliente... ] */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Botão de Alternância da Carteira com badge */}
          <Button
            variant={sidebarCollapsed ? 'outline' : 'secondary'}
            size="sm"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="h-8 px-2.5 text-xs font-semibold gap-1.5 border-border shadow-2xs"
            title={
              sidebarCollapsed ? 'Abrir Carteira lateral' : 'Recolher Carteira para 100% de largura'
            }
          >
            <span>📥 Carteira / Pendentes</span>
            <Badge
              variant={unassignedCount > 0 ? 'default' : 'secondary'}
              className="text-[10px] px-1.5 py-0 h-4 min-w-[18px] justify-center"
            >
              {unassignedCount}
            </Badge>
          </Button>

          {/* Filtro 1: [ 📅 Ano: 2026 ▾ ] */}
          <div className="flex items-center gap-1 bg-muted/60 px-2 py-0.5 rounded-lg border border-border/50">
            <CalendarIcon className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium text-muted-foreground mr-1">Ano:</span>
            <Select
              value={String(selectedYear)}
              onValueChange={(val) => setSelectedYear(Number(val))}
            >
              <SelectTrigger className="h-7 w-[90px] text-xs font-bold border-0 bg-transparent shadow-none p-0 focus:ring-0">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2026">2026</SelectItem>
                <SelectItem value="2027">2027</SelectItem>
                <SelectItem value="2028">2028</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filtro 2: [ 🗓️ Período de Meses: ex: Setembro a Outubro ▾ ] */}
          <div className="flex items-center gap-1.5 bg-muted/60 px-2.5 py-0.5 rounded-lg border border-border/50">
            <span className="text-xs font-medium text-muted-foreground">Período:</span>
            <Select
              value={String(mesInicio)}
              onValueChange={(val) => {
                const start = Number(val)
                setMesInicio(start)
                if (start > mesFim) setMesFim(start)
              }}
            >
              <SelectTrigger className="h-7 w-[105px] text-xs font-semibold border-0 bg-transparent shadow-none p-0 focus:ring-0">
                <SelectValue placeholder="Mês Início" />
              </SelectTrigger>
              <SelectContent>
                {MESES_NOMES.map((m, idx) => (
                  <SelectItem key={idx} value={String(idx)}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">a</span>
            <Select
              value={String(mesFim)}
              onValueChange={(val) => {
                const end = Number(val)
                setMesFim(end)
                if (end < mesInicio) setMesInicio(end)
              }}
            >
              <SelectTrigger className="h-7 w-[105px] text-xs font-semibold border-0 bg-transparent shadow-none p-0 focus:ring-0">
                <SelectValue placeholder="Mês Fim" />
              </SelectTrigger>
              <SelectContent>
                {MESES_NOMES.map((m, idx) => (
                  <SelectItem key={idx} value={String(idx)}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtro 3: [ 🔍 Buscar Cliente... ] */}
          <div className="relative w-48 sm:w-60">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar Cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 pl-8 text-xs bg-background"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Lado Direito: Resumo de semanas e botão atualizar */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs px-2 py-0.5 bg-muted/40 border-border">
            {semanasFiltradas.length} Semanas no Período
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => loadCards(true)}
            disabled={refreshing}
            title="Atualizar dados"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', refreshing && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* ÁREA CENTRAL: CARTEIRA LATERAL + GRADE INDUSTRIAL */}
      <div className="flex-1 flex flex-row overflow-hidden min-h-0 h-full relative">
        {/* CARTEIRA LATERAL: CONTROLE VISUAL DE PRAZOS E URGÊNCIA */}
        <PcpCarteiraSidebar
          cards={cards}
          collapsed={sidebarCollapsed}
          modo="mensal"
          onToggleCollapsed={() => setSidebarCollapsed(!sidebarCollapsed)}
          onCardClick={(card) => {
            setSelectedCard(card)
            setDrawerOpen(true)
          }}
          onDropToCarteira={handleDesagendarParaCarteira}
        />

        {/* 1.2 ESTRUTURA DE COLUNAS (SEMANAS ISO COM 6 DIAS DE TRABALHO: SEG A SÁB) */}
        <div className="flex-1 h-full min-w-0 overflow-x-auto overflow-y-auto p-3 bg-muted/20 overscroll-contain">
          <div className="flex flex-col gap-4 min-w-[920px]">
            {semanasFiltradas.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center bg-card rounded-xl border border-dashed border-border">
                <CalendarIcon className="w-10 h-10 text-muted-foreground/50 mb-2" />
                <p className="text-sm font-semibold text-foreground">
                  Nenhuma semana encontrada para o período selecionado
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Ajuste o filtro de meses ou ano para visualizar a programação.
                </p>
              </div>
            ) : (
              semanasFiltradas.map((week) => {
                const diasSemana = getDiasSemanaIndustrial(week)
                const cardsSemana = getCardsForWeek(week)
                // 1.3 Cálculo financeiro reativo com regra anti-dupla-contagem
                const totalSemanaR$ = somarCardsComAntiDuplaContagem(cardsSemana)
                const semaforoSemana = avaliarCapacidadeFinanceira(totalSemanaR$)

                return (
                  <div
                    key={week.key}
                    className="bg-card rounded-xl border border-border shadow-xs overflow-hidden flex flex-col transition-all hover:border-border/80"
                  >
                    {/* CABEÇALHO DA SEMANA ISO (SOMA AUTOMÁTICA SEG A SÁB COM SEMÁFORO INSTANTÂNEO) */}
                    <div className="px-4 py-2 bg-muted/40 border-b border-border flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="text-sm font-black text-foreground tracking-tight">
                          {week.label}
                        </span>
                        <span className="text-xs text-muted-foreground font-medium">
                          ({week.formattedRange})
                        </span>
                      </div>

                      {/* SEMÁFORO FINANCEIRO DA SEMANA ISO */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          Total Semana:
                        </span>
                        <strong className={cn('text-sm font-extrabold', semaforoSemana.textClass)}>
                          {formatBRL(totalSemanaR$)}
                        </strong>

                        {/* BADGE COM REGRAS:
                            - Até 299.999,99: Azul (Livre)
                            - 300.000,00 a 350.000,00: Verde (META FULL)
                            - 350.001,00 a 399.999,99: Amarelo (Atenção)
                            - A partir de 400.000,00: Vermelho (Sobrecarga)
                        */}
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] font-bold px-2 py-0.5 border shadow-2xs',
                            semaforoSemana.badgeClass,
                          )}
                        >
                          {semaforoSemana.badgeText}
                        </Badge>
                      </div>
                    </div>

                    {/* 6 COLUNAS DIÁRIAS (SEG | TER | QUA | QUI | SEX | SÁB) — RECEPTÁCULOS DROPZONE ATIVOS */}
                    <div className="grid grid-cols-6 divide-x divide-border bg-background">
                      {diasSemana.map((dia) => {
                        const cellKey = `${week.key}-${dia.dateStr}`
                        const cardsDia = getCardsForDia(dia, week)
                        const totalDiaR$ = somarCardsComAntiDuplaContagem(cardsDia)
                        const isDragOver = dragOverKey === cellKey

                        return (
                          <div
                            key={dia.dateStr}
                            onDragOver={(e) => {
                              e.preventDefault()
                              e.dataTransfer.dropEffect = 'move'
                              if (dragOverKey !== cellKey) setDragOverKey(cellKey)
                            }}
                            onDragLeave={(e) => {
                              e.preventDefault()
                              if (dragOverKey === cellKey) setDragOverKey(null)
                            }}
                            onDrop={(e) => handleDropOnDia(dia, week, e)}
                            className={cn(
                              'flex flex-col min-h-[160px] p-2 transition-all relative',
                              isDragOver &&
                                'bg-primary/10 ring-2 ring-primary ring-inset border-dashed',
                            )}
                          >
                            {/* Rótulo do Dia + Soma em R$ do Dia */}
                            <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-border/40 text-xs">
                              <div className="flex items-baseline gap-1">
                                <span className="font-extrabold text-foreground text-xs">
                                  {dia.sigla}
                                </span>
                                <span className="text-[10px] font-medium text-muted-foreground">
                                  {dia.formattedDiaMes}
                                </span>
                              </div>
                              <span
                                className={cn(
                                  'text-[11px] font-bold',
                                  totalDiaR$ > 0 ? 'text-foreground' : 'text-muted-foreground/60',
                                )}
                              >
                                {formatBRL(totalDiaR$)}
                              </span>
                            </div>

                            {/* Receptáculo / Dropzone de Cards */}
                            <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto max-h-[320px]">
                              {cardsDia.length === 0 ? (
                                <div
                                  className={cn(
                                    'flex-1 min-h-[70px] rounded-lg border border-dashed flex flex-col items-center justify-center p-2 text-center transition-colors',
                                    isDragOver
                                      ? 'border-primary bg-primary/10 text-primary font-semibold text-[11px]'
                                      : 'border-border/30 hover:border-border/60 text-muted-foreground/40 hover:text-muted-foreground/70',
                                  )}
                                >
                                  <span className="text-[10px]">
                                    {isDragOver ? 'Solte para alocar' : 'Livre'}
                                  </span>
                                </div>
                              ) : (
                                cardsDia.map((card) => (
                                  <PcpCard
                                    key={card.id}
                                    card={card}
                                    linha="producao"
                                    currentSemana={week.label}
                                    onClick={() => {
                                      setSelectedCard(card)
                                      setDrawerOpen(true)
                                    }}
                                  />
                                ))
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Side Drawer para edição detalhada do card */}
      <PcpSideDrawer
        card={selectedCard}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        availableWeeks={semanasFiltradas}
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
