export const maskCnpj = (v: string) => {
  if (!v) return ''
  let r = v.replace(/\D/g, '')
  if (r.length > 14) r = r.slice(0, 14)
  r = r.replace(/^(\d{2})(\d)/, '$1.$2')
  r = r.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
  r = r.replace(/\.(\d{3})(\d)/, '.$1/$2')
  r = r.replace(/(\d{4})(\d)/, '$1-$2')
  return r
}

export const maskPhone = (v: string) => {
  if (!v) return ''
  let r = v.replace(/\D/g, '')
  if (r.length > 11) r = r.slice(0, 11)
  if (r.length > 10) {
    r = r.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3')
  } else if (r.length > 5) {
    r = r.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3')
  } else if (r.length > 2) {
    r = r.replace(/^(\d{2})(\d{0,5})/, '($1) $2')
  }
  return r
}

export const maskCep = (v: string) => {
  if (!v) return ''
  let r = v.replace(/\D/g, '')
  if (r.length > 8) r = r.slice(0, 8)
  r = r.replace(/^(\d{5})(\d)/, '$1-$2')
  return r
}
