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
      className={`flex flex-col gap-0 p-1.5 w-full h-fit bg-[#1A3D63] text-white rounded shadow-sm cursor-grab hover:shadow-md hover:border-blue-400/50 transition-all border border-transparent ${card.is_outsourced ? 'border-orange-500' : ''} ${isDragging ? 'opacity-50 ring-2 ring-blue-500' : ''}`}
    >
      <div className="flex flex-row items-center justify-between gap-1 w-full text-[9px] mb-0.5">
        {card.codigo_rastreio ? (
          <span className="font-bold text-blue-200 truncate">{card.codigo_rastreio}</span>
        ) : (
          <span className="text-transparent">N/A</span>
        )}
        {needsCheck && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onCheckOutsourced()
            }}
            title="Possui Terceirizado?"
            className="bg-amber-500 text-white text-[9px] px-1 rounded flex items-center justify-center hover:bg-amber-600 cursor-pointer shrink-0 h-3.5"
          >
            ⚠️
          </button>
        )}
      </div>

      {card.clientes?.nome && (
        <span className="truncate text-slate-300 text-[9px] leading-none mb-0.5">
          {card.clientes.nome}
        </span>
      )}

      <h4 className="font-medium text-[11px] leading-tight line-clamp-2 w-full break-words">
        {card.nome_produto}
      </h4>
    </div>
  )
}
