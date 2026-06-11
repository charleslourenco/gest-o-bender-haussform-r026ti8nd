import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { AnaliseProjetoKanbanBoard } from '@/components/analise/AnaliseProjetoKanbanBoard'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Search, UserCircle2, CalendarIcon, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function AnaliseTecnica() {
  const [users, setUsers] = useState<any[]>([])
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
    <div className="h-full flex flex-col bg-[#0B1B2E] animate-in fade-in duration-300 mt-0 pt-0 overflow-hidden relative">
      <div className="bg-[#132A46] border-b border-slate-800 p-4 shrink-0 z-10 shadow-sm flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="flex items-center gap-2 text-white font-semibold whitespace-nowrap">
          <span className="bg-blue-500/20 text-blue-400 p-1.5 rounded">
            <Search className="w-5 h-5" />
          </span>
          Filtros Globais
        </div>

        <div className="flex flex-wrap lg:flex-nowrap items-center gap-3 w-full lg:w-auto">
          <div className="relative w-full sm:w-[260px] lg:w-[280px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por cliente ou código..."
              value={filters.cliente}
              onChange={(e) => setFilters((prev) => ({ ...prev, cliente: e.target.value }))}
              className="pl-9 pr-9 h-9 bg-[#0F243B] border-slate-700 text-white placeholder:text-slate-400 focus-visible:ring-blue-500 w-full"
            />
            {filters.cliente && (
              <button
                onClick={() => setFilters((prev) => ({ ...prev, cliente: '' }))}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="w-full sm:w-[200px] lg:w-[220px]">
            <Select
              value={filters.consultor}
              onValueChange={(val) => setFilters((prev) => ({ ...prev, consultor: val }))}
            >
              <SelectTrigger className="h-9 bg-[#0F243B] border-slate-700 text-white focus:ring-blue-500 w-full">
                <div className="flex items-center gap-2 truncate">
                  <UserCircle2 className="h-4 w-4 text-slate-400 shrink-0" />
                  <SelectValue placeholder="Consultor" />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-[#1A3D63] border-slate-700 text-white">
                <SelectItem value="all">Todos os Consultores</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full sm:w-[280px]">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full h-9 justify-start text-left font-normal bg-[#0F243B] border-slate-700 hover:bg-[#1A3D63] hover:text-white focus:ring-blue-500',
                    !filters.dateRange.from && 'text-slate-400',
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                  <span className="truncate">
                    {filters.dateRange.from ? (
                      filters.dateRange.to ? (
                        <>
                          {format(filters.dateRange.from, 'dd/MM/yy')} -{' '}
                          {format(filters.dateRange.to, 'dd/MM/yy')}
                        </>
                      ) : (
                        format(filters.dateRange.from, 'dd/MM/yy')
                      )
                    ) : (
                      'Filtrar por período'
                    )}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto p-0 bg-[#1A3D63] border-slate-700 text-white"
                align="end"
              >
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={filters.dateRange.from}
                  selected={{ from: filters.dateRange.from, to: filters.dateRange.to }}
                  onSelect={(range) =>
                    setFilters((prev) => ({
                      ...prev,
                      dateRange: range || { from: undefined, to: undefined },
                    }))
                  }
                  numberOfMonths={2}
                  locale={ptBR}
                  className="bg-[#1A3D63] text-white rounded-md"
                  classNames={{
                    day_selected:
                      'bg-blue-600 text-white hover:bg-blue-600 hover:text-white focus:bg-blue-600 focus:text-white',
                    day_today: 'bg-blue-900/50 text-white',
                    day: 'hover:bg-slate-700 text-slate-200 rounded-md h-9 w-9 p-0 font-normal aria-selected:opacity-100',
                    day_range_middle: 'aria-selected:bg-blue-900/40 aria-selected:text-white',
                    head_cell: 'text-slate-400 font-medium w-9',
                    caption_label: 'text-white font-medium',
                    nav_button: 'hover:bg-slate-700 text-slate-300 rounded-md',
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>

          {(filters.cliente || filters.consultor !== 'all' || filters.dateRange.from) && (
            <Button
              variant="ghost"
              onClick={() =>
                setFilters({
                  cliente: '',
                  consultor: 'all',
                  dateRange: { from: undefined, to: undefined },
                })
              }
              className="h-9 text-slate-400 hover:text-white hover:bg-[#1A3D63]"
            >
              Limpar
            </Button>
          )}
        </div>
      </div>
      <AnaliseProjetoKanbanBoard />
    </div>
  )
}
