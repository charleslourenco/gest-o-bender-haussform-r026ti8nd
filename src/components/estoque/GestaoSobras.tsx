import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Scissors,
  Trash2,
  Search,
  Check,
  Printer,
  Edit,
  LayoutTemplate,
  Disc,
  Ruler,
  RotateCcw,
  Clock,
  AlertTriangle,
  ArchiveRestore,
  Filter,
  X,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { RegistrarRetalhoModal } from './RegistrarRetalhoModal'
import { RegistrarChapaModal } from './RegistrarChapaModal'
import { RegistrarFitaRoloModal } from './RegistrarFitaRoloModal'
import { RegistrarFitaPedacoModal } from './RegistrarFitaPedacoModal'
import { printScrapLabel } from '@/lib/print-label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { formatSafeDate } from '@/lib/date-utils'
import { useAuth } from '@/hooks/use-auth'
import { baixarSobra, restaurarSobra } from '@/services/estoque-sobras'

const DIAS_ALERTA_PARADAS_PADRAO = 30

export function GestaoSobras() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [sobras, setSobras] = useState<any[]>([])
  const [usersMap, setUsersMap] = useState<Record<string, string>>({})
  const [itensEstoque, setItensEstoque] = useState<Array<{ id: string; nome: string }>>([])
  const [loading, setLoading] = useState(false)

  // Filtros gerais
  const [search, setSearch] = useState('')
  const [filtroOrigem, setFiltroOrigem] = useState<string>('todos')
  const [diasParada, setDiasParada] = useState<number>(DIAS_ALERTA_PARADAS_PADRAO)

  // Filtro específico da aba "Baixadas"
  const [periodoBaixa, setPeriodoBaixa] = useState<'todos' | '7d' | '30d' | '90d' | 'custom'>(
    'todos',
  )
  const [dataInicioBaixa, setDataInicioBaixa] = useState<string>('')
  const [dataFimBaixa, setDataFimBaixa] = useState<string>('')

  // Modais de cadastro/edição
  const [isTypeSelectionOpen, setIsTypeSelectionOpen] = useState(false)
  const [isRetalhoModalOpen, setIsRetalhoModalOpen] = useState(false)
  const [isChapaModalOpen, setIsChapaModalOpen] = useState(false)
  const [isFitaRoloModalOpen, setIsFitaRoloModalOpen] = useState(false)
  const [isFitaPedacoModalOpen, setIsFitaPedacoModalOpen] = useState(false)

  const [sobraEditando, setSobraEditando] = useState<any>(null)
  const [chapaEditando, setChapaEditando] = useState<any>(null)
  const [fitaEditando, setFitaEditando] = useState<any>(null)

  // Confirmações
  const [sobraParaRestaurar, setSobraParaRestaurar] = useState<any>(null)
  const [sobraParaBaixar, setSobraParaBaixar] = useState<any>(null)
  const [sobraParaDeletar, setSobraParaDeletar] = useState<any>(null)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    fetchSobras()
    fetchAuxiliares()
  }, [])

  async function fetchAuxiliares() {
    try {
      // Carregar nomes de usuários para baixado_por
      const { data: usersData } = await supabase.from('users').select('id, nome')
      if (usersData) {
        const map: Record<string, string> = {}
        usersData.forEach((u: any) => {
          map[u.id] = u.nome
        })
        setUsersMap(map)
      }

      // Carregar itens de estoque cadastrados para o filtro por item de origem
      const { data: itensData } = await supabase
        .from('estoque_itens')
        .select('id, nome')
        .order('nome')
      if (itensData) {
        setItensEstoque(itensData)
      }
    } catch (err) {
      console.warn('Erro ao carregar dados auxiliares de sobras:', err)
    }
  }

  async function fetchSobras() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('estoque_sobras' as any)
        .select('*')
        .order('criado_em', { ascending: false })
      if (!error && data) {
        setSobras(data)
      }
    } finally {
      setLoading(false)
    }
  }

  function openEditModal(sobra: any) {
    if (sobra.tipo === 'chapa_inteira' || sobra.tipo === 'Chapa Inteira MDF') {
      setChapaEditando(sobra)
      setIsChapaModalOpen(true)
    } else if (sobra.tipo === 'fita_rolo' || sobra.tipo === 'Fita de Bordas (Rolo)') {
      setFitaEditando(sobra)
      setIsFitaRoloModalOpen(true)
    } else if (sobra.tipo === 'fita_pedaco' || sobra.tipo === 'Fita de Bordas (Pedaço)') {
      setFitaEditando(sobra)
      setIsFitaPedacoModalOpen(true)
    } else {
      setSobraEditando(sobra)
      setIsRetalhoModalOpen(true)
    }
  }

  async function confirmDeletar() {
    if (!sobraParaDeletar) return
    setActionLoading(true)
    try {
      const { error } = await supabase
        .from('estoque_sobras' as any)
        .delete()
        .eq('id', sobraParaDeletar.id)
      if (error) {
        toast({ title: 'Erro ao remover', description: error.message, variant: 'destructive' })
      } else {
        toast({ title: 'Registro removido com sucesso' })
        fetchSobras()
      }
    } finally {
      setActionLoading(false)
      setSobraParaDeletar(null)
    }
  }

  async function confirmBaixar() {
    if (!sobraParaBaixar) return
    setActionLoading(true)
    try {
      const { error } = await baixarSobra({
        sobraId: sobraParaBaixar.id,
        canal: 'manual',
        usuarioId: user?.id || null,
      })
      if (error) {
        toast({ title: 'Erro ao dar baixa', description: error.message, variant: 'destructive' })
      } else {
        toast({
          title: 'Sobra baixada!',
          description: 'O item foi marcado como usado e movido para a aba Baixadas.',
        })
        fetchSobras()
      }
    } finally {
      setActionLoading(false)
      setSobraParaBaixar(null)
    }
  }

  async function confirmRestaurar() {
    if (!sobraParaRestaurar) return
    setActionLoading(true)
    try {
      const { error } = await restaurarSobra({
        sobraId: sobraParaRestaurar.id,
        usuarioId: user?.id || null,
      })
      if (error) {
        toast({
          title: 'Erro ao restaurar sobra',
          description: error.message,
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Sobra restaurada!',
          description:
            'A sobra voltou ao status disponível na aba correspondente e está ativa para QR code.',
        })
        fetchSobras()
      }
    } finally {
      setActionLoading(false)
      setSobraParaRestaurar(null)
    }
  }

  // Itens de origem disponíveis combinados (itens da tabela estoque_itens vinculados + nomes distintos)
  const opcoesOrigem = useMemo(() => {
    const map = new Map<string, string>()

    // Itens vinculados via item_id
    itensEstoque.forEach((item) => {
      map.set(`item:${item.id}`, item.nome)
    })

    // Adiciona nomes únicos das sobras caso não tenham item_id
    sobras.forEach((s) => {
      if (s.item_id && !map.has(`item:${s.item_id}`)) {
        map.set(`item:${s.item_id}`, s.nome)
      } else if (!s.item_id && s.nome) {
        const key = `nome:${s.nome.trim().toLowerCase()}`
        if (!map.has(key)) {
          map.set(key, s.nome.trim())
        }
      }
    })

    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [itensEstoque, sobras])

  // Helper para verificar se a sobra está parada
  const agoraMs = Date.now()
  const msPorDia = 24 * 60 * 60 * 1000

  function getDiasCriacao(criadoEm: string): number {
    const dataCriacao = new Date(criadoEm).getTime()
    if (isNaN(dataCriacao)) return 0
    return Math.max(0, Math.floor((agoraMs - dataCriacao) / msPorDia))
  }

  function isParada(sobra: any): boolean {
    if (sobra.status !== 'disponivel') return false
    return getDiasCriacao(sobra.criado_em) >= diasParada
  }

  // Filtragem base por busca e item de origem
  function matchFiltrosBase(s: any): boolean {
    // 1. Busca textual
    if (search.trim()) {
      const q = search.toLowerCase()
      const matchNome = s.nome?.toLowerCase().includes(q)
      const matchMarca = s.marca?.toLowerCase().includes(q)
      const matchCliente = s.cliente_nome?.toLowerCase().includes(q)
      if (!matchNome && !matchMarca && !matchCliente) return false
    }

    // 2. Filtro de item de origem
    if (filtroOrigem !== 'todos') {
      if (filtroOrigem.startsWith('item:')) {
        const targetItemId = filtroOrigem.replace('item:', '')
        if (s.item_id !== targetItemId) return false
      } else if (filtroOrigem.startsWith('nome:')) {
        const targetNome = filtroOrigem.replace('nome:', '')
        if (s.nome?.trim().toLowerCase() !== targetNome) return false
      }
    }

    return true
  }

  // Sobras disponíveis divididas por tipo
  const sobrasDisponiveis = useMemo(() => {
    return sobras.filter((s) => s.status === 'disponivel')
  }, [sobras])

  const totalParadas = useMemo(() => {
    return sobrasDisponiveis.filter((s) => isParada(s)).length
  }, [sobrasDisponiveis, diasParada])

  const retalhosFiltrados = useMemo(() => {
    return sobras
      .filter((s) => s.status === 'disponivel')
      .filter((s) => !s.tipo || s.tipo === 'retalho' || s.tipo === 'Retalho MDF')
      .filter(matchFiltrosBase)
  }, [sobras, search, filtroOrigem])

  const chapasFiltradas = useMemo(() => {
    return sobras
      .filter((s) => s.status === 'disponivel')
      .filter((s) => s.tipo === 'chapa_inteira' || s.tipo === 'Chapa Inteira MDF')
      .filter(matchFiltrosBase)
  }, [sobras, search, filtroOrigem])

  const fitasRoloFiltradas = useMemo(() => {
    return sobras
      .filter((s) => s.status === 'disponivel')
      .filter((s) => s.tipo === 'fita_rolo' || s.tipo === 'Fita de Bordas (Rolo)')
      .filter(matchFiltrosBase)
  }, [sobras, search, filtroOrigem])

  const fitasPedacoFiltradas = useMemo(() => {
    return sobras
      .filter((s) => s.status === 'disponivel')
      .filter((s) => s.tipo === 'fita_pedaco' || s.tipo === 'Fita de Bordas (Pedaço)')
      .filter(matchFiltrosBase)
  }, [sobras, search, filtroOrigem])

  // Sobras baixadas com filtro de período
  const baixadasFiltradas = useMemo(() => {
    return sobras
      .filter((s) => s.status === 'usado')
      .filter(matchFiltrosBase)
      .filter((s) => {
        if (periodoBaixa === 'todos') return true
        if (!s.usado_em) return true

        const dataUso = new Date(s.usado_em).getTime()
        if (isNaN(dataUso)) return true

        if (periodoBaixa === '7d') {
          return dataUso >= agoraMs - 7 * msPorDia
        }
        if (periodoBaixa === '30d') {
          return dataUso >= agoraMs - 30 * msPorDia
        }
        if (periodoBaixa === '90d') {
          return dataUso >= agoraMs - 90 * msPorDia
        }
        if (periodoBaixa === 'custom') {
          if (dataInicioBaixa) {
            const inicio = new Date(`${dataInicioBaixa}T00:00:00`).getTime()
            if (!isNaN(inicio) && dataUso < inicio) return false
          }
          if (dataFimBaixa) {
            const fim = new Date(`${dataFimBaixa}T23:59:59`).getTime()
            if (!isNaN(fim) && dataUso > fim) return false
          }
          return true
        }
        return true
      })
      .sort((a, b) => {
        const timeA = a.usado_em ? new Date(a.usado_em).getTime() : 0
        const timeB = b.usado_em ? new Date(b.usado_em).getTime() : 0
        return timeB - timeA
      })
  }, [sobras, search, filtroOrigem, periodoBaixa, dataInicioBaixa, dataFimBaixa])

  function formatarDimensao(sobra: any): string {
    const tipo = sobra.tipo || 'retalho'
    if (tipo === 'fita_rolo' || tipo === 'Fita de Bordas (Rolo)') {
      return sobra.largura ? `${sobra.largura} mm (rolo)` : 'Rolo'
    }
    if (tipo === 'fita_pedaco' || tipo === 'Fita de Bordas (Pedaço)') {
      return `${sobra.largura || 0} mm x ${sobra.comprimento || 0} m`
    }
    if (tipo === 'chapa_inteira' || tipo === 'Chapa Inteira MDF') {
      return sobra.espessura ? `Chapa inteira (${sobra.espessura} mm)` : 'Chapa inteira'
    }
    // retalho
    const alt = sobra.altura || 0
    const lar = sobra.largura || 0
    const esp = sobra.espessura ? ` x ${sobra.espessura}mm` : ''
    const area = sobra.area ? ` (${Number(sobra.area).toFixed(2)} m²)` : ''
    return `${alt} x ${lar} mm${esp}${area}`
  }

  function getCanalBadge(canal?: string | null) {
    if (!canal) return null
    if (canal === 'qr') {
      return (
        <Badge
          variant="outline"
          className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300"
        >
          QR Code
        </Badge>
      )
    }
    return (
      <Badge
        variant="outline"
        className="bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300"
      >
        Manual
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-midnight-navy dark:text-slate-100 flex items-center gap-2">
            Gestão de Sobras (MDF e Fitas)
          </h2>
          <p className="text-gray-500 dark:text-slate-400">
            Gerencie retalhos, chapas inteiras excedentes, histórico de baixas e restauração.
          </p>
        </div>
        <Button
          className="bg-steel-blue hover:bg-dark-denim text-white"
          onClick={() => setIsTypeSelectionOpen(true)}
        >
          Registrar Sobra
        </Button>
      </div>

      {/* Alerta de Sobras Paradas (Extra 6) */}
      {totalParadas > 0 && (
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/80 dark:bg-amber-950/30 dark:border-amber-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-sm">
                Alerta de Sobras Paradas: {totalParadas}{' '}
                {totalParadas === 1 ? 'sobra sem baixa' : 'sobras sem baixa'} há mais de{' '}
                {diasParada} dias
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300/80">
                Priorize a utilização dessas sobras antes de cortar novas chapas para evitar
                desperdício e acúmulo no estoque.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center text-xs">
            <span className="text-amber-800 dark:text-amber-300 whitespace-nowrap">Critério:</span>
            <Select value={String(diasParada)} onValueChange={(val) => setDiasParada(Number(val))}>
              <SelectTrigger className="h-8 w-[110px] bg-white dark:bg-slate-900 border-amber-300 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 dias</SelectItem>
                <SelectItem value="30">30 dias</SelectItem>
                <SelectItem value="45">45 dias</SelectItem>
                <SelectItem value="60">60 dias</SelectItem>
                <SelectItem value="90">90 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Barra de Filtros Compartilhada (Busca + Filtro por Item de Origem) */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-card p-3 rounded-lg border border-border">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por nome, marca ou cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filtro por item de origem (Extra 5) */}
        <div className="flex items-center gap-2 min-w-[260px] md:max-w-[340px]">
          <Filter className="w-4 h-4 text-gray-400 shrink-0" />
          <Select value={filtroOrigem} onValueChange={setFiltroOrigem}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Item de origem (todos)" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              <SelectItem value="todos">Todos os itens de origem</SelectItem>
              {opcoesOrigem.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {filtroOrigem !== 'todos' && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-500 hover:text-gray-700"
              onClick={() => setFiltroOrigem('todos')}
              title="Limpar filtro de origem"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Tabs com a nova sub-aba "Baixadas" */}
      <Tabs defaultValue="retalhos" className="space-y-4">
        <TabsList className="mb-2 flex-wrap h-auto gap-1">
          <TabsTrigger value="retalhos">Retalho MDF ({retalhosFiltrados.length})</TabsTrigger>
          <TabsTrigger value="chapas">Chapa Inteira MDF ({chapasFiltradas.length})</TabsTrigger>
          <TabsTrigger value="fitas-rolo">
            Fita de Bordas - Rolo ({fitasRoloFiltradas.length})
          </TabsTrigger>
          <TabsTrigger value="fitas-pedaco">
            Fita de Bordas - Pedaço ({fitasPedacoFiltradas.length})
          </TabsTrigger>
          <TabsTrigger
            value="baixadas"
            className="data-[state=active]:bg-amber-500 data-[state=active]:text-white flex items-center gap-1.5"
          >
            <ArchiveRestore className="w-4 h-4" />
            Baixadas ({baixadasFiltradas.length})
          </TabsTrigger>
        </TabsList>

        {/* SUB-ABA 1: Retalhos MDF */}
        <TabsContent value="retalhos" className="m-0">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-auto max-h-[calc(100vh-320px)] rounded-lg">
                <Table className="min-w-[1050px]">
                  <TableHeader className="bg-muted sticky top-0 z-10 shadow-sm">
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Cliente/Projeto</TableHead>
                      <TableHead className="whitespace-nowrap">Nome do MDF</TableHead>
                      <TableHead className="whitespace-nowrap">Marca</TableHead>
                      <TableHead className="text-center whitespace-nowrap">
                        Alt x Lar (mm)
                      </TableHead>
                      <TableHead className="text-center whitespace-nowrap">Espess. (mm)</TableHead>
                      <TableHead className="text-center whitespace-nowrap">Área (m²)</TableHead>
                      <TableHead className="whitespace-nowrap">Inserido em</TableHead>
                      <TableHead className="text-center whitespace-nowrap">Status</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {retalhosFiltrados.map((sobra) => {
                      const parada = isParada(sobra)
                      const dias = getDiasCriacao(sobra.criado_em)
                      return (
                        <TableRow
                          key={sobra.id}
                          className={parada ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''}
                        >
                          <TableCell className="font-medium">{sobra.cliente_nome || '-'}</TableCell>
                          <TableCell className="font-semibold text-gray-900 dark:text-slate-100">
                            {sobra.nome}
                          </TableCell>
                          <TableCell>{sobra.marca || '-'}</TableCell>
                          <TableCell className="text-center">
                            {sobra.altura} x {sobra.largura}
                          </TableCell>
                          <TableCell className="text-center">{sobra.espessura ?? '-'}</TableCell>
                          <TableCell className="text-center font-bold text-steel-blue dark:text-blue-400">
                            {sobra.area ? Number(sobra.area).toFixed(2) : '0.00'} m²
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                            <div className="flex flex-col">
                              <span className="font-medium text-foreground">
                                {formatSafeDate(sobra.criado_em, 'dd/MM/yyyy HH:mm')}
                              </span>
                              {parada && (
                                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1 mt-0.5">
                                  <Clock className="w-3 h-3" /> Parada há {dias} dias
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className="bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-900"
                            >
                              Disponível
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/50 mr-1"
                              onClick={() => printScrapLabel(sobra)}
                              title="Imprimir Etiqueta"
                            >
                              <Printer className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/50 mr-1"
                              onClick={() => setSobraParaBaixar(sobra)}
                              title="Marcar Uso (Baixar)"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-amber-500 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/50 h-8 w-8 mr-1"
                              onClick={() => openEditModal(sobra)}
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50 h-8 w-8"
                              onClick={() => setSobraParaDeletar(sobra)}
                              title="Deletar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {retalhosFiltrados.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          {loading
                            ? 'Carregando retalhos...'
                            : 'Nenhum retalho disponível encontrado.'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SUB-ABA 2: Chapa Inteira MDF */}
        <TabsContent value="chapas" className="m-0">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-auto max-h-[calc(100vh-320px)] rounded-lg">
                <Table className="min-w-[900px]">
                  <TableHeader className="bg-muted sticky top-0 z-10 shadow-sm">
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Cliente/Projeto</TableHead>
                      <TableHead className="whitespace-nowrap">Nome do MDF</TableHead>
                      <TableHead className="whitespace-nowrap">Marca</TableHead>
                      <TableHead className="text-center whitespace-nowrap">Espess. (mm)</TableHead>
                      <TableHead className="whitespace-nowrap">Inserido em</TableHead>
                      <TableHead className="text-center whitespace-nowrap">Status</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {chapasFiltradas.map((sobra) => {
                      const parada = isParada(sobra)
                      const dias = getDiasCriacao(sobra.criado_em)
                      return (
                        <TableRow
                          key={sobra.id}
                          className={parada ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''}
                        >
                          <TableCell className="font-medium">{sobra.cliente_nome || '-'}</TableCell>
                          <TableCell className="font-semibold text-gray-900 dark:text-slate-100">
                            {sobra.nome}
                          </TableCell>
                          <TableCell>{sobra.marca || '-'}</TableCell>
                          <TableCell className="text-center">{sobra.espessura ?? '-'}</TableCell>
                          <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                            <div className="flex flex-col">
                              <span className="font-medium text-foreground">
                                {formatSafeDate(sobra.criado_em, 'dd/MM/yyyy HH:mm')}
                              </span>
                              {parada && (
                                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1 mt-0.5">
                                  <Clock className="w-3 h-3" /> Parada há {dias} dias
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className="bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-900"
                            >
                              Disponível
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/50 mr-1"
                              onClick={() => setSobraParaBaixar(sobra)}
                              title="Marcar Uso (Baixar)"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-amber-500 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/50 h-8 w-8 mr-1"
                              onClick={() => openEditModal(sobra)}
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50 h-8 w-8"
                              onClick={() => setSobraParaDeletar(sobra)}
                              title="Deletar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {chapasFiltradas.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          {loading
                            ? 'Carregando chapas...'
                            : 'Nenhuma chapa inteira disponível encontrada.'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SUB-ABA 3: Fita de Bordas (Rolo) */}
        <TabsContent value="fitas-rolo" className="m-0">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-auto max-h-[calc(100vh-320px)] rounded-lg">
                <Table className="min-w-[900px]">
                  <TableHeader className="bg-muted sticky top-0 z-10 shadow-sm">
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Cliente/Projeto</TableHead>
                      <TableHead className="whitespace-nowrap">Item</TableHead>
                      <TableHead className="text-center whitespace-nowrap">Largura (mm)</TableHead>
                      <TableHead className="whitespace-nowrap">Inserido em</TableHead>
                      <TableHead className="text-center whitespace-nowrap">Status</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fitasRoloFiltradas.map((sobra) => {
                      const parada = isParada(sobra)
                      const dias = getDiasCriacao(sobra.criado_em)
                      return (
                        <TableRow
                          key={sobra.id}
                          className={parada ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''}
                        >
                          <TableCell className="font-medium">{sobra.cliente_nome || '-'}</TableCell>
                          <TableCell className="font-semibold text-gray-900 dark:text-slate-100">
                            {sobra.nome}
                          </TableCell>
                          <TableCell className="text-center">{sobra.largura || '-'}</TableCell>
                          <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                            <div className="flex flex-col">
                              <span className="font-medium text-foreground">
                                {formatSafeDate(sobra.criado_em, 'dd/MM/yyyy HH:mm')}
                              </span>
                              {parada && (
                                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1 mt-0.5">
                                  <Clock className="w-3 h-3" /> Parada há {dias} dias
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className="bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-900"
                            >
                              Disponível
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/50 mr-1"
                              onClick={() => printScrapLabel(sobra)}
                              title="Imprimir Etiqueta"
                            >
                              <Printer className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/50 mr-1"
                              onClick={() => setSobraParaBaixar(sobra)}
                              title="Marcar Uso (Baixar)"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-amber-500 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/50 h-8 w-8 mr-1"
                              onClick={() => openEditModal(sobra)}
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50 h-8 w-8"
                              onClick={() => setSobraParaDeletar(sobra)}
                              title="Deletar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {fitasRoloFiltradas.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          {loading
                            ? 'Carregando fitas...'
                            : 'Nenhuma fita (rolo) disponível encontrada.'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SUB-ABA 4: Fita de Bordas (Pedaço) */}
        <TabsContent value="fitas-pedaco" className="m-0">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-auto max-h-[calc(100vh-320px)] rounded-lg">
                <Table className="min-w-[950px]">
                  <TableHeader className="bg-muted sticky top-0 z-10 shadow-sm">
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Cliente/Projeto</TableHead>
                      <TableHead className="whitespace-nowrap">Item</TableHead>
                      <TableHead className="text-center whitespace-nowrap">Largura (mm)</TableHead>
                      <TableHead className="text-center whitespace-nowrap">
                        Comprimento (m)
                      </TableHead>
                      <TableHead className="whitespace-nowrap">Inserido em</TableHead>
                      <TableHead className="text-center whitespace-nowrap">Status</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fitasPedacoFiltradas.map((sobra) => {
                      const parada = isParada(sobra)
                      const dias = getDiasCriacao(sobra.criado_em)
                      return (
                        <TableRow
                          key={sobra.id}
                          className={parada ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''}
                        >
                          <TableCell className="font-medium">{sobra.cliente_nome || '-'}</TableCell>
                          <TableCell className="font-semibold text-gray-900 dark:text-slate-100">
                            {sobra.nome}
                          </TableCell>
                          <TableCell className="text-center">{sobra.largura || '-'}</TableCell>
                          <TableCell className="text-center">{sobra.comprimento || '-'}</TableCell>
                          <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                            <div className="flex flex-col">
                              <span className="font-medium text-foreground">
                                {formatSafeDate(sobra.criado_em, 'dd/MM/yyyy HH:mm')}
                              </span>
                              {parada && (
                                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1 mt-0.5">
                                  <Clock className="w-3 h-3" /> Parada há {dias} dias
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className="bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-900"
                            >
                              Disponível
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/50 mr-1"
                              onClick={() => printScrapLabel(sobra)}
                              title="Imprimir Etiqueta"
                            >
                              <Printer className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/50 mr-1"
                              onClick={() => setSobraParaBaixar(sobra)}
                              title="Marcar Uso (Baixar)"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-amber-500 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/50 h-8 w-8 mr-1"
                              onClick={() => openEditModal(sobra)}
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50 h-8 w-8"
                              onClick={() => setSobraParaDeletar(sobra)}
                              title="Deletar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {fitasPedacoFiltradas.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          {loading
                            ? 'Carregando pedaços...'
                            : 'Nenhum pedaço de fita disponível encontrado.'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SUB-ABA 5: Baixadas (Banco de dados de sobras baixadas com restauração) */}
        <TabsContent value="baixadas" className="m-0 space-y-3">
          {/* Barra de Filtro de Período para Baixadas */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-muted/40 rounded-lg border border-border">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">Período de baixa:</span>
              <Button
                variant={periodoBaixa === 'todos' ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setPeriodoBaixa('todos')}
              >
                Todos
              </Button>
              <Button
                variant={periodoBaixa === '7d' ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setPeriodoBaixa('7d')}
              >
                Últimos 7 dias
              </Button>
              <Button
                variant={periodoBaixa === '30d' ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setPeriodoBaixa('30d')}
              >
                Últimos 30 dias
              </Button>
              <Button
                variant={periodoBaixa === '90d' ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setPeriodoBaixa('90d')}
              >
                Últimos 90 dias
              </Button>
              <Button
                variant={periodoBaixa === 'custom' ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setPeriodoBaixa('custom')}
              >
                Personalizado
              </Button>
            </div>

            {periodoBaixa === 'custom' && (
              <div className="flex items-center gap-2 text-xs">
                <Input
                  type="date"
                  value={dataInicioBaixa}
                  onChange={(e) => setDataInicioBaixa(e.target.value)}
                  className="h-7 text-xs w-[130px]"
                />
                <span className="text-muted-foreground">até</span>
                <Input
                  type="date"
                  value={dataFimBaixa}
                  onChange={(e) => setDataFimBaixa(e.target.value)}
                  className="h-7 text-xs w-[130px]"
                />
              </div>
            )}
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-auto max-h-[calc(100vh-360px)] rounded-lg">
                <Table className="min-w-[1100px]">
                  <TableHeader className="bg-muted sticky top-0 z-10 shadow-sm">
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Item / Material</TableHead>
                      <TableHead className="whitespace-nowrap">Tipo</TableHead>
                      <TableHead className="whitespace-nowrap">Dimensões</TableHead>
                      <TableHead className="whitespace-nowrap">Origem / Cliente</TableHead>
                      <TableHead className="whitespace-nowrap">Inserido em</TableHead>
                      <TableHead className="whitespace-nowrap">Baixado em</TableHead>
                      <TableHead className="whitespace-nowrap">Baixado por</TableHead>
                      <TableHead className="text-center whitespace-nowrap">Canal</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {baixadasFiltradas.map((sobra) => {
                      const usuarioBaixa = sobra.baixado_por
                        ? usersMap[sobra.baixado_por] || 'Usuário do sistema'
                        : '-'
                      return (
                        <TableRow key={sobra.id} className="hover:bg-muted/50">
                          <TableCell className="font-semibold text-gray-900 dark:text-slate-100">
                            <div>
                              <span>{sobra.nome}</span>
                              {sobra.marca && (
                                <span className="block text-xs text-muted-foreground font-normal">
                                  Marca: {sobra.marca}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {sobra.tipo || 'Retalho MDF'}
                          </TableCell>
                          <TableCell className="text-xs font-mono font-medium">
                            {formatarDimensao(sobra)}
                          </TableCell>
                          <TableCell className="text-xs">
                            {sobra.cliente_nome ? (
                              <span className="font-medium text-foreground">
                                {sobra.cliente_nome}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                            {formatSafeDate(sobra.criado_em, 'dd/MM/yyyy HH:mm')}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-xs font-semibold text-amber-700 dark:text-amber-400">
                            {formatSafeDate(sobra.usado_em, 'dd/MM/yyyy HH:mm')}
                          </TableCell>
                          <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                            {usuarioBaixa}
                          </TableCell>
                          <TableCell className="text-center whitespace-nowrap">
                            {getCanalBadge(sobra.canal_baixa) || (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-950/40 h-8 font-medium gap-1.5"
                              onClick={() => setSobraParaRestaurar(sobra)}
                              title="Restaurar sobra para o status disponível"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              Restaurar
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {baixadasFiltradas.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                          {loading
                            ? 'Carregando histórico...'
                            : 'Nenhuma sobra baixada encontrada para o período selecionado.'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* DIALOG: Confirmação de Restauração (Ponto 3) */}
      <AlertDialog
        open={Boolean(sobraParaRestaurar)}
        onOpenChange={(open) => !open && setSobraParaRestaurar(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <RotateCcw className="w-5 h-5" />
              Restaurar Sobra para o Estoque?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 pt-2">
              <p>
                Deseja devolver a sobra <strong>{sobraParaRestaurar?.nome}</strong> ao status{' '}
                <strong className="text-emerald-600">Disponível</strong>?
              </p>
              <div className="bg-muted p-3 rounded-md text-xs space-y-1 text-foreground">
                <p>
                  <strong>Tipo:</strong> {sobraParaRestaurar?.tipo || 'Retalho MDF'}
                </p>
                <p>
                  <strong>Dimensões:</strong>{' '}
                  {sobraParaRestaurar ? formatarDimensao(sobraParaRestaurar) : '-'}
                </p>
                {sobraParaRestaurar?.usado_em && (
                  <p>
                    <strong>Baixado em:</strong>{' '}
                    {formatSafeDate(sobraParaRestaurar.usado_em, 'dd/MM/yyyy HH:mm')}
                  </p>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                A sobra voltará imediatamente para a lista de sobras ativas e o QR code original
                voltará a funcionar para baixas futuras.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRestaurar}
              disabled={actionLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {actionLoading ? 'Restaurando...' : 'Confirmar Restauração'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* DIALOG: Confirmação de Baixa Manual */}
      <AlertDialog
        open={Boolean(sobraParaBaixar)}
        onOpenChange={(open) => !open && setSobraParaBaixar(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <Check className="w-5 h-5" />
              Confirmar Baixa de Sobra?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 pt-2">
              <p>
                Marcar a sobra <strong>{sobraParaBaixar?.nome}</strong> como utilizada?
              </p>
              <p className="text-xs text-muted-foreground">
                O registro será gravado com o seu usuário ({user?.email}) no canal manual e o item
                poderá ser consultado ou restaurado na sub-aba <strong>Baixadas</strong>.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBaixar}
              disabled={actionLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {actionLoading ? 'Processando...' : 'Confirmar Baixa'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* DIALOG: Confirmação de Deleção Permanente */}
      <AlertDialog
        open={Boolean(sobraParaDeletar)}
        onOpenChange={(open) => !open && setSobraParaDeletar(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Apagar Registro Permanente?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja apagar permanentemente a sobra{' '}
              <strong>{sobraParaDeletar?.nome}</strong>? Esta ação não pode ser desfeita. (Se o item
              foi usado em projeto, prefira dar baixa).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeletar}
              disabled={actionLoading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {actionLoading ? 'Apagando...' : 'Apagar Registro'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* DIALOG: Seleção de Tipo de Sobra */}
      <Dialog open={isTypeSelectionOpen} onOpenChange={setIsTypeSelectionOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Tipo de Sobra</DialogTitle>
            <DialogDescription>
              Selecione o tipo de sobra de projeto que deseja registrar no sistema.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4">
            <Button
              variant="outline"
              className="h-32 flex flex-col items-center justify-center gap-4 hover:border-steel-blue hover:text-steel-blue transition-colors whitespace-normal"
              onClick={() => {
                setIsTypeSelectionOpen(false)
                setSobraEditando(null)
                setIsRetalhoModalOpen(true)
              }}
            >
              <Scissors className="w-8 h-8" />
              <div className="text-center font-semibold">Retalho MDF</div>
            </Button>
            <Button
              variant="outline"
              className="h-32 flex flex-col items-center justify-center gap-4 hover:border-emerald-600 hover:text-emerald-600 transition-colors whitespace-normal"
              onClick={() => {
                setIsTypeSelectionOpen(false)
                setChapaEditando(null)
                setIsChapaModalOpen(true)
              }}
            >
              <LayoutTemplate className="w-8 h-8" />
              <div className="text-center font-semibold">Chapa Inteira MDF</div>
            </Button>
            <Button
              variant="outline"
              className="h-32 flex flex-col items-center justify-center gap-4 hover:border-amber-600 hover:text-amber-600 transition-colors whitespace-normal"
              onClick={() => {
                setIsTypeSelectionOpen(false)
                setFitaEditando(null)
                setIsFitaRoloModalOpen(true)
              }}
            >
              <Disc className="w-8 h-8" />
              <div className="text-center font-semibold">Fita de Bordas (Rolo)</div>
            </Button>
            <Button
              variant="outline"
              className="h-32 flex flex-col items-center justify-center gap-4 hover:border-purple-600 hover:text-purple-600 transition-colors whitespace-normal"
              onClick={() => {
                setIsTypeSelectionOpen(false)
                setFitaEditando(null)
                setIsFitaPedacoModalOpen(true)
              }}
            >
              <Ruler className="w-8 h-8" />
              <div className="text-center font-semibold">Fita de Bordas (Pedaço)</div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modais de Cadastro/Edição */}
      <RegistrarRetalhoModal
        isOpen={isRetalhoModalOpen}
        onClose={() => setIsRetalhoModalOpen(false)}
        sobraParaEditar={sobraEditando}
        onSave={fetchSobras}
      />

      <RegistrarChapaModal
        isOpen={isChapaModalOpen}
        onClose={() => setIsChapaModalOpen(false)}
        sobraParaEditar={chapaEditando}
        onSave={fetchSobras}
      />

      <RegistrarFitaRoloModal
        isOpen={isFitaRoloModalOpen}
        onClose={() => setIsFitaRoloModalOpen(false)}
        sobraParaEditar={fitaEditando}
        onSave={fetchSobras}
      />

      <RegistrarFitaPedacoModal
        isOpen={isFitaPedacoModalOpen}
        onClose={() => setIsFitaPedacoModalOpen(false)}
        sobraParaEditar={fitaEditando}
        onSave={fetchSobras}
      />
    </div>
  )
}
