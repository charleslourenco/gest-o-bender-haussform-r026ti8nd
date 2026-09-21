import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ShieldAlert, Shield, Eye, Edit2, Key } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AppUser } from '@/types/user'

const MODULES = [
  'Dashboard',
  'Comercial',
  'Área de Clientes',
  'Planejamento e Programação de Operações',
  'Análise Técnica',
  'Produção',
  'Montagem',
  'Acompanhamentos',
  'Estoque & Compras',
  'Financeiro',
  'Gestão de Pessoas',
  'Usuários',
]

export function PermissionsMatrix() {
  const { toast } = useToast()
  const [users, setUsers] = useState<AppUser[]>([])
  const [permissions, setPermissions] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  const topScrollRef = useRef<HTMLDivElement>(null)
  const tableScrollRef = useRef<HTMLDivElement>(null)
  const [contentWidth, setContentWidth] = useState(0)

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    const tableContainer = tableScrollRef.current
    const table = tableContainer?.querySelector('table')

    if (!tableContainer || !table) return

    const updateWidth = () => {
      setContentWidth(table.scrollWidth)
    }

    const observer = new ResizeObserver(updateWidth)
    observer.observe(tableContainer)
    observer.observe(table)

    updateWidth()

    return () => observer.disconnect()
  }, [users, loading])

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .eq('status', true)
        .order('nome')
      if (usersError) throw usersError

      const { data: permsData, error: permsError } = await supabase
        .from('matriz_permissoes')
        .select('*')
      if (permsError) throw permsError

      setUsers(usersData as AppUser[])

      const permsMap: Record<string, string> = {}
      permsData.forEach((p) => {
        permsMap[`${p.usuario_id}-${p.modulo}`] = p.nivel_acesso
      })
      setPermissions(permsMap)
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar matriz',
        description: error.message,
        className: 'bg-steel-blue text-off-white border-none',
      })
    } finally {
      setLoading(false)
    }
  }

  const updatePermission = async (userId: string, mod: string, level: string) => {
    const key = `${userId}-${mod}`
    const prevLevel = permissions[key] || 'Nenhum'

    if (prevLevel === level) return

    setPermissions((prev) => ({ ...prev, [key]: level }))

    try {
      const user = users.find((u) => u.id === userId)
      if (user?.email === 'admin@bender.com') {
        throw new Error('Permissões do Super Admin não podem ser alteradas.')
      }

      if (level === 'Nenhum') {
        const { error } = await supabase
          .from('matriz_permissoes')
          .delete()
          .eq('usuario_id', userId)
          .eq('modulo', mod)
        if (error) throw error
      } else {
        const { data: existing, error: findError } = await supabase
          .from('matriz_permissoes')
          .select('id')
          .eq('usuario_id', userId)
          .eq('modulo', mod)
          .maybeSingle()

        if (findError) throw findError

        if (existing) {
          const { error: updateError } = await supabase
            .from('matriz_permissoes')
            .update({ nivel_acesso: level })
            .eq('id', existing.id)
          if (updateError) throw updateError
        } else {
          const { error: insertError } = await supabase.from('matriz_permissoes').insert({
            usuario_id: userId,
            modulo: mod,
            nivel_acesso: level,
          })
          if (insertError) throw insertError
        }
      }

      toast({
        title: 'Permissão atualizada',
        description: `${user?.nome} -> ${mod}: ${level}`,
        className: 'bg-dark-denim text-off-white border-none',
      })
    } catch (error: any) {
      setPermissions((prev) => ({ ...prev, [key]: prevLevel }))
      toast({
        title: 'Erro ao atualizar',
        description: error.message,
        className: 'bg-steel-blue text-off-white border-none',
      })
    }
  }

  const handleTopScroll = () => {
    if (tableScrollRef.current && topScrollRef.current) {
      tableScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft
    }
  }

  const handleTableScroll = () => {
    if (topScrollRef.current && tableScrollRef.current) {
      topScrollRef.current.scrollLeft = tableScrollRef.current.scrollLeft
    }
  }

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'Admin':
        return <Key className="h-4 w-4 text-emerald-400" />
      case 'Editor':
        return <Edit2 className="h-4 w-4 text-sky-400" />
      case 'Leitor':
        return <Eye className="h-4 w-4 text-slate-400" />
      default:
        return <Shield className="h-4 w-4 text-slate-400" />
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[40px] w-full bg-dark-denim/40" />
        <Skeleton className="h-[400px] w-full bg-dark-denim/40" />
      </div>
    )
  }

  return (
    <div className="flex flex-col space-y-2 animate-in fade-in duration-300">
      <div className="flex items-center gap-2 mb-2 p-4 bg-midnight-navy rounded-xl">
        <ShieldAlert className="h-6 w-6 text-off-white" />
        <div>
          <h3 className="font-bold text-off-white text-lg">Matriz de Permissões</h3>
          <p className="text-sm text-off-white/70">
            Configure os níveis de acesso de cada usuário por módulo. Alterações são salvas
            automaticamente.
          </p>
        </div>
      </div>

      <div className="relative">
        <div
          ref={topScrollRef}
          onScroll={handleTopScroll}
          className="overflow-x-auto overflow-y-hidden rounded-t-xl bg-midnight-navy/50 custom-scrollbar-top"
          style={{ height: '12px' }}
        >
          <div style={{ width: contentWidth, height: '1px' }} />
        </div>

        <div
          ref={tableScrollRef}
          onScroll={handleTableScroll}
          className="overflow-auto rounded-b-xl bg-midnight-navy max-h-[65vh] relative"
        >
          <table className="w-full text-sm text-left border-collapse">
            <thead className="sticky top-0 z-30 shadow-sm bg-dark-denim">
              <tr>
                <th className="p-4 font-bold text-off-white bg-dark-denim sticky left-0 z-40 shadow-[4px_0_12px_-4px_rgba(0,0,0,0.4)] whitespace-nowrap min-w-[200px] border-b border-steel-blue/40 border-r border-r-steel-blue/30">
                  Módulos
                </th>
                {users.map((user) => (
                  <th
                    key={user.id}
                    className="p-4 font-semibold text-off-white bg-dark-denim min-w-[180px] whitespace-nowrap border-b border-steel-blue/40"
                  >
                    <div className="flex flex-col">
                      <span className="truncate" title={user.nome}>
                        {user.nome}
                      </span>
                      <span
                        className="text-xs text-off-white/50 font-normal truncate"
                        title={user.email}
                      >
                        {user.email}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MODULES.map((mod, idx) => (
                <tr
                  key={mod}
                  className={cn(
                    'transition-colors hover:bg-dark-denim/50 group',
                    idx % 2 === 0 ? 'bg-midnight-navy' : 'bg-dark-denim/30',
                  )}
                >
                  <td className="p-4 font-semibold text-off-white bg-steel-blue sticky left-0 z-20 shadow-[4px_0_12px_-4px_rgba(0,0,0,0.4)] whitespace-nowrap border-b border-steel-blue/20 border-r border-r-steel-blue/50">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-off-white/50 group-hover:bg-off-white transition-colors" />
                      {mod}
                    </div>
                  </td>
                  {users.map((user) => {
                    const level = permissions[`${user.id}-${mod}`] || 'Nenhum'
                    const isAdmin = user.email === 'admin@bender.com'
                    return (
                      <td key={user.id} className="p-4 border-b border-steel-blue/10">
                        <Select
                          value={level}
                          onValueChange={(val) => updatePermission(user.id, mod, val)}
                          disabled={isAdmin}
                        >
                          <SelectTrigger
                            className={cn(
                              'w-full bg-dark-denim border-2 border-steel-blue/30 text-off-white focus:ring-0 focus:border-dark-denim transition-all rounded-lg h-10',
                              level === 'Admin' && 'border-emerald-500/50 bg-emerald-500/10',
                              level === 'Editor' && 'border-sky-500/50 bg-sky-500/10',
                              level === 'Leitor' && 'border-slate-400/50 bg-slate-400/10',
                              isAdmin && 'opacity-50 cursor-not-allowed',
                            )}
                          >
                            <div className="flex items-center gap-2">
                              {getLevelIcon(level)}
                              <SelectValue placeholder="Nenhum" />
                            </div>
                          </SelectTrigger>
                          <SelectContent className="bg-dark-denim border-2 border-steel-blue/40">
                            <SelectItem
                              value="Nenhum"
                              className="focus:bg-midnight-navy focus:text-off-white text-off-white"
                            >
                              <div className="flex items-center gap-2">
                                <Shield className="h-4 w-4 text-slate-400" />
                                Nenhum
                              </div>
                            </SelectItem>
                            <SelectItem
                              value="Leitor"
                              className="focus:bg-midnight-navy focus:text-off-white text-off-white"
                            >
                              <div className="flex items-center gap-2">
                                <Eye className="h-4 w-4 text-slate-400" />
                                Leitor
                              </div>
                            </SelectItem>
                            <SelectItem
                              value="Editor"
                              className="focus:bg-midnight-navy focus:text-off-white text-off-white"
                            >
                              <div className="flex items-center gap-2">
                                <Edit2 className="h-4 w-4 text-sky-400" />
                                Editor
                              </div>
                            </SelectItem>
                            <SelectItem
                              value="Admin"
                              className="focus:bg-midnight-navy focus:text-off-white text-off-white"
                            >
                              <div className="flex items-center gap-2">
                                <Key className="h-4 w-4 text-emerald-400" />
                                Admin
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
