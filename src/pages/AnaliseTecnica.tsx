import { KanbanBoard } from '@/components/kanban/KanbanBoard'
import { FileSearch } from 'lucide-react'

const COLUMNS = [
  { id: 'iniciar', title: 'Iniciar' },
  { id: 'aguardando_liberacao', title: 'Aguardando liberação' },
  { id: 'medida_fina', title: 'Medida fina' },
  { id: 'reuniao_analise', title: 'Reunião de análise' },
  { id: 'caderno_tecnico', title: 'Caderno técnico' },
  { id: 'alteracao_projeto', title: 'Alteração de projeto' },
  { id: 'lista_materiais', title: 'Lista de materiais' },
  { id: 'aguardando_plano_corte', title: 'Concluído (Pronto p/ Produção)' },
]

export default function AnaliseTecnica() {
  return (
    <div className="h-[calc(100vh-2rem)] md:h-screen flex flex-col bg-off-white p-6 space-y-6 animate-in fade-in duration-300">
      <div className="bg-midnight-navy p-6 rounded-xl shadow-sm shrink-0 flex items-center gap-4">
        <FileSearch className="h-10 w-10 text-emerald-400 hidden sm:block" />
        <div>
          <h1 className="text-off-white font-bold text-[32px]">Análise Técnica</h1>
          <p className="text-pale-cornflower mt-1">Acompanhamento e detalhamento de projetos</p>
        </div>
      </div>
      <div className="flex-1 overflow-hidden min-h-0 bg-off-white rounded-xl relative">
        <KanbanBoard title="" columns={COLUMNS} />
      </div>
    </div>
  )
}
