import { useState, useEffect } from 'react'
import { Plus, Search, Edit2, Trash2, UserX, ShieldAlert, Users as UsersIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useDebounce } from '@/hooks/use-debounce'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { HasPermission } from '@/components/HasPermission'
import { UserFormModal } from '@/components/users/UserFormModal'
import { PermissionsMatrix } from '@/components/users/PermissionsMatrix'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { AppUser } from '@/types/user'
import { cn } from '@/lib/utils'

const ITEMS_PER_PAGE = 20

export default function Users() {
  const { toast } = useToast()
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [refresh, setRefresh] = useState(0)

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isPermOpen, setIsPermOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null)
  const [userToDelete, setUserToDelete] = useState<AppUser | null>(null)
  const [errorState, setErrorState] = useState<string | null>(null)

  useEffect(() => {
    fetchUsers()
  }, [debouncedSearch, roleFilter, statusFilter, page, refresh])

  useEffect(() => {
    const channel = supabase
      .channel('public:users')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        setRefresh((r) => r + 1)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    setErrorState(null)
    try {
      let query = supabase.from('users').select('*', { count: 'exact' })

      if (debouncedSearch) {
        query = query.or(`nome.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%`)
      }
      if (roleFilter !== 'all') {
        query = query.eq('funcao', roleFilter)
      }
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter === 'active')
      }

      const from = (page - 1) * ITEMS_PER_PAGE
      const to = from + ITEMS_PER_PAGE - 1
      query = query.range(from, to).order('criado_em', { ascending: false })

      const { data, error, count } = await query
      if (error) throw error

      setUsers(data as AppUser[])
      setTotalPages(Math.max(1, Math.ceil((count || 0) / ITEMS_PER_PAGE)))
    } catch (err: any) {
      setErrorState('Erro ao carregar usuários. ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (userId: string) => {
    try {
      const { error } = await supabase.functions.invoke('admin-users', {
        body: { action: 'delete', userId },
      })
      if (error) throw error
      toast({
        title: 'Usuário deletado com sucesso!',
      })
      setRefresh((r) => r + 1)
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao deletar',
        description: err.message,
      })
    } finally {
      setUserToDelete(null)
    }
  }

  const handleFormSuccess = (user: AppUser, isNew: boolean) => {
    setSelectedUser(user)
    setIsFormOpen(false)
    setIsPermOpen(true)
    setRefresh((r) => r + 1)
  }

  const openEdit = (user: AppUser) => {
    setSelectedUser(user)
    setIsFormOpen(true)
  }

  const openAdd = () => {
    setSelectedUser(null)
    setIsFormOpen(true)
  }

  return (
    <HasPermission
      module="Usuários"
      allowedLevels={['Editor', 'Admin']}
      fallback={
        <div className="flex h-full min-h-[60vh] items-center justify-center p-8 text-center bg-background">
          <div className="flex flex-col items-center gap-4 border border-border p-8 rounded-xl bg-card max-w-md shadow-sm">
            <ShieldAlert className="h-16 w-16 text-muted-foreground" />
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Acesso Negado</h2>
            <p className="text-muted-foreground font-medium text-sm">
              Você não tem permissão para acessar este módulo. Contate o administrador.
            </p>
          </div>
        </div>
      }
    >
      <div className="h-full flex flex-col bg-background animate-in fade-in duration-300 overflow-hidden">
        <Tabs defaultValue="lista" className="flex-1 flex flex-col min-h-0 w-full">
          {/* Cabeçalho compacto padrão + Barra de Controles no estilo do sistema */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-2.5 bg-card border-b border-border shrink-0 z-30 gap-2.5">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <UsersIcon className="w-5 h-5 text-foreground" />
                <div>
                  <h1 className="text-base font-bold text-foreground leading-tight">Usuários</h1>
                  <p className="text-xs text-muted-foreground hidden md:block">
                    Controle de acesso e equipe
                  </p>
                </div>
              </div>

              <TabsList className="h-8 bg-muted/60 p-0.5 rounded-md">
                <TabsTrigger
                  value="lista"
                  className="h-7 px-3 text-xs font-medium rounded-sm data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
                >
                  Lista
                </TabsTrigger>
                <TabsTrigger
                  value="matriz"
                  className="h-7 px-3 text-xs font-medium rounded-sm data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
                >
                  Permissões
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={openAdd}
                className="h-8 text-xs font-medium bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Adicionar Usuário</span>
              </Button>
            </div>
          </div>

          <TabsContent value="lista" className="flex-1 overflow-y-auto min-h-0 m-0 p-4 space-y-4">
            <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou e-mail..."
                  className="pl-8 h-8 text-xs bg-background border-border text-foreground placeholder:text-muted-foreground"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-[170px] h-8 text-xs bg-background border-border text-foreground">
                  <SelectValue placeholder="Função" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="all" className="text-xs">
                    Todas as funções
                  </SelectItem>
                  <SelectItem value="Consultor" className="text-xs">
                    Consultor
                  </SelectItem>
                  <SelectItem value="Analista" className="text-xs">
                    Analista
                  </SelectItem>
                  <SelectItem value="Gerente" className="text-xs">
                    Gerente
                  </SelectItem>
                  <SelectItem value="Admin" className="text-xs">
                    Admin
                  </SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[150px] h-8 text-xs bg-background border-border text-foreground">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="all" className="text-xs">
                    Todos os status
                  </SelectItem>
                  <SelectItem value="active" className="text-xs">
                    Ativo
                  </SelectItem>
                  <SelectItem value="inactive" className="text-xs">
                    Inativo
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {errorState ? (
              <div className="flex flex-col items-center justify-center py-12 text-center border border-border rounded-lg bg-card shadow-xs p-6">
                <ShieldAlert className="h-10 w-10 text-destructive mb-3" />
                <h3 className="text-base font-semibold text-foreground mb-1">{errorState}</h3>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 text-xs"
                  onClick={() => setRefresh((r) => r + 1)}
                >
                  Tentar Novamente
                </Button>
              </div>
            ) : loading && users.length === 0 ? (
              <>
                <div className="hidden md:block border border-border rounded-lg bg-card overflow-hidden shadow-xs">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow className="border-b border-border">
                        <TableHead className="text-xs font-semibold text-muted-foreground py-2.5 px-3">
                          Nome
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground py-2.5 px-3">
                          E-mail
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground py-2.5 px-3">
                          Função
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground py-2.5 px-3">
                          Status
                        </TableHead>
                        <TableHead className="text-right text-xs font-semibold text-muted-foreground py-2.5 px-3">
                          Ações
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...Array(5)].map((_, i) => (
                        <TableRow key={i} className="border-b border-border hover:bg-muted/30">
                          <TableCell className="py-2.5 px-3">
                            <Skeleton className="h-4 w-40" />
                          </TableCell>
                          <TableCell className="py-2.5 px-3">
                            <Skeleton className="h-4 w-48" />
                          </TableCell>
                          <TableCell className="py-2.5 px-3">
                            <Skeleton className="h-4 w-20" />
                          </TableCell>
                          <TableCell className="py-2.5 px-3">
                            <Skeleton className="h-5 w-16 rounded-full" />
                          </TableCell>
                          <TableCell className="text-right py-2.5 px-3">
                            <Skeleton className="h-7 w-16 inline-block rounded-md" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="md:hidden flex flex-col gap-3">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="flex flex-col gap-2 p-3.5 rounded-lg border border-border bg-card shadow-xs"
                    >
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3.5 w-1/2" />
                      <div className="mt-2 pt-2 border-t border-border flex justify-between items-center">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : users.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center border border-border rounded-lg bg-card shadow-xs p-6">
                <UserX className="h-12 w-12 text-muted-foreground mb-3 opacity-60" />
                <h3 className="text-base font-semibold text-foreground mb-1">
                  Nenhum usuário cadastrado
                </h3>
                <p className="text-xs text-muted-foreground max-w-sm mb-4">
                  Nenhum registro encontrado com os filtros aplicados.
                </p>
                <Button
                  size="sm"
                  onClick={openAdd}
                  className="text-xs bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Adicionar Usuário</span>
                </Button>
              </div>
            ) : (
              <>
                <div className="hidden md:block border border-border rounded-lg bg-card overflow-hidden shadow-xs">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow className="border-b border-border">
                        <TableHead className="text-xs font-semibold text-muted-foreground py-2.5 px-3">
                          Nome
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground py-2.5 px-3">
                          E-mail
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground py-2.5 px-3">
                          Função
                        </TableHead>
                        <TableHead className="text-xs font-semibold text-muted-foreground py-2.5 px-3">
                          Status
                        </TableHead>
                        <TableHead className="text-right text-xs font-semibold text-muted-foreground py-2.5 px-3">
                          Ações
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow
                          key={user.id}
                          className="border-b border-border hover:bg-muted/30 transition-colors"
                        >
                          <TableCell className="font-medium text-xs text-foreground py-2.5 px-3">
                            {user.nome}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground py-2.5 px-3">
                            {user.email}
                          </TableCell>
                          <TableCell className="text-xs text-foreground py-2.5 px-3 font-medium">
                            {user.funcao || '-'}
                          </TableCell>
                          <TableCell className="py-2.5 px-3">
                            <Badge
                              variant={user.status ? 'default' : 'secondary'}
                              className={cn(
                                'text-[11px] font-medium h-5 px-2',
                                user.status
                                  ? 'bg-emerald-600 hover:bg-emerald-600 text-white dark:bg-emerald-700'
                                  : 'bg-muted text-muted-foreground hover:bg-muted',
                              )}
                            >
                              {user.status ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right py-2.5 px-3 space-x-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md"
                              onClick={() => openEdit(user)}
                              title="Editar usuário"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md"
                              onClick={() => setUserToDelete(user)}
                              disabled={user.email === 'admin@bender.com'}
                              title={
                                user.email === 'admin@bender.com'
                                  ? 'Super Admin não pode ser deletado'
                                  : 'Deletar'
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="md:hidden flex flex-col gap-2.5">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className="flex flex-col gap-2 p-3.5 rounded-lg border border-border bg-card shadow-xs"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="overflow-hidden">
                          <h3 className="font-semibold text-foreground text-sm truncate">
                            {user.nome}
                          </h3>
                          <p className="text-muted-foreground text-xs truncate">{user.email}</p>
                        </div>
                        <Badge
                          variant={user.status ? 'default' : 'secondary'}
                          className={cn(
                            'shrink-0 text-[10px] font-medium h-5 px-2',
                            user.status
                              ? 'bg-emerald-600 text-white'
                              : 'bg-muted text-muted-foreground',
                          )}
                        >
                          {user.status ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center mt-1 pt-2 border-t border-border">
                        <span className="text-xs text-foreground font-medium">
                          {user.funcao || '-'}
                        </span>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md"
                            onClick={() => openEdit(user)}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md"
                            onClick={() => setUserToDelete(user)}
                            disabled={user.email === 'admin@bender.com'}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {!loading && totalPages > 1 && (
              <div className="mt-4 flex justify-end">
                <Pagination>
                  <PaginationContent className="gap-1">
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        className={cn(
                          'h-8 text-xs border border-border text-foreground hover:bg-muted rounded-md',
                          page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer',
                        )}
                      />
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationLink className="h-8 min-w-[32px] px-2 text-xs border border-border bg-card text-foreground rounded-md font-medium">
                        {page} de {totalPages}
                      </PaginationLink>
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        className={cn(
                          'h-8 text-xs border border-border text-foreground hover:bg-muted rounded-md',
                          page >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer',
                        )}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}

            <UserFormModal
              isOpen={isFormOpen}
              onClose={() => setIsFormOpen(false)}
              user={selectedUser}
              onSuccess={handleFormSuccess}
            />

            <AlertDialog
              open={!!userToDelete}
              onOpenChange={(open) => !open && setUserToDelete(null)}
            >
              <AlertDialogContent className="bg-card border border-border shadow-lg max-w-md">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-foreground text-lg font-bold">
                    Tem certeza que deseja deletar {userToDelete?.nome}?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-muted-foreground text-sm">
                    Esta ação não pode ser desfeita. O usuário será removido permanentemente do
                    sistema e perderá todos os acessos.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-2 mt-4 pt-4 border-t border-border">
                  <AlertDialogCancel className="h-8 text-xs border-border text-foreground hover:bg-muted rounded-md">
                    Cancelar
                  </AlertDialogCancel>
                  <AlertDialogAction
                    className="h-8 text-xs bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-md"
                    onClick={() => userToDelete && handleDelete(userToDelete.id)}
                  >
                    Deletar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </TabsContent>
          <TabsContent value="matriz" className="flex-1 overflow-y-auto min-h-0 m-0 p-4">
            <PermissionsMatrix />
          </TabsContent>
        </Tabs>
      </div>
    </HasPermission>
  )
}
