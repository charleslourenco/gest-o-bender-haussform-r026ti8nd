import { useState, useEffect } from 'react'
import { KanbanBoard } from '@/components/kanban/KanbanBoard'
import { KanbanListView } from '@/components/kanban/KanbanListView'
import { RegistrarRetalhoModal } from '@/components/estoque/RegistrarRetalhoModal'

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
  const [activeTab, setActiveTab] = useState('kanban')
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    const handleTab = (e: any) => setActiveTab(e.detail)
    const handleSearch = (e: any) => setSearch(e.detail)
    const handleOpen = () => setIsModalOpen(true)

    window.addEventListener('kanban_tab_change', handleTab)
    window.addEventListener('kanban_search_change', handleSearch)
    window.addEventListener('open_registrar_retalho', handleOpen)

    return () => {
      window.removeEventListener('kanban_tab_change', handleTab)
      window.removeEventListener('kanban_search_change', handleSearch)
      window.removeEventListener('open_registrar_retalho', handleOpen)
    }
  }, [])

  return (
    <div className="h-full flex flex-col bg-slate-50 animate-in fade-in duration-300 mt-0 pt-0 overflow-hidden relative">
      <div className="flex-1 overflow-hidden min-h-0 relative flex flex-col">
        <KanbanBoard title="Produção" columns={COLUMNS} />

        {activeTab === 'lista' && (
          <div className="absolute inset-x-0 bottom-0 top-[76px] bg-slate-50 z-10 overflow-auto animate-in fade-in duration-200">
            <KanbanListView searchQuery={search} columns={COLUMNS} />
          </div>
        )}
      </div>

      <RegistrarRetalhoModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  )
}
