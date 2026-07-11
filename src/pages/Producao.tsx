import { useState, useEffect } from 'react'
import { KanbanBoard } from '@/components/kanban/KanbanBoard'
import { KanbanListView } from '@/components/kanban/KanbanListView'
import { KanbanArquivados } from '@/components/kanban/KanbanArquivados'
import { RegistrarRetalhoModal } from '@/components/estoque/RegistrarRetalhoModal'
import { RegistrarChapaModal } from '@/components/estoque/RegistrarChapaModal'
import { RegistrarFitaRoloModal } from '@/components/estoque/RegistrarFitaRoloModal'
import { RegistrarFitaPedacoModal } from '@/components/estoque/RegistrarFitaPedacoModal'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { LayoutTemplate, ScissorsLineDashed, Disc, Ruler } from 'lucide-react'
import { cn } from '@/lib/utils'

const COLUMNS = [
  { id: 'aguardando_plano_corte', title: 'Aguardando plano de corte' },
  { id: 'router', title: 'Router' },
  { id: 'coladeira', title: 'Coladeira' },
  { id: 'bancada', title: 'Bancada' },
  { id: 'embalagem', title: 'Embalagem' },
  { id: 'aguardando_agenda', title: 'Concluído (Pronto p/ Montagem)' },
]

export default function Producao() {
  const [activeTab, setActiveTab] = useState('kanban')
  const [search, setSearch] = useState('')
  const [showArquivados, setShowArquivados] = useState(false)
  const [isTypeSelectionOpen, setIsTypeSelectionOpen] = useState(false)
  const [isRetalhoModalOpen, setIsRetalhoModalOpen] = useState(false)
  const [isChapaModalOpen, setIsChapaModalOpen] = useState(false)
  const [isFitaRoloModalOpen, setIsFitaRoloModalOpen] = useState(false)
  const [isFitaPedacoModalOpen, setIsFitaPedacoModalOpen] = useState(false)

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
          <KanbanArquivados archiveFlag="arquivado_producao" />
        ) : (
          <>
            <KanbanBoard title="Produção" columns={COLUMNS} />

            {activeTab === 'lista' && (
              <div className="absolute inset-x-0 bottom-0 top-[76px] bg-background z-10 overflow-auto animate-in fade-in duration-200">
                <KanbanListView
                  searchQuery={search}
                  columns={COLUMNS}
                  archiveFlag="arquivado_producao"
                />
              </div>
            )}

            <div className="absolute bottom-6 right-6 z-20">
              <Button
                onClick={() => setIsTypeSelectionOpen(true)}
                className="rounded-full shadow-lg h-14 px-6 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <ScissorsLineDashed className="w-5 h-5 mr-2" />
                Registrar Sobra
              </Button>
            </div>
          </>
        )}
      </div>

      <Dialog open={isTypeSelectionOpen} onOpenChange={setIsTypeSelectionOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Tipo de Sobra</DialogTitle>
            <DialogDescription>
              Selecione o tipo de sobra de projeto que deseja registrar no sistema.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4">
            <Button
              variant="outline"
              className="h-32 flex flex-col items-center justify-center gap-4 hover:border-steel-blue hover:text-steel-blue transition-colors whitespace-normal"
              onClick={() => {
                setIsTypeSelectionOpen(false)
                setIsRetalhoModalOpen(true)
              }}
            >
              <ScissorsLineDashed className="w-8 h-8" />
              <div className="text-center font-semibold">Retalho MDF</div>
            </Button>
            <Button
              variant="outline"
              className="h-32 flex flex-col items-center justify-center gap-4 hover:border-emerald-600 hover:text-emerald-600 transition-colors whitespace-normal"
              onClick={() => {
                setIsTypeSelectionOpen(false)
                setIsChapaModalOpen(true)
              }}
            >
              <LayoutTemplate className="w-8 h-8" />
              <div className="text-center font-semibold">Chapa Inteira MDF</div>
            </Button>
            <Button
              variant="outline"
              className="h-32 flex flex-col items-center justify-center gap-4 hover:border-amber-600 hover:text-amber-600 transition-colors whitespace-normal"
              onClick={() => {
                setIsTypeSelectionOpen(false)
                setIsFitaRoloModalOpen(true)
              }}
            >
              <Disc className="w-8 h-8" />
              <div className="text-center font-semibold">Fita de Bordas (Rolo)</div>
            </Button>
            <Button
              variant="outline"
              className="h-32 flex flex-col items-center justify-center gap-4 hover:border-purple-600 hover:text-purple-600 transition-colors whitespace-normal"
              onClick={() => {
                setIsTypeSelectionOpen(false)
                setIsFitaPedacoModalOpen(true)
              }}
            >
              <Ruler className="w-8 h-8" />
              <div className="text-center font-semibold">Fita de Bordas (Pedaço)</div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <RegistrarRetalhoModal
        isOpen={isRetalhoModalOpen}
        onClose={() => setIsRetalhoModalOpen(false)}
      />
      <RegistrarChapaModal isOpen={isChapaModalOpen} onClose={() => setIsChapaModalOpen(false)} />
      <RegistrarFitaRoloModal
        isOpen={isFitaRoloModalOpen}
        onClose={() => setIsFitaRoloModalOpen(false)}
      />
      <RegistrarFitaPedacoModal
        isOpen={isFitaPedacoModalOpen}
        onClose={() => setIsFitaPedacoModalOpen(false)}
      />
    </div>
  )
}
