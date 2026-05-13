import { KanbanBoard } from '@/components/kanban/KanbanBoard'
import { Wrench } from 'lucide-react'

const COLUMNS = [
  { id: 'aguardando_agenda', title: 'Aguardando agenda' },
  { id: 'designar_equipe', title: 'Designar equipe' },
  { id: 'transporte', title: 'Transporte' },
  { id: 'inicio_montagem', title: 'Início montagem' },
  { id: 'item_terceirizado', title: 'Item terceirizado' },
  { id: 'finalizacao', title: 'Finalização' },
  { id: 'termo_conclusao', title: 'Termo conclusão e vistoria' },
  { id: 'assistencias', title: 'Assistências' },
  { id: 'pendencias', title: 'Pendências' },
  { id: 'finalizado_montagem', title: 'Concluído' },
]

export default function Montagem() {
  return (
    <div className="h-[calc(100vh-2rem)] md:h-screen flex flex-col bg-off-white p-6 space-y-6 animate-in fade-in duration-300">
      <div className="bg-midnight-navy p-6 rounded-xl shadow-sm shrink-0 flex items-center gap-4">
        <Wrench className="h-10 w-10 text-emerald-400 hidden sm:block" />
        <div>
          <h1 className="text-off-white font-bold text-[32px]">Montagem</h1>
          <p className="text-pale-cornflower mt-1">Gestão de expedição e montagem em campo</p>
        </div>
      </div>
      <div className="flex-1 overflow-hidden min-h-0 bg-off-white rounded-xl relative">
        <KanbanBoard title="" columns={COLUMNS} />
      </div>
    </div>
  )
}
