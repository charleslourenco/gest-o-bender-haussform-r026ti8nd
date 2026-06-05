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
      className={`flex flex-col gap-1 p-2 w-full h-fit bg-[#1A3D63] text-white rounded-lg shadow-sm cursor-grab hover:shadow-md transition-all ${card.is_outsourced ? 'border-2 border-orange-500' : ''} ${isDragging ? 'opacity-50 ring-2 ring-primary' : ''}`}
    >
      <div className="flex flex-row items-baseline gap-1 w-full truncate text-xs">
        {card.codigo_rastreio && (
          <span className="truncate w-full font-bold text-blue-200">{card.codigo_rastreio}</span>
        )}
        {card.clientes?.nome && (
          <span className="truncate w-full text-gray-300">{card.clientes.nome}</span>
        )}
      </div>

      <h4 className="font-semibold text-sm truncate w-full">{card.nome_produto}</h4>

      {needsCheck && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onCheckOutsourced()
          }}
          title="Possui Terceirizado??"
          className="bg-red-500 text-white text-sm px-2 py-1 rounded w-fit self-center mt-1 flex items-center justify-center hover:bg-red-600 cursor-pointer shrink-0"
        >
          ⚠️
        </button>
      )}
    </div>
  )
}
