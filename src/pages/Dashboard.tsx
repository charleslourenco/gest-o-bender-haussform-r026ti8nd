// test
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
  ChevronDown,
  Check,
  AlertTriangle,
  RefreshCw,
  LogIn,
} from 'lucide-react'
import { DateRange } from 'react-day-picker'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { runWithAuthRecovery, redirectToLogin } from '@/lib/supabase/auth-recovery'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  const navigate = useNavigate()
  // Padrão: Todo o histórico para visão completa da operação, ou ajustável pelo usuário
  const [date, setDate] = useState<DateRange | undefined>({
    from: subMonths(new Date(), 6),
    to: new Date(),
  })
  const [activePreset, setActivePreset] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<FullDashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSessionExpired, setIsSessionExpired] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)

  const fetchMetrics = useCallback(async () => {
    setLoading(true)
    setErrorMessage(null)
    setIsSessionExpired(false)
    try {
      const from = date?.from ? date.from.toISOString() : null
      const to = date?.to ? new Date(date.to.setHours(23, 59, 59, 999)).toISOString() : null

      const result = await runWithAuthRecovery<FullDashboardMetrics>(() =>
        supabase.rpc('get_dashboard_metrics', {
          p_start_date: from,
          p_end_date: to,
        }),
      )

      if (result.error) {
        console.error('[Dashboard] Erro ao carregar métricas via RPC:', result.error)
        if (result.sessionExpired) {
          setIsSessionExpired(true)
          setErrorMessage(
            'Sua sessão expirou ou não é mais válida. Por favor, faça login novamente para continuar.',
          )
        } else {
          setErrorMessage(
            result.error?.message ||
              'Não foi possível carregar as métricas operacionais. Verifique sua conexão e tente novamente.',
          )
        }
      } else if (result.data) {
        setMetrics(result.data)
      } else {
        setErrorMessage('Nenhum dado retornado para o período selecionado.')
      }
    } catch (err: any) {
      console.error('[Dashboard] Exceção ao consultar get_dashboard_metrics:', err)
      setErrorMessage(
        err?.message || 'Ocorreu um erro inesperado ao carregar as métricas do painel.',
      )
    } finally {
      setLoading(false)
      setIsRetrying(false)
    }
  }, [date])

  useEffect(() => {
    fetchMetrics()
  }, [fetchMetrics])

  const handleApplyPreset = (preset: (typeof PERIOD_PRESETS)[number]) => {
    setActivePreset(preset.label)
    if (preset.all) {
      setDate(undefined)
    } else if (preset.days) {
      const from = new Date(new Date().setDate(new Date().getDate() - preset.days))
      setDate({ from, to: new Date() })
    } else if (preset.months) {
      setDate({ from: subMonths(new Date(), preset.months), to: new Date() })
    }
  }

  const handleRetry = () => {
    setIsRetrying(true)
    fetchMetrics()
  }

  const handleGoToLogin = () => {
    redirectToLogin('/dashboard')
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-9 px-3 border-border text-foreground hover:bg-muted font-medium text-xs gap-1.5"
                >
                  Período
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {PERIOD_PRESETS.map((p, idx) => {
                  const isSelected = activePreset === p.label || (!activePreset && !date && p.all)
                  return (
                    <DropdownMenuItem
                      key={idx}
                      onClick={() => handleApplyPreset(p)}
                      className="flex items-center justify-between text-xs cursor-pointer"
                    >
                      <span>{p.label}</span>
                      {isSelected && <Check className="h-3.5 w-3.5 text-primary ml-2" />}
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>

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
                    onClick={() => {
                      setDate(undefined)
                      setActivePreset(null)
                    }}
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
                  onSelect={(val) => {
                    setDate(val)
                    setActivePreset(null)
                  }}
                  numberOfMonths={2}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Conteúdo das 4 Abas com Tratamento de Loading e Erro Visível */}
        <div className="flex-1 overflow-y-auto min-h-0 w-full pr-1">
          {loading ? (
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
          ) : errorMessage || !metrics ? (
            <div className="flex flex-col items-center justify-center min-h-[360px] p-8 bg-card border border-border rounded-xl shadow-sm text-center max-w-xl mx-auto my-8 animate-in fade-in duration-200">
              <div className="w-14 h-14 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-4">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-bold text-foreground mb-2">
                {isSessionExpired ? 'Sessão Expirada' : 'Erro ao Carregar o Painel de Gestão'}
              </h2>
              <p className="text-sm text-muted-foreground mb-2 max-w-md font-medium">
                Não foi possível carregar os indicadores. Sua sessão pode ter expirado.
              </p>
              {errorMessage && (
                <p className="text-xs text-muted-foreground/80 mb-6 max-w-md bg-muted/40 p-2.5 rounded-lg border border-border/50">
                  {errorMessage}
                </p>
              )}
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button onClick={handleRetry} disabled={isRetrying} className="gap-2 font-medium">
                  <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
                  {isRetrying ? 'Tentando novamente...' : 'Tentar novamente'}
                </Button>
                {isSessionExpired && (
                  <Button variant="outline" onClick={handleGoToLogin} className="gap-2 font-medium">
                    <LogIn className="w-4 h-4" />
                    Fazer login novamente
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Aba 1: Atendimentos (Leads) */}
              <TabsContent value="atendimentos" className="mt-0 focus-visible:outline-none">
                <AtendimentosTab
                  data={metrics.atendimentos}
                  dateRange={{
                    from: date?.from ? date.from.toISOString() : null,
                    to: date?.to ? new Date(date.to.setHours(23, 59, 59, 999)).toISOString() : null,
                  }}
                />
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
