import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  ArrowLeft,
  AlertTriangle,
  Search,
  CheckCircle2,
  Phone,
  RefreshCw,
  Loader2,
  Filter,
  Trash2,
  Eye,
  UserCheck,
} from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ORIGENS_LEAD, getLeadAba, type OrigemLead } from '@/components/comercial/constants'
import { fetchUsers, normalizeLead, salvarNotasLead } from '@/services/comercial'
import { buscarTodasPaginas } from '@/lib/supabase/buscar-todas-paginas'
import { subscribeSharedTable } from '@/lib/comercial-realtime'
import { ModalAtendimento } from '@/components/comercial/ModalAtendimento'
import { formatConsultorOptionLabel } from '@/lib/consultor-utils'

// Origens válidas permitidas para atribuição (exclui 'A definir' para não manter o lead como pendente)
const ORIGENS_DISPONIVEIS: OrigemLead[] = ORIGENS_LEAD.filter(
  (o) => o !== 'A definir',
) as OrigemLead[]

interface LeadComercialItem {
  id: string
  nome: string
  telefone: string | null
  origem: string | null
  status: string | null
  categoria: string | null
  consultor_id: string | null
  kanban_ativo: boolean | null
  notas_pessoais: unknown
  criado_em: string
  [key: string]: any
}

type FilaView = 'sem_origem' | 'sem_consultor'

export default function LeadsSemOrigem() {
  const refetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const avisadosSemConsultorRef = useRef<Set<string>>(new Set())
  const [todosComerciais, setTodosComerciais] = useState<LeadComercialItem[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [leadToDelete, setLeadToDelete] = useState<LeadComercialItem | null>(null)
  const [searchParams] = useSearchParams()
  const initialFila = searchParams.get('fila') === 'sem_consultor' ? 'sem_consultor' : 'sem_origem'
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroAba, setFiltroAba] = useState<string>('todas')
  const [activeFila, setActiveFila] = useState<FilaView>(initialFila)

  // Usuários para atribuição de consultores e ModalAtendimento
  const [users, setUsers] = useState<
    Array<{
      id: string
      nome: string
      eh_consultor?: boolean | null
      ex_colaborador?: boolean | null
    }>
  >([])

  // Estado para o ModalAtendimento
  const [selectedLeadModal, setSelectedLeadModal] = useState<any | null>(null)
  const [loadingModalLeadId, setLoadingModalLeadId] = useState<string | null>(null)

  // Carregar usuários
  useEffect(() => {
    let isMounted = true
    fetchUsers()
      .then((data) => {
        if (isMounted) {
          const validUsers = Array.isArray(data)
            ? data.filter(
                (u) =>
                  Boolean(u) &&
                  typeof u === 'object' &&
                  Boolean(u.id) &&
                  typeof u.id === 'string' &&
                  u.id.trim() !== '',
              )
            : []
          setUsers(validUsers)
        }
      })
      .catch((err) => {
        console.warn('Erro ao carregar usuários:', err)
        if (isMounted) setUsers([])
      })
    return () => {
      isMounted = false
    }
  }, [])

  // Buscar todos os leads categoria Comercial não excluídos
  const fetchLeads = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const { data, error } = await buscarTodasPaginas(() =>
        supabase
          .from('leads')
          .select(
            'id, nome, telefone, origem, status, categoria, consultor_id, kanban_ativo, notas_pessoais, criado_em',
          )
          .or('excluido.is.null,excluido.eq.false')
          .order('criado_em', { ascending: false })
          .order('id', { ascending: true }),
      )

      if (error) {
        throw error
      }

      const lista = (data || []).filter((lead: any) => {
        const cat = (lead.categoria || 'Comercial').trim()
        return cat === 'Comercial'
      })

      setTodosComerciais(lista)
    } catch (err: any) {
      if (!silent) {
        toast.error('Erro ao carregar leads: ' + (err?.message || 'Falha na conexão'))
      }
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  // Assinatura realtime na tabela leads
  useEffect(() => {
    let unsubscribe: (() => void) | undefined
    try {
      unsubscribe = subscribeSharedTable('leads', '*', (payload: any) => {
        try {
          const eventType = payload.eventType
          const newLead = payload.new

          if ((eventType === 'INSERT' || eventType === 'UPDATE') && newLead) {
            // Verificar se o lead entrou na aba 'Lead p/ Consultoria' sem consultor
            const isNaoExcluido = newLead.excluido === false || newLead.excluido === null
            const isComercial = (newLead.categoria || 'Comercial').trim() === 'Comercial'
            const consultorVazio =
              !newLead.consultor_id || String(newLead.consultor_id).trim() === ''

            if (!consultorVazio && newLead.id) {
              avisadosSemConsultorRef.current.delete(newLead.id)
            }

            if (isNaoExcluido && isComercial && consultorVazio) {
              const abaConfig = getLeadAba(newLead)
              if (
                abaConfig?.id === 'lead-consultoria' ||
                abaConfig?.titulo === 'Lead p/ Consultoria'
              ) {
                if (avisadosSemConsultorRef.current.has(newLead.id)) {
                  /* já avisado, não repete */
                } else {
                  avisadosSemConsultorRef.current.add(newLead.id)
                  const leadNome = newLead.nome || 'Sem nome'
                  toast.warning(`Lead ${leadNome} entrou em Leads p/ Consultoria sem consultor`, {
                    duration: 8000,
                    action: {
                      label: 'Atribuir agora',
                      onClick: () => {
                        setActiveFila('sem_consultor')
                      },
                    },
                  })
                }
              }
            }
          }

          // Atualizar lista silenciosamente em qualquer alteração relevante
          if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current)
          refetchTimerRef.current = setTimeout(() => fetchLeads(true), 1500)
        } catch (innerErr) {
          console.warn('Erro ao processar evento realtime de leads:', innerErr)
        }
      })
    } catch (err) {
      console.warn('Falha silenciosa ao inicializar realtime de leads:', err)
    }

    return () => {
      if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current)
      if (unsubscribe) {
        try {
          unsubscribe()
        } catch (unsubErr) {
          console.warn('Erro ao desinscrever realtime de leads:', unsubErr)
        }
      }
    }
  }, [fetchLeads])

  // Abrir o card do lead com busca completa
  const handleOpenLeadCard = async (leadId: string) => {
    setLoadingModalLeadId(leadId)
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .maybeSingle()

      if (error) {
        throw error
      }

      if (data) {
        setSelectedLeadModal(normalizeLead(data))
      } else {
        toast.error('Lead não encontrado')
      }
    } catch (err: any) {
      toast.error('Erro ao abrir lead: ' + (err?.message || 'Falha ao buscar dados'))
    } finally {
      setLoadingModalLeadId(null)
    }
  }

  // Atualização disparada pelo ModalAtendimento
  const handleModalUpdateLead = async (leadId: string, updates: any) => {
    try {
      const { notas_pessoais: notasDepois, ...resto } = updates || {}
      let notasGravadas: string | undefined
      if (notasDepois !== undefined) {
        notasGravadas = await salvarNotasLead(
          leadId,
          selectedLeadModal?.notas_pessoais,
          notasDepois,
        )
      }
      if (Object.keys(resto).length > 0) {
        const { error } = await supabase.from('leads').update(resto).eq('id', leadId)
        if (error) throw error
      }

      setSelectedLeadModal((prev: any) =>
        prev && prev.id === leadId
          ? {
              ...prev,
              ...updates,
              ...(notasGravadas !== undefined ? { notas_pessoais: notasGravadas } : {}),
            }
          : prev,
      )
      // Re-fetch silencioso da lista local
      fetchLeads(true)
    } catch (err: any) {
      console.warn('Erro ao atualizar lead do modal:', err)
      throw err
    }
  }

  // Atribuir origem (fila 1: Sem origem)
  const handleOrigemChange = async (leadId: string, leadNome: string, novaOrigem: string) => {
    if (!novaOrigem || novaOrigem === 'A definir') return

    setSavingId(leadId)
    try {
      const { error } = await supabase.from('leads').update({ origem: novaOrigem }).eq('id', leadId)

      if (error) {
        throw error
      }

      toast.success(`Origem do lead "${leadNome || 'Sem nome'}" atualizada para ${novaOrigem}!`)

      // Atualizar lista local
      setTodosComerciais((prev) =>
        prev.map((item) => (item.id === leadId ? { ...item, origem: novaOrigem } : item)),
      )
    } catch (err: any) {
      toast.error('Erro ao atualizar origem: ' + (err?.message || 'Falha ao salvar'))
    } finally {
      setSavingId(null)
    }
  }

  // Atribuir consultor (disponível em ambas as visões)
  const handleConsultorChange = async (
    leadId: string,
    leadNome: string,
    novoConsultorId: string,
  ) => {
    const finalConsultorId = novoConsultorId === 'unassigned' ? null : novoConsultorId
    const consultorObj = users.find((u) => u.id === finalConsultorId)
    const consultorNome = consultorObj?.nome || 'Sem consultor'

    setSavingId(leadId)
    try {
      const { error } = await supabase
        .from('leads')
        .update({ consultor_id: finalConsultorId })
        .eq('id', leadId)

      if (error) {
        throw error
      }

      if (finalConsultorId) {
        toast.success(`Consultor atribuído a ${leadNome || 'Sem nome'}: ${consultorNome}`)
      } else {
        toast.success(`Consultor removido de ${leadNome || 'Sem nome'}`)
      }

      // Atualizar estado local
      setTodosComerciais((prev) =>
        prev.map((item) =>
          item.id === leadId ? { ...item, consultor_id: finalConsultorId } : item,
        ),
      )

      // Se estamos na visão 'sem_consultor' e um consultor foi atribuído, remover imediatamente a linha da lista local com toast
      if (activeFila === 'sem_consultor' && finalConsultorId) {
        setTodosComerciais((prev) =>
          prev.map((item) =>
            item.id === leadId ? { ...item, consultor_id: finalConsultorId } : item,
          ),
        )
      }
    } catch (err: any) {
      toast.error('Erro ao atribuir consultor: ' + (err?.message || 'Falha ao salvar'))
    } finally {
      setSavingId(null)
    }
  }

  const handleConfirmDelete = async () => {
    if (!leadToDelete) return
    const id = leadToDelete.id

    setDeletingId(id)
    try {
      const { error } = await supabase
        .from('leads')
        .update({ excluido: true } as any)
        .eq('id', id)

      if (error) {
        throw error
      }

      setTodosComerciais((prev) => prev.filter((item) => item.id !== id))
      toast.success('Lead apagado')
      setLeadToDelete(null)
    } catch (err: any) {
      toast.error('Erro ao apagar lead: ' + (err?.message || 'Falha ao salvar'))
    } finally {
      setDeletingId(null)
    }
  }

  // Leads com configuração de aba calculada via getLeadAba
  const leadsComAba = useMemo(() => {
    return todosComerciais.map((l) => ({
      ...l,
      abaConfig: getLeadAba(l),
    }))
  }, [todosComerciais])

  // Fila 1: Sem origem (leads com origem nula, vazia, 'whatsapp', 'a definir' ou 'sem origem')
  // EXCLUI leads finalizados (Vendido/convertido ou Perdido) para focar apenas em leads ativos
  const leadsSemOrigem = useMemo(() => {
    return leadsComAba.filter((lead) => {
      const statusLower = (lead.status || '').trim().toLowerCase()
      const isPerdidoOuVendido =
        statusLower.includes('perdido') || statusLower === 'vendido' || statusLower === 'ganho'
      if (isPerdidoOuVendido) return false

      const orig = (lead.origem || '').trim().toLowerCase()
      return !orig || orig === 'whatsapp' || orig === 'a definir' || orig === 'sem origem'
    })
  }, [leadsComAba])

  // Fila 2: Sem consultor — Consultoria (aba 'Lead p/ Consultoria' e consultor_id vazio)
  // EXCLUI leads finalizados (Vendido/convertido ou Perdido) para focar apenas em pendências ativas
  const leadsSemConsultor = useMemo(() => {
    return leadsComAba.filter((lead) => {
      const statusLower = (lead.status || '').trim().toLowerCase()
      const isPerdidoOuVendido =
        statusLower.includes('perdido') || statusLower === 'vendido' || statusLower === 'ganho'
      if (isPerdidoOuVendido) return false

      const semConsultor = !lead.consultor_id || String(lead.consultor_id).trim() === ''
      const isConsultoria =
        lead.abaConfig?.id === 'lead-consultoria' ||
        lead.abaConfig?.titulo === 'Lead p/ Consultoria'
      return semConsultor && isConsultoria
    })
  }, [leadsComAba])

  // Lista da fila ativa
  const listaAtiva = activeFila === 'sem_origem' ? leadsSemOrigem : leadsSemConsultor

  // Lista de abas presentes na fila ativa para o filtro
  const abasDisponiveis = useMemo(() => {
    const mapa = new Map<string, string>()
    listaAtiva.forEach((l) => {
      if (l.abaConfig) {
        mapa.set(l.abaConfig.id, `${l.abaConfig.numero} - ${l.abaConfig.titulo}`)
      }
    })
    return Array.from(mapa.entries()).map(([id, label]) => ({ id, label }))
  }, [listaAtiva])

  // Filtragem local por texto e aba sobre a lista ativa
  const leadsFiltrados = useMemo(() => {
    return listaAtiva.filter((lead) => {
      if (filtroAba !== 'todas' && lead.abaConfig?.id !== filtroAba) {
        return false
      }

      if (!searchTerm.trim()) return true

      const termo = searchTerm.toLowerCase().trim()
      const matchNome = (lead.nome || '').toLowerCase().includes(termo)
      const matchTelefone = (lead.telefone || '')
        .replace(/\D/g, '')
        .includes(termo.replace(/\D/g, ''))
      const matchStatus = (lead.status || '').toLowerCase().includes(termo)
      const matchOrigem = (lead.origem || '').toLowerCase().includes(termo)

      return matchNome || matchTelefone || matchStatus || matchOrigem
    })
  }, [listaAtiva, searchTerm, filtroAba])

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-7xl space-y-6 animate-in fade-in duration-300">
      {/* Topo com Voltar para o Dashboard */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="sm" className="gap-1.5 h-9">
            <Link to="/dashboard">
              <ArrowLeft className="h-4 w-4" />
              <span>Voltar ao Dashboard</span>
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <span>Pendências Comerciais</span>
              <Badge
                variant="outline"
                className="border-amber-400 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40"
              >
                {leadsSemOrigem.length + leadsSemConsultor.length} pendências
              </Badge>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Atribua origem aos leads e designe consultores para contatos no funil de Consultoria.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchLeads(false)}
          disabled={loading}
          className="gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Atualizar lista</span>
        </Button>
      </div>

      {/* Alerta explicativo */}
      <Card className="border-amber-300/80 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/20 shadow-sm">
        <CardContent className="p-4 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-500 text-white shrink-0 mt-0.5">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="text-xs sm:text-sm space-y-1">
            <p className="font-semibold text-amber-950 dark:text-amber-200">
              {activeFila === 'sem_origem'
                ? 'Passivo de Origem de Captação'
                : 'Fila de Consultoria sem Consultor'}
            </p>
            <p className="text-amber-900 dark:text-amber-300">
              {activeFila === 'sem_origem'
                ? 'Esta lista reúne todos os contatos da categoria Comercial cuja origem está pendente. Ao selecionar a origem, o registro é salvo imediatamente e removido desta fila. Atribuir consultor aqui não remove o lead da pendência de origem.'
                : 'Esta lista reúne todos os leads que estão no funil de Consultoria sem um consultor atribuído. Ao selecionar o consultor, o card é atualizado e sai imediatamente desta fila.'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Card da Tabela com Abas-Pílula no Topo */}
      <Card className="border-border shadow-sm">
        {/* Abas-Pílula no Topo do Card */}
        <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 bg-muted/60 p-1 rounded-lg border border-border w-fit">
            <button
              type="button"
              onClick={() => {
                setActiveFila('sem_origem')
                setFiltroAba('todas')
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-2 ${
                activeFila === 'sem_origem'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <span>Sem origem</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeFila === 'sem_origem'
                    ? 'bg-primary-foreground/20 text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {leadsSemOrigem.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveFila('sem_consultor')
                setFiltroAba('todas')
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-2 ${
                activeFila === 'sem_consultor'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <span>Sem consultor — Consultoria</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeFila === 'sem_consultor'
                    ? 'bg-primary-foreground/20 text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {leadsSemConsultor.length}
              </span>
            </button>
          </div>

          <div className="text-xs text-muted-foreground">
            {activeFila === 'sem_origem' ? (
              <span>Exibindo leads comerciais pendentes de origem</span>
            ) : (
              <span>Exibindo leads em Consultoria aguardando atribuição de consultor</span>
            )}
          </div>
        </div>

        {/* Barra de Filtros e Busca */}
        <CardHeader className="pb-3 pt-4 px-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, telefone ou status..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs sm:text-sm"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
              <Select value={filtroAba} onValueChange={setFiltroAba}>
                <SelectTrigger className="h-9 w-[220px] text-xs">
                  <SelectValue placeholder="Filtrar por Aba" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as abas ({listaAtiva.length})</SelectItem>
                  {abasDisponiveis.map((aba) => {
                    const count = listaAtiva.filter((l) => l.abaConfig?.id === aba.id).length
                    return (
                      <SelectItem key={aba.id} value={aba.id}>
                        {aba.label} ({count})
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground">Carregando contatos...</p>
            </div>
          ) : leadsFiltrados.length === 0 ? (
            <div className="py-16 text-center space-y-3 px-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-foreground">
                {searchTerm || filtroAba !== 'todas'
                  ? 'Nenhum lead encontrado para estes filtros'
                  : activeFila === 'sem_origem'
                    ? 'Nenhum lead comercial sem origem pendente!'
                    : 'Nenhum lead em Consultoria sem consultor!'}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
                {searchTerm || filtroAba !== 'todas'
                  ? 'Tente ajustar os termos de busca ou remover o filtro por aba.'
                  : activeFila === 'sem_origem'
                    ? 'Todos os contatos comerciais estão com a origem devidamente registrada.'
                    : 'Todos os leads do funil de Consultoria já possuem consultor atribuído.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="w-[280px]">Contato / Nome</TableHead>
                    <TableHead className="w-[160px]">Telefone</TableHead>
                    <TableHead className="w-[200px]">Aba / Status Atual</TableHead>
                    <TableHead className="w-[150px]">Origem</TableHead>
                    <TableHead className="w-[200px]">Consultor</TableHead>
                    <TableHead className="w-[220px]">
                      {activeFila === 'sem_origem' ? 'Atribuir Nova Origem' : 'Ações'}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leadsFiltrados.map((lead) => {
                    const isSaving = savingId === lead.id
                    const origemAtualDisplay = (lead.origem || '').trim() || 'Vazio / Não informada'
                    const isLoadingModal = loadingModalLeadId === lead.id

                    return (
                      <TableRow key={lead.id} className="hover:bg-muted/30">
                        {/* Nome do Lead Clicável para abrir o Card do Lead */}
                        <TableCell className="font-semibold text-foreground">
                          <div className="space-y-0.5">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    disabled={isLoadingModal}
                                    onClick={() => handleOpenLeadCard(lead.id)}
                                    className="text-left group inline-flex items-center gap-1.5 hover:text-primary transition-colors focus:outline-none focus:underline"
                                  >
                                    <span className="text-sm font-semibold group-hover:underline">
                                      {lead.nome || 'Sem nome registrado'}
                                    </span>
                                    {isLoadingModal ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />
                                    ) : (
                                      <Eye className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary shrink-0 transition-colors" />
                                    )}
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <p>Ver card do lead</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <span className="block text-[10px] text-muted-foreground font-mono">
                              ID: {lead.id.slice(0, 8)}...
                            </span>
                          </div>
                        </TableCell>

                        {/* Telefone */}
                        <TableCell>
                          {lead.telefone ? (
                            <a
                              href={`tel:${lead.telefone}`}
                              className="text-xs font-mono text-muted-foreground hover:text-foreground flex items-center gap-1.5"
                            >
                              <Phone className="h-3 w-3 text-primary shrink-0" />
                              <span>{lead.telefone}</span>
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">
                              Sem telefone
                            </span>
                          )}
                        </TableCell>

                        {/* Aba e Status */}
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Badge
                                variant="secondary"
                                className="text-[10px] py-0 px-1.5 font-medium"
                              >
                                {lead.abaConfig?.numero} - {lead.abaConfig?.titulo}
                              </Badge>
                            </div>
                            <div
                              className="text-xs text-muted-foreground truncate max-w-[190px]"
                              title={lead.status || ''}
                            >
                              Status:{' '}
                              <strong className="text-foreground">
                                {lead.status || 'Sem status'}
                              </strong>
                            </div>
                          </div>
                        </TableCell>

                        {/* Origem Atual */}
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="border-amber-300 text-amber-800 dark:border-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 text-[11px] font-medium"
                          >
                            {origemAtualDisplay}
                          </Badge>
                        </TableCell>

                        {/* Coluna Consultor: Select para atribuir consultor */}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {(() => {
                              const currentConsultorId =
                                lead.consultor_id && String(lead.consultor_id).trim() !== ''
                                  ? String(lead.consultor_id).trim()
                                  : 'unassigned'

                              // Consultor atual pode estar inativo ou eh_consultor=false:
                              // garantir que sempre apareça na lista de opções para não quebrar a seleção
                              const consultorAtualObj =
                                currentConsultorId !== 'unassigned'
                                  ? users.find((u) => u && u.id === currentConsultorId)
                                  : null

                              // Lista filtrada com consultores ativos/marcados como eh_consultor
                              const consultoresFiltrados = users.filter((u) => {
                                if (!u || !u.id || typeof u.id !== 'string' || u.id.trim() === '')
                                  return false
                                return Boolean(u.eh_consultor)
                              })

                              // União: garantir que o consultor JÁ ATRIBUÍDO ao lead apareça sempre
                              // mesmo se eh_consultor for false ou se ele estiver inativo/não listado
                              const consultoresDisponiveis = [...consultoresFiltrados]
                              if (
                                currentConsultorId !== 'unassigned' &&
                                !consultoresDisponiveis.some((u) => u.id === currentConsultorId)
                              ) {
                                consultoresDisponiveis.unshift({
                                  id: currentConsultorId,
                                  nome:
                                    consultorAtualObj?.nome ||
                                    (lead as any)?.consultor?.nome ||
                                    (lead as any)?.criado_por_nome ||
                                    'Consultor atribuído',
                                  eh_consultor: false,
                                  ex_colaborador:
                                    consultorAtualObj?.ex_colaborador ??
                                    (lead as any)?.consultor?.ex_colaborador ??
                                    false,
                                })
                              }

                              return (
                                <Select
                                  disabled={isSaving || deletingId === lead.id}
                                  value={currentConsultorId}
                                  onValueChange={(val) =>
                                    handleConsultorChange(lead.id, lead.nome, val)
                                  }
                                >
                                  <SelectTrigger className="h-8 text-xs w-[170px]">
                                    <SelectValue placeholder="Sem consultor..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem
                                      value="unassigned"
                                      className="text-xs text-muted-foreground"
                                    >
                                      Sem consultor...
                                    </SelectItem>
                                    {consultoresDisponiveis.map((u) => (
                                      <SelectItem key={u.id} value={u.id} className="text-xs">
                                        {formatConsultorOptionLabel(u)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )
                            })()}
                            {isSaving && (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />
                            )}
                          </div>
                        </TableCell>

                        {/* Ação: Atribuir Nova Origem (na fila de origem) ou Botão de Excluir */}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {activeFila === 'sem_origem' ? (
                              <Select
                                disabled={isSaving || deletingId === lead.id}
                                onValueChange={(val) => handleOrigemChange(lead.id, lead.nome, val)}
                              >
                                <SelectTrigger className="h-8 text-xs w-[170px]">
                                  <SelectValue placeholder="Atribuir origem..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {ORIGENS_DISPONIVEIS.map((origem) => (
                                    <SelectItem key={origem} value={origem} className="text-xs">
                                      {origem}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <UserCheck className="h-3.5 w-3.5 text-primary" />
                                <span>Atribua acima</span>
                              </div>
                            )}

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    type="button"
                                    aria-label="Apagar lead"
                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                                    disabled={deletingId === lead.id || isSaving}
                                    onClick={() => setLeadToDelete(lead)}
                                  >
                                    {deletingId === lead.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin text-destructive" />
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <p>Apagar lead</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AlertDialog de confirmação para apagar lead (soft delete) */}
      <AlertDialog
        open={!!leadToDelete}
        onOpenChange={(open) => {
          if (!open && !deletingId) {
            setLeadToDelete(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar lead?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-sm text-muted-foreground">
              <span className="block font-medium text-foreground">
                {leadToDelete?.nome || 'Lead sem nome'}
              </span>
              <span>
                O lead será marcado como excluído e sairá desta fila e do kanban. Ele não será
                apagado fisicamente do banco.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deletingId}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleConfirmDelete()
              }}
              disabled={!!deletingId}
              className={buttonVariants({ variant: 'destructive' })}
            >
              {deletingId ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Apagando...</span>
                </span>
              ) : (
                'Apagar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de Detalhes do Atendimento */}
      {selectedLeadModal && (
        <ModalAtendimento
          key={selectedLeadModal.id}
          lead={selectedLeadModal}
          currentAba={selectedLeadModal.abaConfig || getLeadAba(selectedLeadModal)}
          users={users || []}
          open={Boolean(selectedLeadModal)}
          onClose={() => setSelectedLeadModal(null)}
          onUpdateLead={(id, updates) => handleModalUpdateLead(id, updates)}
        />
      )}
    </div>
  )
}
