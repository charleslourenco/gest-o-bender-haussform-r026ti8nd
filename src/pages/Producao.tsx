import { KanbanBoard } from '@/components/kanban/KanbanBoard'
import { Hammer } from 'lucide-react'

const COLUMNS = [
  { id: 'aguardando_plano_corte', title: 'Aguardando plano de corte' },
  { id: 'router', title: 'Router' },
  { id: 'coladeira', title: 'Coladeira' },
  { id: 'bancada', title: 'Bancada' },
  { id: 'embalagem', title: 'Embalagem' },
  { id: 'expedicao', title: 'Expedição' },
  { id: 'aguardando_agenda', title: 'Concluído (Pronto p/ Montagem)' },
]

export default function Producao() {
  return (
    <div className="h-[calc(100vh-2rem)] md:h-screen flex flex-col bg-off-white p-6 space-y-6 animate-in fade-in duration-300">
      <div className="bg-midnight-navy p-6 rounded-xl shadow-sm shrink-0 flex items-center gap-4">
        <Hammer className="h-10 w-10 text-emerald-400 hidden sm:block" />
        <div>
          <h1 className="text-off-white font-bold text-[32px]">Produção</h1>
          <p className="text-pale-cornflower mt-1">Controle de fabricação e usinagem</p>
        </div>
      </div>
      <div className="flex-1 overflow-hidden min-h-0 bg-off-white rounded-xl relative">
        <KanbanBoard title="" columns={COLUMNS} />
      </div>
    </div>
  )
}
