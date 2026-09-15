import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { subscribeSharedTable } from '@/lib/comercial-realtime'
import { getLeadAba } from '@/components/comercial/constants'

/**
 * Hook para monitorar o total global de pendências do módulo Comercial / Atendimentos.
 * Regra:
 * - lead com status_atendimento = 'aguardando_resposta'
 * - excluido = false
 * - arquivado_comercial = false
 * - possui pelo menos 1 mensagem de cliente (sender_type IN ('cliente', 'lead') OU direction = 'inbound')
 */
export interface PendenciasCountResult {
  total: number
  byAba: Record<string, number>
}

export function usePendenciasCount() {
  const [count, setCount] = useState<number>(0)
  const [byAba, setByAba] = useState<Record<string, number>>({})
  const isFetchingRef = useRef(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const fetchCount = async () => {
    if (isFetchingRef.current) return
    isFetchingRef.current = true
    try {
      // 1. Buscar leads candidatos com status_atendimento = 'aguardando_resposta'
      const { data: leads, error: leadsErr } = await supabase
        .from('leads' as any)
        .select('id, status, categoria, kanban_ativo, notas_pessoais')
        .eq('status_atendimento', 'aguardando_resposta')
        .eq('excluido', false)
        .eq('arquivado_comercial', false)

      if (leadsErr || !Array.isArray(leads) || leads.length === 0) {
        setCount(0)
        setByAba({})
        return
      }

      const leadIds = leads.map((l: any) => l.id).filter(Boolean)
      if (leadIds.length === 0) {
        setCount(0)
        setByAba({})
        return
      }

      // 2. Filtrar apenas aqueles que realmente têm pelo menos uma mensagem de cliente
      const { data: msgs, error: msgsErr } = await supabase
        .from('whatsapp_messages' as any)
        .select('lead_id')
        .in('lead_id', leadIds)
        .or('sender_type.eq.cliente,sender_type.eq.lead,direction.eq.inbound')

      if (msgsErr || !Array.isArray(msgs)) {
        setCount(0)
        setByAba({})
        return
      }

      const uniqueLeadsWithClientMsg = new Set(msgs.map((m: any) => m.lead_id).filter(Boolean))
      const validLeads = leads.filter((l: any) => uniqueLeadsWithClientMsg.has(l.id))
      setCount(validLeads.length)

      // 3. Mapear pendências por aba diretamente
      const abaCounts: Record<string, number> = {}
      validLeads.forEach((l: any) => {
        try {
          const aba = getLeadAba(l)
          if (aba?.id) {
            abaCounts[aba.id] = (abaCounts[aba.id] || 0) + 1
          }
        } catch {
          // fallback silencioso
        }
      })
      setByAba(abaCounts)
    } catch (err) {
      console.warn('Erro ao calcular pendências globais:', err)
    } finally {
      isFetchingRef.current = false
    }
  }

  const debouncedFetch = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      fetchCount()
    }, 500)
  }

  useEffect(() => {
    let isMounted = true
    fetchCount()

    // Subscrição em tempo real para leads e whatsapp_messages
    const unsubLeads = subscribeSharedTable('leads', '*', () => {
      if (!isMounted) return
      debouncedFetch()
    })

    const unsubMsgs = subscribeSharedTable('whatsapp_messages', 'INSERT', (payload: any) => {
      if (!isMounted) return
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

    return () => {
      isMounted = false
      if (timerRef.current) clearTimeout(timerRef.current)
      unsubLeads()
      unsubMsgs()
    }
  }, [])

  return { count, byAba }
}
