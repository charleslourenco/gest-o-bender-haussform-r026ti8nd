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
      className={`flex flex-col w-[320px] bg-slate-100/80 border border-slate-200 rounded-lg p-3 transition-colors ${isDragOver ? 'ring-2 ring-primary/50 bg-slate-200' : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <h3 className="font-semibold text-slate-700 mb-3 flex items-center justify-between text-sm">
        {column.title}
        <span className="bg-white text-slate-600 text-xs px-2 py-0.5 rounded-full font-medium shadow-sm border border-slate-200">
          {cards.length}
        </span>
      </h3>
      <div className="flex-1 overflow-y-auto space-y-3 pb-2">
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
