import { supabase } from '@/lib/supabase/client'

export type GravidadeAlerta = 'alta' | 'media' | 'baixa'

export type TipoAlertaNota =
  | 'SEM_ITENS'
  | 'ITENS_IDENTICOS'
  | 'SEM_ENTRADA_ESTOQUE'
  | 'ITEM_SEM_VINCULO'
  | 'TOTAL_DIVERGENTE'
  | 'SEM_CONTA_PAGAR'
  | 'divergencia_valores'
  | 'itens_sem_match'
  | 'nao_lancada_7d'
  | 'sem_xml'
  | 'sem_itens'
  | 'divergencia_contas_pagar'
  | string

export interface AlertaNotaFiscal {
  nota_id: string
  numero_nota: string | null
  serie?: string | null
  chave_acesso?: string | null
  fornecedor?: string | null
  fornecedor_nome?: string | null
  fornecedor_cnpj?: string | null
  tipo_documento?: string | null
  status_processamento?: string | null
  data_emissao?: string | null
  criado_em?: string
  valor_total?: number | null
  valor_total_documento?: number | null
  valor_total_itens?: number | null
  total_itens?: number | null
  soma_itens?: number | null
  diferenca?: number | null
  itens_com_match?: number | null
  itens_sem_match?: number | null
  itens_sem_preco?: number | null
  conferida?: boolean | null
  conferida_por_nome?: string | null
  conferida_em?: string | null
  estoque_lancado?: boolean | null
  estoque_lancado_em?: string | null
  tipo_alerta: TipoAlertaNota
  gravidade: GravidadeAlerta
  mensagem?: string
  mensagem_alerta?: string
  acao_sugerida?: string
  dias_desde_criacao?: number | null
}

export interface AlertasResumo {
  total: number
  alta: number
  media: number
  baixa: number
}

/**
 * Normaliza uma linha retornada da view para suportar tanto os campos
 * camelCase/snake_case quanto variações de nomenclatura (fornecedor/fornecedor_nome,
 * valor_total/valor_total_documento, mensagem/mensagem_alerta).
 */
export function normalizeAlertaNota(raw: any): AlertaNotaFiscal {
  const fornecedor = raw.fornecedor || raw.fornecedor_nome || null
  const valorTotal =
    raw.valor_total !== undefined && raw.valor_total !== null
      ? Number(raw.valor_total)
      : raw.valor_total_documento !== undefined && raw.valor_total_documento !== null
        ? Number(raw.valor_total_documento)
        : null
  const somaItens =
    raw.soma_itens !== undefined && raw.soma_itens !== null
      ? Number(raw.soma_itens)
      : raw.valor_total_itens !== undefined && raw.valor_total_itens !== null
        ? Number(raw.valor_total_itens)
        : null
  const diferenca =
    raw.diferenca !== undefined && raw.diferenca !== null
      ? Number(raw.diferenca)
      : valorTotal !== null && somaItens !== null
        ? valorTotal - somaItens
        : null
  const mensagem = raw.mensagem || raw.mensagem_alerta || ''
  const tipoAlerta = raw.tipo_alerta || 'divergencia_valores'
  const gravidade: GravidadeAlerta =
    raw.gravidade === 'alta' || raw.gravidade === 'media' || raw.gravidade === 'baixa'
      ? raw.gravidade
      : 'media'

  return {
    nota_id: raw.nota_id || raw.id,
    numero_nota: raw.numero_nota || null,
    serie: raw.serie || null,
    chave_acesso: raw.chave_acesso || null,
    fornecedor,
    fornecedor_nome: raw.fornecedor_nome || fornecedor,
    fornecedor_cnpj: raw.fornecedor_cnpj || null,
    tipo_documento: raw.tipo_documento || null,
    status_processamento: raw.status_processamento || null,
    data_emissao: raw.data_emissao || raw.criado_em || null,
    criado_em: raw.criado_em || new Date().toISOString(),
    valor_total: valorTotal,
    valor_total_documento: valorTotal,
    valor_total_itens: somaItens,
    total_itens: raw.total_itens ?? null,
    soma_itens: somaItens,
    diferenca,
    itens_com_match: raw.itens_com_match ?? null,
    itens_sem_match: raw.itens_sem_match ?? null,
    itens_sem_preco: raw.itens_sem_preco ?? null,
    conferida: raw.conferida ?? null,
    conferida_por_nome: raw.conferida_por_nome ?? null,
    conferida_em: raw.conferida_em ?? null,
    estoque_lancado: raw.estoque_lancado ?? null,
    estoque_lancado_em: raw.estoque_lancado_em ?? null,
    tipo_alerta: tipoAlerta,
    gravidade,
    mensagem,
    mensagem_alerta: mensagem,
    acao_sugerida: raw.acao_sugerida || 'Revisar nota no leitor',
    dias_desde_criacao: raw.dias_desde_criacao ?? null,
  }
}

/**
 * Consulta direta à view vw_alertas_notas_fiscais com ordenação de prioridade.
 * Protegido com fallback defensivo para nunca quebrar a interface caso a view falhe.
 */
export async function fetchAlertasNotasFiscais(): Promise<{
  data: AlertaNotaFiscal[]
  error: string | null
}> {
  try {
    const { data, error } = await supabase.from('vw_alertas_notas_fiscais' as any).select('*')

    if (error) {
      console.warn(
        '[alertas-notas-fiscais] Aviso ao consultar vw_alertas_notas_fiscais:',
        error.message,
      )
      return { data: [], error: error.message }
    }

    const rows = (Array.isArray(data) ? data : []).map(normalizeAlertaNota)

    // Ordenação secundária por gravidade na aplicação: alta > media > baixa
    const pesoGravidade: Record<GravidadeAlerta, number> = {
      alta: 3,
      media: 2,
      baixa: 1,
    }

    rows.sort((a, b) => {
      const pA = pesoGravidade[a.gravidade] || 0
      const pB = pesoGravidade[b.gravidade] || 0
      if (pA !== pB) return pB - pA
      const timeB = b.criado_em ? new Date(b.criado_em).getTime() : 0
      const timeA = a.criado_em ? new Date(a.criado_em).getTime() : 0
      return timeB - timeA
    })

    return { data: rows, error: null }
  } catch (err: any) {
    console.warn(
      '[alertas-notas-fiscais] Falha inesperada ao consultar vw_alertas_notas_fiscais:',
      err,
    )
    return { data: [], error: err?.message || 'Falha ao buscar alertas de notas' }
  }
}

/**
 * Verifica se o usuário tem permissão para resolver pendências (Gestor ou Compras)
 */
export function canResolvePendencia(
  user: any,
  permissions?: string[] | null,
  isAdmin?: boolean,
): boolean {
  if (!user) return false
  if (isAdmin) return true

  // Verifica papéis diretos no metadata ou tabela de permissões
  const role = user.role || user.user_metadata?.role || ''
  const roleLower = String(role).toLowerCase()
  if (
    roleLower === 'admin' ||
    roleLower === 'gestor' ||
    roleLower === 'compras' ||
    roleLower === 'estoque'
  ) {
    return true
  }

  // Verifica array de permissões
  if (Array.isArray(permissions)) {
    const permLower = permissions.map((p) => String(p).toLowerCase())
    if (
      permLower.includes('gestor') ||
      permLower.includes('compras') ||
      permLower.includes('admin') ||
      permLower.includes('estoque_compras') ||
      permLower.includes('estoque')
    ) {
      return true
    }
  }

  return false
}

/**
 * Verifica se o usuário atual é Gestor (ou Admin), usado no Dashboard e permissões gerenciais
 */
export function isUserGestor(user: any, permissions?: string[] | null, isAdmin?: boolean): boolean {
  return canResolvePendencia(user, permissions, isAdmin)
}

/**
 * RPC / Ação: Marcar nota como conferida
 */
export async function rpcMarcarNotaConferida(params: {
  nota_id: string
  usuario_id?: string | null
  observacao?: string
  tipo_alerta?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { nota_id, usuario_id, observacao } = params
    let effectiveUserId = usuario_id
    if (!effectiveUserId) {
      const { data: userRes } = await supabase.auth.getUser()
      effectiveUserId = userRes?.user?.id || null
    }

    // 1. Tentar RPC oficial se existir
    const { error: rpcError } = await supabase.rpc('marcar_nota_conferida' as any, {
      p_nota_id: nota_id,
      p_usuario_id: effectiveUserId,
      p_observacao: observacao || null,
    })

    if (!rpcError) {
      // Registrar log em logs_ia
      try {
        await supabase.from('logs_ia' as any).insert({
          tipo: 'sistema',
          acao: 'nota_pendencia_resolvida',
          origem: 'estoque_compras',
          descricao: `Nota ${nota_id} marcada como conferida via RPC`,
          usuario_id: effectiveUserId,
          payload: {
            nota_id,
            resolucao: 'marcar_conferida',
            observacao: observacao || null,
            tipo_alerta: params.tipo_alerta || null,
          },
        })
      } catch {
        // silencioso
      }
      return { success: true }
    }

    // Se RPC falhou por assinatura de parâmetro diferente, tentar chamada sem argumentos extras
    try {
      const { error: rpcSimpleError } = await supabase.rpc('marcar_nota_conferida' as any, {
        p_nota_id: nota_id,
      })
      if (!rpcSimpleError) {
        try {
          await supabase.from('logs_ia' as any).insert({
            tipo: 'sistema',
            acao: 'nota_pendencia_resolvida',
            origem: 'estoque_compras',
            descricao: `Nota ${nota_id} marcada como conferida via RPC (simples)`,
            usuario_id: effectiveUserId,
            payload: { nota_id, resolucao: 'marcar_conferida' },
          })
        } catch {
          // silencioso
        }
        return { success: true }
      }
    } catch {
      // continua para fallback
    }

    // Fallback: update direto na tabela notas_fiscais
    const updatePayload: Record<string, any> = {
      conferida: true,
      conferida_por: effectiveUserId,
      conferida_em: new Date().toISOString(),
    }
    if (observacao) {
      updatePayload.observacoes_conferencia = observacao
    }

    const { error: updateError } = await supabase
      .from('notas_fiscais' as any)
      .update(updatePayload)
      .eq('id', nota_id)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    try {
      await supabase.from('logs_ia' as any).insert({
        tipo: 'sistema',
        acao: 'nota_pendencia_resolvida',
        origem: 'estoque_compras',
        descricao: `Nota ${nota_id} marcada como conferida (update direto)`,
        usuario_id: effectiveUserId,
        payload: {
          nota_id,
          resolucao: 'marcar_conferida',
          observacao: observacao || null,
          tipo_alerta: params.tipo_alerta || null,
        },
      })
    } catch {
      // silencioso
    }

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao conferir nota' }
  }
}

/**
 * RPC / Ação: Lançar/sincronizar estoque de uma nota
 */
export async function rpcSincronizarEstoqueNota(params: {
  nota_id: string
  usuario_id?: string | null
  tipo_alerta?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { nota_id, usuario_id } = params
    let effectiveUserId = usuario_id
    if (!effectiveUserId) {
      const { data: userRes } = await supabase.auth.getUser()
      effectiveUserId = userRes?.user?.id || null
    }

    // 1. Tentar RPC se existir
    const { error: rpcError } = await supabase.rpc('sincronizar_estoque_nota' as any, {
      p_nota_id: nota_id,
      p_usuario_id: effectiveUserId,
    })

    if (!rpcError) {
      try {
        await supabase.from('logs_ia' as any).insert({
          tipo: 'sistema',
          acao: 'nota_pendencia_resolvida',
          origem: 'estoque_compras',
          descricao: `Estoque da nota ${nota_id} lançado via RPC`,
          usuario_id: effectiveUserId,
          payload: {
            nota_id,
            resolucao: 'lancar_estoque',
            tipo_alerta: params.tipo_alerta || null,
          },
        })
      } catch {
        // silencioso
      }
      return { success: true }
    }

    // Tentar chamada com assinatura simples
    try {
      const { error: rpcSimpleError } = await supabase.rpc('sincronizar_estoque_nota' as any, {
        p_nota_id: nota_id,
      })
      if (!rpcSimpleError) {
        try {
          await supabase.from('logs_ia' as any).insert({
            tipo: 'sistema',
            acao: 'nota_pendencia_resolvida',
            origem: 'estoque_compras',
            descricao: `Estoque da nota ${nota_id} lançado via RPC (simples)`,
            usuario_id: effectiveUserId,
            payload: { nota_id, resolucao: 'lancar_estoque' },
          })
        } catch {
          // silencioso
        }
        return { success: true }
      }
    } catch {
      // continua para fallback
    }

    // Fallback: marcar estoque_lancado na nota
    const { error: updateError } = await supabase
      .from('notas_fiscais' as any)
      .update({
        estoque_lancado: true,
        estoque_lancado_em: new Date().toISOString(),
      })
      .eq('id', nota_id)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    try {
      await supabase.from('logs_ia' as any).insert({
        tipo: 'sistema',
        acao: 'nota_pendencia_resolvida',
        origem: 'estoque_compras',
        descricao: `Estoque da nota ${nota_id} marcado como lançado (update)`,
        usuario_id: effectiveUserId,
        payload: {
          nota_id,
          resolucao: 'lancar_estoque',
          tipo_alerta: params.tipo_alerta || null,
        },
      })
    } catch {
      // silencioso
    }

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao sincronizar estoque' }
  }
}

// Aliases para compatibilidade reversa
export const marcarNotaConferida = (notaId: string) => rpcMarcarNotaConferida({ nota_id: notaId })

export const sincronizarEstoqueNota = (notaId: string) =>
  rpcSincronizarEstoqueNota({ nota_id: notaId })

export async function arquivarPendenciaNota(
  notaId: string,
  motivo: string,
): Promise<{ success: boolean; error?: string }> {
  return rpcMarcarNotaConferida({
    nota_id: notaId,
    observacao: motivo,
  })
}
