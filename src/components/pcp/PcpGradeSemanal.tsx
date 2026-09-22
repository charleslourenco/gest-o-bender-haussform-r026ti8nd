import React, { useState } from 'react'
import { PcpCardItem, PcpLinhaOperacao } from '@/services/pcp-planejamento'
import { IsoWeekRange, avaliarCapacidadeFinanceira, matchWeek, formatBRL } from '@/lib/pcp-capacity'
import { PcpCard } from './PcpCard'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface PcpGradeSemanalProps {
  weeks: IsoWeekRange[]
  cards: PcpCardItem[]
  focoLinha?: PcpLinhaOperacao | 'geral'
  onDropCard: (
    cardId: string,
    linha: PcpLinhaOperacao,
    targetSemanaKey: string,
    subcardIds?: string[],
  ) => void
  onCardClick: (card: PcpCardItem) => void
}

const LINHAS_CONFIG: {
  id: PcpLinhaOperacao
  shortLabel: string
  fullLabel: string
  icon: string
  field: 'semana_planejada_analise' | 'semana_planejada_producao' | 'semana_planejada_montagem'
}[] = [
  {
    id: 'analise',
    shortLabel: '📐 Análise',
    fullLabel: 'Análise Técnica',
    icon: '📐',
    field: 'semana_planejada_analise',
  },
  {
    id: 'producao',
    shortLabel: '🏭 Produção',
    fullLabel: 'Produção Fabril',
    icon: '🏭',
    field: 'semana_planejada_producao',
  },
  {
    id: 'montagem',
    shortLabel: '🔧 Montagem',
    fullLabel: 'Montagem & Obra',
    icon: '🔧',
    field: 'semana_planejada_montagem',
  },
]

export const PcpGradeSemanal: React.FC<PcpGradeSemanalProps> = ({
  weeks,
  cards,
  focoLinha = 'geral',
  onDropCard,
  onCardClick,
}) => {
  const [dragOverCell, setDragOverCell] = useState<string | null>(null)

  // Agrupamento de cards por linha e por semana
  const getCardsForCell = (linha: PcpLinhaOperacao, week: IsoWeekRange): PcpCardItem[] => {
    const field =
      linha === 'analise'
        ? 'semana_planejada_analise'
        : linha === 'producao'
          ? 'semana_planejada_producao'
          : 'semana_planejada_montagem'

    return cards.filter((c) => matchWeek(c[field], week))
  }

  // Soma de R$ para qualquer linha em cada semana sem dupla contagem:
  // quando um card pai possui filhos com valor_total > 0, soma APENAS os filhos (pai é só contêiner);
  // pai sem filhos valorados soma o próprio valor.
  const getLinhaSomaSemana = (linha: PcpLinhaOperacao, week: IsoWeekRange): number => {
    const cellCards = getCardsForCell(linha, week)
    const paisComFilhosValorados = new Set<string>()
    for (const c of cellCards) {
      if (c.card_pai_id && (Number(c.valor_total) || 0) > 0) {
        paisComFilhosValorados.add(c.card_pai_id)
      }
    }
    return cellCards.reduce((acc, c) => {
      const isParent = !c.card_pai_id
      if (isParent && paisComFilhosValorados.has(c.id)) {
        return acc
      }
      return acc + (Number(c.valor_total) || 0)
    }, 0)
  }

  // Soma de R$ na linha de produção para cada semana
  const getProducaoSomaSemana = (week: IsoWeekRange): number => {
    return getLinhaSomaSemana('producao', week)
  }

  const handleDragOver = (e: React.DragEvent, cellKey: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverCell !== cellKey) {
      setDragOverCell(cellKey)
    }
  }

  const handleDragLeave = (e: React.DragEvent, cellKey: string) => {
    e.preventDefault()
    if (dragOverCell === cellKey) {
      setDragOverCell(null)
    }
  }

  const handleDrop = (e: React.DragEvent, linha: PcpLinhaOperacao, week: IsoWeekRange) => {
    e.preventDefault()
    setDragOverCell(null)
    const cardId = e.dataTransfer.getData('cardId')
    const subcardIdsRaw = e.dataTransfer.getData('subcardIds')
    let subcardIds: string[] | undefined
    if (subcardIdsRaw) {
      try {
        subcardIds = JSON.parse(subcardIdsRaw)
      } catch {
        // ignore
      }
    }
    if (cardId) {
      onDropCard(cardId, linha, week.label, subcardIds)
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* Grade com Scroll Horizontal suave otimizada para até 5 semanas simultâneas sem rolagem excessiva */}
      <div className="flex-1 overflow-x-auto overflow-y-auto">
        <div
          className="min-w-full flex flex-col h-full"
          style={{ minWidth: `${Math.max(weeks.length * 200 + 120, 960)}px` }}
        >
          {/* Cabeçalho da Grade: Colunas de Semanas do Ano */}
          <div className="sticky top-0 z-20 flex bg-card border-b border-border shadow-2xs">
            {/* Célula do canto superior esquerdo (Rótulo das Linhas Swimlane Slim - 120px fixo) */}
            <div className="w-[120px] shrink-0 p-2 bg-muted/40 border-r border-border flex flex-col justify-center items-center text-center">
              <span className="font-bold text-[10px] text-foreground uppercase tracking-wider">
                Etapas
              </span>
              <span className="text-[9px] text-muted-foreground font-normal">
                {weeks.length} sem.
              </span>
            </div>

            {/* Colunas Semanais: S40 [05/10 a 09/10] */}
            {weeks.map((week) => {
              const somaProducao = getLinhaSomaSemana('producao', week)
              const somaAnalise = getLinhaSomaSemana('analise', week)
              const somaMontagem = getLinhaSomaSemana('montagem', week)
              const capacidade = avaliarCapacidadeFinanceira(somaProducao)

              return (
                <div
                  key={week.key}
                  className="flex-1 min-w-[200px] p-2 border-r border-border bg-card flex flex-col justify-between gap-1"
                >
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-baseline gap-1 truncate">
                      <span className="text-xs font-black text-foreground">{week.label}</span>
                      <span className="text-[10px] font-medium text-muted-foreground truncate">
                        [{week.formattedRange}]
                      </span>
                    </div>

                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[9px] font-semibold px-1 py-0 border shrink-0',
                        capacidade.badgeClass,
                      )}
                    >
                      {capacidade.badgeText}
                    </Badge>
                  </div>
                  {/* Faixa de capacidade financeira no topo de cada coluna semanal */}
                  <div
                    className={cn(
                      'rounded px-1.5 py-0.5 text-[10px] border font-medium flex flex-col gap-0.5 transition-colors',
                      capacidade.bgClass,
                      capacidade.borderClass,
                    )}
                    title={`Regra de Capacidade Fabril: Meta Full R$ 300k - 350k. Carga atual: ${capacidade.formattedTotal}. ${capacidade.label}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 truncate">
                        <span className="text-muted-foreground text-[9px]">Carga:</span>
                        <strong className={cn('font-bold', capacidade.textClass)}>
                          {capacidade.formattedTotal}
                        </strong>
                      </div>
                      <span className="text-[9px] text-muted-foreground font-normal shrink-0">
                        300k-350k
                      </span>
                    </div>

                    {/* Discriminação rápida por linha no cabeçalho superior quando há carga em Análise ou Montagem */}
                    {(somaAnalise > 0 || somaMontagem > 0) && (
                      <div className="flex items-center gap-1.5 pt-0.5 border-t border-border/40 text-[9px] text-muted-foreground">
                        {somaAnalise > 0 && (
                          <span title="Carga Análise Técnica" className="truncate">
                            📐 <strong className="text-foreground">{formatBRL(somaAnalise)}</strong>
                          </span>
                        )}
                        {somaMontagem > 0 && (
                          <span title="Carga Montagem" className="truncate">
                            🔧{' '}
                            <strong className="text-foreground">{formatBRL(somaMontagem)}</strong>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Linhas Horizontais (Suporte a Modo Foco: Geral vs Linha única) */}
          <div className="flex-1 flex flex-col divide-y divide-border">
            {LINHAS_CONFIG.filter((l) => focoLinha === 'geral' || focoLinha === l.id).map(
              (linha) => {
                const isProducao = linha.id === 'producao'
                const isExpandedFull = focoLinha !== 'geral'

                return (
                  <div
                    key={linha.id}
                    className={cn(
                      'flex min-h-[190px] transition-all',
                      isExpandedFull ? 'flex-1 min-h-[380px]' : 'flex-1',
                      isProducao ? 'bg-background' : 'bg-muted/10',
                    )}
                  >
                    {/* Cabeçalho fixo da linha à esquerda - Slim 120px max */}
                    <div className="w-[120px] shrink-0 p-2 border-r border-border bg-card/90 flex flex-col justify-between items-center text-center sticky left-0 z-10 shadow-2xs">
                      <div className="w-full flex flex-col items-center">
                        <Badge
                          variant="outline"
                          className="px-1.5 py-0.5 text-[11px] font-bold border-border bg-background shadow-2xs mb-1"
                        >
                          {linha.shortLabel}
                        </Badge>
                        <span className="text-[9px] text-muted-foreground truncate w-full">
                          {linha.fullLabel}
                        </span>
                      </div>

                      <div className="w-full pt-1.5 border-t border-border/50 text-[9px] text-muted-foreground flex flex-col items-center">
                        <span>Alocado:</span>
                        <strong className="text-foreground font-semibold">
                          {cards.filter((c) => Boolean(c[linha.field])).length}
                        </strong>
                      </div>
                    </div>

                    {/* Células semanais desta linha */}
                    {weeks.map((week) => {
                      const cellKey = `${linha.id}-${week.key}`
                      const cellCards = getCardsForCell(linha.id, week)
                      const isDragOver = dragOverCell === cellKey
                      const totalValorCelula = getLinhaSomaSemana(linha.id, week)

                      // Se for linha de PRODUÇÃO, aplica sinalizador visual de cor na semana
                      const capacidade = avaliarCapacidadeFinanceira(totalValorCelula)

                      return (
                        <div
                          key={week.key}
                          onDragOver={(e) => handleDragOver(e, cellKey)}
                          onDragLeave={(e) => handleDragLeave(e, cellKey)}
                          onDrop={(e) => handleDrop(e, linha.id, week)}
                          className={cn(
                            'flex-1 min-w-[200px] p-1.5 border-r border-border flex flex-col transition-all',
                            isDragOver &&
                              'bg-primary/10 border-2 border-dashed border-primary ring-2 ring-primary ring-inset',
                            isProducao &&
                              !isDragOver &&
                              'hover:bg-muted/30 ' +
                                (capacidade.status === 'vermelho'
                                  ? 'bg-rose-500/5'
                                  : capacidade.status === 'amarelo'
                                    ? 'bg-amber-500/5'
                                    : capacidade.status === 'verde'
                                      ? 'bg-emerald-500/5'
                                      : 'bg-blue-500/5'),
                          )}
                        >
                          {/* Sub-cabeçalho da célula (exibido apenas quando houver cards) */}
                          {cellCards.length > 0 && (
                            <div className="flex items-center justify-between pb-0.5 mb-1 text-[9px] text-muted-foreground border-b border-border/20">
                              <span className="font-medium text-foreground/70">
                                {cellCards.length} {cellCards.length === 1 ? 'card' : 'cards'}
                              </span>
                              <span className="font-semibold text-foreground">
                                {formatBRL(totalValorCelula)}
                              </span>
                            </div>
                          )}

                          {/* Lista de cards alocados na célula */}
                          <div
                            className={cn(
                              'flex-1 overflow-y-auto space-y-1 pr-0.5',
                              isExpandedFull ? 'max-h-[600px]' : 'max-h-[380px]',
                            )}
                          >
                            {cellCards.length === 0 ? (
                              <div
                                className={cn(
                                  'h-full min-h-[44px] rounded flex flex-col items-center justify-center text-center p-1 transition-colors',
                                  isDragOver
                                    ? 'border-2 border-dashed border-primary bg-primary/10 text-primary font-semibold text-[10px]'
                                    : 'border-none bg-transparent',
                                )}
                              >
                                {isDragOver && <span>Solte aqui</span>}
                              </div>
                            ) : (
                              cellCards.map((card) => (
                                <PcpCard
                                  key={card.id}
                                  card={card}
                                  linha={linha.id}
                                  currentSemana={week.label}
                                  compact={true}
                                  showClientName={true}
                                  onClick={() => onCardClick(card)}
                                />
                              ))
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              },
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
