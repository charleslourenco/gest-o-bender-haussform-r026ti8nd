import { useState } from 'react'
import {
  Plus,
  Search,
  FileSearch,
  Filter,
  Hammer,
  Scissors,
  AlertTriangle,
  Wrench,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { CreateCardDialog } from './CreateCardDialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { supabase } from '@/lib/supabase/client'
import { useEffect } from 'react'

export function KanbanHeader({ title, searchQuery, setSearchQuery }: any) {
  const [activeTab, setActiveTab] = useState('kanban')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [pendingPurchasesCount, setPendingPurchasesCount] = useState<number | null>(null)

  useEffect(() => {
    if (title !== 'Análise Técnica') return

    let isMounted = true

    const fetchPendingPurchases = async () => {
      try {
        const { data, count, error } = await supabase
          .from('solicitacoes_compra')
          .select('*', { count: 'exact' })
          .eq('status', 'Pendente')

        if (error) return

        if (data && Array.isArray(data) && isMounted) {
          setPendingPurchasesCount(count || 0)
        }
      } catch (err) {
        console.error('Unexpected error fetching pending purchases:', err)
      }
    }

    fetchPendingPurchases()

    const channel = supabase
      .channel('public:solicitacoes_compra_header')
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
  }, [title])

  const handleTabChange = (val: string) => {
    setActiveTab(val)
    window.dispatchEvent(new CustomEvent('kanban_tab_change', { detail: val }))
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
    window.dispatchEvent(new CustomEvent('kanban_search_change', { detail: e.target.value }))
  }

  if (title === 'Montagem') {
    return (
      <div className="w-full flex flex-col">
        {/* Top bar: Background color #0A1931 containing the module title */}
        <div className="flex items-center justify-between w-full bg-[#0A1931] text-white px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Wrench className="w-6 h-6 text-emerald-400" />
              <h1 className="text-xl font-bold text-white tracking-tight">Montagem</h1>
            </div>

            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-auto ml-4">
              <TabsList className="bg-white/10 border-none h-9">
                <TabsTrigger
                  value="kanban"
                  className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70"
                >
                  Quadro Kanban
                </TabsTrigger>
                <TabsTrigger
                  value="lista"
                  className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70"
                >
                  Lista
                </TabsTrigger>
                <TabsTrigger
                  value="montadores"
                  className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70"
                >
                  Gestão de Montadores
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Action Row: A row immediately below the blue header for filters and primary action buttons */}
        <div className="flex items-center justify-between w-full bg-white border-b border-steel-blue/10 px-6 py-3 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="relative min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-steel-blue/50" />
              <Input
                placeholder="Buscar..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="pl-9 bg-white border-steel-blue/20 text-midnight-navy placeholder:text-steel-blue/50 h-9 w-64"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              className="text-steel-blue border-steel-blue/20 hover:bg-steel-blue/5 h-9 w-9 shrink-0"
            >
              <Filter className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="bg-steel-blue hover:bg-steel-blue/90 text-white h-9 whitespace-nowrap shrink-0 shadow-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Criar Card Avulso
            </Button>
          </div>
        </div>

        <CreateCardDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
      </div>
    )
  }

  if (title === 'Produção') {
    return (
      <div className="w-full px-4 pt-0 mt-0">
        <div className="flex flex-row items-center justify-between w-full bg-[#0A1931] text-white px-4 py-3 mb-4 rounded-md mt-0 flex-nowrap overflow-x-auto overflow-y-hidden gap-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {/* Left Side Grouping */}
          <div className="flex flex-row items-center gap-4 shrink-0 whitespace-nowrap">
            <div className="flex items-center gap-2">
              <Hammer className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-bold text-white">Produção</h2>
            </div>

            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-auto">
              <TabsList className="bg-white/10 border-none h-9">
                <TabsTrigger
                  value="kanban"
                  className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/60"
                >
                  Kanban
                </TabsTrigger>
                <TabsTrigger
                  value="lista"
                  className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/60"
                >
                  Lista
                </TabsTrigger>
                <TabsTrigger
                  value="indicadores"
                  className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/60"
                >
                  Indicadores
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Right Side Grouping */}
          <div className="flex flex-row items-center gap-2 shrink-0 whitespace-nowrap">
            <div className="relative min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <Input
                placeholder="Buscar..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="pl-9 bg-white/10 border-white/20 text-white placeholder:text-white/50 h-9 w-28 lg:w-40"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10 h-9 w-9 shrink-0"
            >
              <Filter className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => window.dispatchEvent(new CustomEvent('open_registrar_retalho'))}
              className="bg-amber-500 hover:bg-amber-600 text-white h-9 whitespace-nowrap shrink-0"
            >
              <Scissors className="w-4 h-4 mr-2" />
              Registrar Retalho
            </Button>
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="bg-steel-blue hover:bg-steel-blue/90 text-white h-9 whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4 mr-2" />
              Criar Card Avulso
            </Button>
          </div>

          <CreateCardDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
        </div>
      </div>
    )
  }

  // Specific header layout for Análise Técnica
  if (title === 'Análise Técnica') {
    return (
      <div className="w-full px-4 pt-0 mt-0">
        <div className="bg-[#0A1931] text-white px-4 py-3 mb-4 mt-0 rounded-md flex flex-row flex-nowrap items-center justify-between w-full whitespace-nowrap">
          {/* Left Side Group */}
          <div className="flex flex-row items-center gap-6">
            <div className="flex items-center gap-2">
              <FileSearch className="w-5 h-5 text-white" />
              <h2 className="text-lg font-bold text-white">Análise Técnica</h2>
            </div>

            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-auto">
              <TabsList className="bg-white/10 border-none h-9">
                <TabsTrigger
                  value="kanban"
                  className="data-[state=active]:bg-steel-blue data-[state=active]:text-white text-white/70"
                >
                  Kanban
                </TabsTrigger>
                <TabsTrigger
                  value="lista"
                  className="data-[state=active]:bg-steel-blue data-[state=active]:text-white text-white/70"
                >
                  Lista
                </TabsTrigger>
                <TabsTrigger
                  value="indicadores"
                  className="data-[state=active]:bg-steel-blue data-[state=active]:text-white text-white/70"
                >
                  Indicadores
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Right Side Group */}
          <div className="flex flex-row items-center gap-4">
            {pendingPurchasesCount !== null && pendingPurchasesCount > 0 && (
              <div
                className="bg-amber-100 text-amber-700 border border-amber-200 text-sm font-medium px-2 py-1.5 rounded-md shrink-0 flex items-center gap-1.5"
                title={`${pendingPurchasesCount} Solicitação(ões) de Compra Pendente(s)`}
              >
                <AlertTriangle className="w-4 h-4" />
                <span className="font-bold">{pendingPurchasesCount}</span>
              </div>
            )}
            <div className="relative w-48 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <Input
                placeholder="Buscar..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="pl-9 bg-white/10 border-white/20 text-white placeholder:text-white/40 h-9 w-full"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10 h-9 w-9 shrink-0"
            >
              <Filter className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => window.dispatchEvent(new CustomEvent('open_criar_card_avulso'))}
              className="bg-steel-blue hover:bg-steel-blue/90 text-white h-9 whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4 mr-2" />
              Criar Card Avulso
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-6 bg-white border-b border-steel-blue/10">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-midnight-navy">{title}</h2>
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="bg-steel-blue hover:bg-steel-blue/90 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Criar Card Avulso
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 w-full">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-midnight-navy/40" />
          <Input
            placeholder="Buscar de forma unificada..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-off-white border-steel-blue/20"
          />
        </div>
      </div>

      <CreateCardDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </div>
  )
}
