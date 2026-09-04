import { useState, useEffect, useCallback } from 'react'
import { format, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  CalendarIcon,
  Presentation,
  Headphones,
  Users,
  Cpu,
  UsersRound,
  RotateCcw,
} from 'lucide-react'
import { DateRange } from 'react-day-picker'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'

import type { FullDashboardMetrics } from './dashboard/types'
import { AtendimentosTab } from './dashboard/AtendimentosTab'
import { ClientesTab } from './dashboard/ClientesTab'
import { PcpTab } from './dashboard/PcpTab'
import { GestaoPessoasTab } from './dashboard/GestaoPessoasTab'

const PERIOD_PRESETS = [
  { label: 'Últimos 30 dias', days: 30 },
  { label: 'Últimos 90 dias', days: 90 },
  { label: 'Últimos 6 meses', months: 6 },
  { label: 'Todo o Histórico', all: true },
]

export default function Dashboard() {
  // Padrão: Todo o histórico para visão completa da operação, ou ajustável pelo usuário
  const [date, setDate] = useState<DateRange | undefined>({
    from: subMonths(new Date(), 6),
    to: new Date(),
  })
  const [metrics, setMetrics] = useState<FullDashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchMetrics = useCallback(async () => {
    setLoading(true)
    try {
      const from = date?.from ? date.from.toISOString() : null
      const to = date?.to ? new Date(date.to.setHours(23, 59, 59, 999)).toISOString() : null

      const { data, error } = await supabase.rpc('get_dashboard_metrics', {
        p_start_date: from,
        p_end_date: to,
      })

      if (error) {
        console.error('[Dashboard] Erro ao carregar métricas via RPC:', error)
      } else if (data) {
        setMetrics(data as FullDashboardMetrics)
      }
    } catch (err) {
      console.error('[Dashboard] Exceção ao consultar get_dashboard_metrics:', err)
    } finally {
      setLoading(false)
    }
  }, [date])

  useEffect(() => {
    fetchMetrics()
  }, [fetchMetrics])

  const handleApplyPreset = (preset: (typeof PERIOD_PRESETS)[number]) => {
    if (preset.all) {
      setDate(undefined)
    } else if (preset.days) {
      const from = new Date()
      from.setDate(from.getDate() - preset.days)
      setDate({ from, to: new Date() })
    } else if (preset.months) {
      setDate({ from: subMonths(new Date(), preset.months), to: new Date() })
    }
  }

  return (
    <div className="pt-0 pb-6 px-6 h-full flex flex-col animate-in fade-in duration-300">
      <Tabs defaultValue="atendimentos" className="w-full flex-1 flex flex-col min-h-0 mt-0">
        {/* Barra Superior: Título dos Módulos + 4 Abas Exatas Solicitadas */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between w-full bg-card text-card-foreground px-4 py-3 rounded-xl border border-border shadow-sm mb-4 gap-4">
          <div className="flex flex-row items-center gap-2 overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
            <div className="flex items-center gap-2 mr-3 shrink-0">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <Presentation className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base font-extrabold text-foreground tracking-tight">
                  Painel de Gestão
                </h1>
                <p className="text-[11px] text-muted-foreground font-medium">
                  Indicadores operacionais por módulo
                </p>
              </div>
            </div>

            {/* As 4 abas por módulo: Atendimentos, Clientes, PCP, Gestão de Pessoas */}
            <TabsList className="bg-muted p-1 rounded-lg border border-border h-10 shrink-0">
              <TabsTrigger
                value="atendimentos"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground text-xs font-semibold gap-1.5 px-3"
              >
                <Headphones className="w-3.5 h-3.5" />
                Atendimentos
              </TabsTrigger>
              <TabsTrigger
                value="clientes"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground text-xs font-semibold gap-1.5 px-3"
              >
                <Users className="w-3.5 h-3.5" />
                Clientes & Vendas
              </TabsTrigger>
              <TabsTrigger
                value="pcp"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground text-xs font-semibold gap-1.5 px-3"
              >
                <Cpu className="w-3.5 h-3.5" />
                PCP & Fábrica
              </TabsTrigger>
              <TabsTrigger
                value="gestao_pessoas"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground text-xs font-semibold gap-1.5 px-3"
              >
                <UsersRound className="w-3.5 h-3.5" />
                Gestão de Pessoas
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Filtro ÚNICO de Período unificado no topo para todas as abas */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <div className="hidden xl:flex items-center gap-1">
              {PERIOD_PRESETS.map((p, idx) => (
                <Button
                  key={idx}
                  size="sm"
                  variant="outline"
                  className="h-8 text-[11px] px-2.5 font-medium border-border"
                  onClick={() => handleApplyPreset(p)}
                >
                  {p.label}
                </Button>
              ))}
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-9 px-3 border-border text-foreground hover:bg-muted font-medium text-xs gap-2"
                >
                  <CalendarIcon className="h-4 w-4 text-primary" />
                  {date?.from ? (
                    date.to ? (
                      <span>
                        {format(date.from, 'dd/MM/yyyy', { locale: ptBR })} -{' '}
                        {format(date.to, 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                    ) : (
                      <span>{format(date.from, 'dd/MM/yyyy', { locale: ptBR })}</span>
                    )
                  ) : (
                    <span className="font-semibold text-primary">Histórico Completo</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 border-border" align="end">
                <div className="p-2 border-b border-border flex justify-between items-center">
                  <span className="text-xs font-semibold">Selecionar Período</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
                    onClick={() => setDate(undefined)}
                  >
                    <RotateCcw className="h-3 w-3" />
                    Limpar Filtro
                  </Button>
                </div>
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={date?.from || new Date()}
                  selected={date}
                  onSelect={setDate}
                  numberOfMonths={2}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Conteúdo das 4 Abas com Tratamento de Loading */}
        <div className="flex-1 overflow-y-auto min-h-0 w-full pr-1">
          {loading || !metrics ? (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Skeleton className="h-28 w-full rounded-xl bg-muted" />
                <Skeleton className="h-28 w-full rounded-xl bg-muted" />
                <Skeleton className="h-28 w-full rounded-xl bg-muted" />
                <Skeleton className="h-28 w-full rounded-xl bg-muted" />
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                <Skeleton className="h-80 w-full rounded-xl bg-muted" />
                <Skeleton className="h-80 w-full rounded-xl bg-muted" />
              </div>
              <Skeleton className="h-72 w-full rounded-xl bg-muted" />
            </div>
          ) : (
            <>
              {/* Aba 1: Atendimentos (Leads) */}
              <TabsContent value="atendimentos" className="mt-0 focus-visible:outline-none">
                <AtendimentosTab data={metrics.atendimentos} />
              </TabsContent>

              {/* Aba 2: Clientes */}
              <TabsContent value="clientes" className="mt-0 focus-visible:outline-none">
                <ClientesTab data={metrics.clientes} />
              </TabsContent>

              {/* Aba 3: PCP */}
              <TabsContent value="pcp" className="mt-0 focus-visible:outline-none">
                <PcpTab data={metrics.pcp} />
              </TabsContent>

              {/* Aba 4: Gestão de Pessoas */}
              <TabsContent value="gestao_pessoas" className="mt-0 focus-visible:outline-none">
                <GestaoPessoasTab data={metrics.gestao_pessoas} />
              </TabsContent>
            </>
          )}
        </div>
      </Tabs>
    </div>
  )
}
