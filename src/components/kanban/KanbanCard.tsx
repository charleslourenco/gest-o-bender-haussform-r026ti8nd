import { Badge } from '@/components/ui/badge'
import { CardData } from './types'
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Wrench, Clock, AlertTriangle } from 'lucide-react'
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
  const location = useLocation()
  const isMontagem = location.pathname.includes('/montagem')
  const isAnaliseTecnica = location.pathname.includes('/analise-tecnica')
  const isProducao = location.pathname.includes('/producao')
  const [montadores, setMontadores] = useState<string[]>([])
  const [timeInColumn, setTimeInColumn] = useState<string>('')

  useEffect(() => {
    if (isProducao) {
      const fetchTime = async () => {
        const { data } = await supabase
          .from('kanban_historico')
          .select('criado_em')
          .eq('card_id', card.id)
          .eq('status_novo', card.status_analise)
          .order('criado_em', { ascending: false })
          .limit(1)

        const startTime = data && data.length > 0 ? data[0].criado_em : card.criado_em

        if (startTime) {
          const diffInMs = new Date().getTime() - new Date(startTime).getTime()
          const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))
          const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))

          if (diffInDays > 0) {
            setTimeInColumn(`${diffInDays}d`)
          } else if (diffInHours > 0) {
            setTimeInColumn(`${diffInHours}h`)
          } else {
            setTimeInColumn('< 1h')
          }
        }
      }
      fetchTime()

      const interval = setInterval(fetchTime, 60000)
      return () => clearInterval(interval)
    }
  }, [card.id, card.status_analise, card.criado_em, isProducao])

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
        'cursor-pointer hover:shadow-md transition-all flex flex-col border-2',
        isMontagem
          ? 'bg-card text-card-foreground p-2 rounded-md shadow-sm gap-1 w-full border-border hover:border-primary/50 dark:border-cyan-500/50 dark:shadow-[0_0_15px_rgba(6,182,212,0.4)] dark:hover:border-cyan-400'
          : 'rounded-lg shadow-sm hover:shadow-md gap-2',
        isMontagem && card.is_outsourced
          ? 'border-orange-500 dark:shadow-[0_0_15px_rgba(249,115,22,0.5)]'
          : '',
        !isMontagem && isAnaliseTecnica
          ? cn(
              'bg-card text-card-foreground p-1.5 gap-1 border-border',
              card.is_outsourced
                ? 'border-orange-500 dark:shadow-[0_0_15px_rgba(249,115,22,0.5)]'
                : 'hover:border-primary/50 dark:border-cyan-500/50 dark:shadow-[0_0_15px_rgba(6,182,212,0.4)] dark:hover:border-cyan-400',
            )
          : !isMontagem && isProducao
            ? cn(
                'bg-card text-card-foreground hover:border-primary/50 p-2 gap-1 border-border',
                card.is_outsourced
                  ? 'border-orange-500 dark:shadow-[0_0_15px_rgba(249,115,22,0.5)]'
                  : 'dark:border-cyan-500/50 dark:shadow-[0_0_15px_rgba(6,182,212,0.4)] dark:hover:border-cyan-400',
              )
            : !isMontagem
              ? cn(
                  'bg-card text-card-foreground hover:border-primary/50 p-3 gap-2 border-border',
                  card.is_outsourced
                    ? 'border-orange-500 dark:shadow-[0_0_15px_rgba(249,115,22,0.5)]'
                    : 'dark:border-cyan-500/50 dark:shadow-[0_0_15px_rgba(6,182,212,0.4)] dark:hover:border-cyan-400',
                )
              : '',
      )}
    >
      {isMontagem ? (
        <>
          <div className="flex flex-row items-baseline gap-1 w-full truncate text-xs font-medium">
            <span className="truncate w-full text-card-foreground">
              {card?.codigo_rastreio
                ? `#${card.codigo_rastreio}`
                : `#${card?.formulario_comercial_id?.split('-')[0]?.toUpperCase() || 'N/A'}`}
              {' - '}
              {card?.clientes?.nome || 'Cliente N/A'}
            </span>
          </div>
          <div className="truncate w-full text-xs font-semibold text-card-foreground">
            {card?.nome_produto || 'Sem nome'}
          </div>
          <div className="flex justify-between items-center w-full mt-1">
            <div className="truncate w-full text-[10px] text-muted-foreground">
              Qtd: {card?.qtd || 0}
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              {montadores.length > 0 && (
                <div
                  className="flex items-center gap-0.5 text-[9px] leading-none text-emerald-600 bg-emerald-500/10 px-1 py-0.5 rounded border border-emerald-500/20"
                  title={`Montadores: ${montadores.join(', ')}`}
                >
                  <Wrench className="w-2.5 h-2.5" />
                  <span className="truncate max-w-[80px]">{montadores.length} Alocado(s)</span>
                </div>
              )}
            </div>
          </div>
        </>
      ) : isProducao ? (
        <div className="flex justify-between items-start w-full">
          <div className="flex flex-row items-baseline gap-1.5 w-full truncate">
            <span className="font-mono font-bold px-1 py-0.5 rounded text-[9px] leading-none text-primary bg-muted/50 shrink-0">
              {card?.codigo_rastreio ||
                `#${card?.formulario_comercial_id?.split('-')[0]?.toUpperCase() || 'N/A'}`}
            </span>
            <span className="font-semibold text-card-foreground text-xs truncate">
              {card?.nome_produto || 'Sem nome'}
            </span>
          </div>
          <Badge className="text-[9px] py-0 px-1 leading-none bg-muted text-foreground shrink-0 ml-2">
            Qtd: {card?.qtd || 0}
          </Badge>
        </div>
      ) : isAnaliseTecnica ? (
        <>
          <div className="flex justify-between items-start w-full">
            <div className="flex flex-row items-baseline gap-1.5 w-full truncate">
              {card?.codigo_rastreio && (
                <span className="font-mono font-bold px-1 py-0.5 rounded text-[9px] leading-none border border-border text-primary bg-muted/50 shrink-0">
                  {card.codigo_rastreio}
                </span>
              )}
              <span
                className="text-xs truncate text-foreground"
                title={card?.clientes?.nome || 'Cliente N/A'}
              >
                {card?.clientes?.nome || 'Cliente N/A'}
              </span>
            </div>
            <Badge className="text-[9px] py-0 px-1 leading-none bg-muted text-foreground shrink-0 ml-2">
              Qtd: {card?.qtd || 0}
            </Badge>
          </div>
          <div className="font-semibold text-card-foreground leading-tight text-xs mt-0.5">
            {card?.nome_produto || 'Sem nome'}
          </div>
          {!card?.is_outsourced && !card?.outsourced_checked && (
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              title="Terceirizado Pendente"
              className="bg-amber-500 text-white p-0.5 rounded w-fit mt-0.5 flex items-center justify-center hover:bg-amber-600 transition-colors border border-amber-500/50"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
            </button>
          )}
        </>
      ) : (
        <>
          <div className="flex justify-between items-start">
            <span className="font-mono font-bold px-1 py-0.5 rounded text-[10px] leading-none text-primary bg-muted/50">
              {card?.codigo_rastreio ||
                `#${card?.formulario_comercial_id?.split('-')[0]?.toUpperCase() || 'N/A'}`}
            </span>
            <Badge className="text-[9px] py-0 px-1 leading-none bg-primary text-primary-foreground">
              Qtd: {card?.qtd || 0}
            </Badge>
          </div>
          <div className="font-semibold text-card-foreground leading-tight text-sm mt-1">
            {card?.nome_produto || 'Sem nome'}
          </div>
        </>
      )}
      {!isMontagem && (
        <div className="flex justify-between items-end mt-1">
          {!isAnaliseTecnica && (
            <div
              className={cn(
                'text-xs truncate max-w-[150px]',
                isProducao ? 'text-muted-foreground' : 'text-muted-foreground',
              )}
            >
              {card.clientes?.nome || 'Cliente N/A'}
            </div>
          )}
          {isAnaliseTecnica && <div></div>}

          <div className="flex flex-col items-end gap-1.5 shrink-0">
            {!isMontagem && !isProducao && card?.analista_id && usersMap?.[card.analista_id] && (
              <div
                className="flex items-center gap-1"
                title={`Responsável: ${usersMap[card.analista_id]?.nome || 'Sem Nome'}`}
              >
                {usersMap[card.analista_id]?.foto_perfil ? (
                  <img
                    src={usersMap[card.analista_id].foto_perfil as string}
                    className="w-4 h-4 rounded-full object-cover border border-border"
                    alt="Avatar"
                  />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[8px] font-bold">
                    {usersMap[card.analista_id]?.nome?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                )}
              </div>
            )}

            {isProducao && timeInColumn && (
              <div
                className="flex items-center gap-0.5 text-[9px] leading-none text-muted-foreground bg-muted/50 px-1 py-0.5 rounded"
                title={`Tempo nesta etapa`}
              >
                <Clock className="w-2.5 h-2.5" />
                <span>{timeInColumn}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
