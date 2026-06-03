import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'

export interface Notification {
  id: string
  usuario_id: string
  titulo: string
  mensagem: string
  lida: boolean
  link: string | null
  criado_em: string
}

export function useNotifications() {
  const { user } = useAuth()
  const [notificacoes, setNotificacoes] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!user?.id) return

    const fetchNotificacoes = async () => {
      const { data } = await supabase
        .from('notificacoes')
        .select('*')
        .eq('usuario_id', user.id)
        .order('criado_em', { ascending: false })
        .limit(50)

      if (data) {
        setNotificacoes(data as Notification[])
      }
    }

    fetchNotificacoes()

    const notifChannel = supabase
      .channel('notificacoes_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notificacoes',
          filter: `usuario_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setNotificacoes((prev) => [payload.new as Notification, ...prev].slice(0, 50))
          } else if (payload.eventType === 'UPDATE') {
            setNotificacoes((prev) =>
              prev.map((n) => (n.id === payload.new.id ? (payload.new as Notification) : n)),
            )
          } else if (payload.eventType === 'DELETE') {
            setNotificacoes((prev) => prev.filter((n) => n.id !== payload.old.id))
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(notifChannel)
    }
  }, [user?.id])

  useEffect(() => {
    setUnreadCount(notificacoes.filter((n) => !n.lida).length)
  }, [notificacoes])

  const markAsRead = async (id: string) => {
    setNotificacoes((prev) => prev.map((n) => (n.id === id ? { ...n, lida: true } : n)))
    await supabase.from('notificacoes').update({ lida: true }).eq('id', id)
  }

  const markAllAsRead = async () => {
    if (!user) return
    setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })))
    await supabase
      .from('notificacoes')
      .update({ lida: true })
      .eq('usuario_id', user.id)
      .eq('lida', false)
  }

  return { notificacoes, unreadCount, markAsRead, markAllAsRead }
}
