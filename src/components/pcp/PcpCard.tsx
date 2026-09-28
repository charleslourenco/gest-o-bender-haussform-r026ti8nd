import React from 'react'
import { PcpCardItem, getProntidaoTecnica, PcpLinhaOperacao } from '@/services/pcp-planejamento'
import { formatBRL } from '@/lib/pcp-capacity'
import { CheckCircle2, AlertCircle, Clock, ShieldAlert, Layers, GripVertical } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface PcpCardProps {
  card: PcpCardItem
  linha?: PcpLinhaOperacao
  currentSemana?: string | null
  currentMes?: string | null
  onClick?: () => void
  isDragging?: boolean
  compact?: boolean
  showClientName?: boolean
}

export const PcpCard: React.FC<PcpCardProps> = ({
  card,
  linha,
  currentSemana,
  currentMes,
  onClick,
  isDragging = false,
  compact = false,
  showClientName = true,
}) => {
  const isSubcard = Boolean(card?.card_pai_id)
  const clientName =
    card?.cliente?.nome ||
    card?.formulario?.cliente?.nome ||
    card?.formulario?.nome_cliente ||
    'Cliente'

  const subcardsCount = Array.isArray(card?.subcards) ? card.subcards.length : 0

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation()
    if (!card?.id) return
    e.dataTransfer.setData('cardId', card.id)
    e.dataTransfer.setData('isSubcard', isSubcard ? 'true' : 'false')
    if (linha) {
      e.dataTransfer.setData('sourceLinha', linha)
    }
    if (currentSemana) {
      e.dataTransfer.setData('sourceSemana', currentSemana)
    }
    if (currentMes) {
      e.dataTransfer.setData('sourceMes', currentMes)
    }
    if (!isSubcard && Array.isArray(card?.subcards) && card.subcards.length > 0) {
      const validSubcardIds = card.subcards
        .filter(Boolean)
        .map((s) => s.id)
        .filter(Boolean)
      if (validSubcardIds.length > 0) {
        e.dataTransfer.setData('subcardIds', JSON.stringify(validSubcardIds))
      }
    }
    e.dataTransfer.effectAllowed = 'move'
  }

  if (!card) return null

  const ambienteNome = card?.nome_produto || 'Ambiente'
  const valorFormatado = formatBRL(card?.valor_total || 0)
  const tagAmbientes = !isSubcard && subcardsCount > 0 ? ` (+${subcardsCount} amb.)` : ''

  const formatDiaSemanaSigla = (dateStr?: string | null): string => {
    if (!dateStr) return ''
    const clean = dateStr.slice(0, 10)
    const d = new Date(`${clean}T12:00:00`)
    if (isNaN(d.getTime())) return ''
    const siglas = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    return siglas[d.getDay()] || ''
  }

  const diaAna = formatDiaSemanaSigla(card?.data_planejada_analise)
  const semAna = card?.semana_planejada_analise || ''
  const chipAna = semAna ? `📐 ${semAna}${diaAna ? `·${diaAna}` : ''}` : '📐 —'

  const diaProd = formatDiaSemanaSigla(card?.data_planejada_producao)
  const semProd = card?.semana_planejada_producao || ''
  const chipProd = semProd ? `🏭 ${semProd}${diaProd ? `·${diaProd}` : ''}` : '🏭 —'

  const diaMont = formatDiaSemanaSigla(card?.data_planejada_montagem)
  const semMont = card?.semana_planejada_montagem || ''
  const chipMont = semMont ? `🔧 ${semMont}${diaMont ? `·${diaMont}` : ''}` : '🔧 —'

  const triadeStr = `${chipAna} | ${chipProd} | ${chipMont}`
  const fullText = `${clientName} / ${ambienteNome} — ${valorFormatado} [${triadeStr}]`

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            draggable
            onDragStart={handleDragStart}
            onClick={onClick}
            className={cn(
              'px-2 py-1 rounded-md border flex flex-col gap-0.5 text-[11px] font-medium transition-all select-none cursor-grab active:cursor-grabbing w-full overflow-hidden shadow-2xs',
              isDragging && 'opacity-40 scale-95 border-dashed border-primary',
              isSubcard
                ? 'bg-primary/10 border-primary/30 text-primary-foreground/90 hover:bg-primary/20 hover:border-primary/50'
                : 'bg-card border-border hover:border-primary/60 hover:bg-muted/40 text-foreground',
            )}
            style={
              card?.cor_vinculo
                ? {
                    borderLeftWidth: '3px',
                    borderLeftColor: card.cor_vinculo,
                  }
                : undefined
            }
          >
            {/* Linha 1: Nome Cliente / Ambiente + Valor */}
            <div className="flex items-center justify-between gap-1 w-full leading-tight">
              <span className="truncate flex-1 text-left">
                <strong className="font-bold text-foreground">{clientName}</strong>
                <span className="text-muted-foreground mx-0.5">/</span>
                <span className="text-foreground/90 font-medium">{ambienteNome}</span>
                {tagAmbientes && (
                  <span className="text-[9px] text-muted-foreground ml-1 font-normal">
                    {tagAmbientes}
                  </span>
                )}
              </span>

              <GripVertical className="w-2.5 h-2.5 text-muted-foreground/40 shrink-0 opacity-0 group-hover:opacity-100 hover:text-foreground" />
            </div>

            {/* Linha 2: Mini-badge compacto com a tríade 📐 Sxx·dia | 🏭 Sxx·dia | 🔧 Sxx·dia */}
            <div className="flex items-center justify-between gap-1 pt-0.5 border-t border-border/30 text-[9px] font-mono">
              <span className="text-muted-foreground truncate" title={triadeStr}>
                {triadeStr}
              </span>
              <strong className="text-primary font-bold text-[10px] shrink-0 font-sans">
                {valorFormatado}
              </strong>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs max-w-sm">
          <p className="font-bold text-foreground">{fullText}</p>
          {card?.codigo_rastreio && (
            <p className="text-[10px] text-muted-foreground font-mono">
              Rastreio: {card.codigo_rastreio}
            </p>
          )}
          {isSubcard && <p className="text-[10px] text-primary">Subcard (Ambiente individual)</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
