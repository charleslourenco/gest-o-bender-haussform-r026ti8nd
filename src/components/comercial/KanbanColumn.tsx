import { Lead } from '@/types'
import { cn } from '@/lib/utils'
import { KanbanCard } from './KanbanCard'
import { Maximize2, Minimize2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  title: string
  leads: Lead[]
  isVisible: boolean
  isDragOver: boolean
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onDragStart: (e: React.DragEvent, id: string) => void
  onDragEnd: (e: React.DragEvent) => void
  draggingId: string | null
  onEdit: (lead: Lead) => void
  onDelete: (lead: Lead) => void
  isCollapsed: boolean
  onToggleCollapse: () => void
  onStatusChange: (id: string, newStatus: string) => void
  columns: string[]
  onAddLead?: () => void
}

export function KanbanColumn({
  title,
  leads,
  isVisible,
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragStart,
  onDragEnd,
  draggingId,
  onEdit,
  onDelete,
  isCollapsed,
  onToggleCollapse,
  onStatusChange,
  columns,
  onAddLead,
}: Props) {
  if (isCollapsed) {
    return (
      <div
        className={cn(
          'min-w-[60px] w-[60px] md:min-w-[60px] md:w-[60px] rounded-lg p-2 flex flex-col items-center gap-4 transition-all duration-200 cursor-pointer h-full min-h-[500px] max-h-full border',
          isVisible ? 'flex' : 'hidden md:flex',
          isDragOver
            ? 'bg-accent/50 border-dashed border-primary'
            : 'bg-muted/30 border-transparent hover:border-border hover:bg-muted/50',
        )}
        onClick={onToggleCollapse}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <button
          className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors"
          onClick={(e) => {
            e.stopPropagation()
            onToggleCollapse()
          }}
          title="Expandir coluna"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <div className="flex-1 flex justify-center pt-4">
          <span
            className="text-foreground font-bold text-sm whitespace-nowrap rotate-180"
            style={{ writingMode: 'vertical-rl' }}
          >
            {title} ({leads.length})
          </span>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'min-w-full md:min-w-[280px] md:w-[280px] rounded-lg p-3 flex flex-col gap-3 h-full min-h-[500px] max-h-full transition-all duration-200 border',
        isVisible ? 'flex' : 'hidden md:flex',
        isDragOver ? 'bg-accent/50 border-dashed border-primary' : 'bg-muted/30 border-transparent',
      )}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-foreground font-bold text-[15px] flex items-center gap-2">
          {title}{' '}
          <span className="text-muted-foreground text-[13px] font-normal">({leads.length})</span>
        </h3>
        <div className="flex items-center gap-1">
          {onAddLead && (
            <Button
              variant="outline"
              size="icon"
              onClick={onAddLead}
              className="h-7 w-7 rounded-full border-2 border-primary/50 text-primary hover:bg-primary hover:border-primary hover:text-primary-foreground transition-all flex items-center justify-center shrink-0 shadow-sm"
              title="Novo Lead"
            >
              <Plus className="w-4 h-4" strokeWidth={3} />
            </Button>
          )}
          <button
            onClick={onToggleCollapse}
            className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors"
            title="Minimizar coluna"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="flex flex-col flex-1 overflow-y-auto pb-4 pr-1 scrollbar-hide">
        {leads.map((lead) => (
          <KanbanCard
            key={lead.id}
            lead={lead}
            isDragging={draggingId === lead.id}
            onDragStart={(e) => onDragStart(e, lead.id)}
            onDragEnd={onDragEnd}
            onEdit={() => onEdit(lead)}
            onDelete={() => onDelete(lead)}
            onStatusChange={onStatusChange}
            columns={columns}
          />
        ))}
      </div>
    </div>
  )
}
