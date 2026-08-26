import { supabase } from '@/lib/supabase/client'
import { phoneSearchVariants, ensureSaleForLead } from '@/services/vendas'

export const fetchLeads = async () => {
  const { data, error } = await supabase
    .from('leads')
    .select('*, consultor:users!leads_consultor_id_fkey(nome)')
    .eq('arquivado_comercial' as any, false)
    .eq('excluido' as any, false)
    .order('criado_em', { ascending: false })
  if (error) throw error
  return data
}

export const fetchUsers = async () => {
  const { data, error } = await supabase.from('users').select('id, nome').eq('status', true)
  if (error) throw error
  return data
}

export const createLead = async (leadData: any) => {
  const { data, error } = await supabase.from('leads').insert(leadData).select().single()
  if (error) throw error
  return data
}

export const updateLead = async (id: string, leadData: any) => {
  const { data, error } = await supabase
    .from('leads')
    .update(leadData)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteLead = async (id: string) => {
  const { error } = await supabase
    .from('leads')
    .update({ excluido: true } as any)
    .eq('id', id)
  if (error) throw error
}

export const sendWhatsAppMessage = async (leadId: string, phone: string, message: string) => {
  const { data, error } = await supabase.functions.invoke('send-whatsapp-message', {
    body: { leadId, phone, message },
  })
  if (error) throw error
  return data as { success: boolean; message: any }
}

export const fetchLeadMessages = async (leadId: string, phone: string) => {
  let { data, error } = await supabase
    .from('whatsapp_messages' as any)
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: true })

  if (error || !data || data.length === 0) {
    const { data: phoneData, error: phoneError } = await supabase
      .from('whatsapp_messages' as any)
      .select('*')
      .eq('phone', phone)
      .order('created_at', { ascending: true })

    if (!phoneError && phoneData && phoneData.length > 0) {
      data = phoneData
    }
  }

  if (!data || data.length === 0) {
    const { data: sessionData } = await supabase
      .from('whatsapp_sessions')
      .select('*')
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

  return data || []
}

export const moveLeadToClient = async (lead: any, userId: string) => {
  // Passo 1: Verificar se o cliente já existe por EMAIL ou TELEFONE (normalizado)
  let novo_cliente_id: string | null = null

  if (lead.email && lead.email.trim() !== '') {
    const { data: existingClients, error: lookupErr } = await supabase
      .from('clientes')
      .select('id, excluido')
      .eq('email', lead.email)
      .order('excluido', { ascending: true })
      .order('criado_em', { ascending: true })
      .limit(1)

    if (lookupErr) {
      throw new Error('Falha ao verificar cliente existente: ' + lookupErr.message)
    }
    if (existingClients && existingClients.length > 0) {
      novo_cliente_id = existingClients[0].id
    }
  }

  // Critério secundário: telefone normalizado (apenas dígitos)
  if (!novo_cliente_id && lead.telefone) {
    const phoneVariants = phoneSearchVariants(lead.telefone)
    if (phoneVariants.length > 0) {
      const orFilter = phoneVariants.map((p) => `telefone.eq.${p}`).join(',')
      const { data: phoneClients, error: phoneErr } = await supabase
        .from('clientes')
        .select('id, excluido')
        .or(orFilter)
        .order('excluido', { ascending: true })
        .order('criado_em', { ascending: true })
        .limit(1)

      if (phoneErr) {
        throw new Error('Falha ao verificar cliente por telefone: ' + phoneErr.message)
      }
      if (phoneClients && phoneClients.length > 0) {
        novo_cliente_id = phoneClients[0].id
      }
    }
  }

  // Passo 2: Se o cliente não existir, criar
  if (!novo_cliente_id) {
    const { data: newClient, error: err1 } = await supabase
      .from('clientes')
      .insert({
        nome: lead.nome,
        email: lead.email,
        telefone: lead.telefone,
        lead_id: lead.id,
        usuario_id: userId,
        status: 'Ativo',
      })
      .select('id')
      .single()
    if (err1) throw new Error('Falha ao criar cliente: ' + err1.message)
    novo_cliente_id = newClient.id
  }

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
}
