export interface ProdutoForm {
  id: string
  nome: string
  qtd: number
  descricao: string
  valor_unitario: number
  is_outsourced?: boolean
}
export interface ParcelaForm {
  id: string
  data: string
  valor: number
  meio: string
}

export interface FormState {
  nome: string
  cpf: string
  data_nascimento: string
  profissao: string
  estado_civil: string
  email: string
  telefone: string

  end_cep: string
  end_rua: string
  end_numero: string
  end_complemento: string
  end_bairro: string
  end_municipio: string
  end_estado: string

  obra_cep: string
  obra_rua: string
  obra_numero: string
  obra_complemento: string
  obra_bairro: string
  obra_municipio: string
  obra_estado: string

  produtos: ProdutoForm[]
  desconto: number

  forma_pagamento: 'À vista' | 'Parcelado'
  pagamento_a_vista_meio: string
  pagamento_parcelado: ParcelaForm[]

  data_venda: string
  data_acesso_imovel: string
  data_medicao_final: string
  data_entrega_minima: string
  data_entrega_maxima: string
}

export function addBusinessDays(dateStr: string, days: number): string {
  if (!dateStr) return ''
  const date = new Date(dateStr + 'T12:00:00Z')
  if (isNaN(date.getTime())) return ''

  let added = 0
  while (added < days) {
    date.setDate(date.getDate() + 1)
    const day = date.getDay()
    if (day !== 0 && day !== 6) {
      added++
    }
  }
  return date.toISOString().split('T')[0]
}

export const defaultState: FormState = {
  nome: '',
  cpf: '',
  data_nascimento: '',
  profissao: '',
  estado_civil: 'Solteiro',
  email: '',
  telefone: '',

  end_cep: '',
  end_rua: '',
  end_numero: '',
  end_complemento: '',
  end_bairro: '',
  end_municipio: '',
  end_estado: '',

  obra_cep: '',
  obra_rua: '',
  obra_numero: '',
  obra_complemento: '',
  obra_bairro: '',
  obra_municipio: '',
  obra_estado: '',

  produtos: [
    {
      id: Math.random().toString(36).substring(2),
      nome: '',
      qtd: 1,
      descricao: '',
      valor_unitario: 0,
      is_outsourced: false,
    },
  ],
  desconto: 0,

  forma_pagamento: 'À vista',
  pagamento_a_vista_meio: 'PIX',
  pagamento_parcelado: [
    {
      id: Math.random().toString(36).substring(2),
      data: new Date().toISOString().split('T')[0],
      valor: 0,
      meio: 'PIX',
    },
  ],

  data_venda: new Date().toISOString().split('T')[0],
  data_acesso_imovel: '',
  data_medicao_final: '',
  data_entrega_minima: '',
  data_entrega_maxima: '',
}

export const maskCPF = (v: string) =>
  v
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .slice(0, 14)

export const stripDDIFromPhone = (v: string): string => {
  let digits = v.replace(/\D/g, '')
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
    digits = digits.slice(2)
  }
  return digits
}

export const maskPhoneStrict = (v: string) => {
  let val = stripDDIFromPhone(v)
  if (val.length > 11) val = val.slice(0, 11)
  if (val.length <= 2) return val.replace(/(\d{1,2})/, '($1')
  if (val.length <= 7) return val.replace(/(\d{2})(\d{1,5})/, '($1)$2')
  return val.replace(/(\d{2})(\d{5})(\d{1,4})/, '($1)$2-$3')
}

export const maskCEP = (v: string) =>
  v
    .replace(/\D/g, '')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .slice(0, 9)

export const formatCurrencyInput = (v: any) => {
  if (!v && v !== 0) return 'R$ 0,00'
  const valueStr = typeof v === 'number' ? Math.round(v).toString() : v.toString()
  const value = valueStr.replace(/\D/g, '')
  if (!value) return 'R$ 0,00'
  const number = (Number(value) / 100).toFixed(2)
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    Number(number),
  )
}
