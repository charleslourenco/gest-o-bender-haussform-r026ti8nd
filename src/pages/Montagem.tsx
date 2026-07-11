import { useState, useEffect } from 'react'
import { KanbanBoard } from '@/components/kanban/KanbanBoard'
import { KanbanListView } from '@/components/kanban/KanbanListView'
import { KanbanArquivados } from '@/components/kanban/KanbanArquivados'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

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
  const [activeTab, setActiveTab] = useState('kanban')
  const [search, setSearch] = useState('')
  const [showArquivados, setShowArquivados] = useState(false)

  useEffect(() => {
    const handleTab = (e: any) => setActiveTab(e.detail)
    const handleSearch = (e: any) => setSearch(e.detail)

    window.addEventListener('kanban_tab_change', handleTab)
    window.addEventListener('kanban_search_change', handleSearch)

    return () => {
      window.removeEventListener('kanban_tab_change', handleTab)
      window.removeEventListener('kanban_search_change', handleSearch)
    }
  }, [])

  return (
    <div className="h-full flex flex-col bg-background animate-in fade-in duration-300 mt-0 pt-0 overflow-hidden relative">
      <div className="flex items-center gap-2 px-4 py-2 bg-card border-b border-border shrink-0 z-30">
        <Button
          variant={showArquivados ? 'outline' : 'default'}
          size="sm"
          onClick={() => setShowArquivados(false)}
          className={cn(
            !showArquivados && 'bg-primary hover:bg-primary/90 text-primary-foreground',
          )}
        >
          Kanban
        </Button>
        <Button
          variant={showArquivados ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowArquivados(true)}
          className={cn(showArquivados && 'bg-primary hover:bg-primary/90 text-primary-foreground')}
        >
          Arquivados
        </Button>
      </div>

      <div className="flex-1 overflow-hidden min-h-0 relative flex flex-col">
        {showArquivados ? (
          <KanbanArquivados archiveFlag="arquivado_montagem" />
        ) : (
          <>
            <KanbanBoard title="Montagem" columns={COLUMNS} />

            {activeTab === 'lista' && (
              <div className="absolute inset-x-0 bottom-0 top-[76px] bg-background z-10 overflow-auto animate-in fade-in duration-200">
                <KanbanListView
                  searchQuery={search}
                  columns={COLUMNS}
                  archiveFlag="arquivado_montagem"
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
