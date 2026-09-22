import React, { useState } from 'react'
import { PcpCardItem, PcpLinhaOperacao } from '@/services/pcp-planejamento'
import {
  avaliarCapacidadeFinanceiraMensal,
  formatBRL,
  getIsoWeeksForMonth,
  matchWeek,
} from '@/lib/pcp-capacity'
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
  focoLinha?: PcpLinhaOperacao | 'geral'
  onDropCard: (
    cardId: string,
    linha: PcpLinhaOperacao,
    targetMesKey: string,
    subcardIds?: string[],
  ) => void
  onCardClick: (card: PcpCardItem) => void
  onMonthDoubleClick: (monthIndex: number, year: number) => void
}

const LINHAS_CONFIG: {
  id: PcpLinhaOperacao
  shortLabel: string
  fullLabel: string
  icon: string
  field: 'mes_planejado_analise' | 'mes_planejado_producao' | 'mes_planejado_montagem'
}[] = [
  {
    id: 'analise',
    shortLabel: '📐 Análise',
    fullLabel: 'Análise Técnica',
    icon: '📐',
    field: 'mes_planejado_analise',
  },
  {
    id: 'producao',
    shortLabel: '🏭 Produção',
    fullLabel: 'Produção Fabril',
    icon: '🏭',
    field: 'mes_planejado_producao',
  },
  {
    id: 'montagem',
    shortLabel: '🔧 Montagem',
    fullLabel: 'Montagem & Obra',
    icon: '🔧',
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
  focoLinha = 'geral',
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
      abreviado: (nome || '').slice(0, 3),
    }
  })
  // Agrupamento de cards por linha e mês:
  // Um card pertence à coluna do mês se:
  // 1) mes_planejado_* casa com o mês
  // 2) OU se tem semana_planejada_* cujas semanas ISO pertencem ao mês (e não tem outro mês conflitante)
  const getCardsForCell = (linha: PcpLinhaOperacao, mes: MesInfo): PcpCardItem[] => {
    const mesField =
      linha === 'analise'
        ? 'mes_planejado_analise'
        : linha === 'producao'
          ? 'mes_planejado_producao'
          : 'mes_planejado_montagem'

    const semanaField =
      linha === 'analise'
        ? 'semana_planejada_analise'
        : linha === 'producao'
          ? 'semana_planejada_producao'
          : 'semana_planejada_montagem'

    return cards.filter((c) => {
      // Prioridade 1: Mês explícito
      if (c[mesField]) {
        return matchMonth(c[mesField], mes)
      }
      // Prioridade 2: Semana ISO que toca este mês
      if (c[semanaField]) {
        // Obter semanas ISO deste mês
        const weeksDoMes = getIsoWeeksForMonth(year, mes.index)
        return weeksDoMes.some((w) => matchWeek(c[semanaField], w))
      }
      return false
    })
  }

  // Soma de R$ na linha de produção para cada mês sem dupla contagem:
  // quando um card pai possui filhos com valor_total > 0, soma APENAS os filhos (pai é só contêiner);
  // pai sem filhos valorados soma o próprio valor.
  const getProducaoSomaMes = (mes: MesInfo): number => {
    return getLinhaSomaMes('producao', mes)
  }

  const getLinhaSomaMes = (linha: PcpLinhaOperacao, mes: MesInfo): number => {
    const mesCards = getCardsForCell(linha, mes)
    const paisComFilhosValorados = new Set<string>()
    for (const c of mesCards) {
      if (c.card_pai_id && (Number(c.valor_total) || 0) > 0) {
        paisComFilhosValorados.add(c.card_pai_id)
      }
    }
    return mesCards.reduce((acc, c) => {
      const isParent = !c.card_pai_id
      if (isParent && paisComFilhosValorados.has(c.id)) {
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

  const handleDrop = (e: React.DragEvent, linha: PcpLinhaOperacao, mes: MesInfo) => {
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
      onDropCard(cardId, linha, mes.key, subcardIds)
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* Grade com Scroll Horizontal suave (12 meses otimizados para densidade visual: min 6 meses visíveis) */}
      <div className="flex-1 overflow-x-auto overflow-y-auto">
        <div className="min-w-full flex flex-col h-full" style={{ minWidth: '2280px' }}>
          {/* Cabeçalho da Grade: 12 Colunas de Meses */}
          <div className="sticky top-0 z-20 flex bg-card border-b border-border shadow-2xs">
            {/* Rótulo das Linhas Swimlane Slim - 120px fixo */}
            <div className="w-[120px] shrink-0 p-2 bg-muted/40 border-r border-border flex flex-col justify-center items-center text-center">
              <span className="font-bold text-[10px] text-foreground uppercase tracking-wider">
                Etapas
              </span>
              <span className="text-[9px] text-muted-foreground font-normal">
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
                  className="flex-1 min-w-[190px] p-2 border-r border-border bg-card flex flex-col justify-between gap-1 cursor-pointer hover:bg-muted/40 transition-colors group select-none"
                  title="Duplo clique para navegar até a Visão Mensal deste mês"
                >
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-baseline gap-1 truncate">
                      <span className="text-xs font-black text-foreground group-hover:text-primary transition-colors">
                        {mes.nome}
                      </span>
                      <span className="text-[9px] text-muted-foreground font-mono">{mes.key}</span>
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

                  {/* Faixa de capacidade financeira no topo de cada coluna mensal */}
                  <div
                    className={cn(
                      'rounded px-1.5 py-0.5 text-[10px] border font-medium flex items-center justify-between transition-colors',
                      capacidade.bgClass,
                      capacidade.borderClass,
                    )}
                    title={`Regra de Capacidade Mensal: Meta Full R$ 1.200.000 a R$ 1.400.000. Carga atual: ${capacidade.formattedTotal}. ${capacidade.label}`}
                  >
                    <div className="flex items-center gap-1 truncate">
                      <span className="text-muted-foreground text-[9px]">Carga:</span>
                      <strong className={cn('font-bold', capacidade.textClass)}>
                        {capacidade.formattedTotal}
                      </strong>
                    </div>
                    <span className="text-[9px] text-muted-foreground font-normal shrink-0">
                      1.2M - 1.4M
                    </span>
                  </div>

                  <span className="text-[9px] text-muted-foreground/60 italic self-end leading-none">
                    Ver semanas ➔
                  </span>
                </div>
              )
            })}
          </div>

          {/* Linhas Horizontais Paralelas com suporte a Modo Foco */}
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
                        <span>Alocado Ano:</span>
                        <strong className="text-foreground font-semibold">
                          {cards.filter((c) => Boolean(c[linha.field])).length}
                        </strong>
                      </div>
                    </div>

                    {/* Células mensais desta linha */}
                    {meses.map((mes) => {
                      const cellKey = `${linha.id}-${mes.key}`
                      const cellCards = getCardsForCell(linha.id, mes)
                      const isDragOver = dragOverCell === cellKey
                      const totalValorCelula = getLinhaSomaMes(linha.id, mes)

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
                            'flex-1 min-w-[190px] p-1.5 border-r border-border flex flex-col transition-all cursor-default',
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
                          {/* Sub-cabeçalho da célula mensal (apenas se houver cards) */}
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

                          {/* Lista de cards alocados no mês */}
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
              },
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
