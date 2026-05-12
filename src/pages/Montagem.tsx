import { KanbanBoard } from '@/components/kanban/KanbanBoard'

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
  return <KanbanBoard title="Montagem" columns={COLUMNS} />
}
