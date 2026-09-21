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
  const prontidao = getProntidaoTecnica(card)
  const isSubcard = Boolean(card.card_pai_id)
  const clientName =
    card.cliente?.nome ||
    card.formulario?.cliente?.nome ||
    card.formulario?.nome_cliente ||
    'Cliente não informado'

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('cardId', card.id)
    if (linha) {
      e.dataTransfer.setData('sourceLinha', linha)
    }
    if (currentSemana) {
      e.dataTransfer.setData('sourceSemana', currentSemana)
    }
    if (currentMes) {
      e.dataTransfer.setData('sourceMes', currentMes)
    }
    e.dataTransfer.effectAllowed = 'move'
  }

  const renderProntidaoIcon = () => {
    switch (prontidao.status) {
      case 'pronto':
        return (
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        )
      case 'bloqueado':
        return <ShieldAlert className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
      case 'em_analise':
        return <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
      default:
        return <AlertCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
    }
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div
        draggable
        onDragStart={handleDragStart}
        onClick={onClick}
        className={cn(
          'group relative bg-card text-card-foreground rounded-lg border border-border shadow-2xs hover:shadow-md transition-all cursor-grab active:cursor-grabbing select-none',
          'hover:border-primary/50 dark:hover:border-primary/60',
          isDragging && 'opacity-40 scale-95 border-dashed border-primary',
          isSubcard && 'border-l-4 border-l-primary/60 bg-muted/20',
          compact ? 'p-2' : 'p-2.5',
        )}
        style={
          card.cor_vinculo
            ? { borderLeftWidth: '4px', borderLeftColor: card.cor_vinculo }
            : undefined
        }
      >
        {/* Topo: Cliente & Prontidão Técnica */}
        <div className="flex items-start justify-between gap-1.5 mb-1">
          <div className="min-w-0 flex-1">
            {showClientName && (
              <p
                className="text-xs font-semibold text-foreground truncate leading-tight group-hover:text-primary transition-colors"
                title={clientName}
              >
                {clientName}
              </p>
            )}
            <div className="flex items-center gap-1 mt-0.5">
              {isSubcard && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 font-medium shrink-0">
                  <Layers className="w-3 h-3 text-primary" />↳
                </span>
              )}
              <span
                className="text-xs font-medium text-muted-foreground truncate"
                title={card.nome_produto}
              >
                {card.nome_produto}
              </span>
            </div>
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="p-0.5 rounded hover:bg-muted/60 transition-colors shrink-0">
                {renderProntidaoIcon()}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs max-w-xs">
              <p className="font-semibold">{prontidao.label}</p>
              <p className="text-[11px] text-muted-foreground">{prontidao.tooltip}</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Rodapé: Valor R$ e Rastreio */}
        <div className="flex items-center justify-between gap-2 mt-2 pt-1.5 border-t border-border/50 text-[11px]">
          <div className="flex items-center gap-1 font-semibold text-foreground">
            <span className="text-primary font-bold">{formatBRL(card.valor_total || 0)}</span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {card.codigo_rastreio ? (
              <span className="font-mono text-[10px] bg-primary/10 text-primary px-1.5 py-0.2 rounded font-medium">
                {card.codigo_rastreio}
              </span>
            ) : isSubcard ? (
              <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                Subcard
              </Badge>
            ) : null}
            <GripVertical className="w-3 h-3 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0" />
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
