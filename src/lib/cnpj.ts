export function maskCnpj(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14)
  if (digits.length === 0) return ''
  let masked = digits
  if (digits.length > 2) {
    masked = `${digits.slice(0, 2)}.${digits.slice(2)}`
  }
  if (digits.length > 5) {
    masked = `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`
  }
  if (digits.length > 8) {
    masked = `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`
  }
  if (digits.length > 12) {
    masked = `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`
  }
  return masked
}

export function sanitizeCnpj(value: string): string {
  return value.replace(/\D/g, '')
}

export function isValidCnpj(value: string): boolean {
  const cnpj = sanitizeCnpj(value)
  if (cnpj.length !== 14) return false
  if (/^(\d)\1{13}$/.test(cnpj)) return false

  const calcCheck = (base: string, weights: number[]): number => {
    let sum = 0
    for (let i = 0; i < weights.length; i++) {
      sum += parseInt(base[i], 10) * weights[i]
    }
    const rest = sum % 11
    return rest < 2 ? 0 : 11 - rest
  }

  const base = cnpj.slice(0, 12)
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const check1 = calcCheck(base, weights1)
  if (check1 !== parseInt(cnpj[12], 10)) return false

  const base2 = cnpj.slice(0, 13)
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const check2 = calcCheck(base2, weights2)
  return check2 === parseInt(cnpj[13], 10)
}
