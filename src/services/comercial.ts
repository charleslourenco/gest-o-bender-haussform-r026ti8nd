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
  // 1. Create client if not exists to maintain referential integrity
  const { data: existingClient } = await supabase
    .from('clientes')
    .select('id')
    .eq('lead_id', lead.id)
    .maybeSingle()

  if (!existingClient) {
    const { error: err1 } = await supabase.from('clientes').insert({
      lead_id: lead.id,
      nome: lead.nome,
      email: lead.email,
      telefone: lead.telefone,
      status: 'Ativo',
    })
    if (err1) throw err1
  }

  // 2. Update lead status to "Vendido" instead of deleting it
  const { error: err2 } = await supabase
    .from('leads')
    .update({ status: 'Vendido' })
    .eq('id', lead.id)
  if (err2) throw err2
}
