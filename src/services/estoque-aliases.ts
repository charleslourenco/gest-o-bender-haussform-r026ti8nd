import { supabase } from '@/lib/supabase/client'
import { normalizeDescription } from '@/lib/normalize'

export interface ItemAlias {
  id: string
  descricao_nota: string
  descricao_normalizada: string | null
  item_id: string
  usuario_id: string | null
  criado_em: string
}

export interface AliasWithItem extends ItemAlias {
  estoque_itens: { id: string; nome: string; quantidade: number } | null
}

export async function fetchAliases(descricoes: string[]): Promise<AliasWithItem[]> {
  if (!descricoes || descricoes.length === 0) return []

  const normalizedDescricoes = Array.from(
    new Set(descricoes.map(normalizeDescription).filter(Boolean)),
  )

  const [exactRes, normRes] = await Promise.all([
    supabase
      .from('estoque_item_aliases')
      .select('*, estoque_itens(id, nome, quantidade)')
      .in('descricao_nota', descricoes),
    normalizedDescricoes.length > 0
      ? supabase
          .from('estoque_item_aliases')
          .select('*, estoque_itens(id, nome, quantidade)')
          .in('descricao_normalizada', normalizedDescricoes)
      : Promise.resolve({ data: null as AliasWithItem[] | null, error: null as any }),
  ])

  if (exactRes.error) console.error('Error fetching aliases (exact):', exactRes.error)
  if (normRes.error) console.error('Error fetching aliases (normalized):', normRes.error)

  const merged = new Map<string, AliasWithItem>()
  for (const a of (exactRes.data || []) as AliasWithItem[]) merged.set(a.id, a)
  for (const a of (normRes.data || []) as AliasWithItem[]) merged.set(a.id, a)
  return Array.from(merged.values())
}

export async function saveAlias(
  descricao_nota: string,
  item_id: string,
  usuario_id?: string,
): Promise<ItemAlias | null> {
  const { data, error } = await supabase
    .from('estoque_item_aliases')
    .upsert(
      {
        descricao_nota,
        descricao_normalizada: normalizeDescription(descricao_nota),
        item_id,
        usuario_id: usuario_id || null,
      },
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

export async function upsertAliasesBatch(
  rows: Array<{ descricao_nota: string; item_id: string; usuario_id?: string | null }>,
): Promise<void> {
  if (!rows || rows.length === 0) return
  const payload = rows.map((r) => ({
    descricao_nota: r.descricao_nota,
    descricao_normalizada: normalizeDescription(r.descricao_nota),
    item_id: r.item_id,
    usuario_id: r.usuario_id ?? null,
  }))
  const { error } = await supabase
    .from('estoque_item_aliases')
    .upsert(payload, { onConflict: 'descricao_nota' })
  if (error) console.error('Error upserting aliases batch:', error)
}

export async function deleteAlias(id: string): Promise<void> {
  const { error } = await supabase.from('estoque_item_aliases').delete().eq('id', id)
  if (error) throw error
}
