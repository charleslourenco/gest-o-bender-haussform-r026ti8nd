import { Bell, Search, LogOut } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAppStore } from '@/stores/main'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/use-auth'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

export function Header() {
  const { inventory, projects } = useAppStore()
  const [empresa, setEmpresa] = useState<{ nome: string; logo_url: string | null } | null>(null)

  useEffect(() => {
    const fetchEmpresa = async () => {
      const { data } = await supabase.from('empresa').select('nome, logo_url').limit(1).single()
      if (data) setEmpresa(data)
    }
    fetchEmpresa()
    window.addEventListener('branding_updated', fetchEmpresa)
    return () => window.removeEventListener('branding_updated', fetchEmpresa)
  }, [])
  const { user, signOut } = useAuth()

  const lowStockCount = inventory.filter((i) => i.quantity <= i.minStock).length
  const urgentProjects = projects.filter(
    (p) => p.priority === 'Urgente' && p.stage !== 'Finalizado',
  ).length
  const totalAlerts = lowStockCount + urgentProjects

  const userInitials = user?.user_metadata?.nome
    ? user.user_metadata.nome.substring(0, 2).toUpperCase()
    : user?.email?.substring(0, 2).toUpperCase() || 'US'

  const userName = user?.user_metadata?.nome || user?.email?.split('@')[0] || 'Usuário'

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-steel-blue bg-midnight-navy px-4 shadow-sm">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="text-off-white hover:text-pale-cornflower" />
        {empresa?.logo_url && (
          <img
            src={empresa.logo_url}
            alt="Logo"
            className="h-8 max-w-[140px] object-contain ml-2"
          />
        )}
        <div className="hidden md:flex relative w-96">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-midnight-navy/60" />
          <Input
            type="search"
            placeholder="Buscar projetos, clientes ou itens..."
            className="w-full bg-pale-cornflower pl-9 border-steel-blue text-midnight-navy placeholder:text-midnight-navy/60 focus-visible:ring-0 focus-visible:border-dark-denim focus-visible:border-[3px]"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="relative text-off-white hover:text-pale-cornflower hover:bg-dark-denim/50"
        >
          <Bell className="h-5 w-5" />
          {totalAlerts > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 rounded-full bg-steel-blue text-off-white text-[10px] border-none">
              {totalAlerts}
            </Badge>
          )}
        </Button>
        <div className="flex items-center gap-4 border-l pl-4 border-steel-blue">
          <div className="flex items-center gap-2">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-sm font-medium leading-none text-off-white">{userName}</span>
              <span className="text-xs text-pale-cornflower">
                {empresa?.nome || 'Bender Haussform'}
              </span>
            </div>
            <Avatar className="h-9 w-9 border-2 border-steel-blue">
              <AvatarImage
                src={`https://img.usecurling.com/ppl/thumbnail?gender=male&seed=${user?.id || 1}`}
                alt={userName}
              />
              <AvatarFallback className="bg-dark-denim text-off-white">
                {userInitials}
              </AvatarFallback>
            </Avatar>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => signOut()}
            title="Sair"
            className="text-pale-cornflower hover:text-off-white hover:bg-dark-denim/50"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  )
}
