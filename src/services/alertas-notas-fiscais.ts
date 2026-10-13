import { supabase } from '@/lib/supabase/client'

export type TipoAlertaNota =
  | 'SEM_ITENS'
  | 'ITENS_IDENTICOS'
  | 'SEM_ENTRADA_ESTOQUE'
  | 'ITEM_SEM_VINCULO'
  | 'TOTAL_DIVERGENTE'
  | 'SEM_CONTA_PAGAR'

export type GravidadeAlerta = 'alta' | 'media' | 'baixa'

export interface AlertaNotaFiscal {
  nota_id: string
  numero_nota: string | null
  fornecedor: string | null
  data_emissao: string | null
  valor_total: number | null
  soma_itens: number | null
  diferenca: number | null
  qtd_itens: number | null
  tipo_alerta: TipoAlertaNota
  gravidade: GravidadeAlerta
  mensagem: string
  acao_sugerida: string
}

export interface AlertasResumo {
  total: number
  alta: number
  media: number
  baixa: number
}

const GRAVIDADE_WEIGHT: Record<GravidadeAlerta, number> = {
  alta: 3,
  media: 2,
  baixa: 1,
}

/**
 * Ordena linhas de alertas conforme a regra da especificação:
 * 1. Gravidade ('alta' primeiro, depois 'media', depois 'baixa')
 * 2. Valor absoluto de diferenca decrescente dentro de cada gravidade
 */
export function sortAlertasNotas(alertas: AlertaNotaFiscal[]): AlertaNotaFiscal[] {
  return [...alertas].sort((a, b) => {
    const weightA = GRAVIDADE_WEIGHT[a.gravidade] ?? 0
    const weightB = GRAVIDADE_WEIGHT[b.gravidade] ?? 0
    if (weightA !== weightB) {
      return weightB - weightA
    }
    const diffA = Math.abs(Number(a.diferenca) || 0)
    const diffB = Math.abs(Number(b.diferenca) || 0)
    return diffB - diffA
  })
}

/**
 * Consulta a view `vw_alertas_notas_fiscais` já existente no Supabase.
 * NÃO recalcula nada: devolve exatamente o que a view produz.
 */
export async function fetchAlertasNotasFiscais(): Promise<{
  data: AlertaNotaFiscal[]
  error: string | null
}> {
  try {
    const { data, error } = await supabase.from('vw_alertas_notas_fiscais' as any).select('*')

    if (error) {
      console.warn(
        '[fetchAlertasNotasFiscais] Erro ao consultar vw_alertas_notas_fiscais:',
        error.message,
      )
      return { data: [], error: error.message }
    }

    const rows = (data as AlertaNotaFiscal[]) || []
    return { data: sortAlertasNotas(rows), error: null }
  } catch (err: any) {
    console.error('[fetchAlertasNotasFiscais] Exceção:', err)
    return { data: [], error: err?.message || 'Erro ao carregar alertas de notas fiscais' }
  }
}

/**
 * Registra uma ação resolvida na tabela de auditoria `logs_ia`.
 * Colunas verificadas em src/lib/supabase/types.ts:
 * - acao: string
 * - detalhes: Json | null
 * - user_id: string | null
 */
export async function registrarLogResolucaoPendencia(params: {
  nota_id: string
  tipo_alerta: string
  user_id: string | null
  detalhesExtras?: Record<string, any>
}): Promise<void> {
  try {
    const payload = {
      nota_id: params.nota_id,
      tipo_alerta: params.tipo_alerta,
      ...(params.detalhesExtras || {}),
    }

    const { error } = await supabase.from('logs_ia').insert({
      acao: 'nota_pendencia_resolvida',
      user_id: params.user_id || null,
      detalhes: payload,
    })

    if (error) {
      console.warn('[registrarLogResolucaoPendencia] Erro ao registrar em logs_ia:', error.message)
    }
  } catch (err) {
    console.warn('[registrarLogResolucaoPendencia] Falha silenciosa ao registrar log:', err)
  }
}

/**
 * RPC existente: sincronizar_estoque_nota(p_nota_id, p_usuario_id)
 * Utilizada para ações rápidas de SEM_ENTRADA_ESTOQUE.
 */
export async function rpcSincronizarEstoqueNota(params: {
  nota_id: string
  usuario_id: string | null
  tipo_alerta?: string
}): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase.rpc('sincronizar_estoque_nota' as any, {
      p_nota_id: params.nota_id,
      p_usuario_id: params.usuario_id || null,
    })

    if (error) {
      return { success: false, error: error.message }
    }

    // Registrar auditoria em logs_ia conforme regra 8
    await registrarLogResolucaoPendencia({
      nota_id: params.nota_id,
      tipo_alerta: params.tipo_alerta || 'SEM_ENTRADA_ESTOQUE',
      user_id: params.usuario_id,
      detalhesExtras: { metodo: 'sincronizar_estoque_nota' },
    })

    return { success: true, error: null }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Falha ao sincronizar estoque da nota' }
  }
}

/**
 * RPC existente: marcar_nota_conferida(p_nota_id, p_usuario_id, p_observacao)
 * Utilizada para ações rápidas de TOTAL_DIVERGENTE e SEM_CONTA_PAGAR.
 * Observação é obrigatória.
 */
export async function rpcMarcarNotaConferida(params: {
  nota_id: string
  usuario_id: string | null
  observacao: string
  tipo_alerta?: string
}): Promise<{ success: boolean; error: string | null }> {
  const obs = (params.observacao || '').trim()
  if (!obs) {
    return { success: false, error: 'A observação é obrigatória para marcar como conferida.' }
  }

  try {
    const { error } = await supabase.rpc('marcar_nota_conferida' as any, {
      p_nota_id: params.nota_id,
      p_usuario_id: params.usuario_id || null,
      p_observacao: obs,
    })

    if (error) {
      return { success: false, error: error.message }
    }

    // Registrar auditoria em logs_ia conforme regra 8
    await registrarLogResolucaoPendencia({
      nota_id: params.nota_id,
      tipo_alerta: params.tipo_alerta || 'CONFERENCIA',
      user_id: params.usuario_id,
      detalhesExtras: {
        metodo: 'marcar_nota_conferida',
        observacao: obs,
      },
    })

    return { success: true, error: null }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Falha ao marcar nota como conferida' }
  }
}

/**
 * Helper para verificar permissão do usuário para as ações rápidas:
 * Regra 7: quem pode "Marcar como conferida" e "Lançar estoque" são os papéis Gestor e Compras.
 * Considera:
 * - isSuperAdmin (email admin@bender.com ou isAdmin flag)
 * - Função/Cargo: Gestor, Gerente, Compras
 * - Permissões de módulo: 'Estoque & Compras' = 'Admin' | 'Editor'
 */
export function canResolvePendencia(
  user: any,
  permissions: Record<string, string>,
  isAdmin: boolean,
): boolean {
  if (!user) return false
  if (isAdmin || user.email === 'admin@bender.com') return true

  // Verificar permissão no módulo Estoque & Compras
  const estoquePerm = permissions['Estoque & Compras']
  if (estoquePerm === 'Admin' || estoquePerm === 'Editor') {
    return true
  }

  // Verificar cargo / função do usuário nos metadados ou propriedades conhecidas
  const role = (
    user.funcao ||
    user.cargo ||
    user.role ||
    user.user_metadata?.funcao ||
    user.user_metadata?.cargo ||
    user.user_metadata?.role ||
    ''
  ).toLowerCase()

  if (
    role.includes('gestor') ||
    role.includes('gerente') ||
    role.includes('compras') ||
    role.includes('admin')
  ) {
    return true
  }

  return false
}

/**
 * Helper para verificar se o usuário atual tem papel de Gestor (para visualização do card no dashboard).
 * Regra 2: card resumido visível apenas para quem tem papel de Gestor.
 */
export function isUserGestor(
  user: any,
  permissions: Record<string, string>,
  isAdmin: boolean,
): boolean {
  if (!user) return false
  if (isAdmin || user.email === 'admin@bender.com') return true

  const estoquePerm = permissions['Estoque & Compras']
  const dashboardPerm = permissions['Dashboard']
  if (estoquePerm === 'Admin' || dashboardPerm === 'Admin') {
    return true
  }

  const role = (
    user.funcao ||
    user.cargo ||
    user.role ||
    user.user_metadata?.funcao ||
    user.user_metadata?.cargo ||
    user.user_metadata?.role ||
    ''
  ).toLowerCase()

  return (
    role.includes('gestor') ||
    role.includes('gerente') ||
    role.includes('diretor') ||
    role.includes('admin')
  )
}
