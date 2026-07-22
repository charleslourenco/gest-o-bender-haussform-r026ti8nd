import { useState, useEffect } from 'react'
import { Users, ChevronRight, UserPlus, Loader2, X } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { createNewClientFlow } from '@/services/cliente-form'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ClienteDeleteDialog } from './cliente-delete-dialog'
import { VendasSummaryCard } from './vendas-summary-card'

interface Cliente {
  id: string
  nome: string
  email: string
  telefone: string
}

interface Dossie {
  id: string
  cliente_id: string
  status: string
  criado_em: string
  cliente?: Cliente
}

interface FilterOption {
  id: string
  nome: string
}

interface ClientesListProps {
  onSelect: (dossieId: string) => void
}

export function ClientesList({ onSelect }: ClientesListProps) {
  const { user } = useAuth()
  const [dossies, setDossies] = useState<Dossie[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [totalVendido, setTotalVendido] = useState(0)
  const [numVendas, setNumVendas] = useState(0)

  const [clientes, setClientes] = useState<FilterOption[]>([])
  const [consultores, setConsultores] = useState<FilterOption[]>([])
  const [clienteFilter, setClienteFilter] = useState('all')
  const [consultorFilter, setConsultorFilter] = useState('all')
  const [dataVendaDe, setDataVendaDe] = useState('')
  const [dataVendaAte, setDataVendaAte] = useState('')

  const handleNewClient = async () => {
    setCreating(true)
    try {
      const dossieId = await createNewClientFlow(user?.id || '')
      toast.success('Cliente criado! Preencha o formulário comercial.')
      onSelect(dossieId)
    } catch (e: any) {
      toast.error('Erro ao criar cliente: ' + e.message)
    } finally {
      setCreating(false)
    }
  }

  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const [clientesRes, consultoresRes] = await Promise.all([
          supabase.from('clientes').select('id, nome').order('nome'),
          supabase.from('users').select('id, nome').eq('status', true).order('nome'),
        ])
        if (clientesRes.error) throw clientesRes.error
        if (consultoresRes.error) throw consultoresRes.error
        setClientes(clientesRes.data || [])
        setConsultores(consultoresRes.data || [])
      } catch (e: any) {
        toast.error('Erro ao carregar filtros: ' + e.message)
      }
    }
    fetchFilterOptions()
  }, [])

  useEffect(() => {
    const fetchFilteredData = async () => {
      setLoading(true)
      setSummaryLoading(true)
      try {
        let leadsQuery = supabase.from('leads').select('id')
        if (consultorFilter !== 'all') leadsQuery = leadsQuery.eq('consultor_id', consultorFilter)
        if (dataVendaDe) leadsQuery = leadsQuery.gte('data_venda', dataVendaDe)
        if (dataVendaAte) leadsQuery = leadsQuery.lte('data_venda', `${dataVendaAte}T23:59:59`)

        const { data: filteredLeads, error: leadsError } = await leadsQuery
        if (leadsError) throw leadsError

        const leadIds = (filteredLeads || []).map((l) => l.id)

        if (leadIds.length === 0) {
          setDossies([])
          setTotalVendido(0)
          setNumVendas(0)
          return
        }

        let clientesQuery = supabase.from('clientes').select('id').in('lead_id', leadIds)
        if (clienteFilter !== 'all') clientesQuery = clientesQuery.eq('id', clienteFilter)

        const [formRes, clientesRes] = await Promise.all([
          supabase.from('formulario_comercial').select('valor_total').in('lead_id', leadIds),
          clientesQuery,
        ])

        if (formRes.error) throw formRes.error
        if (clientesRes.error) throw clientesRes.error

        const totalVal = (formRes.data || []).reduce((sum, f) => sum + (f.valor_total || 0), 0)
        setTotalVendido(totalVal)
        setNumVendas(leadIds.length)
        setSummaryLoading(false)

        const clienteIds = (clientesRes.data || []).map((c) => c.id)
        if (clienteIds.length === 0) {
          setDossies([])
          return
        }

        const { data: dossiesData, error: dossiesError } = await supabase
          .from('dossies')
          .select(`
            id, cliente_id, status, criado_em,
            cliente:clientes(id, nome, email, telefone)
          `)
          .in('cliente_id', clienteIds)
          .order('criado_em', { ascending: false })

        if (dossiesError) throw dossiesError
        setDossies((dossiesData as any[]) || [])
      } catch (e: any) {
        toast.error('Erro ao buscar dados: ' + e.message)
      } finally {
        setLoading(false)
        setSummaryLoading(false)
      }
    }
    fetchFilteredData()
  }, [clienteFilter, consultorFilter, dataVendaDe, dataVendaAte])

  const handleClearFilters = () => {
    setClienteFilter('all')
    setConsultorFilter('all')
    setDataVendaDe('')
    setDataVendaAte('')
  }

  const hasActiveFilters =
    clienteFilter !== 'all' || consultorFilter !== 'all' || dataVendaDe || dataVendaAte

  return (
    <div className="flex flex-col h-full bg-background/50">
      <div className="bg-card border border-border rounded-xl m-6 p-6 flex flex-col md:flex-row items-start md:items-center gap-4 text-card-foreground shadow-sm shrink-0">
        <div className="bg-primary/20 p-3 rounded-lg">
          <Users className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
          <p className="text-muted-foreground">Gerencie o histórico e dossiês dos clientes</p>
        </div>
        <Button onClick={handleNewClient} disabled={creating} className="shrink-0">
          {creating ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <UserPlus className="w-4 h-4 mr-2" />
          )}
          Novo Cliente
        </Button>
      </div>

      <div className="px-6 pb-6 flex-1 flex flex-col gap-4 min-h-0">
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm shrink-0">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1.5 min-w-[180px] flex-1">
              <Label className="text-xs font-medium text-muted-foreground">Cliente</Label>
              <Select value={clienteFilter} onValueChange={setClienteFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5 min-w-[180px] flex-1">
              <Label className="text-xs font-medium text-muted-foreground">Consultor</Label>
              <Select value={consultorFilter} onValueChange={setConsultorFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {consultores.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Data Venda De</Label>
              <Input
                type="date"
                value={dataVendaDe}
                onChange={(e) => setDataVendaDe(e.target.value)}
                className="bg-background w-[150px]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Data Venda Até</Label>
              <Input
                type="date"
                value={dataVendaAte}
                onChange={(e) => setDataVendaAte(e.target.value)}
                className="bg-background w-[150px]"
              />
            </div>

            <Button
              variant="outline"
              onClick={handleClearFilters}
              disabled={!hasActiveFilters}
              className="shrink-0"
            >
              <X className="w-4 h-4 mr-2" />
              Limpar Filtros
            </Button>
          </div>
        </div>

        <VendasSummaryCard
          totalVendido={totalVendido}
          numVendas={numVendas}
          loading={summaryLoading}
        />

        <div className="flex-1 overflow-auto bg-card rounded-xl border border-border shadow-sm">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10 shadow-sm border-b border-border">
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data de Criação</TableHead>
                <TableHead className="w-[100px] text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    Carregando dossiês...
                  </TableCell>
                </TableRow>
              ) : dossies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-40 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Users className="w-8 h-8 mb-2 opacity-20" />
                      <p>Nenhum cliente encontrado com os filtros aplicados.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                dossies.map((dossie) => (
                  <TableRow
                    key={dossie.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors group"
                    onClick={() => onSelect(dossie.id)}
                  >
                    <TableCell className="font-medium group-hover:text-primary transition-colors">
                      {dossie.cliente?.nome || 'Sem nome'}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm text-foreground">
                          {dossie.cliente?.email || '-'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {dossie.cliente?.telefone || '-'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground capitalize">
                        {dossie.status.replace(/_/g, ' ')}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(dossie.criado_em), "dd 'de' MMM, yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <ClienteDeleteDialog
                          clienteId={dossie.cliente_id}
                          clienteNome={dossie.cliente?.nome}
                          onDeleted={() => {
                            toast.success('Cliente excluído com sucesso.')
                            setClienteFilter('all')
                            setConsultorFilter('all')
                          }}
                          triggerClassName="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="group-hover:text-primary group-hover:bg-primary/10"
                          onClick={(e) => {
                            e.stopPropagation()
                            onSelect(dossie.id)
                          }}
                        >
                          <ChevronRight className="w-4 h-4" />
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
    </div>
  )
}
