import React, { useState } from 'react'
import { PcpCardItem, PcpLinhaOperacao } from '@/services/pcp-planejamento'
import { IsoWeekRange, avaliarCapacidadeFinanceira, matchWeek, formatBRL } from '@/lib/pcp-capacity'
import { PcpCard } from './PcpCard'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface PcpGradeSemanalProps {
  weeks: IsoWeekRange[]
  cards: PcpCardItem[]
  onDropCard: (cardId: string, linha: PcpLinhaOperacao, targetSemanaKey: string) => void
  onCardClick: (card: PcpCardItem) => void
}

const LINHAS_CONFIG: {
  id: PcpLinhaOperacao
  title: string
  icon: string
  subtext: string
  field: 'semana_planejada_analise' | 'semana_planejada_producao' | 'semana_planejada_montagem'
}[] = [
  {
    id: 'analise',
    title: '📐 [ ANÁLISE TÉCNICA ]',
    icon: '📐',
    subtext: 'Engenharia, Caderno Técnico e Listas',
    field: 'semana_planejada_analise',
  },
  {
    id: 'producao',
    title: '🏭 [ PRODUÇÃO ]',
    icon: '🏭',
    subtext: 'Corte, Router, Borda e Fabricação Fabril',
    field: 'semana_planejada_producao',
  },
  {
    id: 'montagem',
    title: '🔧 [ MONTAGEM ]',
    icon: '🔧',
    subtext: 'Expedição, Transporte e Instalação em Obra',
    field: 'semana_planejada_montagem',
  },
]

export const PcpGradeSemanal: React.FC<PcpGradeSemanalProps> = ({
  weeks,
  cards,
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

  // Soma de R$ na linha de produção para cada semana
  const getProducaoSomaSemana = (week: IsoWeekRange): number => {
    const weekCards = getCardsForCell('producao', week)
    return weekCards.reduce((acc, c) => acc + (c.valor_total || 0), 0)
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
    if (cardId) {
      onDropCard(cardId, linha, week.label)
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* Grade com Scroll Horizontal suave */}
      <div className="flex-1 overflow-x-auto overflow-y-auto">
        <div
          className="min-w-full flex flex-col h-full"
          style={{ minWidth: `${Math.max(weeks.length * 280 + 220, 960)}px` }}
        >
          {/* Cabeçalho da Grade: Colunas de Semanas do Ano */}
          <div className="sticky top-0 z-20 flex bg-card border-b border-border shadow-2xs">
            {/* Célula do canto superior esquerdo (Rótulo das Linhas) */}
            <div className="w-56 shrink-0 p-3 bg-muted/40 border-r border-border flex items-center justify-between font-bold text-xs text-foreground uppercase tracking-wider">
              <span>Linhas de Operação</span>
              <span className="text-[10px] text-muted-foreground font-normal">
                {weeks.length} semanas
              </span>
            </div>

            {/* Colunas Semanais: S40 [05/10 a 09/10] */}
            {weeks.map((week) => {
              const somaProducao = getProducaoSomaSemana(week)
              const capacidade = avaliarCapacidadeFinanceira(somaProducao)

              return (
                <div
                  key={week.key}
                  className="flex-1 min-w-[270px] p-2.5 border-r border-border bg-card flex flex-col justify-between gap-1"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-black text-foreground">{week.label}</span>
                      <span className="text-xs font-medium text-muted-foreground">
                        [{week.formattedRange}]
                      </span>
                    </div>

                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px] font-semibold px-1.5 py-0 border',
                        capacidade.badgeClass,
                      )}
                    >
                      {capacidade.badgeText}
                    </Badge>
                  </div>

                  {/* Faixa de capacidade financeira no topo de cada coluna semanal (especificação item 3) */}
                  <div
                    className={cn(
                      'rounded-md px-2 py-1 text-[11px] border font-medium flex items-center justify-between transition-colors',
                      capacidade.bgClass,
                      capacidade.borderClass,
                    )}
                    title={`Regra de Capacidade Fabril: Meta Full R$ 300k - 350k. Carga atual: ${capacidade.formattedTotal}. ${capacidade.label}`}
                  >
                    <div className="flex items-center gap-1 truncate">
                      <span className="text-muted-foreground text-[10px]">Carga:</span>
                      <strong className={cn('font-bold', capacidade.textClass)}>
                        {capacidade.formattedTotal}
                      </strong>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-normal shrink-0">
                      Meta: 300k - 350k
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* 3 Linhas Horizontais Paralelas Alinhadas no Tempo:
              1. 📐 [ ANÁLISE TÉCNICA ]
              2. 🏭 [ PRODUÇÃO ]
              3. 🔧 [ MONTAGEM ]
          */}
          <div className="flex-1 flex flex-col divide-y divide-border">
            {LINHAS_CONFIG.map((linha) => {
              const isProducao = linha.id === 'producao'

              return (
                <div
                  key={linha.id}
                  className={cn(
                    'flex-1 flex min-h-[220px]',
                    isProducao ? 'bg-background' : 'bg-muted/10',
                  )}
                >
                  {/* Cabeçalho fixo da linha à esquerda */}
                  <div className="w-56 shrink-0 p-3 border-r border-border bg-card/80 flex flex-col justify-between sticky left-0 z-10 shadow-2xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base">{linha.icon}</span>
                        <h3 className="text-xs font-black text-foreground tracking-tight">
                          {linha.title}
                        </h3>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1 leading-snug">
                        {linha.subtext}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-border/50 text-[10px] text-muted-foreground flex items-center justify-between">
                      <span>Total Alocado:</span>
                      <strong className="text-foreground font-semibold">
                        {cards.filter((c) => Boolean(c[linha.field])).length} cards
                      </strong>
                    </div>
                  </div>

                  {/* Células semanais desta linha */}
                  {weeks.map((week) => {
                    const cellKey = `${linha.id}-${week.key}`
                    const cellCards = getCardsForCell(linha.id, week)
                    const isDragOver = dragOverCell === cellKey
                    const totalValorCelula = cellCards.reduce(
                      (acc, c) => acc + (c.valor_total || 0),
                      0,
                    )

                    // Se for linha de PRODUÇÃO, aplica sinalizador visual de cor na semana
                    const capacidade = avaliarCapacidadeFinanceira(totalValorCelula)

                    return (
                      <div
                        key={week.key}
                        onDragOver={(e) => handleDragOver(e, cellKey)}
                        onDragLeave={(e) => handleDragLeave(e, cellKey)}
                        onDrop={(e) => handleDrop(e, linha.id, week)}
                        className={cn(
                          'flex-1 min-w-[270px] p-2 border-r border-border flex flex-col transition-all',
                          isDragOver && 'bg-primary/10 ring-2 ring-primary ring-inset',
                          isProducao &&
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
                        {/* Sub-cabeçalho da célula */}
                        <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-border/40 text-[10px] text-muted-foreground">
                          <span className="font-semibold text-foreground/80">
                            {cellCards.length} {cellCards.length === 1 ? 'card' : 'cards'}
                          </span>
                          <span className="font-medium text-foreground">
                            {formatBRL(totalValorCelula)}
                          </span>
                        </div>

                        {/* Lista de cards alocados na célula */}
                        <div className="flex-1 overflow-y-auto space-y-1.5 max-h-[380px] pr-0.5">
                          {cellCards.length === 0 ? (
                            <div className="h-full min-h-[90px] border-2 border-dashed border-border/60 rounded-lg flex flex-col items-center justify-center text-center p-2 text-muted-foreground/60 transition-colors hover:border-border">
                              <span className="text-[11px] font-medium">
                                {isDragOver ? 'Solte aqui para planejar' : 'Sem cards'}
                              </span>
                              <span className="text-[9px] opacity-70">
                                Arraste para {week.label}
                              </span>
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
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
