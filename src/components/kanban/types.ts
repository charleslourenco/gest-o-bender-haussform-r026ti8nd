export interface KanbanColumnDef {
  id: string
  title: string
}

export interface CardData {
  id: string
  formulario_comercial_id: string | null
  cliente_id: string | null
  nome_produto: string
  qtd: number
  descricao: string | null
  valor_unitario: number
  valor_total: number
  status_analise: string
  criado_em: string
  atualizado_em: string
  codigo_rastreio?: string | null
  analista_id?: string | null
  clientes?: { nome: string } | null
  cliente?: { nome: string } | null
  formulario_comercial?: {
    usuario_id: string | null
    nome_cliente?: string | null
    clientes?: { nome: string } | null
  } | null
  terceirizado_validado?: boolean
  outsourced_checked?: boolean
  is_outsourced?: boolean
  card_pai_id?: string | null
  cor_vinculo?: string | null
  semana_planejada_producao?: string | null
  semana_producao_inicio?: string | null
  card_pai?: {
    id: string
    nome_produto: string
    status_analise?: string
    semana_planejada_producao?: string | null
    semana_producao_inicio?: string | null
  } | null
}
