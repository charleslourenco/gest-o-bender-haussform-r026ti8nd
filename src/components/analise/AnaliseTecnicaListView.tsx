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
import { Trash2, ShoppingBag } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { Skeleton } from '@/components/ui/skeleton'

interface Props {
  searchQuery: string
  columns: { id: string; title: string }[]
}

export function AnaliseTecnicaListView({ searchQuery, columns }: Props) {
  const [items, setItems] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const { user } = useAuth()

  const fetchData = async () => {
    try {
      setLoading(true)
      const columnIds = columns.map((c) => c.id)
      let query = supabase
        .from('produtos_servicos_projeto')
        .select(`
          *,
          cliente:clientes(nome),
          analista:users!produtos_servicos_projeto_analista_id_fkey(id, nome)
        `)
        .in('status_analise', columnIds)
        .eq('is_outsourced', false)
        .order('atualizado_em', { ascending: false })

      const { data, error } = await query

      if (error) throw error

      let filtered = data || []
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
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('users')
      .select('id, nome')
      .eq('status', true)
      .order('nome')
    if (data) setUsers(data)
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    fetchData()

    const handleRefresh = () => fetchData()
    window.addEventListener('kanban_refresh', handleRefresh)
    return () => window.removeEventListener('kanban_refresh', handleRefresh)
  }, [searchQuery, columns])

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
    if (!confirm('Tem certeza que deseja excluir este item?')) return
    try {
      const { error } = await supabase.from('produtos_servicos_projeto').delete().eq('id', id)

      if (error) throw error
      toast({ title: 'Item excluído' })
      window.dispatchEvent(new CustomEvent('kanban_refresh'))
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    }
  }

  const handleSolicitarCompra = async (item: any) => {
    if (
      !confirm(
        `Deseja solicitar a compra do item "${item.nome_produto}" e removê-lo da análise técnica?`,
      )
    )
      return

    if (!user) {
      toast({ title: 'Erro', description: 'Usuário não autenticado', variant: 'destructive' })
      return
    }

    setItems((prev) => prev.filter((i) => i.id !== item.id))

    try {
      const [resCompra, resProj] = await Promise.all([
        supabase.from('solicitacoes_compra').insert({
          usuario_id: user.id,
          cliente_id: item.cliente_id,
          nome_item: item.nome_produto,
          quantidade: item.qtd || 1,
          unidade: 'un',
          urgencia: 'Média',
          status: 'Pendente',
          motivo: 'Solicitado via Análise Técnica',
        }),
        supabase
          .from('produtos_servicos_projeto')
          .update({
            is_outsourced: true,
          })
          .eq('id', item.id),
      ])

      if (resCompra.error) throw resCompra.error
      if (resProj.error) throw resProj.error

      toast({ title: 'Compra solicitada com sucesso!' })
      window.dispatchEvent(new CustomEvent('kanban_refresh'))
    } catch (err: any) {
      fetchData()
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    }
  }

  return (
    <div className="p-4 sm:p-6 h-full max-w-full">
      <div className="rounded-md border bg-white shadow-sm min-w-[900px] overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
            <TableRow>
              <TableHead className="w-[140px] font-semibold text-slate-700">Código</TableHead>
              <TableHead className="font-semibold text-slate-700">Cliente</TableHead>
              <TableHead className="font-semibold text-slate-700">Ambiente</TableHead>
              <TableHead className="w-[220px] font-semibold text-slate-700">Status</TableHead>
              <TableHead className="w-[200px] font-semibold text-slate-700">Responsável</TableHead>
              <TableHead className="w-[80px] text-center font-semibold text-slate-700">
                Ações
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
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
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-slate-500">
                  Nenhum item encontrado.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id} className="hover:bg-slate-50/50">
                  <TableCell className="font-medium text-slate-900">
                    {item.codigo_rastreio || '-'}
                  </TableCell>
                  <TableCell
                    className="text-slate-600 truncate max-w-[200px]"
                    title={item.cliente?.nome}
                  >
                    {item.cliente?.nome || '-'}
                  </TableCell>
                  <TableCell
                    className="text-slate-600 truncate max-w-[200px]"
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
                        <SelectItem value="unassigned" className="text-slate-400 italic">
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
                        className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                        onClick={() => handleSolicitarCompra(item)}
                        title="Solicitar Compra"
                      >
                        <ShoppingBag className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleDelete(item.id)}
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
