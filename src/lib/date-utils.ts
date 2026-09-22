/**
 * Utilitários seguros para parsing e formatação de datas
 * Protege contra valores nulos, strings inválidas, timestamps em ms, objetos corrompidos
 * e evita exceções do tipo Invalid Date, NaN ou RangeError.
 */
import { format as dateFnsFormat } from 'date-fns'
import { ptBR } from 'date-fns/locale'

/**
 * Converte qualquer entrada (string ISO, timestamp numérico em s ou ms, Date) para um Date válido.
 * Retorna null se for inválido, nulo ou vazio.
 */
export function parseSafeDate(val: unknown): Date | null {
  if (val === null || val === undefined || val === '') return null

  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val
  }

  // Se for número
  if (typeof val === 'number') {
    if (isNaN(val) || !isFinite(val)) return null
    // Se for em segundos (10 dígitos aprox), converter para ms
    const ms = val < 10000000000 ? val * 1000 : val
    const d = new Date(ms)
    return isNaN(d.getTime()) ? null : d
  }

  if (typeof val === 'string') {
    const trimmed = val.trim()
    if (!trimmed || trimmed === 'null' || trimmed === 'undefined' || trimmed === 'NaN') {
      return null
    }

    // Se for string puramente numérica (ex: timestamp vindo como string "1710500000000")
    if (/^\d+$/.test(trimmed)) {
      const num = parseInt(trimmed, 10)
      if (isNaN(num)) return null
      const ms = num < 10000000000 ? num * 1000 : num
      const d = new Date(ms)
      return isNaN(d.getTime()) ? null : d
    }

    const d = new Date(trimmed)
    return isNaN(d.getTime()) ? null : d
  }

  return null
}

/**
 * Retorna o timestamp em ms seguro a partir de um valor, ou fallback (padrão: Date.now()).
 */
export function getSafeTimestamp(val: unknown, fallback = Date.now()): number {
  const d = parseSafeDate(val)
  return d ? d.getTime() : fallback
}

/**
 * Formata com segurança uma data com date-fns. Retorna fallback ('-' por padrão) se inválida.
 */
export function formatSafeDate(
  val: unknown,
  formatStr: string,
  options?: { locale?: typeof ptBR; fallback?: string },
): string {
  const fallback = options?.fallback ?? '-'
  const d = parseSafeDate(val)
  if (!d) return fallback
  try {
    return dateFnsFormat(d, formatStr, { locale: options?.locale ?? ptBR })
  } catch {
    return fallback
  }
}

/**
 * Formata com segurança uma data no padrão Pt-Br (dd/MM/yyyy ou dd/MM se short=true).
 * Suporta string ISO, Date, número, nulo ou undefined sem lançar exceção.
 */
export function safeFormatDatePtBr(
  val: unknown,
  options?: { short?: boolean; fallback?: string },
): string {
  const fallback = options?.fallback ?? '-'
  if (val === null || val === undefined || val === '') return fallback

  if (typeof val === 'string') {
    const trimmed = val.trim()
    if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return fallback
    // Se for formato simples YYYY-MM-DD
    const isoMatch = trimmed.slice(0, 10).split('-')
    if (isoMatch.length === 3 && isoMatch[0].length === 4) {
      const [ano, mes, dia] = isoMatch
      return options?.short ? `${dia}/${mes}` : `${dia}/${mes}/${ano}`
    }
  }

  const d = parseSafeDate(val)
  if (!d) return fallback
  try {
    return dateFnsFormat(d, options?.short ? 'dd/MM' : 'dd/MM/yyyy', { locale: ptBR })
  } catch {
    return fallback
  }
}

/**
 * Calcula a diferença legível em dias, horas e minutos a partir de uma data base até o momento atual.
 */
export function formatElapsedTime(baseDate: unknown, fallback = '-'): string {
  const d = parseSafeDate(baseDate)
  if (!d) return fallback

  try {
    const diff = Math.max(0, Date.now() - d.getTime())
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
    const mins = Math.floor((diff / 1000 / 60) % 60)

    let str = ''
    if (days > 0) str += `${days}d `
    if (hours > 0 || days > 0) str += `${hours}h `
    str += `${mins}m`
    return str.trim() || '0m'
  } catch {
    return fallback
  }
}
