import { supabase } from '@/lib/supabase/client'
import { phoneSearchVariants, ensureSaleForLead } from '@/services/vendas'
import { triggerConectaPhaseSync } from '@/services/conecta-sync'
import { runWithAuthRecovery } from '@/lib/supabase/auth-recovery'
import type { Lead } from '@/types'
export type { Lead }

// Colunas necessárias para o Kanban, filtros, edição inline e exibição sem payloads excessivos
export const KANBAN_LEAD_COLUMNS =
  'id, nome, email, telefone, origem, origem_pessoa, consultor_id, consultor_id_secundario, status, status_atendimento, categoria, criado_em, atualizado_em, notas_pessoais, notas, ordem, kanban_ativo, criado_por_nome, data_venda, excluido, arquivado_comercial, motivo_perda, etapa_perda, consultor:users!leads_consultor_id_fkey(id, nome, ex_colaborador), consultor_secundario:users!leads_consultor_id_secundario_fkey(id, nome, ex_colaborador)'

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
    supabase.from('leads').select(KANBAN_LEAD_COLUMNS).order('criado_em', { ascending: false }),
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
  const normalizedPhone = phone ? phone.trim() : ''
  let query = supabase
    .from('whatsapp_messages' as any)
    .select('*')
    .order('created_at', { ascending: true })

  if (leadId && normalizedPhone) {
    query = query.or(`lead_id.eq.${leadId},phone.eq.${normalizedPhone}`)
  } else if (leadId) {
    query = query.eq('lead_id', leadId)
  } else if (normalizedPhone) {
    query = query.eq('phone', normalizedPhone)
  } else {
    return []
  }

  const { data, error } = await query

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

export const moveLeadToClient = async (lead: any, userId: string) => {
  // Passo 1: Verificar se o cliente já existe por EMAIL ou TELEFONE (apenas clientes não excluídos)
  let novo_cliente_id: string | null = null

  if (lead.email && lead.email.trim() !== '') {
    const { data: existingClients, error: lookupErr } = await supabase
      .from('clientes')
      .select('id, excluido')
      .eq('email', lead.email.trim())
      .eq('excluido', false)
      .order('criado_em', { ascending: false })
      .limit(1)

    if (lookupErr) {
      throw new Error('Falha ao verificar cliente existente: ' + lookupErr.message)
    }
    if (existingClients && existingClients.length > 0) {
      novo_cliente_id = existingClients[0].id
    }
  }

  // Critério secundário: telefone normalizado (apenas dígitos) em clientes não excluídos
  if (!novo_cliente_id && lead.telefone) {
    const phoneVariants = phoneSearchVariants(lead.telefone)
    if (phoneVariants.length > 0) {
      const orFilter = phoneVariants.map((p) => `telefone.eq.${p}`).join(',')
      const { data: phoneClients, error: phoneErr } = await supabase
        .from('clientes')
        .select('id, excluido')
        .eq('excluido', false)
        .or(orFilter)
        .order('criado_em', { ascending: false })
        .limit(1)

      if (phoneErr) {
        throw new Error('Falha ao verificar cliente por telefone: ' + phoneErr.message)
      }
      if (phoneClients && phoneClients.length > 0) {
        novo_cliente_id = phoneClients[0].id
      }
    }
  }

  // Passo 1b: Se não encontrou cliente ativo, verificar se existe cliente excluído para reativar
  if (!novo_cliente_id) {
    let clienteExcluidoId: string | null = null

    if (lead.email && lead.email.trim() !== '') {
      const { data: excByEmail } = await supabase
        .from('clientes')
        .select('id')
        .eq('email', lead.email.trim())
        .eq('excluido', true)
        .order('criado_em', { ascending: false })
        .limit(1)

      if (excByEmail && excByEmail.length > 0) {
        clienteExcluidoId = excByEmail[0].id
      }
    }

    if (!clienteExcluidoId && lead.telefone) {
      const phoneVariants = phoneSearchVariants(lead.telefone)
      if (phoneVariants.length > 0) {
        const orFilter = phoneVariants.map((p) => `telefone.eq.${p}`).join(',')
        const { data: excByPhone } = await supabase
          .from('clientes')
          .select('id')
          .eq('excluido', true)
          .or(orFilter)
          .order('criado_em', { ascending: false })
          .limit(1)

        if (excByPhone && excByPhone.length > 0) {
          clienteExcluidoId = excByPhone[0].id
        }
      }
    }

    if (clienteExcluidoId) {
      const { error: reactivateErr } = await supabase
        .from('clientes')
        .update({
          excluido: false,
          usuario_id: userId,
          status: 'Ativo',
        })
        .eq('id', clienteExcluidoId)

      if (!reactivateErr) {
        novo_cliente_id = clienteExcluidoId
      }
    }
  }

  // Passo 2: Se o cliente ainda não existir, criar um novo cliente
  let isBrandNewClient = false
  if (!novo_cliente_id) {
    const safeNome = (lead.nome ?? '').trim() || 'Cliente sem nome'
    const safeEmail = (lead.email ?? '').trim()
    const safeTelefone = (lead.telefone ?? '').trim()

    const { data: newClient, error: err1 } = await supabase
      .from('clientes')
      .insert({
        nome: safeNome,
        email: safeEmail,
        telefone: safeTelefone,
        lead_id: lead.id,
        usuario_id: userId,
        status: 'Ativo',
      })
      .select('id')
      .single()
    if (err1) throw new Error('Falha ao criar cliente: ' + err1.message)
    novo_cliente_id = newClient.id
    isBrandNewClient = true
  }

  // Passo 3 e 4: Criar venda independente e atualizar lead para "Vendido"
  // Se o cliente foi recém-criado nesta chamada e o Passo 3 ou 4 falhar, marcar como excluido = true para não deixar cliente órfão/sem contrato.
  try {
    // Passo 3: Criar/reutilizar venda independente (formulário + dossiê + pasta storage)
    const { dossieId: novo_dossie_id } = await ensureSaleForLead({
      leadId: lead.id,
      clienteId: novo_cliente_id,
      userId,
    })

    // Passo 4: Atualizar o lead para "Vendido"
    const { error: err2 } = await supabase
      .from('leads')
      .update({ status: 'Vendido' })
      .eq('id', lead.id)
    if (err2) throw new Error('Falha ao atualizar lead: ' + err2.message)

    return novo_dossie_id
  } catch (err) {
    if (isBrandNewClient && novo_cliente_id) {
      try {
        await supabase.from('clientes').update({ excluido: true }).eq('id', novo_cliente_id)
      } catch (cleanupErr) {
        console.warn('[moveLeadToClient] Falha ao marcar cliente órfão como excluído:', cleanupErr)
      }
    }
    throw err
  }
}
