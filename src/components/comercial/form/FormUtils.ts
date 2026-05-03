export interface ProdutoForm {
  id: string
  nome: string
  qtd: number
  descricao: string
  valor_unitario: number
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
  telefone: string
  email: string
  profissao: string
  estado_civil: string
  end_cep: string
  end_municipio: string
  end_estado: string
  end_rua: string
  end_numero: string
  end_bairro: string
  end_complemento: string
  obra_mesmo_endereco: boolean
  obra_cep: string
  obra_municipio: string
  obra_estado: string
  obra_rua: string
  obra_numero: string
  obra_bairro: string
  obra_complemento: string
  produtos: ProdutoForm[]
  desconto: number
  forma_pagamento: 'A_VISTA' | 'PARCELADO'
  pagamento_a_vista_data: string
  pagamento_a_vista_meio: string
  pagamento_parcelado: ParcelaForm[]
  data_medida: string
  vendedor_nome: string
}

export const defaultState: FormState = {
  nome: '',
  cpf: '',
  telefone: '',
  email: '',
  profissao: '',
  estado_civil: 'solteiro',
  end_cep: '',
  end_municipio: '',
  end_estado: '',
  end_rua: '',
  end_numero: '',
  end_bairro: '',
  end_complemento: '',
  obra_mesmo_endereco: false,
  obra_cep: '',
  obra_municipio: '',
  obra_estado: '',
  obra_rua: '',
  obra_numero: '',
  obra_bairro: '',
  obra_complemento: '',
  produtos: [
    {
      id: Math.random().toString(36).substring(2),
      nome: '',
      qtd: 1,
      descricao: '',
      valor_unitario: 0,
    },
  ],
  desconto: 0,
  forma_pagamento: 'A_VISTA',
  pagamento_a_vista_data: new Date().toISOString().split('T')[0],
  pagamento_a_vista_meio: 'dinheiro',
  pagamento_parcelado: [
    {
      id: Math.random().toString(36).substring(2),
      data: new Date().toISOString().split('T')[0],
      valor: 0,
      meio: 'dinheiro',
    },
    {
      id: Math.random().toString(36).substring(2),
      data: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      valor: 0,
      meio: 'dinheiro',
    },
  ],
  data_medida: '',
  vendedor_nome: '',
}

export const maskCPF = (v: string) =>
  v
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .slice(0, 14)
export const maskPhone = (v: string) =>
  v
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1)$2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .slice(0, 14)
export const maskCEP = (v: string) =>
  v
    .replace(/\D/g, '')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .slice(0, 9)
export const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export const addBusinessDays = (date: Date, days: number) => {
  let count = 0
  let cur = new Date(date)
  const h = ['01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '11-20', '12-25']
  while (count < days) {
    cur.setDate(cur.getDate() + 1)
    const dw = cur.getDay(),
      m = String(cur.getMonth() + 1).padStart(2, '0'),
      d = String(cur.getDate()).padStart(2, '0')
    if (dw !== 0 && dw !== 6 && !h.includes(`${m}-${d}`)) count++
  }
  return cur
}
