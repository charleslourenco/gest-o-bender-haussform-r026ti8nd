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

// Rótulo de semana com ano, ex.: "S40/2026" (erro 4.1)
export function semanaLabelComAno(week: IsoWeekRange): string {
  return `S${String(week.weekNumber).padStart(2, '0')}/${week.year}`
}

// 'yyyy-MM-dd' da segunda-feira da semana (data local, sem fuso)
export function inicioSemanaStr(week: IsoWeekRange): string {
  const d = week.startDate
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
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
 * Retorna os dados da semana ISO atual (hoje).
 */
export function getCurrentIsoWeek(): {
  weekNumber: number
  year: number
  label: string
  key: string
} {
  const now = new Date()
  const { weekNumber, year } = getIsoWeekAndYear(now)
  const pad = weekNumber < 10 ? `0${weekNumber}` : `${weekNumber}`
  return {
    weekNumber,
    year,
    label: `S${weekNumber}`,
    key: `${year}-W${pad}`,
  }
}

/**
 * Extrai o número da semana (1 a 53) de valores como 'S38', '2026-W38', 'S38/2026', '38'.
 */
export function parseWeekNumber(cardWeekValue: string | null | undefined): number | null {
  if (!cardWeekValue) return null
  const clean = cardWeekValue.trim().toUpperCase()
  const m = clean.match(/^[SW]?(\d{1,2})$/)
  if (m) return parseInt(m[1], 10)
  const m2 = clean.match(/^[SW]?(\d{1,2})[/\-_ ]+(\d{4})$/)
  if (m2) return parseInt(m2[1], 10)
  const m3 = clean.match(/^(\d{4})[-_\s]?[SW](\d{1,2})$/)
  if (m3) return parseInt(m3[2], 10)
  const m4 = clean.match(/[SW](\d{1,2})\b/)
  if (m4) return parseInt(m4[1], 10)
  return null
}

/**
 * Informações do badge de programação de semana para os módulos operacionais (Spec Etapa 4):
 * - "🟢 PROGRAMADO: S38 (Esta Semana)" para a semana ISO atual
 * - "⚪ PROGRAMADO: S40 (Futuro)" para semanas seguintes
 * - null se semana_planejada_producao não estiver preenchida
 */
export function getBadgeProgramacaoSemana(
  cardWeekValue: string | null | undefined,
): { label: string; isCurrent: boolean; weekNum: number } | null {
  const weekNum = parseWeekNumber(cardWeekValue)
  if (weekNum === null) return null

  const current = getCurrentIsoWeek()
  const isCurrent = weekNum === current.weekNumber
  const label = isCurrent
    ? `🟢 PROGRAMADO: S${weekNum} (Esta Semana)`
    : `⚪ PROGRAMADO: S${weekNum} (Futuro)`

  return { label, isCurrent, weekNum }
}

/**
 * Status de conclusão da Análise Técnica:
 * Na análise técnica o card transita por: iniciar -> aguardando_liberacao -> medida_fina ->
 * reuniao_analise -> caderno_tecnico -> alteracao_projeto -> lista_materiais -> aguardando_plano_corte.
 * 'aguardando_plano_corte' representa 100% (concluído / pronto para corte).
 */
export function isAnaliseTecnicaConcluida(statusAnalise?: string | null): boolean {
  if (!statusAnalise) return false
  const s = statusAnalise.trim().toLowerCase()
  // Se for aguardando_plano_corte ou qualquer status avançado de produção/montagem ou concluido
  const statusAvancados = new Set([
    'aguardando_plano_corte',
    'concluido',
    'router',
    'coladeira',
    'bancada',
    'embalagem',
    'aguardando_agenda',
    'montagem',
  ])
  return statusAvancados.has(s)
}

/**
 * Avalia o Portão de Prontidão para a tela de Produção (Spec Etapa 4):
 * Se a semana de produção chegou (semana_planejada_producao <= semana atual):
 * - se a Análise Técnica estiver pendente (medição/caderno/não concluído): 'bloqueado'
 * - se a Análise Técnica estiver concluída (100%): 'liberado'
 * Se a semana ainda não chegou ou não foi agendada: 'normal' (sem bloqueio de portão de semana atual)
 */
export function avaliarPortaoProntidaoProducao(
  semanaPlanejada: string | null | undefined,
  statusAnalise: string | null | undefined,
): 'bloqueado' | 'liberado' | 'normal' {
  const weekNum = parseWeekNumber(semanaPlanejada)
  if (weekNum === null) return 'normal'

  const current = getCurrentIsoWeek()
  // A semana de produção chegou se weekNum <= semana atual
  const chegouSemana = weekNum <= current.weekNumber
  if (!chegouSemana) return 'normal'

  const analiseConcluida = isAnaliseTecnicaConcluida(statusAnalise)
  if (analiseConcluida) {
    return 'liberado'
  }
  return 'bloqueado'
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
/**
 * Retorna todas as 52/53 semanas ISO de um ano completo.
 */
export function getIsoWeeksForYear(year: number): IsoWeekRange[] {
  return getAllIsoWeeksForYear(year)
}

export function getAllIsoWeeksForYear(year: number): IsoWeekRange[] {
  const weeks: IsoWeekRange[] = []
  // 4 de janeiro sempre cai na semana ISO 1
  const firstThursday = new Date(Date.UTC(year, 0, 4))
  const { weekNumber: firstWeek } = getIsoWeekAndYear(firstThursday)

  // Vamos de 1 até 52 ou 53
  for (let w = 1; w <= 53; w++) {
    const monday = getStartDateOfIsoWeek(w, year)
    const { weekNumber: actualWeek, year: actualYear } = getIsoWeekAndYear(monday)
    // Se avançou de ano, encerra
    if (actualYear !== year && w > 50) {
      break
    }
    const friday = new Date(monday)
    friday.setDate(monday.getDate() + 4)

    weeks.push({
      key: `${year}-W${pad2(w)}`,
      label: `S${pad2(w)}`,
      weekNumber: w,
      year,
      startDate: monday,
      endDate: friday,
      formattedRange: formatRangeSegundaSexta(monday),
    })

    // Se a próxima semana (w+1) já for do próximo ano
    const nextMonday = new Date(monday)
    nextMonday.setDate(monday.getDate() + 7)
    const { year: nextYear } = getIsoWeekAndYear(nextMonday)
    if (nextYear > year) {
      break
    }
  }

  return weeks
}

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
 * Normaliza uma chave de semana para comparação flexível e tolerante a formatos.
 * Aceita 'S37', 's37', 'W37', '37', 'S37/2025', 'S37 2025', '37/2025', '2026-W37' e variações com ano.
 * Regras:
 * - Extrai o número da semana via regex (\d{1,2}) e compara com week.weekNumber.
 * - Nos casos com ano informado (ex: 'S37/2025', '2026-W37', 'S37-2025', '37/25'):
 *   só casa se o ano também conferir com week.year.
 * - Quando gravado sem ano, casa com a semana exibida pelo weekNumber.
 */
export function matchWeek(
  cardWeekValue: string | null | undefined,
  week: IsoWeekRange,
  inicio?: string | null,
): boolean {
  if (inicio && typeof inicio === 'string') {
    return inicio.slice(0, 10) === inicioSemanaStr(week)
  }

  if (!cardWeekValue) return false
  const raw = cardWeekValue.trim()
  if (!raw) return false

  // 1. Verificações exatas rápidas
  if (raw === week.key) return true
  if (raw === week.label) return true

  const clean = raw.toUpperCase()

  // 2. Formato ISO padrão com ano: YYYY-Www ou YYYY-Sww (ex: 2026-W37, 2026-S37, 2026W37)
  const isoYearFirstMatch = clean.match(/^(\d{4})[-_\s]?[SW](\d{1,2})$/)
  if (isoYearFirstMatch) {
    const yearParsed = parseInt(isoYearFirstMatch[1], 10)
    const weekParsed = parseInt(isoYearFirstMatch[2], 10)
    return weekParsed === week.weekNumber && yearParsed === week.year
  }

  // 3. Formato semana seguido de ano: [SW]?37[/ -_]2025 ou [SW]?37[/ -_]25 (ex: S37/2025, S37 2025, 37/2025, W37-2025, S37-25)
  const weekYearMatch = clean.match(/^[SW]?(\d{1,2})[/\-_ ]+(\d{4})$/)
  if (weekYearMatch) {
    const weekParsed = parseInt(weekYearMatch[1], 10)
    const yearParsed = parseInt(weekYearMatch[2], 10)
    return weekParsed === week.weekNumber && yearParsed === week.year
  }

  // 4. Formato sem ano: S37, s37, W37, w37, 37, SEMANA 37
  // Extrai número da semana
  const pureWeekMatch = clean.match(/^[SW]?(\d{1,2})$/)
  if (pureWeekMatch) {
    const weekParsed = parseInt(pureWeekMatch[1], 10)
    return weekParsed === week.weekNumber
  }

  // 5. Fallback tolerante geral com regex:
  // Se houver ano (4 dígitos como 202x) em qualquer parte do texto:
  const yearMatch = clean.match(/\b(20\d{2})\b/)
  let cleanWithoutYear = clean
  if (yearMatch) {
    const yearParsed = parseInt(yearMatch[1], 10)
    if (yearParsed !== week.year) {
      return false
    }
    // Remove o ano para não confundir o número da semana com dígitos do ano
    cleanWithoutYear = clean.replace(yearMatch[0], '')
  }

  // Extrai o número da semana: procura explicitamente por S ou W seguido de número, ou número isolado
  const prefixMatch = cleanWithoutYear.match(/[SW]\s*(\d{1,2})\b/)
  if (prefixMatch) {
    const weekParsed = parseInt(prefixMatch[1], 10)
    return weekParsed === week.weekNumber
  }

  const pureDigitsMatch = cleanWithoutYear.match(/\b(\d{1,2})\b/)
  if (pureDigitsMatch) {
    const weekParsed = parseInt(pureDigitsMatch[1], 10)
    return weekParsed === week.weekNumber
  }

  // Fallback geral com extração de 1 ou 2 dígitos via regex
  const generalDigitMatch = cleanWithoutYear.match(/(\d{1,2})/)
  if (generalDigitMatch) {
    const weekParsed = parseInt(generalDigitMatch[1], 10)
    return weekParsed === week.weekNumber
  }

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

  // Regra sem dupla contagem:
  // Quando um card pai possui filhos com valor_total > 0 no período/célula,
  // soma APENAS os filhos (o pai é só contêiner);
  // pai sem filhos valorados soma o próprio valor.

  // 1. Identificar quais pais possuem filhos com valor > 0 para cada dimensão
  const paisComFilhosValoradosDiario = new Map<string, Set<string>>() // date -> Set<parentId>
  const paisComFilhosValoradosSemanal = new Map<string, Set<string>>() // semLabel -> Set<parentId>
  const paisComFilhosValoradosMensal = new Map<string, Set<string>>() // mesKey -> Set<parentId>

  for (const c of cards as any[]) {
    const val = Number(c.valor_total) || 0
    if (val <= 0 || !c.card_pai_id) continue

    const dt = c[dataField]
    if (dt && typeof dt === 'string') {
      const cleanDt = dt.slice(0, 10)
      if (!paisComFilhosValoradosDiario.has(cleanDt)) {
        paisComFilhosValoradosDiario.set(cleanDt, new Set())
      }
      paisComFilhosValoradosDiario.get(cleanDt)!.add(c.card_pai_id)
    }

    const sem = c[semanaField]
    if (sem && typeof sem === 'string') {
      const cleanSem = sem.trim()
      if (!paisComFilhosValoradosSemanal.has(cleanSem)) {
        paisComFilhosValoradosSemanal.set(cleanSem, new Set())
      }
      paisComFilhosValoradosSemanal.get(cleanSem)!.add(c.card_pai_id)
    }

    const mes = c[mesField]
    if (mes && typeof mes === 'string') {
      const cleanMes = mes.trim()
      if (!paisComFilhosValoradosMensal.has(cleanMes)) {
        paisComFilhosValoradosMensal.set(cleanMes, new Set())
      }
      paisComFilhosValoradosMensal.get(cleanMes)!.add(c.card_pai_id)
    }
  }

  for (const c of cards as any[]) {
    const val = Number(c.valor_total) || 0
    if (val <= 0) continue

    const isParent = !c.card_pai_id

    // 1. Nível Diário
    const dt = c[dataField]
    if (dt && typeof dt === 'string') {
      const cleanDt = dt.slice(0, 10)
      const paiTemFilhosValorados = isParent && paisComFilhosValoradosDiario.get(cleanDt)?.has(c.id)
      if (!paiTemFilhosValorados) {
        totalDiarioPorData[cleanDt] = (totalDiarioPorData[cleanDt] || 0) + val
      }
    }

    // 2. Nível Semanal
    const sem = c[semanaField]
    if (sem && typeof sem === 'string') {
      const cleanSem = sem.trim()
      const paiTemFilhosValorados =
        isParent && paisComFilhosValoradosSemanal.get(cleanSem)?.has(c.id)
      if (!paiTemFilhosValorados) {
        totalSemanalPorLabel[cleanSem] = (totalSemanalPorLabel[cleanSem] || 0) + val
        if (cleanSem.startsWith('S') || cleanSem.startsWith('s')) {
          const num = cleanSem.slice(1).padStart(2, '0')
          totalSemanalPorLabel[`S${parseInt(num, 10)}`] =
            (totalSemanalPorLabel[`S${parseInt(num, 10)}`] || 0) + val
        }
      }
    }

    // 3. Nível Mensal
    const mes = c[mesField]
    if (mes && typeof mes === 'string') {
      const cleanMes = mes.trim()
      const paiTemFilhosValorados =
        isParent && paisComFilhosValoradosMensal.get(cleanMes)?.has(c.id)
      if (!paiTemFilhosValorados) {
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
/**
 * Soma o valor total de cards atribuídos a um mês específico (YYYY-MM),
 * considerando tanto os cards com mes_planejado_producao igual ao mês
 * QUANTO cards cuja semana_planejada_producao pertença às semanas do mês.
 * Garante que cada card seja somado no máximo UMA vez no mês (sem duplicar).
 */
export function somarCargaProducaoMes(
  cards: {
    id: string
    card_pai_id?: string | null
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

  const cardsNoMes = cards.filter((c: any) => {
    // 1. Vinculado a uma semana que toca este mês
    const matchSemana = weeksDoMes.some((w) =>
      matchWeek(c.semana_planejada_producao, w, c.semana_producao_inicio),
    )
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

  // Regra sem dupla contagem:
  // quando um card pai possui filhos com valor_total > 0, a carga das células soma APENAS os filhos
  // (pai é só contêiner); pai sem filhos valorados soma o próprio valor.
  const parentIdsComFilhosValorados = new Set<string>()
  for (const c of cardsNoMes) {
    if (c.card_pai_id && (Number(c.valor_total) || 0) > 0) {
      parentIdsComFilhosValorados.add(c.card_pai_id)
    }
  }

  let total = 0
  for (const c of cardsNoMes) {
    const isParent = !c.card_pai_id
    // Se o pai tiver filhos valorados na seleção, o pai não soma seu próprio valor
    if (isParent && parentIdsComFilhosValorados.has(c.id)) {
      continue
    }
    total += Number(c.valor_total) || 0
  }

  return { total, count: cardsNoMes.length, cardsDoMes: cardsNoMes }
}

/**
 * Soma o valor total de carga de cards para todas as 3 linhas (Análise Técnica, Produção e Montagem)
 * em um determinado mês (YYYY-MM) e suas semanas ISO.
 * Garante que se um card estiver planejado em qualquer uma das 3 linhas naquele mês/semanas,
 * sua carga seja computada. Cada card individual é contado com seu valor_total (> 0).
 */
export function somarCargaTodasLinhasMes(
  cards: {
    id: string
    card_pai_id?: string | null
    valor_total?: number | null
    semana_planejada_analise?: string | null
    semana_planejada_producao?: string | null
    semana_planejada_montagem?: string | null
    mes_planejado_analise?: string | null
    mes_planejado_producao?: string | null
    mes_planejado_montagem?: string | null
  }[],
  year: number,
  monthIndex: number,
  weeksDoMes: IsoWeekRange[],
): {
  totalGeral: number
  totalAnalise: number
  totalProducao: number
  totalMontagem: number
  countGeral: number
  countAnalise: number
  countProducao: number
  countMontagem: number
} {
  const monthNum = String(monthIndex + 1).padStart(2, '0')
  const mesKey = `${year}-${monthNum}`

  const matchLinha = (
    semanaVal: string | null | undefined,
    mesVal: string | null | undefined,
    inicio?: string | null,
  ): boolean => {
    if (weeksDoMes.some((w) => matchWeek(semanaVal, w, inicio))) return true
    if (mesVal) {
      const clean = mesVal.trim()
      if (clean === mesKey) return true
      if (clean === monthNum) return true
      if (clean === String(monthIndex + 1)) return true
      if (clean.endsWith(`-${monthNum}`)) return true
    }
    return false
  }

  // Identificar pais cujos filhos possuem valor > 0 em cada linha
  const paisComFilhosValoradosAnalise = new Set<string>()
  const paisComFilhosValoradosProducao = new Set<string>()
  const paisComFilhosValoradosMontagem = new Set<string>()

  for (const c of cards as any[]) {
    const val = Number(c.valor_total) || 0
    if (c.card_pai_id && val > 0) {
      if (
        matchLinha(c.semana_planejada_analise, c.mes_planejado_analise, c.semana_analise_inicio)
      ) {
        paisComFilhosValoradosAnalise.add(c.card_pai_id)
      }
      if (
        matchLinha(c.semana_planejada_producao, c.mes_planejado_producao, c.semana_producao_inicio)
      ) {
        paisComFilhosValoradosProducao.add(c.card_pai_id)
      }
      if (
        matchLinha(c.semana_planejada_montagem, c.mes_planejado_montagem, c.semana_montagem_inicio)
      ) {
        paisComFilhosValoradosMontagem.add(c.card_pai_id)
      }
    }
  }

  let totalAnalise = 0
  let totalProducao = 0
  let totalMontagem = 0
  let countAnalise = 0
  let countProducao = 0
  let countMontagem = 0
  const uniqueCardsSet = new Set<string>()

  for (const c of cards as any[]) {
    const val = Number(c.valor_total) || 0
    const inAnalise = matchLinha(
      c.semana_planejada_analise,
      c.mes_planejado_analise,
      c.semana_analise_inicio,
    )
    const inProducao = matchLinha(
      c.semana_planejada_producao,
      c.mes_planejado_producao,
      c.semana_producao_inicio,
    )
    const inMontagem = matchLinha(
      c.semana_planejada_montagem,
      c.mes_planejado_montagem,
      c.semana_montagem_inicio,
    )

    const isParent = !c.card_pai_id

    if (inAnalise) {
      countAnalise++
      if (!(isParent && paisComFilhosValoradosAnalise.has(c.id))) {
        totalAnalise += val
      }
    }
    if (inProducao) {
      countProducao++
      if (!(isParent && paisComFilhosValoradosProducao.has(c.id))) {
        totalProducao += val
      }
    }
    if (inMontagem) {
      countMontagem++
      if (!(isParent && paisComFilhosValoradosMontagem.has(c.id))) {
        totalMontagem += val
      }
    }
    if (inAnalise || inProducao || inMontagem) {
      uniqueCardsSet.add(c.id)
    }
  }

  // totalGeral reflete a soma de todas as 3 linhas
  const totalGeral = totalAnalise + totalProducao + totalMontagem

  return {
    totalGeral,
    totalAnalise,
    totalProducao,
    totalMontagem,
    countGeral: uniqueCardsSet.size,
    countAnalise,
    countProducao,
    countMontagem,
  }
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
      badgeText: 'Livre',
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
      label: 'Nível ideal de ocupação (META FULL)',
      badgeText: 'META FULL',
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
      badgeText: 'Atenção',
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

/**
 * Representa um dia de trabalho da semana (Segunda a Sábado) para a Grade Industrial.
 */
export interface DiaSemanaIndustrial {
  /** Ex: '2026-09-08' */
  dateStr: string
  /** 0 = Seg, 1 = Ter, 2 = Qua, 3 = Qui, 4 = Sex, 5 = Sáb */
  dayIndex: number
  /** 'SEG' | 'TER' | 'QUA' | 'QUI' | 'SEX' | 'SÁB' */
  sigla: string
  /** 'Segunda' | 'Terça' ... */
  nomeCurto: string
  /** '08/09' */
  formattedDiaMes: string
  /** Data objeto Date */
  date: Date
}

const DIAS_SIGLAS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']
const DIAS_NOMES = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

/**
 * Retorna os 6 dias úteis industriais (Segunda a Sábado) de uma semana ISO.
 */
export function getDiasSemanaIndustrial(week: IsoWeekRange): DiaSemanaIndustrial[] {
  const dias: DiaSemanaIndustrial[] = []
  const monday = new Date(week.startDate)

  for (let i = 0; i < 6; i++) {
    const cur = new Date(monday)
    cur.setDate(monday.getDate() + i)

    const yyyy = cur.getFullYear()
    const mm = String(cur.getMonth() + 1).padStart(2, '0')
    const dd = String(cur.getDate()).padStart(2, '0')
    const dateStr = `${yyyy}-${mm}-${dd}`

    dias.push({
      dateStr,
      dayIndex: i,
      sigla: DIAS_SIGLAS[i],
      nomeCurto: DIAS_NOMES[i],
      formattedDiaMes: `${dd}/${mm}`,
      date: cur,
    })
  }

  return dias
}

/**
 * Calcula datas derivadas a partir de uma data ou semana planejada de produção:
 * - data_limite_analise: 2 semanas antes (-14 dias)
 * - data_obra_montagem: 4 semanas depois (+28 dias)
 */
export function calcularDatasDerivadasPcp(dataBase: string | Date): {
  dataLimiteAnalise: string
  dataObraMontagem: string
  semanaPlanejada: string
} {
  const base = typeof dataBase === 'string' ? new Date(`${dataBase}T12:00:00`) : new Date(dataBase)

  const limiteAnalise = new Date(base)
  limiteAnalise.setDate(base.getDate() - 14)

  const obraMontagem = new Date(base)
  obraMontagem.setDate(base.getDate() + 28)

  const { weekNumber, year } = getIsoWeekAndYear(base)
  const semanaPlanejada = `S${String(weekNumber).padStart(2, '0')}/${year}`

  const fmt = (d: Date) => {
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }

  return {
    dataLimiteAnalise: fmt(limiteAnalise),
    dataObraMontagem: fmt(obraMontagem),
    semanaPlanejada,
  }
}

/**
 * Calcula a soma em R$ dos cards de uma coluna diária ou semana ISO,
 * aplicando a regra anti-dupla-contagem:
 * se o card pai tiver filhos na seleção com valor_total > 0, soma apenas os filhos.
 * Pai sem filhos valorados na seleção soma o próprio valor.
 */
export function somarCardsComAntiDuplaContagem(
  cards: {
    id: string
    card_pai_id?: string | null
    valor_total?: number | null
  }[],
): number {
  if (!cards || cards.length === 0) return 0

  const paisComFilhosValorados = new Set<string>()
  for (const c of cards) {
    if (c.card_pai_id && (Number(c.valor_total) || 0) > 0) {
      paisComFilhosValorados.add(c.card_pai_id)
    }
  }

  let total = 0
  for (const c of cards) {
    const isParent = !c.card_pai_id
    if (isParent && paisComFilhosValorados.has(c.id)) {
      continue
    }
    total += Number(c.valor_total) || 0
  }
  return total
}
