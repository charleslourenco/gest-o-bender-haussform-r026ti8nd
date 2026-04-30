import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  KanbanSquare,
  Users,
  PackageSearch,
  Hammer,
  Wallet,
  Settings,
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

const menuItems = [
  { title: 'Início', icon: LayoutDashboard, url: '/' },
  { title: 'Projetos', icon: KanbanSquare, url: '/projetos' },
  { title: 'Clientes', icon: Users, url: '/clientes' },
  { title: 'Estoque', icon: PackageSearch, url: '/estoque' },
  { title: 'Produção', icon: Hammer, url: '#' },
  { title: 'Financeiro', icon: Wallet, url: '#' },
]

export function AppSidebar() {
  const location = useLocation()

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
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.url}
                    tooltip={item.title}
                  >
                    <Link to={item.url} className="flex items-center gap-3">
                      <item.icon className="w-5 h-5" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Configurações">
                  <a href="#" className="flex items-center gap-3">
                    <Settings className="w-5 h-5" />
                    <span>Configurações</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
