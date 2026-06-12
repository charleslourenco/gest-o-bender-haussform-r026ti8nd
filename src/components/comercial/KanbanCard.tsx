import { useState, useEffect } from 'react'
import { Lead } from '@/types'
import {
  Trash2,
  Calendar,
  Clock,
  Briefcase,
  MessageSquare,
  Handshake,
  HardHat,
  User,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Props {
  lead: Lead
  isDragging: boolean
  onDragStart: (e: React.DragEvent) => void
  onDragEnd: (e: React.DragEvent) => void
  onEdit: () => void
  onDelete: () => void
  onStatusChange: (id: string, newStatus: string) => void
  columns: string[]
}

const categoryConfig = {
  Comercial: {
    icon: Briefcase,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-100/50 dark:bg-emerald-400/10',
    border: 'border-emerald-200 dark:border-emerald-400/20',
  },
  'Outros Assuntos': {
    icon: MessageSquare,
    color: 'text-slate-600 dark:text-slate-300',
    bg: 'bg-slate-100/50 dark:bg-slate-300/10',
    border: 'border-slate-200 dark:border-slate-300/20',
  },
  Parceiro: {
    icon: Handshake,
    color: 'text-indigo-600 dark:text-indigo-300',
    bg: 'bg-indigo-100/50 dark:bg-indigo-300/10',
    border: 'border-indigo-200 dark:border-indigo-300/20',
  },
  Equipe: {
    icon: HardHat,
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-100/50 dark:bg-orange-500/10',
    border: 'border-orange-200 dark:border-orange-500/20',
  },
}

export function KanbanCard({
  lead,
  isDragging,
  onDragStart,
  onDragEnd,
  onEdit,
  onDelete,
  onStatusChange,
  columns,
}: Props) {
  const [elapsed, setElapsed] = useState('')
  const isAguardando = lead.status === 'Aguardando Consultor'

  const catName = (lead as any).categoria || 'Comercial'
  const {
    icon: CatIcon,
    color: catColor,
    bg: catBg,
    border: catBorder,
  } = categoryConfig[catName as keyof typeof categoryConfig] || categoryConfig['Comercial']

  const consultorRaw = lead.consultor || (lead as any).users
  const consultorNome = Array.isArray(consultorRaw) ? consultorRaw[0]?.nome : consultorRaw?.nome

  useEffect(() => {
    const updateTimer = () => {
      const start = new Date(lead.criado_em).getTime()
      const now = Date.now()
      const diff = Math.max(0, now - start)

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
      const mins = Math.floor((diff / 1000 / 60) % 60)

      let timeStr = ''
      if (days > 0) timeStr += `${days}d `
      if (hours > 0 || days > 0) timeStr += `${hours}h `
      timeStr += `${mins}m`

      setElapsed(timeStr)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 60000)
    return () => clearInterval(interval)
  }, [lead.criado_em])

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button')) return
        onEdit()
      }}
      className={cn(
        'bg-card border border-border rounded-lg p-3 mb-3 shadow-sm transition-all duration-200 cursor-pointer group hover:shadow-md hover:border-primary/50 relative',
        isAguardando
          ? 'border-orange-500/50 shadow-[0_0_10px_rgba(249,115,22,0.1)] dark:shadow-[0_0_10px_rgba(249,115,22,0.2)]'
          : '',
        isDragging && 'opacity-50 ring-2 ring-primary border-primary',
      )}
    >
      <div className="flex justify-between items-start mb-2.5">
        <h4 className="text-foreground font-semibold text-[14px] leading-tight flex items-center gap-2 pr-2">
          {isAguardando && (
            <span className="flex h-2 w-2 relative shrink-0" title="Aguardando Consultor">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
            </span>
          )}
          <span className="line-clamp-2">{lead.nome}</span>
        </h4>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="text-muted-foreground hover:text-destructive p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 -mt-1 -mr-1"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="mb-2.5" onClick={(e) => e.stopPropagation()}>
        <Select value={lead.status} onValueChange={(val) => onStatusChange(lead.id, val)}>
          <SelectTrigger className="h-7 text-xs bg-muted/30 text-foreground border-border w-full font-medium shadow-none focus:ring-1 focus:ring-primary">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {columns.map((c) => (
              <SelectItem key={c} value={c} className="text-xs">
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-end justify-between pt-2.5 border-t border-border/50">
        <div className="flex flex-col gap-1.5 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5" title="Data de contato">
            <Calendar className="w-3 h-3 shrink-0" />
            <span>
              {new Date(lead.criado_em).toLocaleString('pt-BR', {
                timeZone: 'America/Sao_Paulo',
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
          <div className="flex items-center gap-1.5" title="Tempo desde o primeiro contato">
            <Clock className="w-3 h-3 shrink-0" />
            <span className="font-medium text-foreground">{elapsed}</span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5">
          {consultorNome && (
            <div
              className="flex items-center gap-1 text-[10px] text-foreground font-medium bg-secondary px-1.5 py-0.5 rounded w-fit border border-border"
              title={`Consultor: ${consultorNome}`}
            >
              <User className="w-2.5 h-2.5" />
              <span className="truncate max-w-[85px]">{consultorNome}</span>
            </div>
          )}
          <div
            className={cn(
              'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium tracking-wide w-fit border',
              catColor,
              catBg,
              catBorder,
            )}
            title={`Categoria: ${catName}`}
          >
            <CatIcon className="w-2 h-2" />
            {catName}
          </div>
        </div>
      </div>
    </div>
  )
}
