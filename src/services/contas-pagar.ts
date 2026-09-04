import { supabase } from '@/lib/supabase/client'

export interface ContaPagar {
  id: string
  user_id: string | null
  fornecedor: string
  descricao: string | null
  categoria: string | null
  categoria_id?: string | null
  natureza?: string | null
  cliente_id?: string | null
  formulario_comercial_id?: string | null
  valor: number
  data_vencimento: string | null
  data_pagamento: string | null
  status_pagamento: string
  codigo_barras: string | null
  comprovante_url: string | null
  meio_pagamento: string | null
  antecipado: boolean | null
  conta_bancaria_id: string | null
  nota_fiscal_id: string | null
  grupo_id?: string | null
  observacoes?: string | null
  criado_em: string
  atualizado_em: string
}

export interface ContaPagarUpdate {
  descricao?: string | null
  valor?: number
  data_vencimento?: string | null
  fornecedor?: string
  categoria?: string | null
  categoria_id?: string | null
  natureza?: string | null
  cliente_id?: string | null
  formulario_comercial_id?: string | null
  status_pagamento?: string
  meio_pagamento?: string | null
  antecipado?: boolean | null
  conta_bancaria_id?: string | null
  observacoes?: string | null
}

export async function fetchContasPagar(): Promise<{
  data: ContaPagar[] | null
  error: string | null
}> {
  const { data, error } = await supabase
    .from('contas_pagar')
    .select('*')
    .order('criado_em', { ascending: false })
  return { data: data as ContaPagar[] | null, error: error?.message || null }
}

export async function fetchContasPagarSemVencimento(): Promise<{
  data: ContaPagar[] | null
  error: string | null
}> {
  const { data, error } = await supabase
    .from('contas_pagar')
    .select('*')
    .is('data_vencimento', null)
    .order('criado_em', { ascending: false })
  return { data: data as ContaPagar[] | null, error: error?.message || null }
}

export async function updateDataVencimento(
  id: string,
  dataVencimento: string,
  novoStatus?: string,
): Promise<{ data: ContaPagar | null; error: string | null }> {
  const payload: any = {
    data_vencimento: dataVencimento,
    atualizado_em: new Date().toISOString(),
  }
  if (novoStatus) {
    payload.status_pagamento = novoStatus
  }
  const { data, error } = await supabase
    .from('contas_pagar')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  return { data: data as ContaPagar | null, error: error?.message || null }
}

export async function updateContaPagar(
  id: string,
  updates: ContaPagarUpdate,
): Promise<{ data: ContaPagar | null; error: string | null }> {
  const { data, error } = await supabase
    .from('contas_pagar')
    .update({ ...updates, atualizado_em: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  return { data: data as ContaPagar | null, error: error?.message || null }
}

export async function deleteContaPagar(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('contas_pagar').delete().eq('id', id)
  return { error: error?.message || null }
}
