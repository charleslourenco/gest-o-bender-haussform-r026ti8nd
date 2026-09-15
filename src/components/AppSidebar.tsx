import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTheme } from 'next-themes'
import logoLightImg from '@/assets/ativo-203-f4d7e.png'
import logoLightModeImg from '@/assets/ativo-204-80a9b.png'
import {
  LayoutDashboard,
  Users,
  Wallet,
  Settings,
  UserCog,
  Phone,
  Lock,
  ClipboardList,
  Factory,
  Wrench,
  Hammer,
  Package,
  ClipboardCheck,
  Menu,
  X,
} from 'lucide-react'
import { useSidebar } from '@/components/ui/sidebar'
import { useAuth } from '@/hooks/use-auth'
import { usePendenciasCount } from '@/hooks/use-pendencias-count'
import { cn } from '@/lib/utils'

const menuItems = [
  { title: 'Dashboard', icon: LayoutDashboard, url: '/dashboard', module: 'Dashboard' },
  { title: 'Atendimentos', icon: Phone, url: '/comercial', module: 'Comercial' },
  { title: 'Clientes', icon: Users, url: '/clientes', module: 'Clientes' },
  {
    title: 'Análise Técnica',
    icon: ClipboardList,
    url: '/analise-tecnica',
    module: 'Análise Técnica',
  },
  { title: 'Produção', icon: Factory, url: '/producao', module: 'Produção' },
  { title: 'Montagem & Assistência', icon: Wrench, url: '/montagem', module: 'Montagem' },
  {
    title: 'Acompanhamentos',
    icon: ClipboardCheck,
    url: '/acompanhamentos',
    module: 'Acompanhamentos',
  },
  {
    title: 'Estoque & Compras',
    icon: Package,
    url: '/estoque-compras',
    module: 'Estoque & Compras',
  },
  { title: 'Financeiro', icon: Wallet, url: '/financeiro', module: 'Financeiro' },
  { title: 'Gestão de Pessoas', icon: Users, url: '/gestao-pessoas', module: 'Gestão de Pessoas' },
  { title: 'Usuários', icon: UserCog, url: '/usuarios', module: 'Usuários' },
]

export function AppSidebar() {
  const location = useLocation()
  const { permissions, user } = useAuth()
  const { count: pendenciasCount } = usePendenciasCount()
  const { resolvedTheme } = useTheme()
  const { open, setOpen } = useSidebar()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted ? resolvedTheme === 'dark' : false
  const logoImg = isDark ? logoLightImg : logoLightModeImg

  const isSuperAdmin = user?.email === 'admin@bender.com'

  const hasAccess = (moduleName: string) => {
    if (isSuperAdmin) return true
    const level = permissions[moduleName]
    return level && level !== 'Sem Acesso'
  }

  const closeSidebar = () => setOpen(false)

  return (
    <>
      <div className="fixed left-0 top-0 bottom-0 w-12 z-30 bg-sidebar border-r border-border flex flex-col items-center pt-4">
        <button
          onClick={() => setOpen(true)}
          className="p-2.5 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground transition-colors"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/50 z-40 animate-fade-in" onClick={closeSidebar} />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 bottom-0 z-50 w-64 bg-sidebar border-r border-border flex flex-col transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="p-4 flex items-center justify-between border-b border-border/40 min-h-[64px]">
          <img
            src={logoImg}
            alt="Bender Haussform"
            width={180}
            height={48}
            className="h-10 w-auto max-w-[180px] object-contain"
          />
          <button
            onClick={closeSidebar}
            className="p-1.5 rounded-md hover:bg-sidebar-accent text-sidebar-foreground transition-colors"
            aria-label="Fechar menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-2">
          <p className="text-xs font-semibold text-sidebar-foreground/60 px-3 mb-2">
            Menu Principal
          </p>
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const canAccess = hasAccess(item.module)
              const isActive = location.pathname.startsWith(item.url)
              return (
                <li key={item.title}>
                  {canAccess ? (
                    <Link
                      to={item.url}
                      onClick={closeSidebar}
                      className={cn(
                        'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors',
                        isActive
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                      )}
                    >
                      <item.icon className="w-4 h-4 shrink-0" />
                      <span className="font-medium truncate">{item.title}</span>
                      {item.module === 'Comercial' && pendenciasCount > 0 && (
                        <span
                          className="ml-auto inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-white bg-amber-500 rounded-full shadow-xs"
                          title={`${pendenciasCount} atendimento(s) aguardando resposta`}
                        >
                          {pendenciasCount}
                        </span>
                      )}
                    </Link>
                  ) : (
                    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm opacity-60 cursor-not-allowed text-sidebar-foreground">
                      <item.icon className="w-4 h-4 shrink-0" />
                      <span className="font-medium truncate">{item.title}</span>
                      {item.module === 'Comercial' && pendenciasCount > 0 && (
                        <span
                          className="ml-auto inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-white bg-amber-500 rounded-full shadow-xs mr-2"
                          title={`${pendenciasCount} atendimento(s) aguardando resposta`}
                        >
                          {pendenciasCount}
                        </span>
                      )}
                      <Lock className="w-3 h-3 ml-auto shrink-0 text-sidebar-foreground/50" />
                    </div>
                  )}
                </li>
              )
            })}
          </ul>

          <div className="mt-4 pt-4 border-t border-border/40">
            <p className="text-xs font-semibold text-sidebar-foreground/60 px-3 mb-2">Sistema</p>
            {hasAccess('Administrativo') ? (
              <Link
                to="/admin"
                onClick={closeSidebar}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors',
                  location.pathname === '/admin'
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                )}
              >
                <Settings className="w-4 h-4 shrink-0" />
                <span className="font-medium truncate">Administrativo</span>
              </Link>
            ) : (
              <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm opacity-60 cursor-not-allowed text-sidebar-foreground">
                <Settings className="w-4 h-4 shrink-0" />
                <span className="font-medium truncate">Administrativo</span>
                <Lock className="w-3 h-3 ml-auto shrink-0 text-sidebar-foreground/50" />
              </div>
            )}
          </div>
        </nav>
      </aside>
    </>
  )
}
