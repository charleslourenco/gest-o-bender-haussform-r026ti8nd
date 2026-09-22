import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase/client'
import {
  PcpCardItem,
  fetchPcpCards,
  updateCardDataPlanejada,
  updateCardSemanaPlanejada,
  updateCardMesPlanejado,
  PcpLinhaOperacao,
} from '@/services/pcp-planejamento'
import { formatBRL, getIsoWeeksForMonth } from '@/lib/pcp-capacity'
import { PcpCarteiraSidebar } from './PcpCarteiraSidebar'
import { PcpGradeDiaria, DiaInfo } from './PcpGradeDiaria'
import { PcpSideDrawer } from './PcpSideDrawer'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, RefreshCw, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const DIAS_SEMANA_LONGOS = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
]

const DIAS_SEMANA_CURTOS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const MESES = [
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

export const PcpMatrizDiaria: React.FC = () => {
  const today = useMemo(() => new Date(), [])
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear())
  const [currentMonthIndex, setCurrentMonthIndex] = useState<number>(today.getMonth())

  const [cards, setCards] = useState<PcpCardItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [focoLinha, setFocoLinha] = useState<PcpLinhaOperacao | 'geral'>('geral')

  // Drawer
  const [selectedCard, setSelectedCard] = useState<PcpCardItem | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Carregar dados
  const loadCards = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true)
    else setRefreshing(true)
    try {
      const data = await fetchPcpCards()
      setCards(data)
    } catch (err: any) {
      toast.error('Erro ao carregar dados do PCP: ' + (err.message || 'Erro'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadCards()
  }, [loadCards])

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel('pcp_matriz_diaria_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'produtos_servicos_projeto',
        },
        () => loadCards(true),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadCards])

  // Gerar todos os dias do mês selecionado
  const diasDoMes: DiaInfo[] = useMemo(() => {
    const totalDias = new Date(currentYear, currentMonthIndex + 1, 0).getDate()
    const todayStr = new Date().toISOString().slice(0, 10)
    const list: DiaInfo[] = []

    for (let dia = 1; dia <= totalDias; dia++) {
      const dateObj = new Date(currentYear, currentMonthIndex, dia)
      const dayOfWeek = dateObj.getDay()
      const monthNum = String(currentMonthIndex + 1).padStart(2, '0')
      const diaStr = String(dia).padStart(2, '0')
      const dateString = `${currentYear}-${monthNum}-${diaStr}`

      const diaSemanaLongo = DIAS_SEMANA_LONGOS[dayOfWeek]
      const diaSemanaCurto = DIAS_SEMANA_CURTOS[dayOfWeek]
      const formattedFull = `${diaSemanaLongo} ${diaStr}/${monthNum}`

      list.push({
        dateString,
        diaDoMes: dia,
        diaSemanaCurto,
        diaSemanaLongo,
        formattedFull,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        isToday: dateString === todayStr,
      })
    }

    return list
  }, [currentYear, currentMonthIndex])

  // Navegação mês
  const handlePrevMonth = () => {
    if (currentMonthIndex === 0) {
      setCurrentMonthIndex(11)
      setCurrentYear((y) => y - 1)
    } else {
      setCurrentMonthIndex((m) => m - 1)
    }
  }

  const handleNextMonth = () => {
    if (currentMonthIndex === 11) {
      setCurrentMonthIndex(0)
      setCurrentYear((y) => y + 1)
    } else {
      setCurrentMonthIndex((m) => m + 1)
    }
  }

  const handleCurrentMonth = () => {
    const n = new Date()
    setCurrentYear(n.getFullYear())
    setCurrentMonthIndex(n.getMonth())
  }

  // Drag and Drop com suporte a Card Pai (aloca pai + subcards) ou Subcard isolado
  const handleDropCard = async (
    cardId: string,
    targetLinha: PcpLinhaOperacao,
    targetDateStr: string,
    subcardIds?: string[],
  ) => {
    const card = cards.find((c) => c.id === cardId)
    if (!card) return

    const fieldMap: Record<
      PcpLinhaOperacao,
      'data_planejada_analise' | 'data_planejada_producao' | 'data_planejada_montagem'
    > = {
      analise: 'data_planejada_analise',
      producao: 'data_planejada_producao',
      montagem: 'data_planejada_montagem',
    }

    const isParent = !card.card_pai_id
    const childrenIds =
      subcardIds && subcardIds.length > 0
        ? subcardIds
        : isParent
          ? cards.filter((c) => c.card_pai_id === cardId).map((c) => c.id)
          : []

    const allAffectedIds = [cardId, ...childrenIds]

    // Atualização otimista
    setCards((prev) =>
      prev.map((c) =>
        allAffectedIds.includes(c.id)
          ? {
              ...c,
              [fieldMap[targetLinha]]: targetDateStr,
            }
          : c,
      ),
    )

    try {
      if (childrenIds.length > 0) {
        const { updateMultipleCardsDataPlanejada } = await import('@/services/pcp-planejamento')
        await updateMultipleCardsDataPlanejada(
          allAffectedIds,
          targetLinha,
          targetDateStr,
          `Programado projeto pai e ${childrenIds.length} ambiente(s) para o dia ${targetDateStr}`,
        )
        toast.success(
          `Projeto [${card.nome_produto}] e ${childrenIds.length} ambiente(s) alocados para ${targetDateStr}!`,
        )
      } else {
        const previousDate = card[fieldMap[targetLinha]]
        await updateCardDataPlanejada(
          cardId,
          targetLinha,
          targetDateStr,
          previousDate || null,
          `Alocado na grade diária para ${targetDateStr}`,
        )
        toast.success(
          `${card.card_pai_id ? 'Ambiente' : 'Card'} [${card.nome_produto}] alocado para ${targetDateStr}!`,
        )
      }
    } catch (err: any) {
      toast.error('Erro ao atualizar data planejada: ' + (err.message || 'Erro'))
      loadCards(true)
    }
  }

  // Drawer
  const handleOpenDrawer = (card: PcpCardItem) => {
    setSelectedCard(card)
    setDrawerOpen(true)
  }

  const weeksForDrawer = useMemo(() => {
    return getIsoWeeksForMonth(currentYear, currentMonthIndex)
  }, [currentYear, currentMonthIndex])

  // Total do mês na linha de produção
  const totalMesProducao = useMemo(() => {
    return cards.reduce((acc, c) => {
      const dt = c.data_planejada_producao
      if (!dt || typeof dt !== 'string') return acc
      const parts = dt.slice(0, 7).split('-')
      if (parts.length < 2) return acc
      const y = Number(parts[0])
      const m = Number(parts[1])
      if (y === currentYear && m === currentMonthIndex + 1) {
        return acc + (Number(c.valor_total) || 0)
      }
      return acc
    }, 0)
  }, [cards, currentYear, currentMonthIndex])

  // Contagem de pendentes na carteira (sem data planejada)
  const unassignedCount = useMemo(() => {
    return cards.filter(
      (c) => !c.data_planejada_producao || c.data_planejada_producao.trim() === '',
    ).length
  }, [cards])

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* Barra de controle */}
      <div className="px-4 lg:px-6 py-2 bg-card border-b border-border flex flex-wrap items-center justify-between gap-2.5 shrink-0 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={sidebarCollapsed ? 'outline' : 'secondary'}
            size="sm"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="h-7 px-2.5 text-xs font-semibold gap-1.5 border-border shadow-2xs"
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

          <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/50">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevMonth}
              title="Mês anterior"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <span className="text-xs font-bold text-foreground px-2 min-w-[120px] text-center select-none">
              {MESES[currentMonthIndex]} {currentYear}
            </span>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleNextMonth}
              title="Próximo mês"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCurrentMonth}
            className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground hidden sm:inline-flex"
          >
            Mês Atual
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => loadCards(true)}
            disabled={refreshing}
            title="Atualizar dados"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', refreshing && 'animate-spin')} />
          </Button>
        </div>

        {/* Modo Foco por Etapa */}
        <div className="flex items-center p-0.5 bg-muted/70 rounded-lg gap-0.5 border border-border/50">
          <Button
            variant={focoLinha === 'geral' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFocoLinha('geral')}
            className={cn(
              'h-6 px-2 text-[11px] font-semibold gap-1 transition-all',
              focoLinha === 'geral'
                ? 'bg-primary text-primary-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground',
            )}
            title="Exibir todas as 3 linhas operacionais em paralelo"
          >
            <span>🌐 Visão Geral (3 Linhas)</span>
          </Button>

          <Button
            variant={focoLinha === 'analise' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFocoLinha('analise')}
            className={cn(
              'h-6 px-2 text-[11px] font-semibold gap-1 transition-all',
              focoLinha === 'analise'
                ? 'bg-primary text-primary-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground',
            )}
            title="Expandir linha de Análise Técnica"
          >
            <span>📐 Foco: Análise</span>
          </Button>

          <Button
            variant={focoLinha === 'producao' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFocoLinha('producao')}
            className={cn(
              'h-6 px-2 text-[11px] font-semibold gap-1 transition-all',
              focoLinha === 'producao'
                ? 'bg-primary text-primary-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground',
            )}
            title="Expandir linha de Produção"
          >
            <span>🏭 Foco: Produção</span>
          </Button>

          <Button
            variant={focoLinha === 'montagem' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFocoLinha('montagem')}
            className={cn(
              'h-6 px-2 text-[11px] font-semibold gap-1 transition-all',
              focoLinha === 'montagem'
                ? 'bg-primary text-primary-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground',
            )}
            title="Expandir linha de Montagem"
          >
            <span>🔧 Foco: Montagem</span>
          </Button>
        </div>

        {/* Indicadores Resumo */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20 text-primary">
            <span className="text-[11px] font-medium">Carga Diária Produção:</span>
            <strong className="font-extrabold">{formatBRL(totalMesProducao)}</strong>
          </div>
        </div>
      </div>

      {/* Área Central: Carteira + Grade Diária */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        <PcpCarteiraSidebar
          cards={cards}
          collapsed={sidebarCollapsed}
          modo="diario"
          onToggleCollapsed={() => setSidebarCollapsed(!sidebarCollapsed)}
          onCardClick={handleOpenDrawer}
        />

        <PcpGradeDiaria
          dias={diasDoMes}
          cards={cards}
          focoLinha={focoLinha}
          onDropCard={handleDropCard}
          onCardClick={handleOpenDrawer}
        />
      </div>

      {/* Painel lateral direito */}
      <PcpSideDrawer
        card={selectedCard}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        availableWeeks={weeksForDrawer}
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
