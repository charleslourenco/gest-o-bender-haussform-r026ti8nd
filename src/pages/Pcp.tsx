import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { CalendarDays, ClipboardList, Factory, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { useAuth } from '@/hooks/use-auth'
import { PcpGradeIndustrial } from '@/components/pcp/PcpGradeIndustrial'
import { cn } from '@/lib/utils'

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
  return (
    <ErrorBoundary source="PCP Grade Industrial">
      <PcpGradeIndustrial />
    </ErrorBoundary>
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
