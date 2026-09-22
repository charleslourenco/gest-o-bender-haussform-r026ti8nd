import { CardData } from './types'
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Clock, AlertTriangle, ShieldAlert, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AlocadosBadge } from './alocados-helper'
import { getBadgeProgramacaoSemana, avaliarPortaoProntidaoProducao } from '@/lib/pcp-capacity'

export function KanbanCard({
  card,
  usersMap,
  onClick,
  onDragStart,
}: {
  card: CardData | null
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
    if (isProducao && card?.id) {
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
  }, [card?.id, card?.status_analise, card?.criado_em, isProducao])

  useEffect(() => {
    if ((isMontagem || isProducao) && card?.id) {
      let isMounted = true
      supabase
        .from('alocacao_montagem')
        .select('pessoa_nome, montadores(nome_completo)')
        .eq('card_id', card.id)
        .then(({ data }) => {
          if (!isMounted || !data) return
          const nomes = data
            .map((d: any) => d?.pessoa_nome || d?.montadores?.nome_completo)
            .filter(Boolean)
          setMontadores(nomes)
        })
        .catch(() => {
          if (isMounted) setMontadores([])
        })
      return () => {
        isMounted = false
      }
    } else {
      setMontadores([])
    }
  }, [card?.id, isMontagem, isProducao])

  if (!card) return null

  const clienteNome =
    card.cliente?.nome ||
    card.clientes?.nome ||
    card.formulario_comercial?.nome_cliente ||
    'Cliente N/A'
  const codigoExibicao = card?.codigo_rastreio
    ? `#${card.codigo_rastreio}`
    : `#${card?.formulario_comercial_id?.split('-')[0]?.toUpperCase() || 'N/A'}`

  const corVinculo = card?.cor_vinculo || (card?.card_pai_id ? '#3b82f6' : null)

  // Spec Etapa 4: Sinal PROGRAMADO Sxx
  const semanaEfetiva = card?.semana_planejada_producao || card?.card_pai?.semana_planejada_producao
  const badgeProgramacao = getBadgeProgramacaoSemana(semanaEfetiva)

  // Spec Etapa 4: Trava de Portão de Prontidão na /producao
  const statusAnaliseEfetivo = card?.status_analise || card?.card_pai?.status_analise
  const portaoProntidao = isProducao
    ? avaliarPortaoProntidaoProducao(semanaEfetiva, statusAnaliseEfetivo)
    : 'normal'

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, card.id)}
      onClick={onClick}
      style={corVinculo ? { borderLeftWidth: '4px', borderLeftColor: corVinculo } : undefined}
      className={cn(
        'cursor-pointer hover:shadow-md transition-all duration-200 flex flex-col border-2 p-1.5 rounded-md gap-1 bg-card text-card-foreground shadow-sm border-border hover:border-primary/50 dark:border-cyan-500/50 dark:shadow-[0_0_15px_rgba(6,182,212,0.4)] dark:hover:border-cyan-400',
        card.is_outsourced ? 'border-orange-500 dark:shadow-[0_0_15px_rgba(249,115,22,0.5)]' : '',
        // Spec Etapa 4: Trava de Portão de Prontidão na Produção
        portaoProntidao === 'bloqueado' &&
          'border-rose-500 dark:border-rose-500 bg-rose-50/40 dark:bg-rose-950/20 ring-1 ring-rose-500',
        portaoProntidao === 'liberado' &&
          'border-emerald-500 dark:border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20',
      )}
    >
      {/* Spec Etapa 4: Trava de Portão de Prontidão na Produção (Topo do card) */}
      {isProducao && portaoProntidao === 'bloqueado' && (
        <div
          className="flex items-center gap-1 text-[9px] font-bold text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/50 px-1.5 py-0.5 rounded border border-rose-300 dark:border-rose-800 animate-pulse"
          title="Semana de produção chegou, mas Análise Técnica ainda está pendente de liberação!"
        >
          <ShieldAlert className="w-3 h-3 shrink-0 text-rose-600" />
          <span className="truncate">🚨 BLOQUEADO: Pendente Liberação Técnica</span>
        </div>
      )}
      {isProducao && portaoProntidao === 'liberado' && (
        <div
          className="flex items-center gap-1 text-[9px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/50 px-1.5 py-0.5 rounded border border-emerald-300 dark:border-emerald-800"
          title="Análise Técnica concluída (100%). Pronto para corte na fábrica."
        >
          <CheckCircle2 className="w-3 h-3 shrink-0 text-emerald-600" />
          <span className="truncate">✅ LIBERADO PARA CORTE</span>
        </div>
      )}

      {/* Spec Etapa 4: Badge PROGRAMADO Sxx */}
      {badgeProgramacao && (
        <div className="flex items-center">
          <span
            className={cn(
              'text-[9px] font-bold px-1.5 py-0.5 rounded border leading-none',
              badgeProgramacao.isCurrent
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-400/50'
                : 'bg-muted text-muted-foreground border-border',
            )}
            title={badgeProgramacao.label}
          >
            {badgeProgramacao.label}
          </span>
        </div>
      )}

      <span className="inline-block text-[9px] font-mono font-bold px-1 py-0.5 rounded border border-border text-primary bg-muted/50 shrink-0 leading-none w-fit">
        {codigoExibicao}
      </span>

      <span className="text-xs truncate text-foreground" title={clienteNome}>
        {clienteNome}
      </span>

      <div className="font-semibold text-card-foreground leading-tight text-xs truncate">
        {card.nome_produto || 'Sem nome'}
      </div>

      {card.card_pai_id && (
        <span className="text-[9px] px-1.5 py-0.5 rounded font-medium bg-primary/10 text-primary w-fit truncate">
          ↳ {card.card_pai?.nome_produto || 'Card pai'}
        </span>
      )}

      <div className="flex justify-between items-center w-full mt-0.5">
        <div className="truncate text-[10px] text-muted-foreground">Qtd: {card.qtd || 0}</div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {montadores.length > 0 && (
            <AlocadosBadge alocados={montadores} icon={isMontagem ? 'wrench' : 'users'} />
          )}
        </div>
      </div>

      {isProducao && timeInColumn && (
        <div
          className="flex items-center gap-0.5 text-[9px] leading-none text-muted-foreground bg-muted/50 px-1 py-0.5 rounded"
          title="Tempo nesta etapa"
        >
          <Clock className="w-2.5 h-2.5" />
          <span>{timeInColumn}</span>
        </div>
      )}

      {!isMontagem && !isProducao && card.analista_id && usersMap?.[card.analista_id] && (
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

      {isAnaliseTecnica && !card.is_outsourced && !card.outsourced_checked && (
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          title="Terceirizado Pendente"
          className="bg-amber-500 text-white p-0.5 rounded w-fit flex items-center justify-center hover:bg-amber-600 transition-colors border border-amber-500/50"
        >
          <AlertTriangle className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
