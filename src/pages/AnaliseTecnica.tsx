import { useState, useEffect } from 'react'
import { KanbanBoard } from '@/components/kanban/KanbanBoard'
import { KanbanListView } from '@/components/kanban/KanbanListView'
import { CriarCardAvulsoModal } from '@/components/analise/CriarCardAvulsoModal'

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
  const [activeTab, setActiveTab] = useState('kanban')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    const handleTab = (e: any) => setActiveTab(e.detail)
    const handleSearch = (e: any) => setSearch(e.detail)
    const handleOpenModal = () => setShowModal(true)

    window.addEventListener('kanban_tab_change', handleTab)
    window.addEventListener('kanban_search_change', handleSearch)
    window.addEventListener('open_criar_card_avulso', handleOpenModal)

    return () => {
      window.removeEventListener('kanban_tab_change', handleTab)
      window.removeEventListener('kanban_search_change', handleSearch)
      window.removeEventListener('open_criar_card_avulso', handleOpenModal)
    }
  }, [])

  const handleSuccess = () => {
    setShowModal(false)
    window.dispatchEvent(new CustomEvent('kanban_refresh'))
  }

  return (
    <div className="h-full flex flex-col bg-slate-50 animate-in fade-in duration-300 mt-0 pt-0 overflow-hidden relative">
      <div className="flex-1 overflow-hidden min-h-0 relative flex flex-col">
        <KanbanBoard title="Análise Técnica" columns={COLUMNS} />

        {activeTab === 'lista' && (
          <div className="absolute inset-x-0 bottom-0 top-[76px] bg-slate-50 z-10 overflow-auto animate-in fade-in duration-200">
            <KanbanListView searchQuery={search} columns={COLUMNS} />
          </div>
        )}
      </div>

      {showModal && (
        <CriarCardAvulsoModal onClose={() => setShowModal(false)} onSuccess={handleSuccess} />
      )}
    </div>
  )
}
