import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
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
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { AppUser } from '@/types/user'
import { cn } from '@/lib/utils'

const MODULES = [
  'Dashboard',
  'Comercial',
  'Criar Orçamento',
  'Clientes',
  'Análise Técnica',
  'Produção',
  'Criar Lista de Materiais',
  'Montagem',
  'Estoque & Compras',
  'Financeiro',
  'Gestão de Pessoas',
  'Usuários',
  'Administrativo',
]

export function PermissionsMatrix() {
  const [users, setUsers] = useState<AppUser[]>([])
  const [permissions, setPermissions] = useState<Record<string, Record<string, string>>>({})
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data: usersData } = await supabase
        .from('users')
        .select('*')
        .eq('status', true)
        .order('nome')
      const { data: permsData } = await supabase.from('matriz_permissoes').select('*')

      const permsMap: Record<string, Record<string, string>> = {}
      if (usersData) {
        usersData.forEach((u) => {
          permsMap[u.id] = {}
          MODULES.forEach((m) => {
            permsMap[u.id][m] = 'Sem Acesso'
          })
        })
      }

      if (permsData) {
        permsData.forEach((p) => {
          if (permsMap[p.usuario_id]) {
            permsMap[p.usuario_id][p.modulo] = p.nivel_acesso
          }
        })
      }

      setUsers(usersData || [])
      setPermissions(permsMap)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handlePermissionChange = async (userId: string, modulo: string, nivel: string) => {
    const previousLevel = permissions[userId]?.[modulo]

    setPermissions((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], [modulo]: nivel },
    }))

    try {
      const permissionsData = Object.entries({ ...permissions[userId], [modulo]: nivel })
        .filter(([_, level]) => level !== 'Sem Acesso')
        .map(([mod, level]) => ({ modulo: mod, nivel_acesso: level }))

      const { error } = await supabase.functions.invoke('admin-users', {
        body: { action: 'update_permissions', userId, permissionsData },
      })

      if (error) throw error

      toast({
        title: 'Permissão atualizada com sucesso',
        className: 'bg-dark-denim text-off-white',
      })
    } catch (error: any) {
      setPermissions((prev) => ({
        ...prev,
        [userId]: { ...prev[userId], [modulo]: previousLevel || 'Sem Acesso' },
      }))
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' })
    }
  }

  if (loading) {
    return (
      <div className="border border-steel-blue/20 rounded-xl bg-off-white overflow-hidden shadow-sm p-4">
        <Skeleton className="w-full h-12 mb-4" />
        <Skeleton className="w-full h-12 mb-4" />
        <Skeleton className="w-full h-12 mb-4" />
        <Skeleton className="w-full h-12 mb-4" />
      </div>
    )
  }

  return (
    <div className="border border-steel-blue/20 rounded-xl bg-off-white overflow-hidden shadow-sm overflow-x-auto">
      <Table>
        <TableHeader className="bg-dark-denim">
          <TableRow className="hover:bg-transparent border-b-steel-blue/20">
            <TableHead className="text-off-white font-semibold sticky left-0 bg-dark-denim z-10 p-4 shadow-[1px_0_0_0_rgba(255,255,255,0.1)]">
              Módulo / Usuário
            </TableHead>
            {users.map((user) => (
              <TableHead
                key={user.id}
                className="text-off-white font-semibold text-center whitespace-nowrap p-4"
              >
                {user.nome}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {MODULES.map((modulo, idx) => (
            <TableRow
              key={modulo}
              className={cn(
                'border-b-steel-blue/20 hover:bg-pale-cornflower/30 transition-colors',
                idx % 2 === 0 ? 'bg-off-white' : 'bg-pale-cornflower/10',
              )}
            >
              <TableCell className="font-medium sticky left-0 z-10 border-r border-steel-blue/20 p-4 whitespace-nowrap text-midnight-navy shadow-[1px_0_0_0_rgba(119,144,185,0.2)] bg-inherit">
                {modulo}
              </TableCell>
              {users.map((user) => (
                <TableCell key={`${modulo}-${user.id}`} className="p-3 min-w-[150px] text-center">
                  <Select
                    value={permissions[user.id]?.[modulo] || 'Sem Acesso'}
                    onValueChange={(val) => handlePermissionChange(user.id, modulo, val)}
                  >
                    <SelectTrigger className="h-10 bg-pale-cornflower/30 border border-steel-blue/30 text-midnight-navy focus:ring-0 focus:border-dark-denim focus:border-2 transition-all">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-steel-blue bg-off-white">
                      <SelectItem
                        value="Sem Acesso"
                        className="focus:bg-pale-cornflower focus:text-midnight-navy"
                      >
                        Sem Acesso
                      </SelectItem>
                      <SelectItem
                        value="Leitor"
                        className="focus:bg-pale-cornflower focus:text-midnight-navy"
                      >
                        Leitor
                      </SelectItem>
                      <SelectItem
                        value="Editor"
                        className="focus:bg-pale-cornflower focus:text-midnight-navy"
                      >
                        Editor
                      </SelectItem>
                      <SelectItem
                        value="Admin"
                        className="focus:bg-pale-cornflower focus:text-midnight-navy"
                      >
                        Admin
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
