/**
 * Utilitários para cálculo de Semanas ISO e capacidade fabril do Módulo PCP
 */

export interface IsoWeekRange {
  /** Ex: "2026-W40" para persistência sem ambiguidade */
  key: string
  /** Ex: "S40" */
  label: string
  /** Número da semana ISO (ex: 40) */
  weekNumber: number
  /** Ano ISO correspondente (ex: 2026) */
  year: number
  /** Segunda-feira inicial */
  startDate: Date
  /** Sexta-feira ou domingo final (padrão de trabalho: seg a sex) */
  endDate: Date
  /** Ex: "05/10 a 09/10" */
  formattedRange: string
}

/**
 * Obtém número da semana ISO (1 a 53) e ano ISO para uma data.
 */
export function getIsoWeekAndYear(date: Date): { weekNumber: number; year: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  // Quinta-feira na semana atual determina o ano ISO
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const year = d.getUTCFullYear()
  const yearStart = new Date(Date.UTC(year, 0, 1))
  const weekNumber = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return { weekNumber, year }
}

/**
 * Retorna a segunda-feira de uma semana ISO dado ano e semana.
 */
export function getStartDateOfIsoWeek(week: number, year: number): Date {
  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7))
  const dayOfWeek = simple.getUTCDay()
  const isoWeekStart = simple
  if (dayOfWeek <= 4) {
    isoWeekStart.setUTCDate(simple.getUTCDate() - simple.getUTCDay() + 1)
  } else {
    isoWeekStart.setUTCDate(simple.getUTCDate() + 8 - simple.getUTCDay())
  }
  return new Date(
    isoWeekStart.getUTCFullYear(),
    isoWeekStart.getUTCMonth(),
    isoWeekStart.getUTCDate(),
  )
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

/**
 * Formata intervalo de data para "DD/MM a DD/MM" (Seg a Sex do expediente operacional).
 */
export function formatRangeSegundaSexta(start: Date): string {
  const friday = new Date(start)
  friday.setDate(start.getDate() + 4)
  const d1 = pad2(start.getDate())
  const m1 = pad2(start.getMonth() + 1)
  const d2 = pad2(friday.getDate())
  const m2 = pad2(friday.getMonth() + 1)
  return `${d1}/${m1} a ${d2}/${m2}`
}

/**
 * Gera as semanas ISO que tocam o mês selecionado (ano + mês 0-11).
 * Ex.: S40 [05/10 a 09/10], S41 [12/10 a 16/10], S42 [19/10 a 23/10], S43 [26/10 a 30/10]
 */
export function getIsoWeeksForMonth(year: number, monthIndex: number): IsoWeekRange[] {
  // Primeiro dia do mês
  const firstDay = new Date(year, monthIndex, 1)
  // Último dia do mês
  const lastDay = new Date(year, monthIndex + 1, 0)

  const weeks: IsoWeekRange[] = []
  const seen = new Set<string>()

  // Iterar dia a dia pelo mês
  const cur = new Date(firstDay)
  while (cur <= lastDay) {
    const { weekNumber, year: isoYear } = getIsoWeekAndYear(cur)
    const key = `${isoYear}-W${pad2(weekNumber)}`

    if (!seen.has(key)) {
      seen.add(key)
      const startDate = getStartDateOfIsoWeek(weekNumber, isoYear)
      const friday = new Date(startDate)
      friday.setDate(startDate.getDate() + 4)

      weeks.push({
        key,
        label: `S${weekNumber}`,
        weekNumber,
        year: isoYear,
        startDate,
        endDate: friday,
        formattedRange: formatRangeSegundaSexta(startDate),
      })
    }

    cur.setDate(cur.getDate() + 1)
  }

  // Ordenar por data inicial
  weeks.sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
  return weeks
}

/**
 * Normaliza uma chave de semana para comparação flexível.
 * Aceita "2026-W40", "S40", "W40", "40" e compara com as semanas ativas.
 */
export function matchWeek(cardWeekValue: string | null | undefined, week: IsoWeekRange): boolean {
  if (!cardWeekValue) return false
  const clean = cardWeekValue.trim()
  if (clean === week.key) return true
  if (clean === week.label) return true
  if (clean.toLowerCase() === `s${week.weekNumber}`.toLowerCase()) return true
  if (clean.toLowerCase() === `w${week.weekNumber}`.toLowerCase()) return true
  if (clean === String(week.weekNumber)) return true
  return false
}

/**
 * Regras de Capacidade Financeira (FAIXA DE PRODUÇÃO):
 * - AZUL: Até R$ 299.999,99 (Capacidade disponível para puxar mais projetos)
 * - VERDE (META FULL): R$ 300.000,00 a R$ 350.000,00 (Nível ideal de ocupação)
 * - AMARELO: R$ 350.001,00 a R$ 399.999,99 (Atenção / Limite próximo)
 * - VERMELHO: A partir de R$ 400.000,00 (Sobrecarga / Risco de atraso)
 */
export type CapacidadeStatus = 'azul' | 'verde' | 'amarelo' | 'vermelho'

export interface CapacidadeInfo {
  status: CapacidadeStatus
  total: number
  formattedTotal: string
  label: string
  badgeText: string
  bgClass: string
  borderClass: string
  textClass: string
  badgeClass: string
  progressPct: number // % em relação a 350k (100% = meta full)
}

export function formatBRL(val: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val)
}

export function formatCompactBRL(val: number): string {
  if (val >= 1000000) {
    return `R$ ${(val / 1000000).toFixed(1)}M`
  }
  if (val >= 1000) {
    return `R$ ${(val / 1000).toFixed(0)}k`
  }
  return formatBRL(val)
}

/**
 * Avaliação da Capacidade Financeira Mensal (Visão Anual):
 * - Meta Mensal FULL (referência 4 semanas): R$ 1.200.000,00 a R$ 1.400.000,00
 * - AZUL: Até R$ 1.199.999,99 (Capacidade mensal livre para novos contratos)
 * - VERDE (META FULL MENSAL): R$ 1.200.000,00 a R$ 1.400.000,00 (Ocupação ideal do mês)
 * - AMARELO / VERMELHO: Acima de R$ 1.400.000,00 (Alerta de sobrecarga mensal)
 */
export function avaliarCapacidadeFinanceiraMensal(total: number): CapacidadeInfo {
  const formattedTotal = formatBRL(total)
  const metaMin = 1200000
  const metaMax = 1400000
  const progressPct = Math.min(100, Math.round((total / metaMax) * 100))

  if (total < metaMin) {
    return {
      status: 'azul',
      total,
      formattedTotal,
      label: 'Capacidade mensal livre para novos contratos',
      badgeText: 'Livre',
      bgClass: 'bg-blue-500/10 dark:bg-blue-950/30',
      borderClass: 'border-blue-300 dark:border-blue-700',
      textClass: 'text-blue-700 dark:text-blue-400',
      badgeClass:
        'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 border-blue-200 dark:border-blue-700',
      progressPct,
    }
  }

  if (total <= metaMax) {
    return {
      status: 'verde',
      total,
      formattedTotal,
      label: 'Ocupação ideal do mês (Meta Full Mensal)',
      badgeText: 'Meta Full (Ideal)',
      bgClass: 'bg-emerald-500/10 dark:bg-emerald-950/30',
      borderClass: 'border-emerald-300 dark:border-emerald-700',
      textClass: 'text-emerald-700 dark:text-emerald-400',
      badgeClass:
        'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700',
      progressPct: 100,
    }
  }

  // Acima de 1.4M - Alerta de sobrecarga mensal
  const isExtremo = total > 1600000
  return {
    status: isExtremo ? 'vermelho' : 'amarelo',
    total,
    formattedTotal,
    label: 'Alerta de sobrecarga mensal na produção',
    badgeText: isExtremo ? 'Sobrecarga Crítica' : 'Alerta Sobrecarga',
    bgClass: isExtremo
      ? 'bg-rose-500/15 dark:bg-rose-950/35'
      : 'bg-amber-500/15 dark:bg-amber-950/35',
    borderClass: isExtremo
      ? 'border-rose-400 dark:border-rose-700'
      : 'border-amber-400 dark:border-amber-700',
    textClass: isExtremo
      ? 'text-rose-700 dark:text-rose-400'
      : 'text-amber-700 dark:text-amber-400',
    badgeClass: isExtremo
      ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300 border-rose-200 dark:border-rose-700'
      : 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 border-amber-200 dark:border-amber-700',
    progressPct: 100,
  }
}

/**
 * Funções compartilhadas de agregação em cascata de valores do PCP.
 * Regra estrita: soma SEMPRE o valor_total do próprio card/subcard individual,
 * nunca multiplicando ou somando o valor do projeto pai.
 */

export interface TotaisPcpAgregados {
  totalDiarioPorData: Record<string, number>
  totalSemanalPorKey: Record<string, number>
  totalSemanalPorLabel: Record<string, number>
  totalMensalPorKey: Record<string, number>
  totalAnualPorAno: Record<number, number>
}

/**
 * Calcula a soma em cascata em todos os níveis (Diário, Semanal, Mensal, Anual)
 * para uma dada linha operacional (default: 'producao').
 * Os cálculos são derivados reativamente sobre a lista de cards (fonte única).
 */
export function calcularTotaisPcp(
  cards: {
    valor_total?: number | null
    data_planejada_producao?: string | null
    data_planejada_analise?: string | null
    data_planejada_montagem?: string | null
    semana_planejada_producao?: string | null
    semana_planejada_analise?: string | null
    semana_planejada_montagem?: string | null
    mes_planejado_producao?: string | null
    mes_planejado_analise?: string | null
    mes_planejado_montagem?: string | null
  }[],
  linha: 'producao' | 'analise' | 'montagem' = 'producao',
): TotaisPcpAgregados {
  const totalDiarioPorData: Record<string, number> = {}
  const totalSemanalPorKey: Record<string, number> = {}
  const totalSemanalPorLabel: Record<string, number> = {}
  const totalMensalPorKey: Record<string, number> = {}
  const totalAnualPorAno: Record<number, number> = {}

  const dataField =
    linha === 'analise'
      ? 'data_planejada_analise'
      : linha === 'montagem'
        ? 'data_planejada_montagem'
        : 'data_planejada_producao'

  const semanaField =
    linha === 'analise'
      ? 'semana_planejada_analise'
      : linha === 'montagem'
        ? 'semana_planejada_montagem'
        : 'semana_planejada_producao'

  const mesField =
    linha === 'analise'
      ? 'mes_planejado_analise'
      : linha === 'montagem'
        ? 'mes_planejado_montagem'
        : 'mes_planejado_producao'

  for (const c of cards) {
    const val = Number(c.valor_total) || 0
    if (val <= 0) continue

    // 1. Nível Diário
    const dt = c[dataField]
    if (dt && typeof dt === 'string') {
      const cleanDt = dt.slice(0, 10)
      totalDiarioPorData[cleanDt] = (totalDiarioPorData[cleanDt] || 0) + val
    }

    // 2. Nível Semanal
    const sem = c[semanaField]
    if (sem && typeof sem === 'string') {
      const cleanSem = sem.trim()
      totalSemanalPorLabel[cleanSem] = (totalSemanalPorLabel[cleanSem] || 0) + val
      if (cleanSem.startsWith('S') || cleanSem.startsWith('s')) {
        const num = cleanSem.slice(1).padStart(2, '0')
        totalSemanalPorLabel[`S${parseInt(num, 10)}`] =
          (totalSemanalPorLabel[`S${parseInt(num, 10)}`] || 0) + val
      }
    }

    // 3. Nível Mensal
    const mes = c[mesField]
    if (mes && typeof mes === 'string') {
      const cleanMes = mes.trim()
      totalMensalPorKey[cleanMes] = (totalMensalPorKey[cleanMes] || 0) + val

      // Extrair ano do mês "YYYY-MM"
      if (cleanMes.includes('-')) {
        const ano = parseInt(cleanMes.split('-')[0], 10)
        if (!isNaN(ano)) {
          totalAnualPorAno[ano] = (totalAnualPorAno[ano] || 0) + val
        }
      }
    }
  }

  return {
    totalDiarioPorData,
    totalSemanalPorKey,
    totalSemanalPorLabel,
    totalMensalPorKey,
    totalAnualPorAno,
  }
}

/**
 * Soma o valor total de cards atribuídos a um mês específico (YYYY-MM),
 * considerando tanto os cards com mes_planejado_producao igual ao mês
 * QUANTO cards cuja semana_planejada_producao pertença às semanas do mês.
 * Garante que cada card seja somado no máximo UMA vez no mês (sem duplicar).
 */
export function somarCargaProducaoMes(
  cards: {
    id: string
    valor_total?: number | null
    semana_planejada_producao?: string | null
    mes_planejado_producao?: string | null
  }[],
  year: number,
  monthIndex: number,
  weeksDoMes: IsoWeekRange[],
): { total: number; count: number; cardsDoMes: any[] } {
  const monthNum = String(monthIndex + 1).padStart(2, '0')
  const mesKey = `${year}-${monthNum}`

  const cardsNoMes = cards.filter((c) => {
    // 1. Vinculado a uma semana que toca este mês
    const matchSemana = weeksDoMes.some((w) => matchWeek(c.semana_planejada_producao, w))
    if (matchSemana) return true

    // 2. OU mes_planejado_producao é este mês (formato 'YYYY-MM', 'MM' ou 'M')
    if (c.mes_planejado_producao) {
      const clean = c.mes_planejado_producao.trim()
      if (clean === mesKey) return true
      if (clean === monthNum) return true
      if (clean === String(monthIndex + 1)) return true
      if (clean.endsWith(`-${monthNum}`)) return true
    }
    return false
  })

  const total = cardsNoMes.reduce((acc, c) => acc + (Number(c.valor_total) || 0), 0)
  return { total, count: cardsNoMes.length, cardsDoMes: cardsNoMes }
}

export function avaliarCapacidadeFinanceira(total: number): CapacidadeInfo {
  const formattedTotal = formatBRL(total)
  const metaMax = 350000
  const progressPct = Math.min(100, Math.round((total / metaMax) * 100))

  if (total < 300000) {
    return {
      status: 'azul',
      total,
      formattedTotal,
      label: 'Capacidade disponível para puxar mais projetos',
      badgeText: 'Disponível',
      bgClass: 'bg-blue-500/10 dark:bg-blue-950/30',
      borderClass: 'border-blue-300 dark:border-blue-700',
      textClass: 'text-blue-700 dark:text-blue-400',
      badgeClass:
        'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 border-blue-200 dark:border-blue-700',
      progressPct,
    }
  }

  if (total <= 350000) {
    return {
      status: 'verde',
      total,
      formattedTotal,
      label: 'Nível ideal de ocupação (Meta Full)',
      badgeText: 'Meta Full (Ideal)',
      bgClass: 'bg-emerald-500/10 dark:bg-emerald-950/30',
      borderClass: 'border-emerald-300 dark:border-emerald-700',
      textClass: 'text-emerald-700 dark:text-emerald-400',
      badgeClass:
        'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700',
      progressPct: 100,
    }
  }

  if (total < 400000) {
    return {
      status: 'amarelo',
      total,
      formattedTotal,
      label: 'Atenção / Limite próximo',
      badgeText: 'Atenção (Limite Próximo)',
      bgClass: 'bg-amber-500/10 dark:bg-amber-950/30',
      borderClass: 'border-amber-300 dark:border-amber-700',
      textClass: 'text-amber-700 dark:text-amber-400',
      badgeClass:
        'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 border-amber-200 dark:border-amber-700',
      progressPct: 100,
    }
  }

  return {
    status: 'vermelho',
    total,
    formattedTotal,
    label: 'Sobrecarga / Risco de atraso',
    badgeText: 'Sobrecarga',
    bgClass: 'bg-rose-500/15 dark:bg-rose-950/35',
    borderClass: 'border-rose-400 dark:border-rose-700',
    textClass: 'text-rose-700 dark:text-rose-400',
    badgeClass:
      'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300 border-rose-200 dark:border-rose-700',
    progressPct: 100,
  }
}
