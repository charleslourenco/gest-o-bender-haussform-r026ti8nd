import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'

/**
 * Hook for real-time subscriptions to a Supabase table.
 * Adapted to replace previous implementations while keeping the same interface
 * so downstream components don't break.
 */
export function useRealtime(
  collectionName: string,
  callback: (data: any) => void,
  enabled: boolean = true,
) {
  const callbackRef = useRef(callback)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    if (!enabled) return

    const channel = supabase
      .channel(`public:${collectionName}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: collectionName },
        (payload) => {
          const action = payload.eventType === 'INSERT' ? 'create' : payload.eventType.toLowerCase()
          callbackRef.current({ action, record: payload.new || payload.old })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [collectionName, enabled])
}

export default useRealtime
