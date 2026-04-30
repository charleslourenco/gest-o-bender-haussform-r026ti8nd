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

export const moveLeadToClient = async (lead: any) => {
  const { error: err1 } = await supabase.from('clientes').insert({
    nome: lead.nome,
    email: lead.email,
    telefone: lead.telefone,
    status: 'Ativo',
  })
  if (err1) throw err1

  const { error: err2 } = await supabase.from('leads').delete().eq('id', lead.id)
  if (err2) throw err2
}
