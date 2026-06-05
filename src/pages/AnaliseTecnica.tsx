import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { KanbanBoard } from '@/components/kanban/KanbanBoard'
import { KanbanListView } from '@/components/kanban/KanbanListView'
import { CriarCardAvulsoModal } from '@/components/analise/CriarCardAvulsoModal'
import { supabase } from '@/lib/supabase/client'
import { AlertTriangle } from 'lucide-react'

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
  const [headerNode, setHeaderNode] = useState<Element | null>(null)
  const [pendingPurchasesCount, setPendingPurchasesCount] = useState<number | null>(null)

  useEffect(() => {
    const handleTab = (e: any) => setActiveTab(e.detail)
    const handleSearch = (e: any) => setSearch(e.detail)

    window.addEventListener('kanban_tab_change', handleTab)
    window.addEventListener('kanban_search_change', handleSearch)

    const observer = new MutationObserver(() => {
      const node = document.querySelector(
        '.flex.flex-row.items-center.gap-2.shrink-0.whitespace-nowrap',
      )
      if (node && node !== headerNode) {
        setHeaderNode(node)
      }
    })
    observer.observe(document.body, { childList: true, subtree: true })

    const initialNode = document.querySelector(
      '.flex.flex-row.items-center.gap-2.shrink-0.whitespace-nowrap',
    )
    if (initialNode) setHeaderNode(initialNode)

    return () => {
      window.removeEventListener('kanban_tab_change', handleTab)
      window.removeEventListener('kanban_search_change', handleSearch)
      observer.disconnect()
    }
  }, [headerNode])

  useEffect(() => {
    let isMounted = true

    const fetchPendingPurchases = async () => {
      try {
        // Using a standard GET request (without head: true) to avoid JSON parsing errors
        // that can occur with HEAD requests returning empty bodies.
        const { data, count, error } = await supabase
          .from('solicitacoes_compra')
          .select('id', { count: 'exact', head: false })
          .eq('status', 'Pendente')

        if (error) {
          console.error('Error fetching pending purchases count:', error)
          return
        }

        // Verify valid data returned (array) before processing to ensure valid JSON structure
        if (data && Array.isArray(data) && isMounted) {
          setPendingPurchasesCount(count || 0)
        }
      } catch (err) {
        console.error('Unexpected error fetching pending purchases:', err)
      }
    }

    fetchPendingPurchases()

    const channel = supabase
      .channel('public:solicitacoes_compra')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'solicitacoes_compra' },
        () => {
          fetchPendingPurchases()
        },
      )
      .subscribe()

    return () => {
      isMounted = false
      supabase.removeChannel(channel)
    }
  }, [])

  const handleSuccess = () => {
    setShowModal(false)
    window.dispatchEvent(new CustomEvent('kanban_refresh'))
  }

  return (
    <div className="h-full flex flex-col bg-off-white animate-in fade-in duration-300 mt-0 pt-0 overflow-hidden relative">
      <div className="flex-1 overflow-hidden min-h-0 relative">
        <KanbanBoard title="Análise Técnica" columns={COLUMNS} />

        {activeTab === 'lista' && (
          <div className="absolute inset-x-0 bottom-0 top-[76px] bg-off-white z-10 overflow-auto animate-in fade-in duration-200">
            <KanbanListView searchQuery={search} columns={COLUMNS} />
          </div>
        )}
      </div>

      {showModal && (
        <CriarCardAvulsoModal onClose={() => setShowModal(false)} onSuccess={handleSuccess} />
      )}

      {headerNode &&
        createPortal(
          <>
            {pendingPurchasesCount !== null && pendingPurchasesCount > 0 && (
              <div
                className="bg-amber-100 text-amber-700 border border-amber-200 text-sm font-medium px-2 py-1.5 rounded-md shrink-0 flex items-center gap-1.5"
                title={`${pendingPurchasesCount} Solicitação(ões) de Compra Pendente(s)`}
              >
                <AlertTriangle className="w-4 h-4" />
                <span className="font-bold">{pendingPurchasesCount}</span>
              </div>
            )}
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 text-white text-sm font-medium px-3 py-1.5 rounded-md shrink-0 hover:opacity-90 transition-opacity"
            >
              + Criar Card Avulso
            </button>
          </>,
          headerNode,
        )}
    </div>
  )
}
