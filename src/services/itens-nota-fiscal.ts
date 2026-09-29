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
  produto_id?: string | null
}): Promise<{ data: ItemNotaFiscal | null; error: string | null }> {
  const { data: result, error } = await supabase
    .from('itens_nota_fiscal')
    .insert({
      nota_fiscal_id: data.nota_fiscal_id,
      produto_id: data.produto_id || null,
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

export async function syncItensNotaFiscal(
  notaFiscalId: string,
  itens: Array<{
    produto?: string
    nome?: string
    quantidade: number
    unidade?: string
    preco_unitario?: number
    valor_unitario?: number
    item_id?: string | null
  }>,
): Promise<{ error: string | null }> {
  try {
    // 1. Apagar itens existentes da nota
    const { error: delErr } = await supabase
      .from('itens_nota_fiscal')
      .delete()
      .eq('nota_fiscal_id', notaFiscalId)
    if (delErr) return { error: delErr.message }

    if (!itens || itens.length === 0) return { error: null }

    const rows = itens.map((it) => ({
      nota_fiscal_id: notaFiscalId,
      produto_id: it.item_id || null,
      nome_produto: (it.produto || it.nome || 'Item sem nome').trim(),
      quantidade: Number(it.quantidade) || 0,
      unidade: (it.unidade || 'UN').trim(),
      valor_unitario: Number(it.preco_unitario ?? it.valor_unitario ?? 0),
    }))

    const { error: insErr } = await supabase.from('itens_nota_fiscal').insert(rows)
    if (insErr) return { error: insErr.message }
    return { error: null }
  } catch (err: any) {
    return { error: err.message || 'Erro ao sincronizar itens_nota_fiscal' }
  }
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
