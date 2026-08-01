import { Bell, LogOut, ShoppingBag, User as UserIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/use-auth'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useNotifications } from '@/hooks/use-notifications'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { UserProfileDialog } from './UserProfileDialog'
import { SolicitacaoCompraDialog } from './SolicitacaoCompraDialog'
import { ThemeToggle } from './theme-toggle'

export function Header() {
  const [empresa, setEmpresa] = useState<{ nome: string; logo_url: string | null } | null>(null)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [pendingCompras, setPendingCompras] = useState(0)
  const { notificacoes, unreadCount: unreadNotifs, markAsRead, markAllAsRead } = useNotifications()

  const { user, signOut } = useAuth()
  const [fotoPerfil, setFotoPerfil] = useState<string | null>(null)

  useEffect(() => {
    const fetchEmpresa = async () => {
      const { data } = await supabase.from('empresa').select('nome, logo_url').limit(1).single()
      if (data) setEmpresa(data)
    }
    fetchEmpresa()
    window.addEventListener('branding_updated', fetchEmpresa)
    return () => window.removeEventListener('branding_updated', fetchEmpresa)
  }, [])

  useEffect(() => {
    const fetchPendingCompras = async () => {
      const { count } = await supabase
        .from('solicitacoes_compra')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Pendente')
      setPendingCompras(count || 0)
    }
    fetchPendingCompras()
    const channel = supabase
      .channel('solicitacoes_compra_badge')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'solicitacoes_compra' },
        () => {
          fetchPendingCompras()
        },
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    if (!user?.id) return

    const fetchFoto = async () => {
      const { data } = await supabase.from('users').select('foto_perfil').eq('id', user.id).single()

      if (data?.foto_perfil) {
        setFotoPerfil(
          data.foto_perfil.startsWith('http') || data.foto_perfil.startsWith('data:')
            ? data.foto_perfil
            : supabase.storage.from('avatars').getPublicUrl(data.foto_perfil).data.publicUrl,
        )
      } else {
        setFotoPerfil(null)
      }
    }

    fetchFoto()

    const handleUserUpdated = () => fetchFoto()
    window.addEventListener('user_updated', handleUserUpdated)

    const channel = supabase
      .channel('user_profile_changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${user.id}` },
        (payload) => {
          const newFoto = payload.new.foto_perfil
          if (newFoto) {
            setFotoPerfil(
              newFoto.startsWith('http') || newFoto.startsWith('data:')
                ? newFoto
                : supabase.storage.from('avatars').getPublicUrl(newFoto).data.publicUrl,
            )
          } else {
            setFotoPerfil(null)
          }
        },
      )
      .subscribe()

    return () => {
      window.removeEventListener('user_updated', handleUserUpdated)
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  const userInitials = user?.user_metadata?.nome
    ? user.user_metadata.nome.substring(0, 2).toUpperCase()
    : user?.email?.substring(0, 2).toUpperCase() || 'US'

  const userName = user?.user_metadata?.nome || user?.email?.split('@')[0] || 'Usuário'

  const totalBadgeCount = unreadNotifs

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-card px-4 shadow-sm">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
        {empresa?.logo_url && null}
      </div>

      <div className="flex items-center gap-4">
        <SolicitacaoCompraDialog
          trigger={
            <Button
              variant="ghost"
              size="icon"
              className="relative text-muted-foreground hover:text-foreground hover:bg-muted"
              title="Solicitações de Compra"
            >
              <ShoppingBag className="h-5 w-5" />
              {pendingCompras > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 rounded-full bg-blue-600 text-white text-[10px] border-none">
                  {pendingCompras}
                </Badge>
              )}
            </Button>
          }
        />

        <ThemeToggle />

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <Bell className="h-5 w-5" />
              {totalBadgeCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 rounded-full bg-destructive text-destructive-foreground text-[10px] border-none">
                  {totalBadgeCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/50">
              <h4 className="font-semibold text-sm">Notificações</h4>
              {unreadNotifs > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="h-auto p-1 text-xs hover:bg-transparent"
                >
                  Marcar todas como lidas
                </Button>
              )}
            </div>
            <ScrollArea className="h-80">
              {notificacoes.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  Nenhuma notificação no momento
                </div>
              ) : (
                <div className="flex flex-col">
                  {notificacoes.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        if (!n.lida) markAsRead(n.id)
                      }}
                      className={`flex items-start gap-3 p-4 border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer ${!n.lida ? 'bg-primary/5' : ''}`}
                    >
                      <div className="flex-1 space-y-1">
                        <p
                          className={`text-sm font-medium leading-none ${!n.lida ? 'text-foreground' : 'text-muted-foreground'}`}
                        >
                          {n.titulo}
                        </p>
                        <p
                          className={`text-xs ${!n.lida ? 'text-muted-foreground' : 'text-muted-foreground/70'}`}
                        >
                          {n.mensagem}
                        </p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">
                          {formatDistanceToNow(new Date(n.criado_em), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </PopoverContent>
        </Popover>

        <div className="flex items-center gap-4 border-l pl-4 border-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-auto p-1 px-2 flex items-center gap-2 hover:bg-muted rounded-md border border-transparent hover:border-border transition-colors"
              >
                <div className="hidden md:flex flex-col text-right">
                  <span className="text-sm font-medium leading-none text-foreground">
                    {userName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {empresa?.nome || 'Bender Haussform'}
                  </span>
                </div>
                <Avatar className="h-9 w-9 border border-border">
                  {fotoPerfil && (
                    <AvatarImage src={fotoPerfil} alt={userName} className="object-cover" />
                  )}
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsProfileOpen(true)} className="cursor-pointer">
                <UserIcon className="mr-2 h-4 w-4" />
                <span>Meu Perfil</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => signOut()}
                className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <UserProfileDialog open={isProfileOpen} onOpenChange={setIsProfileOpen} />
        </div>
      </div>
    </header>
  )
}
