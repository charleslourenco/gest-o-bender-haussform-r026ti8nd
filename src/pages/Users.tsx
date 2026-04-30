import { useState, useEffect } from 'react'
import { Plus, Search, Edit2, Trash2, UserX, ShieldAlert } from 'lucide-react'
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
import { PermissionsModal } from '@/components/users/PermissionsModal'
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
      toast({ title: 'Usuário deletado com sucesso!' })
      setRefresh((r) => r + 1)
    } catch (err: any) {
      toast({ title: 'Erro ao deletar', description: err.message, variant: 'destructive' })
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
        <div className="flex h-full min-h-[60vh] items-center justify-center p-8 text-center">
          <div className="flex flex-col items-center gap-4 border p-8 rounded-xl bg-muted/30 max-w-md shadow-sm">
            <ShieldAlert className="h-16 w-16 text-destructive" />
            <h2 className="text-2xl font-bold tracking-tight">Acesso Negado</h2>
            <p className="text-muted-foreground">
              Você não tem permissão para acessar este módulo. Contate o administrador.
            </p>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-6 p-4 md:p-8 w-full max-w-[1400px] mx-auto animate-in fade-in duration-300">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Usuários</h1>
          <Button
            onClick={openAdd}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Usuário
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou e-mail..."
              className="pl-9 bg-background"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-[180px] bg-background">
              <SelectValue placeholder="Função" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as funções</SelectItem>
              <SelectItem value="Consultor">Consultor</SelectItem>
              <SelectItem value="Analista">Analista</SelectItem>
              <SelectItem value="Gerente">Gerente</SelectItem>
              <SelectItem value="Admin">Admin</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px] bg-background">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="inactive">Inativo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {errorState ? (
          <div className="flex flex-col items-center justify-center py-12 text-center border rounded-xl bg-destructive/10">
            <ShieldAlert className="h-12 w-12 text-destructive mb-4" />
            <h3 className="text-lg font-medium text-destructive mb-2">{errorState}</h3>
            <Button variant="outline" onClick={() => setRefresh((r) => r + 1)}>
              Tentar Novamente
            </Button>
          </div>
        ) : loading && users.length === 0 ? (
          <div className="border rounded-xl bg-background overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-48" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-16 rounded-full" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="h-8 w-16 inline-block" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border rounded-xl bg-muted/20">
            <UserX className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-medium mb-1">Nenhum usuário encontrado</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Nenhum usuário cadastrado com os filtros atuais. Clique em 'Adicionar Usuário' para
              começar.
            </p>
          </div>
        ) : (
          <div className="border rounded-xl bg-background overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-semibold">Nome</TableHead>
                  <TableHead className="font-semibold">E-mail</TableHead>
                  <TableHead className="font-semibold">Função</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="text-right font-semibold">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium">{user.nome}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>{user.funcao || '-'}</TableCell>
                    <TableCell>
                      <Badge
                        variant={user.status ? 'default' : 'secondary'}
                        className={user.status ? 'bg-primary/90 text-primary-foreground' : ''}
                      >
                        {user.status ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hover:text-primary hover:bg-primary/10"
                        onClick={() => openEdit(user)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hover:text-destructive hover:bg-destructive/10 text-muted-foreground"
                        onClick={() => setUserToDelete(user)}
                        disabled={user.email === 'admin@bender.com'}
                        title={
                          user.email === 'admin@bender.com'
                            ? 'Super Admin não pode ser deletado'
                            : 'Deletar'
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {!loading && totalPages > 1 && (
          <div className="mt-4 flex justify-end">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className={page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink className="font-medium">
                    {page} de {totalPages}
                  </PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className={
                      page >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'
                    }
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

        <PermissionsModal
          isOpen={isPermOpen}
          onClose={() => setIsPermOpen(false)}
          userId={selectedUser?.id || ''}
          userEmail={selectedUser?.email || ''}
          onSuccess={() => setRefresh((r) => r + 1)}
        />

        <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Tem certeza que deseja deletar {userToDelete?.nome}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. O usuário será removido permanentemente do sistema
                e perderá todos os acessos.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => userToDelete && handleDelete(userToDelete.id)}
              >
                Deletar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </HasPermission>
  )
}
