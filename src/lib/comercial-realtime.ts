import { supabase } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

type ListenerCallback = (payload: any) => void

interface ChannelManager {
  channel: RealtimeChannel | null
  listeners: Set<ListenerCallback>
  refCount: number
}

// Map of shared channels keyed by table name (e.g. 'leads', 'whatsapp_messages')
const sharedChannels: Map<string, ChannelManager> = new Map()

/**
 * Subscribes to a shared Supabase Realtime channel for a specific table.
 * All listeners on the same table share the exact same WebSocket channel,
 * drastically reducing socket multiplexing overhead and duplicate backend load.
 *
 * @param table Database table to listen to (e.g. 'leads', 'whatsapp_messages')
 * @param event Event type ('*' | 'INSERT' | 'UPDATE' | 'DELETE'), defaults to '*'
 * @param callback Callback executed on change
 * @returns Unsubscribe cleanup function
 */
export function subscribeSharedTable(
  table: string,
  event: '*' | 'INSERT' | 'UPDATE' | 'DELETE' = '*',
  callback: ListenerCallback,
): () => void {
  const channelKey = `${table}_${event}`
  let manager = sharedChannels.get(channelKey)

  if (!manager) {
    const listeners = new Set<ListenerCallback>()
    const channelName = `shared_${channelKey}`

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event, schema: 'public', table }, (payload: any) => {
        listeners.forEach((fn) => {
          try {
            fn(payload)
          } catch (err) {
            console.warn(`[shared-realtime] Error in listener for ${channelKey}:`, err)
          }
        })
      })
      .subscribe((status, err) => {
        if (err || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn(`[shared-realtime] Channel ${channelName} status:`, status, err)
        }
      })

    manager = { channel, listeners, refCount: 0 }
    sharedChannels.set(channelKey, manager)
  }

  manager.listeners.add(callback)
  manager.refCount += 1

  return () => {
    const current = sharedChannels.get(channelKey)
    if (!current) return

    current.listeners.delete(callback)
    current.refCount -= 1

    if (current.refCount <= 0) {
      if (current.channel) {
        try {
          current.channel.unsubscribe?.()
        } catch (e) {
          console.warn(`[shared-realtime] Error unsubscribing ${channelKey}:`, e)
        }
        try {
          supabase.removeChannel(current.channel)
        } catch (e) {
          console.warn(`[shared-realtime] Error removing channel ${channelKey}:`, e)
        }
      }
      sharedChannels.delete(channelKey)
    }
  }
}
