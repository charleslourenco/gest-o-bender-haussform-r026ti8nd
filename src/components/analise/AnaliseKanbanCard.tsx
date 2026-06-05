import { AlertTriangle, User, Hash } from 'lucide-react'

export function AnaliseKanbanCard({
  card,
  isDragging,
  onDragStart,
  onDragEnd,
  onCheckOutsourced,
}: any) {
  const needsCheck = card.outsourced_checked === false || card.outsourced_checked === null

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`bg-white border ${needsCheck ? 'border-red-300' : 'border-slate-200'} rounded-lg p-3 shadow-sm cursor-grab hover:shadow-md transition-all ${isDragging ? 'opacity-50 ring-2 ring-primary' : ''}`}
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-semibold text-sm text-slate-800 line-clamp-2">{card.nome_produto}</h4>
      </div>

      {card.clientes?.nome && (
        <div className="flex items-center text-xs text-slate-600 mb-1.5 font-medium">
          <User className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
          <span className="truncate">{card.clientes.nome}</span>
        </div>
      )}
      {card.codigo_rastreio && (
        <div className="flex items-center text-[11px] text-slate-500 mb-2">
          <Hash className="w-3 h-3 mr-1.5 text-slate-400" />
          <span>{card.codigo_rastreio}</span>
        </div>
      )}

      {needsCheck && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onCheckOutsourced()
          }}
          className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded w-full mt-2 flex items-center justify-center gap-1 hover:bg-red-600 transition-colors shadow-sm"
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          ⚠️ Terceirizado Pendente
        </button>
      )}
    </div>
  )
}
