import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Users, Wallet, Settings, UserCog, Target, Lock } from 'lucide-react'
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

const menuItems = [
  { title: 'Dashboard', icon: LayoutDashboard, url: '/dashboard', module: 'Dashboard' },
  { title: 'Comercial', icon: Target, url: '/comercial', module: 'Comercial' },
  { title: 'Área de Clientes', icon: Users, url: '/area-clientes', module: 'Área de Clientes' },
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
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="p-4 flex flex-row items-center gap-2">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground font-bold text-xl">
          M
        </div>
        <span className="font-bold text-lg text-sidebar-foreground truncate">Móveis Gestão</span>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const canAccess = hasAccess(item.module)
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild={canAccess}
                      isActive={location.pathname === item.url}
                      tooltip={item.title}
                      className={!canAccess ? 'opacity-60 cursor-not-allowed' : ''}
                    >
                      {canAccess ? (
                        <Link to={item.url} className="flex items-center gap-3">
                          <item.icon className="w-5 h-5 text-steel-blue" />
                          <span className="text-midnight-navy font-medium">{item.title}</span>
                        </Link>
                      ) : (
                        <div className="flex items-center gap-3 w-full">
                          <item.icon className="w-5 h-5 text-steel-blue" />
                          <span className="text-midnight-navy font-medium">{item.title}</span>
                          <Lock className="w-4 h-4 ml-auto text-steel-blue" />
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
                  className={!hasAccess('Administrativo') ? 'opacity-60 cursor-not-allowed' : ''}
                >
                  {hasAccess('Administrativo') ? (
                    <Link to="/admin" className="flex items-center gap-3">
                      <Settings className="w-5 h-5 text-steel-blue" />
                      <span className="text-midnight-navy font-medium">Administrativo</span>
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3 w-full">
                      <Settings className="w-5 h-5 text-steel-blue" />
                      <span className="text-midnight-navy font-medium">Administrativo</span>
                      <Lock className="w-4 h-4 ml-auto text-steel-blue" />
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
