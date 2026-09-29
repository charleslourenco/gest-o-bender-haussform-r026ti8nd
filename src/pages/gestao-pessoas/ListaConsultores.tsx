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
  UserCheck,
  ShieldAlert,
  Sparkles,
  HelpCircle,
  Briefcase,
  AlertCircle,
} from 'lucide-react'
import { AppUser } from '@/types/user'

interface UserWithConsultorInfo extends AppUser {
  leadsCount: number
}

export function ListaConsultores() {
  const { toast } = useToast()
  const { isAdmin, permissions } = useAuth()
  const canManage =
    isAdmin || permissions['Gestão de Pessoas'] === 'Admin' || permissions['Usuários'] === 'Admin'

  const [users, setUsers] = useState<UserWithConsultorInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [filterMode, setFilterMode] = useState<'all' | 'consultores' | 'com_leads'>('all')

  const fetchData = async () => {
    setLoading(true)
    try {
      // 1. Buscar todos os usuários ATIVOS
      const { data: usersData, error: usersErr } = await supabase
        .from('users')
        .select('*')
        .eq('status', true)
        .order('nome', { ascending: true })

      if (usersErr) throw usersErr

      // 2. Contar leads por consultor_id (para sugerir quem já tem leads atribuídos)
      const { data: leadsData, error: leadsErr } = await supabase
        .from('leads')
        .select('consultor_id')
        .not('consultor_id', 'is', null)

      if (leadsErr) {
        console.warn('Erro ao buscar leads para contagem de consultores:', leadsErr)
      }

      const countsMap: Record<string, number> = {}
      if (Array.isArray(leadsData)) {
        leadsData.forEach((l) => {
          if (l.consultor_id) {
            countsMap[l.consultor_id] = (countsMap[l.consultor_id] || 0) + 1
          }
        })
      }

      const merged: UserWithConsultorInfo[] = (usersData || []).map((u: any) => ({
        ...u,
        eh_consultor: Boolean(u.eh_consultor),
        leadsCount: countsMap[u.id] || 0,
      }))

      setUsers(merged)
    } catch (err: any) {
      console.error('Erro ao carregar consultores:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar usuários',
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
  const handleToggleConsultor = async (user: UserWithConsultorInfo, nextValue: boolean) => {
    if (!canManage) {
      toast({
        variant: 'destructive',
        title: 'Ação restrita a Administrador',
        description: 'Você precisa de perfil Administrador para alterar a função de Consultor.',
      })
      return
    }

    setUpdatingId(user.id)
    // Atualização otimista
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
        title: nextValue ? 'Função de Consultor atribuída' : 'Função de Consultor removida',
        description: `${user.nome} ${
          nextValue
            ? 'agora aparece nos dropdowns de Responsável do CRM comercial.'
            : 'não será mais listado para novos leads no CRM comercial.'
        }`,
      })
    } catch (err: any) {
      // Reverter em caso de erro
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

  // Estatísticas
  const totalConsultores = useMemo(() => {
    return users.filter((u) => Boolean(u.eh_consultor)).length
  }, [users])

  const consultoresSugeridosComLeads = useMemo(() => {
    return users.filter((u) => u.leadsCount > 0 && !u.eh_consultor).length
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
      {/* Top Banner Informativo e Contador */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 p-3.5 bg-muted/40 border border-border rounded-lg">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-foreground text-sm leading-tight">
                Gestão de Consultores / Responsáveis
              </h3>
              <Badge
                variant="secondary"
                className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-semibold text-xs"
              >
                {totalConsultores}{' '}
                {totalConsultores === 1 ? 'consultor ativo' : 'consultores ativos'}
              </Badge>
              {consultoresSugeridosComLeads > 0 && (
                <Badge
                  variant="outline"
                  className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[11px] gap-1 cursor-pointer"
                  onClick={() => setFilterMode('com_leads')}
                  title="Clique para ver usuários com leads atribuídos que ainda não estão marcados como consultores"
                >
                  <Sparkles className="w-3 h-3" />
                  {consultoresSugeridosComLeads} com leads atribuídos (sugerido ativar)
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Usuários com esta função habilitada passam a ser listados no dropdown de "Responsável"
              dos cards de atendimento e modais de lead no CRM.
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
            Apenas Consultores ({totalConsultores})
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
            Com leads ({users.filter((u) => u.leadsCount > 0).length})
          </button>
        </div>
      </div>

      {/* Tabela de Usuários */}
      <div className="flex-1 overflow-auto rounded-md border border-border">
        <Table>
          <TableHeader className="bg-muted/50 sticky top-0 z-10">
            <TableRow>
              <TableHead className="w-[340px] text-xs font-semibold">
                Colaborador / E-mail
              </TableHead>
              <TableHead className="text-xs font-semibold">Função / Cargo</TableHead>
              <TableHead className="text-xs font-semibold text-center w-[180px]">
                Leads Atribuídos Hoje
              </TableHead>
              <TableHead className="text-xs font-semibold text-center w-[160px]">
                Função de Consultor
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [...Array(6)].map((_, i) => (
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
                    <Skeleton className="h-6 w-12 mx-auto rounded-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-12">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <UserCheck className="w-8 h-8 opacity-40" />
                    <span className="font-semibold text-sm">Nenhum usuário encontrado</span>
                    <span className="text-xs text-muted-foreground">
                      Tente ajustar os termos da busca ou os filtros acima.
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((item) => {
                const isConsultor = Boolean(item.eh_consultor)
                const isPending = updatingId === item.id
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
                                Consultor
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

                    {/* Leads hoje no CRM */}
                    <TableCell className="text-center">
                      {hasLeads ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-xs font-semibold">
                          <span>{item.leadsCount}</span>
                          <span className="text-[11px] font-normal opacity-85">
                            {item.leadsCount === 1 ? 'lead atribuído' : 'leads atribuídos'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/60">—</span>
                      )}
                      {hasLeads && !isConsultor && (
                        <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 flex items-center justify-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span>Já possui histórico de lead</span>
                        </div>
                      )}
                    </TableCell>

                    {/* Interruptor de eh_consultor */}
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Switch
                          checked={isConsultor}
                          disabled={!canManage || isPending}
                          onCheckedChange={(checked) => handleToggleConsultor(item, checked)}
                          aria-label={`Definir ${item.nome} como consultor`}
                        />
                        <span
                          className={`text-xs font-semibold w-12 text-left ${
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
          <HelpCircle className="w-3.5 h-3.5" />
          <span>
            Ao desmarcar um consultor, leads antigos atribuídos a ele continuam preservando seu nome
            histórico no dropdown do card.
          </span>
        </div>
        <span className="font-mono text-[11px]">
          {filteredUsers.length} de {users.length} usuários
        </span>
      </div>
    </div>
  )
}
