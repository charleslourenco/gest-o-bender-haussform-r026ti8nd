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

/**
 * Retorna a aba correspondente a um determinado Lead
 */
export function getLeadAba(lead: {
  status?: string | null
  categoria?: string | null
  kanban_ativo?: boolean | null
  notas_pessoais?: unknown
}): AtendimentoAbaConfig {
  const cat = typeof lead?.categoria === 'string' ? lead.categoria.trim() : 'Comercial'
  const status = typeof lead?.status === 'string' ? lead.status.trim() : ''
  const { meta } = parseLeadMetadados(lead?.notas_pessoais)

  if (meta?.encaminhado_para_aba) {
    const found = ATENDIMENTO_ABAS.find((a) => a.id === meta.encaminhado_para_aba)
    if (found) return found
  }

  // 1. Novo Contato
  if (
    status === 'Novo contato' ||
    status === 'Novo Contato' ||
    status === 'Novo Lead' ||
    status === 'Novo' ||
    (cat === 'Comercial' && !lead?.kanban_ativo)
  ) {
    return ATENDIMENTO_ABAS.find((a) => a.id === 'novo-contato') || ATENDIMENTO_ABAS[0]
  }

  // 2. Lead p/ Consultoria
  const consultoriaStatuses = [
    'Consultoria Inicial',
    'Projeto',
    'Apresentação',
    'Negociação',
    'Stand By',
    'Vendido',
    'Perdido',
    'Aguardando Consultor',
    'Ação Gerente',
    'Designar Consultor',
  ]
  if (
    (cat === 'Comercial' || cat === 'Já é Cliente') &&
    (consultoriaStatuses.includes(status) || Boolean(lead?.kanban_ativo))
  ) {
    return ATENDIMENTO_ABAS.find((a) => a.id === 'lead-consultoria') || ATENDIMENTO_ABAS[1]
  }

  // 3. Follow up
  if (
    cat.toLowerCase() === 'follow up' ||
    status === 'Follow up' ||
    status === 'Encaminhado p/ Consultoria'
  ) {
    return ATENDIMENTO_ABAS.find((a) => a.id === 'lead-followup') || ATENDIMENTO_ABAS[2]
  }

  // 4. Currículos
  if (
    cat.toLowerCase() === 'currículo' ||
    cat.toLowerCase() === 'curriculo' ||
    status === 'Candidato' ||
    status === 'Encaminhado p/ RH'
  ) {
    return ATENDIMENTO_ABAS.find((a) => a.id === 'curriculos') || ATENDIMENTO_ABAS[3]
  }

  // 5. Orçamentos
  if (
    cat.toLowerCase() === 'orçamento' ||
    cat.toLowerCase() === 'orcamento' ||
    status === 'Novo Orçamento' ||
    status === 'Em andamento'
  ) {
    return ATENDIMENTO_ABAS.find((a) => a.id === 'lead-orcamentos') || ATENDIMENTO_ABAS[4]
  }

  // 6. Fornecedores
  if (cat.toLowerCase() === 'fornecedor' || status === 'Encaminhado p/ Setor de Compras') {
    return ATENDIMENTO_ABAS.find((a) => a.id === 'fornecedores') || ATENDIMENTO_ABAS[5]
  }

  // 7. Parceiros
  if (
    cat.toLowerCase() === 'parceiro' ||
    cat.toLowerCase() === 'arquiteto externo' ||
    cat.toLowerCase() === 'equipe'
  ) {
    return ATENDIMENTO_ABAS.find((a) => a.id === 'parceiros') || ATENDIMENTO_ABAS[6]
  }

  // 8. Assistência
  if (cat.toLowerCase() === 'assistência' || cat.toLowerCase() === 'assistencia') {
    return ATENDIMENTO_ABAS.find((a) => a.id === 'assistencia') || ATENDIMENTO_ABAS[7]
  }

  return ATENDIMENTO_ABAS[0]
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
  if (raw === null || raw === undefined) {
    return { notas: '', meta: {} }
  }

  let text = ''
  if (typeof raw === 'string') {
    text = raw
  } else if (typeof raw === 'object') {
    try {
      // Se for um objeto já parseado
      return { notas: '', meta: (raw as any) || {} }
    } catch {
      return { notas: '', meta: {} }
    }
  } else {
    try {
      text = String(raw)
    } catch {
      return { notas: '', meta: {} }
    }
  }

  if (!text) return { notas: '', meta: {} }

  const idx = text.indexOf(META_PREFIX)
  if (idx === -1) {
    // Se o texto for exatamente "null" ou "undefined", desconsiderar como nota
    const trimmed = text.trim()
    if (trimmed === 'null' || trimmed === 'undefined') {
      return { notas: '', meta: {} }
    }
    return { notas: text, meta: {} }
  }

  let cleanNotas = text.slice(0, idx).trimEnd()
  if (cleanNotas.trim() === 'null' || cleanNotas.trim() === 'undefined') {
    cleanNotas = ''
  }

  const jsonStr = text.slice(idx + META_PREFIX.length).trim()
  try {
    const meta = JSON.parse(jsonStr)
    return { notas: cleanNotas, meta: meta && typeof meta === 'object' ? meta : {} }
  } catch {
    return { notas: cleanNotas || text, meta: {} }
  }
}

export function stringifyLeadMetadados(notas: string, meta: LeadMetadados): string {
  let cleanNotas = (typeof notas === 'string' ? notas : '').trimEnd()
  if (cleanNotas === 'null' || cleanNotas === 'undefined') {
    cleanNotas = ''
  }
  const validMeta = meta && typeof meta === 'object' ? meta : {}
  const hasMeta = Object.keys(validMeta).length > 0
  if (!hasMeta) return cleanNotas
  return (cleanNotas ? `${cleanNotas}\n\n` : '') + `${META_PREFIX}${JSON.stringify(validMeta)}`
}
