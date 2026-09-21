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
