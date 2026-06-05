import { KanbanBoard } from '@/components/kanban/KanbanBoard'

const COLUMNS = [
  { id: 'aguardando_agenda', title: 'Aguardando Agenda' },
  { id: 'transporte', title: 'Transporte' },
  { id: 'montagem', title: 'Montagem' },
  { id: 'item_terceirizado', title: 'Item Terceirizado' },
  { id: 'pendencia', title: 'Pendência' },
  { id: 'assistencia', title: 'Assistência' },
  { id: 'concluido', title: 'Concluído' },
]

export default function Montagem() {
  return (
    <div className="h-[calc(100vh-2rem)] md:h-screen flex flex-col bg-off-white animate-in fade-in duration-300">
      <KanbanBoard title="Montagem" columns={COLUMNS} />
    </div>
  )
}
