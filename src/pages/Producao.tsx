import { useState, useEffect } from 'react'
import { KanbanBoard } from '@/components/kanban/KanbanBoard'
import { KanbanListView } from '@/components/kanban/KanbanListView'
import { KanbanArquivados } from '@/components/kanban/KanbanArquivados'
import { RelatorioAlocacao } from '@/components/kanban/RelatorioAlocacao'
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
import { LayoutTemplate, Scissors, Disc, Ruler, Clock, Sparkles } from 'lucide-react'
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
  const [view, setView] = useState<'kanban' | 'lista' | 'relatorio' | 'arquivados'>('kanban')
  const [search, setSearch] = useState('')
  const [isTypeSelectionOpen, setIsTypeSelectionOpen] = useState(false)
  const [isRetalhoModalOpen, setIsRetalhoModalOpen] = useState(false)
  const [isChapaModalOpen, setIsChapaModalOpen] = useState(false)
  const [isFitaRoloModalOpen, setIsFitaRoloModalOpen] = useState(false)
  const [isFitaPedacoModalOpen, setIsFitaPedacoModalOpen] = useState(false)
  const [somenteSemanaAtual, setSomenteSemanaAtual] = useState(false)

  const toggleSomenteSemana = () => {
    const next = !somenteSemanaAtual
    setSomenteSemanaAtual(next)
    window.dispatchEvent(
      new CustomEvent('toggle_filtro_semana_atual', { detail: { somente_semana_atual: next } }),
    )
  }

  useEffect(() => {
    const handleSearch = (e: any) => setSearch(e?.detail || '')
    const handleOpen = () => setIsTypeSelectionOpen(true)

    window.addEventListener('kanban_search_change', handleSearch)
    window.addEventListener('open_registrar_sobra', handleOpen)

    return () => {
      window.removeEventListener('kanban_search_change', handleSearch)
      window.removeEventListener('open_registrar_sobra', handleOpen)
    }
  }, [])

  return (
    <div className="h-full flex flex-col bg-background animate-in fade-in duration-300 mt-0 pt-0 overflow-hidden relative">
      <div className="flex items-center gap-2 px-4 py-2 bg-card border-b border-border shrink-0 z-30">
        <Button
          variant={view === 'kanban' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('kanban')}
          className={cn(
            view === 'kanban' && 'bg-primary hover:bg-primary/90 text-primary-foreground',
          )}
        >
          Kanban
        </Button>
        <Button
          variant={view === 'lista' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('lista')}
          className={cn(
            view === 'lista' && 'bg-primary hover:bg-primary/90 text-primary-foreground',
          )}
        >
          Lista
        </Button>
        <Button
          variant={view === 'relatorio' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('relatorio')}
          className={cn(
            view === 'relatorio' && 'bg-primary hover:bg-primary/90 text-primary-foreground',
            'flex items-center gap-1.5',
          )}
        >
          <Clock className="w-3.5 h-3.5" />
          Relatórios
        </Button>
        <Button
          variant={view === 'arquivados' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('arquivados')}
          className={cn(
            view === 'arquivados' && 'bg-primary hover:bg-primary/90 text-primary-foreground',
          )}
        >
          Arquivados
        </Button>

        {/* Spec Etapa 4: Botão de filtro rápido [ 🚀 Ver Somente Programação da Semana ] */}
        <Button
          variant={somenteSemanaAtual ? 'default' : 'outline'}
          size="sm"
          onClick={toggleSomenteSemana}
          className={cn(
            'h-8 text-xs font-bold gap-1.5 transition-all ml-auto',
            somenteSemanaAtual
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
              : 'border-emerald-600/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10',
          )}
          title="Filtrar cards programados para a semana ISO atual"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {somenteSemanaAtual
            ? '✓ Mostrando Somente S. Atual'
            : '🚀 Ver Somente Programação da Semana'}
        </Button>
      </div>

      <div className="flex-1 overflow-hidden min-h-0 relative flex flex-col">
        {view === 'relatorio' ? (
          <RelatorioAlocacao modulo="producao" />
        ) : view === 'arquivados' ? (
          <KanbanArquivados archiveFlag="arquivado_producao" />
        ) : view === 'lista' ? (
          <div className="flex-1 overflow-auto bg-background animate-in fade-in duration-200">
            <KanbanListView
              searchQuery={search}
              columns={COLUMNS}
              archiveFlag="arquivado_producao"
            />
          </div>
        ) : (
          <KanbanBoard title="Produção" columns={COLUMNS} />
        )}

        <div className="absolute bottom-6 right-6 z-20">
          <Button
            onClick={() => setIsTypeSelectionOpen(true)}
            className="rounded-full shadow-lg h-14 px-6 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Scissors className="w-5 h-5 mr-2" />
            Registrar Sobra
          </Button>
        </div>
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
              <Scissors className="w-8 h-8" />
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
