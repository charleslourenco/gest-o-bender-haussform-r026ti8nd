import { supabase } from '@/lib/supabase/client'

export interface ItemNotaFiscal {
  id: string
  nota_fiscal_id: string
  produto_id: string | null
  nome_produto: string
  quantidade: number
  unidade: string
  valor_unitario: number
  created_at: string
}

export async function insertItemNotaFiscal(data: {
  nota_fiscal_id: string
  nome_produto: string
  quantidade: number
  unidade: string
  valor_unitario: number
}): Promise<{ data: ItemNotaFiscal | null; error: string | null }> {
  const { data: result, error } = await supabase
    .from('itens_nota_fiscal')
    .insert({
      nota_fiscal_id: data.nota_fiscal_id,
      produto_id: null,
      nome_produto: data.nome_produto,
      quantidade: data.quantidade,
      unidade: data.unidade,
      valor_unitario: data.valor_unitario,
    })
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  return { data: result as ItemNotaFiscal, error: null }
}

export async function fetchItensByNotaFiscal(
  notaFiscalId: string,
): Promise<{ data: ItemNotaFiscal[] | null; error: string | null }> {
  const { data, error } = await supabase
    .from('itens_nota_fiscal')
    .select('*')
    .eq('nota_fiscal_id', notaFiscalId)
    .order('created_at', { ascending: true })

  if (error) return { data: null, error: error.message }
  return { data: data as ItemNotaFiscal[], error: null }
}
