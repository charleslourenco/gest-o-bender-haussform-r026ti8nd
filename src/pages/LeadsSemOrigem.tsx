import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { ORIGENS_LEAD, getLeadAba, type OrigemLead } from '@/components/comercial/constants'

// Origens válidas permitidas para atribuição (exclui 'A definir' para não manter o lead como pendente)
const ORIGENS_DISPONIVEIS: OrigemLead[] = ORIGENS_LEAD.filter(
  (o) => o !== 'A definir',
) as OrigemLead[]

interface LeadSemOrigem {
  id: string
  nome: string
  telefone: string | null
  origem: string | null
  status: string | null
  categoria: string | null
  kanban_ativo: boolean | null
  notas_pessoais: unknown
  criado_em: string
}

export default function LeadsSemOrigem() {
  const [leads, setLeads] = useState<LeadSemOrigem[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroAba, setFiltroAba] = useState<string>('todas')

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    try {
      // Buscar leads categoria Comercial não excluídos
      // Filtrando os que têm origem nula, vazia, 'whatsapp', 'a definir' ou 'sem origem'
      const { data, error } = await supabase
        .from('leads')
        .select(
          'id, nome, telefone, origem, status, categoria, kanban_ativo, notas_pessoais, criado_em',
        )
        .or('excluido.is.null,excluido.eq.false')
        .order('criado_em', { ascending: false })

      if (error) {
        throw error
      }

      const lista = (data || []).filter((lead: any) => {
        const cat = (lead.categoria || 'Comercial').trim()
        if (cat !== 'Comercial') return false

        const orig = (lead.origem || '').trim().toLowerCase()
        return !orig || orig === 'whatsapp' || orig === 'a definir' || orig === 'sem origem'
      })

      setLeads(lista)
    } catch (err: any) {
      toast.error('Erro ao carregar leads sem origem: ' + (err?.message || 'Falha na conexão'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  const handleOrigemChange = async (leadId: string, leadNome: string, novaOrigem: string) => {
    if (!novaOrigem || novaOrigem === 'A definir') return

    setSavingId(leadId)
    try {
      const { error } = await supabase.from('leads').update({ origem: novaOrigem }).eq('id', leadId)

      if (error) {
        throw error
      }

      toast.success(`Origem do lead "${leadNome || 'Sem nome'}" atualizada para ${novaOrigem}!`)

      // Remoção reativa da linha após salvar a origem válida
      setLeads((prev) => prev.filter((item) => item.id !== leadId))
    } catch (err: any) {
      toast.error('Erro ao atualizar origem: ' + (err?.message || 'Falha ao salvar'))
    } finally {
      setSavingId(null)
    }
  }

  // Obter aba de cada lead via getLeadAba
  const leadsComAba = useMemo(() => {
    return leads.map((l) => ({
      ...l,
      abaConfig: getLeadAba(l),
    }))
  }, [leads])

  // Lista de abas presentes para o filtro
  const abasDisponiveis = useMemo(() => {
    const mapa = new Map<string, string>()
    leadsComAba.forEach((l) => {
      if (l.abaConfig) {
        mapa.set(l.abaConfig.id, `${l.abaConfig.numero} - ${l.abaConfig.titulo}`)
      }
    })
    return Array.from(mapa.entries()).map(([id, label]) => ({ id, label }))
  }, [leadsComAba])

  // Filtragem local por texto e aba
  const leadsFiltrados = useMemo(() => {
    return leadsComAba.filter((lead) => {
      if (filtroAba !== 'todas' && lead.abaConfig.id !== filtroAba) {
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
  }, [leadsComAba, searchTerm, filtroAba])

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
              <span>Leads sem Origem</span>
              <Badge
                variant="outline"
                className="border-amber-400 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40"
              >
                {leads.length} pendentes
              </Badge>
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Defina a origem dos contatos comerciais para manter as métricas de captação e
              conversão precisas.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchLeads}
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
              Passivo de Origem de Captação
            </p>
            <p className="text-amber-900 dark:text-amber-300">
              Esta lista reúne todos os contatos da categoria Comercial cuja origem está nula,
              vazia, &quot;WhatsApp&quot;, &quot;A definir&quot; ou &quot;sem origem&quot;. Ao
              selecionar a origem definitiva, o registro é salvo imediatamente e removido desta
              fila.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Barra de Filtros e Busca */}
      <Card className="border-border shadow-sm">
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
                  <SelectItem value="todas">Todas as abas ({leads.length})</SelectItem>
                  {abasDisponiveis.map((aba) => {
                    const count = leadsComAba.filter((l) => l.abaConfig.id === aba.id).length
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
              <p className="text-sm text-muted-foreground">Carregando contatos pendentes...</p>
            </div>
          ) : leadsFiltrados.length === 0 ? (
            <div className="py-16 text-center space-y-3 px-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-foreground">
                {searchTerm || filtroAba !== 'todas'
                  ? 'Nenhum lead encontrado para estes filtros'
                  : 'Nenhum lead comercial sem origem pendente!'}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
                {searchTerm || filtroAba !== 'todas'
                  ? 'Tente ajustar os termos de busca ou remover o filtro por aba.'
                  : 'Todos os contatos comerciais estão com a origem oficial devidamente registrada.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="w-[280px]">Contato / Nome</TableHead>
                    <TableHead className="w-[180px]">Telefone</TableHead>
                    <TableHead className="w-[220px]">Aba / Status Atual</TableHead>
                    <TableHead className="w-[160px]">Origem Atual</TableHead>
                    <TableHead className="w-[240px]">Atribuir Nova Origem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leadsFiltrados.map((lead) => {
                    const isSaving = savingId === lead.id
                    const origemAtualDisplay = (lead.origem || '').trim() || 'Vazio / Não informada'

                    return (
                      <TableRow key={lead.id} className="hover:bg-muted/30">
                        {/* Nome do Lead */}
                        <TableCell className="font-semibold text-foreground">
                          <div className="space-y-0.5">
                            <span className="block text-sm">
                              {lead.nome || 'Sem nome registrado'}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
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
                                {lead.abaConfig.numero} - {lead.abaConfig.titulo}
                              </Badge>
                            </div>
                            <div
                              className="text-xs text-muted-foreground truncate max-w-[200px]"
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

                        {/* Select para Atribuir Nova Origem */}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Select
                              disabled={isSaving}
                              onValueChange={(val) => handleOrigemChange(lead.id, lead.nome, val)}
                            >
                              <SelectTrigger className="h-8 text-xs w-[190px]">
                                <SelectValue placeholder="Selecione a origem..." />
                              </SelectTrigger>
                              <SelectContent>
                                {ORIGENS_DISPONIVEIS.map((origem) => (
                                  <SelectItem key={origem} value={origem} className="text-xs">
                                    {origem}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {isSaving && (
                              <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                            )}
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
    </div>
  )
}
