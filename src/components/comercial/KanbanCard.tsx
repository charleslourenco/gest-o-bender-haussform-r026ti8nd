import { Lead } from '@/types'
import { Edit2, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  lead: Lead
  isDragging: boolean
  onDragStart: (e: React.DragEvent) => void
  onDragEnd: (e: React.DragEvent) => void
  onEdit: () => void
  onDelete: () => void
}

export function KanbanCard({ lead, isDragging, onDragStart, onDragEnd, onEdit, onDelete }: Props) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        'bg-off-white rounded-lg p-4 mb-3 cursor-grab active:cursor-grabbing transition-all duration-200',
        isDragging
          ? 'opacity-50 border-[3px] border-dark-denim shadow-none scale-100'
          : 'border-2 border-steel-blue shadow-[0_2px_8px_rgba(10,25,49,0.1)] hover:border-dark-denim hover:shadow-[0_4px_12px_rgba(10,25,49,0.15)] hover:scale-[1.02]',
      )}
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="text-midnight-navy font-semibold text-[16px] leading-tight pr-2">
          {lead.nome}
        </h4>
        <div className="flex gap-1 shrink-0">
          <button
            onClick={onEdit}
            className="text-steel-blue hover:text-dark-denim focus:outline-none focus:ring-1 focus:ring-dark-denim rounded min-h-[24px] min-w-[24px] flex items-center justify-center transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="text-steel-blue hover:text-dark-denim focus:outline-none focus:ring-1 focus:ring-dark-denim rounded min-h-[24px] min-w-[24px] flex items-center justify-center transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <p className="text-steel-blue text-[14px] mb-1 truncate" title={lead.email}>
        {lead.email}
      </p>
      <p className="text-steel-blue text-[14px] mb-2">{lead.telefone}</p>
      <p className="text-midnight-navy text-[14px] mb-1">
        Resp: {lead.consultor?.nome || 'Nenhum'}
      </p>
      <p className="text-steel-blue text-[12px]">
        {new Date(lead.criado_em).toLocaleDateString('pt-BR')}
      </p>
    </div>
  )
}
