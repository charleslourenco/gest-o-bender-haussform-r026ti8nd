import { useState } from 'react'
import { KanbanBoard } from '@/components/kanban/KanbanBoard'
import { KanbanArquivados } from '@/components/kanban/KanbanArquivados'
import { HistoricoMontagem } from '@/components/montagem/HistoricoMontagem'
import { ProdutividadeMontagem } from '@/components/montagem/ProdutividadeMontagem'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type ViewMode = 'kanban' | 'arquivados' | 'historico' | 'produtividade'

const COLUMNS = [
  { id: 'aguardando_agenda', title: 'Aguardando Agenda' },
  { id: 'transporte', title: 'Transporte' },
  { id: 'montagem', title: 'Em Montagem' },
  { id: 'item_terceirizado', title: 'Item Terceirizado' },
  { id: 'pendencia', title: 'Pendência' },
  { id: 'assistencia', title: 'Assistência' },
  { id: 'concluido', title: 'Concluído' },
]

export default function Montagem() {
  const [view, setView] = useState<ViewMode>('kanban')

  return (
    <div className="h-full flex flex-col bg-background animate-in fade-in duration-300 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 bg-card border-b border-border shrink-0 z-30 overflow-x-auto">
        <Button
          variant={view === 'kanban' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('kanban')}
          className={cn(
            view === 'kanban' &&
              'bg-primary hover:bg-primary/90 text-primary-foreground whitespace-nowrap',
          )}
        >
          Kanban
        </Button>
        <Button
          variant={view === 'arquivados' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('arquivados')}
          className={cn(
            view === 'arquivados' &&
              'bg-primary hover:bg-primary/90 text-primary-foreground whitespace-nowrap',
          )}
        >
          Arquivados
        </Button>
        <Button
          variant={view === 'historico' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('historico')}
          className={cn(
            view === 'historico' &&
              'bg-primary hover:bg-primary/90 text-primary-foreground whitespace-nowrap',
          )}
        >
          Histórico
        </Button>
        <Button
          variant={view === 'produtividade' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('produtividade')}
          className={cn(
            view === 'produtividade' &&
              'bg-primary hover:bg-primary/90 text-primary-foreground whitespace-nowrap',
          )}
        >
          Produtividade
        </Button>
      </div>

      <div className="flex-1 overflow-hidden min-h-0">
        {view === 'arquivados' ? (
          <KanbanArquivados archiveFlag="arquivado_montagem" />
        ) : view === 'historico' ? (
          <HistoricoMontagem />
        ) : view === 'produtividade' ? (
          <ProdutividadeMontagem />
        ) : (
          <KanbanBoard title="Montagem" columns={COLUMNS} />
        )}
      </div>
    </div>
  )
}
