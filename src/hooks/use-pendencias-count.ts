import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { buscarTodasPaginas } from '@/lib/supabase/buscar-todas-paginas'
import { subscribeSharedTable } from '@/lib/comercial-realtime'
import { ATENDIMENTO_ABAS, leadBelongsToAba } from '@/components/comercial/constants'

/**
 * Hook para monitorar o total global de pendências do módulo Comercial / Atendimentos.
 * Regra:
 * - lead com status_atendimento = 'aguardando_resposta'
 * - excluido = false
 * - arquivado_comercial = false
 * - não excluído nem arquivado nos metadados da aba (meta.exclusoes / meta.arquivamentos)
 * - possui pelo menos 1 mensagem de cliente REAL (sender_type IN ('cliente', 'lead') OU direction = 'inbound')
 */
export interface PendenciasCountResult {
  total: number
  byAba: Record<string, number>
}

let sharedResult: PendenciasCountResult = { total: 0, byAba: {} }
const subscribers = new Set<(r: PendenciasCountResult) => void>()
let unsubscribeAll: (() => void) | null = null
let isFetching = false
let precisaRecontar = false
let timer: ReturnType<typeof setTimeout> | null = null

const fetchCount = async () => {
  if (isFetching) {
    precisaRecontar = true
    return
  }
  isFetching = true
  try {
    // 1. Buscar leads candidatos com status_atendimento = 'aguardando_resposta'
    const { data: leads, error: leadsErr } = await buscarTodasPaginas(() =>
      supabase
        .from('leads' as any)
        .select(
          'id, status, categoria, kanban_ativo, notas_pessoais, excluido, arquivado_comercial',
        )
        .eq('status_atendimento', 'aguardando_resposta')
        .eq('excluido', false)
        .eq('arquivado_comercial', false)
        .order('id', { ascending: true }),
    )

    if (leadsErr || !Array.isArray(leads) || leads.length === 0) {
      sharedResult = { total: 0, byAba: {} }
      subscribers.forEach((notify) => notify(sharedResult))
      return
    }

    const leadIds = leads.map((l: any) => l.id).filter(Boolean)
    if (leadIds.length === 0) {
      sharedResult = { total: 0, byAba: {} }
      subscribers.forEach((notify) => notify(sharedResult))
      return
    }

    // 2. Filtrar apenas aqueles que realmente têm pelo menos uma mensagem REAL de cliente
    const { data: msgs, error: msgsErr } = await buscarTodasPaginas(() =>
      supabase
        .from('whatsapp_messages' as any)
        .select('lead_id')
        .in('lead_id', leadIds)
        .or('sender_type.eq.cliente,sender_type.eq.lead,direction.eq.inbound')
        .order('id', { ascending: true }),
    )

    if (msgsErr || !Array.isArray(msgs)) {
      sharedResult = { total: 0, byAba: {} }
      subscribers.forEach((notify) => notify(sharedResult))
      return
    }

    const uniqueLeadsWithClientMsg = new Set(msgs.map((m: any) => m.lead_id).filter(Boolean))
    const validLeads = leads.filter((l: any) => uniqueLeadsWithClientMsg.has(l.id))

    // 3. Mapear pendências por aba usando leadBelongsToAba
    const abaCounts: Record<string, number> = {}
    ATENDIMENTO_ABAS.forEach((aba) => {
      abaCounts[aba.id] = 0
    })

    validLeads.forEach((l: any) => {
      try {
        for (const aba of ATENDIMENTO_ABAS) {
          if (leadBelongsToAba(l, aba.id)) {
            abaCounts[aba.id] = (abaCounts[aba.id] || 0) + 1
            break
          }
        }
      } catch {
        // fallback silencioso
      }
    })

    // O total é a soma dos leads que pertencem a alguma aba ativa
    const totalGlobal = Object.values(abaCounts).reduce((acc, c) => acc + c, 0)
    sharedResult = { total: totalGlobal, byAba: abaCounts }
    subscribers.forEach((notify) => notify(sharedResult))
  } catch (err) {
    console.warn('Erro ao calcular pendências globais:', err)
  } finally {
    isFetching = false
    if (precisaRecontar) {
      precisaRecontar = false
      debouncedFetch()
    }
  }
}

const debouncedFetch = () => {
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    fetchCount()
  }, 500)
}

function start() {
  if (unsubscribeAll) return

  fetchCount()

  const unsubLeads = subscribeSharedTable('leads', '*', () => {
    debouncedFetch()
  })

  const unsubMsgs = subscribeSharedTable('whatsapp_messages', 'INSERT', (payload: any) => {
    const newMsg = payload?.new as any
    if (!newMsg) return
    const isClient =
      newMsg.direction === 'inbound' ||
      newMsg.sender_type === 'cliente' ||
      newMsg.sender_type === 'lead'
    if (isClient) {
      debouncedFetch()
    }
  })

  unsubscribeAll = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    unsubLeads()
    unsubMsgs()
  }
}

export function usePendenciasCount() {
  const [result, setResult] = useState<PendenciasCountResult>(sharedResult)

  useEffect(() => {
    subscribers.add(setResult)
    setResult(sharedResult)
    start()
    return () => {
      subscribers.delete(setResult)
      if (subscribers.size === 0 && unsubscribeAll) {
        unsubscribeAll()
        unsubscribeAll = null
      }
    }
  }, [])

  return { count: result.total, byAba: result.byAba }
}
