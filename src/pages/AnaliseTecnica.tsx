import { KanbanBoard } from '@/components/kanban/KanbanBoard'

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
    <div className="h-full flex flex-col bg-off-white animate-in fade-in duration-300 mt-0 pt-0 overflow-hidden">
      <div className="flex-1 overflow-hidden min-h-0 relative">
        <KanbanBoard title="Análise Técnica" columns={COLUMNS} />
      </div>
    </div>
  )
}
