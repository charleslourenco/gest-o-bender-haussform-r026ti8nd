import { Bell, Search, LogOut, Check, User as UserIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/use-auth'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { SolicitacaoCompraDialog } from '@/components/SolicitacaoCompraDialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
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

export function Header() {
  const [empresa, setEmpresa] = useState<{ nome: string; logo_url: string | null } | null>(null)
  const [totalAlerts, setTotalAlerts] = useState(0)
  const [notificacoes, setNotificacoes] = useState<any[]>([])
  const [unreadNotifs, setUnreadNotifs] = useState(0)
  const [isProfileOpen, setIsProfileOpen] = useState(false)

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

  useEffect(() => {
    const fetchAlerts = async () => {
      const today = new Date().toISOString().split('T')[0]
      const { count } = await supabase
        .from('contas_pagar')
        .select('*', { count: 'exact', head: true })
        .eq('status_pagamento', 'aguardando')
        .lte('data_vencimento', today)

      setTotalAlerts(count || 0)
    }

    fetchAlerts()
  }, [])

  useEffect(() => {
    if (!user?.id) return
    const fetchNotificacoes = async () => {
      const { data } = await supabase
        .from('notificacoes' as any)
        .select('*')
        .eq('usuario_id', user.id)
        .order('criado_em', { ascending: false })
        .limit(20)

      if (data) {
        setNotificacoes(data)
        setUnreadNotifs(data.filter((n: any) => !n.lida).length)
      }
    }

    fetchNotificacoes()

    const notifChannel = supabase
      .channel('notificacoes_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notificacoes',
          filter: `usuario_id=eq.${user.id}`,
        },
        (payload) => {
          setNotificacoes((prev) => [payload.new, ...prev].slice(0, 20))
          setUnreadNotifs((prev) => prev + 1)
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(notifChannel)
    }
  }, [user?.id])

  const markAsRead = async (id: string) => {
    await supabase
      .from('notificacoes' as any)
      .update({ lida: true })
      .eq('id', id)
    setNotificacoes((prev) => prev.map((n) => (n.id === id ? { ...n, lida: true } : n)))
    setUnreadNotifs((prev) => Math.max(0, prev - 1))
  }

  const markAllAsRead = async () => {
    if (!user) return
    await supabase
      .from('notificacoes' as any)
      .update({ lida: true })
      .eq('usuario_id', user.id)
      .eq('lida', false)
    setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })))
    setUnreadNotifs(0)
  }

  const userInitials = user?.user_metadata?.nome
    ? user.user_metadata.nome.substring(0, 2).toUpperCase()
    : user?.email?.substring(0, 2).toUpperCase() || 'US'

  const userName = user?.user_metadata?.nome || user?.email?.split('@')[0] || 'Usuário'

  const totalBadgeCount = totalAlerts + unreadNotifs

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-card px-4 shadow-sm">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
        {empresa?.logo_url && (
          <img
            src={empresa.logo_url}
            alt="Logo"
            className="h-8 max-w-[140px] object-contain ml-2"
          />
        )}
        <div className="hidden md:flex relative w-96">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar projetos, clientes ou itens..."
            className="w-full bg-muted/30 pl-9 border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-transparent"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <SolicitacaoCompraDialog />

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
                  Nenhuma notificação no momento.
                </div>
              ) : (
                <div className="flex flex-col">
                  {notificacoes.map((n) => (
                    <div
                      key={n.id}
                      className={`flex items-start gap-3 p-4 border-b last:border-0 hover:bg-muted/50 transition-colors ${!n.lida ? 'bg-primary/5' : ''}`}
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
                          {new Date(n.criado_em).toLocaleString('pt-BR')}
                        </p>
                      </div>
                      {!n.lida && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 rounded-full shrink-0 text-primary hover:text-primary hover:bg-primary/10"
                          onClick={() => markAsRead(n.id)}
                          title="Marcar como lida"
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      )}
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
