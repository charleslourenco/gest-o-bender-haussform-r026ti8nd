import { supabase } from '@/lib/supabase/client'

export interface DetalheMontagemCard {
  card_id: string
  card_nome: string
  cliente_id: string | null
  cliente_nome: string
  data_inicio: string | null
  data_fim: string | null
  em_andamento: boolean
  duracao_horas: number
}

const extractField = (obj: any, field: string): any => {
  if (!obj) return null
  if (Array.isArray(obj)) return obj[0]?.[field] ?? null
  return obj[field] ?? null
}

export const fetchDetalheMontador = async (montadorId: string): Promise<DetalheMontagemCard[]> => {
  if (!montadorId) return []

  const { data, error } = await supabase
    .from('historico_alocacao_montagem')
    .select(
      'id, criado_em, acao, card_id, card:produtos_servicos_projeto(nome_produto, cliente_id, clientes:clientes(nome))',
    )
    .eq('montador_id', montadorId)
    .order('criado_em', { ascending: true })

  if (error) throw error

  const rows = (data || []) as any[]

  const byCard = new Map<string, any[]>()
  for (const row of rows) {
    const cardId = row?.card_id
    if (!cardId) continue
    if (!byCard.has(cardId)) byCard.set(cardId, [])
    byCard.get(cardId)!.push(row)
  }

  const now = Date.now()
  const result: DetalheMontagemCard[] = []

  for (const [cardId, events] of byCard.entries()) {
    const cardInfo = events[0]?.card
    const cardNome = extractField(cardInfo, 'nome_produto') ?? '—'
    const clienteId = extractField(cardInfo, 'cliente_id') ?? null
    const clienteObj = extractField(cardInfo, 'clientes')
    const clienteNome = extractField(clienteObj, 'nome') ?? '—'

    let totalDuration = 0
    let firstAlocado: string | null = null
    let lastDesalocado: string | null = null
    let emAndamento = false
    let pendingStart: string | null = null

    for (const ev of events) {
      if (!ev || !ev.acao || !ev.criado_em) continue
      if (ev.acao === 'alocado') {
        if (!firstAlocado) firstAlocado = ev.criado_em
        if (!pendingStart) pendingStart = ev.criado_em
      } else if (ev.acao === 'desalocado') {
        if (pendingStart) {
          const diff = new Date(ev.criado_em).getTime() - new Date(pendingStart).getTime()
          if (diff > 0) totalDuration += diff
          lastDesalocado = ev.criado_em
          pendingStart = null
        }
      }
    }

    if (pendingStart) {
      emAndamento = true
      const diff = now - new Date(pendingStart).getTime()
      if (diff > 0) totalDuration += diff
    }

    result.push({
      card_id: cardId,
      card_nome: cardNome,
      cliente_id: clienteId,
      cliente_nome: clienteNome,
      data_inicio: firstAlocado,
      data_fim: emAndamento ? null : lastDesalocado,
      em_andamento: emAndamento,
      duracao_horas: totalDuration / (1000 * 60 * 60),
    })
  }

  result.sort((a, b) => {
    const aTime = a.data_inicio ? new Date(a.data_inicio).getTime() : 0
    const bTime = b.data_inicio ? new Date(b.data_inicio).getTime() : 0
    return bTime - aTime
  })

  return result
}

export const formatDuracao = (hours: number): string => {
  if (!hours || hours <= 0) return '0min'
  if (hours < 1) {
    const minutes = Math.round(hours * 60)
    return `${minutes}min`
  }
  const totalHours = Math.floor(hours)
  const days = Math.floor(totalHours / 24)
  const remainingHours = totalHours % 24
  if (days > 0 && remainingHours > 0) {
    return `${days} ${days > 1 ? 'dias' : 'dia'} e ${remainingHours}h`
  }
  if (days > 0) {
    return `${days} ${days > 1 ? 'dias' : 'dia'}`
  }
  return `${remainingHours}h`
}
