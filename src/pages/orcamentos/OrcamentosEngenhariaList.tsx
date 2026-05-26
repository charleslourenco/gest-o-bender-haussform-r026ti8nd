import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { Search, Plus, MoreHorizontal, Eye, Trash2 } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent } from '@/components/ui/card'

interface Orcamento {
  id: string
  ambiente: string
  status: string
  valor_total: number
  data_criacao: string
  clientes?: {
    nome: string
  }
}

export default function OrcamentosEngenhariaList() {
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')

  const { toast } = useToast()

  const fetchOrcamentos = async () => {
    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('orcamentos')
        .select(`
          id,
          ambiente,
          status,
          valor_total,
          data_criacao,
          clientes (
            nome
          )
        `)
        .order('data_criacao', { ascending: false })

      if (statusFilter !== 'todos') {
        query = query.eq('status', statusFilter)
      }

      const { data, error: dbError } = await query

      if (dbError) throw dbError

      setOrcamentos(data as any)
    } catch (err: any) {
      setError('Erro ao carregar orçamentos.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrcamentos()
  }, [statusFilter])

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este orçamento?')) return

    try {
      const { error } = await supabase.from('orcamentos').delete().eq('id', id)
      if (error) throw error

      toast({ title: 'Sucesso', description: 'Orçamento excluído com sucesso.' })
      fetchOrcamentos()
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o orçamento.',
        variant: 'destructive',
      })
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Rascunho':
        return (
          <Badge className="bg-slate-100 text-slate-800 hover:bg-slate-200 border-transparent">
            {status}
          </Badge>
        )
      case 'Enviado':
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-transparent">
            {status}
          </Badge>
        )
      case 'Aprovado':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-transparent">
            {status}
          </Badge>
        )
      case 'Rejeitado':
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-200 border-transparent">
            {status}
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const filteredOrcamentos = orcamentos.filter((orc) => {
    const term = searchTerm.toLowerCase()
    const cliName = orc.clientes?.nome?.toLowerCase() || ''
    const ambiente = orc.ambiente?.toLowerCase() || ''

    return cliName.includes(term) || ambiente.includes(term)
  })

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orçamentos</h1>
          <p className="text-muted-foreground">Gerencie seus orçamentos e listas de materiais.</p>
        </div>
        <Button asChild>
          <Link to="/orcamentos/novo">
            <Plus className="w-4 h-4 mr-2" />
            Novo Orçamento
          </Link>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 bg-card p-4 rounded-lg border shadow-sm">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente ou ambiente..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="w-full sm:w-[200px]">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Status</SelectItem>
              <SelectItem value="Rascunho">Rascunho</SelectItem>
              <SelectItem value="Enviado">Enviado</SelectItem>
              <SelectItem value="Aprovado">Aprovado</SelectItem>
              <SelectItem value="Rejeitado">Rejeitado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div>}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : filteredOrcamentos.length === 0 ? (
        <div className="text-center py-12 bg-card border rounded-lg shadow-sm">
          <p className="text-muted-foreground mb-4">Nenhum orçamento encontrado.</p>
          <Button
            variant="outline"
            onClick={() => {
              setSearchTerm('')
              setStatusFilter('todos')
            }}
          >
            Limpar Filtros
          </Button>
        </div>
      ) : (
        <>
          <div className="hidden md:block rounded-md border bg-card shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">ID</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Ambiente</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Valor Total</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrcamentos.map((orcamento) => (
                  <TableRow key={orcamento.id}>
                    <TableCell className="font-medium">
                      <Link
                        to={`/orcamentos/${orcamento.id}`}
                        className="text-primary hover:underline"
                      >
                        {orcamento.id.split('-')[0].toUpperCase()}
                      </Link>
                    </TableCell>
                    <TableCell>{orcamento.clientes?.nome || 'N/A'}</TableCell>
                    <TableCell>{orcamento.ambiente || 'N/A'}</TableCell>
                    <TableCell>{getStatusBadge(orcamento.status)}</TableCell>
                    <TableCell>{formatCurrency(orcamento.valor_total)}</TableCell>
                    <TableCell>{format(new Date(orcamento.data_criacao), 'dd/MM/yyyy')}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Ações</DropdownMenuLabel>
                          <DropdownMenuItem asChild>
                            <Link
                              to={`/orcamentos/${orcamento.id}`}
                              className="cursor-pointer flex items-center w-full"
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Visualizar
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(orcamento.id)}
                            className="text-red-600 focus:text-red-600 cursor-pointer"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="grid grid-cols-1 gap-4 md:hidden">
            {filteredOrcamentos.map((orcamento) => (
              <Card key={orcamento.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <Link
                      to={`/orcamentos/${orcamento.id}`}
                      className="text-primary font-medium hover:underline"
                    >
                      #{orcamento.id.split('-')[0].toUpperCase()}
                    </Link>
                    {getStatusBadge(orcamento.status)}
                  </div>
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="text-muted-foreground">Cliente:</span>{' '}
                      {orcamento.clientes?.nome || 'N/A'}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Ambiente:</span>{' '}
                      {orcamento.ambiente || 'N/A'}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Data:</span>{' '}
                      {format(new Date(orcamento.data_criacao), 'dd/MM/yyyy')}
                    </p>
                    <p className="font-semibold mt-2">{formatCurrency(orcamento.valor_total)}</p>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button variant="outline" size="sm" asChild className="mr-2">
                      <Link to={`/orcamentos/${orcamento.id}`}>
                        <Eye className="w-4 h-4 mr-2" />
                        Ver
                      </Link>
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(orcamento.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
