import { useState, useEffect } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'
import { AppUser } from '@/types/user'
import { cn } from '@/lib/utils'

const MODULES = [
  'Dashboard',
  'Comercial',
  'Área de Clientes',
  'Análise Técnica',
  'Produção',
  'Montagem',
  'Estoque & Compras',
  'Financeiro',
  'Usuários',
  'Administrativo',
]
const LEVELS = ['Sem Acesso', 'Leitor', 'Editor', 'Admin']

export function PermissionsMatrix() {
  const [users, setUsers] = useState<AppUser[]>([])
  const [matrix, setMatrix] = useState<Record<string, Record<string, string>>>({})
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data: usersData } = await supabase.from('users').select('*').order('nome')
      const { data: permsData } = await supabase.from('matriz_permissoes').select('*')

      const newMatrix: Record<string, Record<string, string>> = {}
      if (usersData) {
        usersData.forEach((u) => {
          newMatrix[u.id] = {}
          MODULES.forEach((m) => (newMatrix[u.id][m] = 'Sem Acesso'))
        })
      }

      if (permsData) {
        permsData.forEach((p) => {
          if (newMatrix[p.usuario_id]) {
            newMatrix[p.usuario_id][p.modulo] = p.nivel_acesso
          }
        })
      }

      setUsers((usersData as AppUser[]) || [])
      setMatrix(newMatrix)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const updatePermission = async (userId: string, modulo: string, nivel: string) => {
    setMatrix((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], [modulo]: nivel },
    }))

    try {
      const payload = MODULES.map((m) => ({
        modulo: m,
        nivel_acesso: m === modulo ? nivel : matrix[userId][m],
      }))

      const { error } = await supabase.functions.invoke('admin-users', {
        body: { action: 'update_permissions', userId, permissionsData: payload },
      })

      if (error) throw error

      toast({
        description: 'Permissão atualizada com sucesso.',
        className: 'bg-dark-denim text-off-white border-none',
      })
    } catch (err: any) {
      toast({
        description: err.message,
        variant: 'destructive',
        className: 'bg-steel-blue text-off-white border-none',
      })
      fetchData()
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-dark-denim" />
      </div>
    )
  }

  return (
    <div className="border-2 border-steel-blue/20 rounded-xl bg-off-white overflow-x-auto shadow-sm">
      <Table className="min-w-[1400px]">
        <TableHeader className="bg-dark-denim">
          <TableRow className="hover:bg-transparent border-b-steel-blue/20">
            <TableHead className="font-bold text-off-white p-4 sticky left-0 bg-dark-denim z-10 w-[200px]">
              Usuário
            </TableHead>
            {MODULES.map((mod) => (
              <TableHead
                key={mod}
                className="font-bold text-off-white p-4 text-center min-w-[140px]"
              >
                {mod}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user, idx) => {
            const isSuperAdmin = user.email === 'admin@bender.com'
            return (
              <TableRow
                key={user.id}
                className={cn(
                  'border-b-steel-blue/20 transition-colors',
                  idx % 2 === 0 ? 'bg-off-white' : 'bg-pale-cornflower/30',
                )}
              >
                <TableCell
                  className="font-semibold text-midnight-navy p-4 sticky left-0 z-10 bg-inherit shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] truncate max-w-[200px]"
                  title={user.nome}
                >
                  {user.nome}
                  {isSuperAdmin && (
                    <span className="block text-xs text-steel-blue font-normal">Super Admin</span>
                  )}
                </TableCell>
                {MODULES.map((mod) => (
                  <TableCell key={mod} className="p-3 text-center">
                    <Select
                      value={isSuperAdmin ? 'Admin' : matrix[user.id]?.[mod] || 'Sem Acesso'}
                      onValueChange={(val) => updatePermission(user.id, mod, val)}
                      disabled={isSuperAdmin}
                    >
                      <SelectTrigger className="bg-pale-cornflower border border-steel-blue text-midnight-navy text-sm focus:ring-0 focus:border-dark-denim h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-off-white border-2 border-steel-blue">
                        {LEVELS.map((level) => (
                          <SelectItem
                            key={level}
                            value={level}
                            className="text-midnight-navy focus:bg-pale-cornflower"
                          >
                            {level}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                ))}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
