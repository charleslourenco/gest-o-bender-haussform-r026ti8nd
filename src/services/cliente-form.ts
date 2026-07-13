import { supabase } from '@/lib/supabase/client'

export async function createNewClientFlow(userId: string): Promise<string> {
  const timestamp = Date.now()

  const { data: newLead, error: leadError } = await supabase
    .from('leads')
    .insert({
      nome: 'Novo Cliente',
      email: `novo.cliente.${timestamp}@placeholder.com`,
      telefone: '',
      origem: 'Cadastro Direto',
      status: 'Vendido',
      data_venda: new Date().toISOString(),
      criado_por_nome: 'Sistema',
      kanban_ativo: false,
    })
    .select('id')
    .single()

  if (leadError) throw leadError

  const { data: newClient, error: clientError } = await supabase
    .from('clientes')
    .insert({
      nome: 'Novo Cliente',
      email: '',
      telefone: '',
      lead_id: newLead.id,
      usuario_id: userId,
      status: 'Ativo',
    })
    .select('id')
    .single()

  if (clientError) throw clientError

  const { data: newDossie, error: dossieError } = await supabase
    .from('dossies')
    .insert({
      cliente_id: newClient.id,
      user_id: userId,
      status: 'em_documentacao',
    })
    .select('id')
    .single()

  if (dossieError) throw dossieError

  const { data: newForm, error: formError } = await supabase
    .from('formulario_comercial')
    .insert({
      cliente_id: newClient.id,
      lead_id: newLead.id,
      user_id: userId,
      etapa_atual: 1,
      produtos_servicos: [],
      pagamentos: [],
      datas: {},
    })
    .select('id')
    .single()

  if (formError) throw formError

  await supabase
    .from('dossies')
    .update({ formulario_comercial_id: newForm.id })
    .eq('id', newDossie.id)

  return newDossie.id
}
