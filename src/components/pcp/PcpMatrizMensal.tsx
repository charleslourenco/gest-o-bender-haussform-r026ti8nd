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
  avaliarCapacidadeFinanceiraMensal,
  somarCargaProducaoMes,
  somarCargaTodasLinhasMes,
} from '@/lib/pcp-capacity'
import { PcpCarteiraSidebar } from './PcpCarteiraSidebar'
import { PcpGradeSemanal } from './PcpGradeSemanal'
import { PcpSideDrawer } from './PcpSideDrawer'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, RefreshCw, Layers } from 'lucide-react'
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
  const [focoLinha, setFocoLinha] = useState<PcpLinhaOperacao | 'geral'>('geral')

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

  // Ação de arrastar e soltar (Drag and Drop) com suporte a Card Pai (aloca pai + subcards) ou Subcard isolado
  const handleDropCard = async (
    cardId: string,
    targetLinha: PcpLinhaOperacao,
    targetSemanaLabel: string,
    subcardIds?: string[],
  ) => {
    const card = cards.find((c) => c.id === cardId)
    if (!card && (!subcardIds || subcardIds.length === 0)) return

    const fieldMap: Record<
      PcpLinhaOperacao,
      'semana_planejada_analise' | 'semana_planejada_producao' | 'semana_planejada_montagem'
    > = {
      analise: 'semana_planejada_analise',
      producao: 'semana_planejada_producao',
      montagem: 'semana_planejada_montagem',
    }

    const isParent = card ? !card.card_pai_id : false
    // Se for pai (ou agrupador virtual), encontrar todos os subcards filhos para alocação conjunta
    const childrenIds =
      subcardIds && subcardIds.length > 0
        ? subcardIds.filter((id) => id !== cardId)
        : isParent && card
          ? cards.filter((c) => c.card_pai_id === cardId).map((c) => c.id)
          : []

    const allAffectedIds = Array.from(new Set([cardId, ...childrenIds].filter(Boolean)))

    // Atualização otimista local imediata de todos os afetados (semana e se targetLinha for producao, mes_planejado_producao também)
    const currentMonthNum = String(currentMonthIndex + 1).padStart(2, '0')
    const currentMesKey = `${currentYear}-${currentMonthNum}`

    setCards((prev) =>
      prev.map((c) => {
        if (!allAffectedIds.includes(c.id)) return c
        const updated: PcpCardItem = {
          ...c,
          [fieldMap[targetLinha]]: targetSemanaLabel,
        }
        // Ao planejar semana de produção, garantir que mes_planejado_producao receba o mês atual caso esteja vazio
        if (
          targetLinha === 'producao' &&
          (!c.mes_planejado_producao || c.mes_planejado_producao.trim() === '')
        ) {
          updated.mes_planejado_producao = currentMesKey
        }
        return updated
      }),
    )

    try {
      if (childrenIds.length > 0) {
        // Alocar pai + todos os subcards
        const { updateMultipleCardsSemanaPlanejada } = await import('@/services/pcp-planejamento')
        await updateMultipleCardsSemanaPlanejada(
          allAffectedIds,
          targetLinha,
          targetSemanaLabel,
          `Programado projeto pai e ${childrenIds.length} ambiente(s) para ${targetSemanaLabel}`,
        )
        toast.success(
          `Projeto [${card?.nome_produto || 'Grupo'}] e ${childrenIds.length} ambiente(s) alocados para ${targetSemanaLabel}!`,
        )
      } else if (card) {
        // Alocar card isolado (pai sem filhos ou subcard isolado)
        const previousSemana = card[fieldMap[targetLinha]]
        await updateCardSemanaPlanejada(
          cardId,
          targetLinha,
          targetSemanaLabel,
          previousSemana,
          `Programado via Drag and Drop (${targetSemanaLabel})`,
        )
        toast.success(
          `${card.card_pai_id ? 'Ambiente' : 'Card'} [${card.nome_produto}] alocado para ${targetSemanaLabel}!`,
        )
      }
    } catch (err: any) {
      toast.error('Erro ao atualizar semana planejada: ' + (err.message || 'Erro'))
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
      prev.map((c) => {
        if (c.id !== cardId) return c
        const updated: PcpCardItem = {
          ...c,
          [fieldMap[linha]]: novaSemana,
        }
        // Se desagendou (novaSemana é null ou ''), e a linha for produção, limpar também o mês caso estivesse vinculado
        if (!novaSemana && linha === 'producao') {
          updated.mes_planejado_producao = null
        }
        return updated
      }),
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

  // Totais do mês para o banner superior:
  // Carga consolidada das 3 linhas (Análise Técnica, Produção e Montagem) + Detalhe por Linha
  const cargaConsolidadaMes = useMemo(() => {
    return somarCargaTodasLinhasMes(cards, currentYear, currentMonthIndex, weeks)
  }, [cards, currentYear, currentMonthIndex, weeks])

  const { total: mesProdTotal, count: mesProdCount } = useMemo(() => {
    return somarCargaProducaoMes(cards, currentYear, currentMonthIndex, weeks)
  }, [cards, currentYear, currentMonthIndex, weeks])

  // Avaliação de capacidade financeira mensal com base na meta fabril (ou carga geral)
  const capacidadeMensal = useMemo(() => {
    return avaliarCapacidadeFinanceiraMensal(cargaConsolidadaMes.totalGeral)
  }, [cargaConsolidadaMes.totalGeral])

  // Contagem de pendentes na carteira (sem semana e sem mês de produção, e aptos para agendar)
  const unassignedCount = useMemo(() => {
    const STATUS_BLOQUEADOS = new Set([
      'aguardando_plano_corte',
      'router',
      'coladeira',
      'bancada',
      'embalagem',
      'expedicao',
      'aguardando_agenda',
      'montagem',
      'item_terceirizado',
      'pendencia',
      'concluido',
      'iniciar',
      'reuniao_analise',
    ])
    return cards.filter((c) => {
      if (c.visivel_pcp === false) return false
      if (c.arquivado_analise || c.arquivado_producao || c.arquivado_montagem) return false
      if (c.excluido_analise || c.excluido_producao || c.excluido_montagem) return false
      const temSemana = Boolean(
        c.semana_planejada_producao && c.semana_planejada_producao.trim() !== '',
      )
      const temMes = Boolean(c.mes_planejado_producao && c.mes_planejado_producao.trim() !== '')
      if (temSemana || temMes) return false
      const st = (c.status_analise || '').toLowerCase().trim()
      if (STATUS_BLOQUEADOS.has(st)) return false
      return true
    }).length
  }, [cards])

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* Barra de Controle de Período Mensal */}
      <div className="px-4 lg:px-6 py-2 bg-card border-b border-border flex flex-wrap items-center justify-between gap-2.5 shrink-0 shadow-2xs">
        {/* Navegador de Mês / Ano + Botão Carteira Retrátil */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Botão de Alternância rápida da Carteira com contagem de pendentes */}
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

        {/* Modo Foco por Etapa (Seletor de Visualização) */}
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

        {/* Indicadores Resumo do Mês (Preservação de todos os cálculos em R$ e semáforo Meta Full) */}
        <div className="flex items-center gap-2 text-xs">
          {/* Banner Mensal Consolidado: Reflete cargas das 3 linhas operacionais */}
          <div
            className={cn(
              'flex flex-wrap items-center gap-2 px-2.5 py-1 rounded-md border text-xs transition-colors',
              capacidadeMensal.bgClass,
              capacidadeMensal.borderClass,
            )}
            title={`Carga Total das 3 linhas: ${formatBRL(cargaConsolidadaMes.totalGeral)}. Análise: ${formatBRL(cargaConsolidadaMes.totalAnalise)}, Produção: ${formatBRL(cargaConsolidadaMes.totalProducao)}, Montagem: ${formatBRL(cargaConsolidadaMes.totalMontagem)}`}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-foreground">Carga Total Mês:</span>
              <strong
                className={cn('font-extrabold text-xs sm:text-sm', capacidadeMensal.textClass)}
              >
                {formatBRL(cargaConsolidadaMes.totalGeral)}
              </strong>
              <Badge
                variant="outline"
                className={cn('text-[9px] px-1 py-0 border ml-0.5', capacidadeMensal.badgeClass)}
              >
                {capacidadeMensal.badgeText}
              </Badge>
            </div>

            {/* Divisor e breakdown das 3 linhas */}
            <div className="hidden xl:flex items-center gap-2 border-l border-border/60 pl-2 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1" title="Carga Análise Técnica no Mês">
                <span>📐</span>
                <strong className="text-foreground font-semibold">
                  {formatBRL(cargaConsolidadaMes.totalAnalise)}
                </strong>
              </span>

              <span className="flex items-center gap-1" title="Carga Produção no Mês">
                <span>🏭</span>
                <strong className="text-foreground font-semibold">
                  {formatBRL(cargaConsolidadaMes.totalProducao)}
                </strong>
              </span>

              <span className="flex items-center gap-1" title="Carga Montagem no Mês">
                <span>🔧</span>
                <strong className="text-foreground font-semibold">
                  {formatBRL(cargaConsolidadaMes.totalMontagem)}
                </strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Área Central: Barra Lateral Esquerda (Carteira) + Área Central (Grade Semanal) */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        {/* Barra Lateral Esquerda: CARTEIRA (Aguardando Semana no nível Mensal) */}
        <PcpCarteiraSidebar
          cards={cards}
          collapsed={sidebarCollapsed}
          modo="mensal"
          onToggleCollapsed={() => setSidebarCollapsed(!sidebarCollapsed)}
          onCardClick={handleOpenDrawer}
        />

        {/* Grade Semanal Central (ISO Weeks) */}
        <PcpGradeSemanal
          weeks={weeks}
          cards={cards}
          focoLinha={focoLinha}
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
