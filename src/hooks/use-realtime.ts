import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'

/**
 * Hook for real-time subscriptions to a Supabase table.
 * ALWAYS use this hook instead of subscribing inline.
 */
export function useRealtime<TRecord = any>(
  collectionName: string,
  callback: (data: { action: string; record: TRecord }) => void,
  enabled: boolean = true,
) {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    if (!enabled) return

    const channel = supabase
      .channel(`public:${collectionName}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: collectionName },
        (payload) => {
          const action =
            payload.eventType === 'INSERT'
              ? 'create'
              : payload.eventType === 'UPDATE'
                ? 'update'
                : 'delete'
          callbackRef.current({ action, record: (payload.new || payload.old) as TRecord })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [collectionName, enabled])
}

export default useRealtime
