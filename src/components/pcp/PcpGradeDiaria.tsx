import React, { useState } from 'react'
import { PcpCardItem, PcpLinhaOperacao } from '@/services/pcp-planejamento'
import { formatBRL } from '@/lib/pcp-capacity'
import { PcpCard } from './PcpCard'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export interface DiaInfo {
  dateString: string // 'YYYY-MM-DD'
  diaDoMes: number
  diaSemanaCurto: string // 'Seg', 'Ter', etc.
  diaSemanaLongo: string // 'Segunda-feira', 'Terça-feira', etc.
  formattedFull: string // 'Terça-feira 08/09'
  isWeekend: boolean
  isToday: boolean
}

interface PcpGradeDiariaProps {
  dias: DiaInfo[]
  cards: PcpCardItem[]
  focoLinha?: PcpLinhaOperacao | 'geral'
  onDropCard: (
    cardId: string,
    linha: PcpLinhaOperacao,
    targetDateStr: string,
    subcardIds?: string[],
  ) => void
  onCardClick: (card: PcpCardItem) => void
}

const LINHAS_CONFIG: {
  id: PcpLinhaOperacao
  shortLabel: string
  fullLabel: string
  icon: string
  field: 'data_planejada_analise' | 'data_planejada_producao' | 'data_planejada_montagem'
}[] = [
  {
    id: 'analise',
    shortLabel: '📐 Análise',
    fullLabel: 'Análise Técnica',
    icon: '📐',
    field: 'data_planejada_analise',
  },
  {
    id: 'producao',
    shortLabel: '🏭 Produção',
    fullLabel: 'Produção Fabril',
    icon: '🏭',
    field: 'data_planejada_producao',
  },
  {
    id: 'montagem',
    shortLabel: '🔧 Montagem',
    fullLabel: 'Montagem & Obra',
    icon: '🔧',
    field: 'data_planejada_montagem',
  },
]

export const PcpGradeDiaria: React.FC<PcpGradeDiariaProps> = ({
  dias,
  cards,
  focoLinha = 'geral',
  onDropCard,
  onCardClick,
}) => {
  const [dragOverCell, setDragOverCell] = useState<string | null>(null)

  // Agrupamento de cards por linha e dia
  const getCardsForCell = (linha: PcpLinhaOperacao, dia: DiaInfo): PcpCardItem[] => {
    const field =
      linha === 'analise'
        ? 'data_planejada_analise'
        : linha === 'producao'
          ? 'data_planejada_producao'
          : 'data_planejada_montagem'

    return cards.filter((c) => {
      const val = c[field]
      if (!val) return false
      return val.slice(0, 10) === dia.dateString
    })
  }

  // Soma de R$ na linha de produção para cada dia (sem duplicar pai e subcards)
  const getProducaoSomaDia = (dia: DiaInfo): number => {
    const diaCards = getCardsForCell('producao', dia)
    const paisComValor = new Set<string>()
    for (const c of diaCards) {
      if (!c.card_pai_id && (Number(c.valor_total) || 0) > 0) {
        paisComValor.add(c.id)
      }
    }
    return diaCards.reduce((acc, c) => {
      if (c.card_pai_id && paisComValor.has(c.card_pai_id)) {
        return acc
      }
      return acc + (Number(c.valor_total) || 0)
    }, 0)
  }

  const getLinhaSomaDia = (linha: PcpLinhaOperacao, dia: DiaInfo): number => {
    const diaCards = getCardsForCell(linha, dia)
    const paisComValor = new Set<string>()
    for (const c of diaCards) {
      if (!c.card_pai_id && (Number(c.valor_total) || 0) > 0) {
        paisComValor.add(c.id)
      }
    }
    return diaCards.reduce((acc, c) => {
      if (c.card_pai_id && paisComValor.has(c.card_pai_id)) {
        return acc
      }
      return acc + (Number(c.valor_total) || 0)
    }, 0)
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

  const handleDrop = (e: React.DragEvent, linha: PcpLinhaOperacao, dia: DiaInfo) => {
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
      onDropCard(cardId, linha, dia.isoDate, subcardIds)
    }
  }
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* Scroll horizontal suave */}
      <div className="flex-1 overflow-x-auto overflow-y-auto">
        <div
          className="min-w-full flex flex-col h-full"
          style={{ minWidth: `${Math.max(dias.length * 180 + 120, 960)}px` }}
        >
          {/* Cabeçalho da Grade: Colunas dos Dias */}
          <div className="sticky top-0 z-20 flex bg-card border-b border-border shadow-2xs">
            {/* Rótulo das Linhas Slim - 120px fixo */}
            <div className="w-[120px] shrink-0 p-2 bg-muted/40 border-r border-border flex flex-col justify-center items-center text-center">
              <span className="font-bold text-[10px] text-foreground uppercase tracking-wider">
                Etapas
              </span>
              <span className="text-[9px] text-muted-foreground font-normal">
                {dias.length} dias
              </span>
            </div>

            {/* Cabeçalho de cada dia: "Terça-feira 08/09 | Total: R$ 45.000,00" */}
            {dias.map((dia) => {
              const somaProducao = getProducaoSomaDia(dia)

              return (
                <div
                  key={dia.dateString}
                  className={cn(
                    'flex-1 min-w-[180px] p-2 border-r border-border flex flex-col justify-between gap-1 transition-colors select-none',
                    dia.isToday ? 'bg-primary/5' : dia.isWeekend ? 'bg-muted/30' : 'bg-card',
                  )}
                >
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1 truncate">
                      <span
                        className={cn(
                          'text-xs font-bold truncate',
                          dia.isToday ? 'text-primary font-black' : 'text-foreground',
                        )}
                        title={dia.formattedFull}
                      >
                        {dia.diaSemanaCurto} {dia.diaDoMes.toString().padStart(2, '0')}/
                        {dia.dateString.split('-')[1]}
                      </span>
                    </div>

                    {dia.isToday && (
                      <Badge
                        variant="default"
                        className="text-[9px] px-1 py-0 h-4 bg-primary text-primary-foreground font-bold shrink-0"
                      >
                        Hoje
                      </Badge>
                    )}
                  </div>

                  {/* Banner do Dia: Total em R$ */}
                  <div
                    className={cn(
                      'rounded px-1.5 py-0.5 text-[10px] border font-medium flex items-center justify-between transition-colors',
                      somaProducao > 0
                        ? 'bg-primary/10 border-primary/20 text-primary'
                        : 'bg-muted/40 border-border/50 text-muted-foreground',
                    )}
                    title={`Total do Dia em Produção: ${formatBRL(somaProducao)}`}
                  >
                    <span className="text-[9px] font-medium">Total:</span>
                    <strong className="font-bold text-foreground truncate">
                      {formatBRL(somaProducao)}
                    </strong>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Linhas Horizontais com suporte a Modo Foco */}
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

                    {/* Células diárias desta linha */}
                    {dias.map((dia) => {
                      const cellKey = `${linha.id}-${dia.dateString}`
                      const cellCards = getCardsForCell(linha.id, dia)
                      const isDragOver = dragOverCell === cellKey
                      const totalValorCelula = getLinhaSomaDia(linha.id, dia)

                      return (
                        <div
                          key={dia.dateString}
                          onDragOver={(e) => handleDragOver(e, cellKey)}
                          onDragLeave={(e) => handleDragLeave(e, cellKey)}
                          onDrop={(e) => handleDrop(e, linha.id, dia)}
                          className={cn(
                            'flex-1 min-w-[180px] p-1.5 border-r border-border flex flex-col transition-all select-none',
                            isDragOver &&
                              'bg-primary/10 border-2 border-dashed border-primary ring-2 ring-primary ring-inset',
                            dia.isWeekend && 'bg-muted/20',
                            isProducao && !dia.isWeekend && !isDragOver && 'hover:bg-muted/20',
                          )}
                        >
                          {/* Sub-cabeçalho da célula */}
                          <div className="flex items-center justify-between pb-1 mb-1 border-b border-border/40 text-[9px] text-muted-foreground">
                            <span className="font-semibold text-foreground/80">
                              {cellCards.length} {cellCards.length === 1 ? 'card' : 'cards'}
                            </span>
                            <span className="font-medium text-foreground">
                              {formatBRL(totalValorCelula)}
                            </span>
                          </div>

                          {/* Lista de cards alocados no dia */}
                          <div
                            className={cn(
                              'flex-1 overflow-y-auto space-y-1.5 pr-0.5',
                              isExpandedFull ? 'max-h-[600px]' : 'max-h-[380px]',
                            )}
                          >
                            {cellCards.length === 0 ? (
                              <div
                                className={cn(
                                  'h-full min-h-[60px] rounded flex flex-col items-center justify-center text-center p-1 text-muted-foreground/40 transition-colors',
                                  isDragOver
                                    ? 'border-2 border-dashed border-primary bg-primary/10 text-primary font-medium text-[10px]'
                                    : 'border border-dashed border-transparent hover:border-border/30',
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
