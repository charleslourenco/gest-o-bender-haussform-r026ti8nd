import { supabase } from '@/lib/supabase/client'

export interface ContaReceber {
  id: string
  user_id: string | null
  cliente_id: string | null
  formulario_comercial_id: string | null
  numero_parcela: string | null
  data_vencimento: string | null
  valor: number
  status_pagamento: string
  data_pagamento: string | null
  criado_em: string
  atualizado_em: string
  meio_pagamento: string | null
  antecipado: boolean | null
  comprovante_url: string | null
  descricao: string | null
  categoria: string | null
  conta_bancaria_id: string | null
}

export interface ContaReceberUpdate {
  descricao?: string | null
  valor?: number
  data_vencimento?: string | null
  cliente_id?: string | null
  categoria?: string | null
  status_pagamento?: string
  meio_pagamento?: string | null
  antecipado?: boolean | null
  conta_bancaria_id?: string | null
}

export async function fetchContasReceber(): Promise<{
  data: ContaReceber[] | null
  error: string | null
}> {
  const { data, error } = await supabase
    .from('contas_receber')
    .select('*, cliente:clientes(nome)')
    .order('criado_em', { ascending: false })
  return { data: data as ContaReceber[] | null, error: error?.message || null }
}

export async function updateContaReceber(
  id: string,
  updates: ContaReceberUpdate,
): Promise<{ data: ContaReceber | null; error: string | null }> {
  const { data, error } = await supabase
    .from('contas_receber')
    .update({ ...updates, atualizado_em: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  return { data: data as ContaReceber | null, error: error?.message || null }
}

export async function deleteContaReceber(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('contas_receber').delete().eq('id', id)
  return { error: error?.message || null }
}
