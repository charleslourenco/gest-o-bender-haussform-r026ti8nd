import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { ATENDIMENTO_ABAS } from '@/components/comercial/constants'
import { KanbanAtendimentos } from '@/components/comercial/KanbanAtendimentos'
import { ComercialList } from '@/components/comercial/ComercialList'
import { ComercialIndicators } from '@/components/comercial/ComercialIndicators'
import { LeadsArquivados } from '@/components/comercial/LeadsArquivados'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TrendingUp, Headphones, List as ListIcon, BarChart3, Archive, Layers } from 'lucide-react'

export default function Comercial() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [activeTab, setActiveTab] = useState<string>('novo-contato')
  const [toolbarNode, setToolbarNode] = useState<HTMLDivElement | null>(null)

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
    <Tabs
      value={activeTab}
      onValueChange={setActiveTab}
      className="h-[calc(100vh-2rem)] md:h-screen flex flex-col bg-background p-4 md:p-6 pt-0 space-y-3"
    >
      {/* Barra de Topo do Módulo Atendimentos */}
      <div className="flex flex-row items-center justify-between w-full bg-card border text-card-foreground px-4 py-2.5 rounded-lg shrink-0 gap-3 shadow-xs">
        {/* Título e Abas Principais de Atendimento */}
        <div className="flex items-center gap-3 min-w-0 flex-1 overflow-x-auto scrollbar-none py-1">
          <h1 className="text-lg font-bold flex items-center gap-2 shrink-0">
            <Headphones className="h-5 w-5 text-emerald-500" />
            <span>Atendimentos</span>
          </h1>

          <TabsList className="bg-muted/60 p-1 flex items-center gap-1 h-auto rounded-lg shrink-0">
            {/* 7 ABAS DE KANBAN ESPECIALIZADAS */}
            {ATENDIMENTO_ABAS.map((aba) => (
              <TabsTrigger
                key={aba.id}
                value={aba.id}
                className="py-1 px-2.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
              >
                <span className="font-mono text-[10px] opacity-60 mr-1.5">{aba.numero}</span>
                {aba.titulo}
              </TabsTrigger>
            ))}

            {/* Separador visual sutil */}
            <div className="w-[1px] h-4 bg-border/80 mx-1 shrink-0" />

            {/* ABAS AUXILIARES */}
            <TabsTrigger
              value="lista"
              className="py-1 px-2.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            >
              <ListIcon className="w-3.5 h-3.5 mr-1" />
              Lista
            </TabsTrigger>
            <TabsTrigger
              value="indicadores"
              className="py-1 px-2.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            >
              <BarChart3 className="w-3.5 h-3.5 mr-1" />
              Indicadores
            </TabsTrigger>
            <TabsTrigger
              value="arquivados"
              className="py-1 px-2.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            >
              <Archive className="w-3.5 h-3.5 mr-1" />
              Arquivados
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Portal para Controles / Filtros de cada aba */}
        <div ref={setToolbarNode} className="shrink-0 flex items-center gap-2" />
      </div>

      {/* Conteúdo das 7 Abas Kanban e Abas Auxiliares */}
      <div className="flex-1 flex flex-col min-h-0 bg-card rounded-xl border shadow-xs overflow-hidden">
        {/* AS 7 ABAS DE ATENDIMENTOS */}
        {ATENDIMENTO_ABAS.map((aba) => (
          <TabsContent
            key={aba.id}
            value={aba.id}
            className="flex-1 overflow-hidden min-h-0 m-0 data-[state=active]:flex flex-col relative"
          >
            <KanbanAtendimentos
              aba={aba}
              toolbarPortal={toolbarNode}
              isActive={activeTab === aba.id}
            />
          </TabsContent>
        ))}

        {/* ABA AUXILIAR: LISTA */}
        <TabsContent
          value="lista"
          className="flex-1 overflow-auto min-h-0 m-0 data-[state=active]:flex flex-col p-4"
        >
          <ComercialList />
        </TabsContent>

        {/* ABA AUXILIAR: INDICADORES */}
        <TabsContent
          value="indicadores"
          className="flex-1 overflow-y-auto min-h-0 m-0 data-[state=active]:flex flex-col p-6"
        >
          <ComercialIndicators />
        </TabsContent>

        {/* ABA AUXILIAR: ARQUIVADOS */}
        <TabsContent
          value="arquivados"
          className="flex-1 overflow-auto min-h-0 m-0 data-[state=active]:flex flex-col p-4"
        >
          <LeadsArquivados />
        </TabsContent>
      </div>
    </Tabs>
  )
}
