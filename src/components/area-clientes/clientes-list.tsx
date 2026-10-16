import { useState, useEffect } from 'react'
import {
  Users,
  ChevronRight,
  X,
  FolderSearch,
  HelpCircle,
  ChevronDown,
  Check,
  Calendar as CalendarIcon,
  RotateCcw,
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { runWithAuthRecovery } from '@/lib/supabase/auth-recovery'
import { buscarTodasPaginas } from '@/lib/supabase/buscar-todas-paginas'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ClienteDeleteDialog } from './cliente-delete-dialog'
import { VendasSummaryCard } from './vendas-summary-card'
import { formatCurrency } from '@/lib/utils'

interface FilterOption {
  id: string
  nome: string
}

interface VendaResumo {
  id: string
  cliente_id: string
  lead_id: string | null
  valor_total: number | null
  data_venda: string | null
  criado_em: string | null
  consultor_id: string | null
  consultor_nome: string | null
  dossie_id: string | null
}

interface ClienteRow {
  id: string
  nome: string
  email: string
  telefone: string
  vendas: VendaResumo[]
  numVendas: number
  ultimaDataVenda: string | null
  valorTotal: number
  consultorNome: string
  dossieId: string
}

interface ClientesListProps {
  onSelect: (dossieId: string) => void
}

interface PeriodPreset {
  id: string
  label: string
  getRange: () => { de: string; ate: string }
}

const PERIOD_PRESETS: PeriodPreset[] = [
  {
    id: 'hoje',
    label: 'Hoje',
    getRange: () => {
      const today = format(new Date(), 'yyyy-MM-dd')
      return { de: today, ate: today }
    },
  },
  {
    id: 'ontem',
    label: 'Ontem',
    getRange: () => {
      const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')
      return { de: yesterday, ate: yesterday }
    },
  },
  {
    id: '7dias',
    label: 'Últimos 7 dias',
    getRange: () => {
      const now = new Date()
      return {
        de: format(subDays(now, 6), 'yyyy-MM-dd'),
        ate: format(now, 'yyyy-MM-dd'),
      }
    },
  },
  {
    id: '30dias',
    label: 'Últimos 30 dias',
    getRange: () => {
      const now = new Date()
      return {
        de: format(subDays(now, 29), 'yyyy-MM-dd'),
        ate: format(now, 'yyyy-MM-dd'),
      }
    },
  },
  {
    id: 'este_mes',
    label: 'Este mês',
    getRange: () => {
      const now = new Date()
      return {
        de: format(startOfMonth(now), 'yyyy-MM-dd'),
        ate: format(endOfMonth(now), 'yyyy-MM-dd'),
      }
    },
  },
  {
    id: 'mes_passado',
    label: 'Mês passado',
    getRange: () => {
      const lastMonth = subMonths(new Date(), 1)
      return {
        de: format(startOfMonth(lastMonth), 'yyyy-MM-dd'),
        ate: format(endOfMonth(lastMonth), 'yyyy-MM-dd'),
      }
    },
  },
]

function parseVendaItem(raw: any): VendaResumo {
  const cliente = Array.isArray(raw.cliente) ? raw.cliente[0] : raw.cliente
  const lead = Array.isArray(raw.lead) ? raw.lead[0] : raw.lead
  const consultor = Array.isArray(lead?.consultor) ? lead?.consultor[0] : lead?.consultor
  const dossies = Array.isArray(raw.dossies) ? raw.dossies : raw.dossies ? [raw.dossies] : []
  const datas = raw.datas as { data_venda?: string } | null | undefined
  const dataVenda = datas?.data_venda || null

  return {
    id: raw.id,
    cliente_id: raw.cliente_id || cliente?.id,
    lead_id: raw.lead_id || lead?.id || null,
    valor_total: raw.valor_total != null ? Number(raw.valor_total) : 0,
    data_venda: dataVenda,
    criado_em: raw.criado_em || null,
    consultor_id: lead?.consultor_id || consultor?.id || null,
    consultor_nome: consultor?.nome?.trim() || null,
    dossie_id: dossies[0]?.id || null,
  }
}

export function ClientesList({ onSelect }: ClientesListProps) {
  const { permissions, isAdmin } = useAuth()
  const [clientesData, setClientesData] = useState<ClienteRow[]>([])
  const [loading, setLoading] = useState(true)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [totalVendido, setTotalVendido] = useState(0)
  const [numVendas, setNumVendas] = useState(0)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [recuperarOpen, setRecuperarOpen] = useState(false)
  const [ajudaCadastroOpen, setAjudaCadastroOpen] = useState(false)

  const nivelClientes = permissions?.['Clientes'] || permissions?.['Área de Clientes'] || ''
  const canRecuperar = nivelClientes ? nivelClientes.toLowerCase() === 'admin' : false

  const [clientes, setClientes] = useState<FilterOption[]>([])
  const [consultores, setConsultores] = useState<FilterOption[]>([])
  const [clienteFilter, setClienteFilter] = useState('all')
  const [consultorFilter, setConsultorFilter] = useState('all')
  const [dataVendaDe, setDataVendaDe] = useState('')
  const [dataVendaAte, setDataVendaAte] = useState('')
  const [activePreset, setActivePreset] = useState<string | null>(null)
  const [isCustomOpen, setIsCustomOpen] = useState(false)
  const [periodDropdownOpen, setPeriodDropdownOpen] = useState(false)

  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const [clientesRes, consultoresRes] = await Promise.all([
          runWithAuthRecovery<any[]>(() =>
            supabase
              .from('clientes')
              .select('id, nome')
              .eq('excluido' as any, false)
              .order('nome'),
          ),
          runWithAuthRecovery<any[]>(() =>
            supabase.from('users').select('id, nome').eq('status', true).order('nome'),
          ),
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
        const leadEmbed =
          consultorFilter !== 'all'
            ? 'lead:leads!lead_id!inner(id, consultor_id, consultor:users!leads_consultor_id_fkey(id, nome))'
            : 'lead:leads!lead_id(id, consultor_id, consultor:users!leads_consultor_id_fkey(id, nome))'

        const vendasResult = await runWithAuthRecovery<{ data: any[]; error: any }>(() =>
          buscarTodasPaginas(() => {
            let query = supabase.from('formulario_comercial').select(`
              id,
              cliente_id,
              lead_id,
              valor_total,
              datas,
              criado_em,
              cliente:clientes!cliente_id!inner(id, nome, email, telefone, excluido),
              ${leadEmbed},
              dossies!formulario_comercial_id(id, status, criado_em)
            `)

            query = query.eq('cliente.excluido', false)

            if (clienteFilter !== 'all') {
              query = query.eq('cliente_id', clienteFilter)
            }
            if (consultorFilter !== 'all') {
              query = query.eq('lead.consultor_id', consultorFilter)
            }
            if (dataVendaDe) {
              query = query.gte('datas->>data_venda', dataVendaDe)
            }
            if (dataVendaAte) {
              query = query.lte('datas->>data_venda', dataVendaAte)
            }

            return query
          }),
        )

        if (vendasResult.error) throw vendasResult.error
        const rawVendas = (vendasResult.data as any[]) || []

        // Agrupamento por cliente_id
        const clientesMap = new Map<
          string,
          {
            cliente: { id: string; nome: string; email: string; telefone: string }
            vendas: VendaResumo[]
          }
        >()

        for (const item of rawVendas) {
          const cli = Array.isArray(item.cliente) ? item.cliente[0] : item.cliente
          if (!cli || !cli.id) continue
          const vendaParsed = parseVendaItem(item)

          if (!clientesMap.has(cli.id)) {
            clientesMap.set(cli.id, {
              cliente: {
                id: cli.id,
                nome: cli.nome || 'Sem nome',
                email: cli.email || '',
                telefone: cli.telefone || '',
              },
              vendas: [],
            })
          }
          clientesMap.get(cli.id)!.vendas.push(vendaParsed)
        }

        // Buscar clientes sem nenhuma venda quando NÃO há filtro de período nem de consultor
        const hasPeriodFilter = !!(dataVendaDe || dataVendaAte)
        const hasConsultorFilter = consultorFilter !== 'all'
        const canIncludeClientesSemVenda = !hasPeriodFilter && !hasConsultorFilter

        let clientesSemVendaRows: ClienteRow[] = []
        if (canIncludeClientesSemVenda) {
          const clientesRes = await runWithAuthRecovery<{ data: any[]; error: any }>(() =>
            buscarTodasPaginas(() => {
              let query = supabase
                .from('clientes')
                .select('id, nome, email, telefone')
                .eq('excluido' as any, false)

              if (clienteFilter !== 'all') {
                query = query.eq('id', clienteFilter)
              }

              return query
            }),
          )

          if (clientesRes.error) throw clientesRes.error
          const allClientes = (clientesRes.data as any[]) || []

          for (const c of allClientes) {
            if (!clientesMap.has(c.id)) {
              clientesSemVendaRows.push({
                id: c.id,
                nome: c.nome || 'Sem nome',
                email: c.email || '',
                telefone: c.telefone || '',
                vendas: [],
                numVendas: 0,
                ultimaDataVenda: null,
                valorTotal: 0,
                consultorNome: '—',
                dossieId: c.id,
              })
            }
          }
        }

        const rowsComVendas: ClienteRow[] = []
        for (const { cliente, vendas } of clientesMap.values()) {
          // Ordenar vendas do cliente por data_venda desc, fallback criado_em desc
          const sortedVendas = [...vendas].sort((a, b) => {
            const dateA = a.data_venda || a.criado_em || ''
            const dateB = b.data_venda || b.criado_em || ''
            return dateB.localeCompare(dateA)
          })

          const vendaMaisRecente = sortedVendas[0]

          // Última data de venda: maior datas.data_venda
          let ultimaDataVenda: string | null = null
          for (const v of vendas) {
            if (v.data_venda) {
              if (!ultimaDataVenda || v.data_venda > ultimaDataVenda) {
                ultimaDataVenda = v.data_venda
              }
            }
          }

          // Consultor: da venda mais recente; se houver consultores distintos nas vendas, "Nome +1"
          const consultoresDistintos = new Set(
            vendas.map((v) => v.consultor_nome).filter((nome): nome is string => !!nome),
          )
          const consultorRecenteNome = vendaMaisRecente?.consultor_nome || '—'
          let consultorDisplay = consultorRecenteNome
          if (consultoresDistintos.size > 1 && consultorRecenteNome !== '—') {
            consultorDisplay = `${consultorRecenteNome} +${consultoresDistintos.size - 1}`
          }

          const dossieId = vendaMaisRecente?.dossie_id || cliente.id
          const valorTotalCliente = vendas.reduce((sum, v) => sum + (v.valor_total || 0), 0)

          rowsComVendas.push({
            id: cliente.id,
            nome: cliente.nome,
            email: cliente.email,
            telefone: cliente.telefone,
            vendas,
            numVendas: vendas.length,
            ultimaDataVenda,
            valorTotal: valorTotalCliente,
            consultorNome: consultorDisplay,
            dossieId,
          })
        }

        const todosOsClientes = [...rowsComVendas, ...clientesSemVendaRows]
        todosOsClientes.sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'))

        setClientesData(todosOsClientes)

        // Resumo (VendasSummaryCard):
        // numVendas = total de vendas que passaram nos filtros (soma dos numVendas)
        // totalVendido = soma dos valorTotal (clientes sem venda não entram pois têm valorTotal 0)
        const totalVendidoSum = rowsComVendas.reduce((acc, c) => acc + c.valorTotal, 0)
        const numVendasSum = rowsComVendas.reduce((acc, c) => acc + c.numVendas, 0)

        setTotalVendido(totalVendidoSum)
        setNumVendas(numVendasSum)
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

  useEffect(() => {
    const handleAuthRestored = () => {
      console.info('[ClientesList] auth_session_restored detectado. Recarregando lista...')
      setRefreshTrigger((prev) => prev + 1)
    }
    window.addEventListener('auth_session_restored', handleAuthRestored)
    return () => {
      window.removeEventListener('auth_session_restored', handleAuthRestored)
    }
  }, [])

  const handleApplyPreset = (preset: PeriodPreset) => {
    const range = preset.getRange()
    setDataVendaDe(range.de)
    setDataVendaAte(range.ate)
    setActivePreset(preset.id)
    setPeriodDropdownOpen(false)
  }

  const handleClearPeriod = () => {
    setDataVendaDe('')
    setDataVendaAte('')
    setActivePreset(null)
    setPeriodDropdownOpen(false)
  }

  const handleClearFilters = () => {
    setClienteFilter('all')
    setConsultorFilter('all')
    setDataVendaDe('')
    setDataVendaAte('')
    setActivePreset(null)
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
          <Button
            variant="outline"
            onClick={() => setAjudaCadastroOpen(true)}
            className="shrink-0"
            title="Como cadastrar um novo cliente"
          >
            <HelpCircle className="w-4 h-4 mr-2" />
            Como cadastrar cliente?
          </Button>
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
        </div>
      </div>

      <Dialog open={ajudaCadastroOpen} onOpenChange={setAjudaCadastroOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              Como cadastrar um novo cliente
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  O único caminho para cadastrar um cliente é pelo módulo de{' '}
                  <span className="font-semibold text-foreground">Atendimentos</span>: arraste o
                  card do lead até a coluna{' '}
                  <span className="font-semibold text-foreground">&quot;Vendido&quot;</span>. A
                  partir daí, o sistema gera automaticamente o formulário comercial e o dossiê do
                  cliente.
                </p>
                <p>
                  Isso garante que todo cliente tenha venda, histórico e pasta de documentos
                  completos.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setAjudaCadastroOpen(false)}>Entendi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              <Label className="text-xs font-medium text-muted-foreground">Período de Venda</Label>
              <Popover open={periodDropdownOpen} onOpenChange={setPeriodDropdownOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-9 px-3 border-border text-foreground hover:bg-muted font-medium text-xs gap-1.5 bg-background justify-between min-w-[170px]"
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      {(() => {
                        if (activePreset) {
                          const p = PERIOD_PRESETS.find((x) => x.id === activePreset)
                          if (p) return p.label
                        }
                        if (dataVendaDe || dataVendaAte) {
                          if (dataVendaDe && dataVendaAte) {
                            try {
                              const deFormatted = format(
                                new Date(dataVendaDe + 'T12:00:00'),
                                'dd/MM/yyyy',
                                { locale: ptBR },
                              )
                              const ateFormatted = format(
                                new Date(dataVendaAte + 'T12:00:00'),
                                'dd/MM/yyyy',
                                { locale: ptBR },
                              )
                              return `${deFormatted} - ${ateFormatted}`
                            } catch {
                              return `${dataVendaDe} a ${dataVendaAte}`
                            }
                          }
                          return dataVendaDe ? `A partir de ${dataVendaDe}` : `Até ${dataVendaAte}`
                        }
                        return 'Período'
                      })()}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className="w-56 p-1 bg-popover border-border shadow-md"
                >
                  <div className="flex flex-col space-y-0.5">
                    {PERIOD_PRESETS.map((preset) => {
                      const isSelected = activePreset === preset.id
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleApplyPreset(preset)}
                          className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-foreground hover:bg-muted rounded-sm transition-colors text-left"
                        >
                          <span>{preset.label}</span>
                          {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                        </button>
                      )
                    })}

                    <div className="border-t border-border my-1" />

                    <button
                      type="button"
                      onClick={() => setIsCustomOpen((prev) => !prev)}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-foreground hover:bg-muted rounded-sm transition-colors text-left font-medium"
                    >
                      <span>Personalizado</span>
                      <div className="flex items-center gap-1">
                        {activePreset === 'custom' && (
                          <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                        )}
                        <ChevronDown
                          className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${
                            isCustomOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </div>
                    </button>

                    {isCustomOpen && (
                      <div className="p-2 space-y-2 bg-muted/40 rounded-md border border-border/60 mt-1">
                        <div className="space-y-1">
                          <Label className="text-[11px] font-medium text-muted-foreground">
                            De
                          </Label>
                          <Input
                            type="date"
                            value={dataVendaDe}
                            onChange={(e) => {
                              setDataVendaDe(e.target.value)
                              setActivePreset('custom')
                            }}
                            className="h-8 text-xs bg-background"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] font-medium text-muted-foreground">
                            Até
                          </Label>
                          <Input
                            type="date"
                            value={dataVendaAte}
                            onChange={(e) => {
                              setDataVendaAte(e.target.value)
                              setActivePreset('custom')
                            }}
                            className="h-8 text-xs bg-background"
                          />
                        </div>
                      </div>
                    )}

                    {(dataVendaDe || dataVendaAte || activePreset) && (
                      <>
                        <div className="border-t border-border my-1" />
                        <button
                          type="button"
                          onClick={handleClearPeriod}
                          className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-sm transition-colors text-left"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Limpar período
                        </button>
                      </>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
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

        <div className="flex-1 overflow-auto bg-card rounded-xl border border-border shadow-sm p-1">
          <Table>
            <TableHeader className="bg-muted/70 sticky top-0 z-20 shadow-sm border-b border-border backdrop-blur-sm">
              <TableRow className="hover:bg-transparent">
                <TableHead>Cliente</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Consultor</TableHead>
                <TableHead className="text-center">Vendas</TableHead>
                <TableHead>Última venda</TableHead>
                <TableHead className="text-right">Valor total</TableHead>
                <TableHead className="w-[100px] text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    Carregando clientes...
                  </TableCell>
                </TableRow>
              ) : clientesData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-40 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Users className="w-8 h-8 mb-2 opacity-20" />
                      <p>Nenhum cliente encontrado com os filtros aplicados.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                clientesData.map((cliente) => {
                  const dossieId = cliente.dossieId || cliente.id
                  const temRecompra = cliente.numVendas >= 2

                  return (
                    <TableRow
                      key={cliente.id}
                      className="cursor-pointer relative z-0 border-b border-border/60 hover:z-10 transition-all duration-200 ease-out hover:-translate-y-[2px] hover:bg-card/90 hover:backdrop-blur-md hover:border-primary/40 hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.12),0_4px_8px_-2px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_8px_24px_-4px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.08)] group rounded-md"
                      onClick={() => onSelect(dossieId)}
                    >
                      <TableCell className="font-medium group-hover:text-primary transition-colors duration-200">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-transparent group-hover:bg-primary transition-all duration-200" />
                          <span>{cliente.nome || 'Sem nome'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="transition-colors duration-200">
                        <div className="flex flex-col">
                          <span className="text-sm text-foreground group-hover:text-foreground/90">
                            {cliente.email || '-'}
                          </span>
                          <span className="text-xs text-muted-foreground group-hover:text-muted-foreground/80">
                            {cliente.telefone || '-'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground group-hover:text-foreground/80 transition-colors duration-200">
                        {cliente.consultorNome}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={temRecompra ? 'default' : 'secondary'}
                          title={temRecompra ? 'Cliente com recompra' : undefined}
                          className="font-semibold"
                        >
                          {cliente.numVendas}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground group-hover:text-foreground/80 transition-colors duration-200">
                        {cliente.ultimaDataVenda
                          ? format(
                              new Date(cliente.ultimaDataVenda + 'T12:00:00Z'),
                              "dd 'de' MMM, yyyy",
                              { locale: ptBR },
                            )
                          : '—'}
                      </TableCell>
                      <TableCell className="text-right font-medium group-hover:text-primary transition-colors duration-200">
                        {cliente.numVendas > 0 ? formatCurrency(cliente.valorTotal) : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isAdmin && (
                            <ClienteDeleteDialog
                              clienteId={cliente.id}
                              clienteNome={cliente.nome}
                              onDeleted={() => {
                                toast.success('Cliente excluído com sucesso.')
                                setRefreshTrigger((prev) => prev + 1)
                              }}
                              triggerClassName="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            />
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="group-hover:text-primary group-hover:bg-primary/10 group-hover:translate-x-0.5 transition-all duration-200"
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
