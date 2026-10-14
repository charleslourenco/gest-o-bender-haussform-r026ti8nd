import { supabase } from '@/lib/supabase/client'
import { parseLeadMetadados } from '@/components/comercial/constants'
import { ensureStorageFolder } from '@/services/vendas'
import { triggerConectaPhaseSync } from '@/services/conecta-sync'
import { runWithAuthRecovery } from '@/lib/supabase/auth-recovery'
import { buscarTodasPaginas } from '@/lib/supabase/buscar-todas-paginas'
import type { Lead } from '@/types'
export type { Lead }

// Colunas necessárias para o Kanban, filtros, edição inline e exibição sem payloads excessivos
export const KANBAN_LEAD_COLUMNS =
  'id, nome, email, telefone, origem, origem_pessoa, consultor_id, consultor_id_secundario, status, status_atendimento, categoria, criado_em, atualizado_em, status_desde, notas_pessoais, notas, ordem, kanban_ativo, criado_por_nome, data_venda, excluido, arquivado_comercial, motivo_perda, etapa_perda, consultor:users!leads_consultor_id_fkey(id, nome, ex_colaborador), consultor_secundario:users!leads_consultor_id_secundario_fkey(id, nome, ex_colaborador)'

/**
 * Normaliza e sanitiza um lead bruto vindo do banco ou realtime.
 * Garante que valores nulos, arrays ou tipos anômalos nunca causem crash na UI.
 */
export function normalizeLead(raw: any) {
  if (!raw || typeof raw !== 'object') {
    return {
      id: `fallback-${Math.random().toString(36).slice(2, 9)}`,
      nome: 'Lead sem nome',
      email: '',
      telefone: '',
      origem: 'A definir',
      origem_pessoa: null,
      consultor_id: null,
      consultor_id_secundario: null,
      status: 'Novo contato',
      status_atendimento: 'novo',
      categoria: 'Comercial',
      criado_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
      notas_pessoais: '',
      notas: '',
      ordem: 0,
      kanban_ativo: true,
      criado_por_nome: '',
      data_venda: null,
      excluido: false,
      arquivado_comercial: false,
      motivo_perda: null,
      etapa_perda: null,
      consultor: null,
      consultor_secundario: null,
    }
  }

  const safeId =
    typeof raw.id === 'string' && raw.id
      ? raw.id
      : String(raw.id || `fallback-${Math.random().toString(36).slice(2, 9)}`)
  const safeNome =
    typeof raw.nome === 'string' && raw.nome.trim() ? raw.nome.trim() : 'Lead sem nome'
  const safeTelefone =
    typeof raw.telefone === 'string' ? raw.telefone : raw.telefone ? String(raw.telefone) : ''
  const safeEmail = typeof raw.email === 'string' ? raw.email : ''
  const safeStatus =
    typeof raw.status === 'string' && raw.status.trim() ? raw.status.trim() : 'Novo contato'
  const safeStatusAtendimento =
    typeof raw.status_atendimento === 'string' ? raw.status_atendimento : 'novo'
  const safeCategoria =
    typeof raw.categoria === 'string' && raw.categoria.trim() ? raw.categoria.trim() : 'Comercial'
  const safeOrigem =
    typeof raw.origem === 'string' && raw.origem.trim() ? raw.origem.trim() : 'A definir'
  const safeOrigemPessoa =
    typeof raw.origem_pessoa === 'string' && raw.origem_pessoa.trim()
      ? raw.origem_pessoa.trim()
      : null
  const safeNotasPessoais =
    typeof raw.notas_pessoais === 'string'
      ? raw.notas_pessoais
      : raw.notas_pessoais
        ? String(raw.notas_pessoais)
        : ''
  const safeNotas = typeof raw.notas === 'string' ? raw.notas : raw.notas ? String(raw.notas) : ''
  const safeCriadoEm =
    typeof raw.criado_em === 'string' && raw.criado_em ? raw.criado_em : new Date().toISOString()
  const safeAtualizadoEm =
    typeof raw.atualizado_em === 'string' && raw.atualizado_em ? raw.atualizado_em : safeCriadoEm

  return {
    ...raw,
    id: safeId,
    nome: safeNome,
    email: safeEmail,
    telefone: safeTelefone,
    origem: safeOrigem,
    origem_pessoa: safeOrigemPessoa,
    consultor_id: raw.consultor_id ?? null,
    consultor_id_secundario: raw.consultor_id_secundario ?? null,
    status: safeStatus,
    status_atendimento: safeStatusAtendimento,
    categoria: safeCategoria,
    criado_em: safeCriadoEm,
    atualizado_em: safeAtualizadoEm,
    notas_pessoais: safeNotasPessoais,
    notas: safeNotas,
    ordem: typeof raw.ordem === 'number' ? raw.ordem : Number(raw.ordem || 0),
    kanban_ativo: raw.kanban_ativo !== undefined ? Boolean(raw.kanban_ativo) : true,
    criado_por_nome: typeof raw.criado_por_nome === 'string' ? raw.criado_por_nome : '',
    data_venda: raw.data_venda ?? null,
    excluido: Boolean(raw.excluido),
    arquivado_comercial: Boolean(raw.arquivado_comercial),
    motivo_perda:
      typeof raw.motivo_perda === 'string' && raw.motivo_perda.trim()
        ? raw.motivo_perda.trim()
        : null,
    etapa_perda:
      typeof raw.etapa_perda === 'string' && raw.etapa_perda.trim() ? raw.etapa_perda.trim() : null,
    consultor: (() => {
      const source = raw.consultor ?? raw.users
      if (Array.isArray(source)) {
        const first = source[0]
        if (
          first &&
          typeof first === 'object' &&
          typeof first.nome === 'string' &&
          first.nome.trim()
        ) {
          return { id: first.id, nome: first.nome.trim() }
        }
        if (typeof first === 'string' && first.trim()) {
          return { nome: first.trim() }
        }
        return null
      }
      if (source && typeof source === 'object') {
        if (typeof source.nome === 'string' && source.nome.trim()) {
          return { id: source.id, nome: source.nome.trim() }
        }
        return null
      }
      if (typeof source === 'string' && source.trim()) {
        return { nome: source.trim() }
      }
      return null
    })(),
    consultor_secundario: (() => {
      const source = raw.consultor_secundario
      if (Array.isArray(source)) {
        const first = source[0]
        if (
          first &&
          typeof first === 'object' &&
          typeof first.nome === 'string' &&
          first.nome.trim()
        ) {
          return { id: first.id, nome: first.nome.trim() }
        }
        if (typeof first === 'string' && first.trim()) {
          return { nome: first.trim() }
        }
        return null
      }
      if (source && typeof source === 'object') {
        if (typeof source.nome === 'string' && source.nome.trim()) {
          return { id: source.id, nome: source.nome.trim() }
        }
        return null
      }
      if (typeof source === 'string' && source.trim()) {
        return { nome: source.trim() }
      }
      return null
    })(),
  }
}

export const fetchLeads = async () => {
  const result = await runWithAuthRecovery<any[]>(() =>
    buscarTodasPaginas(() =>
      supabase
        .from('leads')
        .select(KANBAN_LEAD_COLUMNS)
        .order('criado_em', { ascending: false })
        .order('id', { ascending: true }),
    ),
  )
  if (result.error) throw result.error
  return Array.isArray(result.data) ? result.data.map(normalizeLead) : []
}

export const fetchLeadById = async (id: string) => {
  if (!id) return null
  const result = await runWithAuthRecovery<any>(() =>
    supabase.from('leads').select(KANBAN_LEAD_COLUMNS).eq('id', id).maybeSingle(),
  )
  if (result.error) throw result.error
  const data = result.data
  return data ? normalizeLead(data) : null
}

export interface ComercialUserOption {
  id: string
  nome: string
  foto_perfil?: string | null
  eh_consultor?: boolean | null
  ex_colaborador?: boolean | null
  status?: boolean
}

export const fetchUsers = async (): Promise<ComercialUserOption[]> => {
  // Inclui usuários ativos (status=true) OU ex-colaboradores (ex_colaborador=true)
  const result = await runWithAuthRecovery<any[]>(() =>
    supabase
      .from('users')
      .select('id, nome, foto_perfil, eh_consultor, ex_colaborador, status')
      .or('status.eq.true,ex_colaborador.eq.true'),
  )
  if (result.error) throw result.error
  const data = result.data
  return Array.isArray(data)
    ? data
        .filter((u) => u && typeof u === 'object' && typeof u.id === 'string' && u.id.trim() !== '')
        .map((u) => ({
          id: u.id.trim(),
          nome: (u.nome || u.id).trim(),
          foto_perfil: u.foto_perfil ?? null,
          eh_consultor: Boolean(u.eh_consultor),
          ex_colaborador: Boolean(u.ex_colaborador),
          status: Boolean(u.status),
        }))
    : []
}

export const createLead = async (leadData: any) => {
  const res = await runWithAuthRecovery<any>(() =>
    supabase.from('leads').insert(leadData).select().single(),
  )
  if (res.error) throw res.error
  return res.data
}

// Grava só o que mudou nas notas do lead, em cima da versão atual do banco (erro 1.7).
// antes = notas_pessoais que a tela tinha; depois = notas_pessoais que a tela quer gravar.
export async function salvarNotasLead(
  id: string,
  antes: unknown,
  depois: unknown,
): Promise<string> {
  const a = parseLeadMetadados(antes)
  const d = parseLeadMetadados(depois)
  const set: Record<string, any> = {}
  for (const k of Object.keys(d.meta)) {
    if (JSON.stringify(d.meta[k]) !== JSON.stringify((a.meta as any)[k]))
      set[k] = (d.meta as any)[k]
  }
  const unset = Object.keys(a.meta).filter((k) => !(k in d.meta))
  const alterarTexto = (a.notas || '').trimEnd() !== (d.notas || '').trimEnd()
  const { data, error } = await supabase.rpc('atualizar_notas_lead' as any, {
    p_lead_id: id,
    p_set: set,
    p_unset: unset,
    p_alterar_texto: alterarTexto,
    p_texto: alterarTexto ? d.notas : null,
  })
  if (error) throw error
  return (data as string) ?? ''
}

export const updateLead = async (id: string, leadData: any) => {
  const res = await runWithAuthRecovery<any>(() =>
    supabase.from('leads').update(leadData).eq('id', id).select().single(),
  )
  if (res.error) throw res.error
  const data = res.data

  // Disparo de evento de fase APÓS a mudança já ter acontecido no banco (pós-processamento não bloqueante)
  if (leadData?.status) {
    try {
      triggerConectaPhaseSync({
        leadId: id,
        newStatus: leadData.status,
        origem: data?.origem,
      })
    } catch {
      // Falha silenciosa garantida
    }
  }

  return data
}

export const deleteLead = async (id: string) => {
  const res = await runWithAuthRecovery<any>(() =>
    supabase
      .from('leads')
      .update({ excluido: true } as any)
      .eq('id', id),
  )
  if (res.error) throw res.error
}

export const sendWhatsAppMessage = async (leadId: string, phone: string, message: string) => {
  const { data, error } = await supabase.functions.invoke('send-whatsapp-message', {
    body: { leadId, phone, message },
  })
  if (error) {
    let msg = error.message
    try {
      const body = await (error as any).context?.json?.()
      if (body?.error) msg = body.error
    } catch {
      /* intentionally ignored */
    }
    throw new Error(msg)
  }
  return data as { success: boolean; message: any }
}

export const fetchLeadMessages = async (leadId: string, phone?: string) => {
  // Construir filtro unificado para evitar queries sequenciais redundantes
  const normalizedPhone = (phone || '').replace(/\D/g, '')
  const hasPhone = normalizedPhone.length >= 10
  if (!leadId && !hasPhone) {
    return []
  }

  const montarConsulta = () => {
    let q = supabase
      .from('whatsapp_messages' as any)
      .select('*')
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })

    if (leadId && hasPhone) {
      q = q.or(`lead_id.eq.${leadId},phone.eq.${normalizedPhone}`)
    } else if (leadId) {
      q = q.eq('lead_id', leadId)
    } else if (hasPhone) {
      q = q.eq('phone', normalizedPhone)
    }
    return q
  }

  const { data, error } = await buscarTodasPaginas(montarConsulta)

  if (!error && Array.isArray(data) && data.length > 0) {
    return data
  }

  // Fallback para sessão se não houver mensagens ainda
  if (leadId) {
    const { data: sessionData } = await supabase
      .from('whatsapp_sessions')
      .select('id, step, created_at')
      .eq('lead_id', leadId)
      .maybeSingle()

    if (sessionData) {
      return [
        {
          id: sessionData.id,
          sender_type: 'assistant',
          content: `Sessão do WhatsApp iniciada (Passo: ${sessionData.step}). Aguardando mensagens...`,
          created_at: sessionData.created_at,
        },
      ]
    }
  }

  return []
}

export const moveLeadToClient = async (lead: any, _userId: string) => {
  // Venda numa transação só no banco, com trava por lead (erro 2.1)
  const { data, error } = await supabase.rpc('converter_lead_em_venda' as any, {
    p_lead_id: lead.id,
  })
  if (error) throw new Error('Falha ao registrar a venda: ' + error.message)
  const resultado = (data || {}) as { cliente_id?: string; dossie_id?: string }
  if (resultado.cliente_id) await ensureStorageFolder(resultado.cliente_id)
  return resultado.dossie_id as string
}
