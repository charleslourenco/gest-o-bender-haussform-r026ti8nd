import { supabase } from '@/lib/supabase/client'

export interface HistoricoMontagemRecord {
  id: string
  criado_em: string
  acao: string
  card_id: string
  montador_id: string
  montador_nome: string | null
  card_nome: string | null
  cliente_nome: string | null
}

export interface MontadorOption {
  id: string
  nome_completo: string
}

export interface ProdutividadeMontador {
  montador_id: string
  montador_nome: string
  cards_montados: number
  total_alocacoes: number
  tempo_medio_horas: number | null
  cards_em_andamento: number
}

export const fetchMontadores = async (): Promise<MontadorOption[]> => {
  const { data, error } = await supabase
    .from('montadores')
    .select('id, nome_completo')
    .order('nome_completo', { ascending: true })
  if (error) throw error
  return (Array.isArray(data) ? data : [])
    .filter((m: any) => m && m.id)
    .map((m: any) => ({
      id: m.id,
      nome_completo: m.nome_completo ?? '—',
    }))
}

export const fetchHistoricoMontagem = async (): Promise<HistoricoMontagemRecord[]> => {
  const { data, error } = await supabase
    .from('historico_alocacao_montagem')
    .select(
      'id, criado_em, acao, card_id, montador_id, montador:montadores(nome_completo), card:produtos_servicos_projeto(nome_produto, cliente_id, clientes:clientes(nome))',
    )
    .order('criado_em', { ascending: false })
  if (error) throw error

  return (Array.isArray(data) ? data : [])
    .filter((r: any) => r && r.id)
    .map((row: any) => ({
      id: row.id,
      criado_em: row.criado_em,
      acao: row.acao,
      card_id: row.card_id,
      montador_id: row.montador_id,
      montador_nome: Array.isArray(row?.montador)
        ? row.montador[0]?.nome_completo
        : (row?.montador?.nome_completo ?? null),
      card_nome: Array.isArray(row?.card)
        ? row.card[0]?.nome_produto
        : (row?.card?.nome_produto ?? null),
      cliente_nome: Array.isArray(row?.card)
        ? (row.card[0]?.clientes?.nome ?? null)
        : (row?.card?.clientes?.nome ?? null),
    }))
}

export const fetchHistoricoByCard = async (cardId: string): Promise<HistoricoMontagemRecord[]> => {
  const { data, error } = await supabase
    .from('historico_alocacao_montagem')
    .select(
      'id, criado_em, acao, card_id, montador_id, montador:montadores(nome_completo), card:produtos_servicos_projeto(nome_produto, cliente_id, clientes:clientes(nome))',
    )
    .eq('card_id', cardId)
    .order('criado_em', { ascending: false })
  if (error) throw error

  return (Array.isArray(data) ? data : [])
    .filter((r: any) => r && r.id)
    .map((row: any) => ({
      id: row.id,
      criado_em: row.criado_em,
      acao: row.acao,
      card_id: row.card_id,
      montador_id: row.montador_id,
      montador_nome: Array.isArray(row?.montador)
        ? row.montador[0]?.nome_completo
        : (row?.montador?.nome_completo ?? null),
      card_nome: Array.isArray(row?.card)
        ? row.card[0]?.nome_produto
        : (row?.card?.nome_produto ?? null),
      cliente_nome: Array.isArray(row?.card)
        ? (row.card[0]?.clientes?.nome ?? null)
        : (row?.card?.clientes?.nome ?? null),
    }))
}

const parseDurationToHours = (durationStr: string): number | null => {
  const parts = durationStr.split(' ')
  let hours = 0
  let found = false
  for (let i = 0; i < parts.length; i += 2) {
    const val = parseFloat(parts[i])
    const unit = parts[i + 1]
    if (isNaN(val) || !unit) continue
    found = true
    if (unit.startsWith('day')) hours += val * 24
    else if (unit.startsWith('hour')) hours += val
    else if (unit.startsWith('min')) hours += val / 60
    else if (unit.startsWith('sec')) hours += val / 3600
    else if (unit.startsWith('mon')) hours += val * 24 * 30
    else if (unit.startsWith('year')) hours += val * 24 * 365
  }
  return found ? hours : null
}

export const fetchProdutividadeMontadores = async (): Promise<ProdutividadeMontador[]> => {
  const [montadoresRes, historicoRes, alocacoesRes] = await Promise.all([
    supabase.from('montadores').select('id, nome_completo').order('nome_completo'),
    supabase
      .from('historico_alocacao_montagem')
      .select('id, montador_id, card_id, acao, criado_em')
      .order('criado_em', { ascending: true }),
    supabase.from('alocacao_montagem').select('montador_id, card_id'),
  ])

  if (montadoresRes.error) throw montadoresRes.error
  if (historicoRes.error) throw historicoRes.error
  if (alocacoesRes.error) throw alocacoesRes.error

  const montadores = (Array.isArray(montadoresRes.data) ? montadoresRes.data : []).filter(
    (m: any) => m && m.id,
  )
  const historico = (Array.isArray(historicoRes.data) ? historicoRes.data : []).filter(
    (h: any) => h && h.montador_id && h.card_id,
  )
  const alocacoes = (Array.isArray(alocacoesRes.data) ? alocacoesRes.data : []).filter(
    (a: any) => a && a.montador_id,
  )

  const inProgressCounts: Record<string, number> = {}
  for (const a of alocacoes) {
    if (a.montador_id) {
      inProgressCounts[a.montador_id] = (inProgressCounts[a.montador_id] || 0) + 1
    }
  }

  const byMontadorCard: Record<
    string,
    Record<string, { alocado?: string; desalocado?: string }>
  > = {}
  for (const h of historico) {
    const key = `${h.montador_id}_${h.card_id}`
    if (!byMontadorCard[h.montador_id]) byMontadorCard[h.montador_id] = {}
    if (!byMontadorCard[h.montador_id][key]) byMontadorCard[h.montador_id][key] = {}
    if (h.acao === 'alocado' && !byMontadorCard[h.montador_id][key].alocado) {
      byMontadorCard[h.montador_id][key].alocado = h.criado_em
    }
    if (
      h.acao === 'desalocado' &&
      byMontadorCard[h.montador_id][key].alocado &&
      !byMontadorCard[h.montador_id][key].desalocado
    ) {
      byMontadorCard[h.montador_id][key].desalocado = h.criado_em
    }
  }

  return montadores
    .filter((m: any) => m && m.id)
    .map((m: any) => {
      const montadorHistorico = historico.filter((h: any) => h.montador_id === m.id)
      const cardsWithAlocacao = new Set(
        montadorHistorico.filter((h: any) => h.acao === 'alocado').map((h: any) => h.card_id),
      )
      const totalAlocacoes = montadorHistorico.filter((h: any) => h.acao === 'alocado').length

      const cardPairs = byMontadorCard[m.id] || {}
      const completedDurations: number[] = []
      for (const key of Object.keys(cardPairs)) {
        const pair = cardPairs[key]
        if (pair.alocado && pair.desalocado) {
          const diffMs = new Date(pair.desalocado).getTime() - new Date(pair.alocado).getTime()
          if (diffMs > 0) {
            completedDurations.push(diffMs / (1000 * 60 * 60))
          }
        }
      }

      const tempoMedio =
        completedDurations.length > 0
          ? completedDurations.reduce((sum, d) => sum + d, 0) / completedDurations.length
          : null

      return {
        montador_id: m.id,
        montador_nome: m.nome_completo ?? '—',
        cards_montados: cardsWithAlocacao.size,
        total_alocacoes: totalAlocacoes,
        tempo_medio_horas: tempoMedio,
        cards_em_andamento: inProgressCounts[m.id] || 0,
      }
    })
    .sort((a, b) => b.cards_montados - a.cards_montados)
}

export const formatTempoMedio = (hours: number | null): string => {
  if (hours === null) return '—'
  if (hours < 1) {
    const minutes = Math.round(hours * 60)
    return `${minutes}min`
  }
  if (hours < 24) {
    return `${hours.toFixed(1)}h`
  }
  const days = Math.floor(hours / 24)
  const remainingHours = Math.round(hours % 24)
  return `${days}d ${remainingHours}h`
}
