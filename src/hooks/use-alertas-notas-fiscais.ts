import { useState, useEffect, useCallback, useRef } from 'react'
import {
  AlertaNotaFiscal,
  AlertasResumo,
  fetchAlertasNotasFiscais,
} from '@/services/alertas-notas-fiscais'

// Evento customizado de broadcast local para sincronizar todos os componentes na mesma página imediatamente
const ALERTAS_EVENT_NAME = 'bender_alertas_notas_updated'

// Cache em memória compartilhado entre todas as instâncias do hook (estilo React Query / SWR)
interface AlertasCache {
  data: AlertaNotaFiscal[]
  lastFetchedAt: number
  error: string | null
}

let globalCache: AlertasCache | null = null
let inFlightPromise: Promise<AlertasCache> | null = null
const STALE_TIME_MS = 60_000 // 60 segundos conforme especificação

/**
 * Dispara invalidação e recarregamento imediato dos alertas de notas fiscais
 * Deve ser chamado em ações que alteram notas fiscais:
 * - Salvar edição de nota
 * - Lançar estoque
 * - Marcar como conferida
 * - Excluir nota
 * - Finalizar nota no Leitor de Notas
 */
export function triggerAlertasReload() {
  // Invalida o cache marcando como expirado
  if (globalCache) {
    globalCache.lastFetchedAt = 0
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(ALERTAS_EVENT_NAME))
  }
}

async function fetchWithCache(force = false): Promise<AlertasCache> {
  const now = Date.now()
  if (!force && globalCache && now - globalCache.lastFetchedAt < STALE_TIME_MS) {
    return globalCache
  }

  if (inFlightPromise) {
    return inFlightPromise
  }

  inFlightPromise = (async () => {
    try {
      const { data, error } = await fetchAlertasNotasFiscais()
      const newCache: AlertasCache = {
        data: Array.isArray(data) ? data : [],
        lastFetchedAt: Date.now(),
        error: error || null,
      }
      globalCache = newCache
      return newCache
    } catch (err: any) {
      console.warn('[useAlertasNotasFiscais] Erro ao consultar vw_alertas_notas_fiscais:', err)
      const errorCache: AlertasCache = {
        data: globalCache?.data || [],
        lastFetchedAt: Date.now(),
        error: err?.message || 'Erro ao carregar alertas de notas fiscais',
      }
      globalCache = errorCache
      return errorCache
    } finally {
      inFlightPromise = null
    }
  })()

  return inFlightPromise
}

export function useAlertasNotasFiscais() {
  const [alertas, setAlertas] = useState<AlertaNotaFiscal[]>(() => globalCache?.data || [])
  const [loading, setLoading] = useState<boolean>(() => !globalCache)
  const [error, setError] = useState<string | null>(() => globalCache?.error || null)
  const isMountedRef = useRef(true)

  const loadAlertas = useCallback(async (force = false) => {
    try {
      if (!globalCache) {
        setLoading(true)
      }
      const cache = await fetchWithCache(force)
      if (isMountedRef.current) {
        setAlertas(cache.data)
        setError(cache.error)
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err?.message || 'Erro ao carregar alertas')
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    isMountedRef.current = true

    // Carga inicial (respeita staleTime de 60 segundos se o cache estiver fresco)
    loadAlertas(false)

    // Ouve evento customizado local disparado pelas ações de mutação
    const handleCustom = () => {
      loadAlertas(true)
    }
    window.addEventListener(ALERTAS_EVENT_NAME, handleCustom)

    // refetchOnWindowFocus: recarrega ao focar na janela se o cache estiver stale (> 60s)
    const handleFocus = () => {
      const now = Date.now()
      if (!globalCache || now - globalCache.lastFetchedAt >= STALE_TIME_MS) {
        loadAlertas(true)
      }
    }
    window.addEventListener('focus', handleFocus)

    // Também responde à visibilidade da aba (quando o usuário volta para ela)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now()
        if (!globalCache || now - globalCache.lastFetchedAt >= STALE_TIME_MS) {
          loadAlertas(true)
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      isMountedRef.current = false
      window.removeEventListener(ALERTAS_EVENT_NAME, handleCustom)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [loadAlertas])

  const safeAlertas = Array.isArray(alertas) ? alertas : []

  const resumo: AlertasResumo = {
    total: safeAlertas.length,
    alta: safeAlertas.filter((a) => a && a.gravidade === 'alta').length,
    media: safeAlertas.filter((a) => a && a.gravidade === 'media').length,
    baixa: safeAlertas.filter((a) => a && a.gravidade === 'baixa').length,
  }

  // Mapa de alertas por nota_id para cruzamento ultra rápido na lista de notas
  const alertasMap = new Map<string, AlertaNotaFiscal>()
  safeAlertas.forEach((a) => {
    if (a && a.nota_id && !alertasMap.has(a.nota_id)) {
      alertasMap.set(a.nota_id, a)
    }
  })

  return {
    alertas: safeAlertas,
    alertasMap,
    resumo,
    loading,
    error,
    reload: () => loadAlertas(true),
  }
}
