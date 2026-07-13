import { maskCpf, sanitizeCpf, isValidCpf } from './cpf'
import { maskCnpj, sanitizeCnpj, isValidCnpj } from './cnpj'

export function maskCpfCnpj(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14)
  if (digits.length <= 11) {
    return maskCpf(digits)
  }
  return maskCnpj(digits)
}

export function sanitizeCpfCnpj(value: string): string {
  return value.replace(/\D/g, '')
}

export function detectTipoPessoa(value: string): 'PF' | 'PJ' | null {
  const digits = sanitizeCpfCnpj(value)
  if (digits.length === 11) return 'PF'
  if (digits.length === 14) return 'PJ'
  return null
}

export function isValidCpfCnpj(value: string): boolean {
  const digits = sanitizeCpfCnpj(value)
  if (digits.length === 11) return isValidCpf(digits)
  if (digits.length === 14) return isValidCnpj(digits)
  return false
}
