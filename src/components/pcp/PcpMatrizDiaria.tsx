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

  // Drag and Drop
  const handleDropCard = async (
    cardId: string,
    targetLinha: PcpLinhaOperacao,
    targetDateStr: string,
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

    const previousDate = card[fieldMap[targetLinha]]
    if (previousDate === targetDateStr) return

    // Atualização otimista
    setCards((prev) =>
      prev.map((c) =>
        c.id === cardId
          ? {
              ...c,
              [fieldMap[targetLinha]]: targetDateStr,
            }
          : c,
      ),
    )

    try {
      await updateCardDataPlanejada(
        cardId,
        targetLinha,
        targetDateStr,
        previousDate || null,
        `Alocado na grade diária para ${targetDateStr}`,
      )
      toast.success(
        `Card [${card.nome_produto}] alocado para ${targetDateStr} em ${
          targetLinha === 'analise'
            ? 'Análise Técnica'
            : targetLinha === 'producao'
              ? 'Produção'
              : 'Montagem'
        }!`,
      )
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
      if (!dt) return acc
      const [y, m] = dt.slice(0, 7).split('-').map(Number)
      if (y === currentYear && m === currentMonthIndex + 1) {
        return acc + (Number(c.valor_total) || 0)
      }
      return acc
    }, 0)
  }, [cards, currentYear, currentMonthIndex])

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* Barra de controle */}
      <div className="px-6 py-2.5 bg-card border-b border-border flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-2xs">
        <div className="flex items-center gap-2">
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

            <span className="text-xs font-bold text-foreground px-2 min-w-[140px] text-center select-none">
              {MESES[currentMonthIndex]} de {currentYear}
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
            className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground"
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

        {/* Indicadores Resumo */}
        <div className="flex items-center gap-3 text-xs">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/40 border border-border/50">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-muted-foreground text-[11px]">Dias no mês:</span>
            <strong className="text-foreground font-bold">{diasDoMes.length} dias</strong>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20 text-primary">
            <span className="text-[11px] font-medium">Carga Diária Produção (Mês):</span>
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
