import { Lead } from '@/types'
import {
  Edit2,
  Trash2,
  Calendar,
  User,
  Clock,
  Briefcase,
  MessageSquare,
  Handshake,
  HardHat,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  lead: Lead
  isDragging: boolean
  onDragStart: (e: React.DragEvent) => void
  onDragEnd: (e: React.DragEvent) => void
  onEdit: () => void
  onDelete: () => void
}

const categoryConfig = {
  Comercial: {
    icon: Briefcase,
    color: 'text-emerald-700',
    bg: 'bg-emerald-100',
    border: 'border-emerald-200',
  },
  'Outros Assuntos': {
    icon: MessageSquare,
    color: 'text-slate-700',
    bg: 'bg-slate-200',
    border: 'border-slate-300',
  },
  Parceiro: {
    icon: Handshake,
    color: 'text-indigo-700',
    bg: 'bg-indigo-100',
    border: 'border-indigo-200',
  },
  Equipe: {
    icon: HardHat,
    color: 'text-amber-700',
    bg: 'bg-amber-100',
    border: 'border-amber-200',
  },
}

export function KanbanCard({ lead, isDragging, onDragStart, onDragEnd, onEdit, onDelete }: Props) {
  const isAguardando = lead.status === 'Aguardando Consultor'

  const catName = (lead as any).categoria || 'Comercial'
  const {
    icon: CatIcon,
    color: catColor,
    bg: catBg,
    border: catBorder,
  } = categoryConfig[catName as keyof typeof categoryConfig] || categoryConfig['Comercial']

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        'bg-off-white border-2 rounded-lg p-4 mb-3 shadow-[0_2px_8px_rgba(10,25,49,0.1)] transition-all duration-200 cursor-grab active:cursor-grabbing group hover:shadow-[0_4px_12px_rgba(10,25,49,0.15)] hover:scale-[1.02]',
        isAguardando
          ? 'border-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)] bg-orange-50/50'
          : 'border-steel-blue hover:border-dark-denim',
        isDragging && 'opacity-50 border-dark-denim border-[3px]',
      )}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex flex-col gap-1.5 pr-2">
          <div
            className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider w-fit border',
              catBg,
              catColor,
              catBorder,
            )}
          >
            <CatIcon className="w-3 h-3" />
            {catName}
          </div>
          <h4 className="text-midnight-navy font-semibold text-[16px] leading-tight flex items-center gap-2 mt-1">
            {isAguardando && (
              <span className="flex h-2.5 w-2.5 relative" title="Aguardando Consultor">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span>
              </span>
            )}
            {lead.nome}
          </h4>
        </div>
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
