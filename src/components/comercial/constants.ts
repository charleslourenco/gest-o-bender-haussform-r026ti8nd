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
    colunas: ['Novo contato', 'Despachados'],
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
/**
 * Verifica se um lead pertence à aba informada respeitando exatamente
 * a mesma lógica do belongsNaturally e prioridades do KanbanAtendimentos.
 */
export function leadBelongsToAba(
  lead:
    | {
        status?: string | null
        categoria?: string | null
        kanban_ativo?: boolean | null
        notas_pessoais?: unknown
        excluido?: boolean | null
        arquivado_comercial?: boolean | null
      }
    | null
    | undefined,
  abaId: string,
): boolean {
  if (!lead || typeof lead !== 'object') return false

  const { meta } = parseLeadMetadados(lead.notas_pessoais)

  // Verificação de exclusão/arquivamento NA ABA INFORMADA
  const isExcluidoNaAba =
    Array.isArray(meta?.exclusoes) && meta.exclusoes.some((e: any) => e && e.aba === abaId)
  if (isExcluidoNaAba) return false

  const isArquivadoNaAba =
    Array.isArray(meta?.arquivamentos) && meta.arquivamentos.some((a: any) => a && a.aba === abaId)
  if (isArquivadoNaAba) return false

  // Se o card foi explicitamente encaminhado para uma aba
  if (meta?.encaminhado_para_aba) {
    return meta.encaminhado_para_aba === abaId
  }

  // Card NÃO encaminhado: verificar pertinência natural por categoria/status
  const cat = typeof lead.categoria === 'string' ? lead.categoria.trim() : 'Comercial'
  const status = typeof lead.status === 'string' ? lead.status.trim() : ''

  if (abaId === 'novo-contato') {
    return (
      status === 'Novo contato' ||
      status === 'Novo Contato' ||
      status === 'Novo Lead' ||
      status === 'Novo' ||
      status === 'Despachados' ||
      status === 'Encaminhado Para' ||
      (cat === 'Comercial' && !lead.kanban_ativo)
    )
  }

  if (abaId === 'lead-consultoria') {
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
    return (cat === 'Comercial' || cat === 'Já é Cliente') && consultoriaStatuses.includes(status)
  }

  if (abaId === 'lead-followup') {
    return (
      cat.toLowerCase() === 'follow up' ||
      status === 'Follow up' ||
      status === 'Encaminhado p/ Consultoria'
    )
  }

  if (abaId === 'curriculos') {
    return (
      cat.toLowerCase() === 'currículo' ||
      cat.toLowerCase() === 'curriculo' ||
      status === 'Candidato' ||
      status === 'Encaminhado p/ RH'
    )
  }

  if (abaId === 'lead-orcamentos') {
    return (
      cat.toLowerCase() === 'orçamento' ||
      cat.toLowerCase() === 'orcamento' ||
      status === 'Novo Orçamento' ||
      status === 'Em andamento'
    )
  }

  if (abaId === 'fornecedores') {
    return cat.toLowerCase() === 'fornecedor' || status === 'Encaminhado p/ Setor de Compras'
  }

  if (abaId === 'parceiros') {
    return (
      cat.toLowerCase() === 'parceiro' ||
      cat.toLowerCase() === 'arquiteto externo' ||
      cat.toLowerCase() === 'equipe'
    )
  }

  if (abaId === 'assistencia') {
    return cat.toLowerCase() === 'assistência' || cat.toLowerCase() === 'assistencia'
  }

  return false
}

/**
 * Retorna a aba correspondente a um determinado Lead
 */
export function getLeadAba(
  lead:
    | {
        status?: string | null
        categoria?: string | null
        kanban_ativo?: boolean | null
        notas_pessoais?: unknown
      }
    | null
    | undefined,
): AtendimentoAbaConfig {
  if (!lead || typeof lead !== 'object') {
    return ATENDIMENTO_ABAS[0]
  }

  for (const aba of ATENDIMENTO_ABAS) {
    if (leadBelongsToAba(lead, aba.id)) {
      return aba
    }
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

// Helper para checar se uma coluna é de encaminhado ou despachados
export function isColunaEncaminhado(coluna: string): boolean {
  const norm = coluna.toLowerCase()
  return norm.includes('encaminhado') || norm.includes('despachad')
}

// Helper de mapeamento de tags/metadados no campo notas_pessoais
export interface AbaAcaoRegistro {
  aba: string
  data: string
}

// Lista padronizada de Origens dos Leads (8 opções exatas)
export const ORIGENS_LEAD = [
  'Instagram',
  'Google',
  'Recompra',
  'Corretor',
  'Arquiteto',
  'Indicação',
  'Porta',
  'A definir',
] as const

export type OrigemLead = (typeof ORIGENS_LEAD)[number]

// Origens que exigem o campo "Nome da pessoa" (Corretor, Arquiteto, Indicação)
export const ORIGENS_COM_PESSOA = ['Corretor', 'Arquiteto', 'Indicação'] as const

export function exigeNomePessoa(origem?: string | null): boolean {
  if (!origem) return false
  return ORIGENS_COM_PESSOA.includes(origem as any)
}

export function getRotuloNomePessoa(origem?: string | null): string {
  if (origem === 'Corretor') return 'Nome do corretor'
  if (origem === 'Arquiteto') return 'Nome do arquiteto'
  if (origem === 'Indicação') return 'Nome do indicador'
  return 'Nome da pessoa'
}

export interface LeadMetadados {
  descricao_projeto?: string
  prazo?: string
  prioridade?: 'Alta' | 'Média' | 'Baixa'
  origem_aba?: string
  encaminhado_para_aba?: string
  encaminhado_em?: string
  exclusoes?: AbaAcaoRegistro[]
  arquivamentos?: AbaAcaoRegistro[]
  montador_ids?: string[]
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
