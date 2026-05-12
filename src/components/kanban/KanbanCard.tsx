import { Badge } from '@/components/ui/badge'
import { CardData } from './types'

export function KanbanCard({
  card,
  usersMap,
  onClick,
  onDragStart,
}: {
  card: CardData
  usersMap: Record<string, { nome: string; foto_perfil: string | null }>
  onClick: () => void
  onDragStart: (e: React.DragEvent, id: string) => void
}) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, card.id)}
      onClick={onClick}
      className="p-4 bg-midnight-navy rounded-lg border border-steel-blue/40 shadow-sm cursor-pointer hover:border-pale-cornflower hover:shadow-md transition-all"
    >
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs font-mono font-bold text-pale-cornflower bg-steel-blue/20 px-1.5 py-0.5 rounded">
          {card.codigo_rastreio ||
            `#${card.formulario_comercial_id?.split('-')[0].toUpperCase() || 'N/A'}`}
        </span>
        <Badge className="bg-steel-blue text-[10px] py-0">Qtd: {card.qtd}</Badge>
      </div>
      <div className="font-semibold text-off-white text-sm mb-1 leading-snug">
        {card.nome_produto}
      </div>
      <div className="flex justify-between items-center mt-2">
        <div className="text-xs text-pale-cornflower/80 truncate max-w-[150px]">
          {card.clientes?.nome || 'Cliente N/A'}
        </div>
        {card.analista_id && usersMap[card.analista_id] && (
          <div
            className="flex items-center gap-1.5 shrink-0"
            title={`Responsável: ${usersMap[card.analista_id].nome}`}
          >
            {usersMap[card.analista_id].foto_perfil ? (
              <img
                src={usersMap[card.analista_id].foto_perfil as string}
                className="w-5 h-5 rounded-full object-cover border border-steel-blue"
                alt="Avatar"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-steel-blue text-midnight-navy flex items-center justify-center text-[9px] font-bold">
                {usersMap[card.analista_id].nome.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
