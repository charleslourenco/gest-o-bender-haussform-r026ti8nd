import { useState, useEffect, useCallback } from 'react'
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
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'

export interface KanbanColumn {
  id: string
  title: string
}

export function KanbanListView({
  searchQuery = '',
  columns = [],
}: {
  searchQuery?: string
  columns?: KanbanColumn[]
}) {
  const [cards, setCards] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchCards = useCallback(async () => {
    const { data, error } = await supabase
      .from('produtos_servicos_projeto')
      .select(`
        *,
        cliente:clientes(nome)
      `)
      .order('criado_em', { ascending: false })

    if (error) {
      console.error('Erro ao buscar itens:', error)
      toast.error('Erro ao buscar itens')
    } else if (data) {
      setCards(data)
    }
    setLoading(false)
  }, [])

  const fetchUsers = useCallback(async () => {
    const { data, error } = await supabase.from('users').select('id, nome').eq('status', true)
    if (error) {
      console.error('Erro ao buscar usuários:', error)
    } else if (data) {
      setUsers(data)
    }
  }, [])

  useEffect(() => {
    fetchCards()
    fetchUsers()

    const handleUpdate = () => fetchCards()
    window.addEventListener('kanban_updated', handleUpdate)
    return () => window.removeEventListener('kanban_updated', handleUpdate)
  }, [fetchCards, fetchUsers])

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from('produtos_servicos_projeto')
      .update({ status_analise: status })
      .eq('id', id)
    if (error) {
      toast.error('Erro ao atualizar status')
    } else {
      toast.success('Status atualizado')
      fetchCards()
      window.dispatchEvent(new Event('kanban_updated'))
    }
  }

  const updateAnalista = async (id: string, analista_id: string) => {
    const val = analista_id === 'unassigned' ? null : analista_id
    const { error } = await supabase
      .from('produtos_servicos_projeto')
      .update({ analista_id: val })
      .eq('id', id)
    if (error) {
      toast.error('Erro ao atualizar responsável')
    } else {
      toast.success('Responsável atualizado')
      fetchCards()
      window.dispatchEvent(new Event('kanban_updated'))
    }
  }

  const deleteCard = async (id: string) => {
    if (!confirm('Deseja realmente excluir este item?')) return
    const { error } = await supabase.from('produtos_servicos_projeto').delete().eq('id', id)
    if (error) {
      toast.error('Erro ao excluir')
    } else {
      toast.success('Item excluído')
      fetchCards()
      window.dispatchEvent(new Event('kanban_updated'))
    }
  }

  const filtered = cards.filter((c) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    const clienteNome = Array.isArray(c.cliente) ? c.cliente[0]?.nome : c.cliente?.nome
    return (
      c.nome_produto?.toLowerCase().includes(q) ||
      c.codigo_rastreio?.toLowerCase().includes(q) ||
      clienteNome?.toLowerCase().includes(q)
    )
  })

  if (loading) {
    return <div className="p-8 text-center text-[#1A3D63]/70 font-medium">Carregando itens...</div>
  }

  return (
    <div className="p-4">
      <div className="bg-white rounded-md shadow-sm border border-slate-200 overflow-hidden">
        <Table>
          <TableHeader className="bg-[#0A1931]">
            <TableRow className="hover:bg-[#0A1931]">
              <TableHead className="text-white font-semibold whitespace-nowrap">Código</TableHead>
              <TableHead className="text-white font-semibold">Cliente</TableHead>
              <TableHead className="text-white font-semibold">Produto</TableHead>
              <TableHead className="text-white font-semibold w-[200px]">Status</TableHead>
              <TableHead className="text-white font-semibold w-[200px]">Responsável</TableHead>
              <TableHead className="text-white font-semibold text-right w-[80px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                  Nenhum item encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((card) => {
                const clienteNome = Array.isArray(card.cliente)
                  ? card.cliente[0]?.nome
                  : card.cliente?.nome
                return (
                  <TableRow
                    key={card.id}
                    className="bg-white hover:bg-slate-50 text-[#1A3D63] border-b border-slate-100 transition-colors"
                  >
                    <TableCell className="font-medium whitespace-nowrap">
                      {card.codigo_rastreio || '-'}
                    </TableCell>
                    <TableCell className="font-medium">{clienteNome || 'Avulso'}</TableCell>
                    <TableCell>{card.nome_produto}</TableCell>
                    <TableCell>
                      <Select
                        value={card.status_analise || 'iniciar'}
                        onValueChange={(val) => updateStatus(card.id, val)}
                      >
                        <SelectTrigger className="w-full h-8 bg-white text-[#1A3D63] border-slate-200 focus:ring-steel-blue">
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
                        value={card.analista_id || 'unassigned'}
                        onValueChange={(val) => updateAnalista(card.id, val)}
                      >
                        <SelectTrigger className="w-full h-8 bg-white text-[#1A3D63] border-slate-200 focus:ring-steel-blue">
                          <SelectValue placeholder="Não atribuído" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Não atribuído</SelectItem>
                          {users.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteCard(card.id)}
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
