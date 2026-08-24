// Definições e constantes para o módulo Atendimentos (7 abas especializadas)

export interface AtendimentoAbaConfig {
  id: string
  numero: string
  titulo: string
  descricao: string
  colunas: string[]
  categoriaPadrao: string
  isOrcamentos?: boolean
}

export const ATENDIMENTO_ABAS: AtendimentoAbaConfig[] = [
  {
    id: 'novo-contato',
    numero: '01',
    titulo: 'Novo Contato',
    descricao: 'Novas conversas que chegam pelo WhatsApp',
    colunas: ['Novo contato', 'Encaminhado Para'],
    categoriaPadrao: 'Comercial',
  },
  {
    id: 'lead-consultoria',
    numero: '02',
    titulo: 'Lead p/ Consultoria',
    descricao: 'Funil consultivo principal',
    colunas: [
      'Consultoria Inicial',
      'Projeto',
      'Apresentação',
      'Negociação',
      'Stand By',
      'Vendido',
      'Perdido',
    ],
    categoriaPadrao: 'Comercial',
  },
  {
    id: 'lead-followup',
    numero: '03',
    titulo: 'Lead p/ Follow up',
    descricao: 'Acompanhamento e reaquecimento de leads',
    colunas: ['Follow up', 'Encaminhado p/ Consultoria', 'Perdido'],
    categoriaPadrao: 'Follow up',
  },
  {
    id: 'curriculos',
    numero: '04',
    titulo: 'Currículos',
    descricao: 'Candidatos e triagem de RH',
    colunas: ['Candidato', 'Encaminhado p/ RH'],
    categoriaPadrao: 'Currículo',
  },
  {
    id: 'lead-orcamentos',
    numero: '05',
    titulo: 'Leads p/ Orçamentos',
    descricao: 'Solicitações de orçamento com prazo e prioridade',
    colunas: ['Novo Orçamento', 'Em andamento', 'Encaminhado', 'Perdido'],
    categoriaPadrao: 'Orçamento',
    isOrcamentos: true,
  },
  {
    id: 'fornecedores',
    numero: '06',
    titulo: 'Fornecedores',
    descricao: 'Contatos e triagem para compras',
    colunas: ['Contactado', 'Encaminhado p/ Setor de Compras'],
    categoriaPadrao: 'Fornecedor',
  },
  {
    id: 'parceiros',
    numero: '07',
    titulo: 'Parceiros',
    descricao: 'Parcerias e especificadores',
    colunas: ['Contactado', 'Em Nutrição'],
    categoriaPadrao: 'Parceiro',
  },
  {
    id: 'assistencia',
    numero: '08',
    titulo: 'Assistência',
    descricao: 'Solicitações de assistência técnica e pós-obra',
    colunas: ['Novo', 'Em Atendimento', 'Resolvido'],
    categoriaPadrao: 'Assistência',
  },
]

// Lista legada para compatibilidade se algum componente ainda importar COLUMNS
export const COLUMNS = ATENDIMENTO_ABAS[1].colunas

// Helper para obter configuração da aba
export function getAbaConfig(abaId: string): AtendimentoAbaConfig {
  return ATENDIMENTO_ABAS.find((a) => a.id === abaId) || ATENDIMENTO_ABAS[0]
}

// Categorias que NÃO são comerciais (para compatibilidade de código auxiliar)
export const NAO_COMERCIAL_CATEGORIAS = [
  'Currículo',
  'Parceiro',
  'Fornecedor',
  'Arquiteto Externo',
  'Equipe',
  'Assistência',
  'Outros Assuntos',
]

// Helper para verificar se a categoria é comercial
export function isCategoriaComercial(categoria?: string | null): boolean {
  if (!categoria) return true
  const c = categoria.trim()
  if (!c) return true
  return !NAO_COMERCIAL_CATEGORIAS.some((nc) => nc.toLowerCase() === c.toLowerCase())
}

// Colunas do kanban Não Comercial legado
export const NAO_COMERCIAL_COLUMNS = ['Novo', 'Em Análise', 'Respondido', 'Arquivado']

// Helper para limpar prefixos numéricos dos nomes de coluna (ex: "3 Consultoria Inicial" -> "Consultoria Inicial", "01 Novo Contato" -> "Novo Contato")
export function cleanColumnTitle(coluna: string): string {
  if (!coluna) return ''
  return coluna.replace(/^(\d+[.\-\s_]*|\d+\s+)/, '').trim() || coluna
}

// Helper para checar se uma coluna é de encaminhado
export function isColunaEncaminhado(coluna: string): boolean {
  const norm = coluna.toLowerCase()
  return norm.includes('encaminhado')
}

// Helper de mapeamento de tags/metadados no campo notas_pessoais
export interface LeadMetadados {
  descricao_projeto?: string
  prazo?: string
  prioridade?: 'Alta' | 'Média' | 'Baixa'
  origem_aba?: string
  encaminhado_para_aba?: string
  encaminhado_em?: string
  [key: string]: any
}

const META_PREFIX = '___META_JSON___:'

export function parseLeadMetadados(raw?: unknown): { notas: string; meta: LeadMetadados } {
  if (!raw) return { notas: '', meta: {} }
  if (typeof raw !== 'string') return { notas: '', meta: {} }
  const idx = raw.indexOf(META_PREFIX)
  if (idx === -1) {
    return { notas: raw, meta: {} }
  }
  const cleanNotas = raw.slice(0, idx).trimEnd()
  const jsonStr = raw.slice(idx + META_PREFIX.length).trim()
  try {
    const meta = JSON.parse(jsonStr)
    return { notas: cleanNotas, meta: meta && typeof meta === 'object' ? meta : {} }
  } catch (e) {
    return { notas: raw, meta: {} }
  }
}

export function stringifyLeadMetadados(notas: string, meta: LeadMetadados): string {
  const cleanNotas = (typeof notas === 'string' ? notas : '').trimEnd()
  const validMeta = meta && typeof meta === 'object' ? meta : {}
  const hasMeta = Object.keys(validMeta).length > 0
  if (!hasMeta) return cleanNotas
  return (cleanNotas ? `${cleanNotas}\n\n` : '') + `${META_PREFIX}${JSON.stringify(validMeta)}`
}
