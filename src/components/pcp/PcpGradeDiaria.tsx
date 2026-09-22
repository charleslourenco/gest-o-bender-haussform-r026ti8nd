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
  onDropCard: (cardId: string, linha: PcpLinhaOperacao, targetDateStr: string) => void
  onCardClick: (card: PcpCardItem) => void
}

const LINHAS_CONFIG: {
  id: PcpLinhaOperacao
  title: string
  icon: string
  subtext: string
  field: 'data_planejada_analise' | 'data_planejada_producao' | 'data_planejada_montagem'
}[] = [
  {
    id: 'analise',
    title: '📐 [ ANÁLISE TÉCNICA ]',
    icon: '📐',
    subtext: 'Engenharia, Caderno Técnico e Listas',
    field: 'data_planejada_analise',
  },
  {
    id: 'producao',
    title: '🏭 [ PRODUÇÃO ]',
    icon: '🏭',
    subtext: 'Corte, Router, Borda e Fabricação Fabril',
    field: 'data_planejada_producao',
  },
  {
    id: 'montagem',
    title: '🔧 [ MONTAGEM ]',
    icon: '🔧',
    subtext: 'Expedição, Transporte e Instalação em Obra',
    field: 'data_planejada_montagem',
  },
]

export const PcpGradeDiaria: React.FC<PcpGradeDiariaProps> = ({
  dias,
  cards,
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

  // Soma de R$ na linha de produção para cada dia
  const getProducaoSomaDia = (dia: DiaInfo): number => {
    const diaCards = getCardsForCell('producao', dia)
    return diaCards.reduce((acc, c) => acc + (Number(c.valor_total) || 0), 0)
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
    if (cardId) {
      onDropCard(cardId, linha, dia.dateString)
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* Scroll horizontal suave */}
      <div className="flex-1 overflow-x-auto overflow-y-auto">
        <div
          className="min-w-full flex flex-col h-full"
          style={{ minWidth: `${Math.max(dias.length * 250 + 220, 960)}px` }}
        >
          {/* Cabeçalho da Grade: Colunas dos Dias */}
          <div className="sticky top-0 z-20 flex bg-card border-b border-border shadow-2xs">
            {/* Rótulo das Linhas */}
            <div className="w-56 shrink-0 p-3 bg-muted/40 border-r border-border flex items-center justify-between font-bold text-xs text-foreground uppercase tracking-wider">
              <span>Linhas de Operação</span>
              <span className="text-[10px] text-muted-foreground font-normal">
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
                    'flex-1 min-w-[240px] p-2.5 border-r border-border flex flex-col justify-between gap-1 transition-colors select-none',
                    dia.isToday ? 'bg-primary/5' : dia.isWeekend ? 'bg-muted/30' : 'bg-card',
                  )}
                >
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 truncate">
                      <span
                        className={cn(
                          'text-xs font-bold truncate',
                          dia.isToday ? 'text-primary font-black' : 'text-foreground',
                        )}
                        title={dia.formattedFull}
                      >
                        {dia.diaSemanaLongo} {dia.diaDoMes.toString().padStart(2, '0')}/
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
                      'rounded-md px-2 py-1 text-[11px] border font-medium flex items-center justify-between transition-colors',
                      somaProducao > 0
                        ? 'bg-primary/10 border-primary/20 text-primary'
                        : 'bg-muted/40 border-border/50 text-muted-foreground',
                    )}
                    title={`Total do Dia em Produção: ${formatBRL(somaProducao)}`}
                  >
                    <span className="text-[10px] font-medium">Total:</span>
                    <strong className="font-extrabold text-foreground">
                      {formatBRL(somaProducao)}
                    </strong>
                  </div>
                </div>
              )
            })}
          </div>

          {/* 3 Linhas Horizontais Paralelas:
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

                  {/* Células diárias desta linha */}
                  {dias.map((dia) => {
                    const cellKey = `${linha.id}-${dia.dateString}`
                    const cellCards = getCardsForCell(linha.id, dia)
                    const isDragOver = dragOverCell === cellKey
                    const totalValorCelula = cellCards.reduce(
                      (acc, c) => acc + (Number(c.valor_total) || 0),
                      0,
                    )

                    return (
                      <div
                        key={dia.dateString}
                        onDragOver={(e) => handleDragOver(e, cellKey)}
                        onDragLeave={(e) => handleDragLeave(e, cellKey)}
                        onDrop={(e) => handleDrop(e, linha.id, dia)}
                        className={cn(
                          'flex-1 min-w-[240px] p-2 border-r border-border flex flex-col transition-all select-none',
                          isDragOver && 'bg-primary/10 ring-2 ring-primary ring-inset',
                          dia.isWeekend && 'bg-muted/20',
                          isProducao && !dia.isWeekend && 'hover:bg-muted/20',
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

                        {/* Lista de cards alocados no dia */}
                        <div className="flex-1 overflow-y-auto space-y-1.5 max-h-[380px] pr-0.5">
                          {cellCards.length === 0 ? (
                            <div className="h-full min-h-[90px] border-2 border-dashed border-border/60 rounded-lg flex flex-col items-center justify-center text-center p-2 text-muted-foreground/60 transition-colors hover:border-border">
                              <span className="text-[11px] font-medium">
                                {isDragOver ? 'Solte para alocar no dia' : 'Sem cards'}
                              </span>
                              <span className="text-[9px] opacity-70">
                                Arraste para {dia.diaDoMes}/{dia.dateString.split('-')[1]}
                              </span>
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
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
