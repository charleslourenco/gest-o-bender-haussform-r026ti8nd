import { useState } from 'react'
import { KanbanBoard } from '@/components/kanban/KanbanBoard'
import { KanbanListView } from '@/components/kanban/KanbanListView'
import { KanbanArquivados } from '@/components/kanban/KanbanArquivados'
import { HistoricoMontagem } from '@/components/montagem/HistoricoMontagem'
import { KanbanAssistencia } from '@/components/montagem/KanbanAssistencia'
import { MontadoresTab } from '@/pages/MontadoresTab'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Hammer, Wrench } from 'lucide-react'
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
  const [mainTab, setMainTab] = useState<'montagem' | 'assistencia'>('montagem')
  const [view, setView] = useState<ViewMode>('kanban')

  return (
    <div className="h-full flex flex-col bg-background animate-in fade-in duration-300 overflow-hidden">
      <Tabs
        value={mainTab}
        onValueChange={(val) => setMainTab(val as 'montagem' | 'assistencia')}
        className="h-full flex flex-col overflow-hidden space-y-0"
      >
        {/* Barra superior de Abas Principais: Montagem e Assistência */}
        <div className="flex items-center justify-between px-4 py-2 bg-card border-b border-border shrink-0 z-30 overflow-x-auto gap-4">
          <TabsList className="bg-muted/60 p-1 flex items-center gap-1 h-auto rounded-lg">
            <TabsTrigger
              value="montagem"
              className="py-1 px-3 rounded-md text-xs font-bold transition-colors whitespace-nowrap data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs flex items-center gap-1.5"
            >
              <Hammer className="w-3.5 h-3.5" />
              Montagem
            </TabsTrigger>
            <TabsTrigger
              value="assistencia"
              className="py-1 px-3 rounded-md text-xs font-bold transition-colors whitespace-nowrap data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs flex items-center gap-1.5"
            >
              <Wrench className="w-3.5 h-3.5" />
              Assistência
            </TabsTrigger>
          </TabsList>

          {/* Sub-abas de Montagem quando a aba Montagem está ativa */}
          {mainTab === 'montagem' && (
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {TABS.map((tab) => (
                <Button
                  key={tab.id}
                  variant={view === tab.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setView(tab.id)}
                  className={cn(
                    'h-8 text-xs font-medium whitespace-nowrap',
                    view === tab.id && 'bg-primary hover:bg-primary/90 text-primary-foreground',
                  )}
                >
                  {tab.label}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Conteúdo das Abas Principais */}
        <div className="flex-1 overflow-hidden min-h-0 relative flex flex-col">
          <TabsContent
            value="montagem"
            forceMount={mainTab === 'montagem'}
            className="flex-1 overflow-hidden min-h-0 m-0 data-[state=active]:flex flex-col relative"
          >
            {mainTab === 'montagem' && (
              <ErrorBoundary>
                <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
                  {view === 'kanban' && <KanbanBoard title="Montagem" columns={COLUMNS} />}
                  {view === 'lista' && (
                    <KanbanListView columns={COLUMNS} archiveFlag="arquivado_montagem" />
                  )}
                  {view === 'montadores' && (
                    <div className="h-full overflow-auto p-4">
                      <MontadoresTab />
                    </div>
                  )}
                  {view === 'arquivados' && <KanbanArquivados archiveFlag="arquivado_montagem" />}
                  {view === 'historico' && <HistoricoMontagem />}
                </div>
              </ErrorBoundary>
            )}
          </TabsContent>

          <TabsContent
            value="assistencia"
            forceMount={mainTab === 'assistencia'}
            className="flex-1 overflow-hidden min-h-0 m-0 data-[state=active]:flex flex-col relative"
          >
            {mainTab === 'assistencia' && (
              <ErrorBoundary>
                <KanbanAssistencia />
              </ErrorBoundary>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
