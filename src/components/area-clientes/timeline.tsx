import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

interface TimelineProps {
  clienteId?: string
  formularioId?: string | null
  saleCreatedAt?: string | null
}

export function Timeline({ clienteId, formularioId, saleCreatedAt }: TimelineProps) {
  const [events, setEvents] = useState<any[]>([])

  useEffect(() => {
    if (!clienteId) return

    const fetchEvents = async () => {
      const { data, error } = await supabase.rpc('get_timeline_eventos', {
        p_cliente_id: clienteId,
        p_formulario_id: formularioId ?? null,
        p_sale_created_at: saleCreatedAt ?? null,
      })

      if (!error && data) {
        setEvents(data)
      } else {
        const { data: fallbackData } = await supabase
          .from('timeline_eventos')
          .select('*')
          .eq('cliente_id', clienteId)
          .order('criado_em', { ascending: false })

        if (fallbackData) {
          const filtered = formularioId
            ? fallbackData.filter(
                (e: any) =>
                  e.formulario_id === formularioId ||
                  (e.formulario_id === null &&
                    (!saleCreatedAt ||
                      new Date(e.criado_em).getTime() >= new Date(saleCreatedAt).getTime())),
              )
            : fallbackData
          setEvents(filtered.map((e: any) => ({ ...e, nome_exibicao: e.usuario_nome })))
        }
      }
    }

    fetchEvents()

    const sub = supabase
      .channel('timeline_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'timeline_eventos',
          filter: `cliente_id=eq.${clienteId}`,
        },
        () => {
          fetchEvents()
        },
      )
      .subscribe()

    return () => {
      sub.unsubscribe()
    }
  }, [clienteId, formularioId, saleCreatedAt])

  return (
    <div className="space-y-6 bg-card">
      <h3 className="font-bold text-card-foreground text-lg border-b border-border pb-3">
        Timeline de Ações
      </h3>
      <div className="space-y-6 pt-2">
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">-</p>
        ) : (
          events.map((event, idx) => (
            <div key={event.id} className="relative flex gap-4">
              {idx !== events.length - 1 && (
                <div className="absolute top-8 bottom-[-24px] left-[15px] w-[2px] bg-border" />
              )}
              <div className="relative z-10 w-8 h-8 rounded-full bg-background flex items-center justify-center shrink-0 border border-border shadow-sm">
                {event.icone ? (
                  <span className="text-sm leading-none select-none" aria-hidden="true">
                    {event.icone}
                  </span>
                ) : (
                  <Clock className="w-4 h-4 text-primary" />
                )}
              </div>
              <div className="pt-1 pb-2">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-xs font-semibold text-primary">
                    {new Date(event.criado_em).toLocaleDateString('pt-BR')}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(event.criado_em).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-sm text-foreground">
                  <span className="font-semibold">{event.nome_exibicao || event.usuario_nome}</span>{' '}
                  {event.acao}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
