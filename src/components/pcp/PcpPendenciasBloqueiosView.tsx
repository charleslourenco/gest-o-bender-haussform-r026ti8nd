import React, { useMemo } from 'react'
import {
  AlertOctagon,
  AlertTriangle,
  Clock,
  Eye,
  TrendingUp,
  Truck,
  CheckCircle2,
  Calendar,
  Building2,
  Layers,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { PcpCardItem, getProntidaoTecnica } from '@/services/pcp-planejamento'
import {
  getCurrentIsoWeek,
  isAnaliseTecnicaConcluida,
  parseWeekNumber,
  formatBRL,
  getStartDateOfIsoWeek,
  getIsoWeekAndYear,
  matchWeek,
  inicioSemanaStr,
  semanaLabelComAno,
  IsoWeekRange,
} from '@/lib/pcp-capacity'
import { cn } from '@/lib/utils'

interface PcpPendenciasBloqueiosViewProps {
  cards: PcpCardItem[]
  onRefresh: () => void
  onOpenCardDrawer: (card: PcpCardItem) => void
}

interface AlertaTecnicoItem {
  card: PcpCardItem
  clienteNome: string
  produtoNome: string
  semana: string
  statusAnalise: string
  prontidaoLabel: string
  atrasado: boolean
}

interface AlertaSobrecargaItem {
  semanaLabel: string
  ano: number
  totalR$: number
  cardsCount: number
  cardsDaSemana: PcpCardItem[]
}

interface AlertaTerceirizadoItem {
  card: PcpCardItem
  clienteNome: string
  produtoNome: string
  semanaMontagem: string
  statusAnalise: string
}

export const PcpPendenciasBloqueiosView: React.FC<PcpPendenciasBloqueiosViewProps> = ({
  cards,
  onRefresh,
  onOpenCardDrawer,
}) => {
  const { currentWeekObj, nextWeekObj } = useMemo(() => {
    const cur = getCurrentIsoWeek()
    const startDateCur = getStartDateOfIsoWeek(cur.weekNumber, cur.year)
    const currentWeekRange: IsoWeekRange = {
      key: cur.key,
      label: cur.label,
      weekNumber: cur.weekNumber,
      year: cur.year,
      startDate: startDateCur,
      endDate: new Date(startDateCur.getTime() + 4 * 86400000),
      formattedRange: '',
    }

    const nextDate = new Date(startDateCur)
    nextDate.setDate(startDateCur.getDate() + 7)
    const nextIso = getIsoWeekAndYear(nextDate)
    const nextStartDate = getStartDateOfIsoWeek(nextIso.weekNumber, nextIso.year)
    const nextPad = nextIso.weekNumber < 10 ? `0${nextIso.weekNumber}` : `${nextIso.weekNumber}`
    const nextWeekRange: IsoWeekRange = {
      key: `${nextIso.year}-W${nextPad}`,
      label: `S${nextIso.weekNumber}`,
      weekNumber: nextIso.weekNumber,
      year: nextIso.year,
      startDate: nextStartDate,
      endDate: new Date(nextStartDate.getTime() + 4 * 86400000),
      formattedRange: '',
    }

    return {
      currentWeekObj: currentWeekRange,
      nextWeekObj: nextWeekRange,
    }
  }, [])

  // Helper para nome de cliente
  const getClientName = (card: PcpCardItem) =>
    card.cliente?.nome ||
    card.formulario?.cliente?.nome ||
    card.formulario?.nome_cliente ||
    'Cliente não informado'

  // =========================================================================
  // 🔴 ALERTA 1: PENDÊNCIA TÉCNICA
  // Cards agendados para a semana atual ou próxima com prontidão da Análise abaixo de 100%
  // =========================================================================
  const alerta1Cards: AlertaTecnicoItem[] = useMemo(() => {
    if (!cards || !Array.isArray(cards)) return []

    const result: AlertaTecnicoItem[] = []

    for (const c of cards) {
      if (!c || c.visivel_pcp === false) continue
      if (c.arquivado_producao || c.excluido_producao) continue

      const semProd = c.semana_planejada_producao
      if (!semProd) continue

      // O card entra se estiver ATRASADO, na semana atual ou na próxima:
      const inicio = c.semana_producao_inicio ? c.semana_producao_inicio.slice(0, 10) : null
      const isSemanaAlvo = inicio
        ? inicio <= inicioSemanaStr(nextWeekObj)
        : matchWeek(semProd, currentWeekObj, null) || matchWeek(semProd, nextWeekObj, null)
      if (!isSemanaAlvo) continue

      // Prontidão da Análise abaixo de 100%
      const concluida = isAnaliseTecnicaConcluida(c.status_analise)
      if (!concluida) {
        const prontInfo = getProntidaoTecnica(c)
        const atrasado = !!inicio && inicio < inicioSemanaStr(currentWeekObj)
        result.push({
          card: c,
          clienteNome: getClientName(c),
          produtoNome: c.nome_produto || 'Item sem nome',
          semana: semProd,
          statusAnalise: c.status_analise || 'iniciar',
          prontidaoLabel: prontInfo.label,
          atrasado,
        })
      }
    }

    // Ordenar por semana_producao_inicio crescente (string 'yyyy-MM-dd'; sem a coluna, vai para o fim)
    result.sort((a, b) => {
      const iniA = a.card.semana_producao_inicio ? a.card.semana_producao_inicio.slice(0, 10) : null
      const iniB = b.card.semana_producao_inicio ? b.card.semana_producao_inicio.slice(0, 10) : null
      if (iniA && iniB) return iniA.localeCompare(iniB)
      if (iniA && !iniB) return -1
      if (!iniA && iniB) return 1
      return 0
    })

    return result
  }, [cards, currentWeekObj, nextWeekObj])

  // =========================================================================
  // 🟡 ALERTA 2: SOBRECARGA DE CAPACIDADE
  // Semanas ISO com soma acima de R$ 400.000 (usando regra anti-dupla-contagem)
  // =========================================================================
  const alerta2Semanas: AlertaSobrecargaItem[] = useMemo(() => {
    if (!cards || !Array.isArray(cards)) return []

    // Agrupar cards por semana de produção
    const cardsPorSemana = new Map<string, PcpCardItem[]>()
    for (const c of cards) {
      if (!c || c.visivel_pcp === false) continue
      if (c.arquivado_producao || c.excluido_producao) continue
      const sem = c.semana_planejada_producao
      if (!sem || !sem.trim()) continue

      const cleanSem = sem.trim().toUpperCase()
      if (!cardsPorSemana.has(cleanSem)) {
        cardsPorSemana.set(cleanSem, [])
      }
      cardsPorSemana.get(cleanSem)!.push(c)
    }

    const sobrecarregadas: AlertaSobrecargaItem[] = []

    for (const [semanaLabel, cardsSemana] of cardsPorSemana.entries()) {
      // Regra anti-dupla-contagem:
      // se pai tem filhos com valor > 0, soma apenas os filhos valorados
      const paisComFilhosValorados = new Set<string>()
      for (const c of cardsSemana) {
        if (c.card_pai_id && (Number(c.valor_total) || 0) > 0) {
          paisComFilhosValorados.add(c.card_pai_id)
        }
      }

      let totalSemana = 0
      for (const c of cardsSemana) {
        const isParent = !c.card_pai_id
        if (isParent && paisComFilhosValorados.has(c.id)) {
          continue
        }
        totalSemana += Number(c.valor_total) || 0
      }

      if (totalSemana > 400000) {
        const weekNum = parseWeekNumber(semanaLabel) || 0
        const currentYear = new Date().getFullYear()
        sobrecarregadas.push({
          semanaLabel,
          ano: currentYear,
          totalR$: totalSemana,
          cardsCount: cardsSemana.length,
          cardsDaSemana: cardsSemana,
        })
      }
    }

    // Ordenar por valor decrescente
    sobrecarregadas.sort((a, b) => b.totalR$ - a.totalR$)
    return sobrecarregadas
  }, [cards])

  // =========================================================================
  // 🔵 ALERTA 3: TERCEIRIZADOS ATRASADOS
  // Subcards com is_outsourced = true ou status_analise = 'item_terceirizado'
  // cuja semana_planejada_montagem já passou (weekNum < currentWeek)
  // =========================================================================
  const alerta3Terceirizados: AlertaTerceirizadoItem[] = useMemo(() => {
    if (!cards || !Array.isArray(cards)) return []

    const result: AlertaTerceirizadoItem[] = []

    for (const c of cards) {
      if (!c) continue
      const isOutsourced = Boolean(c.is_outsourced || c.status_analise === 'item_terceirizado')
      if (!isOutsourced) continue

      // Não contar se já estiver validado
      if (c.terceirizado_validado) continue

      const semMontagem = c.semana_planejada_montagem
      if (!semMontagem || !semMontagem.trim()) continue

      // A semana de montagem já passou (atrasado)
      let isAtrasado = false
      if (c.semana_montagem_inicio) {
        isAtrasado = c.semana_montagem_inicio < inicioSemanaStr(currentWeekObj)
      } else {
        const weekNum = parseWeekNumber(semMontagem)
        if (weekNum !== null && weekNum < currentWeekObj.weekNumber) {
          isAtrasado = true
        }
      }

      if (isAtrasado) {
        result.push({
          card: c,
          clienteNome: getClientName(c),
          produtoNome: c.nome_produto || 'Item Terceirizado',
          semanaMontagem: semMontagem,
          statusAnalise: c.status_analise || 'item_terceirizado',
        })
      }
    }

    // Ordenar pela semana mais antiga
    result.sort((a, b) => {
      const wA = parseWeekNumber(a.semanaMontagem) || 0
      const wB = parseWeekNumber(b.semanaMontagem) || 0
      return wA - wB
    })

    return result
  }, [cards, currentWeekObj])

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* Topo / Barra de Resumo */}
      <div className="px-6 py-3 bg-card border-b border-border flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 border border-amber-500/20">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground leading-none">
              Painel de Pendências & Bloqueios Operacionais
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Monitoramento preventivo de portões de prontidão, sobrecargas fabris e terceirizados
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="text-xs px-2.5 py-1 bg-muted/40 border-border font-semibold"
          >
            Semana Atual:{' '}
            <span className="text-primary font-bold ml-1 font-mono">
              {semanaLabelComAno(currentWeekObj)}
            </span>
          </Badge>

          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            title="Atualizar dados"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Conteúdo: Grade com 3 Cards de Alerta */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-muted/15">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* =============================================================== */}
          {/* 🔴 CARD ALERTA 1: PENDÊNCIA TÉCNICA */}
          {/* =============================================================== */}
          <Card className="border-rose-300 dark:border-rose-900 shadow-sm flex flex-col h-full bg-card">
            <CardHeader className="bg-rose-500/10 border-b border-rose-200 dark:border-rose-900/60 pb-3 pt-4 px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-rose-500 text-white flex items-center justify-center shadow-2xs">
                    <AlertOctagon className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold text-rose-900 dark:text-rose-200">
                      🔴 ALERTA 1: Pendência Técnica
                    </CardTitle>
                    <p className="text-[11px] text-rose-700/80 dark:text-rose-300/80">
                      Atrasados, semana atual ({semanaLabelComAno(currentWeekObj)}) ou próxima (
                      {semanaLabelComAno(nextWeekObj)}) com análise &lt; 100%
                    </p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-xs font-bold px-2 py-0.5',
                    alerta1Cards.length > 0
                      ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300',
                  )}
                >
                  {alerta1Cards.length} {alerta1Cards.length === 1 ? 'item' : 'itens'}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-3 flex-1 flex flex-col overflow-hidden min-h-[300px]">
              {alerta1Cards.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
                  <p className="text-xs font-semibold text-foreground">
                    Nenhuma pendência técnica crítica
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Nenhum card atrasado ou das semanas {semanaLabelComAno(currentWeekObj)} e{' '}
                    {semanaLabelComAno(nextWeekObj)} com análise análise pendente.
                  </p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[560px]">
                  {alerta1Cards.map((item) => (
                    <div
                      key={item.card.id}
                      className="p-2.5 rounded-lg border border-border/80 bg-background hover:border-rose-400 hover:shadow-2xs transition-all flex flex-col gap-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-xs text-foreground block truncate">
                            {item.clienteNome}
                          </span>
                          <span className="text-[11px] text-muted-foreground truncate block">
                            {item.produtoNome}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {item.atrasado && (
                            <span className="bg-rose-600 text-white text-[10px] px-1.5 rounded font-bold">
                              ATRASADO
                            </span>
                          )}
                          <Badge
                            variant="secondary"
                            className="font-mono text-[10px] font-bold px-1.5 py-0 bg-primary/10 text-primary border border-primary/20 shrink-0"
                          >
                            {item.semana}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/50 text-[11px]">
                        <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {item.prontidaoLabel}
                        </span>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onOpenCardDrawer(item.card)}
                          className="h-6 px-2 text-[10px] gap-1 hover:bg-primary/10 hover:text-primary border-border"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Ver Projeto</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* =============================================================== */}
          {/* 🟡 CARD ALERTA 2: SOBRECARGA DE CAPACIDADE */}
          {/* =============================================================== */}
          <Card className="border-amber-300 dark:border-amber-900 shadow-sm flex flex-col h-full bg-card">
            <CardHeader className="bg-amber-500/10 border-b border-amber-200 dark:border-amber-900/60 pb-3 pt-4 px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-amber-500 text-white flex items-center justify-center shadow-2xs">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold text-amber-900 dark:text-amber-200">
                      🟡 ALERTA 2: Sobrecarga Fabril
                    </CardTitle>
                    <p className="text-[11px] text-amber-700/80 dark:text-amber-300/80">
                      Semanas ISO com carga financeira acima de R$ 400.000
                    </p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-xs font-bold px-2 py-0.5',
                    alerta2Semanas.length > 0
                      ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300',
                  )}
                >
                  {alerta2Semanas.length} {alerta2Semanas.length === 1 ? 'semana' : 'semanas'}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-3 flex-1 flex flex-col overflow-hidden min-h-[300px]">
              {alerta2Semanas.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
                  <p className="text-xs font-semibold text-foreground">
                    Capacidade fabril equilibrada
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Nenhuma semana excede o teto de sobrecarga de R$ 400.000.
                  </p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[560px]">
                  {alerta2Semanas.map((sem) => (
                    <div
                      key={sem.semanaLabel}
                      className="p-3 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-background flex flex-col gap-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge className="font-mono text-xs font-bold px-2 py-0.5 bg-amber-500 text-white">
                            {sem.semanaLabel}
                          </Badge>
                          <span className="text-xs font-bold text-foreground">
                            {sem.cardsCount} projeto(s)
                          </span>
                        </div>
                        <span className="text-xs font-extrabold text-amber-700 dark:text-amber-400">
                          {formatBRL(sem.totalR$)}
                        </span>
                      </div>

                      {/* Lista resumida de cards da semana sobrecarregada */}
                      <div className="space-y-1.5 pt-1 border-t border-border/40">
                        {sem.cardsDaSemana.slice(0, 3).map((card) => (
                          <div
                            key={card.id}
                            className="flex items-center justify-between text-[11px] bg-muted/40 p-1.5 rounded hover:bg-muted/70 transition-colors"
                          >
                            <span className="truncate max-w-[180px] font-medium text-foreground">
                              {getClientName(card)} - {card.nome_produto}
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onOpenCardDrawer(card)}
                              className="h-5 px-1.5 text-[10px] gap-1 text-primary hover:text-primary hover:bg-primary/10"
                            >
                              <Eye className="w-2.5 h-2.5" />
                              <span>Ver Projeto</span>
                            </Button>
                          </div>
                        ))}
                        {sem.cardsDaSemana.length > 3 && (
                          <p className="text-[10px] text-muted-foreground text-center italic">
                            + {sem.cardsDaSemana.length - 3} outro(s) item(ns)
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* =============================================================== */}
          {/* 🔵 CARD ALERTA 3: TERCEIRIZADOS ATRASADOS */}
          {/* =============================================================== */}
          <Card className="border-blue-300 dark:border-blue-900 shadow-sm flex flex-col h-full bg-card">
            <CardHeader className="bg-blue-500/10 border-b border-blue-200 dark:border-blue-900/60 pb-3 pt-4 px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-blue-500 text-white flex items-center justify-center shadow-2xs">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold text-blue-900 dark:text-blue-200">
                      🔵 ALERTA 3: Terceirizados Atrasados
                    </CardTitle>
                    <p className="text-[11px] text-blue-700/80 dark:text-blue-300/80">
                      Itens terceirizados cuja semana de montagem já passou
                    </p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-xs font-bold px-2 py-0.5',
                    alerta3Terceirizados.length > 0
                      ? 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300',
                  )}
                >
                  {alerta3Terceirizados.length}{' '}
                  {alerta3Terceirizados.length === 1 ? 'item' : 'itens'}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-3 flex-1 flex flex-col overflow-hidden min-h-[300px]">
              {alerta3Terceirizados.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
                  <p className="text-xs font-semibold text-foreground">
                    Sem atrasos em terceirizados
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Nenhum item terceirizado com montagem vencida detectado.
                  </p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[560px]">
                  {alerta3Terceirizados.map((item) => (
                    <div
                      key={item.card.id}
                      className="p-2.5 rounded-lg border border-border/80 bg-background hover:border-blue-400 hover:shadow-2xs transition-all flex flex-col gap-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-xs text-foreground block truncate">
                            {item.clienteNome}
                          </span>
                          <span className="text-[11px] text-muted-foreground truncate block">
                            {item.produtoNome}
                          </span>
                        </div>
                        <Badge
                          variant="secondary"
                          className="font-mono text-[10px] font-bold px-1.5 py-0 bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-300 shrink-0"
                        >
                          Montagem: {item.semanaMontagem}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/50 text-[11px]">
                        <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Montagem vencida (não validado)
                        </span>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onOpenCardDrawer(item.card)}
                          className="h-6 px-2 text-[10px] gap-1 hover:bg-primary/10 hover:text-primary border-border"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Ver Projeto</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
