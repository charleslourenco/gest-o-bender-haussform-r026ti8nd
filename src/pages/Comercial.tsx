import { useState, useEffect, useRef } from 'react'
import { KanbanBoard } from '@/components/comercial/KanbanBoard'
import { KanbanNaoComercial } from '@/components/comercial/KanbanNaoComercial'
import { ComercialList } from '@/components/comercial/ComercialList'
import { ComercialIndicators } from '@/components/comercial/ComercialIndicators'
import { supabase } from '@/lib/supabase/client'
import {
  TrendingUp,
  LayoutDashboard,
  List as ListIcon,
  BarChart3,
  MessageCircle,
  Archive,
  Inbox,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { ConversasView } from '@/components/comercial/ConversasView'
import { LeadsArquivados } from '@/components/comercial/LeadsArquivados'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'

export default function Comercial() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [activeTab, setActiveTab] = useState('kanban')
  const [toolbarNode, setToolbarNode] = useState<HTMLDivElement | null>(null)
  const kanbanContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let isMounted = true
    const check = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error || !data.session) {
          if (isMounted) setHasPermission(false)
          return
        }

        const res = await supabase.functions.invoke('check-permission', {
          body: { action: 'read', modulo: 'Comercial' },
        })

        if (!isMounted) return

        if (res.data?.allowed && ['Admin', 'Editor'].includes(res.data?.level)) {
          setHasPermission(true)
        } else {
          setHasPermission(false)
        }
      } catch (err) {
        console.error('Erro ao verificar permissões:', err)
        if (isMounted) setHasPermission(false)
      }
    }
    check()
    return () => {
      isMounted = false
    }
  }, [])

  const scrollKanban = (direction: 'left' | 'right') => {
    if (!kanbanContainerRef.current) return
    const scrollEl = kanbanContainerRef.current.querySelector(
      '[data-radix-scroll-area-viewport]',
    ) as HTMLElement | null
    const target = scrollEl || kanbanContainerRef.current
    const amount = direction === 'left' ? -350 : 350
    target.scrollBy({ left: amount, behavior: 'smooth' })
  }

  if (hasPermission === null) {
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
          <h1 className="text-foreground font-bold text-3xl">Kanban Comercial</h1>
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
    <Tabs
      value={activeTab}
      onValueChange={setActiveTab}
      className="h-[calc(100vh-2rem)] md:h-screen flex flex-col bg-background p-6 pt-0 space-y-4"
    >
      <div className="flex flex-row items-center justify-between w-full bg-card border text-card-foreground px-4 py-3 mb-4 rounded-lg mt-0 flex-nowrap overflow-x-auto overflow-y-hidden gap-4 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent shadow-sm">
        <div className="flex flex-row items-center gap-4 shrink-0 whitespace-nowrap">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-500 hidden sm:block" />
            Comercial
          </h1>
          <TabsList className="bg-muted/50 p-1 flex gap-1 h-auto rounded-md">
            <TabsTrigger
              value="kanban"
              onClick={() => setActiveTab('kanban')}
              className="py-1.5 px-3 rounded-md transition-colors"
            >
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Kanban
            </TabsTrigger>
            <TabsTrigger
              value="nao-comercial"
              onClick={() => setActiveTab('nao-comercial')}
              className="py-1.5 px-3 rounded-md transition-colors"
            >
              <Inbox className="w-4 h-4 mr-2" />
              Não Comercial
            </TabsTrigger>
            <TabsTrigger
              value="lista"
              onClick={() => setActiveTab('lista')}
              className="py-1.5 px-3 rounded-md transition-colors"
            >
              <ListIcon className="w-4 h-4 mr-2" />
              Lista
            </TabsTrigger>
            <TabsTrigger
              value="indicadores"
              onClick={() => setActiveTab('indicadores')}
              className="py-1.5 px-3 rounded-md transition-colors"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Indicadores
            </TabsTrigger>
            <TabsTrigger
              value="conversas"
              onClick={() => setActiveTab('conversas')}
              className="py-1.5 px-3 rounded-md transition-colors"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Conversas
            </TabsTrigger>
            <TabsTrigger
              value="arquivados"
              onClick={() => setActiveTab('arquivados')}
              className="py-1.5 px-3 rounded-md transition-colors"
            >
              <Archive className="w-4 h-4 mr-2" />
              Arquivados
            </TabsTrigger>
          </TabsList>
        </div>
        <div
          ref={setToolbarNode}
          className="flex flex-row items-center gap-2 shrink-0 whitespace-nowrap [&_input]:!w-28 lg:[&_input]:!w-40 [&_button[role='combobox']]:!w-28 lg:[&_button[role='combobox']]:!w-40"
        />
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <TabsContent
          value="kanban"
          className="flex-1 overflow-hidden min-h-0 m-0 data-[state=active]:flex flex-col relative group"
        >
          <div
            ref={kanbanContainerRef}
            className="flex-1 overflow-hidden flex flex-col min-h-0 relative"
          >
            <KanbanBoard toolbarPortal={toolbarNode} isActive={activeTab === 'kanban'} />
            <div className="hidden md:flex items-center gap-1 absolute bottom-4 right-4 z-10 bg-background/80 backdrop-blur-sm border shadow-md rounded-lg p-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => scrollKanban('left')}
                title="Rolar para a esquerda"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => scrollKanban('right')}
                title="Rolar para a direita"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent
          value="nao-comercial"
          className="flex-1 overflow-hidden min-h-0 m-0 data-[state=active]:flex flex-col relative group"
        >
          <div className="flex-1 overflow-hidden flex flex-col min-h-0 relative">
            <KanbanNaoComercial
              toolbarPortal={toolbarNode}
              isActive={activeTab === 'nao-comercial'}
            />
          </div>
        </TabsContent>

        <TabsContent
          value="lista"
          className="flex-1 overflow-hidden min-h-0 m-0 data-[state=active]:flex flex-col"
        >
          <div className="flex-1 overflow-auto bg-card rounded-xl shadow-sm border">
            <ComercialList />
          </div>
        </TabsContent>

        <TabsContent
          value="indicadores"
          className="flex-1 overflow-y-auto min-h-0 m-0 data-[state=active]:flex flex-col"
        >
          <ComercialIndicators />
        </TabsContent>

        <TabsContent
          value="conversas"
          className="flex-1 overflow-hidden min-h-0 m-0 data-[state=active]:flex flex-col"
        >
          <div className="flex-1 overflow-hidden bg-card rounded-xl shadow-sm border flex">
            <ConversasView toolbarPortal={toolbarNode} isActive={activeTab === 'conversas'} />
          </div>
        </TabsContent>

        <TabsContent
          value="arquivados"
          className="flex-1 overflow-hidden min-h-0 m-0 data-[state=active]:flex flex-col"
        >
          <div className="flex-1 overflow-auto bg-card rounded-xl shadow-sm border">
            <LeadsArquivados />
          </div>
        </TabsContent>
      </div>
    </Tabs>
  )
}
