import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { ATENDIMENTO_ABAS } from '@/components/comercial/constants'
import { KanbanAtendimentos } from '@/components/comercial/KanbanAtendimentos'
import { ComercialList } from '@/components/comercial/ComercialList'
import { LeadsArquivados } from '@/components/comercial/LeadsArquivados'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Phone, List as ListIcon, Archive } from 'lucide-react'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export default function Comercial() {
  const { user, permissions, loading } = useAuth()
  const [activeTab, setActiveTab] = useState<string>('novo-contato')
  const [toolbarNode, setToolbarNode] = useState<HTMLDivElement | null>(null)

  const isSuperAdmin = user?.email === 'admin@bender.com'
  const userAccess = isSuperAdmin ? 'Admin' : permissions?.['Comercial']
  const hasPermission = Boolean(
    isSuperAdmin || (userAccess && ['Admin', 'Editor', 'Visualizador'].includes(userAccess)),
  )

  if (loading) {
    return (
      <div className="h-full flex flex-col bg-background">
        <div className="bg-muted/50 p-6 shrink-0 border-b">
          <div className="h-10 w-64 bg-muted animate-pulse rounded-lg"></div>
        </div>
        <div className="flex-1 flex gap-4 p-6">
          <div className="flex-1 bg-muted/50 animate-pulse rounded-lg border"></div>
          <div className="flex-1 bg-muted/50 animate-pulse rounded-lg border hidden md:block"></div>
        </div>
      </div>
    )
  }

  if (!hasPermission) {
    return (
      <div className="h-full flex flex-col bg-background">
        <div className="bg-card p-6 shrink-0 border-b">
          <h1 className="text-foreground font-bold text-3xl">Atendimentos</h1>
        </div>
        <div className="flex-1 p-6">
          <div className="bg-muted p-6 rounded-lg text-center border">
            <p className="text-foreground font-bold text-lg">
              Você não tem permissão para acessar este módulo.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="h-[calc(100vh-2rem)] md:h-screen flex flex-col bg-background p-4 md:p-6 pt-0 space-y-3"
      >
        {/* Barra de Topo do Módulo Atendimentos */}
        <div className="flex flex-col w-full bg-card border text-card-foreground px-4 py-3 rounded-lg shrink-0 gap-2.5 shadow-xs">
          {/* Linha 1 (ACIMA): Título + Toolbar/Filtros */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-2">
            <h1 className="text-lg font-bold flex items-center gap-2 shrink-0">
              <Phone className="h-5 w-5 text-emerald-500" />
              <span>Atendimentos</span>
            </h1>
            <div ref={setToolbarNode} className="shrink-0 flex items-center gap-2 flex-wrap" />
          </div>

          {/* Linha 2 (ABAIXO): Barra de Abas com scroll horizontal funcional e scrollbar fina visível */}
          <div className="w-full overflow-x-auto pb-1 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
            <TabsList className="bg-muted/60 p-1 flex items-center gap-1 h-auto rounded-lg w-max">
              {/* 8 abas de kanban SEM números */}
              {ATENDIMENTO_ABAS.map((aba) => (
                <TabsTrigger
                  key={aba.id}
                  value={aba.id}
                  className="py-1 px-2.5 rounded-md text-xs font-bold transition-colors whitespace-nowrap data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
                >
                  {aba.titulo}
                </TabsTrigger>
              ))}

              {/* Separador visual sutil */}
              <div className="w-[1px] h-4 bg-border/80 mx-1 shrink-0" />

              {/* ABAS AUXILIARES */}
              <TabsTrigger
                value="lista"
                className="py-1 px-2.5 rounded-md text-xs font-bold transition-colors whitespace-nowrap data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
              >
                <ListIcon className="w-3.5 h-3.5 mr-1" />
                Lista
              </TabsTrigger>
              <TabsTrigger
                value="arquivados"
                className="py-1 px-2.5 rounded-md text-xs font-bold transition-colors whitespace-nowrap data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
              >
                <Archive className="w-3.5 h-3.5 mr-1" />
                Arquivados
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* Conteúdo das 8 Abas Kanban e Abas Auxiliares */}
        <div className="flex-1 flex flex-col min-h-0 bg-card rounded-xl border shadow-xs overflow-hidden">
          {/* AS 8 ABAS DE ATENDIMENTOS */}
          {ATENDIMENTO_ABAS.map((aba) => (
            <TabsContent
              key={aba.id}
              value={aba.id}
              className="flex-1 overflow-hidden min-h-0 m-0 data-[state=active]:flex flex-col relative"
            >
              <ErrorBoundary>
                <KanbanAtendimentos
                  aba={aba}
                  toolbarPortal={toolbarNode}
                  isActive={activeTab === aba.id}
                />
              </ErrorBoundary>
            </TabsContent>
          ))}

          {/* ABA AUXILIAR: LISTA */}
          <TabsContent
            value="lista"
            className="flex-1 overflow-auto min-h-0 m-0 data-[state=active]:flex flex-col p-4"
          >
            <ErrorBoundary>
              <ComercialList />
            </ErrorBoundary>
          </TabsContent>

          {/* ABA AUXILIAR: ARQUIVADOS */}
          <TabsContent
            value="arquivados"
            className="flex-1 overflow-auto min-h-0 m-0 data-[state=active]:flex flex-col p-4"
          >
            <ErrorBoundary>
              <LeadsArquivados />
            </ErrorBoundary>
          </TabsContent>
        </div>
      </Tabs>
    </ErrorBoundary>
  )
}
