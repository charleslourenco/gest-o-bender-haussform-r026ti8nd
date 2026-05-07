import { Lead } from '@/types'
import { Edit2, Trash2, Calendar, User, Clock } from 'lucide-react'
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
        'bg-off-white border-2 border-steel-blue rounded-lg p-4 mb-3 shadow-[0_2px_8px_rgba(10,25,49,0.1)] transition-all duration-200 cursor-grab active:cursor-grabbing group hover:border-dark-denim hover:shadow-[0_4px_12px_rgba(10,25,49,0.15)] hover:scale-[1.02]',
        isDragging && 'opacity-50 border-dark-denim border-[3px]',
      )}
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="text-midnight-navy font-semibold text-[16px] leading-tight pr-2">
          {lead.nome}
        </h4>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={onEdit} className="text-steel-blue hover:text-dark-denim p-1">
            <Edit2 className="w-4 h-4" />
          </button>
          <button onClick={onDelete} className="text-steel-blue hover:text-dark-denim p-1">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 mt-3">
        <p className="text-steel-blue text-[14px] truncate" title={lead.email}>
          {lead.email}
        </p>
        <p className="text-steel-blue text-[14px]">{lead.telefone}</p>
      </div>

      <div className="flex flex-col gap-1.5 mt-3 pt-3 border-t border-steel-blue/20">
        <div className="flex items-center gap-1.5 text-midnight-navy text-[14px]">
          <User className="w-3.5 h-3.5 text-steel-blue shrink-0" />
          <span className="truncate">{lead.consultor?.nome || 'Sem consultor'}</span>
        </div>
        <div className="flex flex-col gap-1.5 text-steel-blue text-[11px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5" title="Data de criação">
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span>
                {new Date(lead.criado_em).toLocaleString('pt-BR', {
                  timeZone: 'America/Sao_Paulo',
                  day: '2-digit',
                  month: '2-digit',
                  year: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            {lead.criado_por_nome && (
              <span
                className="text-[10px] opacity-70 truncate max-w-[80px]"
                title={`Criado por: ${lead.criado_por_nome}`}
              >
                Por: {lead.criado_por_nome.split(' ')[0]}
              </span>
            )}
          </div>
          {lead.atualizado_em && (
            <div
              className="flex items-center gap-1.5 opacity-80"
              title="Última interação/atualização"
            >
              <Clock className="w-3 h-3 shrink-0" />
              <span>
                {new Date(lead.atualizado_em).toLocaleString('pt-BR', {
                  timeZone: 'America/Sao_Paulo',
                  day: '2-digit',
                  month: '2-digit',
                  year: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
