import { supabase } from '@/lib/supabase/client'

export const KANBAN_STATUS_LIST = [
  'aguardando_agenda',
  'transporte',
  'montagem',
  'item_terceirizado',
  'pendencia',
  'assistencia',
  'concluido',
]

export const STATUS_LABELS: Record<string, string> = {
  aguardando_agenda: 'Aguardando Agenda',
  transporte: 'Transporte',
  montagem: 'Em Montagem',
  item_terceirizado: 'Item Terceirizado',
  pendencia: 'Pendência',
  assistencia: 'Assistência',
  concluido: 'Concluído',
}

export interface MontadorCard {
  card_id: string
  nome_produto: string
  cliente_nome: string | null
  status_analise: string
  alocado_em: string | null
  arquivado: boolean
}

export interface MontadorFichaData {
  cards: MontadorCard[]
}

export async function fetchMontadorFicha(montadorId: string): Promise<MontadorFichaData> {
  const { data: alocacoes, error: allocError } = await supabase
    .from('alocacao_montagem')
    .select('card_id, criado_em')
    .eq('montador_id', montadorId)

  if (allocError) throw allocError
  if (!alocacoes || alocacoes.length === 0) return { cards: [] }

  const cardIds = alocacoes.map((a) => a.card_id).filter(Boolean)
  const alocMap = new Map(alocacoes.map((a) => [a.card_id, a.criado_em]))

  const { data: cards, error: cardsError } = await supabase
    .from('produtos_servicos_projeto')
    .select(
      `id, nome_produto, status_analise, arquivado_montagem, excluido_montagem, cliente:clientes(nome)`,
    )
    .in('id', cardIds)
    .in('status_analise', KANBAN_STATUS_LIST)
    .eq('excluido_montagem', false)

  if (cardsError) throw cardsError

  const seen = new Set<string>()
  const normalized: MontadorCard[] = []
  for (const c of cards || []) {
    if (seen.has(c.id)) continue
    seen.add(c.id)
    const clienteRaw = Array.isArray((c as any)?.cliente)
      ? (c as any).cliente[0]
      : (c as any)?.cliente
    normalized.push({
      card_id: c.id,
      nome_produto: (c as any).nome_produto || '—',
      cliente_nome: clienteRaw?.nome ?? null,
      status_analise: (c as any).status_analise || '',
      alocado_em: alocMap.get(c.id) ?? null,
      arquivado: !!(c as any).arquivado_montagem,
    })
  }

  return { cards: normalized }
}

export async function updateMontadorComissao(montadorId: string, comissao: number): Promise<void> {
  const { error } = await supabase
    .from('montadores')
    .update({ comissao_percentual: comissao, atualizado_em: new Date().toISOString() })
    .eq('id', montadorId)
  if (error) throw error
}
