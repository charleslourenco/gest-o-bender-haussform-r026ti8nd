import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Plus, Search, Trash2, Edit } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export default function ListasMateriaisList() {
  const [lists, setLists] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const { toast } = useToast()

  const fetchLists = async () => {
    setLoading(true)
    let q = supabase
      .from('listas_materiais')
      .select('*, cliente:clientes(nome)')
      .order('data_criacao', { ascending: false })

    if (statusFilter !== 'all') {
      q = q.eq('status', statusFilter)
    }
    if (startDate) {
      q = q.gte('data_criacao', `${startDate}T00:00:00Z`)
    }
    if (endDate) {
      q = q.lte('data_criacao', `${endDate}T23:59:59Z`)
    }

    const { data, error } = await q
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    } else {
      let filtered = data || []
      if (search) {
        const lower = search.toLowerCase()
        filtered = filtered.filter(
          (l) =>
            (Array.isArray(l.cliente) ? l.cliente[0]?.nome : l.cliente?.nome)
              ?.toLowerCase()
              .includes(lower) ||
            l.ambiente?.toLowerCase().includes(lower) ||
            false,
        )
      }
      setLists(filtered)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchLists()
  }, [statusFilter, startDate, endDate, search])

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta lista?')) return
    const { error } = await supabase.from('listas_materiais').delete().eq('id', id)
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Sucesso', description: 'Lista excluída com sucesso' })
      fetchLists()
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Listas de Materiais</h1>
          <p className="text-muted-foreground">
            Gerencie as listas de materiais para projetos e produção
          </p>
        </div>
        <Button asChild>
          <Link to="/listas-materiais/nova">
            <Plus className="w-4 h-4 mr-2" />
            Nova Lista
          </Link>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-end bg-card p-4 rounded-lg border shadow-sm">
        <div className="space-y-1 flex-1 min-w-[200px]">
          <label className="text-sm font-medium">Buscar (Cliente/Ambiente)</label>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              placeholder="Ex: João, Cozinha..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="space-y-1 w-full sm:w-48">
          <label className="text-sm font-medium">Status</label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="Rascunho">Rascunho</SelectItem>
              <SelectItem value="Finalizada">Finalizada</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 w-full sm:w-40">
          <label className="text-sm font-medium">Data Início</label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="space-y-1 w-full sm:w-40">
          <label className="text-sm font-medium">Data Fim</label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>

      <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Ambiente</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : lists.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Nenhuma lista criada ainda
                </TableCell>
              </TableRow>
            ) : (
              lists.map((list) => {
                const cName = Array.isArray(list.cliente)
                  ? list.cliente[0]?.nome
                  : list.cliente?.nome
                return (
                  <TableRow key={list.id}>
                    <TableCell className="font-medium">{cName || 'N/A'}</TableCell>
                    <TableCell>{list.ambiente || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={list.status === 'Finalizada' ? 'default' : 'secondary'}>
                        {list.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(list.data_criacao).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" asChild>
                        <Link to={`/listas-materiais/${list.id}`}>
                          <Edit className="w-4 h-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(list.id)}
                        className="text-red-500"
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
