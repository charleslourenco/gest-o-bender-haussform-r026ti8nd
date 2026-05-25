import { useState, useEffect } from 'react'
import { KanbanBoard } from '@/components/comercial/KanbanBoard'
import { ComercialList } from '@/components/comercial/ComercialList'
import { ComercialIndicators } from '@/components/comercial/ComercialIndicators'
import { supabase } from '@/lib/supabase/client'
import { TrendingUp, LayoutDashboard, List as ListIcon, BarChart3 } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function Comercial() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        setHasPermission(false)
        return
      }

      const res = await supabase.functions.invoke('check-permission', {
        body: { action: 'read', modulo: 'Comercial' },
      })

      if (res.data?.allowed && ['Admin', 'Editor'].includes(res.data?.level)) {
        setHasPermission(true)
      } else {
        setHasPermission(false)
      }
    }
    check()
  }, [])

  if (hasPermission === null) {
    return (
      <div className="h-full flex flex-col bg-off-white">
        <div className="bg-midnight-navy p-6 shrink-0">
          <div className="h-10 w-64 bg-pale-cornflower/20 animate-pulse rounded-lg"></div>
        </div>
        <div className="flex-1 flex gap-4 p-6">
          <div className="flex-1 bg-pale-cornflower animate-pulse rounded-lg"></div>
          <div className="flex-1 bg-pale-cornflower animate-pulse rounded-lg hidden md:block"></div>
        </div>
      </div>
    )
  }

  if (!hasPermission) {
    return (
      <div className="h-full flex flex-col bg-off-white">
        <div className="bg-midnight-navy p-6 shrink-0">
          <h1 className="text-off-white font-bold text-[32px]">Kanban Comercial</h1>
        </div>
        <div className="flex-1 p-6">
          <div className="bg-pale-cornflower p-6 rounded-lg text-center border-2 border-steel-blue">
            <p className="text-midnight-navy font-bold text-[18px]">
              Você não tem permissão para acessar este módulo.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-2rem)] md:h-screen flex flex-col bg-off-white p-6 space-y-4">
      <div className="bg-midnight-navy p-4 shrink-0 rounded-xl shadow-sm flex items-center gap-3">
        <TrendingUp className="h-8 w-8 text-emerald-400 hidden sm:block" />
        <div>
          <h1 className="text-2xl font-bold text-off-white">Gestão Comercial</h1>
          <p className="text-pale-cornflower text-sm mt-0.5">Acompanhamento e evolução de leads</p>
        </div>
      </div>

      <Tabs defaultValue="kanban" className="flex-1 flex flex-col min-h-0">
        <div className="shrink-0 mb-4">
          <TabsList className="bg-white border border-gray-200 shadow-sm h-auto p-1">
            <TabsTrigger
              value="kanban"
              className="data-[state=active]:bg-midnight-navy data-[state=active]:text-white py-2 px-4"
            >
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Kanban
            </TabsTrigger>
            <TabsTrigger
              value="lista"
              className="data-[state=active]:bg-midnight-navy data-[state=active]:text-white py-2 px-4"
            >
              <ListIcon className="w-4 h-4 mr-2" />
              Lista
            </TabsTrigger>
            <TabsTrigger
              value="indicadores"
              className="data-[state=active]:bg-midnight-navy data-[state=active]:text-white py-2 px-4"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Indicadores
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          value="kanban"
          className="flex-1 overflow-hidden min-h-0 m-0 data-[state=active]:flex flex-col"
        >
          <KanbanBoard />
        </TabsContent>

        <TabsContent
          value="lista"
          className="flex-1 overflow-hidden min-h-0 m-0 data-[state=active]:flex flex-col"
        >
          <div className="flex-1 overflow-auto bg-white rounded-xl shadow-sm border border-gray-200">
            <ComercialList />
          </div>
        </TabsContent>

        <TabsContent
          value="indicadores"
          className="flex-1 overflow-y-auto min-h-0 m-0 data-[state=active]:flex flex-col"
        >
          <ComercialIndicators />
        </TabsContent>
      </Tabs>
    </div>
  )
}
