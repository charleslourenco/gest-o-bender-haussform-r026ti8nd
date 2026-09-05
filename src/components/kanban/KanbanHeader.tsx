import { useState, useEffect } from 'react'
import { Plus, Search, FileSearch, Filter, Hammer, Scissors, AlertTriangle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { CreateCardDialog } from './CreateCardDialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { supabase } from '@/lib/supabase/client'

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
        <div className="flex items-center justify-between w-full bg-card border-b border-border px-6 py-3 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="relative min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="pl-9 bg-background border-input text-foreground placeholder:text-muted-foreground h-9 w-64"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              className="text-primary border-input hover:bg-muted/50 h-9 w-9 shrink-0"
            >
              <Filter className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground h-9 whitespace-nowrap shrink-0 shadow-sm"
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
        <div className="flex flex-row items-center justify-between w-full bg-card border-b border-border text-card-foreground px-4 py-3 mb-4 mt-0 rounded-md flex-nowrap overflow-x-auto overflow-y-hidden gap-4 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
          <div className="flex flex-row items-center gap-4 shrink-0 whitespace-nowrap">
            <div className="flex items-center gap-2">
              <Hammer className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">Produção</h2>
            </div>

            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-auto">
              <TabsList className="bg-muted border-none h-9">
                <TabsTrigger
                  value="kanban"
                  className="data-[state=active]:bg-card data-[state=active]:text-foreground text-muted-foreground"
                >
                  Kanban
                </TabsTrigger>
                <TabsTrigger
                  value="lista"
                  className="data-[state=active]:bg-card data-[state=active]:text-foreground text-muted-foreground"
                >
                  Lista
                </TabsTrigger>
                <TabsTrigger
                  value="relatorio"
                  className="data-[state=active]:bg-card data-[state=active]:text-foreground text-muted-foreground"
                >
                  Relatório de Alocação
                </TabsTrigger>
                <TabsTrigger
                  value="indicadores"
                  className="data-[state=active]:bg-card data-[state=active]:text-foreground text-muted-foreground"
                >
                  Indicadores
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex flex-row items-center gap-2 shrink-0 whitespace-nowrap">
            <div className="relative min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="pl-9 bg-muted/30 border-input text-foreground placeholder:text-muted-foreground h-9 w-28 lg:w-40"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:bg-muted hover:text-foreground h-9 w-9 shrink-0"
            >
              <Filter className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => window.dispatchEvent(new CustomEvent('open_registrar_sobra'))}
              className="bg-amber-500 hover:bg-amber-600 text-white h-9 whitespace-nowrap shrink-0"
            >
              <Scissors className="w-4 h-4 mr-2" />
              Registrar Sobra
            </Button>
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground h-9 whitespace-nowrap shrink-0"
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

  if (title === 'Análise Técnica') {
    return (
      <div className="w-full px-4 pt-0 mt-0">
        <div className="bg-card border-b border-border text-card-foreground px-4 py-3 mb-4 mt-0 rounded-md flex flex-row flex-nowrap items-center justify-between w-full whitespace-nowrap">
          <div className="flex flex-row items-center gap-6">
            <div className="flex items-center gap-2">
              <FileSearch className="w-5 h-5 text-foreground" />
              <h2 className="text-lg font-bold text-foreground">Análise Técnica</h2>
            </div>

            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-auto">
              <TabsList className="bg-muted border-none h-9">
                <TabsTrigger
                  value="kanban"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground"
                >
                  Kanban
                </TabsTrigger>
                <TabsTrigger
                  value="lista"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground"
                >
                  Lista
                </TabsTrigger>
                <TabsTrigger
                  value="indicadores"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground"
                >
                  Indicadores
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="pl-9 bg-muted/30 border-input text-foreground placeholder:text-muted-foreground h-9 w-full"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:bg-muted hover:text-foreground h-9 w-9 shrink-0"
            >
              <Filter className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => window.dispatchEvent(new CustomEvent('open_criar_card_avulso'))}
              className="bg-primary hover:bg-primary/90 text-primary-foreground h-9 whitespace-nowrap shrink-0"
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
    <div className="flex flex-col gap-4 p-6 bg-card border-b border-border">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">{title}</h2>
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <Plus className="w-4 h-4 mr-2" />
          Criar Card Avulso
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 w-full">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar de forma unificada..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background border-input"
          />
        </div>
      </div>

      <CreateCardDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </div>
  )
}
