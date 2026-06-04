import { Badge } from '@/components/ui/badge'
import { CardData } from './types'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'

export function KanbanCard({
  card,
  usersMap,
  onClick,
  onDragStart,
}: {
  card: CardData
  usersMap: Record<string, { nome: string; foto_perfil: string | null }>
  onClick: () => void
  onDragStart: (e: React.DragEvent, id: string) => void
}) {
  const isMontagem = typeof window !== 'undefined' && window.location.pathname.includes('/montagem')
  const isAnaliseTecnica =
    typeof window !== 'undefined' && window.location.pathname.includes('/analise-tecnica')
  const [montadores, setMontadores] = useState<string[]>([])

  useEffect(() => {
    if (isMontagem) {
      supabase
        .from('alocacao_montagem')
        .select('montadores(nome_completo)')
        .eq('card_id', card.id)
        .then(({ data }) => {
          if (data) {
            setMontadores(data.map((d: any) => d.montadores?.nome_completo).filter(Boolean))
          }
        })
    }
  }, [card.id, isMontagem])

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, card.id)}
      onClick={onClick}
      className={cn(
        'rounded-lg border shadow-sm cursor-pointer hover:shadow-md transition-all flex flex-col',
        isAnaliseTecnica
          ? 'bg-[#1A3D63] border-white/20 hover:border-white/40 p-2.5 gap-1.5'
          : 'bg-midnight-navy border-steel-blue/40 hover:border-pale-cornflower p-4 gap-2',
      )}
    >
      <div className="flex justify-between items-start">
        <span
          className={cn(
            'font-mono font-bold px-1.5 py-0.5 rounded',
            isAnaliseTecnica
              ? 'text-[10px] text-white bg-white/10'
              : 'text-xs text-pale-cornflower bg-steel-blue/20',
          )}
        >
          {card.codigo_rastreio ||
            `#${card.formulario_comercial_id?.split('-')[0].toUpperCase() || 'N/A'}`}
        </span>
        <Badge
          className={cn(
            'text-[10px] py-0',
            isAnaliseTecnica ? 'bg-white/20 text-white' : 'bg-steel-blue',
          )}
        >
          Qtd: {card.qtd}
        </Badge>
      </div>
      <div
        className={cn(
          'font-semibold text-[#F6FAFD] leading-snug',
          isAnaliseTecnica ? 'text-sm' : 'text-base',
        )}
      >
        {card.nome_produto}
      </div>
      <div className="flex justify-between items-end mt-1">
        <div
          className={cn(
            'text-xs truncate max-w-[150px]',
            isAnaliseTecnica ? 'text-white/70' : 'text-pale-cornflower/80',
          )}
        >
          {card.clientes?.nome || 'Cliente N/A'}
        </div>

        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {!isMontagem && card.analista_id && usersMap[card.analista_id] && (
            <div
              className="flex items-center gap-1.5"
              title={`Responsável: ${usersMap[card.analista_id].nome}`}
            >
              {usersMap[card.analista_id].foto_perfil ? (
                <img
                  src={usersMap[card.analista_id].foto_perfil as string}
                  className="w-5 h-5 rounded-full object-cover border border-steel-blue"
                  alt="Avatar"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-steel-blue text-midnight-navy flex items-center justify-center text-[9px] font-bold">
                  {usersMap[card.analista_id].nome.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          )}

          {isMontagem && montadores.length > 0 && (
            <div
              className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20"
              title={`Montadores: ${montadores.join(', ')}`}
            >
              <Wrench className="w-3 h-3" />
              <span>{montadores.length} Alocado(s)</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
