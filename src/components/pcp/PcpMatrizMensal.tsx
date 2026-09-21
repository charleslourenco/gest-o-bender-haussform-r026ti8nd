import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase/client'
import {
  PcpCardItem,
  fetchPcpCards,
  updateCardSemanaPlanejada,
  updateCardMesPlanejado,
  PcpLinhaOperacao,
} from '@/services/pcp-planejamento'
import {
  getIsoWeeksForMonth,
  IsoWeekRange,
  formatBRL,
  avaliarCapacidadeFinanceira,
} from '@/lib/pcp-capacity'
import { PcpCarteiraSidebar } from './PcpCarteiraSidebar'
import { PcpGradeSemanal } from './PcpGradeSemanal'
import { PcpSideDrawer } from './PcpSideDrawer'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

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

interface PcpMatrizMensalProps {
  initialYear?: number
  initialMonthIndex?: number
}

export const PcpMatrizMensal: React.FC<PcpMatrizMensalProps> = ({
  initialYear,
  initialMonthIndex,
}) => {
  const today = useMemo(() => new Date(), [])
  const [currentYear, setCurrentYear] = useState<number>(initialYear ?? today.getFullYear())
  const [currentMonthIndex, setCurrentMonthIndex] = useState<number>(
    initialMonthIndex ?? today.getMonth(),
  )

  useEffect(() => {
    if (initialYear !== undefined) setCurrentYear(initialYear)
    if (initialMonthIndex !== undefined) setCurrentMonthIndex(initialMonthIndex)
  }, [initialYear, initialMonthIndex])

  const [cards, setCards] = useState<PcpCardItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Drawer de detalhes
  const [selectedCard, setSelectedCard] = useState<PcpCardItem | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Semanas do mês selecionado
  const weeks: IsoWeekRange[] = useMemo(() => {
    return getIsoWeeksForMonth(currentYear, currentMonthIndex)
  }, [currentYear, currentMonthIndex])

  // Carregar dados de cards
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

  // Subscrição Real-Time para manter sincrono entre múltiplos usuários
  useEffect(() => {
    const channel = supabase
      .channel('pcp_matriz_mensal_realtime')
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
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pcp_reprogramacao_historico',
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

  // Navegação de mês
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

  // Ação de arrastar e soltar (Drag and Drop)
  const handleDropCard = async (
    cardId: string,
    targetLinha: PcpLinhaOperacao,
    targetSemanaLabel: string,
  ) => {
    const card = cards.find((c) => c.id === cardId)
    if (!card) return

    const fieldMap: Record<
      PcpLinhaOperacao,
      'semana_planejada_analise' | 'semana_planejada_producao' | 'semana_planejada_montagem'
    > = {
      analise: 'semana_planejada_analise',
      producao: 'semana_planejada_producao',
      montagem: 'semana_planejada_montagem',
    }

    const previousSemana = card[fieldMap[targetLinha]]
    if (previousSemana === targetSemanaLabel) return

    // Atualização otimista local imediata
    setCards((prev) =>
      prev.map((c) =>
        c.id === cardId
          ? {
              ...c,
              [fieldMap[targetLinha]]: targetSemanaLabel,
            }
          : c,
      ),
    )

    try {
      await updateCardSemanaPlanejada(
        cardId,
        targetLinha,
        targetSemanaLabel,
        previousSemana,
        `Programado via Drag and Drop na grade semanal (${targetSemanaLabel})`,
      )
      toast.success(
        `Card [${card.nome_produto}] alocado para ${targetSemanaLabel} em ${
          targetLinha === 'analise'
            ? 'Análise Técnica'
            : targetLinha === 'producao'
              ? 'Produção'
              : 'Montagem'
        }!`,
      )
    } catch (err: any) {
      toast.error('Erro ao atualizar semana planejada: ' + (err.message || 'Erro'))
      // Reverter
      loadCards(true)
    }
  }

  // Atualização direta pelo Side Drawer
  const handleUpdateSemanaFromDrawer = async (
    cardId: string,
    linha: PcpLinhaOperacao,
    novaSemana: string | null,
    semanaAnterior: string | null,
    motivo?: string,
  ) => {
    const fieldMap: Record<
      PcpLinhaOperacao,
      'semana_planejada_analise' | 'semana_planejada_producao' | 'semana_planejada_montagem'
    > = {
      analise: 'semana_planejada_analise',
      producao: 'semana_planejada_producao',
      montagem: 'semana_planejada_montagem',
    }

    setCards((prev) =>
      prev.map((c) =>
        c.id === cardId
          ? {
              ...c,
              [fieldMap[linha]]: novaSemana,
            }
          : c,
      ),
    )

    if (selectedCard && selectedCard.id === cardId) {
      setSelectedCard((prev) =>
        prev
          ? {
              ...prev,
              [fieldMap[linha]]: novaSemana,
            }
          : null,
      )
    }

    try {
      await updateCardSemanaPlanejada(cardId, linha, novaSemana, semanaAnterior, motivo)
      toast.success('Programação de semana atualizada com sucesso!')
    } catch (err: any) {
      toast.error('Erro ao atualizar semana: ' + (err.message || 'Erro'))
      loadCards(true)
    }
  }

  const handleOpenDrawer = (card: PcpCardItem) => {
    setSelectedCard(card)
    setDrawerOpen(true)
  }

  // Totais do mês para o banner superior
  const mesProdCards = cards.filter((c) =>
    weeks.some((w) => w.label === c.semana_planejada_producao),
  )
  const mesProdTotal = mesProdCards.reduce((acc, c) => acc + (c.valor_total || 0), 0)

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* Barra de Controle de Período Mensal */}
      <div className="px-6 py-2.5 bg-card border-b border-border flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-2xs">
        {/* Navegador de Mês / Ano */}
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

        {/* Indicadores Resumo do Mês */}
        <div className="flex items-center gap-3 text-xs">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/40 border border-border/50">
            <span className="text-muted-foreground text-[11px]">Semanas no período:</span>
            <strong className="text-foreground font-bold">
              {weeks.map((w) => w.label).join(', ')}
            </strong>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20 text-primary">
            <span className="text-[11px] font-medium">Carga Total Produção Mês:</span>
            <strong className="font-extrabold">{formatBRL(mesProdTotal)}</strong>
          </div>
        </div>
      </div>

      {/* Área Central: Barra Lateral Esquerda (Carteira) + Área Central (Grade Semanal) */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        {/* Barra Lateral Esquerda: CARTEIRA (Aguardando Semana) */}
        <PcpCarteiraSidebar
          cards={cards}
          collapsed={sidebarCollapsed}
          onToggleCollapsed={() => setSidebarCollapsed(!sidebarCollapsed)}
          onCardClick={handleOpenDrawer}
        />

        {/* Grade Semanal Central (ISO Weeks) */}
        <PcpGradeSemanal
          weeks={weeks}
          cards={cards}
          onDropCard={handleDropCard}
          onCardClick={handleOpenDrawer}
        />
      </div>

      {/* Painel Lateral Direito (Side Drawer) */}
      <PcpSideDrawer
        card={selectedCard}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        availableWeeks={weeks}
        onUpdateSemana={handleUpdateSemanaFromDrawer}
        onUpdateMes={async (cardId, linha, novoMes, mesAnterior, motivo) => {
          await updateCardMesPlanejado(cardId, linha, novoMes, mesAnterior, motivo)
          loadCards(true)
        }}
      />
    </div>
  )
}
