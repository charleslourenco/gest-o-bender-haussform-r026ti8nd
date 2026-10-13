import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import {
  AlertaNotaFiscal,
  AlertasResumo,
  fetchAlertasNotasFiscais,
} from '@/services/alertas-notas-fiscais'

// Evento customizado de broadcast local para sincronizar todos os componentes na mesma página imediatamente
const ALERTAS_EVENT_NAME = 'bender_alertas_notas_updated'

export function triggerAlertasReload() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(ALERTAS_EVENT_NAME))
  }
}

export function useAlertasNotasFiscais() {
  const [alertas, setAlertas] = useState<AlertaNotaFiscal[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const isFetchingRef = useRef(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const loadAlertas = useCallback(async () => {
    if (isFetchingRef.current) return
    isFetchingRef.current = true
    try {
      const { data, error: err } = await fetchAlertasNotasFiscais()
      if (err) {
        setError(err)
      } else {
        setAlertas(data)
        setError(null)
      }
    } finally {
      setLoading(false)
      isFetchingRef.current = false
    }
  }, [])

  const debouncedReload = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      loadAlertas()
    }, 400)
  }, [loadAlertas])

  useEffect(() => {
    loadAlertas()

    // Ouve evento customizado local (quando alguma ação rápida é executada no front)
    const handleCustom = () => {
      loadAlertas()
    }
    window.addEventListener(ALERTAS_EVENT_NAME, handleCustom)

    // Ouve mudanças nas tabelas subjacentes no Postgres
    const channel = supabase
      .channel('alertas_notas_fiscais_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notas_fiscais' }, () =>
        debouncedReload(),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'itens_nota_fiscal' }, () =>
        debouncedReload(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'estoque_movimentacoes' },
        () => debouncedReload(),
      )
      .subscribe()

    return () => {
      window.removeEventListener(ALERTAS_EVENT_NAME, handleCustom)
      if (timerRef.current) clearTimeout(timerRef.current)
      supabase.removeChannel(channel)
    }
  }, [loadAlertas, debouncedReload])

  const resumo: AlertasResumo = {
    total: alertas.length,
    alta: alertas.filter((a) => a.gravidade === 'alta').length,
    media: alertas.filter((a) => a.gravidade === 'media').length,
    baixa: alertas.filter((a) => a.gravidade === 'baixa').length,
  }

  // Mapa de alertas por nota_id para cruzamento ultra rápido na lista de notas
  const alertasMap = new Map<string, AlertaNotaFiscal>()
  alertas.forEach((a) => {
    if (a.nota_id && !alertasMap.has(a.nota_id)) {
      alertasMap.set(a.nota_id, a)
    }
  })

  return {
    alertas,
    alertasMap,
    resumo,
    loading,
    error,
    reload: loadAlertas,
  }
}
