import { KanbanBoard } from '@/components/kanban/KanbanBoard'

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
  return <KanbanBoard title="Produção" columns={COLUMNS} />
}
