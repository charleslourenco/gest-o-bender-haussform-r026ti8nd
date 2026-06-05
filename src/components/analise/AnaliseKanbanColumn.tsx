import { AnaliseKanbanCard } from './AnaliseKanbanCard'

export function AnaliseKanbanColumn({
  column,
  cards,
  onDragOver,
  onDragLeave,
  onDrop,
  isDragOver,
  onDragStart,
  onDragEnd,
  draggingId,
  onCheckOutsourced,
}: any) {
  return (
    <div
      className={`flex flex-col w-[240px] bg-slate-100/90 border border-slate-200 rounded-md p-2 transition-colors h-full shrink-0 ${isDragOver ? 'ring-2 ring-primary/50 bg-slate-200' : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <h3 className="font-semibold text-slate-700 mb-2.5 px-1 flex items-center justify-between text-[13px] shrink-0">
        {column.title}
        <span className="bg-white text-slate-600 text-[10px] px-1.5 py-0.5 rounded-full font-medium shadow-sm border border-slate-200">
          {cards.length}
        </span>
      </h3>
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 pb-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
        {cards.map((card: any) => (
          <AnaliseKanbanCard
            key={card.id}
            card={card}
            isDragging={draggingId === card.id}
            onDragStart={(e: any) => onDragStart(e, card.id)}
            onDragEnd={onDragEnd}
            onCheckOutsourced={() => onCheckOutsourced(card)}
          />
        ))}
      </div>
    </div>
  )
}
