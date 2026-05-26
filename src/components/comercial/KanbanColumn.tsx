import { Lead } from '@/types'
import { cn } from '@/lib/utils'
import { KanbanCard } from './KanbanCard'
import { Maximize2, Minimize2 } from 'lucide-react'

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
}: Props) {
  if (isCollapsed) {
    return (
      <div
        className={cn(
          'min-w-[60px] w-[60px] md:min-w-[60px] md:w-[60px] rounded-lg p-2 flex flex-col items-center gap-4 transition-all duration-200 cursor-pointer h-full min-h-[500px] max-h-full border-2',
          isVisible ? 'flex' : 'hidden md:flex',
          isDragOver
            ? 'bg-dark-denim/10 border-dashed border-dark-denim'
            : 'bg-pale-cornflower border-transparent hover:border-steel-blue',
        )}
        onClick={onToggleCollapse}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <button
          className="text-steel-blue hover:text-dark-denim p-1 rounded transition-colors"
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
            className="text-midnight-navy font-bold text-sm whitespace-nowrap rotate-180"
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
        'min-w-full md:min-w-[260px] md:w-[260px] rounded-lg p-3 flex flex-col gap-3 h-full min-h-[500px] max-h-full transition-all duration-200 border-2',
        isVisible ? 'flex' : 'hidden md:flex',
        isDragOver
          ? 'bg-dark-denim/10 border-dashed border-dark-denim'
          : 'bg-pale-cornflower border-transparent',
      )}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-midnight-navy font-bold text-[16px] flex items-center gap-2">
          {title} <span className="text-steel-blue text-[13px] font-normal">({leads.length})</span>
        </h3>
        <button
          onClick={onToggleCollapse}
          className="text-steel-blue hover:text-dark-denim p-1 rounded transition-colors"
          title="Minimizar coluna"
        >
          <Minimize2 className="w-4 h-4" />
        </button>
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
