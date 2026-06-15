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
  onDelete,
}: any) {
  return (
    <div
      className={`flex flex-col w-[240px] bg-muted/40 dark:bg-muted/20 border border-border rounded-md p-2 transition-colors min-h-full h-full shrink-0 ${isDragOver ? 'ring-2 ring-primary/50 bg-muted/60 dark:bg-muted/40' : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <h3 className="font-semibold text-foreground mb-2.5 px-1 flex items-center justify-between text-[13px] shrink-0">
        {column.title}
        <span className="bg-muted text-foreground text-[10px] px-1.5 py-0.5 rounded-full font-medium shadow-sm border border-border">
          {cards.length}
        </span>
      </h3>
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 pb-1 flex flex-col [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
        {cards.length === 0 && (
          <div className="flex-1 min-h-[100px] flex items-center justify-center rounded-md border-2 border-dashed border-border/50 opacity-50 pointer-events-none">
            <span className="text-xs text-muted-foreground font-medium">Solte aqui</span>
          </div>
        )}
        {cards.map((card: any) => (
          <AnaliseKanbanCard
            key={card.id}
            card={card}
            isDragging={draggingId === card.id}
            onDragStart={(e: any) => onDragStart(e, card.id)}
            onDragEnd={onDragEnd}
            onCheckOutsourced={() => onCheckOutsourced(card)}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  )
}
