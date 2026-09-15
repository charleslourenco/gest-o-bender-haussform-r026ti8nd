import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { subscribeSharedTable } from '@/lib/comercial-realtime'
import {
  ATENDIMENTO_ABAS,
  leadBelongsToAba,
  parseLeadMetadados,
} from '@/components/comercial/constants'

/**
 * Hook para monitorar o total global de pendências do módulo Comercial / Atendimentos.
 * Regra:
 * - lead com status_atendimento = 'aguardando_resposta'
 * - excluido = false
 * - arquivado_comercial = false
 * - status NÃO pode ser 'Perdido' nem 'Vendido'
 * - não excluído nem arquivado nos metadados da aba (meta.exclusoes / meta.arquivamentos)
 * - possui pelo menos 1 mensagem de cliente REAL (sender_type IN ('cliente', 'lead') OU direction = 'inbound')
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
        .select(
          'id, status, categoria, kanban_ativo, notas_pessoais, excluido, arquivado_comercial',
        )
        .eq('status_atendimento', 'aguardando_resposta')
        .eq('excluido', false)
        .eq('arquivado_comercial', false)

      if (leadsErr || !Array.isArray(leads) || leads.length === 0) {
        setCount(0)
        setByAba({})
        return
      }

      // Regra: ignorar leads com status 'Perdido' ou 'Vendido'
      const activeStatusLeads = leads.filter((l: any) => {
        const s = typeof l?.status === 'string' ? l.status.trim().toLowerCase() : ''
        return s !== 'perdido' && s !== 'vendido'
      })

      const leadIds = activeStatusLeads.map((l: any) => l.id).filter(Boolean)
      if (leadIds.length === 0) {
        setCount(0)
        setByAba({})
        return
      }

      // 2. Filtrar apenas aqueles que realmente têm pelo menos uma mensagem REAL de cliente
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
      const validLeads = activeStatusLeads.filter((l: any) => uniqueLeadsWithClientMsg.has(l.id))

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
      setCount(totalGlobal)
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
