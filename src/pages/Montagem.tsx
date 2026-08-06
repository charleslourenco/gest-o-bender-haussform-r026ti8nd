import { useState } from 'react'
import { KanbanBoard } from '@/components/kanban/KanbanBoard'
import { KanbanListView } from '@/components/kanban/KanbanListView'
import { KanbanArquivados } from '@/components/kanban/KanbanArquivados'
import { HistoricoMontagem } from '@/components/montagem/HistoricoMontagem'
import { MontadoresTab } from '@/pages/MontadoresTab'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type ViewMode = 'kanban' | 'lista' | 'montadores' | 'arquivados' | 'historico'

const COLUMNS = [
  { id: 'aguardando_agenda', title: 'Aguardando Agenda' },
  { id: 'transporte', title: 'Transporte' },
  { id: 'montagem', title: 'Em Montagem' },
  { id: 'item_terceirizado', title: 'Item Terceirizado' },
  { id: 'pendencia', title: 'Pendência' },
  { id: 'assistencia', title: 'Assistência' },
  { id: 'concluido', title: 'Concluído' },
]

const TABS: { id: ViewMode; label: string }[] = [
  { id: 'kanban', label: 'Kanban' },
  { id: 'lista', label: 'Lista' },
  { id: 'montadores', label: 'Gestão de Montadores' },
  { id: 'arquivados', label: 'Arquivados' },
  { id: 'historico', label: 'Histórico' },
]

export default function Montagem() {
  const [view, setView] = useState<ViewMode>('kanban')

  return (
    <div className="h-full flex flex-col bg-background animate-in fade-in duration-300 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 bg-card border-b border-border shrink-0 z-30 overflow-x-auto">
        {TABS.map((tab) => (
          <Button
            key={tab.id}
            variant={view === tab.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView(tab.id)}
            className={cn(
              view === tab.id &&
                'bg-primary hover:bg-primary/90 text-primary-foreground whitespace-nowrap',
            )}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden min-h-0">
        {view === 'kanban' && <KanbanBoard title="Montagem" columns={COLUMNS} />}
        {view === 'lista' && <KanbanListView title="Montagem" columns={COLUMNS} />}
        {view === 'montadores' && (
          <div className="h-full overflow-auto p-4">
            <MontadoresTab />
          </div>
        )}
        {view === 'arquivados' && <KanbanArquivados archiveFlag="arquivado_montagem" />}
        {view === 'historico' && <HistoricoMontagem />}
      </div>
    </div>
  )
}
