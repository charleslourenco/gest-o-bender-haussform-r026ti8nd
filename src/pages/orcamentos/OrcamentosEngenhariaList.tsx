import React, { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Search,
  Plus,
  Edit,
  Copy,
  Trash2,
  FolderOpen,
  AlertCircle,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  CalendarIcon,
} from 'lucide-react'
import { format, subDays, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { useToast } from '@/hooks/use-toast'

import { supabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

export default function OrcamentosEngenhariaList() {
  const navigate = useNavigate()
  const { toast } = useToast()

  // State
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [clientFilter, setClientFilter] = useState('all')
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date } | undefined>()

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(false)
      const { data: orcamentos, error: err } = await supabase
        .from('orcamentos_engenharia')
        .select(`
          id,
          nome,
          status,
          criado_em,
          desconto,
          clientes ( id, nome ),
          orcamentos_ambientes (
            nome,
            orcamentos_itens (
              quantidade,
              custo_unitario,
              markup
            )
          )
        `)
        .order('criado_em', { ascending: false })

      if (err) throw err

      const formattedData = orcamentos.map((orc: any) => {
        let total = 0
        const ambientes = orc.orcamentos_ambientes || []
        ambientes.forEach((amb: any) => {
          const itens = amb.orcamentos_itens || []
          itens.forEach((item: any) => {
            total += (item.quantidade || 0) * (item.custo_unitario || 0) * (item.markup || 1)
          })
        })
        total -= orc.desconto || 0

        return {
          ...orc,
          clienteNome: orc.clientes?.nome || 'Sem Cliente',
          clienteId: orc.clientes?.id,
          ambientesNomes: ambientes.map((a: any) => a.nome).join(', ') || 'Nenhum',
          valorTotal: Math.max(0, total),
        }
      })

      setData(formattedData)
    } catch (err) {
      console.error(err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Memos for filters
  const uniqueClients = useMemo(() => {
    const clientsMap = new Map()
    data.forEach((item) => {
      if (item.clienteId && item.clienteNome) {
        clientsMap.set(item.clienteId, item.clienteNome)
      }
    })
    return Array.from(clientsMap.entries()).map(([id, nome]) => ({ id, nome }))
  }, [data])

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      // Search
      const matchesSearch =
        item.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.clienteNome.toLowerCase().includes(searchTerm.toLowerCase())

      if (!matchesSearch) return false

      // Status
      if (statusFilter !== 'all' && item.status.toLowerCase() !== statusFilter.toLowerCase())
        return false

      // Client
      if (clientFilter !== 'all' && item.clienteId !== clientFilter) return false

      // Date
      const itemDate = new Date(item.criado_em)
      if (dateFilter === '7days') {
        if (isBefore(itemDate, startOfDay(subDays(new Date(), 7)))) return false
      } else if (dateFilter === '30days') {
        if (isBefore(itemDate, startOfDay(subDays(new Date(), 30)))) return false
      } else if (dateFilter === 'custom' && dateRange?.from) {
        if (isBefore(itemDate, startOfDay(dateRange.from))) return false
        if (dateRange.to && isAfter(itemDate, endOfDay(dateRange.to))) return false
      }

      return true
    })
  }, [data, searchTerm, statusFilter, clientFilter, dateFilter, dateRange])

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage)
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter, clientFilter, dateFilter, dateRange])

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('orcamentos_engenharia').delete().eq('id', id)
      if (error) throw error
      toast({ title: 'Orçamento deletado', description: 'O orçamento foi removido com sucesso.' })
      fetchData()
    } catch (error: any) {
      toast({ title: 'Erro ao deletar', description: error.message, variant: 'destructive' })
    }
  }

  const handleDuplicate = async (id: string) => {
    toast({ title: 'Duplicar', description: 'Função de duplicação em desenvolvimento.' })
  }

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'rascunho':
        return (
          <Badge variant="secondary" className="bg-gray-100 text-gray-800 hover:bg-gray-200">
            Rascunho
          </Badge>
        )
      case 'enviado':
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-200">
            Enviado
          </Badge>
        )
      case 'aprovado':
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200">
            Aprovado
          </Badge>
        )
      case 'rejeitado':
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-800 hover:bg-red-200">
            Rejeitado
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), 'dd/MM/yyyy', { locale: ptBR })
  }

  return (
    <div className="flex flex-col gap-6 p-6 animate-fade-in w-full h-full bg-background">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Orçamentos</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie e acompanhe todos os orçamentos de engenharia.
          </p>
        </div>
        <Button onClick={() => navigate('/orcamentos/novo')} className="w-full md:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Novo Orçamento
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-end bg-card p-4 rounded-xl border border-border/50 shadow-sm">
        <div className="flex-1 w-full relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por ID, Nome ou Cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 w-full bg-background"
          />
        </div>

        <div className="flex flex-wrap md:flex-nowrap gap-3 w-full md:w-auto">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[160px] bg-background">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="rascunho">Rascunho</SelectItem>
              <SelectItem value="enviado">Enviado</SelectItem>
              <SelectItem value="aprovado">Aprovado</SelectItem>
              <SelectItem value="rejeitado">Rejeitado</SelectItem>
            </SelectContent>
          </Select>

          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="w-full md:w-[180px] bg-background">
              <SelectValue placeholder="Cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Clientes</SelectItem>
              {uniqueClients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-2 w-full md:w-auto">
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-full md:w-[160px] bg-background">
                <SelectValue placeholder="Data" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Qualquer data</SelectItem>
                <SelectItem value="7days">Últimos 7 dias</SelectItem>
                <SelectItem value="30days">Últimos 30 dias</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>

            {dateFilter === 'custom' && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'bg-background justify-start text-left font-normal',
                      !dateRange && 'text-muted-foreground',
                    )}
                  >
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, 'dd/MM/yy')} - {format(dateRange.to, 'dd/MM/yy')}
                        </>
                      ) : (
                        format(dateRange.from, 'dd/MM/yy')
                      )
                    ) : (
                      <span>Selecione</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange as any}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-[400px]">
        {loading ? (
          <div className="space-y-4">
            <div className="hidden md:block border rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Ambiente</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Valor Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-20 rounded-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-8 w-8 rounded-md" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="md:hidden space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-4 space-y-3">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] border border-dashed rounded-xl bg-card">
            <AlertCircle className="w-12 h-12 text-destructive mb-4" />
            <h3 className="text-lg font-medium text-foreground">Erro ao carregar orçamentos.</h3>
            <p className="text-muted-foreground mb-4">
              Ocorreu um problema ao buscar os dados do servidor. Tente novamente.
            </p>
            <Button onClick={fetchData}>Tentar novamente</Button>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] border border-dashed rounded-xl bg-card">
            <FolderOpen className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground">Nenhum orçamento criado ainda</h3>
            <p className="text-muted-foreground mb-4 text-center max-w-sm">
              Crie seu primeiro orçamento ou ajuste os filtros para encontrar registros existentes.
            </p>
            <Button onClick={() => navigate('/orcamentos/novo')}>Criar Primeiro Orçamento</Button>
          </div>
        ) : (
          <div className="space-y-4 animate-fade-in-up">
            <div className="hidden md:block rounded-xl border border-border/50 bg-card overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="w-[100px]">ID do Orçamento</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Ambiente</TableHead>
                    <TableHead>Data de Criação</TableHead>
                    <TableHead>Valor Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((orc) => (
                    <TableRow key={orc.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        <Link
                          to={`/orcamentos/${orc.id}`}
                          className="hover:text-primary hover:underline"
                        >
                          {orc.id.substring(0, 8).toUpperCase()}
                        </Link>
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        {orc.clienteNome}
                      </TableCell>
                      <TableCell className="text-muted-foreground truncate max-w-[200px]">
                        {orc.ambientesNomes}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(orc.criado_em)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(orc.valorTotal)}
                      </TableCell>
                      <TableCell>{getStatusBadge(orc.status)}</TableCell>
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
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => navigate(`/orcamentos/${orc.id}`)}>
                              <Edit className="w-4 h-4 mr-2 text-muted-foreground" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicate(orc.id)}>
                              <Copy className="w-4 h-4 mr-2 text-muted-foreground" />
                              Duplicar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete(orc.id)}
                              className="text-destructive focus:bg-destructive/10"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Deletar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="md:hidden space-y-4">
              {paginatedData.map((orc) => (
                <Card key={orc.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">
                          ID:{' '}
                          <Link
                            to={`/orcamentos/${orc.id}`}
                            className="font-mono hover:text-primary"
                          >
                            {orc.id.substring(0, 8).toUpperCase()}
                          </Link>
                        </p>
                        <h4 className="font-bold text-foreground text-lg leading-tight">
                          {orc.clienteNome}
                        </h4>
                      </div>
                      {getStatusBadge(orc.status)}
                    </div>

                    <div className="grid grid-cols-2 gap-y-2 text-sm mt-4">
                      <div>
                        <span className="text-muted-foreground block text-xs">Ambiente</span>
                        <span className="font-medium text-foreground truncate block">
                          {orc.ambientesNomes}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-xs">Data</span>
                        <span className="font-medium text-foreground">
                          {formatDate(orc.criado_em)}
                        </span>
                      </div>
                      <div className="col-span-2 mt-2 pt-2 border-t">
                        <span className="text-muted-foreground block text-xs">Valor Total</span>
                        <span className="font-bold text-lg text-foreground">
                          {formatCurrency(orc.valorTotal)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2 pt-4 border-t border-border/50">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => navigate(`/orcamentos/${orc.id}`)}
                      >
                        <Edit className="w-4 h-4 mr-2" /> Editar
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="w-10 px-0">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleDuplicate(orc.id)}>
                            <Copy className="w-4 h-4 mr-2" /> Duplicar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(orc.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Deletar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <p className="text-sm text-muted-foreground hidden sm:block">
                  Mostrando{' '}
                  <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> a{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * itemsPerPage, filteredData.length)}
                  </span>{' '}
                  de <span className="font-medium">{filteredData.length}</span> resultados
                </p>
                <div className="flex gap-2 w-full sm:w-auto justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Próxima <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
