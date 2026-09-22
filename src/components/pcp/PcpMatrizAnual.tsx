import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase/client'
import {
  PcpCardItem,
  fetchPcpCards,
  updateCardMesPlanejado,
  updateCardSemanaPlanejada,
  PcpLinhaOperacao,
} from '@/services/pcp-planejamento'
import { formatBRL, getIsoWeeksForMonth } from '@/lib/pcp-capacity'
import { PcpCarteiraSidebar } from './PcpCarteiraSidebar'
import { PcpGradeAnual, matchMonth } from './PcpGradeAnual'
import { PcpSideDrawer } from './PcpSideDrawer'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, RefreshCw, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface PcpMatrizAnualProps {
  onNavigateToMonth?: (monthIndex: number, year: number) => void
}

export const PcpMatrizAnual: React.FC<PcpMatrizAnualProps> = ({ onNavigateToMonth }) => {
  const today = useMemo(() => new Date(), [])
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear())

  const [cards, setCards] = useState<PcpCardItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Drawer de detalhes
  const [selectedCard, setSelectedCard] = useState<PcpCardItem | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

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

  // Subscrição Real-Time
  useEffect(() => {
    const channel = supabase
      .channel('pcp_matriz_anual_realtime')
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

  // Navegação de ano
  const handlePrevYear = () => setCurrentYear((y) => y - 1)
  const handleNextYear = () => setCurrentYear((y) => y + 1)
  const handleCurrentYear = () => setCurrentYear(new Date().getFullYear())

  // Arrastar e soltar em coluna de Mês
  const handleDropCard = async (
    cardId: string,
    targetLinha: PcpLinhaOperacao,
    targetMesKey: string,
  ) => {
    const card = cards.find((c) => c.id === cardId)
    if (!card) return

    const fieldMap: Record<
      PcpLinhaOperacao,
      'mes_planejado_analise' | 'mes_planejado_producao' | 'mes_planejado_montagem'
    > = {
      analise: 'mes_planejado_analise',
      producao: 'mes_planejado_producao',
      montagem: 'mes_planejado_montagem',
    }

    const previousMes = card[fieldMap[targetLinha]]
    if (previousMes === targetMesKey) return

    // Atualização otimista
    setCards((prev) =>
      prev.map((c) =>
        c.id === cardId
          ? {
              ...c,
              [fieldMap[targetLinha]]: targetMesKey,
            }
          : c,
      ),
    )

    try {
      await updateCardMesPlanejado(
        cardId,
        targetLinha,
        targetMesKey,
        previousMes || null,
        `Programado via Drag and Drop na grade anual (${targetMesKey})`,
      )
      toast.success(
        `Card [${card.nome_produto}] alocado para o mês ${targetMesKey} em ${
          targetLinha === 'analise'
            ? 'Análise Técnica'
            : targetLinha === 'producao'
              ? 'Produção'
              : 'Montagem'
        }!`,
      )
    } catch (err: any) {
      toast.error('Erro ao atualizar mês planejado: ' + (err.message || 'Erro'))
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
    await updateCardSemanaPlanejada(cardId, linha, novaSemana, semanaAnterior, motivo)
    loadCards(true)
  }

  const handleUpdateMesFromDrawer = async (
    cardId: string,
    linha: PcpLinhaOperacao,
    novoMes: string | null,
    mesAnterior: string | null,
    motivo?: string,
  ) => {
    await updateCardMesPlanejado(cardId, linha, novoMes, mesAnterior, motivo)
    loadCards(true)
  }

  const handleOpenDrawer = (card: PcpCardItem) => {
    setSelectedCard(card)
    setDrawerOpen(true)
  }

  const handleMonthDoubleClick = (monthIndex: number, year: number) => {
    if (onNavigateToMonth) {
      onNavigateToMonth(monthIndex, year)
      toast.info(`Navegando para a Visão Mensal de ${monthIndex + 1}/${year}`)
    }
  }

  // Totais do ano em produção: derivada direta de todos os meses do ano (agregação hierárquica unificada)
  const anoProdCards = useMemo(() => {
    return cards.filter((c) => {
      // 1. Vinculado a mês do ano
      if (c.mes_planejado_producao && c.mes_planejado_producao.startsWith(`${currentYear}-`)) {
        return true
      }
      // 2. OU vinculado a semana que pertence a este ano
      if (c.semana_planejada_producao) {
        const clean = c.semana_planejada_producao.trim()
        if (clean.startsWith(`${currentYear}-W`)) return true
        // Se for "Sxx" e tiver mes_planejado neste ano
        if (clean.startsWith('S') && c.mes_planejado_producao?.startsWith(`${currentYear}-`)) {
          return true
        }
      }
      return false
    })
  }, [cards, currentYear])

  const anoProdTotal = useMemo(() => {
    return anoProdCards.reduce((acc, c) => acc + (Number(c.valor_total) || 0), 0)
  }, [anoProdCards])

  // Semanas do mês atual para o side drawer
  const drawerWeeks = useMemo(() => {
    return getIsoWeeksForMonth(currentYear, today.getMonth())
  }, [currentYear, today])

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* Barra de Controle de Período Anual */}
      <div className="px-6 py-2.5 bg-card border-b border-border flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-2xs">
        {/* Navegador de Ano */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/50">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevYear}
              title="Ano anterior"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <span className="text-xs font-bold text-foreground px-3 min-w-[100px] text-center select-none">
              Ano {currentYear}
            </span>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleNextYear}
              title="Próximo ano"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCurrentYear}
            className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground"
          >
            Ano Atual
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

        {/* Indicadores do Ano */}
        <div className="flex items-center gap-3 text-xs">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/40 border border-border/50">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-muted-foreground text-[11px]">Planejamento Geral:</span>
            <strong className="text-foreground font-bold">12 Meses (Jan - Dez)</strong>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20 text-primary">
            <span className="text-[11px] font-medium">Carga Produção no Ano:</span>
            <strong className="font-extrabold">{formatBRL(anoProdTotal)}</strong>
          </div>
        </div>
      </div>

      {/* Área Central: Sidebar de Carteira + Grade Anual (12 Meses) */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        <PcpCarteiraSidebar
          cards={cards}
          collapsed={sidebarCollapsed}
          modo="anual"
          onToggleCollapsed={() => setSidebarCollapsed(!sidebarCollapsed)}
          onCardClick={handleOpenDrawer}
        />

        <PcpGradeAnual
          year={currentYear}
          cards={cards}
          onDropCard={handleDropCard}
          onCardClick={handleOpenDrawer}
          onMonthDoubleClick={handleMonthDoubleClick}
        />
      </div>

      {/* Painel Lateral Direito (Side Drawer) */}
      <PcpSideDrawer
        card={selectedCard}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        availableWeeks={drawerWeeks}
        onUpdateSemana={handleUpdateSemanaFromDrawer}
        onUpdateMes={handleUpdateMesFromDrawer}
      />
    </div>
  )
}
