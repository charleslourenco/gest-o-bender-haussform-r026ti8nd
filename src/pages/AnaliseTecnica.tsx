import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { AnaliseProjetoKanbanBoard } from '@/components/analise/AnaliseProjetoKanbanBoard'
import { AnaliseTecnicaListView } from '@/components/analise/AnaliseTecnicaListView'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Search, ClipboardList, Filter } from 'lucide-react'

const PROJECT_COLUMNS = [
  { id: 'iniciar', title: 'INICIAR' },
  { id: 'em_andamento', title: 'EM ANDAMENTO' },
  { id: 'concluido', title: 'CONCLUÍDO' },
]

export default function AnaliseTecnica() {
  const [users, setUsers] = useState<any[]>([])
  const [view, setView] = useState('kanban')
  const [filters, setFilters] = useState({
    cliente: '',
    consultor: 'all',
    dateRange: { from: undefined, to: undefined } as any,
  })

  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase
        .from('users')
        .select('id, nome')
        .eq('status', true)
        .order('nome')
      if (data) setUsers(data)
    }
    fetchUsers()
  }, [])

  useEffect(() => {
    const consultorName =
      filters.consultor === 'all' ? '' : users.find((u) => u.id === filters.consultor)?.nome || ''

    const detail = {
      cliente: filters.cliente,
      consultor: consultorName,
      dateRange: filters.dateRange,
    }

    // Dispatch events to child boards
    window.dispatchEvent(new CustomEvent('analise_detalhe_filters', { detail }))
    window.dispatchEvent(new CustomEvent('kanban_search_change', { detail: filters.cliente }))
  }, [filters, users])

  useEffect(() => {
    const fetchPendingRequests = async () => {
      try {
        const { count, error } = await supabase
          .from('solicitacoes_compra')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'Pendente')

        if (error) {
          console.error('Erro ao buscar solicitações pendentes:', error)
          return
        }

        if (count !== null && count > 0) {
          toast.warning(`Atenção: Existem ${count} solicitações de compra pendentes.`)
        }
      } catch (err) {
        console.error('Erro no processamento das solicitações de compra:', err)
      }
    }

    fetchPendingRequests()
  }, [])

  return (
    <div className="h-full flex flex-col bg-background animate-in fade-in duration-300">
      <div className="bg-card border-b border-border px-6 py-4 flex-none z-10 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-primary" />
              </div>
              <h1 className="text-xl font-semibold text-foreground">Análise Técnica</h1>
            </div>

            <Tabs value={view} onValueChange={setView} className="hidden sm:block">
              <TabsList className="bg-muted border border-border">
                <TabsTrigger
                  value="kanban"
                  className="data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground"
                >
                  Kanban
                </TabsTrigger>
                <TabsTrigger
                  value="list"
                  className="data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground"
                >
                  Lista
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex flex-wrap lg:flex-nowrap items-center gap-3 w-full lg:w-auto">
            <div className="relative w-full sm:w-[260px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente ou código..."
                value={filters.cliente}
                onChange={(e) => setFilters((prev) => ({ ...prev, cliente: e.target.value }))}
                className="pl-9 h-9 bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary w-full"
              />
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-9 bg-background border-border text-foreground hover:bg-muted hover:text-foreground shrink-0 relative"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Filtros
                  {(filters.consultor !== 'all' || filters.dateRange.from) && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4 bg-card border-border" align="end">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Consultor</label>
                    <Select
                      value={filters.consultor}
                      onValueChange={(val) => setFilters((prev) => ({ ...prev, consultor: val }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Todos os Consultores" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os Consultores</SelectItem>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Período</label>
                    <div className="border border-border rounded-md shadow-sm p-2 bg-card">
                      <Calendar
                        mode="range"
                        selected={{ from: filters.dateRange.from, to: filters.dateRange.to }}
                        onSelect={(range) =>
                          setFilters((prev) => ({
                            ...prev,
                            dateRange: range || { from: undefined, to: undefined },
                          }))
                        }
                        numberOfMonths={1}
                        locale={ptBR}
                      />
                    </div>
                  </div>

                  {(filters.consultor !== 'all' || filters.dateRange.from) && (
                    <Button
                      variant="ghost"
                      onClick={() =>
                        setFilters((prev) => ({
                          ...prev,
                          consultor: 'all',
                          dateRange: { from: undefined, to: undefined },
                        }))
                      }
                      className="w-full text-muted-foreground hover:text-foreground"
                    >
                      Limpar Filtros
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {view === 'kanban' ? (
          <AnaliseProjetoKanbanBoard />
        ) : (
          <AnaliseTecnicaListView searchQuery={filters.cliente} columns={PROJECT_COLUMNS} />
        )}
      </div>
    </div>
  )
}
