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
  arquivados: 'Arquivados',
}

export interface MontadorCard {
  card_id: string
  nome_produto: string
  cliente_nome: string | null
  status_analise: string
  alocado_em: string | null
  arquivado: boolean
  group: string
}

export interface MontadorFichaData {
  cards: MontadorCard[]
}

const KANBAN_STATUS_SET = new Set<string>(KANBAN_STATUS_LIST)

export async function fetchMontadorFicha(montadorId: string): Promise<MontadorFichaData> {
  const { data: alocacoes, error: allocError } = await supabase
    .from('alocacao_montagem')
    .select('card_id, criado_em')
    .eq('montador_id', montadorId)

  if (allocError) throw allocError
  if (!alocacoes || alocacoes.length === 0) return { cards: [] }

  const alocMap = new Map<string, string>()
  for (const a of alocacoes) {
    if (a.card_id && !alocMap.has(a.card_id)) {
      alocMap.set(a.card_id, a.criado_em)
    }
  }
  const cardIds = Array.from(alocMap.keys())
  if (cardIds.length === 0) return { cards: [] }

  const { data: cards, error: cardsError } = await supabase
    .from('produtos_servicos_projeto')
    .select(
      `id, nome_produto, status_analise, arquivado_montagem, excluido_montagem, cliente:clientes(nome)`,
    )
    .in('id', cardIds)
    .eq('excluido_montagem', false)

  if (cardsError) throw cardsError

  const seen = new Set<string>()
  const normalized: MontadorCard[] = []

  for (const c of cards || []) {
    const id = (c as any).id as string
    if (!id || seen.has(id)) continue
    seen.add(id)

    const arquivado = !!(c as any).arquivado_montagem
    const status = ((c as any).status_analise as string) || ''
    const inKanban = KANBAN_STATUS_SET.has(status)

    const isActiveKanban = !arquivado && inKanban
    const isArchived = arquivado
    if (!isActiveKanban && !isArchived) continue

    const clienteRaw = Array.isArray((c as any)?.cliente)
      ? (c as any).cliente[0]
      : (c as any)?.cliente

    const group = arquivado && !inKanban ? 'arquivados' : status

    normalized.push({
      card_id: id,
      nome_produto: (c as any).nome_produto || '—',
      cliente_nome: clienteRaw?.nome ?? null,
      status_analise: status,
      alocado_em: alocMap.get(id) ?? null,
      arquivado,
      group,
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
