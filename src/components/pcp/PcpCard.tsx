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
  const isSubcard = Boolean(card.card_pai_id)
  const clientName =
    card.cliente?.nome ||
    card.formulario?.cliente?.nome ||
    card.formulario?.nome_cliente ||
    'Cliente'

  const subcardsCount = Array.isArray(card.subcards) ? card.subcards.length : 0

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation()
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
    if (!isSubcard && Array.isArray(card.subcards) && card.subcards.length > 0) {
      e.dataTransfer.setData('subcardIds', JSON.stringify(card.subcards.map((s) => s.id)))
    }
    e.dataTransfer.effectAllowed = 'move'
  }

  // Texto da pílula:
  // Subcard: [ Cliente — Ambiente — R$ Valor ] (ex.: 'Ló Portela — Cozinha — R$ 18.000,00')
  // Pai com subcards: [ Cliente — Projeto/Ambiente — R$ Valor (+3 ambientes) ]
  // Pai sem subcards: [ Cliente — Ambiente — R$ Valor ]
  const ambienteNome = card.nome_produto || 'Ambiente'
  const valorFormatado = formatBRL(card.valor_total || 0)
  const tagAmbientes = !isSubcard && subcardsCount > 0 ? ` (+${subcardsCount} amb.)` : ''
  const fullText = `${clientName} — ${ambienteNome} — ${valorFormatado}${tagAmbientes}`

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            draggable
            onDragStart={handleDragStart}
            onClick={onClick}
            className={cn(
              'h-[26px] max-h-[26px] px-2 rounded-full border flex items-center justify-between gap-1 text-[11px] font-medium transition-all select-none cursor-grab active:cursor-grabbing w-full overflow-hidden shadow-2xs',
              isDragging && 'opacity-40 scale-95 border-dashed border-primary',
              isSubcard
                ? 'bg-primary/10 border-primary/30 text-primary-foreground/90 hover:bg-primary/20 hover:border-primary/50'
                : 'bg-card border-border hover:border-primary/60 hover:bg-muted/40 text-foreground',
            )}
            style={
              card.cor_vinculo
                ? {
                    borderLeftWidth: '3px',
                    borderLeftColor: card.cor_vinculo,
                  }
                : undefined
            }
          >
            <span className="truncate leading-none flex-1 text-left">
              <strong className="font-semibold text-foreground">{clientName}</strong>
              <span className="text-muted-foreground mx-1">•</span>
              <span className="text-foreground/90">{ambienteNome}</span>
              <span className="text-muted-foreground mx-1">•</span>
              <strong className="text-primary font-bold">{valorFormatado}</strong>
              {tagAmbientes && (
                <span className="text-[10px] text-muted-foreground ml-1 font-normal">
                  {tagAmbientes}
                </span>
              )}
            </span>

            <GripVertical className="w-2.5 h-2.5 text-muted-foreground/40 shrink-0 opacity-0 group-hover:opacity-100 hover:text-foreground" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs max-w-sm">
          <p className="font-bold text-foreground">{fullText}</p>
          {card.codigo_rastreio && (
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
