export function maskCpf(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  const parts: string[] = []
  if (digits.length > 0) parts.push(digits.slice(0, 3))
  if (digits.length > 3) parts[0] = `${digits.slice(0, 3)}.${digits.slice(3, 6)}`
  if (digits.length > 6)
    parts[0] = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}`
  if (digits.length > 9)
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`
  return parts.join('')
}

export function sanitizeCpf(value: string): string {
  return value.replace(/\D/g, '')
}

export function isValidCpf(value: string): boolean {
  const cpf = sanitizeCpf(value)
  if (cpf.length !== 11) return false
  if (/^(\d)\1{10}$/.test(cpf)) return false
  let sum = 0
  for (let i = 0; i < 9; i++) sum += parseInt(cpf[i], 10) * (10 - i)
  let rest = (sum * 10) % 11
  if (rest === 10) rest = 0
  if (rest !== parseInt(cpf[9], 10)) return false
  sum = 0
  for (let i = 0; i < 10; i++) sum += parseInt(cpf[i], 10) * (11 - i)
  rest = (sum * 10) % 11
  if (rest === 10) rest = 0
  return rest === parseInt(cpf[10], 10)
}
