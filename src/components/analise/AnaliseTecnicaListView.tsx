import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
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
import { Button } from '@/components/ui/button'
import { Trash2, ShoppingBag, AlertTriangle, RefreshCw, LogIn } from 'lucide-react'
import {
  parseWeekNumber,
  getCurrentIsoWeek,
  matchWeek,
  getIsoWeeksForYear,
} from '@/lib/pcp-capacity'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { Skeleton } from '@/components/ui/skeleton'
import { runWithAuthRecovery, redirectToLogin } from '@/lib/supabase/auth-recovery'

interface Props {
  searchQuery: string
  columns: { id: string; title: string }[]
}

export function AnaliseTecnicaListView({ searchQuery, columns }: Props) {
  const [items, setItems] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [somenteSemanaAtual, setSomenteSemanaAtual] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSessionExpired, setIsSessionExpired] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)
  const { toast } = useToast()
  const { user, isAdmin } = useAuth()

  const fetchData = async () => {
    try {
      setLoading(true)
      setErrorMessage(null)
      setIsSessionExpired(false)
      const columnIds = columns.map((c) => c.id)

      const result = await runWithAuthRecovery<any[]>(() =>
        supabase
          .from('produtos_servicos_projeto')
          .select(`
            *,
            semana_planejada_producao,
            cliente:clientes(nome),
            analista:users!produtos_servicos_projeto_analista_id_fkey(id, nome)
          `)
          .in('status_analise', columnIds)
          .eq('arquivado_analise', false)
          .eq('excluido_analise' as any, false)
          .or('is_outsourced.eq.false,and(is_outsourced.eq.true,terceirizado_validado.eq.true)')
          .order('atualizado_em', { ascending: false }),
      )

      if (result.error) {
        const msg = result.sessionExpired
          ? 'Sua sessão expirou ou é inválida. Por favor, faça login novamente.'
          : result.error?.message || 'Falha ao carregar lista da análise técnica.'
        setErrorMessage(msg)
        setIsSessionExpired(result.sessionExpired)
        toast({ title: 'Erro', description: msg, variant: 'destructive' })
        setItems([])
        return
      }

      const data = result.data

      let filtered = data || []

      if (somenteSemanaAtual) {
        const current = getCurrentIsoWeek()
        const currentWeekRange =
          getIsoWeeksForYear(current.year).find((w) => w.weekNumber === current.weekNumber) ||
          (current as any)
        filtered = filtered.filter((item) => {
          return matchWeek(
            item.semana_planejada_producao,
            currentWeekRange,
            item.semana_producao_inicio,
          )
        })
      }

      if (searchQuery) {
        const lowerQ = searchQuery.toLowerCase()
        filtered = filtered.filter(
          (item) =>
            item.codigo_rastreio?.toLowerCase().includes(lowerQ) ||
            item.nome_produto?.toLowerCase().includes(lowerQ) ||
            item.cliente?.nome?.toLowerCase().includes(lowerQ),
        )
      }

      setItems(filtered)
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro inesperado ao carregar dados.')
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
      setIsRetrying(false)
    }
  }

  const fetchUsers = async () => {
    const { data } = await runWithAuthRecovery<any[]>(() =>
      supabase.from('users').select('id, nome').eq('status', true).order('nome'),
    )
    if (data) setUsers(data)
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    fetchData()

    const handleRefresh = () => fetchData()
    const handleWeekFilter = (e: any) => {
      if (e.detail && typeof e.detail === 'object' && 'somente_semana_atual' in e.detail) {
        setSomenteSemanaAtual(Boolean(e.detail.somente_semana_atual))
      }
    }
    window.addEventListener('kanban_refresh', handleRefresh)
    window.addEventListener('toggle_filtro_semana_atual', handleWeekFilter)
    return () => {
      window.removeEventListener('kanban_refresh', handleRefresh)
      window.removeEventListener('toggle_filtro_semana_atual', handleWeekFilter)
    }
  }, [searchQuery, columns, somenteSemanaAtual])

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('produtos_servicos_projeto')
        .update({ status_analise: newStatus })
        .eq('id', id)

      if (error) throw error
      toast({ title: 'Status atualizado' })
      window.dispatchEvent(new CustomEvent('kanban_refresh'))
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    }
  }

  const handleResponsavelChange = async (id: string, analistaId: string) => {
    try {
      const val = analistaId === 'unassigned' ? null : analistaId
      const { error } = await supabase
        .from('produtos_servicos_projeto')
        .update({ analista_id: val })
        .eq('id', id)

      if (error) throw error
      toast({ title: 'Responsável atualizado' })
      window.dispatchEvent(new CustomEvent('kanban_refresh'))
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    }
  }

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        'Excluir este item da Análise? Ele sai dos quadros e da lista, mas o histórico é mantido.',
      )
    )
      return
    try {
      const { error } = await supabase
        .from('produtos_servicos_projeto')
        .update({ excluido_analise: true } as any)
        .eq('id', id)

      if (error) throw error
      toast({ title: 'Item excluído da Análise' })
      window.dispatchEvent(new CustomEvent('kanban_refresh'))
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    }
  }

  const handleSolicitarCompra = async (item: any) => {
    if (
      !confirm(
        `Solicitar a compra do item "${item.nome_produto}"? Ele sai da Análise Técnica e vai para "Item Terceirizado" no quadro de Montagem.`,
      )
    )
      return

    if (!user) {
      toast({ title: 'Erro', description: 'Usuário não autenticado', variant: 'destructive' })
      return
    }

    setItems((prev) => prev.filter((i) => i.id !== item.id))

    try {
      const { data, error } = await supabase.rpc('solicitar_compra_item' as any, {
        p_item_id: item.id,
      })
      if (error) throw error

      toast({
        title: 'Compra solicitada',
        description: 'Solicitação criada e item movido para Item Terceirizado.',
      })
      window.dispatchEvent(new CustomEvent('kanban_refresh'))
    } catch (err: any) {
      fetchData()
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    }
  }

  const handleRetry = () => {
    setIsRetrying(true)
    fetchData()
  }

  const handleGoToLogin = () => {
    redirectToLogin('/pcp/analise-tecnica')
  }

  if (errorMessage && !loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center text-center">
        <div className="max-w-md w-full p-6 bg-card border border-border rounded-xl shadow-sm flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-3">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base text-foreground mb-1">
            {isSessionExpired ? 'Sessão Expirada' : 'Erro ao Carregar Lista'}
          </h3>
          <p className="text-xs text-muted-foreground mb-4">{errorMessage}</p>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleRetry} disabled={isRetrying} className="gap-2 text-xs">
              <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
              {isRetrying ? 'Tentando novamente...' : 'Tentar novamente'}
            </Button>
            {isSessionExpired && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleGoToLogin}
                className="gap-2 text-xs"
              >
                <LogIn className="w-3.5 h-3.5" />
                Fazer login novamente
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 h-full max-w-full overflow-y-auto">
      <div className="rounded-xl border border-border bg-card shadow-sm min-w-[900px] overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50 sticky top-0 z-10 shadow-sm">
            <TableRow className="border-border">
              <TableHead className="w-[140px] font-semibold text-foreground">Código</TableHead>
              <TableHead className="font-semibold text-foreground">Cliente</TableHead>
              <TableHead className="font-semibold text-foreground">Ambiente</TableHead>
              <TableHead className="w-[220px] font-semibold text-foreground">Status</TableHead>
              <TableHead className="w-[200px] font-semibold text-foreground">Responsável</TableHead>
              <TableHead className="w-[80px] text-center font-semibold text-foreground">
                Ações
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="border-border">
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-40" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-8 mx-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow className="border-border">
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  Nenhum item encontrado.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/50 border-border">
                  <TableCell className="font-medium text-foreground">
                    {item.codigo_rastreio || '-'}
                  </TableCell>
                  <TableCell
                    className="text-muted-foreground truncate max-w-[200px]"
                    title={item.cliente?.nome}
                  >
                    {item.cliente?.nome || '-'}
                  </TableCell>
                  <TableCell
                    className="text-muted-foreground truncate max-w-[200px]"
                    title={item.nome_produto}
                  >
                    {item.nome_produto || '-'}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={item.status_analise}
                      onValueChange={(val) => handleStatusChange(item.id, val)}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {columns.map((col) => (
                          <SelectItem key={col.id} value={col.id}>
                            {col.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={item.analista_id || 'unassigned'}
                      onValueChange={(val) => handleResponsavelChange(item.id, val)}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned" className="text-muted-foreground italic">
                          Sem responsável
                        </SelectItem>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                        onClick={() => handleSolicitarCompra(item)}
                        title="Solicitar Compra"
                      >
                        <ShoppingBag className="h-4 w-4" />
                      </Button>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(item.id)}
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
