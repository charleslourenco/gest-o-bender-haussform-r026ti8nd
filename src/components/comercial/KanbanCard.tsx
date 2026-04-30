import { Lead } from '@/types'
import { Edit2, Trash2 } from 'lucide-react'

interface Props {
  lead: Lead
  onDragStart: (e: React.DragEvent) => void
  onEdit: () => void
  onDelete: () => void
}

export function KanbanCard({ lead, onDragStart, onEdit, onDelete }: Props) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="bg-off-white border-2 border-steel-blue rounded-lg p-4 cursor-grab active:cursor-grabbing hover:opacity-90 transition-opacity"
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="text-midnight-navy font-semibold text-[16px] leading-tight pr-2">
          {lead.nome}
        </h4>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={onEdit}
            className="text-steel-blue hover:text-dark-denim focus:outline-none focus:ring-2 focus:ring-dark-denim rounded min-h-[24px] min-w-[24px] flex items-center justify-center"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="text-steel-blue hover:text-dark-denim focus:outline-none focus:ring-2 focus:ring-dark-denim rounded min-h-[24px] min-w-[24px] flex items-center justify-center"
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
