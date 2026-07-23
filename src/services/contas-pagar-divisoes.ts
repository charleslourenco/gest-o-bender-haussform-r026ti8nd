import { supabase } from '@/lib/supabase/client'

export interface ContaPagarDivisao {
  id?: string
  conta_pagar_id: string
  descricao: string
  valor: number
  criado_em?: string
}

export interface DivisaoInput {
  descricao: string
  valor: number
}

export async function fetchDivisoesByConta(
  contaPagarId: string,
): Promise<{ data: ContaPagarDivisao[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from('contas_pagar_divisoes')
    .select('*')
    .eq('conta_pagar_id', contaPagarId)
    .order('criado_em', { ascending: true })
  return { data: data as ContaPagarDivisao[] | null, error: error?.message || null }
}

export async function insertDivisoes(
  contaPagarId: string,
  divisoes: DivisaoInput[],
): Promise<{ error: string | null }> {
  if (!divisoes.length) return { error: null }
  const rows = divisoes.map((d) => ({
    conta_pagar_id: contaPagarId,
    descricao: d.descricao,
    valor: d.valor,
  }))
  const { error } = await supabase.from('contas_pagar_divisoes').insert(rows)
  return { error: error?.message || null }
}

export async function deleteDivisoesByConta(
  contaPagarId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('contas_pagar_divisoes')
    .delete()
    .eq('conta_pagar_id', contaPagarId)
  return { error: error?.message || null }
}
