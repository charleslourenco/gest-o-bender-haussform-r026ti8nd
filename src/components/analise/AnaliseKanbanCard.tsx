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
      className={`flex flex-col gap-0.5 p-1.5 w-full h-fit bg-[#1A3D63] text-white rounded-lg shadow-sm cursor-grab hover:shadow-md transition-all ${card.is_outsourced ? 'border border-orange-500' : ''} ${isDragging ? 'opacity-50 ring-2 ring-primary' : ''}`}
    >
      <div className="flex flex-row items-baseline gap-1.5 w-full truncate text-[10px]">
        {card.codigo_rastreio && (
          <span className="truncate max-w-[40%] font-bold text-blue-200">
            {card.codigo_rastreio}
          </span>
        )}
        {card.clientes?.nome && (
          <span className="truncate max-w-[60%] text-gray-300">{card.clientes.nome}</span>
        )}
      </div>

      <h4 className="font-semibold text-xs truncate w-full">{card.nome_produto}</h4>

      {needsCheck && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onCheckOutsourced()
          }}
          title="Possui Terceirizado??"
          className="bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded w-fit self-center mt-0.5 flex items-center justify-center hover:bg-amber-600 cursor-pointer shrink-0"
        >
          ⚠️
        </button>
      )}
    </div>
  )
}
