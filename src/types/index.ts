export type Stage = 'Medição' | 'Projeto' | 'Aprovação' | 'Produção' | 'Montagem' | 'Finalizado'

export interface Project {
  id: string
  name: string
  client: string
  stage: Stage
  deadline: string
  progress: number
  priority: 'Baixa' | 'Média' | 'Alta' | 'Urgente'
  tags: string[]
}

export interface Lead {
  id: string
  nome: string
  email: string
  telefone: string
  origem: string
  consultor_id: string | null
  status: string
  notas: string | null
  ordem: number
  criado_em: string
  criado_por_nome?: string | null
  consultor?: { nome: string } | null
}

export interface Client {
  id: string
  name: string
  email: string
  phone: string
  totalProjects: number
  status: 'Ativo' | 'Inativo'
  createdAt: string
}

export interface InventoryItem {
  id: string
  name: string
  category: string
  quantity: number
  unit: 'un' | 'm²' | 'litro' | 'kg' | string
  minStock: number
  price: number
  marca?: string
  cor?: string
  espessura_mm?: number
  largura_mm?: number
  comprimento_m?: number
}

export interface Transaction {
  id: string
  type: 'receita' | 'despesa'
  description: string
  category: string
  amount: number
  dueDate: string
  paidDate: string | null
  status: string
  source: any
  createdAt: string
  entityName: string
  meioPagamento?: string
  antecipado?: boolean
}
