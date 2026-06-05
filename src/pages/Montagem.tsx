import { useState, useEffect } from 'react'
import { KanbanBoard } from '@/components/kanban/KanbanBoard'
import { KanbanListView } from '@/components/kanban/KanbanListView'

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
  const [activeTab, setActiveTab] = useState('kanban')
  const [search, setSearch] = useState('')

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
    <div className="h-full flex flex-col bg-slate-50 animate-in fade-in duration-300 mt-0 pt-0 overflow-hidden relative">
      <div className="flex-1 overflow-hidden min-h-0 relative flex flex-col">
        <KanbanBoard title="Montagem" columns={COLUMNS} />

        {activeTab === 'lista' && (
          <div className="absolute inset-x-0 bottom-0 top-[76px] bg-slate-50 z-10 overflow-auto animate-in fade-in duration-200">
            <KanbanListView searchQuery={search} columns={COLUMNS} />
          </div>
        )}
      </div>
    </div>
  )
}
