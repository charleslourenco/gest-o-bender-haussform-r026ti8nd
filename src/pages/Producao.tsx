import { useState, useEffect } from 'react'
import { KanbanBoard } from '@/components/kanban/KanbanBoard'
import { KanbanListView } from '@/components/kanban/KanbanListView'
import { RegistrarRetalhoModal } from '@/components/estoque/RegistrarRetalhoModal'
import { RegistrarChapaModal } from '@/components/estoque/RegistrarChapaModal'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { LayoutTemplate, ScissorsLineDashed } from 'lucide-react'

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
  const [isTypeSelectionOpen, setIsTypeSelectionOpen] = useState(false)
  const [isRetalhoModalOpen, setIsRetalhoModalOpen] = useState(false)
  const [isChapaModalOpen, setIsChapaModalOpen] = useState(false)

  useEffect(() => {
    const handleTab = (e: any) => setActiveTab(e?.detail || 'kanban')
    const handleSearch = (e: any) => setSearch(e?.detail || '')
    const handleOpen = () => setIsTypeSelectionOpen(true)

    window.addEventListener('kanban_tab_change', handleTab)
    window.addEventListener('kanban_search_change', handleSearch)
    window.addEventListener('open_registrar_sobra', handleOpen)

    return () => {
      window.removeEventListener('kanban_tab_change', handleTab)
      window.removeEventListener('kanban_search_change', handleSearch)
      window.removeEventListener('open_registrar_sobra', handleOpen)
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

      <Dialog open={isTypeSelectionOpen} onOpenChange={setIsTypeSelectionOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tipo de Sobra</DialogTitle>
            <DialogDescription>
              Selecione o tipo de sobra de projeto que deseja registrar no sistema.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <Button
              variant="outline"
              className="h-32 flex flex-col items-center justify-center gap-4 hover:border-steel-blue hover:text-steel-blue transition-colors"
              onClick={() => {
                setIsTypeSelectionOpen(false)
                setIsRetalhoModalOpen(true)
              }}
            >
              <ScissorsLineDashed className="w-8 h-8" />
              <div className="text-center">
                <div className="font-semibold">Retalho</div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-32 flex flex-col items-center justify-center gap-4 hover:border-emerald-600 hover:text-emerald-600 transition-colors"
              onClick={() => {
                setIsTypeSelectionOpen(false)
                setIsChapaModalOpen(true)
              }}
            >
              <LayoutTemplate className="w-8 h-8" />
              <div className="text-center">
                <div className="font-semibold">Chapa Inteira</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Chapa completa não utilizada
                </div>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <RegistrarRetalhoModal
        isOpen={isRetalhoModalOpen}
        onClose={() => setIsRetalhoModalOpen(false)}
      />
      <RegistrarChapaModal isOpen={isChapaModalOpen} onClose={() => setIsChapaModalOpen(false)} />
    </div>
  )
}
