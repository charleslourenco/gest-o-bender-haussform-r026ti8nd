import React, { useState } from 'react'
import { PcpCardItem, PcpLinhaOperacao } from '@/services/pcp-planejamento'
import { avaliarCapacidadeFinanceiraMensal, formatBRL } from '@/lib/pcp-capacity'
import { PcpCard } from './PcpCard'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export interface MesInfo {
  index: number // 0 a 11
  key: string // "2026-01", "2026-02", etc.
  nome: string // "Janeiro", "Fevereiro", etc.
  abreviado: string // "Jan", "Fev"
}

interface PcpGradeAnualProps {
  year: number
  cards: PcpCardItem[]
  onDropCard: (cardId: string, linha: PcpLinhaOperacao, targetMesKey: string) => void
  onCardClick: (card: PcpCardItem) => void
  onMonthDoubleClick: (monthIndex: number, year: number) => void
}

const LINHAS_CONFIG: {
  id: PcpLinhaOperacao
  title: string
  icon: string
  subtext: string
  field: 'mes_planejado_analise' | 'mes_planejado_producao' | 'mes_planejado_montagem'
}[] = [
  {
    id: 'analise',
    title: '📐 [ ANÁLISE TÉCNICA ]',
    icon: '📐',
    subtext: 'Engenharia, Caderno Técnico e Listas',
    field: 'mes_planejado_analise',
  },
  {
    id: 'producao',
    title: '🏭 [ PRODUÇÃO ]',
    icon: '🏭',
    subtext: 'Corte, Router, Borda e Fabricação Fabril',
    field: 'mes_planejado_producao',
  },
  {
    id: 'montagem',
    title: '🔧 [ MONTAGEM ]',
    icon: '🔧',
    subtext: 'Expedição, Transporte e Instalação em Obra',
    field: 'mes_planejado_montagem',
  },
]

export const MESES_ANO = [
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

/**
 * Normaliza e compara mês salvo com mês da coluna.
 * Pode ser "2026-01", "2026-1", "01", "1", "Janeiro"
 */
export function matchMonth(cardMonthVal: string | null | undefined, mes: MesInfo): boolean {
  if (!cardMonthVal) return false
  const clean = cardMonthVal.trim().toLowerCase()
  if (clean === mes.key.toLowerCase()) return true
  const monthNum = String(mes.index + 1).padStart(2, '0')
  if (clean === monthNum) return true
  if (clean === String(mes.index + 1)) return true
  if (clean.includes(`-${monthNum}`)) return true
  if (clean === mes.nome.toLowerCase()) return true
  if (clean === mes.abreviado.toLowerCase()) return true
  return false
}

export const PcpGradeAnual: React.FC<PcpGradeAnualProps> = ({
  year,
  cards,
  onDropCard,
  onCardClick,
  onMonthDoubleClick,
}) => {
  const [dragOverCell, setDragOverCell] = useState<string | null>(null)

  const meses: MesInfo[] = MESES_ANO.map((nome, index) => {
    const monthNum = String(index + 1).padStart(2, '0')
    return {
      index,
      key: `${year}-${monthNum}`,
      nome,
      abreviado: nome.slice(0, 3),
    }
  })

  // Agrupamento de cards por linha e mês
  const getCardsForCell = (linha: PcpLinhaOperacao, mes: MesInfo): PcpCardItem[] => {
    const field =
      linha === 'analise'
        ? 'mes_planejado_analise'
        : linha === 'producao'
          ? 'mes_planejado_producao'
          : 'mes_planejado_montagem'

    return cards.filter((c) => matchMonth(c[field], mes))
  }

  // Soma de R$ na linha de produção para cada mês
  const getProducaoSomaMes = (mes: MesInfo): number => {
    const mesCards = getCardsForCell('producao', mes)
    return mesCards.reduce((acc, c) => acc + (c.valor_total || 0), 0)
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

  const handleDrop = (e: React.DragEvent, linha: PcpLinhaOperacao, mes: MesInfo) => {
    e.preventDefault()
    setDragOverCell(null)
    const cardId = e.dataTransfer.getData('cardId')
    if (cardId) {
      onDropCard(cardId, linha, mes.key)
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* Grade com Scroll Horizontal suave (12 meses) */}
      <div className="flex-1 overflow-x-auto overflow-y-auto">
        <div className="min-w-full flex flex-col h-full" style={{ minWidth: '3300px' }}>
          {/* Cabeçalho da Grade: 12 Colunas de Meses */}
          <div className="sticky top-0 z-20 flex bg-card border-b border-border shadow-2xs">
            {/* Rótulo das Linhas */}
            <div className="w-56 shrink-0 p-3 bg-muted/40 border-r border-border flex items-center justify-between font-bold text-xs text-foreground uppercase tracking-wider">
              <span>Linhas de Operação</span>
              <span className="text-[10px] text-muted-foreground font-normal">
                12 Meses ({year})
              </span>
            </div>

            {/* 12 Colunas Mensais (Janeiro a Dezembro) */}
            {meses.map((mes) => {
              const somaProducao = getProducaoSomaMes(mes)
              const capacidade = avaliarCapacidadeFinanceiraMensal(somaProducao)

              return (
                <div
                  key={mes.key}
                  onDoubleClick={() => onMonthDoubleClick(mes.index, year)}
                  className="flex-1 min-w-[250px] p-2.5 border-r border-border bg-card flex flex-col justify-between gap-1.5 cursor-pointer hover:bg-muted/40 transition-colors group select-none"
                  title="Duplo clique para navegar até a Visão Mensal deste mês"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-black text-foreground group-hover:text-primary transition-colors">
                        {mes.nome}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">{mes.key}</span>
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

                  {/* Faixa de capacidade financeira no topo de cada coluna mensal */}
                  {/* Meta Mensal FULL (referência 4 semanas): R$ 1.200.000,00 a R$ 1.400.000,00 */}
                  <div
                    className={cn(
                      'rounded-md px-2 py-1 text-[11px] border font-medium flex items-center justify-between transition-colors',
                      capacidade.bgClass,
                      capacidade.borderClass,
                    )}
                    title={`Regra de Capacidade Mensal: Meta Full R$ 1.200.000 a R$ 1.400.000. Carga atual: ${capacidade.formattedTotal}. ${capacidade.label}`}
                  >
                    <div className="flex items-center gap-1 truncate">
                      <span className="text-muted-foreground text-[10px]">Carga:</span>
                      <strong className={cn('font-bold', capacidade.textClass)}>
                        {capacidade.formattedTotal}
                      </strong>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-normal shrink-0">
                      Meta: 1.2M - 1.4M
                    </span>
                  </div>

                  <span className="text-[9px] text-muted-foreground/60 italic self-end">
                    Duplo clique: ver semanas ➔
                  </span>
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
                      <span>Total Alocado Ano:</span>
                      <strong className="text-foreground font-semibold">
                        {cards.filter((c) => Boolean(c[linha.field])).length} cards
                      </strong>
                    </div>
                  </div>

                  {/* Células mensais desta linha */}
                  {meses.map((mes) => {
                    const cellKey = `${linha.id}-${mes.key}`
                    const cellCards = getCardsForCell(linha.id, mes)
                    const isDragOver = dragOverCell === cellKey
                    const totalValorCelula = cellCards.reduce(
                      (acc, c) => acc + (c.valor_total || 0),
                      0,
                    )

                    // Sinalizador de cor na linha de PRODUÇÃO
                    const capacidade = avaliarCapacidadeFinanceiraMensal(totalValorCelula)

                    return (
                      <div
                        key={mes.key}
                        onDragOver={(e) => handleDragOver(e, cellKey)}
                        onDragLeave={(e) => handleDragLeave(e, cellKey)}
                        onDrop={(e) => handleDrop(e, linha.id, mes)}
                        onDoubleClick={() => onMonthDoubleClick(mes.index, year)}
                        className={cn(
                          'flex-1 min-w-[250px] p-2 border-r border-border flex flex-col transition-all cursor-default',
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
                        {/* Sub-cabeçalho da célula mensal */}
                        <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-border/40 text-[10px] text-muted-foreground">
                          <span className="font-semibold text-foreground/80">
                            {cellCards.length} {cellCards.length === 1 ? 'card' : 'cards'}
                          </span>
                          <span className="font-medium text-foreground">
                            {formatBRL(totalValorCelula)}
                          </span>
                        </div>

                        {/* Lista de cards alocados no mês */}
                        <div className="flex-1 overflow-y-auto space-y-1.5 max-h-[380px] pr-0.5">
                          {cellCards.length === 0 ? (
                            <div className="h-full min-h-[90px] border-2 border-dashed border-border/60 rounded-lg flex flex-col items-center justify-center text-center p-2 text-muted-foreground/60 transition-colors hover:border-border">
                              <span className="text-[11px] font-medium">
                                {isDragOver ? 'Solte aqui para planejar' : 'Sem cards'}
                              </span>
                              <span className="text-[9px] opacity-70">Arraste para {mes.nome}</span>
                            </div>
                          ) : (
                            cellCards.map((card) => (
                              <PcpCard
                                key={card.id}
                                card={card}
                                linha={linha.id}
                                currentMes={mes.key}
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
