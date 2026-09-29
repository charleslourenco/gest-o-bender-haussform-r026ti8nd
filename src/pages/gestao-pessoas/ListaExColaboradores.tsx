import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Search,
  UserX,
  ShieldAlert,
  Briefcase,
  HelpCircle,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { AppUser } from '@/types/user'

interface ExColaboradorItem extends AppUser {
  leadsCount: number
}

export function ListaExColaboradores() {
  const { toast } = useToast()
  const { isAdmin, permissions } = useAuth()
  const canManage =
    isAdmin || permissions['Gestão de Pessoas'] === 'Admin' || permissions['Usuários'] === 'Admin'

  const [users, setUsers] = useState<ExColaboradorItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [filterMode, setFilterMode] = useState<'all' | 'consultores' | 'com_leads'>('all')

  const fetchData = async () => {
    setLoading(true)
    try {
      // 1. Buscar usuários com status=false OU ex_colaborador=true
      const { data: usersData, error: usersErr } = await supabase
        .from('users')
        .select('*')
        .or('status.eq.false,ex_colaborador.eq.true')
        .order('nome', { ascending: true })

      if (usersErr) throw usersErr

      // 2. Contar leads por consultor_id (para histórico/contexto)
      const { data: leadsData, error: leadsErr } = await supabase
        .from('leads')
        .select('consultor_id')
        .not('consultor_id', 'is', null)

      if (leadsErr) {
        console.warn('Erro ao buscar leads para contagem de ex-colaboradores:', leadsErr)
      }

      const countsMap: Record<string, number> = {}
      if (Array.isArray(leadsData)) {
        leadsData.forEach((l) => {
          if (l.consultor_id) {
            countsMap[l.consultor_id] = (countsMap[l.consultor_id] || 0) + 1
          }
        })
      }

      const merged: ExColaboradorItem[] = (usersData || []).map((u: any) => ({
        ...u,
        eh_consultor: Boolean(u.eh_consultor),
        ex_colaborador: Boolean(u.ex_colaborador),
        leadsCount: countsMap[u.id] || 0,
      }))

      setUsers(merged)
    } catch (err: any) {
      console.error('Erro ao carregar ex-colaboradores:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar ex-colaboradores',
        description: err.message,
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Toggle eh_consultor
  const handleToggleConsultor = async (user: ExColaboradorItem, nextValue: boolean) => {
    if (!canManage) {
      toast({
        variant: 'destructive',
        title: 'Ação restrita a Administrador',
        description: 'Você precisa de perfil Administrador para alterar a função de Consultor.',
      })
      return
    }

    setUpdatingId(`consultor-${user.id}`)
    setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, eh_consultor: nextValue } : u)))

    try {
      const { error } = await supabase
        .from('users')
        .update({
          eh_consultor: nextValue,
          atualizado_em: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (error) throw error

      toast({
        title: nextValue ? 'Elegível como Consultor' : 'Consultor desmarcado',
        description: `${user.nome} ${
          nextValue
            ? 'agora aparecerá como "' + user.nome + ' (Ex Colaborador)" nos dropdowns do CRM.'
            : 'não será mais listado nos seletores de novos atendimentos.'
        }`,
      })
    } catch (err: any) {
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, eh_consultor: !nextValue } : u)),
      )
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar',
        description: err.message,
      })
    } finally {
      setUpdatingId(null)
    }
  }

  // Toggle ex_colaborador
  const handleToggleExColaborador = async (user: ExColaboradorItem, nextValue: boolean) => {
    if (!canManage) {
      toast({
        variant: 'destructive',
        title: 'Ação restrita a Administrador',
        description:
          'Você precisa de perfil Administrador para alterar o status de Ex Colaborador.',
      })
      return
    }

    setUpdatingId(`ex-${user.id}`)
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, ex_colaborador: nextValue } : u)),
    )

    try {
      const { error } = await supabase
        .from('users')
        .update({
          ex_colaborador: nextValue,
          atualizado_em: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (error) throw error

      toast({
        title: nextValue ? 'Marcado como Ex Colaborador' : 'Desmarcado de Ex Colaborador',
        description: `${user.nome} ${
          nextValue
            ? 'foi classificado como ex-colaborador no sistema.'
            : 'não está mais marcado como ex-colaborador.'
        }`,
      })
    } catch (err: any) {
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, ex_colaborador: !nextValue } : u)),
      )
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar',
        description: err.message,
      })
    } finally {
      setUpdatingId(null)
    }
  }

  // Estatísticas
  const totalExColaboradores = useMemo(() => {
    return users.filter((u) => Boolean(u.ex_colaborador)).length
  }, [users])

  const totalConsultoresEx = useMemo(() => {
    return users.filter((u) => Boolean(u.eh_consultor)).length
  }, [users])

  // Filtragem
  const filteredUsers = useMemo(() => {
    let list = users

    if (filterMode === 'consultores') {
      list = list.filter((u) => Boolean(u.eh_consultor))
    } else if (filterMode === 'com_leads') {
      list = list.filter((u) => u.leadsCount > 0)
    }

    const term = search.trim().toLowerCase()
    if (!term) return list

    return list.filter(
      (u) =>
        u.nome?.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term) ||
        u.funcao?.toLowerCase().includes(term),
    )
  }, [users, search, filterMode])

  const getInitials = (name?: string) => {
    if (!name) return 'U'
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  return (
    <div className="flex flex-col h-full bg-card rounded-xl border border-border shadow-sm p-4 gap-4">
      {/* Top Banner Informativo e Contadores */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 p-3.5 bg-muted/40 border border-border rounded-lg">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-amber-500/10 flex items-center justify-center shrink-0">
            <UserX className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-foreground text-sm leading-tight">
                Controle de Ex Colaboradores
              </h3>
              <Badge
                variant="secondary"
                className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 font-semibold text-xs"
              >
                {users.length} {users.length === 1 ? 'listado' : 'listados'}
              </Badge>
              <Badge
                variant="outline"
                className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-xs font-semibold"
              >
                {totalConsultoresEx}{' '}
                {totalConsultoresEx === 1
                  ? 'elegível como consultor'
                  : 'elegíveis como consultores'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ex-colaboradores marcados como consultores aparecerão no seletor do CRM como{' '}
              <strong className="text-foreground font-semibold">"Nome (Ex Colaborador)"</strong>,
              permitindo fechar ou atribuir clientes atendidos mesmo após o desligamento.
            </p>
          </div>
        </div>

        {!canManage && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs shrink-0">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>Modo visualização (apenas Admin pode alterar)</span>
          </div>
        )}
      </div>

      {/* Controles de busca e filtros rápidos */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar por nome, e-mail ou cargo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`text-xs px-3 py-1.5 rounded-md border font-medium transition-colors ${
              filterMode === 'all'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background hover:bg-muted text-muted-foreground'
            }`}
          >
            Todos ({users.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('consultores')}
            className={`text-xs px-3 py-1.5 rounded-md border font-medium transition-colors ${
              filterMode === 'consultores'
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-background hover:bg-muted text-muted-foreground'
            }`}
          >
            Consultores / Responsáveis ({totalConsultoresEx})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('com_leads')}
            className={`text-xs px-3 py-1.5 rounded-md border font-medium transition-colors ${
              filterMode === 'com_leads'
                ? 'bg-amber-600 text-white border-amber-600'
                : 'bg-background hover:bg-muted text-muted-foreground'
            }`}
          >
            Com histórico de leads ({users.filter((u) => u.leadsCount > 0).length})
          </button>
        </div>
      </div>

      {/* Tabela de Ex-Colaboradores */}
      <div className="flex-1 overflow-auto rounded-md border border-border">
        <Table>
          <TableHeader className="bg-muted/50 sticky top-0 z-10">
            <TableRow>
              <TableHead className="w-[300px] text-xs font-semibold">
                Colaborador / E-mail
              </TableHead>
              <TableHead className="text-xs font-semibold">Função / Cargo</TableHead>
              <TableHead className="text-xs font-semibold text-center w-[130px]">Acesso</TableHead>
              <TableHead className="text-xs font-semibold text-center w-[150px]">
                Leads no CRM
              </TableHead>
              <TableHead className="text-xs font-semibold text-center w-[160px]">
                Ex Colaborador
              </TableHead>
              <TableHead className="text-xs font-semibold text-center w-[180px]">
                Consultor / Responsável
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="py-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-9 h-9 rounded-full" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-28" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="h-5 w-16 mx-auto rounded-full" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="h-5 w-16 mx-auto rounded-full" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="h-6 w-12 mx-auto rounded-full" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="h-6 w-12 mx-auto rounded-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <UserX className="w-8 h-8 opacity-40" />
                    <span className="font-semibold text-sm">Nenhum ex-colaborador encontrado</span>
                    <span className="text-xs text-muted-foreground">
                      Usuários inativados ou marcados como "Ex Colaborador" aparecerão aqui.
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((item) => {
                const isConsultor = Boolean(item.eh_consultor)
                const isEx = Boolean(item.ex_colaborador)
                const isAtivo = Boolean(item.status)
                const isPendingConsultor = updatingId === `consultor-${item.id}`
                const isPendingEx = updatingId === `ex-${item.id}`
                const hasLeads = item.leadsCount > 0

                return (
                  <TableRow
                    key={item.id}
                    className={`hover:bg-muted/40 transition-colors ${
                      isConsultor ? 'bg-emerald-500/5 dark:bg-emerald-500/[0.03]' : ''
                    }`}
                  >
                    {/* Nome, Email, Foto */}
                    <TableCell className="py-2.5">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-9 h-9 border border-border">
                          <AvatarImage src={item.foto_perfil || undefined} alt={item.nome} />
                          <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                            {getInitials(item.nome)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-foreground truncate">
                              {item.nome}
                            </span>
                            {isConsultor && (
                              <Badge
                                variant="outline"
                                className="h-4 px-1.5 text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                              >
                                {item.nome} (Ex Colaborador)
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground truncate">
                            {item.email}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Função cadastrada */}
                    <TableCell className="text-xs text-foreground/80">
                      <div className="flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-muted-foreground/70" />
                        <span>{item.funcao || 'Não especificada'}</span>
                      </div>
                    </TableCell>

                    {/* Situação de Acesso */}
                    <TableCell className="text-center">
                      {isAtivo ? (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Ativo</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-500/10 border border-zinc-500/20 text-zinc-600 dark:text-zinc-400 text-xs font-medium">
                          <XCircle className="w-3 h-3" />
                          <span>Inativo</span>
                        </div>
                      )}
                    </TableCell>

                    {/* Leads hoje no CRM */}
                    <TableCell className="text-center">
                      {hasLeads ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-xs font-semibold">
                          <span>{item.leadsCount}</span>
                          <span className="text-[11px] font-normal opacity-85">
                            {item.leadsCount === 1 ? 'lead' : 'leads'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/60">—</span>
                      )}
                    </TableCell>

                    {/* Interruptor Ex Colaborador */}
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Switch
                          checked={isEx}
                          disabled={!canManage || isPendingEx}
                          onCheckedChange={(checked) => handleToggleExColaborador(item, checked)}
                          aria-label={`Definir ${item.nome} como ex-colaborador`}
                        />
                        <span
                          className={`text-xs font-semibold w-10 text-left ${
                            isEx ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground'
                          }`}
                        >
                          {isEx ? 'Sim' : 'Não'}
                        </span>
                      </div>
                    </TableCell>

                    {/* Interruptor de eh_consultor */}
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Switch
                          checked={isConsultor}
                          disabled={!canManage || isPendingConsultor}
                          onCheckedChange={(checked) => handleToggleConsultor(item, checked)}
                          aria-label={`Definir ${item.nome} como consultor`}
                        />
                        <span
                          className={`text-xs font-semibold w-10 text-left ${
                            isConsultor
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {isConsultor ? 'Sim' : 'Não'}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dica de rodapé */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
        <div className="flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5 shrink-0" />
          <span>
            Ex-colaboradores marcados como consultores mantêm elegibilidade para fechar atendimentos
            passados sem liberar login indevido. O acesso ao sistema continua controlado pelo status
            da conta.
          </span>
        </div>
        <span className="font-mono text-[11px] shrink-0 ml-2">
          {filteredUsers.length} de {users.length} usuários
        </span>
      </div>
    </div>
  )
}
