import { Bell, Search, User } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAppStore } from '@/stores/main'
import { Badge } from '@/components/ui/badge'

export function Header() {
  const { inventory, projects } = useAppStore()

  const lowStockCount = inventory.filter((i) => i.quantity <= i.minStock).length
  const urgentProjects = projects.filter(
    (p) => p.priority === 'Urgente' && p.stage !== 'Finalizado',
  ).length
  const totalAlerts = lowStockCount + urgentProjects

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="text-secondary" />
        <div className="hidden md:flex relative w-96">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar projetos, clientes ou itens..."
            className="w-full bg-muted/50 pl-9 border-none focus-visible:ring-1 focus-visible:ring-primary"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="relative text-secondary hover:text-primary">
          <Bell className="h-5 w-5" />
          {totalAlerts > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 rounded-full bg-destructive text-white text-[10px]">
              {totalAlerts}
            </Badge>
          )}
        </Button>
        <div className="flex items-center gap-2 border-l pl-4 border-border">
          <div className="hidden md:flex flex-col text-right">
            <span className="text-sm font-medium leading-none">Admin</span>
            <span className="text-xs text-muted-foreground">Marcenaria Silva</span>
          </div>
          <Avatar className="h-9 w-9 border border-border">
            <AvatarImage
              src="https://img.usecurling.com/ppl/thumbnail?gender=male&seed=1"
              alt="Admin"
            />
            <AvatarFallback>AD</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}
