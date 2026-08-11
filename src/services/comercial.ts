import { supabase } from '@/lib/supabase/client'

export const fetchLeads = async () => {
  const { data, error } = await supabase
    .from('leads')
    .select('*, consultor:users!leads_consultor_id_fkey(nome)')
    .eq('arquivado_comercial' as any, false)
    .eq('excluido' as any, false)
    .order('ordem', { ascending: true })
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
  // Passo 1: Verificar se o cliente já existe (pelo email) — tolera duplicatas acidentais
  let novo_cliente_id: string | null = null

  if (lead.email && lead.email.trim() !== '') {
    const { data: existingClients, error: lookupErr } = await supabase
      .from('clientes')
      .select('id, excluido')
      .eq('email', lead.email)
      .order('excluido', { ascending: true })
      .order('criado_em', { ascending: true })
      .limit(2)

    if (lookupErr) {
      throw new Error('Falha ao verificar cliente existente: ' + lookupErr.message)
    }

    if (existingClients && existingClients.length > 0) {
      novo_cliente_id = existingClients[0].id
      if (existingClients.length > 1) {
        console.warn(
          `[moveLeadToClient] Cliente com email ${lead.email} tem registros duplicados. Reutilizando o primeiro (ID: ${novo_cliente_id}).`,
        )
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

  // Passo 3: Reutilizar formulário comercial existente para este lead ou criar novo
  // (formulario_comercial tem constraint UNIQUE em lead_id)
  let novo_formulario_id: string
  const { data: existingForms, error: formLookupErr } = await supabase
    .from('formulario_comercial')
    .select('id')
    .eq('lead_id', lead.id)
    .order('criado_em', { ascending: false })
    .limit(1)

  if (formLookupErr) {
    throw new Error('Falha ao verificar formulário existente: ' + formLookupErr.message)
  }

  if (existingForms && existingForms.length > 0) {
    novo_formulario_id = existingForms[0].id
  } else {
    const { data: novoForm, error: err4 } = await supabase
      .from('formulario_comercial')
      .insert({
        cliente_id: novo_cliente_id,
        lead_id: lead.id,
        user_id: userId,
        etapa_atual: 1,
        produtos_servicos: [],
        pagamentos: [],
        datas: {},
      })
      .select('id')
      .single()
    if (err4) throw new Error('Falha ao criar formulário comercial: ' + err4.message)
    novo_formulario_id = novoForm.id
  }

  // Passo 4: Reutilizar dossiê existente para este formulário ou criar novo
  let novo_dossie_id: string
  const { data: existingDossies, error: dossieLookupErr } = await supabase
    .from('dossies')
    .select('id')
    .eq('formulario_comercial_id', novo_formulario_id)
    .order('criado_em', { ascending: false })
    .limit(1)

  if (dossieLookupErr) {
    throw new Error('Falha ao verificar dossiê existente: ' + dossieLookupErr.message)
  }

  if (existingDossies && existingDossies.length > 0) {
    novo_dossie_id = existingDossies[0].id
  } else {
    const { data: orphanDossies } = await supabase
      .from('dossies')
      .select('id')
      .eq('cliente_id', novo_cliente_id)
      .is('formulario_comercial_id', null)
      .order('criado_em', { ascending: false })
      .limit(1)

    if (orphanDossies && orphanDossies.length > 0) {
      novo_dossie_id = orphanDossies[0].id
    } else {
      const { data: novoDossie, error: err3 } = await supabase
        .from('dossies')
        .insert({
          cliente_id: novo_cliente_id,
          user_id: userId,
          status: 'em_documentacao',
          formulario_comercial_id: novo_formulario_id,
        })
        .select('id')
        .single()
      if (err3) throw new Error('Falha ao criar dossiê: ' + err3.message)
      novo_dossie_id = novoDossie.id
    }
  }

  // Garantir que o dossiê esteja vinculado ao formulário
  await supabase
    .from('dossies')
    .update({ formulario_comercial_id: novo_formulario_id })
    .eq('id', novo_dossie_id)

  // Passo 5: Criar pasta no Storage (empty placeholder)
  const emptyFile = new Blob([''], { type: 'text/plain' })
  await supabase.storage
    .from('dossiers')
    .upload(`${novo_cliente_id}/.emptyFolderPlaceholder`, emptyFile, { upsert: true })

  // Atualizar o lead
  const { error: err2 } = await supabase
    .from('leads')
    .update({ status: 'Vendido' })
    .eq('id', lead.id)
  if (err2) throw new Error('Falha ao atualizar lead: ' + err2.message)

  return novo_dossie_id
}
