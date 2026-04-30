import { useState, useEffect } from 'react'
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  UserX,
  ShieldAlert,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
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
        title: (
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-off-white" />
            <span>Usuário deletado com sucesso!</span>
          </div>
        ),
        className: 'bg-dark-denim text-off-white border-none',
      })
      setRefresh((r) => r + 1)
    } catch (err: any) {
      toast({
        title: (
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-off-white" />
            <span>Erro ao deletar</span>
          </div>
        ),
        description: err.message,
        className: 'bg-steel-blue text-off-white border-none',
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
        <div className="flex h-full min-h-[60vh] items-center justify-center p-8 text-center bg-pale-cornflower/20">
          <div className="flex flex-col items-center gap-4 border-2 border-steel-blue/20 p-8 rounded-xl bg-off-white max-w-md shadow-sm">
            <ShieldAlert className="h-16 w-16 text-steel-blue" />
            <h2 className="text-2xl font-bold tracking-tight text-midnight-navy">Acesso Negado</h2>
            <p className="text-midnight-navy/70 font-medium">
              Você não tem permissão para acessar este módulo. Contate o administrador.
            </p>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-6 p-4 md:p-8 w-full max-w-[1400px] mx-auto animate-in fade-in duration-300">
        <Tabs defaultValue="lista" className="w-full space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-midnight-navy p-6 rounded-xl shadow-sm">
            <h1 className="text-[32px] font-bold tracking-tight text-off-white">Usuários</h1>
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <TabsList className="bg-dark-denim border-none p-1 rounded-lg">
                <TabsTrigger value="lista" className="data-[state=active]:bg-pale-cornflower data-[state=active]:text-midnight-navy text-off-white rounded-md">
                  Lista
                </TabsTrigger>
                <TabsTrigger value="matriz" className="data-[state=active]:bg-pale-cornflower data-[state=active]:text-midnight-navy text-off-white rounded-md">
                  Permissões
                </TabsTrigger>
              </TabsList>
              <Button
                onClick={openAdd}
                className="bg-steel-blue text-off-white hover:opacity-90 hover:bg-steel-blue px-6 py-3 h-auto min-h-[44px] rounded-lg transition-all whitespace-nowrap"
              >
                <Plus className="mr-2 h-5 w-5" />
                Adicionar Usuário
              </Button>
            </div>
          </div>

          <TabsContent value="lista" className="space-y-6 m-0">
            <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-steel-blue" />
            <Input
              placeholder="Buscar por nome ou e-mail..."
              className="pl-10 bg-pale-cornflower border-2 border-steel-blue text-midnight-navy text-base min-h-[44px] focus-visible:border-dark-denim focus-visible:border-[3px] focus-visible:ring-0 placeholder:text-midnight-navy/60 transition-all rounded-lg"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-[200px] bg-pale-cornflower border-2 border-steel-blue text-midnight-navy text-base min-h-[44px] focus:border-dark-denim focus:border-[3px] focus:ring-0 transition-all rounded-lg">
              <SelectValue placeholder="Função" />
            </SelectTrigger>
            <SelectContent className="bg-off-white border-2 border-steel-blue">
              <SelectItem
                value="all"
                className="focus:bg-pale-cornflower focus:text-midnight-navy text-base"
              >
                Todas as funções
              </SelectItem>
              <SelectItem
                value="Consultor"
                className="focus:bg-pale-cornflower focus:text-midnight-navy text-base"
              >
                Consultor
              </SelectItem>
              <SelectItem
                value="Analista"
                className="focus:bg-pale-cornflower focus:text-midnight-navy text-base"
              >
                Analista
              </SelectItem>
              <SelectItem
                value="Gerente"
                className="focus:bg-pale-cornflower focus:text-midnight-navy text-base"
              >
                Gerente
              </SelectItem>
              <SelectItem
                value="Admin"
                className="focus:bg-pale-cornflower focus:text-midnight-navy text-base"
              >
                Admin
              </SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[200px] bg-pale-cornflower border-2 border-steel-blue text-midnight-navy text-base min-h-[44px] focus:border-dark-denim focus:border-[3px] focus:ring-0 transition-all rounded-lg">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-off-white border-2 border-steel-blue">
              <SelectItem
                value="all"
                className="focus:bg-pale-cornflower focus:text-midnight-navy text-base"
              >
                Todos os status
              </SelectItem>
              <SelectItem
                value="active"
                className="focus:bg-pale-cornflower focus:text-midnight-navy text-base"
              >
                Ativo
              </SelectItem>
              <SelectItem
                value="inactive"
                className="focus:bg-pale-cornflower focus:text-midnight-navy text-base"
              >
                Inativo
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {errorState ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border border-steel-blue/20 rounded-xl bg-off-white shadow-sm">
            <ShieldAlert className="h-16 w-16 text-steel-blue mb-6" />
            <h3 className="text-2xl font-bold text-midnight-navy mb-4">{errorState}</h3>
            <Button
              className="bg-dark-denim text-off-white hover:opacity-90 hover:bg-dark-denim px-6 py-3 h-auto min-h-[44px] rounded-lg"
              onClick={() => setRefresh((r) => r + 1)}
            >
              Tentar Novamente
            </Button>
          </div>
        ) : loading && users.length === 0 ? (
          <>
            <div className="hidden md:block border border-steel-blue/20 rounded-xl bg-off-white overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-dark-denim">
                  <TableRow className="hover:bg-transparent border-b-steel-blue/20">
                    <TableHead className="font-semibold text-off-white p-4">Nome</TableHead>
                    <TableHead className="font-semibold text-off-white p-4">E-mail</TableHead>
                    <TableHead className="font-semibold text-off-white p-4">Função</TableHead>
                    <TableHead className="font-semibold text-off-white p-4">Status</TableHead>
                    <TableHead className="text-right font-semibold text-off-white p-4">
                      Ações
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...Array(5)].map((_, i) => (
                    <TableRow
                      key={i}
                      className={cn(
                        'border-b-steel-blue/20',
                        i % 2 === 0 ? 'bg-off-white' : 'bg-pale-cornflower/30',
                      )}
                    >
                      <TableCell className="p-4">
                        <Skeleton className="h-6 w-48 bg-steel-blue/20" />
                      </TableCell>
                      <TableCell className="p-4">
                        <Skeleton className="h-6 w-56 bg-steel-blue/20" />
                      </TableCell>
                      <TableCell className="p-4">
                        <Skeleton className="h-6 w-24 bg-steel-blue/20" />
                      </TableCell>
                      <TableCell className="p-4">
                        <Skeleton className="h-8 w-20 rounded-full bg-steel-blue/20" />
                      </TableCell>
                      <TableCell className="text-right p-4">
                        <Skeleton className="h-10 w-24 inline-block bg-steel-blue/20 rounded-lg" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="md:hidden flex flex-col gap-4">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex flex-col gap-3 p-4 rounded-xl border border-steel-blue/20 shadow-sm',
                    i % 2 === 0 ? 'bg-off-white' : 'bg-pale-cornflower/30',
                  )}
                >
                  <Skeleton className="h-6 w-3/4 bg-steel-blue/20" />
                  <Skeleton className="h-4 w-1/2 bg-steel-blue/20" />
                  <div className="mt-2 pt-3 border-t border-steel-blue/20 flex justify-between">
                    <Skeleton className="h-6 w-24 bg-steel-blue/20" />
                    <Skeleton className="h-8 w-20 rounded-full bg-steel-blue/20" />
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center border border-steel-blue/20 rounded-xl bg-off-white shadow-sm">
            <UserX className="h-20 w-20 text-steel-blue mb-6 opacity-50" />
            <h3 className="text-2xl font-bold text-midnight-navy mb-2">
              Nenhum usuário cadastrado
            </h3>
            <p className="text-base text-midnight-navy/70 max-w-md">
              Clique em 'Adicionar Usuário' para começar.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden md:block border border-steel-blue/20 rounded-xl bg-off-white overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-dark-denim">
                  <TableRow className="hover:bg-transparent border-b-steel-blue/20">
                    <TableHead className="font-semibold text-off-white p-4">Nome</TableHead>
                    <TableHead className="font-semibold text-off-white p-4">E-mail</TableHead>
                    <TableHead className="font-semibold text-off-white p-4">Função</TableHead>
                    <TableHead className="font-semibold text-off-white p-4">Status</TableHead>
                    <TableHead className="text-right font-semibold text-off-white p-4">
                      Ações
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user, idx) => (
                    <TableRow
                      key={user.id}
                      className={cn(
                        'transition-colors border-b-steel-blue/20 hover:bg-pale-cornflower/40',
                        idx % 2 === 0 ? 'bg-off-white' : 'bg-pale-cornflower/30',
                      )}
                    >
                      <TableCell className="font-medium text-midnight-navy p-4">
                        {user.nome}
                      </TableCell>
                      <TableCell className="text-midnight-navy/80 p-4">{user.email}</TableCell>
                      <TableCell className="text-midnight-navy p-4 font-medium">
                        {user.funcao || '-'}
                      </TableCell>
                      <TableCell className="p-4">
                        <Badge
                          variant="outline"
                          className={cn(
                            'border-none text-sm font-semibold',
                            user.status
                              ? 'bg-dark-denim text-off-white'
                              : 'bg-steel-blue text-off-white',
                          )}
                        >
                          {user.status ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right p-4 space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-steel-blue hover:text-dark-denim hover:bg-pale-cornflower/50 min-h-[44px] min-w-[44px] rounded-lg transition-colors"
                          onClick={() => openEdit(user)}
                        >
                          <Edit2 className="h-5 w-5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-steel-blue hover:text-midnight-navy hover:bg-pale-cornflower min-h-[44px] min-w-[44px] rounded-lg transition-colors"
                          onClick={() => setUserToDelete(user)}
                          disabled={user.email === 'admin@bender.com'}
                          title={
                            user.email === 'admin@bender.com'
                              ? 'Super Admin não pode ser deletado'
                              : 'Deletar'
                          }
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="md:hidden flex flex-col gap-4">
              {users.map((user, idx) => (
                <div
                  key={user.id}
                  className={cn(
                    'flex flex-col gap-3 p-4 rounded-xl border border-steel-blue/20 shadow-sm',
                    idx % 2 === 0 ? 'bg-off-white' : 'bg-pale-cornflower/30',
                  )}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="overflow-hidden">
                      <h3 className="font-bold text-midnight-navy text-lg truncate">{user.nome}</h3>
                      <p className="text-midnight-navy/70 text-sm truncate">{user.email}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        'shrink-0 border-none',
                        user.status
                          ? 'bg-dark-denim text-off-white'
                          : 'bg-steel-blue text-off-white',
                      )}
                    >
                      {user.status ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center mt-2 pt-3 border-t border-steel-blue/20">
                    <span className="text-midnight-navy font-semibold">{user.funcao || '-'}</span>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-steel-blue hover:text-dark-denim hover:bg-pale-cornflower/50 min-h-[44px] min-w-[44px] rounded-lg"
                        onClick={() => openEdit(user)}
                      >
                        <Edit2 className="h-5 w-5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-steel-blue hover:text-midnight-navy hover:bg-pale-cornflower min-h-[44px] min-w-[44px] rounded-lg"
                        onClick={() => setUserToDelete(user)}
                        disabled={user.email === 'admin@bender.com'}
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {!loading && totalPages > 1 && (
          <div className="mt-6 flex justify-end">
            <Pagination>
              <PaginationContent className="gap-2">
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className={cn(
                      'min-h-[44px] border border-steel-blue/50 text-midnight-navy hover:bg-pale-cornflower/50 rounded-lg',
                      page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer',
                    )}
                  />
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink className="min-h-[44px] min-w-[44px] border border-dark-denim bg-dark-denim text-off-white rounded-lg font-medium hover:bg-dark-denim/90 hover:opacity-90 hover:text-off-white">
                    {page} de {totalPages}
                  </PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className={cn(
                      'min-h-[44px] border border-steel-blue/50 text-midnight-navy hover:bg-pale-cornflower/50 rounded-lg',
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

        <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
          <AlertDialogContent
            className="bg-off-white border-none shadow-xl"
            overlayClassName="bg-midnight-navy/50"
          >
            <AlertDialogHeader>
              <AlertDialogTitle className="text-midnight-navy text-[24px] font-bold">
                Tem certeza que deseja deletar {userToDelete?.nome}?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-midnight-navy/80 text-base">
                Esta ação não pode ser desfeita. O usuário será removido permanentemente do sistema
                e perderá todos os acessos.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-4 mt-6 border-t border-steel-blue/20 pt-6">
              <AlertDialogCancel className="bg-steel-blue text-off-white hover:bg-steel-blue hover:opacity-90 hover:text-off-white px-6 py-3 h-auto min-h-[44px] border-none rounded-lg mt-0">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-dark-denim text-off-white hover:opacity-90 hover:bg-dark-denim px-6 py-3 h-auto min-h-[44px] rounded-lg border-none"
                onClick={() => userToDelete && handleDelete(userToDelete.id)}
              >
                Deletar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
            </div>
          </TabsContent>
          <TabsContent value="matriz" className="m-0">
            <PermissionsMatrix />
          </TabsContent>
        </Tabs>
      </div>
    </HasPermission>
  )
}
