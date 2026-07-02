import { supabase } from '@/lib/supabase/client'

export interface ItemAlias {
  id: string
  descricao_nota: string
  item_id: string
  usuario_id: string | null
  criado_em: string
}

export interface AliasWithItem extends ItemAlias {
  estoque_itens: { id: string; nome: string; quantidade: number } | null
}

export async function fetchAliases(descricoes: string[]): Promise<AliasWithItem[]> {
  if (!descricoes || descricoes.length === 0) return []
  const { data, error } = await supabase
    .from('estoque_item_aliases')
    .select('*, estoque_itens(id, nome, quantidade)')
    .in('descricao_nota', descricoes)
  if (error) {
    console.error('Error fetching aliases:', error)
    return []
  }
  return (data || []) as AliasWithItem[]
}

export async function saveAlias(
  descricao_nota: string,
  item_id: string,
  usuario_id?: string,
): Promise<ItemAlias | null> {
  const { data, error } = await supabase
    .from('estoque_item_aliases')
    .upsert(
      { descricao_nota, item_id, usuario_id: usuario_id || null },
      { onConflict: 'descricao_nota' },
    )
    .select()
    .single()
  if (error) {
    console.error('Error saving alias:', error)
    throw error
  }
  return data as ItemAlias
}

export async function deleteAlias(id: string): Promise<void> {
  const { error } = await supabase.from('estoque_item_aliases').delete().eq('id', id)
  if (error) throw error
}
