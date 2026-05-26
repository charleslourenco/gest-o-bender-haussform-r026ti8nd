import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import {
  LayoutDashboard,
  Users,
  Wallet,
  Settings,
  UserCog,
  Target,
  Lock,
  ClipboardList,
  Factory,
  Hammer,
  Package,
  Calculator,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'
import { AIAssistant } from './AIAssistant'

const menuItems = [
  { title: 'Dashboard', icon: LayoutDashboard, url: '/dashboard', module: 'Dashboard' },
  { title: 'Comercial', icon: Target, url: '/comercial', module: 'Comercial' },
  {
    title: 'Criar Orçamento',
    icon: Calculator,
    url: '/orcamentos',
    module: 'Comercial',
  },
  { title: 'Clientes', icon: Users, url: '/clientes', module: 'Clientes' },
  {
    title: 'Análise Técnica',
    icon: ClipboardList,
    url: '/analise-tecnica',
    module: 'Análise Técnica',
  },
  { title: 'Produção', icon: Factory, url: '/producao', module: 'Produção' },
  {
    title: 'Listas de Materiais',
    icon: ClipboardList,
    url: '/listas-materiais',
    module: 'Produção',
  },
  { title: 'Montagem', icon: Hammer, url: '/montagem', module: 'Montagem' },
  {
    title: 'Estoque & Compras',
    icon: Package,
    url: '/estoque-compras',
    module: 'Estoque & Compras',
  },
  {
    title: 'Listas de Materiais',
    icon: ClipboardList,
    url: '/listas-materiais',
    module: 'Produção',
  },
  { title: 'Financeiro', icon: Wallet, url: '/financeiro', module: 'Financeiro' },
  { title: 'Gestão de Pessoas', icon: Users, url: '/gestao-pessoas', module: 'Gestão de Pessoas' },
  { title: 'Usuários', icon: UserCog, url: '/usuarios', module: 'Usuários' },
]

export function AppSidebar() {
  const location = useLocation()
  const { permissions, user } = useAuth()
  const [empresa, setEmpresa] = useState<{
    nome: string
    logo_url: string | null
    atualizado_em?: string
  } | null>(null)

  useEffect(() => {
    async function fetchEmpresa() {
      const { data } = await supabase
        .from('empresa')
        .select('nome, logo_url, atualizado_em')
        .order('criado_em', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (data) {
        setEmpresa(data)
      }
    }
    fetchEmpresa()

    const handleBrandingUpdated = () => fetchEmpresa()
    window.addEventListener('branding_updated', handleBrandingUpdated)
    return () => window.removeEventListener('branding_updated', handleBrandingUpdated)
  }, [])

  const isSuperAdmin = user?.email === 'admin@bender.com'

  const hasAccess = (moduleName: string) => {
    if (isSuperAdmin) return true
    const level = permissions[moduleName]
    return level && level !== 'Sem Acesso'
  }

  return (
    <Sidebar className="border-r border-border bg-sidebar [&>div[data-sidebar=sidebar]]:bg-sidebar">
      <SidebarHeader className="p-4 flex flex-col justify-center min-h-[64px]">
        {empresa?.logo_url ? (
          <img
            src={`${empresa.logo_url}${empresa.logo_url.includes('?') ? '&' : '?'}t=${empresa.atualizado_em ? new Date(empresa.atualizado_em).getTime() : Date.now()}`}
            alt={empresa.nome || 'Logo da Empresa'}
            className="max-h-12 w-full object-contain"
          />
        ) : empresa?.nome ? (
          <div className="flex flex-row items-center gap-2 w-full justify-center">
            <span className="font-bold text-xl text-sidebar-foreground truncate text-center">
              {empresa.nome}
            </span>
          </div>
        ) : null}
      </SidebarHeader>
      <SidebarContent className="flex flex-col h-full overflow-hidden">
        <SidebarGroup className="flex-1 overflow-y-auto z-10 pb-4">
          <SidebarGroupLabel className="text-sidebar-foreground/70">
            Menu Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const canAccess = hasAccess(item.module)
                const isActive = location.pathname.startsWith(item.url)
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild={canAccess}
                      isActive={isActive}
                      tooltip={item.title}
                      className={cn(
                        !canAccess ? 'opacity-60 cursor-not-allowed' : '',
                        isActive
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                      )}
                    >
                      {canAccess ? (
                        <Link to={item.url} className="flex items-center gap-2">
                          <item.icon className="w-4 h-4 shrink-0" />
                          <span className="font-medium truncate">{item.title}</span>
                        </Link>
                      ) : (
                        <div className="flex items-center gap-2 w-full">
                          <item.icon className="w-4 h-4 shrink-0" />
                          <span className="font-medium truncate">{item.title}</span>
                          <Lock className="w-3 h-3 ml-auto shrink-0 text-sidebar-foreground/50" />
                        </div>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto w-full flex flex-col items-center justify-center relative z-20 py-4 min-h-[90px]">
          <AIAssistant />
        </div>

        <SidebarGroup className="shrink-0 z-30 bg-sidebar border-t border-border/40">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild={hasAccess('Administrativo')}
                  tooltip="Administrativo"
                  isActive={location.pathname === '/admin'}
                  className={cn(
                    !hasAccess('Administrativo') ? 'opacity-60 cursor-not-allowed' : '',
                    location.pathname === '/admin'
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  )}
                >
                  {hasAccess('Administrativo') ? (
                    <Link to="/admin" className="flex items-center gap-2">
                      <Settings className="w-4 h-4 shrink-0" />
                      <span className="font-medium truncate">Administrativo</span>
                    </Link>
                  ) : (
                    <div className="flex items-center gap-2 w-full">
                      <Settings className="w-4 h-4 shrink-0" />
                      <span className="font-medium truncate">Administrativo</span>
                      <Lock className="w-3 h-3 ml-auto shrink-0 text-sidebar-foreground/50" />
                    </div>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
