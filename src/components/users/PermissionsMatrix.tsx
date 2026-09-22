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
        variant: 'destructive',
        title: 'Erro ao carregar matriz',
        description: error.message,
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
      })
    } catch (error: any) {
      setPermissions((prev) => ({ ...prev, [key]: prevLevel }))
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar',
        description: error.message,
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
      <div className="space-y-3">
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-[380px] w-full rounded-lg" />
      </div>
    )
  }

  return (
    <div className="flex flex-col space-y-3 animate-in fade-in duration-300">
      <div className="flex items-center gap-2.5 p-3 bg-card border border-border rounded-lg shadow-xs">
        <ShieldAlert className="h-5 w-5 text-muted-foreground shrink-0" />
        <div>
          <h3 className="font-semibold text-foreground text-sm leading-tight">
            Matriz de Permissões
          </h3>
          <p className="text-xs text-muted-foreground">
            Configure os níveis de acesso de cada usuário por módulo. Alterações são salvas
            automaticamente.
          </p>
        </div>
      </div>

      <div className="relative border border-border rounded-lg overflow-hidden bg-card shadow-xs">
        <div
          ref={topScrollRef}
          onScroll={handleTopScroll}
          className="overflow-x-auto overflow-y-hidden bg-muted/40 custom-scrollbar-top border-b border-border"
          style={{ height: '10px' }}
        >
          <div style={{ width: contentWidth, height: '1px' }} />
        </div>

        <div
          ref={tableScrollRef}
          onScroll={handleTableScroll}
          className="overflow-auto max-h-[65vh] relative"
        >
          <table className="w-full text-xs text-left border-collapse">
            <thead className="sticky top-0 z-30 shadow-xs bg-muted/70 backdrop-blur-xs">
              <tr>
                <th className="py-2.5 px-3 font-semibold text-foreground bg-muted/90 sticky left-0 z-40 whitespace-nowrap min-w-[200px] border-b border-border border-r border-r-border shadow-[2px_0_6px_-2px_rgba(0,0,0,0.1)]">
                  Módulos
                </th>
                {users.map((user) => (
                  <th
                    key={user.id}
                    className="py-2.5 px-3 font-semibold text-foreground min-w-[170px] whitespace-nowrap border-b border-border"
                  >
                    <div className="flex flex-col">
                      <span className="truncate" title={user.nome}>
                        {user.nome}
                      </span>
                      <span
                        className="text-[11px] text-muted-foreground font-normal truncate"
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
                    'transition-colors hover:bg-muted/40 group border-b border-border',
                    idx % 2 === 0 ? 'bg-card' : 'bg-muted/15',
                  )}
                >
                  <td className="py-2.5 px-3 font-medium text-foreground bg-card group-hover:bg-muted/40 sticky left-0 z-20 whitespace-nowrap border-r border-r-border shadow-[2px_0_6px_-2px_rgba(0,0,0,0.1)]">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 group-hover:bg-foreground transition-colors" />
                      {mod}
                    </div>
                  </td>
                  {users.map((user) => {
                    const level = permissions[`${user.id}-${mod}`] || 'Nenhum'
                    const isAdmin = user.email === 'admin@bender.com'
                    return (
                      <td key={user.id} className="p-2 border-b border-border">
                        <Select
                          value={level}
                          onValueChange={(val) => updatePermission(user.id, mod, val)}
                          disabled={isAdmin}
                        >
                          <SelectTrigger
                            className={cn(
                              'w-full bg-background border border-border text-foreground text-xs focus:ring-0 focus:border-primary transition-all rounded-md h-8',
                              level === 'Admin' &&
                                'border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
                              level === 'Editor' &&
                                'border-sky-500/50 bg-sky-500/10 text-sky-700 dark:text-sky-400',
                              level === 'Leitor' &&
                                'border-border bg-muted/40 text-muted-foreground',
                              isAdmin && 'opacity-50 cursor-not-allowed',
                            )}
                          >
                            <div className="flex items-center gap-1.5 truncate">
                              {getLevelIcon(level)}
                              <SelectValue placeholder="Nenhum" />
                            </div>
                          </SelectTrigger>
                          <SelectContent className="bg-popover border-border">
                            <SelectItem value="Nenhum" className="text-xs">
                              <div className="flex items-center gap-2">
                                <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                                Nenhum
                              </div>
                            </SelectItem>
                            <SelectItem value="Leitor" className="text-xs">
                              <div className="flex items-center gap-2">
                                <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                                Leitor
                              </div>
                            </SelectItem>
                            <SelectItem value="Editor" className="text-xs">
                              <div className="flex items-center gap-2">
                                <Edit2 className="h-3.5 w-3.5 text-sky-500" />
                                Editor
                              </div>
                            </SelectItem>
                            <SelectItem value="Admin" className="text-xs">
                              <div className="flex items-center gap-2">
                                <Key className="h-3.5 w-3.5 text-emerald-500" />
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
