import { supabase } from '@/lib/supabase/client'

export async function arquivarLead(id: string): Promise<void> {
  const { error } = await supabase
    .from('leads')
    .update({ arquivado_comercial: true } as any)
    .eq('id', id)
  if (error) throw error
}

export async function desarquivarLead(id: string): Promise<void> {
  const { error } = await supabase
    .from('leads')
    .update({ arquivado_comercial: false } as any)
    .eq('id', id)
  if (error) throw error
}

export async function fetchLeadsArquivados() {
  const { data, error } = await supabase
    .from('leads')
    .select('*, consultor:users!leads_consultor_id_fkey(nome)')
    .eq('arquivado_comercial' as any, true)
    .order('atualizado_em', { ascending: false })
  if (error) throw error
  return data
}

export async function arquivarProducao(id: string): Promise<void> {
  const { error } = await supabase
    .from('produtos_servicos_projeto')
    .update({ arquivado_producao: true } as any)
    .eq('id', id)
  if (error) throw error
}

export async function desarquivarProducao(id: string): Promise<void> {
  const { error } = await supabase
    .from('produtos_servicos_projeto')
    .update({ arquivado_producao: false } as any)
    .eq('id', id)
  if (error) throw error
}

export async function fetchProducaoArquivados() {
  const { data, error } = await supabase
    .from('produtos_servicos_projeto')
    .select('*, clientes(nome), formulario_comercial(nome_cliente, clientes(nome))')
    .eq('arquivado_producao' as any, true)
    .order('atualizado_em', { ascending: false })
  if (error) throw error
  return data
}

export async function arquivarMontagem(id: string): Promise<void> {
  const { error } = await supabase
    .from('produtos_servicos_projeto')
    .update({ arquivado_montagem: true } as any)
    .eq('id', id)
  if (error) throw error
}

export async function desarquivarMontagem(id: string): Promise<void> {
  const { error } = await supabase
    .from('produtos_servicos_projeto')
    .update({ arquivado_montagem: false } as any)
    .eq('id', id)
  if (error) throw error
}

export async function fetchMontagemArquivados() {
  const { data, error } = await supabase
    .from('produtos_servicos_projeto')
    .select('*, clientes(nome), formulario_comercial(nome_cliente, clientes(nome))')
    .eq('arquivado_montagem' as any, true)
    .order('atualizado_em', { ascending: false })
  if (error) throw error
  return data
}

export async function arquivarAnalise(id: string): Promise<void> {
  const { error } = await supabase
    .from('produtos_servicos_projeto')
    .update({ arquivado_analise: true } as any)
    .eq('id', id)
  if (error) throw error
}

export async function desarquivarAnalise(id: string): Promise<void> {
  const { error } = await supabase
    .from('produtos_servicos_projeto')
    .update({ arquivado_analise: false } as any)
    .eq('id', id)
  if (error) throw error
}

export async function fetchAnaliseArquivados() {
  const { data, error } = await supabase
    .from('produtos_servicos_projeto')
    .select('*, clientes(nome), formulario_comercial(nome_cliente, clientes(nome))')
    .eq('arquivado_analise' as any, true)
    .order('atualizado_em', { ascending: false })
  if (error) throw error
  return data
}

export async function arquivarAcompanhamento(id: string): Promise<void> {
  const { error } = await supabase
    .from('acompanhamentos')
    .update({ arquivado_acompanhamento: true } as any)
    .eq('id', id)
  if (error) throw error
}

export async function desarquivarAcompanhamento(id: string): Promise<void> {
  const { error } = await supabase
    .from('acompanhamentos')
    .update({ arquivado_acompanhamento: false } as any)
    .eq('id', id)
  if (error) throw error
}

export async function fetchAcompanhamentosArquivados() {
  const { data, error } = await supabase
    .from('acompanhamentos')
    .select('*, responsaveis_acompanhamentos(nome)')
    .eq('arquivado_acompanhamento' as any, true)
    .order('data_atualizacao', { ascending: false })
  if (error) throw error
  return data
}
