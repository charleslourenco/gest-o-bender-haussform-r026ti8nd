import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  AlertCircle,
  GripVertical,
  User,
  Package,
  CalendarClock,
  Trash2,
  FileSearch,
  AlertTriangle,
  Plus,
  Wrench,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { KanbanHeader } from './KanbanHeader'
import { MontadorSelect } from './MontadorSelect'
import { CreateCardDialog } from './CreateCardDialog'
import { MontadoresTab } from '@/pages/MontadoresTab'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Scissors, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface ColumnDef {
  id: string
  title: string
}

interface KanbanBoardProps {
  title: string
  columns: ColumnDef[]
}

interface Item {
  id: string
  nome_produto: string
  codigo_rastreio: string | null
  qtd: number
  status_analise: string
  cliente: { nome: string } | null
  cliente_id?: string | null
  criado_em: string
  analista_id: string | null
  formulario: { user_id: string } | null
  alocacao_montagem?: { montador_id: string }[]
  terceirizado_validado?: boolean
  outsourced_checked?: boolean
  is_outsourced?: boolean
}

const ALL_STATUS_OPTIONS = [
  { id: 'iniciar', title: 'Iniciar' },
  { id: 'aguardando_liberacao', title: 'Aguardando liberação' },
  { id: 'medida_fina', title: 'Medida Fina' },
  { id: 'reuniao_analise', title: 'Reunião de Análise' },
  { id: 'caderno_tecnico', title: 'Caderno Técnico' },
  { id: 'alteracao_projeto', title: 'Alteração de projeto' },
  { id: 'lista_materiais', title: 'Lista de Materiais' },
  { id: 'aguardando_plano_corte', title: 'Aguardando Plano de Corte' },
  { id: 'router', title: 'Router' },
  { id: 'coladeira', title: 'Coladeira' },
  { id: 'bancada', title: 'Bancada' },
  { id: 'embalagem', title: 'Embalagem' },
  { id: 'expedicao', title: 'Expedição' },
  { id: 'aguardando_agenda', title: 'Aguardando Agenda' },
  { id: 'transporte', title: 'Transporte' },
  { id: 'montagem', title: 'Montagem' },
  { id: 'item_terceirizado', title: 'Item Terceirizado' },
  { id: 'pendencia', title: 'Pendência' },
  { id: 'assistencia', title: 'Assistência' },
  { id: 'concluido', title: 'Concluído' },
]

function TimeInColumn({
  cardId,
  status,
  criado_em,
}: {
  cardId: string
  status: string
  criado_em: string
}) {
  const [timeStr, setTimeStr] = useState<string>('')

  useEffect(() => {
    let isMounted = true
    const fetchTime = async () => {
      const { data } = await supabase
        .from('kanban_historico')
        .select('criado_em')
        .eq('card_id', cardId)
        .eq('status_novo', status)
        .order('criado_em', { ascending: false })
        .limit(1)

      if (!isMounted) return

      const startTime = data && data.length > 0 ? data[0].criado_em : criado_em

      if (startTime) {
        const diffInMs = new Date().getTime() - new Date(startTime).getTime()
        const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))
        const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))

        if (diffInDays > 0) {
          setTimeStr(`⏱️ ${diffInDays}d`)
        } else if (diffInHours > 0) {
          setTimeStr(`⏱️ ${diffInHours}h`)
        } else {
          setTimeStr(`⏱️ < 1h`)
        }
      }
    }

    fetchTime()
    const interval = setInterval(fetchTime, 60000)
    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [cardId, status, criado_em])

  if (!timeStr) return null
  return <span className="text-[10px] text-white/80 font-medium leading-none">{timeStr}</span>
}

export function KanbanBoard({ title, columns }: KanbanBoardProps) {
  const [items, setItems] = useState<Item[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAnalyst, setSelectedAnalyst] = useState('all')
  const [selectedConsultant, setSelectedConsultant] = useState('all')
  const [usersMap, setUsersMap] = useState<Record<string, any>>({})
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [allMontadores, setAllMontadores] = useState<any[]>([])

  const isMontagemRoute =
    typeof window !== 'undefined' && window.location.pathname.includes('/montagem')
  const isAnaliseTecnica =
    typeof window !== 'undefined' && window.location.pathname.includes('/analise-tecnica')
  const isProducao = typeof window !== 'undefined' && window.location.pathname.includes('/producao')

  const [showSobrasPrompt, setShowSobrasPrompt] = useState(false)
  const [showSobrasRegister, setShowSobrasRegister] = useState(false)
  const [novaSobra, setNovaSobra] = useState({ nome: '', largura: 0, altura: 0 })
  const [descarteSugerido, setDescarteSugerido] = useState(false)
  const [activeView, setActiveView] = useState<'kanban' | 'lista' | 'indicadores' | 'montadores'>(
    'kanban',
  )

  const [validatingCardId, setValidatingCardId] = useState<string | null>(null)
  const [showTerceirizadoDialog, setShowTerceirizadoDialog] = useState(false)
  const [showCreateAvulsoForValidation, setShowCreateAvulsoForValidation] = useState(false)

  const handleOpenValidation = (id: string) => {
    setValidatingCardId(id)
    setShowTerceirizadoDialog(true)
  }

  const handleNoTerceirizado = async () => {
    if (!validatingCardId) return
    try {
      const { error } = await supabase
        .from('produtos_servicos_projeto')
        .update({ outsourced_checked: true })
        .eq('id', validatingCardId)
      if (error) throw error
      setItems((prev) =>
        prev.map((i) => (i.id === validatingCardId ? { ...i, outsourced_checked: true } : i)),
      )
      toast.success('Validação concluída com sucesso!')
    } catch (err: any) {
      toast.error('Erro ao validar: ' + err.message)
    } finally {
      setShowTerceirizadoDialog(false)
      setValidatingCardId(null)
    }
  }

  const handleYesTerceirizado = () => {
    setShowTerceirizadoDialog(false)
    setShowCreateAvulsoForValidation(true)
  }

  const handleValidationCardCreated = async () => {
    if (validatingCardId) {
      try {
        await supabase
          .from('produtos_servicos_projeto')
          .update({ outsourced_checked: true })
          .eq('id', validatingCardId)
        setItems((prev) =>
          prev.map((i) => (i.id === validatingCardId ? { ...i, outsourced_checked: true } : i)),
        )
      } catch (err) {
        console.error('Erro no auto-validation:', err)
      } finally {
        setValidatingCardId(null)
        setShowCreateAvulsoForValidation(false)
      }
    }
  }

  const handleStatusChange = async (itemId: string, newStatusId: string) => {
    const item = items.find((i) => i.id === itemId)
    if (!item || item.status_analise === newStatusId) return

    if (isAnaliseTecnica && !item.is_outsourced && !item.outsourced_checked) {
      toast.error('Verifique os itens terceirizados primeiro.')
      return
    }

    let finalStatus = newStatusId
    let isAutoTransition = false

    if (newStatusId === 'lista_materiais') {
      finalStatus = 'aguardando_plano_corte'
      isAutoTransition = true
    } else if (newStatusId === 'expedicao') {
      finalStatus = 'aguardando_agenda'
      isAutoTransition = true
    }

    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, status_analise: finalStatus } : i)),
    )

    try {
      if (isAutoTransition) {
        await supabase
          .from('produtos_servicos_projeto')
          .update({ status_analise: newStatusId, atualizado_em: new Date().toISOString() })
          .eq('id', itemId)

        const { error: updateErr } = await supabase
          .from('produtos_servicos_projeto')
          .update({ status_analise: finalStatus, atualizado_em: new Date().toISOString() })
          .eq('id', itemId)

        if (updateErr) throw updateErr

        if (newStatusId === 'lista_materiais') {
          toast.success(
            'Card transferido automaticamente para Produção (Aguardando Plano de Corte).',
          )
        } else if (newStatusId === 'expedicao') {
          toast.success('Card transferido automaticamente para Montagem (Aguardando Agenda).')
        }
      } else {
        const { error: updateErr } = await supabase
          .from('produtos_servicos_projeto')
          .update({ status_analise: newStatusId, atualizado_em: new Date().toISOString() })
          .eq('id', itemId)

        if (updateErr) throw updateErr
        toast.success('Status atualizado com sucesso!')
      }

      if (finalStatus === 'aguardando_agenda') {
        setShowSobrasPrompt(true)
      }
    } catch (err: any) {
      toast.error('Erro ao atualizar status: ' + err.message)
      fetchItems()
    }
  }

  useEffect(() => {
    if (novaSobra.largura > 0 && novaSobra.altura > 0) {
      const area = novaSobra.largura * novaSobra.altura
      setDescarteSugerido(area < 1)
    } else {
      setDescarteSugerido(false)
    }
  }, [novaSobra.largura, novaSobra.altura])

  const handleSalvarSobra = async () => {
    if (!novaSobra.nome || novaSobra.largura <= 0 || novaSobra.altura <= 0) {
      return toast.error('Preencha todos os campos corretamente')
    }

    const area = novaSobra.largura * novaSobra.altura
    if (area < 1) {
      toast.error('Peça muito pequena! Peças menores que 1m² devem ser descartadas.')
      return
    }

    try {
      const { error } = await supabase.from('estoque_sobras').insert({
        nome: novaSobra.nome,
        largura: novaSobra.largura,
        altura: novaSobra.altura,
        area: area,
        status: 'disponivel',
      })

      if (error) throw error

      toast.success('Retalho registrado com sucesso no estoque de sobras!')
      setShowSobrasRegister(false)
      setNovaSobra({ nome: '', largura: 0, altura: 0 })
    } catch (err: any) {
      toast.error('Erro ao registrar sobra: ' + err.message)
    }
  }

  useEffect(() => {
    fetchItems()

    const handleKanbanUpdated = () => fetchItems()
    const handleTabChange = (e: any) => setActiveView(e.detail)
    window.addEventListener('kanban_updated', handleKanbanUpdated)
    window.addEventListener('kanban_tab_change', handleTabChange)

    const channel = supabase
      .channel('kanban_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'produtos_servicos_projeto',
        },
        () => {
          fetchItems()
        },
      )
      .subscribe()

    return () => {
      window.removeEventListener('kanban_updated', handleKanbanUpdated)
      window.removeEventListener('kanban_tab_change', handleTabChange)
      supabase.removeChannel(channel)
    }
  }, [columns])

  const fetchItems = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: err } = await supabase.from('produtos_servicos_projeto').select(`
          id, 
          nome_produto, 
          codigo_rastreio, 
          qtd, 
          status_analise, 
          criado_em,
          analista_id,
          cliente_id,
          terceirizado_validado,
          outsourced_checked,
          is_outsourced,
          cliente:clientes(nome),
          formulario:formulario_comercial(user_id, nome_cliente, cliente:clientes(nome)),
          alocacao_montagem(montador_id)
        `)

      if (err) throw err

      if (isMontagemRoute) {
        const { data: montData } = await supabase
          .from('montadores')
          .select('*, alocacao_montagem(card_id, produtos_servicos_projeto(cliente_id))')
        if (montData) setAllMontadores(montData)
      }

      // We only care about items that are in one of the columns provided to this board
      const columnIds = columns.map((c) => c.id)
      const validItems = (data as unknown as Item[]).filter((i) =>
        columnIds.includes(i.status_analise),
      )

      setItems(validItems)
    } catch (err: any) {
      console.error('Erro ao carregar dados do Kanban:', err)
      setError(err.message || 'Erro ao carregar dados do Kanban.')
    } finally {
      setLoading(false)
    }
  }

  const uniqueAnalysts = Array.from(
    new Set(items.map((i) => i.analista_id).filter(Boolean)),
  ) as string[]
  const uniqueConsultants = Array.from(
    new Set(items.map((i) => i.formulario?.user_id).filter(Boolean)),
  ) as string[]

  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase
        .from('users')
        .select('id, nome, foto_perfil')
        .eq('status', true)
        .order('nome')
      if (data) {
        const map: Record<string, any> = {}
        data.forEach((u) => {
          map[u.id] = u
        })
        setUsersMap(map)
        setAllUsers(data)
      }
    }
    fetchUsers()
  }, [])

  const getClienteNome = (item: any) => {
    const nome = Array.isArray(item.cliente) ? item.cliente[0]?.nome : item.cliente?.nome
    if (nome) return nome

    if (item.formulario) {
      const form = Array.isArray(item.formulario) ? item.formulario[0] : item.formulario
      const formCli = Array.isArray(form?.cliente) ? form.cliente[0]?.nome : form?.cliente?.nome
      if (formCli) return formCli
      if (form?.nome_cliente) return form.nome_cliente
    }
    return null
  }

  const filteredItems = items.filter((item) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const matchName = item.nome_produto?.toLowerCase().includes(q)
      const matchCode = item.codigo_rastreio?.toLowerCase().includes(q)
      const matchClient = getClienteNome(item)?.toLowerCase().includes(q)
      if (!matchName && !matchCode && !matchClient) return false
    }

    if (selectedAnalyst !== 'all') {
      if (selectedAnalyst === 'unassigned' && item.analista_id !== null) return false
      if (selectedAnalyst !== 'unassigned' && item.analista_id !== selectedAnalyst) return false
    }

    if (selectedConsultant !== 'all') {
      if (item.formulario?.user_id !== selectedConsultant) return false
    }

    return true
  })

  const handleDragStart = (e: React.DragEvent, item: Item) => {
    if (isAnaliseTecnica && !item.is_outsourced && !item.outsourced_checked) {
      e.preventDefault()
      toast.error('Verifique os itens terceirizados primeiro.')
      return
    }
    e.dataTransfer.setData('itemId', item.id)
    // Pequeno delay para a classe visual ser aplicada apenas no elemento arrastado, não no ghost
    setTimeout(() => {
      if (e.target instanceof HTMLElement) {
        e.target.classList.add('opacity-50', 'ring-2', 'ring-steel-blue')
      }
    }, 0)
  }

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.target instanceof HTMLElement) {
      e.target.classList.remove('opacity-50', 'ring-2', 'ring-steel-blue')
    }
  }

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const scrollSpeedRef = useRef(0)
  const animationRef = useRef<number | null>(null)

  const startAutoScroll = () => {
    if (!animationRef.current) {
      const scroll = () => {
        if (scrollContainerRef.current && scrollSpeedRef.current !== 0) {
          scrollContainerRef.current.scrollLeft += scrollSpeedRef.current
        }
        animationRef.current = requestAnimationFrame(scroll)
      }
      animationRef.current = requestAnimationFrame(scroll)
    }
  }

  const stopAutoScroll = () => {
    scrollSpeedRef.current = 0
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
  }

  useEffect(() => {
    const handleGlobalDrop = () => stopAutoScroll()
    window.addEventListener('dragend', handleGlobalDrop)
    window.addEventListener('drop', handleGlobalDrop)
    return () => {
      window.removeEventListener('dragend', handleGlobalDrop)
      window.removeEventListener('drop', handleGlobalDrop)
    }
  }, [])

  const handleContainerDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!scrollContainerRef.current) return

    const container = scrollContainerRef.current
    const rect = container.getBoundingClientRect()
    const x = e.clientX - rect.left
    const scrollThreshold = 100 // px from edge
    const maxScrollSpeed = 15

    let speed = 0
    if (x < scrollThreshold) {
      speed = -maxScrollSpeed * (1 - Math.max(0, x) / scrollThreshold)
    } else if (rect.width - x < scrollThreshold) {
      speed = maxScrollSpeed * (1 - Math.max(0, rect.width - x) / scrollThreshold)
    }

    if (speed !== 0) {
      scrollSpeedRef.current = speed
      startAutoScroll()
    } else {
      stopAutoScroll()
    }
  }

  const handleContainerDragLeave = (e: React.DragEvent) => {
    const rect = scrollContainerRef.current?.getBoundingClientRect()
    if (rect) {
      if (
        e.clientX <= rect.left ||
        e.clientX >= rect.right ||
        e.clientY <= rect.top ||
        e.clientY >= rect.bottom
      ) {
        stopAutoScroll()
      }
    } else {
      stopAutoScroll()
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.classList.add('bg-steel-blue/10')
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('bg-steel-blue/10')
  }

  const handleDeleteCard = async (id: string) => {
    if (!confirm('Deseja realmente excluir este card?')) return
    try {
      const { data, error } = await supabase
        .from('produtos_servicos_projeto')
        .delete()
        .eq('id', id)
        .select('id')
      if (error) throw error
      if (!data || data.length === 0) {
        throw new Error('Sem permissão para excluir este card ou card não encontrado.')
      }
      toast.success('Card excluído com sucesso!')
      setItems((prev) => prev.filter((i) => i.id !== id))
    } catch (err: any) {
      toast.error('Erro ao excluir card: ' + err.message)
    }
  }

  const handleAssignAnalyst = async (id: string, analystId: string | null) => {
    try {
      const { error } = await supabase
        .from('produtos_servicos_projeto')
        .update({ analista_id: analystId, atualizado_em: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
      toast.success('Responsável atualizado com sucesso!')
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, analista_id: analystId } : i)))
    } catch (err: any) {
      toast.error('Erro ao atribuir responsável: ' + err.message)
    }
  }

  const handleDrop = async (e: React.DragEvent, columnId: string) => {
    e.preventDefault()
    e.currentTarget.classList.remove('bg-steel-blue/10')
    const itemId = e.dataTransfer.getData('itemId')
    if (!itemId) return

    const item = items.find((i) => i.id === itemId)
    if (!item || item.status_analise === columnId) return

    let finalStatus = columnId
    let isAutoTransition = false

    if (columnId === 'lista_materiais') {
      finalStatus = 'aguardando_plano_corte'
      isAutoTransition = true
    } else if (columnId === 'expedicao') {
      finalStatus = 'aguardando_agenda'
      isAutoTransition = true
    }

    // Optimistic UI update
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, status_analise: finalStatus } : i)),
    )

    try {
      if (isAutoTransition) {
        await supabase
          .from('produtos_servicos_projeto')
          .update({ status_analise: columnId, atualizado_em: new Date().toISOString() })
          .eq('id', itemId)

        const { error: updateErr } = await supabase
          .from('produtos_servicos_projeto')
          .update({ status_analise: finalStatus, atualizado_em: new Date().toISOString() })
          .eq('id', itemId)

        if (updateErr) throw updateErr

        if (columnId === 'lista_materiais') {
          toast.success(
            'Card transferido automaticamente para Produção (Aguardando Plano de Corte).',
          )
        } else if (columnId === 'expedicao') {
          toast.success('Card transferido automaticamente para Montagem (Aguardando Agenda).')
        }
      } else {
        const { error: updateErr } = await supabase
          .from('produtos_servicos_projeto')
          .update({ status_analise: columnId, atualizado_em: new Date().toISOString() })
          .eq('id', itemId)

        if (updateErr) throw updateErr
        toast.success('Card movido com sucesso!')
      }

      if (finalStatus === 'aguardando_agenda') {
        setShowSobrasPrompt(true)
      }
    } catch (err: any) {
      toast.error('Erro ao mover o card: ' + err.message)
      fetchItems() // revert optimistic update on error
    }
  }

  if (loading && items.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-12">
        <Loader2 className="h-10 w-10 animate-spin text-steel-blue mb-4" />
        <p className="text-midnight-navy/60 font-medium">Carregando quadro...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-12 text-center bg-off-white">
        <div className="bg-red-50 p-4 rounded-full mb-4">
          <AlertCircle className="h-10 w-10 text-red-500" />
        </div>
        <h3 className="mb-2 text-xl font-bold text-midnight-navy">Erro ao carregar Kanban</h3>
        <p className="text-sm text-midnight-navy/70 max-w-md">{error}</p>
      </div>
    )
  }

  const renderColumns = () =>
    columns.map((col) => {
      const colItems = filteredItems.filter((i) => i.status_analise === col.id)
      return (
        <div
          key={col.id}
          className={cn(
            'transition-colors duration-200 shrink-0 flex flex-col h-full',
            isAnaliseTecnica
              ? 'max-h-full w-[320px] min-w-[320px] bg-slate-100 rounded-lg'
              : isMontagemRoute || isProducao
                ? 'w-[320px] min-w-[320px] rounded-xl bg-pale-cornflower/30 border border-steel-blue/20'
                : 'w-[260px] min-w-[260px] rounded-xl bg-pale-cornflower/30 border border-steel-blue/20',
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, col.id)}
        >
          <div
            className={cn(
              'flex items-center justify-between border-b border-steel-blue/10 px-4 py-3 sticky top-0 z-10 shadow-sm shrink-0',
              isAnaliseTecnica
                ? 'bg-slate-200/60 rounded-t-lg'
                : 'bg-pale-cornflower/60 rounded-t-xl',
            )}
          >
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-midnight-navy text-sm uppercase tracking-wider">
                {col.title}
              </h3>
              {isAnaliseTecnica && col.id === 'iniciar' && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    window.dispatchEvent(new CustomEvent('open_criar_card_avulso'))
                  }}
                  className="bg-white text-midnight-navy text-[10px] font-semibold px-2 py-0.5 rounded border border-steel-blue/20 hover:bg-slate-50 transition-colors shadow-sm inline-flex items-center"
                  title="Criar card avulso"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Criar
                </button>
              )}
            </div>
            <Badge variant="secondary" className="bg-white text-steel-blue font-bold shadow-sm">
              {colItems.length}
            </Badge>
          </div>

          <div
            className={cn(
              'flex-1 overflow-y-auto space-y-2 custom-scrollbar',
              isAnaliseTecnica ? 'p-1.5 min-h-[200px]' : 'p-2 min-h-[150px]',
            )}
          >
            {colItems.map((item) => (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => handleDragStart(e, item)}
                onDragEnd={handleDragEnd}
                className={cn(
                  'group relative cursor-grab active:cursor-grabbing transition-all duration-200',
                  isProducao || isMontagemRoute
                    ? cn(
                        'bg-[#1A3D63] text-white p-2 rounded-md shadow-sm w-full flex flex-col gap-1.5 border',
                        item.is_outsourced ? 'border-orange-500' : 'border-transparent',
                      )
                    : cn(
                        'rounded-lg shadow-sm hover:shadow-md flex flex-col',
                        isAnaliseTecnica
                          ? cn(
                              'bg-[#1A3D63] text-white p-1.5 gap-1',
                              item.is_outsourced
                                ? 'border border-orange-500'
                                : 'border border-white/10 hover:border-white/30',
                            )
                          : 'bg-white border-steel-blue/20 hover:border-steel-blue/50 p-3 gap-2',
                      ),
                )}
              >
                <div
                  className={cn(
                    'absolute right-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 z-10',
                    isAnaliseTecnica || isProducao || isMontagemRoute
                      ? 'top-1 text-white/30 bg-[#1A3D63] rounded'
                      : 'top-2 text-steel-blue/30 bg-white rounded',
                  )}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteCard(item.id)
                    }}
                    className={cn(
                      'p-1 rounded transition-colors',
                      isAnaliseTecnica || isProducao || isMontagemRoute
                        ? 'hover:text-red-400 hover:bg-red-400/10'
                        : 'hover:text-red-500 hover:bg-red-50',
                    )}
                    title="Excluir card"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <div className="p-1 cursor-grab active:cursor-grabbing">
                    <GripVertical className="h-3.5 w-3.5" />
                  </div>
                </div>

                <div
                  className={cn(
                    'pr-12',
                    isAnaliseTecnica ? 'mb-0.5' : isProducao || isMontagemRoute ? 'mb-0' : 'mb-1',
                  )}
                >
                  {isProducao || isMontagemRoute ? (
                    <>
                      <div className="flex flex-row items-baseline gap-1.5 w-full truncate text-xs font-medium">
                        {item.codigo_rastreio && (
                          <span className="inline-block text-[9px] font-mono font-bold px-1 py-0.5 rounded border text-white bg-white/10 border-white/20 shrink-0 leading-none">
                            {item.codigo_rastreio}
                          </span>
                        )}
                        <span className="truncate">{getClienteNome(item) || 'Avulso'}</span>
                      </div>
                      <h4
                        className="font-semibold leading-tight text-white/90 text-xs mt-1 truncate"
                        title={item.nome_produto}
                      >
                        {item.nome_produto}
                      </h4>
                    </>
                  ) : isAnaliseTecnica ? (
                    <div className="flex flex-col gap-1 mt-0.5">
                      <div className="flex flex-row items-baseline gap-1.5 w-full truncate">
                        {item.codigo_rastreio && (
                          <span className="inline-block text-[9px] font-mono font-bold px-1 py-0.5 rounded border border-white/20 text-white bg-white/10 shrink-0 leading-none">
                            {item.codigo_rastreio}
                          </span>
                        )}
                        <span className="text-xs truncate" title={getClienteNome(item) || 'Avulso'}>
                          {getClienteNome(item) || 'Avulso'}
                        </span>
                      </div>
                      <h4
                        className="font-semibold leading-tight text-[#F6FAFD] text-xs truncate"
                        title={item.nome_produto}
                      >
                        {item.nome_produto}
                      </h4>
                      {!item.is_outsourced && !item.outsourced_checked && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenValidation(item.id)
                          }}
                          title="Terceirizado Pendente"
                          className="bg-amber-500 text-white p-0.5 rounded w-fit mt-0.5 flex items-center justify-center hover:bg-amber-600 transition-colors"
                        >
                          <AlertTriangle className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      <h4 className="font-semibold leading-tight text-midnight-navy text-sm">
                        {item.nome_produto}
                      </h4>
                      {item.codigo_rastreio && (
                        <div className="mt-1">
                          <span className="inline-block text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border text-steel-blue bg-pale-cornflower border-steel-blue/20 leading-none">
                            {item.codigo_rastreio}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {!(isProducao || isMontagemRoute) && (
                  <div
                    className={cn(
                      'flex flex-col font-medium border-t',
                      isAnaliseTecnica
                        ? 'border-white/10 text-white/70 pt-1 gap-0.5 text-[10px]'
                        : 'border-steel-blue/10 text-midnight-navy/70 pt-2 gap-1 text-xs',
                    )}
                  >
                    {!isAnaliseTecnica && getClienteNome(item) && (
                      <div className="flex items-center gap-1 truncate text-midnight-navy/90">
                        <User className="h-3 w-3 shrink-0 text-steel-blue" />
                        <span className="truncate">{getClienteNome(item)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Package
                          className={cn(
                            'h-3 w-3 shrink-0',
                            isAnaliseTecnica ? 'text-white/50' : 'text-steel-blue',
                          )}
                        />
                        <span>Qtd: {item.qtd}</span>
                      </div>
                      <div
                        className={cn(
                          'flex items-center gap-1',
                          isAnaliseTecnica ? 'text-white/50' : 'text-midnight-navy/50',
                        )}
                      >
                        <CalendarClock className="h-3 w-3 shrink-0" />
                        <span>{new Date(item.criado_em).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                  </div>
                )}

                {(isProducao || isMontagemRoute) && (
                  <div className="flex items-center justify-between mt-auto pt-0.5">
                    <div className="flex items-center gap-2">
                      <TimeInColumn
                        cardId={item.id}
                        status={item.status_analise}
                        criado_em={item.criado_em}
                      />
                      {isMontagemRoute &&
                        item.alocacao_montagem &&
                        item.alocacao_montagem.length > 0 && (
                          <div className="flex items-center gap-0.5 text-[9px] leading-none text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            <Wrench className="w-2.5 h-2.5" />
                            <span>{item.alocacao_montagem.length} Alocado(s)</span>
                          </div>
                        )}
                    </div>
                    <div className="flex items-center gap-1 text-[10px]">
                      <Package className="h-3 w-3 shrink-0 text-white/50" />
                      <span className="text-white/80">Qtd: {item.qtd}</span>
                    </div>
                  </div>
                )}

                <div
                  className={cn(
                    'border-t flex flex-col',
                    isProducao || isMontagemRoute
                      ? 'border-white/10 pt-1.5 gap-1'
                      : isAnaliseTecnica
                        ? 'border-white/10 pt-1.5 gap-1'
                        : 'border-steel-blue/10 pt-2 gap-1.5',
                  )}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  {isAnaliseTecnica && (
                    <Select
                      value={item.status_analise}
                      onValueChange={(val) => handleStatusChange(item.id, val)}
                    >
                      <SelectTrigger className="h-6 text-[10px] w-full bg-white/10 border-white/20 text-white focus:ring-0 focus:ring-offset-0 px-2">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1A3D63] border-white/20 text-white max-h-[300px]">
                        {columns.map((c) => (
                          <SelectItem
                            key={c.id}
                            value={c.id}
                            className="text-[10px] py-1 text-white/80 focus:bg-white/10 focus:text-white"
                          >
                            {c.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  <Select
                    value={item.analista_id || 'unassigned'}
                    onValueChange={(val) =>
                      handleAssignAnalyst(item.id, val === 'unassigned' ? null : val)
                    }
                  >
                    <SelectTrigger
                      className={cn(
                        'h-6 text-[10px] px-2 w-full focus:ring-0 focus:ring-offset-0',
                        isAnaliseTecnica || isProducao || isMontagemRoute
                          ? 'bg-white/10 border-white/20 text-white'
                          : 'border-steel-blue/20 bg-pale-cornflower/20 text-midnight-navy',
                      )}
                    >
                      <SelectValue placeholder="Atribuir responsável..." />
                    </SelectTrigger>
                    <SelectContent
                      className={cn(
                        (isAnaliseTecnica || isProducao || isMontagemRoute) &&
                          'bg-[#1A3D63] border-white/20 text-white',
                      )}
                    >
                      <SelectItem
                        value="unassigned"
                        className={cn(
                          'text-[10px] py-1',
                          isAnaliseTecnica || isProducao || isMontagemRoute
                            ? 'text-white/60 focus:bg-white/10 focus:text-white'
                            : 'text-muted-foreground',
                        )}
                      >
                        Não atribuído
                      </SelectItem>
                      {allUsers.map((u) => (
                        <SelectItem
                          key={u.id}
                          value={u.id}
                          className={cn(
                            'text-[10px] py-1',
                            (isAnaliseTecnica || isProducao || isMontagemRoute) &&
                              'focus:bg-white/10 focus:text-white',
                          )}
                        >
                          {u.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {isMontagemRoute && (
                    <MontadorSelect item={item} montadores={allMontadores} onUpdate={fetchItems} />
                  )}
                </div>
              </div>
            ))}

            {colItems.length === 0 && (
              <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed border-steel-blue/20 bg-white/40">
                <p className="text-sm font-medium text-steel-blue/50">Solte os cards aqui</p>
              </div>
            )}
          </div>
        </div>
      )
    })

  return (
    <div
      className={cn(
        'flex h-full flex-col overflow-hidden shadow-sm',
        isAnaliseTecnica || isMontagemRoute
          ? 'bg-off-white rounded-none border-0'
          : 'bg-off-white rounded-lg border border-steel-blue/10',
      )}
    >
      {isAnaliseTecnica ? (
        <div className="flex flex-row flex-nowrap items-center justify-between bg-[#0A1931] px-6 py-3 shrink-0 gap-4 mt-0 mx-0 rounded-none w-full">
          <div className="flex flex-row flex-nowrap items-center gap-4">
            <div className="flex items-center gap-2 whitespace-nowrap">
              <FileSearch className="h-5 w-5 text-emerald-400" />
              <h1 className="text-white font-bold text-lg">Análise Técnica</h1>
            </div>
            <div className="flex bg-white/10 p-0.5 rounded-lg whitespace-nowrap">
              <button
                onClick={() => setActiveView('kanban')}
                className={cn(
                  'px-3 py-1 rounded-md text-xs font-medium transition-colors',
                  activeView === 'kanban'
                    ? 'bg-white text-[#0A1931] shadow'
                    : 'text-white hover:bg-white/20',
                )}
              >
                Kanban
              </button>
              <button
                onClick={() => setActiveView('lista')}
                className={cn(
                  'px-3 py-1 rounded-md text-xs font-medium transition-colors',
                  activeView === 'lista'
                    ? 'bg-white text-[#0A1931] shadow'
                    : 'text-white hover:bg-white/20',
                )}
              >
                Lista
              </button>
              <button
                onClick={() => setActiveView('indicadores')}
                className={cn(
                  'px-3 py-1 rounded-md text-xs font-medium transition-colors',
                  activeView === 'indicadores'
                    ? 'bg-white text-[#0A1931] shadow'
                    : 'text-white hover:bg-white/20',
                )}
              >
                Indicadores
              </button>
            </div>
          </div>
          <div className="flex flex-row flex-nowrap items-center gap-2 justify-end min-w-0">
            <Input
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50 h-8 w-[150px] min-w-0 text-xs"
            />
            <Select value={selectedAnalyst} onValueChange={setSelectedAnalyst}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white h-8 w-[140px] text-xs whitespace-nowrap">
                <SelectValue placeholder="Responsável" />
              </SelectTrigger>
              <SelectContent className="bg-[#1A3D63] border-white/20 text-white">
                <SelectItem value="all" className="focus:bg-white/10 focus:text-white text-xs">
                  Todos
                </SelectItem>
                <SelectItem
                  value="unassigned"
                  className="focus:bg-white/10 focus:text-white text-xs"
                >
                  Não atribuído
                </SelectItem>
                {uniqueAnalysts.map(
                  (id) =>
                    usersMap[id] && (
                      <SelectItem
                        key={id}
                        value={id}
                        className="focus:bg-white/10 focus:text-white text-xs"
                      >
                        {usersMap[id].nome}
                      </SelectItem>
                    ),
                )}
              </SelectContent>
            </Select>
            <Select value={selectedConsultant} onValueChange={setSelectedConsultant}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white h-8 w-[140px] text-xs whitespace-nowrap">
                <SelectValue placeholder="Consultor" />
              </SelectTrigger>
              <SelectContent className="bg-[#1A3D63] border-white/20 text-white">
                <SelectItem value="all" className="focus:bg-white/10 focus:text-white text-xs">
                  Todos
                </SelectItem>
                {uniqueConsultants.map(
                  (id) =>
                    usersMap[id] && (
                      <SelectItem
                        key={id}
                        value={id}
                        className="focus:bg-white/10 focus:text-white text-xs"
                      >
                        {usersMap[id].nome}
                      </SelectItem>
                    ),
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : (
        <div className={cn(isMontagemRoute ? '' : 'border-b border-steel-blue/10 bg-white')}>
          <KanbanHeader
            title={title}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedAnalyst={selectedAnalyst}
            setSelectedAnalyst={setSelectedAnalyst}
            selectedConsultant={selectedConsultant}
            setSelectedConsultant={setSelectedConsultant}
            uniqueAnalysts={uniqueAnalysts}
            uniqueConsultants={uniqueConsultants}
            usersMap={usersMap}
          />
          {!isMontagemRoute && (
            <div className="px-6 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-2">
              <p className="text-midnight-navy/60 text-sm">
                Arraste os cards entre as colunas para atualizar o status.
              </p>
            </div>
          )}
        </div>
      )}

      {activeView === 'kanban' && (
        <div
          ref={scrollContainerRef}
          onDragOver={handleContainerDragOver}
          onDragLeave={handleContainerDragLeave}
          className="h-full w-full overflow-x-auto overflow-y-hidden flex flex-row items-stretch gap-4 px-6 pb-4 pt-4 custom-scrollbar flex-1"
        >
          {renderColumns()}
        </div>
      )}

      {activeView === 'lista' && (
        <div className="flex-1 p-6 overflow-hidden flex flex-col bg-off-white animate-in fade-in duration-300">
          <div className="bg-white rounded-xl border border-steel-blue/10 shadow-sm flex-1 overflow-hidden flex flex-col">
            <div className="overflow-x-auto w-full flex-1">
              <Table>
                <TableHeader className="bg-[#0A1931]">
                  <TableRow className="hover:bg-[#0A1931]">
                    <TableHead className="text-white font-semibold">Ambiente</TableHead>
                    <TableHead className="text-white font-semibold">Data</TableHead>
                    <TableHead className="text-white font-semibold">Status</TableHead>
                    <TableHead className="text-white font-semibold">Responsável</TableHead>
                    <TableHead className="text-white font-semibold text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhum item encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredItems.map((item) => (
                      <TableRow
                        key={item.id}
                        className="bg-white text-[#1A3D63] hover:bg-slate-50 border-b border-slate-100 transition-colors"
                      >
                        <TableCell>
                          <div className="flex flex-col gap-1 items-start">
                            <span className="text-[10px] text-steel-blue font-medium mb-0.5">
                              {getClienteNome(item) || 'Avulso'}
                            </span>
                            <span className="font-semibold leading-tight">{item.nome_produto}</span>
                            <div className="flex items-center gap-2">
                              {item.codigo_rastreio && (
                                <span className="inline-block text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-steel-blue/20 bg-pale-cornflower/20 text-steel-blue">
                                  {item.codigo_rastreio}
                                </span>
                              )}
                              {isAnaliseTecnica &&
                                !item.is_outsourced &&
                                !item.outsourced_checked && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleOpenValidation(item.id)
                                    }}
                                    title="Terceirizado Pendente"
                                    className="inline-flex items-center justify-center p-1 rounded bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                                  >
                                    <AlertTriangle className="h-3.5 w-3.5" />
                                  </button>
                                )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {new Date(item.criado_em).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={item.status_analise}
                            onValueChange={(val) => handleStatusChange(item.id, val)}
                          >
                            <SelectTrigger className="h-8 text-xs w-[180px] border-slate-200 text-[#1A3D63] focus:ring-0 focus:ring-offset-0">
                              <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                              {columns.map((c) => (
                                <SelectItem key={c.id} value={c.id} className="text-xs">
                                  {c.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={item.analista_id || 'unassigned'}
                            onValueChange={(val) =>
                              handleAssignAnalyst(item.id, val === 'unassigned' ? null : val)
                            }
                          >
                            <SelectTrigger className="h-8 text-xs w-[180px] border-slate-200 text-[#1A3D63] focus:ring-0 focus:ring-offset-0">
                              <SelectValue placeholder="Responsável" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem
                                value="unassigned"
                                className="text-xs text-muted-foreground"
                              >
                                Não atribuído
                              </SelectItem>
                              {allUsers.map((u) => (
                                <SelectItem key={u.id} value={u.id} className="text-xs">
                                  {u.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          <button
                            onClick={() => handleDeleteCard(item.id)}
                            className="p-2 rounded-md hover:bg-red-50 text-red-500 transition-colors inline-flex items-center justify-center"
                            title="Excluir item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {activeView === 'indicadores' && (
        <div className="flex-1 p-6 flex flex-col items-center justify-center bg-off-white animate-in fade-in duration-300">
          <div className="bg-white p-8 rounded-xl border border-steel-blue/10 shadow-sm max-w-md text-center">
            <h3 className="text-xl font-bold text-midnight-navy mb-2">
              Indicadores em desenvolvimento
            </h3>
            <p className="text-midnight-navy/60">
              Acompanhe métricas, gargalos e a performance da equipe de análise técnica em tempo
              real. Em breve.
            </p>
          </div>
        </div>
      )}

      {activeView === 'montadores' && (
        <div className="flex-1 overflow-auto bg-white m-6 rounded-xl shadow-sm border border-steel-blue/10 p-6 animate-in fade-in duration-300">
          <MontadoresTab />
        </div>
      )}

      <Dialog open={showSobrasPrompt} onOpenChange={setShowSobrasPrompt}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Projeto Concluído!</DialogTitle>
            <DialogDescription>
              Sobrou algum material (retalho) que pode ser reaproveitado deste projeto?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-between mt-4">
            <Button
              variant="outline"
              onClick={() => setShowSobrasPrompt(false)}
              className="w-full sm:w-auto"
            >
              Não, tudo utilizado
            </Button>
            <Button
              onClick={() => {
                setShowSobrasPrompt(false)
                setShowSobrasRegister(true)
              }}
              className="bg-amber-500 hover:bg-amber-600 text-white w-full sm:w-auto"
            >
              <Scissors className="w-4 h-4 mr-2" />
              Sim, registrar retalho
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showTerceirizadoDialog} onOpenChange={setShowTerceirizadoDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Este ambiente possui itens terceirizados?</DialogTitle>
            <DialogDescription>
              Para avançar com este card, informe se há itens como vidros, pedras ou estofados que
              precisam ser solicitados para terceiros.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-between mt-4">
            <Button variant="outline" onClick={handleNoTerceirizado} className="w-full sm:w-auto">
              Não possui
            </Button>
            <Button
              onClick={handleYesTerceirizado}
              className="bg-amber-500 hover:bg-amber-600 text-white w-full sm:w-auto"
            >
              Sim, possui
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CreateCardDialog
        open={showCreateAvulsoForValidation}
        onOpenChange={setShowCreateAvulsoForValidation}
        onCreated={handleValidationCardCreated}
        initialIsOutsourced={true}
      />

      <Dialog open={showSobrasRegister} onOpenChange={setShowSobrasRegister}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Novo Retalho</DialogTitle>
            <DialogDescription>
              Insira as medidas em metros. Peças menores que 1m² não são aceitas e devem ser
              descartadas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome do Material / Cor</Label>
              <Input
                placeholder="Ex: MDF Branco TX 15mm"
                value={novaSobra.nome}
                onChange={(e) => setNovaSobra({ ...novaSobra, nome: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Largura (metros)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 1.5"
                  value={novaSobra.largura || ''}
                  onChange={(e) => setNovaSobra({ ...novaSobra, largura: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Altura (metros)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 1.2"
                  value={novaSobra.altura || ''}
                  onChange={(e) => setNovaSobra({ ...novaSobra, altura: Number(e.target.value) })}
                />
              </div>
            </div>

            {descarteSugerido && novaSobra.largura > 0 && novaSobra.altura > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-start gap-2">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="text-sm font-medium">
                  Área total: {(novaSobra.largura * novaSobra.altura).toFixed(2)}m².
                  <br />
                  Peça muito pequena. Sugerimos o descarte direto.
                </p>
              </div>
            )}
            {!descarteSugerido && novaSobra.largura > 0 && novaSobra.altura > 0 && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-md flex items-center gap-2">
                <Check className="w-5 h-5 shrink-0" />
                <p className="text-sm font-medium">
                  Área total: {(novaSobra.largura * novaSobra.altura).toFixed(2)}m². Peça válida
                  para o estoque!
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSobrasRegister(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSalvarSobra}
              className="bg-amber-500 hover:bg-amber-600 text-white"
              disabled={descarteSugerido}
            >
              Salvar Retalho
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
