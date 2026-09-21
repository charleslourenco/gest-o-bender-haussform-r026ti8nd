import { useState } from 'react'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import {
  CalendarDays,
  ClipboardList,
  Factory,
  Wrench,
  Clock,
  Calendar,
  Layers,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'

type SchedulePeriod = 'anual' | 'mensal' | 'semanal' | 'diario'

interface PcpTabItem {
  id: string
  label: string
  path: string
  module: string
  icon: typeof CalendarDays
}

const PCP_TABS: PcpTabItem[] = [
  {
    id: 'planejamento',
    label: 'Planejamento Operacional',
    path: '/pcp',
    module: 'Planejamento e Programação de Operações',
    icon: CalendarDays,
  },
  {
    id: 'analise-tecnica',
    label: 'Análise Técnica',
    path: '/pcp/analise-tecnica',
    module: 'Análise Técnica',
    icon: ClipboardList,
  },
  {
    id: 'producao',
    label: 'Produção',
    path: '/pcp/producao',
    module: 'Produção',
    icon: Factory,
  },
  {
    id: 'montagem',
    label: 'Montagem & Assistência',
    path: '/pcp/montagem',
    module: 'Montagem',
    icon: Wrench,
  },
]

export function PcpPlanejamentoView() {
  const [period, setPeriod] = useState<SchedulePeriod>('mensal')

  const periodLabels: Record<SchedulePeriod, string> = {
    anual: 'Visão Anual',
    mensal: 'Visão Mensal',
    semanal: 'Visão Semanal',
    diario: 'Visão Diária',
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* Sub-header de Cronograma e Seletores de período */}
      <div className="px-6 py-3 bg-card border-b border-border flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Cronograma de Operações</span>
          <span className="text-xs text-muted-foreground ml-2">({periodLabels[period]})</span>
        </div>

        {/* Seletores Anual / Mensal / Semanal / Diário */}
        <div className="flex items-center p-1 bg-muted/60 rounded-lg gap-1">
          {(['anual', 'mensal', 'semanal', 'diario'] as SchedulePeriod[]).map((p) => (
            <Button
              key={p}
              variant={period === p ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setPeriod(p)}
              className={cn(
                'h-7 px-3 text-xs font-medium capitalize transition-all',
                period === p
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted',
              )}
            >
              {p === 'diario' ? 'Diário' : p}
            </Button>
          ))}
        </div>
      </div>

      {/* Empty State Elegante de Cronograma */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-auto">
        <Card className="max-w-xl w-full border border-border/60 shadow-sm bg-card/60 backdrop-blur-xs text-center p-8">
          <CardContent className="pt-2 pb-0 flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 text-primary border border-primary/20">
              <Clock className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              Cronograma Operacional em Estruturação
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-md mb-6">
              Esta visão centralizará o sequenciamento industrial, alocação de postos de trabalho e
              balanceamento de capacidade ({periodLabels[period].toLowerCase()}).
            </p>

            <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3 text-left pt-2 border-t border-border/60">
              <div className="p-3 rounded-lg bg-muted/40 border border-border/40">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground mb-1">
                  <Layers className="w-3.5 h-3.5 text-primary" />
                  Mapeamento
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Cards pós-venda já catalogados e vinculados ao fluxo linear.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-muted/40 border border-border/40">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground mb-1">
                  <CalendarDays className="w-3.5 h-3.5 text-primary" />
                  Gantt & Capacidade
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Módulo de carga de máquina e cronograma em integração futura.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-muted/40 border border-border/40">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground mb-1">
                  <ChevronRight className="w-3.5 h-3.5 text-primary" />
                  Acesso Direto
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Navegue pelas abas acima para acompanhar Análise, Produção e Montagem.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function PcpHub() {
  const location = useLocation()
  const navigate = useNavigate()
  const { permissions, user } = useAuth()

  const isSuperAdmin = user?.email === 'admin@bender.com'

  const hasAccess = (moduleName: string) => {
    if (isSuperAdmin) return true
    const level = permissions[moduleName]
    return level && level !== 'Sem Acesso'
  }

  // Identificar aba ativa pela rota atual
  const activeTab = (() => {
    const p = location.pathname
    if (p.startsWith('/pcp/analise-tecnica')) return 'analise-tecnica'
    if (p.startsWith('/pcp/producao')) return 'producao'
    if (p.startsWith('/pcp/montagem')) return 'montagem'
    return 'planejamento'
  })()

  // Se estiver na rota raiz /pcp, renderizamos PcpPlanejamentoView. Se for sub-rota (/pcp/producao, etc.), renderizamos o Outlet.
  const isRootPcp = location.pathname === '/pcp' || location.pathname === '/pcp/'

  return (
    <div className="h-full flex flex-col bg-background animate-in fade-in duration-300 overflow-hidden">
      {/* Header unificado PCP / Operações */}
      <div className="bg-card border-b border-border shrink-0 z-20 shadow-xs">
        <div className="px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground tracking-tight leading-none">
                PCP / Operações
              </h1>
              <p className="text-xs text-muted-foreground mt-1">
                Central de Planejamento, Engenharia Técnica, Produção e Montagem
              </p>
            </div>
          </div>

          {/* Abas Superiores navegadas POR ROTA */}
          <div className="flex items-center gap-1.5 overflow-x-auto p-1 bg-muted/60 rounded-xl">
            {PCP_TABS.map((tab) => {
              const allowed = hasAccess(tab.module)
              const isActive = activeTab === tab.id
              const TabIcon = tab.icon

              if (!allowed) return null

              return (
                <Button
                  key={tab.id}
                  variant={isActive ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => navigate(tab.path)}
                  className={cn(
                    'h-8 px-3 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                  )}
                >
                  <TabIcon className="w-3.5 h-3.5 shrink-0" />
                  {tab.label}
                </Button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Área de conteúdo: apenas a aba ativa é montada */}
      <div className="flex-1 overflow-hidden min-h-0 relative flex flex-col">
        <ErrorBoundary source="PCP Hub">
          {isRootPcp ? <PcpPlanejamentoView /> : <Outlet />}
        </ErrorBoundary>
      </div>
    </div>
  )
}
