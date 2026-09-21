// Validação de integridade da Matriz PCP
import { supabase } from '@/lib/supabase/client'

export type PcpLinhaOperacao = 'analise' | 'producao' | 'montagem'

export interface PcpCardItem {
  id: string
  nome_produto: string
  descricao: string | null
  qtd: number
  valor_unitario: number
  valor_total: number
  desconto_percentual: number
  status_analise: string
  status_pcp: string
  visivel_pcp: boolean
  cliente_id: string | null
  formulario_comercial_id: string | null
  card_pai_id: string | null
  cor_vinculo: string | null
  tipo: string | null
  codigo_rastreio: string | null
  is_outsourced: boolean
  terceirizado_validado: boolean
  outsourced_checked: boolean
  arquivado_analise: boolean
  arquivado_producao: boolean
  arquivado_montagem: boolean
  excluido_analise: boolean
  excluido_producao: boolean
  excluido_montagem: boolean
  criado_em: string
  atualizado_em: string
  // Colunas de planejamento temporal aditivas
  semana_planejada_analise: string | null
  semana_planejada_producao: string | null
  semana_planejada_montagem: string | null
  // Relacionamentos
  cliente?: {
    id?: string
    nome: string
    telefone?: string | null
    email?: string | null
  } | null
  formulario?: {
    id?: string
    nome_cliente?: string | null
    valor_total?: number | null
    data_prevista_entrega?: string | null
    cliente?: { nome: string } | null
  } | null
  card_pai?: {
    id: string
    nome_produto: string
    cor_vinculo: string | null
    status_analise: string
  } | null
  subcards?: PcpCardItem[]
}

export interface PcpReprogramacaoItem {
  id: string
  card_id: string
  linha_operacao: PcpLinhaOperacao
  semana_anterior: string | null
  semana_nova: string | null
  motivo: string | null
  usuario_id: string | null
  criado_em: string
  usuario?: {
    id: string
    nome: string
    email?: string
  } | null
}

const SELECT_QUERY = `
  id, nome_produto, descricao, qtd, valor_unitario, valor_total, desconto_percentual,
  status_analise, status_pcp, visivel_pcp, cliente_id, formulario_comercial_id,
  card_pai_id, cor_vinculo, tipo, codigo_rastreio,
  is_outsourced, terceirizado_validado, outsourced_checked,
  arquivado_analise, arquivado_producao, arquivado_montagem,
  excluido_analise, excluido_producao, excluido_montagem,
  criado_em, atualizado_em,
  semana_planejada_analise, semana_planejada_producao, semana_planejada_montagem,
  cliente:clientes(id, nome, telefone, email),
  formulario:formulario_comercial(id, nome_cliente, valor_total, data_prevista_entrega, cliente:clientes(nome)),
  card_pai:produtos_servicos_projeto!card_pai_id(id, nome_produto, cor_vinculo, status_analise)
`

/**
 * Busca todos os cards e subcards ativos no fluxo de PCP/Operações.
 */
export async function fetchPcpCards(): Promise<PcpCardItem[]> {
  const { data, error } = await supabase
    .from('produtos_servicos_projeto')
    .select(SELECT_QUERY)
    .eq('excluido_analise', false)
    .eq('excluido_producao', false)
    .eq('excluido_montagem', false)
    .order('criado_em', { ascending: false })

  if (error) {
    console.error('Erro ao buscar cards do PCP:', error)
    throw error
  }

  const rawList = Array.isArray(data) ? (data as unknown as any[]) : []

  return rawList.map((item) => {
    const cliSource = item?.cliente
    const cliente = Array.isArray(cliSource) ? cliSource[0] : cliSource
    const formSource = item?.formulario
    const formulario = Array.isArray(formSource) ? formSource[0] : formSource
    const paiSource = item?.card_pai
    const card_pai = Array.isArray(paiSource) ? paiSource[0] : paiSource

    return {
      ...item,
      cliente: cliente || null,
      formulario: formulario || null,
      card_pai: card_pai || null,
      valor_total: Number(item.valor_total) || 0,
      valor_unitario: Number(item.valor_unitario) || 0,
      desconto_percentual: Number(item.desconto_percentual) || 0,
      qtd: Number(item.qtd) || 1,
      visivel_pcp: item.visivel_pcp !== false,
      status_pcp: item.status_pcp || 'planejamento',
      subcards: [],
    } as PcpCardItem
  })
}

/**
 * Atualiza a semana planejada de um card em uma das 3 linhas operacionais.
 * NUNCA altera status_analise, status_pcp ou fases existentes.
 * Registra histórico em `pcp_reprogramacao_historico`.
 */
export async function updateCardSemanaPlanejada(
  cardId: string,
  linha: PcpLinhaOperacao,
  semanaNova: string | null,
  semanaAnterior: string | null,
  motivo?: string,
): Promise<void> {
  const columnMap: Record<
    PcpLinhaOperacao,
    'semana_planejada_analise' | 'semana_planejada_producao' | 'semana_planejada_montagem'
  > = {
    analise: 'semana_planejada_analise',
    producao: 'semana_planejada_producao',
    montagem: 'semana_planejada_montagem',
  }

  const colName = columnMap[linha]

  // 1. Atualizar a coluna aditiva do card
  const { error: updateErr } = await supabase
    .from('produtos_servicos_projeto')
    .update({ [colName]: semanaNova, atualizado_em: new Date().toISOString() } as any)
    .eq('id', cardId)

  if (updateErr) {
    console.error('Erro ao atualizar semana planejada:', updateErr)
    throw updateErr
  }

  // 2. Registrar no histórico de reprogramação
  try {
    const { data: authData } = await supabase.auth.getUser()
    const userId = authData?.user?.id || null

    await supabase.from('pcp_reprogramacao_historico').insert({
      card_id: cardId,
      linha_operacao: linha,
      semana_anterior: semanaAnterior || null,
      semana_nova: semanaNova || null,
      motivo: motivo || (semanaAnterior ? 'Reprogramação temporal' : 'Alocação inicial de semana'),
      usuario_id: userId,
    } as any)
  } catch (histErr) {
    console.warn('Aviso ao registrar histórico de reprogramação (não impeditivo):', histErr)
  }
}

/**
 * Busca histórico de reprogramação de um card específico.
 */
export async function fetchReprogramacaoHistorico(cardId: string): Promise<PcpReprogramacaoItem[]> {
  const { data, error } = await supabase
    .from('pcp_reprogramacao_historico')
    .select(`
      id, card_id, linha_operacao, semana_anterior, semana_nova, motivo, usuario_id, criado_em,
      usuario:users!usuario_id(id, nome, email)
    `)
    .eq('card_id', cardId)
    .order('criado_em', { ascending: false })

  if (error) {
    console.error('Erro ao buscar histórico de reprogramação:', error)
    return []
  }

  const list = Array.isArray(data) ? (data as any[]) : []
  return list.map((item) => ({
    ...item,
    usuario: Array.isArray(item.usuario) ? item.usuario[0] : item.usuario,
  }))
}

/**
 * Determina o status de prontidão técnica de um card/ambiente para manufatura.
 * - 'pronto': Caderno Técnico concluído / lista liberada / plano de corte
 * - 'em_analise': Em análise, reunião ou medida fina
 * - 'bloqueado': Pendência técnica ou item terceirizado não validado
 * - 'inicial': Iniciar análise
 */
export type ProntidaoTecnicaStatus = 'pronto' | 'em_analise' | 'bloqueado' | 'inicial'

export interface ProntidaoInfo {
  status: ProntidaoTecnicaStatus
  label: string
  iconColor: string
  badgeClass: string
  tooltip: string
}

export function getProntidaoTecnica(card: PcpCardItem): ProntidaoInfo {
  const st = card.status_analise || 'iniciar'

  if (st === 'pendencia') {
    return {
      status: 'bloqueado',
      label: 'Pendência Técnica',
      iconColor: 'text-rose-600',
      badgeClass:
        'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border-rose-200',
      tooltip: 'Bloqueado por pendência técnica não resolvida',
    }
  }

  if (card.is_outsourced && !card.terceirizado_validado) {
    return {
      status: 'bloqueado',
      label: 'Terceirizado Pendente',
      iconColor: 'text-amber-600',
      badgeClass:
        'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200',
      tooltip: 'Item terceirizado aguardando validação técnica',
    }
  }

  if (
    st === 'aguardando_plano_corte' ||
    st === 'caderno_tecnico' ||
    st === 'router' ||
    st === 'coladeira' ||
    st === 'bancada' ||
    st === 'embalagem' ||
    st === 'aguardando_agenda' ||
    st === 'montagem' ||
    st === 'concluido'
  ) {
    return {
      status: 'pronto',
      label: 'Prontidão Aprovada',
      iconColor: 'text-emerald-600',
      badgeClass:
        'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200',
      tooltip: 'Prontidão técnica liberada para programação fabril',
    }
  }

  if (
    st === 'medida_fina' ||
    st === 'reuniao_analise' ||
    st === 'alteracao_projeto' ||
    st === 'lista_materiais'
  ) {
    return {
      status: 'em_analise',
      label: 'Engenharia em Andamento',
      iconColor: 'text-blue-600',
      badgeClass:
        'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border-blue-200',
      tooltip: 'Em fase de detalhamento técnico / validação de medidas',
    }
  }

  return {
    status: 'inicial',
    label: 'Aguardando Início',
    iconColor: 'text-slate-500',
    badgeClass:
      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200',
    tooltip: 'Aguardando liberação de engenharia',
  }
}
