import { supabase } from '@/lib/supabase/client'

export const fetchLeads = async () => {
  const { data, error } = await supabase
    .from('leads')
    .select('*, consultor:users!leads_consultor_id_fkey(nome)')
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
  const { error } = await supabase.from('leads').delete().eq('id', id)
  if (error) throw error
}

export const moveLeadToClient = async (lead: any, userId: string) => {
  // Passo 1: Verificar se o cliente já existe (pelo email)
  const { data: existingClient } = await supabase
    .from('clientes')
    .select('id')
    .eq('email', lead.email)
    .maybeSingle()

  let novo_cliente_id = existingClient?.id

  // Passo 2A: Se o cliente não existir, criar
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
    if (err1) throw err1
    novo_cliente_id = newClient.id
  }

  // Passo 3: Criar o Dossiê
  const { data: novoDossie, error: err3 } = await supabase
    .from('dossies')
    .insert({
      cliente_id: novo_cliente_id,
      user_id: userId,
      status: 'em_documentacao',
    })
    .select('id')
    .single()
  if (err3) throw err3
  const novo_dossie_id = novoDossie.id

  // Passo 4: Criar o Formulário Comercial vazio
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
  if (err4) throw err4
  const novo_formulario_id = novoForm.id

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
  if (err2) throw err2

  return novo_dossie_id
}
