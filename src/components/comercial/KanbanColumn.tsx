import { Lead } from '@/types'
import { cn } from '@/lib/utils'
import { KanbanCard } from './KanbanCard'

interface Props {
  title: string
  leads: Lead[]
  isVisible: boolean
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onDragStart: (e: React.DragEvent, id: string) => void
  onEdit: (lead: Lead) => void
  onDelete: (lead: Lead) => void
}

export function KanbanColumn({
  title,
  leads,
  isVisible,
  onDragOver,
  onDrop,
  onDragStart,
  onEdit,
  onDelete,
}: Props) {
  return (
    <div
      className={cn(
        'bg-pale-cornflower min-w-[300px] w-full md:w-[300px] rounded-lg p-4 flex flex-col gap-4 min-h-[200px] max-h-full',
        isVisible ? 'flex' : 'hidden md:flex',
      )}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <h3 className="text-midnight-navy font-bold text-[18px]">
        {title} ({leads.length})
      </h3>
      <div className="flex flex-col gap-3 flex-1 overflow-y-auto pb-4 pr-1 scrollbar-hide">
        {leads.map((lead) => (
          <KanbanCard
            key={lead.id}
            lead={lead}
            onDragStart={(e) => onDragStart(e, lead.id)}
            onEdit={() => onEdit(lead)}
            onDelete={() => onDelete(lead)}
          />
        ))}
      </div>
    </div>
  )
}
