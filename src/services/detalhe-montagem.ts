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
  tempo_alocacao_total_horas: number
  is_active: boolean
}

export interface AllocationSummary {
  cliente_nome: string
  tempo_total_horas: number
}

export interface MontadorDetalhe {
  concluidas: ConcludedAssembly[]
  em_andamento: InProgressAssembly[]
  resumo_alocacao: AllocationSummary[]
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
  aguardando_agenda: 'Aguardando agenda',
  transporte: 'Transporte',
  montagem: 'Em montagem',
  item_terceirizado: 'Item terceirizado',
  pendencia: 'Pendência',
  assistencia: 'Assistência',
  concluido: 'Concluído',
}

const safeArray = <T>(data: T[] | null | undefined): T[] => {
  return Array.isArray(data) ? data : []
}

const safeStr = (val: unknown): string => {
  if (val === null || val === undefined) return ''
  return String(val)
}

export const fetchMontadorDetalhe = async (
  montadorId: string,
  dataInicio?: string,
  dataFim?: string,
): Promise<MontadorDetalhe> => {
  const empty: MontadorDetalhe = {
    concluidas: [],
    em_andamento: [],
    resumo_alocacao: [],
  }
  if (!montadorId) return empty

  let periodStart: Date | null = null
  let periodEnd: Date | null = null
  if (dataInicio) {
    const d = new Date(dataInicio + 'T00:00:00')
    if (!isNaN(d.getTime())) periodStart = d
  }
  if (dataFim) {
    const d = new Date(dataFim + 'T23:59:59.999')
    if (!isNaN(d.getTime())) periodEnd = d
  }

  const { data: allocHistoryRaw } = await supabase
    .from('historico_alocacao_montagem')
    .select('card_id, acao, criado_em')
    .eq('montador_id', montadorId)
    .order('criado_em', { ascending: true })

  const allocHistory = safeArray(allocHistoryRaw as any[]).filter(
    (r: any) => r && r.card_id && r.acao && r.criado_em,
  )

  const historyCardIds = Array.from(
    new Set(allocHistory.map((r: any) => safeStr(r.card_id)).filter(Boolean)),
  )

  const { data: currentAllocsRaw } = await supabase
    .from('alocacao_montagem')
    .select('card_id, criado_em')
    .eq('montador_id', montadorId)

  const currentAllocs = safeArray(currentAllocsRaw as any[]).filter((r: any) => r && r.card_id)

  const currentAllocCardIds = new Set(currentAllocs.map((r: any) => safeStr(r.card_id)))

  const currentAllocMap = new Map<string, string>()
  for (const a of currentAllocs) {
    const cid = safeStr(a.card_id)
    if (cid && a.criado_em) {
      currentAllocMap.set(cid, a.criado_em)
    }
  }

  const allCardIds = Array.from(new Set([...historyCardIds, ...Array.from(currentAllocCardIds)]))
  if (allCardIds.length === 0) return empty

  const { data: cardsRaw } = await supabase
    .from('produtos_servicos_projeto')
    .select('id, nome_produto, status_analise, cliente_id, criado_em, cliente:clientes(nome)')
    .in('id', allCardIds)

  const cardsMap = new Map<string, any>()
  for (const c of safeArray(cardsRaw as any[])) {
    if (c && c.id) cardsMap.set(safeStr(c.id), c)
  }

  const { data: kanbanHistoryRaw } = await supabase
    .from('kanban_historico')
    .select('card_id, status_novo, criado_em')
    .in('card_id', allCardIds)
    .order('criado_em', { ascending: true })

  const kanbanHistory = safeArray(kanbanHistoryRaw as any[]).filter(
    (r: any) => r && r.card_id && r.status_novo && r.criado_em,
  )

  const computeAllocTime = (cardId: string, usePeriodFilter: boolean): number => {
    const events = allocHistory.filter((r: any) => safeStr(r.card_id) === cardId)
    let totalMs = 0
    let pendingStart: string | null = null
    const now = Date.now()

    for (const ev of events) {
      if (ev.acao === 'alocado') {
        pendingStart = ev.criado_em
      } else if (ev.acao === 'desalocado' && pendingStart) {
        let start = new Date(pendingStart).getTime()
        let end = new Date(ev.criado_em).getTime()
        if (isNaN(start) || isNaN(end)) {
          pendingStart = null
          continue
        }
        if (usePeriodFilter) {
          if (periodStart && start < periodStart.getTime()) start = periodStart.getTime()
          if (periodEnd && end > periodEnd.getTime()) end = periodEnd.getTime()
        }
        if (end > start) totalMs += end - start
        pendingStart = null
      }
    }

    if (currentAllocCardIds.has(cardId)) {
      if (!pendingStart) {
        const allocCriadoEm = currentAllocMap.get(cardId)
        if (allocCriadoEm) pendingStart = allocCriadoEm
      }
      if (pendingStart) {
        let start = new Date(pendingStart).getTime()
        let end = now
        if (!isNaN(start)) {
          if (usePeriodFilter) {
            if (periodStart && start < periodStart.getTime()) start = periodStart.getTime()
            if (periodEnd && end > periodEnd.getTime()) end = periodEnd.getTime()
          }
          if (end > start) totalMs += end - start
        }
      }
    }

    return totalMs / (1000 * 60 * 60)
  }

  const getConclusionDate = (cardId: string): string | null => {
    const entries = kanbanHistory
      .filter((r: any) => safeStr(r.card_id) === cardId && r.status_novo === 'concluido')
      .sort((a: any, b: any) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime())
    return entries.length > 0 ? entries[0].criado_em : null
  }

  const getTimeInPhase = (cardId: string, status: string, fallbackDate?: string | null): number => {
    if (!status) return 0
    const entries = kanbanHistory
      .filter((r: any) => safeStr(r.card_id) === cardId && r.status_novo === status)
      .sort((a: any, b: any) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime())
    const startTime = entries.length > 0 ? entries[0].criado_em : (fallbackDate ?? null)
    if (!startTime) return 0
    const startMs = new Date(startTime).getTime()
    if (isNaN(startMs)) return 0
    const diff = Date.now() - startMs
    return diff > 0 ? diff / (1000 * 60 * 60) : 0
  }

  const getCardInfo = (cardId: string) => {
    const card = cardsMap.get(cardId)
    const cardNome = card?.nome_produto ?? '—'
    const clienteObj = Array.isArray(card?.cliente) ? card.cliente[0] : card?.cliente
    const clienteNome = clienteObj?.nome ?? '—'
    const status = safeStr(card?.status_analise)
    const criadoEm = (card?.criado_em ?? null) as string | null
    return { cardNome, clienteNome, status, criadoEm }
  }

  const concluidas: ConcludedAssembly[] = []
  for (const cardId of allCardIds) {
    const conclusionDate = getConclusionDate(cardId)
    if (!conclusionDate) continue

    if (periodStart && new Date(conclusionDate) < periodStart) continue
    if (periodEnd && new Date(conclusionDate) > periodEnd) continue

    const { cardNome, clienteNome } = getCardInfo(cardId)
    concluidas.push({
      card_id: cardId,
      card_nome: cardNome,
      cliente_nome: clienteNome,
      data_conclusao: conclusionDate,
      tempo_alocacao_horas: computeAllocTime(cardId, true),
    })
  }

  concluidas.sort((a, b) => {
    const aTime = a.data_conclusao ? new Date(a.data_conclusao).getTime() : 0
    const bTime = b.data_conclusao ? new Date(b.data_conclusao).getTime() : 0
    return bTime - aTime
  })

  const em_andamento: InProgressAssembly[] = []
  for (const cardId of allCardIds) {
    const card = cardsMap.get(cardId)
    if (!card) continue
    const { cardNome, clienteNome, status, criadoEm } = getCardInfo(cardId)
    const isActive = currentAllocCardIds.has(cardId)
    em_andamento.push({
      card_id: cardId,
      card_nome: cardNome,
      cliente_nome: clienteNome,
      status,
      tempo_na_fase_horas: getTimeInPhase(cardId, status, criadoEm),
      tempo_alocacao_total_horas: computeAllocTime(cardId, false),
      is_active: isActive,
    })
  }

  const summaryMap = new Map<string, number>()
  for (const cardId of allCardIds) {
    const { clienteNome } = getCardInfo(cardId)
    const allocTime = computeAllocTime(cardId, true)
    summaryMap.set(clienteNome, (summaryMap.get(clienteNome) || 0) + allocTime)
  }
  const resumo_alocacao: AllocationSummary[] = Array.from(summaryMap.entries())
    .map(([cliente_nome, tempo_total_horas]) => ({ cliente_nome, tempo_total_horas }))
    .filter((s) => s.tempo_total_horas > 0)
    .sort((a, b) => b.tempo_total_horas - a.tempo_total_horas)

  return { concluidas, em_andamento, resumo_alocacao }
}

export const formatDuracao = (hours: number): string => {
  if (!hours || hours <= 0 || isNaN(hours)) return '0min'
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
