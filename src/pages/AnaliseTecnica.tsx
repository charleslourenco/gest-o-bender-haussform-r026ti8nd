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
    <div className="h-full flex flex-col bg-slate-50/50 animate-in fade-in duration-300">
      <div className="bg-[#0A1931] border-b border-slate-800/50 px-6 py-4 flex-none z-10 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-emerald-500" />
              </div>
              <h1 className="text-xl font-semibold text-white">Análise Técnica</h1>
            </div>

            <Tabs value={view} onValueChange={setView} className="hidden sm:block">
              <TabsList className="bg-white/10 border border-white/10">
                <TabsTrigger
                  value="kanban"
                  className="data-[state=active]:bg-white data-[state=active]:text-[#0A1931] text-slate-300"
                >
                  Kanban
                </TabsTrigger>
                <TabsTrigger
                  value="list"
                  className="data-[state=active]:bg-white data-[state=active]:text-[#0A1931] text-slate-300"
                >
                  Lista
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex flex-wrap lg:flex-nowrap items-center gap-3 w-full lg:w-auto">
            <div className="relative w-full sm:w-[260px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por cliente ou código..."
                value={filters.cliente}
                onChange={(e) => setFilters((prev) => ({ ...prev, cliente: e.target.value }))}
                className="pl-9 h-9 bg-white/10 border-white/10 text-white placeholder:text-slate-400 focus-visible:ring-emerald-500 w-full"
              />
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-9 bg-white/10 border-white/10 text-white hover:bg-white/20 hover:text-white border-none shrink-0 relative"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Filtros
                  {(filters.consultor !== 'all' || filters.dateRange.from) && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4" align="end">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Consultor</label>
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
                    <label className="text-sm font-medium text-slate-700">Período</label>
                    <div className="border rounded-md shadow-sm p-2 bg-white">
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
                      className="w-full text-slate-500 hover:text-slate-800"
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
