export const COLUMNS = [
  'Novo Contato',
  'Aguardando Consultor',
  'Contactado',
  'Em Nutrição',
  'Designar Consultor',
  'Consultoria Inicial',
  'Projeto',
  'Apresentação',
  'Orçamentos',
  'Negociação',
  'Ação Gerente',
  'Stand By',
  'Vendido',
  'Perdido',
]

// Colunas do kanban "Não Comercial" (contatos cuja categoria não é Comercial nem "Já é Cliente")
export const NAO_COMERCIAL_COLUMNS = ['Novo', 'Em Análise', 'Respondido', 'Arquivado']

// Categorias que NÃO são comerciais — roteadas para o kanban "Não Comercial"
export const NAO_COMERCIAL_CATEGORIAS = [
  'Currículo',
  'Parceiro',
  'Fornecedor',
  'Arquiteto Externo',
  'Equipe',
  'Assistência',
  'Outros Assuntos',
]

// Helper: retorna true se a categoria do lead pertence ao kanban comercial.
// `null`/`undefined`/''/`'Comercial'`/`'Já é Cliente'` são tratados como comerciais.
export function isCategoriaComercial(categoria?: string | null): boolean {
  if (!categoria) return true
  const c = categoria.trim()
  if (!c) return true
  return !NAO_COMERCIAL_CATEGORIAS.some((nc) => nc.toLowerCase() === c.toLowerCase())
}
