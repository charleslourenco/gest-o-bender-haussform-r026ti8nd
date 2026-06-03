/* General utility functions (exposes cn) */
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merges multiple class names into a single string
 * @param inputs - Array of class names
 * @returns Merged class names
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return ''
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(numValue)) return ''
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(numValue)
}

export function applyCurrencyMask(value: string): string {
  const numericValue = value.replace(/\D/g, '')
  if (!numericValue) return ''
  const floatValue = parseInt(numericValue, 10) / 100
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(floatValue)
}

export function parseCurrency(value: string): number {
  const numericValue = value.replace(/\D/g, '')
  if (!numericValue) return 0
  return parseInt(numericValue, 10) / 100
}
