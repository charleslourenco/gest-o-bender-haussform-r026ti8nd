import { Lead } from '@/types'
import { cn } from '@/lib/utils'
import { KanbanCard } from './KanbanCard'

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
}: Props) {
  return (
    <div
      className={cn(
        'min-w-full md:min-w-[260px] md:w-[260px] rounded-lg p-3 flex flex-col gap-3 min-h-[600px] max-h-full transition-all duration-200',
        isVisible ? 'flex' : 'hidden md:flex',
        isDragOver
          ? 'bg-dark-denim/10 border-2 border-dashed border-dark-denim'
          : 'bg-pale-cornflower border-2 border-transparent',
      )}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <h3 className="text-midnight-navy font-bold text-[16px] flex items-center gap-2 mb-1">
        {title} <span className="text-steel-blue text-[13px] font-normal">({leads.length})</span>
      </h3>
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
          />
        ))}
      </div>
    </div>
  )
}
