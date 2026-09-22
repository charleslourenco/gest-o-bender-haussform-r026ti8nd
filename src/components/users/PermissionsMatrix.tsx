import { useState, useEffect, useMemo } from 'react'
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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
  ShieldAlert,
  Shield,
  Eye,
  Edit2,
  Key,
  Search,
  UserCheck,
  Lock,
  Layers,
  Users as UsersIcon,
  RotateCcw,
} from 'lucide-react'
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
] as const

type ModuleName = (typeof MODULES)[number]
type AccessLevel = 'Nenhum' | 'Leitor' | 'Editor' | 'Admin'

interface ModuleMeta {
  description: string
  category: 'Visão Geral' | 'Operações & PCP' | 'Gestão & Apoio'
}

const MODULE_META: Record<ModuleName, ModuleMeta> = {
  Dashboard: {
    description: 'Indicadores gerais, métricas executivas e painel gerencial',
    category: 'Visão Geral',
  },
  Comercial: {
    description: 'Funil de vendas, prospecção de leads e contratos',
    category: 'Visão Geral',
  },
  'Área de Clientes': {
    description: 'Pastas de clientes, documentos e assinaturas digitais',
    category: 'Visão Geral',
  },
  'Planejamento e Programação de Operações': {
    description: 'Hub PCP, cronograma e programação operacional integrada',
    category: 'Operações & PCP',
  },
  'Análise Técnica': {
    description: 'Engenharia, detalhamento técnico, medidas e projetos',
    category: 'Operações & PCP',
  },
  Produção: {
    description: 'Kanban fabril, corte, usinagem, borda e sobras',
    category: 'Operações & PCP',
  },
  Montagem: {
    description: 'Alocação de montadores, relatórios de campo e assistências',
    category: 'Operações & PCP',
  },
  Acompanhamentos: {
    description: 'Pós-venda, follow-ups de clientes e entregas',
    category: 'Operações & PCP',
  },
  'Estoque & Compras': {
    description: 'Itens em estoque, listas de materiais, compras e NF-e',
    category: 'Gestão & Apoio',
  },
  Financeiro: {
    description: 'Contas a pagar/receber, DRE, plano de contas e fluxo de caixa',
    category: 'Gestão & Apoio',
  },
  'Gestão de Pessoas': {
    description: 'Equipe CLT, prestadores PJ, fornecedores e documentos',
    category: 'Gestão & Apoio',
  },
  Usuários: {
    description: 'Controle de acesso, cadastro de equipe e permissões',
    category: 'Gestão & Apoio',
  },
}

export function PermissionsMatrix() {
  const { toast } = useToast()
  const [users, setUsers] = useState<AppUser[]>([])
  const [permissions, setPermissions] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [bulkAction, setBulkAction] = useState<'reader' | 'clear' | null>(null)
  const [isBulkProcessing, setIsBulkProcessing] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

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

      const typedUsers = (usersData as AppUser[]) || []
      setUsers(typedUsers)

      const permsMap: Record<string, string> = {}
      permsData?.forEach((p) => {
        permsMap[`${p.usuario_id}-${p.modulo}`] = p.nivel_acesso
      })
      setPermissions(permsMap)

      // Seleciona automaticamente o primeiro usuário ativo se nenhum selecionado
      if (typedUsers.length > 0) {
        setSelectedUserId((prev) => {
          if (prev && typedUsers.some((u) => u.id === prev)) {
            return prev
          }
          return typedUsers[0].id
        })
      }
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

  const selectedUser = useMemo(() => {
    return users.find((u) => u.id === selectedUserId) || null
  }, [users, selectedUserId])

  const isSuperAdmin = selectedUser?.email === 'admin@bender.com'

  // Contagem de módulos liberados por usuário (para os badges da lista)
  const userAccessCounts = useMemo(() => {
    const counts: Record<string, { total: number; admin: number; editor: number; leitor: number }> =
      {}
    users.forEach((u) => {
      let total = 0
      let admin = 0
      let editor = 0
      let leitor = 0
      MODULES.forEach((mod) => {
        const lvl = permissions[`${u.id}-${mod}`] || 'Nenhum'
        if (lvl !== 'Nenhum') {
          total++
          if (lvl === 'Admin') admin++
          else if (lvl === 'Editor') editor++
          else if (lvl === 'Leitor') leitor++
        }
      })
      counts[u.id] = { total, admin, editor, leitor }
    })
    return counts
  }, [users, permissions])

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return users
    return users.filter(
      (u) =>
        u.nome?.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term) ||
        u.funcao?.toLowerCase().includes(term),
    )
  }, [users, search])

  // Resumo do usuário selecionado
  const selectedStats = useMemo(() => {
    if (!selectedUserId) {
      return { total: 0, admin: 0, editor: 0, leitor: 0 }
    }
    return userAccessCounts[selectedUserId] || { total: 0, admin: 0, editor: 0, leitor: 0 }
  }, [selectedUserId, userAccessCounts])

  const updatePermission = async (userId: string, mod: string, level: string) => {
    const key = `${userId}-${mod}`
    const prevLevel = permissions[key] || 'Nenhum'

    if (prevLevel === level) return

    // Atualização otimista
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
      // Rollback otimista
      setPermissions((prev) => ({ ...prev, [key]: prevLevel }))
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar',
        description: error.message,
      })
    }
  }

  // Ação em massa com auto-save otimista e rollback em lote
  const handleBulkApply = async (targetLevel: 'Leitor' | 'Nenhum') => {
    if (!selectedUserId || !selectedUser) return
    if (selectedUser.email === 'admin@bender.com') {
      toast({
        variant: 'destructive',
        title: 'Ação não permitida',
        description: 'As permissões do Super Admin não podem ser alteradas em massa.',
      })
      setBulkAction(null)
      return
    }

    setIsBulkProcessing(true)

    // Snapshot do estado anterior deste usuário para rollback completo se falhar
    const snapshot: Record<string, string> = {}
    MODULES.forEach((mod) => {
      const key = `${selectedUserId}-${mod}`
      snapshot[key] = permissions[key] || 'Nenhum'
    })

    // Aplicação otimista
    setPermissions((prev) => {
      const next = { ...prev }
      MODULES.forEach((mod) => {
        const key = `${selectedUserId}-${mod}`
        next[key] = targetLevel
      })
      return next
    })

    try {
      if (targetLevel === 'Nenhum') {
        const { error } = await supabase
          .from('matriz_permissoes')
          .delete()
          .eq('usuario_id', selectedUserId)
        if (error) throw error
      } else {
        // Obter registros já existentes para este usuário
        const { data: existingRows, error: fetchErr } = await supabase
          .from('matriz_permissoes')
          .select('id, modulo')
          .eq('usuario_id', selectedUserId)
        if (fetchErr) throw fetchErr

        const existingMap = new Map<string, string>()
        existingRows?.forEach((r) => existingMap.set(r.modulo, r.id))

        // Para os existentes, atualiza; para os não existentes, insere
        const toInsert: Array<{ usuario_id: string; modulo: string; nivel_acesso: string }> = []
        const toUpdate: Array<{ id: string; nivel_acesso: string }> = []

        MODULES.forEach((mod) => {
          const rowId = existingMap.get(mod)
          if (rowId) {
            toUpdate.push({ id: rowId, nivel_acesso: targetLevel })
          } else {
            toInsert.push({ usuario_id: selectedUserId, modulo: mod, nivel_acesso: targetLevel })
          }
        })

        if (toInsert.length > 0) {
          const { error: insErr } = await supabase.from('matriz_permissoes').insert(toInsert)
          if (insErr) throw insErr
        }

        if (toUpdate.length > 0) {
          // Atualiza em paralelo
          await Promise.all(
            toUpdate.map((u) =>
              supabase
                .from('matriz_permissoes')
                .update({ nivel_acesso: u.nivel_acesso })
                .eq('id', u.id),
            ),
          )
        }
      }

      toast({
        title:
          targetLevel === 'Nenhum'
            ? 'Permissões limpas com sucesso'
            : 'Nível Leitor aplicado em todos os módulos',
        description: `Usuário: ${selectedUser.nome}`,
      })
    } catch (err: any) {
      // Rollback
      setPermissions((prev) => ({ ...prev, ...snapshot }))
      toast({
        variant: 'destructive',
        title: 'Erro ao aplicar ação em massa',
        description: err.message,
      })
    } finally {
      setIsBulkProcessing(false)
      setBulkAction(null)
    }
  }

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'Admin':
        return <Key className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
      case 'Editor':
        return <Edit2 className="h-3.5 w-3.5 text-sky-500 shrink-0" />
      case 'Leitor':
        return <Eye className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      default:
        return <Shield className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-14 w-full rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-[500px]">
          <Skeleton className="lg:col-span-4 h-[550px] rounded-lg" />
          <Skeleton className="lg:col-span-8 h-[550px] rounded-lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col space-y-3 animate-in fade-in duration-300">
      {/* Banner / Cabeçalho informativo compacto padronizado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-card border border-border rounded-lg shadow-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
            <ShieldAlert className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground text-sm leading-tight">
                Editor de Permissões por Usuário
              </h3>
              <Badge variant="outline" className="text-[10px] h-4.5 font-normal">
                {users.length} usuários ativos
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground truncate">
              Selecione um usuário à esquerda para configurar os níveis de cada módulo. Alterações
              são salvas automaticamente.
            </p>
          </div>
        </div>

        {selectedUser && (
          <div className="flex items-center gap-1.5 self-start sm:self-auto shrink-0 text-xs">
            <span className="text-muted-foreground">Selecionado:</span>
            <span className="font-semibold text-foreground truncate max-w-[180px]">
              {selectedUser.nome}
            </span>
          </div>
        )}
      </div>

      {/* Grid de 2 colunas: Lista de usuários (esq) | Editor dos 12 módulos (dir) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
        {/* COLUNA ESQUERDA: Lista compacta de usuários */}
        <div className="lg:col-span-4 bg-card border border-border rounded-lg shadow-xs flex flex-col overflow-hidden">
          {/* Header da lista com busca */}
          <div className="p-3 border-b border-border space-y-2 bg-muted/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <UsersIcon className="h-3.5 w-3.5 text-muted-foreground" />
                Usuários Ativos
              </span>
              <span className="text-[11px] text-muted-foreground">
                {filteredUsers.length} de {users.length}
              </span>
            </div>

            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email ou função..."
                className="pl-8 h-8 text-xs bg-background border-border text-foreground placeholder:text-muted-foreground"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Lista scrollável verticalmente, sem scroll horizontal */}
          <div className="divide-y divide-border overflow-y-auto max-h-[calc(100vh-290px)] min-h-[380px]">
            {filteredUsers.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
                <UsersIcon className="h-8 w-8 mx-auto text-muted-foreground/40" />
                <p>Nenhum usuário encontrado com o termo digitado.</p>
              </div>
            ) : (
              filteredUsers.map((user) => {
                const isSelected = user.id === selectedUserId
                const isSuper = user.email === 'admin@bender.com'
                const counts = userAccessCounts[user.id] || {
                  total: 0,
                  admin: 0,
                  editor: 0,
                  leitor: 0,
                }

                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => setSelectedUserId(user.id)}
                    className={cn(
                      'w-full text-left p-3 transition-colors flex items-start gap-2.5 hover:bg-muted/40 cursor-pointer relative',
                      isSelected ? 'bg-primary/10 hover:bg-primary/15' : 'bg-card',
                    )}
                  >
                    {/* Indicador visual de seleção */}
                    {isSelected && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r" />
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span
                          className={cn(
                            'text-xs font-semibold truncate',
                            isSelected ? 'text-primary font-bold' : 'text-foreground',
                          )}
                          title={user.nome}
                        >
                          {user.nome}
                        </span>
                        {isSuper ? (
                          <Badge
                            variant="secondary"
                            className="text-[10px] h-4.5 px-1.5 shrink-0 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 gap-1 font-semibold"
                          >
                            <Lock className="h-2.5 w-2.5" />
                            Super Admin
                          </Badge>
                        ) : (
                          <span className="text-[11px] text-muted-foreground shrink-0 font-medium">
                            {counts.total}/{MODULES.length}
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-muted-foreground truncate" title={user.email}>
                        {user.email}
                      </p>

                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        {user.funcao && (
                          <Badge
                            variant="outline"
                            className="text-[10px] h-4.5 px-1.5 font-normal bg-background/60"
                          >
                            {user.funcao}
                          </Badge>
                        )}
                        {!isSuper && counts.total > 0 && (
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            {counts.admin > 0 && (
                              <span
                                className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-medium"
                                title={`${counts.admin} módulo(s) como Admin`}
                              >
                                <Key className="h-2.5 w-2.5" />
                                {counts.admin}
                              </span>
                            )}
                            {counts.editor > 0 && (
                              <span
                                className="inline-flex items-center gap-0.5 text-sky-600 dark:text-sky-400 font-medium"
                                title={`${counts.editor} módulo(s) como Editor`}
                              >
                                <Edit2 className="h-2.5 w-2.5" />
                                {counts.editor}
                              </span>
                            )}
                            {counts.leitor > 0 && (
                              <span
                                className="inline-flex items-center gap-0.5 text-muted-foreground font-medium"
                                title={`${counts.leitor} módulo(s) como Leitor`}
                              >
                                <Eye className="h-2.5 w-2.5" />
                                {counts.leitor}
                              </span>
                            )}
                          </div>
                        )}
                        {!isSuper && counts.total === 0 && (
                          <span className="text-[10px] text-muted-foreground/70 italic">
                            Sem módulos liberados
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* COLUNA DIREITA: Editor do usuário selecionado */}
        <div className="lg:col-span-8 bg-card border border-border rounded-lg shadow-xs flex flex-col overflow-hidden">
          {!selectedUser ? (
            /* Estado vazio amigável quando nenhum usuário está selecionado */
            <div className="flex flex-col items-center justify-center p-12 text-center min-h-[460px] space-y-3">
              <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground">
                <UserCheck className="h-6 w-6" />
              </div>
              <div className="space-y-1 max-w-sm">
                <h4 className="text-sm font-semibold text-foreground">
                  Nenhum usuário selecionado
                </h4>
                <p className="text-xs text-muted-foreground">
                  Selecione um usuário ativo na coluna à esquerda para visualizar e editar suas
                  permissões nos 12 módulos do sistema.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Header do editor com resumo e ações em massa */}
              <div className="p-3.5 border-b border-border bg-muted/20 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-foreground leading-tight">
                        {selectedUser.nome}
                      </h4>
                      {isSuperAdmin && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] h-4.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-semibold gap-1"
                        >
                          <Lock className="h-2.5 w-2.5" />
                          Super Admin Bloqueado
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {selectedUser.email}
                      {selectedUser.funcao && ` • ${selectedUser.funcao}`}
                    </p>
                  </div>

                  {/* Resumo visual: "X módulos liberados" */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-background border border-border text-xs">
                      <Layers className="h-3.5 w-3.5 text-primary" />
                      <span className="font-semibold text-foreground">
                        {selectedStats.total} de {MODULES.length}
                      </span>
                      <span className="text-muted-foreground">módulos liberados</span>
                    </div>
                  </div>
                </div>

                {/* Sub-barra: badges dos níveis + botões de ação em massa */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-border/60">
                  <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                    <span className="text-[11px]">Distribuição:</span>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[11px] font-medium">
                      <Key className="h-3 w-3" />
                      {selectedStats.admin} Admin
                    </span>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-700 dark:text-sky-400 text-[11px] font-medium">
                      <Edit2 className="h-3 w-3" />
                      {selectedStats.editor} Editor
                    </span>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-[11px] font-medium">
                      <Eye className="h-3 w-3" />
                      {selectedStats.leitor} Leitor
                    </span>
                  </div>

                  {/* Botões de Ação em Massa por Usuário */}
                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isSuperAdmin || isBulkProcessing}
                      onClick={() => setBulkAction('reader')}
                      className="h-7 text-xs px-2.5 gap-1 border-border hover:bg-muted text-foreground"
                      title={
                        isSuperAdmin
                          ? 'Super Admin não pode ser alterado'
                          : 'Definir Leitor em todos os 12 módulos'
                      }
                    >
                      <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Definir Leitor em todos</span>
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isSuperAdmin || isBulkProcessing}
                      onClick={() => setBulkAction('clear')}
                      className="h-7 text-xs px-2.5 gap-1 border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 text-muted-foreground"
                      title={
                        isSuperAdmin
                          ? 'Super Admin não pode ser alterado'
                          : 'Limpar todos os módulos para Nenhum'
                      }
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Limpar todos</span>
                    </Button>
                  </div>
                </div>

                {isSuperAdmin && (
                  <div className="p-2.5 rounded-md bg-muted/60 border border-border text-xs text-muted-foreground flex items-center gap-2">
                    <Lock className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>
                      Este usuário é o <strong>Super Admin do sistema</strong>. Suas permissões são
                      protegidas e não podem ser alteradas por esta tela.
                    </span>
                  </div>
                )}
              </div>

              {/* Linhas dos 12 módulos com Select compacto cada — sem scroll horizontal */}
              <div className="p-2 sm:p-3 divide-y divide-border/60 overflow-y-auto max-h-[calc(100vh-360px)] min-h-[380px]">
                {MODULES.map((mod, idx) => {
                  const level = (permissions[`${selectedUser.id}-${mod}`] ||
                    'Nenhum') as AccessLevel
                  const meta = MODULE_META[mod]

                  return (
                    <div
                      key={mod}
                      className={cn(
                        'py-2 px-2.5 rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors hover:bg-muted/30',
                        idx % 2 === 0 ? 'bg-transparent' : 'bg-muted/10',
                      )}
                    >
                      {/* Nome e descrição do módulo */}
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-foreground truncate">
                            {mod}
                          </span>
                          <span className="text-[10px] text-muted-foreground/80 px-1.5 py-0.5 rounded bg-muted/50 hidden md:inline-block">
                            {meta.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {meta.description}
                        </p>
                      </div>

                      {/* Select compacto com níveis, ícones e cores padronizadas */}
                      <div className="w-full sm:w-[170px] shrink-0">
                        <Select
                          value={level}
                          onValueChange={(val) => updatePermission(selectedUser.id, mod, val)}
                          disabled={isSuperAdmin}
                        >
                          <SelectTrigger
                            className={cn(
                              'w-full bg-background border border-border text-foreground text-xs focus:ring-1 focus:ring-primary rounded-md h-8 transition-all',
                              level === 'Admin' &&
                                'border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold',
                              level === 'Editor' &&
                                'border-sky-500/50 bg-sky-500/10 text-sky-700 dark:text-sky-400 font-medium',
                              level === 'Leitor' &&
                                'border-border bg-muted/30 text-foreground font-normal',
                              level === 'Nenhum' && 'text-muted-foreground/80',
                              isSuperAdmin && 'opacity-60 cursor-not-allowed',
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
                                <Shield className="h-3.5 w-3.5 text-muted-foreground/60" />
                                <span>Nenhum</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="Leitor" className="text-xs">
                              <div className="flex items-center gap-2">
                                <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>Leitor</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="Editor" className="text-xs">
                              <div className="flex items-center gap-2">
                                <Edit2 className="h-3.5 w-3.5 text-sky-500" />
                                <span className="text-sky-700 dark:text-sky-400 font-medium">
                                  Editor
                                </span>
                              </div>
                            </SelectItem>
                            <SelectItem value="Admin" className="text-xs">
                              <div className="flex items-center gap-2">
                                <Key className="h-3.5 w-3.5 text-emerald-500" />
                                <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                                  Admin
                                </span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Diálogo de confirmação para ações em massa */}
      <AlertDialog
        open={bulkAction !== null}
        onOpenChange={(open) => !open && !isBulkProcessing && setBulkAction(null)}
      >
        <AlertDialogContent className="bg-card border border-border shadow-lg max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground text-base font-bold flex items-center gap-2">
              {bulkAction === 'reader' ? (
                <>
                  <Eye className="h-5 w-5 text-sky-500" />
                  Definir Leitor em todos os módulos?
                </>
              ) : (
                <>
                  <ShieldAlert className="h-5 w-5 text-destructive" />
                  Limpar todas as permissões?
                </>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-xs leading-relaxed space-y-2">
              <p>
                Esta alteração será aplicada em todos os <strong>{MODULES.length} módulos</strong>{' '}
                do usuário <strong>{selectedUser?.nome}</strong> ({selectedUser?.email}).
              </p>
              {bulkAction === 'clear' ? (
                <p className="text-destructive font-medium">
                  O usuário perderá o acesso aos módulos até que novos níveis sejam atribuídos.
                </p>
              ) : (
                <p>
                  Todos os módulos passarão para o nível <strong>Leitor</strong> (apenas
                  visualização).
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 mt-4 pt-3 border-t border-border">
            <AlertDialogCancel
              disabled={isBulkProcessing}
              className="h-8 text-xs border-border text-foreground hover:bg-muted rounded-md"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isBulkProcessing}
              onClick={() => handleBulkApply(bulkAction === 'reader' ? 'Leitor' : 'Nenhum')}
              className={cn(
                'h-8 text-xs rounded-md',
                bulkAction === 'clear'
                  ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'
                  : 'bg-primary hover:bg-primary/90 text-primary-foreground',
              )}
            >
              {isBulkProcessing ? 'Aplicando...' : 'Confirmar e Aplicar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
