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
  LayoutGrid,
  List,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { useAuth } from '@/hooks/use-auth'
import { PcpMatrizMensal } from '@/components/pcp/PcpMatrizMensal'
import { PcpMatrizAnual } from '@/components/pcp/PcpMatrizAnual'
import { PcpMatrizDiaria } from '@/components/pcp/PcpMatrizDiaria'
import { PcpModoLista } from '@/components/pcp/PcpModoLista'
import { cn } from '@/lib/utils'

type SchedulePeriod = 'anual' | 'mensal' | 'semanal' | 'diario'
type ViewMode = 'grade' | 'lista'

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
  const [viewMode, setViewMode] = useState<ViewMode>('grade')

  // Estado para quando o usuário dá duplo clique num mês da Visão Anual e navega para a Visão Mensal
  const [targetMonthIndex, setTargetMonthIndex] = useState<number | undefined>(undefined)
  const [targetYear, setTargetYear] = useState<number | undefined>(undefined)

  const periodLabels: Record<SchedulePeriod, string> = {
    anual: 'Visão Anual',
    mensal: 'Visão Mensal',
    semanal: 'Visão Semanal',
    diario: 'Visão Diária',
  }

  const handleNavigateToMonth = (monthIndex: number, year: number) => {
    setTargetMonthIndex(monthIndex)
    setTargetYear(year)
    setPeriod('mensal')
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* Sub-header de Cronograma, Seletores de período e Alternância Grade / Lista */}
      <div className="px-6 py-2.5 bg-card border-b border-border flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-2xs">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Cronograma de Operações</span>
          <span className="text-xs text-muted-foreground ml-2">
            ({periodLabels[period]} • {viewMode === 'grade' ? 'Grade / Calendário' : 'Modo Lista'})
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Seletor de Modo: [ 📊 Grade / Calendário ] | [ 📋 Lista ] */}
          <div className="flex items-center p-1 bg-muted/70 rounded-lg gap-1 border border-border/50">
            <Button
              variant={viewMode === 'grade' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grade')}
              className={cn(
                'h-7 px-3 text-xs font-semibold flex items-center gap-1.5 transition-all',
                viewMode === 'grade'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted',
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Grade / Calendário
            </Button>

            <Button
              variant={viewMode === 'lista' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('lista')}
              className={cn(
                'h-7 px-3 text-xs font-semibold flex items-center gap-1.5 transition-all',
                viewMode === 'lista'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted',
              )}
            >
              <List className="w-3.5 h-3.5" />
              Lista
            </Button>
          </div>

          {/* Seletores Anual / Mensal / Semanal / Diário */}
          <div className="flex items-center p-1 bg-muted/60 rounded-lg gap-1 border border-border/50">
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
      </div>

      {/* Renderização dinâmica com base no seletor de visualização (Grade vs Lista) e Período */}
      {viewMode === 'lista' ? (
        <ErrorBoundary source="PCP Modo Lista">
          <PcpModoLista
            initialZoom={period === 'anual' ? 'anual' : period === 'semanal' ? 'semanal' : 'mensal'}
          />
        </ErrorBoundary>
      ) : period === 'anual' ? (
        <ErrorBoundary source="PCP Matriz Anual">
          <PcpMatrizAnual onNavigateToMonth={handleNavigateToMonth} />
        </ErrorBoundary>
      ) : period === 'mensal' ? (
        <ErrorBoundary source="PCP Matriz Mensal">
          <PcpMatrizMensal initialYear={targetYear} initialMonthIndex={targetMonthIndex} />
        </ErrorBoundary>
      ) : period === 'diario' ? (
        <ErrorBoundary source="PCP Matriz Diária">
          <PcpMatrizDiaria />
        </ErrorBoundary>
      ) : (
        /* Semanal é coberto nativamente pela visão Mensal (grade com semanas ISO S01-S52) */
        <ErrorBoundary source="PCP Matriz Mensal / Semanal">
          <PcpMatrizMensal initialYear={targetYear} initialMonthIndex={targetMonthIndex} />
        </ErrorBoundary>
      )}
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
