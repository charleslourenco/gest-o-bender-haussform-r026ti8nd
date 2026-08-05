import { supabase } from '@/lib/supabase/client'

export interface ConcludedAssembly {
  card_id: string
  card_nome: string
  cliente_nome: string
  data_conclusao: string | null
  tempo_alocacao_horas: number
}

export interface InProgressAssembly {
  card_id: string
  card_nome: string
  cliente_nome: string
  status: string
  tempo_na_fase_horas: number
}

export interface MontadorDetalhe {
  concluidas: ConcludedAssembly[]
  em_andamento: InProgressAssembly[]
}

export const PHASE_ORDER = [
  'aguardando_agenda',
  'transporte',
  'montagem',
  'item_terceirizado',
  'pendencia',
  'assistencia',
  'concluido',
] as const

export const PHASE_LABELS: Record<string, string> = {
  aguardando_agenda: 'Aguardando Agenda',
  transporte: 'Transporte',
  montagem: 'Em Montagem',
  item_terceirizado: 'Item Terceirizado',
  pendencia: 'Pendência',
  assistencia: 'Assistência',
  concluido: 'Concluído',
}

const safeArray = <T>(data: T[] | null | undefined): T[] => {
  return Array.isArray(data) ? data : []
}

export const fetchMontadorDetalhe = async (
  montadorId: string,
  dataInicio?: string,
  dataFim?: string,
): Promise<MontadorDetalhe> => {
  if (!montadorId) return { concluidas: [], em_andamento: [] }

  const { data: allocHistoryRaw } = await supabase
    .from('historico_alocacao_montagem')
    .select('card_id, acao, criado_em')
    .eq('montador_id', montadorId)
    .order('criado_em', { ascending: true })

  const allocHistory = safeArray(allocHistoryRaw as any[]).filter(
    (r: any) => r && r.card_id && r.acao && r.criado_em,
  )

  const cardIds = Array.from(new Set(allocHistory.map((r: any) => r.card_id as string)))
  if (cardIds.length === 0) return { concluidas: [], em_andamento: [] }

  const { data: cardsRaw } = await supabase
    .from('produtos_servicos_projeto')
    .select('id, nome_produto, status_analise, cliente_id, criado_em, cliente:clientes(nome)')
    .in('id', cardIds)

  const cardsMap = new Map<string, any>()
  for (const c of safeArray(cardsRaw as any[])) {
    if (c && c.id) cardsMap.set(c.id, c)
  }

  const { data: kanbanHistoryRaw } = await supabase
    .from('kanban_historico')
    .select('card_id, status_novo, criado_em')
    .in('card_id', cardIds)
    .order('criado_em', { ascending: true })

  const kanbanHistory = safeArray(kanbanHistoryRaw as any[]).filter(
    (r: any) => r && r.card_id && r.status_novo && r.criado_em,
  )

  const { data: currentAllocsRaw } = await supabase
    .from('alocacao_montagem')
    .select('card_id')
    .eq('montador_id', montadorId)

  const currentAllocCardIds = new Set(
    safeArray(currentAllocsRaw as any[])
      .filter((r: any) => r && r.card_id)
      .map((r: any) => r.card_id as string),
  )

  const computeAllocTime = (cardId: string): number => {
    const events = allocHistory.filter((r: any) => r.card_id === cardId)
    let totalMs = 0
    let pendingStart: string | null = null
    const now = Date.now()
    for (const ev of events) {
      if (ev.acao === 'alocado') {
        pendingStart = ev.criado_em
      } else if (ev.acao === 'desalocado' && pendingStart) {
        const diff = new Date(ev.criado_em).getTime() - new Date(pendingStart).getTime()
        if (diff > 0) totalMs += diff
        pendingStart = null
      }
    }
    if (pendingStart && currentAllocCardIds.has(cardId)) {
      const diff = now - new Date(pendingStart).getTime()
      if (diff > 0) totalMs += diff
    }
    return totalMs / (1000 * 60 * 60)
  }

  const getConclusionDate = (cardId: string): string | null => {
    const entries = kanbanHistory
      .filter((r: any) => r.card_id === cardId && r.status_novo === 'concluido')
      .sort((a: any, b: any) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime())
    return entries.length > 0 ? entries[0].criado_em : null
  }

  const getTimeInPhase = (cardId: string, status: string, fallbackDate?: string | null): number => {
    const entries = kanbanHistory
      .filter((r: any) => r.card_id === cardId && r.status_novo === status)
      .sort((a: any, b: any) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime())
    const startTime = entries.length > 0 ? entries[0].criado_em : (fallbackDate ?? null)
    if (!startTime) return 0
    const diff = Date.now() - new Date(startTime).getTime()
    return diff > 0 ? diff / (1000 * 60 * 60) : 0
  }

  const getCardInfo = (cardId: string) => {
    const card = cardsMap.get(cardId)
    const cardNome = card?.nome_produto ?? '—'
    const clienteObj = Array.isArray(card?.cliente) ? card.cliente[0] : card?.cliente
    const clienteNome = clienteObj?.nome ?? '—'
    return { cardNome, clienteNome, criadoEm: (card?.criado_em ?? null) as string | null }
  }

  const concluidas: ConcludedAssembly[] = []
  for (const cardId of cardIds) {
    const conclusionDate = getConclusionDate(cardId)
    if (!conclusionDate) continue

    if (dataInicio) {
      const start = new Date(dataInicio + 'T00:00:00')
      if (new Date(conclusionDate) < start) continue
    }
    if (dataFim) {
      const end = new Date(dataFim + 'T23:59:59.999')
      if (new Date(conclusionDate) > end) continue
    }

    const { cardNome, clienteNome } = getCardInfo(cardId)
    concluidas.push({
      card_id: cardId,
      card_nome: cardNome,
      cliente_nome: clienteNome,
      data_conclusao: conclusionDate,
      tempo_alocacao_horas: computeAllocTime(cardId),
    })
  }

  concluidas.sort((a, b) => {
    const aTime = a.data_conclusao ? new Date(a.data_conclusao).getTime() : 0
    const bTime = b.data_conclusao ? new Date(b.data_conclusao).getTime() : 0
    return bTime - aTime
  })

  const em_andamento: InProgressAssembly[] = []
  for (const cardId of currentAllocCardIds) {
    const card = cardsMap.get(cardId)
    if (!card) continue
    const status = card.status_analise ?? ''
    const { cardNome, clienteNome, criadoEm } = getCardInfo(cardId)
    em_andamento.push({
      card_id: cardId,
      card_nome: cardNome,
      cliente_nome: clienteNome,
      status,
      tempo_na_fase_horas: getTimeInPhase(cardId, status, criadoEm),
    })
  }

  return { concluidas, em_andamento }
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
