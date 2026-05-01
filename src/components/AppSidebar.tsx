import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Wallet,
  Settings,
  UserCog,
  Target,
  Lock,
  ClipboardList,
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

const menuItems = [
  { title: 'Dashboard', icon: LayoutDashboard, url: '/dashboard', module: 'Dashboard' },
  { title: 'Comercial', icon: Target, url: '/comercial', module: 'Comercial' },
  { title: 'Área de Clientes', icon: Users, url: '/area-clientes', module: 'Área de Clientes' },
  {
    title: 'Análise Técnica',
    icon: ClipboardList,
    url: '/analise-tecnica',
    module: 'Análise Técnica',
  },
  { title: 'Financeiro', icon: Wallet, url: '/financeiro', module: 'Financeiro' },
  { title: 'Usuários', icon: UserCog, url: '/usuarios', module: 'Usuários' },
]

export function AppSidebar() {
  const location = useLocation()
  const { permissions, user } = useAuth()

  const isSuperAdmin = user?.email === 'admin@bender.com'

  const hasAccess = (moduleName: string) => {
    if (isSuperAdmin) return true
    const level = permissions[moduleName]
    return level && level !== 'Sem Acesso'
  }

  return (
    <Sidebar className="border-r border-dark-denim bg-midnight-navy [&>div[data-sidebar=sidebar]]:bg-midnight-navy">
      <SidebarHeader className="p-4 flex flex-row items-center gap-2 bg-midnight-navy">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-dark-denim text-off-white font-bold text-xl">
          M
        </div>
        <span className="font-bold text-lg text-pale-cornflower truncate">Móveis Gestão</span>
      </SidebarHeader>
      <SidebarContent className="bg-midnight-navy">
        <SidebarGroup>
          <SidebarGroupLabel className="text-steel-blue">Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const canAccess = hasAccess(item.module)
                const isActive = location.pathname === item.url
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild={canAccess}
                      isActive={isActive}
                      tooltip={item.title}
                      className={cn(
                        !canAccess ? 'opacity-60 cursor-not-allowed' : '',
                        isActive
                          ? 'bg-dark-denim text-off-white hover:bg-dark-denim hover:text-off-white data-[active=true]:bg-dark-denim data-[active=true]:text-off-white'
                          : 'text-pale-cornflower hover:bg-dark-denim hover:text-off-white',
                      )}
                    >
                      {canAccess ? (
                        <Link to={item.url} className="flex items-center gap-3">
                          <item.icon className="w-5 h-5" />
                          <span className="font-medium">{item.title}</span>
                        </Link>
                      ) : (
                        <div className="flex items-center gap-3 w-full">
                          <item.icon className="w-5 h-5" />
                          <span className="font-medium">{item.title}</span>
                          <Lock className="w-4 h-4 ml-auto" />
                        </div>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
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
                      ? 'bg-dark-denim text-off-white hover:bg-dark-denim hover:text-off-white data-[active=true]:bg-dark-denim data-[active=true]:text-off-white'
                      : 'text-pale-cornflower hover:bg-dark-denim hover:text-off-white',
                  )}
                >
                  {hasAccess('Administrativo') ? (
                    <Link to="/admin" className="flex items-center gap-3">
                      <Settings className="w-5 h-5" />
                      <span className="font-medium">Administrativo</span>
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3 w-full">
                      <Settings className="w-5 h-5" />
                      <span className="font-medium">Administrativo</span>
                      <Lock className="w-4 h-4 ml-auto" />
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
