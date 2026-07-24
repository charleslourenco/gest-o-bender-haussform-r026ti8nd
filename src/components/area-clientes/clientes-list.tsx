import { useState, useEffect } from 'react'
import { Users, ChevronRight, UserPlus, Loader2, X, FolderSearch } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { createNewClientFlow } from '@/services/cliente-form'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { RecuperarClienteDialog } from './recuperar-cliente-dialog'
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
import { formatCurrency } from '@/lib/utils'

interface FilterOption {
  id: string
  nome: string
}

interface LeadRelation {
  id: string
  consultor_id: string | null
  consultor: { id: string; nome: string } | null
  formulario_comercial: {
    id: string
    valor_total: number | null
    data_venda: string | null
  } | null
}

interface ClienteRow {
  id: string
  nome: string
  email: string
  telefone: string
  leads: LeadRelation | null
  dossies: { id: string; status: string; criado_em: string }[] | null
}

interface ClientesListProps {
  onSelect: (dossieId: string) => void
}

function normalizeLead(raw: any): LeadRelation | null {
  if (!raw) return null
  const lead = Array.isArray(raw) ? raw[0] : raw
  if (!lead) return null
  const consultor = Array.isArray(lead.consultor) ? lead.consultor[0] : lead.consultor
  const form = Array.isArray(lead.formulario_comercial)
    ? lead.formulario_comercial[0]
    : lead.formulario_comercial
  const datas = form?.datas as { data_venda?: string } | null | undefined
  const dataVenda = datas?.data_venda || null
  return {
    id: lead.id,
    consultor_id: lead.consultor_id,
    consultor: consultor || null,
    formulario_comercial: form
      ? {
          id: form.id,
          valor_total: form.valor_total,
          data_venda: dataVenda,
        }
      : null,
  }
}

export function ClientesList({ onSelect }: ClientesListProps) {
  const { user, permissions } = useAuth()
  const [clientesData, setClientesData] = useState<ClienteRow[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [totalVendido, setTotalVendido] = useState(0)
  const [numVendas, setNumVendas] = useState(0)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [recuperarOpen, setRecuperarOpen] = useState(false)

  const nivelClientes = permissions?.['Clientes'] || permissions?.['Área de Clientes'] || ''
  const canRecuperar = nivelClientes ? nivelClientes.toLowerCase() === 'admin' : false

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
        let query = supabase.from('clientes').select(`
            id, nome, email, telefone,
            leads!lead_id(
              id, consultor_id,
              consultor:users!leads_consultor_id_fkey(id, nome),
              formulario_comercial!lead_id(id, valor_total, datas)
            ),
            dossies(id, status, criado_em)
          `)

        if (clienteFilter !== 'all') {
          query = query.eq('id', clienteFilter)
        }
        if (consultorFilter !== 'all') {
          query = query.eq('leads.consultor_id', consultorFilter)
        }

        const { data, error } = await query.order('nome')
        if (error) throw error

        const rawData = (data as any[]) || []

        const normalized: ClienteRow[] = rawData.map((c) => ({
          id: c.id,
          nome: c.nome,
          email: c.email,
          telefone: c.telefone,
          leads: normalizeLead(c.leads),
          dossies: Array.isArray(c.dossies) ? c.dossies : c.dossies ? [c.dossies] : [],
        }))

        const withForm = normalized.filter((c) => c.leads?.formulario_comercial)

        const inPeriod = withForm.filter((c) => {
          const dv = c.leads?.formulario_comercial?.data_venda
          if (!dv) return true
          if (dataVendaDe && dv < dataVendaDe) return false
          if (dataVendaAte && dv > dataVendaAte) return false
          return true
        })
        setClientesData(inPeriod)

        const formIds = new Set<string>()
        let total = 0
        inPeriod.forEach((c) => {
          const f = c.leads!.formulario_comercial!
          if (f.id && !formIds.has(f.id)) {
            formIds.add(f.id)
            total += f.valor_total || 0
          }
        })
        setTotalVendido(total)
        setNumVendas(formIds.size)
      } catch (e: any) {
        toast.error('Erro ao buscar dados: ' + e.message)
        setClientesData([])
        setTotalVendido(0)
        setNumVendas(0)
      } finally {
        setLoading(false)
        setSummaryLoading(false)
      }
    }
    fetchFilteredData()
  }, [clienteFilter, consultorFilter, dataVendaDe, dataVendaAte, refreshTrigger])

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
        <div className="flex items-center gap-2 shrink-0">
          {canRecuperar && (
            <Button
              variant="outline"
              onClick={() => setRecuperarOpen(true)}
              className="shrink-0"
              title="Recuperar documentos de clientes excluídos"
            >
              <FolderSearch className="w-4 h-4 mr-2" />
              Recuperar Cliente
            </Button>
          )}
          <Button onClick={handleNewClient} disabled={creating} className="shrink-0">
            {creating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <UserPlus className="w-4 h-4 mr-2" />
            )}
            Novo Cliente
          </Button>
        </div>
      </div>

      <RecuperarClienteDialog
        open={recuperarOpen}
        onOpenChange={setRecuperarOpen}
        onRecovered={(clientId) => {
          setRecuperarOpen(false)
          setRefreshTrigger((prev) => prev + 1)
          onSelect(clientId)
        }}
      />

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
                <TableHead>Consultor</TableHead>
                <TableHead>Data Venda</TableHead>
                <TableHead className="text-right">Valor Total</TableHead>
                <TableHead className="w-[100px] text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    Carregando clientes...
                  </TableCell>
                </TableRow>
              ) : clientesData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-40 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Users className="w-8 h-8 mb-2 opacity-20" />
                      <p>Nenhum cliente encontrado com os filtros aplicados.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                clientesData.map((cliente) => {
                  const dossieId = cliente.dossies?.[0]?.id || cliente.id
                  return (
                    <TableRow
                      key={cliente.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors group"
                      onClick={() => onSelect(dossieId)}
                    >
                      <TableCell className="font-medium group-hover:text-primary transition-colors">
                        {cliente.nome || 'Sem nome'}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm text-foreground">{cliente.email || '-'}</span>
                          <span className="text-xs text-muted-foreground">
                            {cliente.telefone || '-'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {cliente.leads?.consultor?.nome || '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {cliente.leads?.formulario_comercial?.data_venda
                          ? format(
                              new Date(
                                cliente.leads.formulario_comercial.data_venda + 'T12:00:00Z',
                              ),
                              "dd 'de' MMM, yyyy",
                              { locale: ptBR },
                            )
                          : '—'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {cliente.leads?.formulario_comercial?.valor_total != null
                          ? formatCurrency(cliente.leads.formulario_comercial.valor_total)
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <ClienteDeleteDialog
                            clienteId={cliente.id}
                            clienteNome={cliente.nome}
                            onDeleted={() => {
                              toast.success('Cliente excluído com sucesso.')
                              setRefreshTrigger((prev) => prev + 1)
                            }}
                            triggerClassName="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="group-hover:text-primary group-hover:bg-primary/10"
                            onClick={(e) => {
                              e.stopPropagation()
                              onSelect(dossieId)
                            }}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
