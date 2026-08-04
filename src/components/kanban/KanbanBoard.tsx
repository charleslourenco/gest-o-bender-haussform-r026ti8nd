import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { useKanbanData, getClienteNome, type KanbanItem } from '@/hooks/use-kanban-data'
import {
  updateCardStatus,
  deleteCard as deleteCardAction,
  assignAnalyst as assignAnalystAction,
  type KanbanModule,
} from '@/lib/kanban-actions'
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
  Archive,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { KanbanHeader } from './KanbanHeader'
import { MontadorSelect } from './MontadorSelect'
import { CreateCardDialog } from './CreateCardDialog'
import { MontadoresTab } from '@/pages/MontadoresTab'
import { arquivarProducao, arquivarMontagem, arquivarAnalise } from '@/services/arquivamento'
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
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type Item = KanbanItem

interface ColumnDef {
  id: string
  title: string
}

interface KanbanBoardProps {
  title: string
  columns: ColumnDef[]
}

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
  return (
    <span className="text-[10px] text-muted-foreground font-medium leading-none">{timeStr}</span>
  )
}

export function KanbanBoard({ title, columns }: KanbanBoardProps) {
  const location = useLocation()
  const { isAdmin } = useAuth()
  const isMontagemRoute = location.pathname.includes('/montagem')
  const isAnaliseTecnica = location.pathname.includes('/analise-tecnica')
  const isProducao = location.pathname.includes('/producao')

  const kanbanModule: KanbanModule = isProducao
    ? 'producao'
    : isMontagemRoute
      ? 'montagem'
      : 'analise'

  const archiveFlag = isProducao
    ? 'arquivado_producao'
    : isMontagemRoute
      ? 'arquivado_montagem'
      : isAnaliseTecnica
        ? 'arquivado_analise'
        : undefined

  const excluidoFlag = isProducao
    ? 'excluido_producao'
    : isMontagemRoute
      ? 'excluido_montagem'
      : isAnaliseTecnica
        ? 'excluido_analise'
        : undefined

  const priorityColumnId = isMontagemRoute ? columns[0]?.id : undefined

  const {
    items,
    setItems,
    loading,
    isLoadingMore,
    error,
    hasMore,
    usersMap,
    allUsers,
    allMontadores,
    fetchItems,
    refreshItems,
  } = useKanbanData(columns, {
    fetchMontadores: isMontagemRoute,
    archiveFlag,
    excluidoFlag,
    priorityColumnId,
  })

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAnalyst, setSelectedAnalyst] = useState('all')
  const [selectedConsultant, setSelectedConsultant] = useState('all')
  const [activeView, setActiveView] = useState<'kanban' | 'lista' | 'indicadores' | 'montadores'>(
    'kanban',
  )

  const [validatingCardId, setValidatingCardId] = useState<string | null>(null)
  const [showTerceirizadoDialog, setShowTerceirizadoDialog] = useState(false)
  const [showCreateAvulsoForValidation, setShowCreateAvulsoForValidation] = useState(false)
  const [dragOverColId, setDragOverColId] = useState<string | null>(null)

  useEffect(() => {
    const handleTabChange = (e: any) => setActiveView(e.detail)
    window.addEventListener('kanban_tab_change', handleTabChange)
    return () => window.removeEventListener('kanban_tab_change', handleTabChange)
  }, [])

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
        prev.map((i) => (i?.id === validatingCardId ? { ...i, outsourced_checked: true } : i)),
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
          prev.map((i) => (i?.id === validatingCardId ? { ...i, outsourced_checked: true } : i)),
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
    const item = items.find((i) => i?.id === itemId)
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
    }

    setItems((prev) =>
      prev.map((i) => (i?.id === itemId ? { ...i, status_analise: finalStatus } : i)),
    )

    try {
      if (isAutoTransition) {
        await supabase
          .from('produtos_servicos_projeto')
          .update({ status_analise: newStatusId, atualizado_em: new Date().toISOString() })
          .eq('id', itemId)
        await updateCardStatus(itemId, finalStatus)
        toast.success('Card transferido automaticamente para Produção (Aguardando Plano de Corte).')
      } else {
        await updateCardStatus(itemId, newStatusId, { isMontagem: isMontagemRoute })
        if (isMontagemRoute && newStatusId === 'concluido') {
          toast.success('Card concluído! Montadores liberados automaticamente.')
        } else {
          toast.success('Status atualizado com sucesso!')
        }
      }
    } catch (err: any) {
      toast.error('Erro ao atualizar status: ' + err.message)
      refreshItems()
    }
  }

  const uniqueAnalysts = Array.from(
    new Set(items.map((i) => i.analista_id).filter(Boolean)),
  ) as string[]
  const uniqueConsultants = Array.from(
    new Set(items.map((i) => i.formulario?.user_id).filter(Boolean)),
  ) as string[]

  const filteredItems = (items ?? []).filter((item) => {
    if (!item) return false

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const matchName = (item?.nome_produto || '').toLowerCase().includes(q)
      const matchCode = (item?.codigo_rastreio || '').toLowerCase().includes(q)
      const matchClient = (getClienteNome(item) || '').toLowerCase().includes(q)
      if (!matchName && !matchCode && !matchClient) return false
    }

    if (selectedAnalyst !== 'all') {
      if (selectedAnalyst === 'unassigned' && item?.analista_id) return false
      if (selectedAnalyst !== 'unassigned' && item?.analista_id !== selectedAnalyst) return false
    }

    if (selectedConsultant !== 'all') {
      if (item?.formulario?.user_id !== selectedConsultant) return false
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
    setTimeout(() => {
      if (e.target instanceof HTMLElement) {
        e.target.classList.add('opacity-50', 'ring-2', 'ring-primary')
      }
    }, 0)
  }

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.target instanceof HTMLElement) {
      e.target.classList.remove('opacity-50', 'ring-2', 'ring-primary')
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
    const scrollThreshold = 100
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

  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault()
    setDragOverColId(colId)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    if (
      e.clientX <= rect.left ||
      e.clientX >= rect.right ||
      e.clientY <= rect.top ||
      e.clientY >= rect.bottom
    ) {
      setDragOverColId(null)
    }
  }

  const handleDeleteCard = async (id: string) => {
    if (!isAdmin) {
      toast.error('Apenas administradores podem excluir cards.')
      return
    }
    if (!confirm('Deseja realmente excluir este card?')) return
    try {
      await deleteCardAction(id, kanbanModule)
      toast.success('Card excluído com sucesso!')
      setItems((prev) => prev.filter((i) => i?.id !== id))
    } catch (err: any) {
      toast.error('Erro ao excluir card: ' + err.message)
    }
  }
  const handleArchiveCard = async (id: string) => {
    try {
      if (isProducao) {
        await arquivarProducao(id)
      } else if (isMontagemRoute) {
        await arquivarMontagem(id)
      } else if (isAnaliseTecnica) {
        await arquivarAnalise(id)
      }
      toast.success('Card arquivado com sucesso!')
      setItems((prev) => prev.filter((i) => i?.id !== id))
    } catch (err: any) {
      toast.error('Erro ao arquivar: ' + err.message)
    }
  }

  const handleAssignAnalyst = async (id: string, analystId: string | null) => {
    try {
      await assignAnalystAction(id, analystId)
      toast.success('Responsável atualizado com sucesso!')
      setItems((prev) => prev.map((i) => (i?.id === id ? { ...i, analista_id: analystId } : i)))
    } catch (err: any) {
      toast.error('Erro ao atribuir responsável: ' + err.message)
    }
  }

  const handleDrop = async (e: React.DragEvent, columnId: string) => {
    e.preventDefault()
    setDragOverColId(null)
    const itemId = e.dataTransfer.getData('itemId')
    if (!itemId) return

    const item = items.find((i) => i?.id === itemId)
    if (!item || item.status_analise === columnId) return

    let finalStatus = columnId
    let isAutoTransition = false

    if (columnId === 'lista_materiais') {
      finalStatus = 'aguardando_plano_corte'
      isAutoTransition = true
    }

    setItems((prev) =>
      prev.map((i) => (i?.id === itemId ? { ...i, status_analise: finalStatus } : i)),
    )

    try {
      if (isAutoTransition) {
        await supabase
          .from('produtos_servicos_projeto')
          .update({ status_analise: columnId, atualizado_em: new Date().toISOString() })
          .eq('id', itemId)
        await updateCardStatus(itemId, finalStatus)
        toast.success('Card transferido automaticamente para Produção (Aguardando Plano de Corte).')
      } else {
        await updateCardStatus(itemId, columnId, { isMontagem: isMontagemRoute })
        if (isMontagemRoute && columnId === 'concluido') {
          toast.success('Card concluído! Montadores liberados automaticamente.')
        } else {
          toast.success('Card movido com sucesso!')
        }
      }
    } catch (err: any) {
      toast.error('Erro ao mover o card: ' + err.message)
      refreshItems()
    }
  }

  if (loading && items.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-12">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground font-medium">Carregando quadro...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-12 text-center bg-background">
        <div className="bg-destructive/10 p-4 rounded-full mb-4">
          <AlertCircle className="h-10 w-10 text-destructive" />
        </div>
        <h3 className="mb-2 text-xl font-bold text-foreground">Erro ao carregar Kanban</h3>
        <p className="text-sm text-muted-foreground max-w-md">{error}</p>
      </div>
    )
  }

  const renderColumns = () =>
    columns.map((col) => {
      const colItems = (filteredItems || []).filter((i) => i && i.status_analise === col.id)
      return (
        <div
          key={col.id}
          className={cn(
            'transition-colors duration-200 shrink-0 flex flex-col h-full',
            isAnaliseTecnica
              ? 'max-h-full w-[320px] min-w-[320px] rounded-lg'
              : isMontagemRoute || isProducao
                ? 'w-[320px] min-w-[320px] rounded-xl border border-border'
                : 'w-[260px] min-w-[260px] rounded-xl border border-border',
            dragOverColId === col.id
              ? 'bg-accent/50 ring-2 ring-primary/50'
              : isAnaliseTecnica
                ? 'bg-muted/30'
                : 'bg-muted/30',
          )}
          onDragOver={(e) => handleDragOver(e, col.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, col.id)}
        >
          <div
            className={cn(
              'flex items-center justify-between border-b border-border px-4 py-3 sticky top-0 z-10 shadow-sm shrink-0',
              isAnaliseTecnica ? 'bg-muted/50 rounded-t-lg' : 'bg-muted/50 rounded-t-xl',
            )}
          >
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground text-sm uppercase tracking-wider">
                {col.title}
              </h3>
              {isAnaliseTecnica && col.id === 'iniciar' && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    window.dispatchEvent(new CustomEvent('open_criar_card_avulso'))
                  }}
                  className="bg-card text-foreground text-[10px] font-semibold px-2 py-0.5 rounded border border-input hover:bg-muted/50 transition-colors shadow-sm inline-flex items-center"
                  title="Criar card avulso"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Criar
                </button>
              )}
            </div>
            <Badge variant="secondary" className="bg-card text-primary font-bold shadow-sm">
              {colItems.length}
            </Badge>
          </div>

          <div
            className={cn(
              'flex-1 overflow-y-auto space-y-2 custom-scrollbar flex flex-col',
              isAnaliseTecnica ? 'p-1.5 min-h-[200px]' : 'p-2 min-h-[150px]',
            )}
          >
            {colItems.map((item) => (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => {
                  if (item) handleDragStart(e, item)
                }}
                onDragEnd={handleDragEnd}
                className={cn(
                  'group relative cursor-grab active:cursor-grabbing transition-all duration-200',
                  isProducao || isMontagemRoute
                    ? cn(
                        'bg-card text-card-foreground p-1.5 rounded-md shadow-sm hover:shadow-md transition-all duration-200 w-full flex flex-col gap-1.5 border-2',
                        item?.is_outsourced
                          ? 'border-orange-500 dark:shadow-[0_0_15px_rgba(249,115,22,0.5)] hover:border-orange-400 dark:hover:border-orange-400'
                          : 'border-border hover:border-primary/50 dark:border-cyan-500/50 dark:shadow-[0_0_15px_rgba(6,182,212,0.4)] dark:hover:border-cyan-400',
                      )
                    : cn(
                        'rounded-lg shadow-sm hover:shadow-md flex flex-col border-2',
                        isAnaliseTecnica
                          ? cn(
                              'bg-card text-card-foreground p-1.5 gap-1',
                              item?.is_outsourced
                                ? 'border-orange-500 dark:shadow-[0_0_15px_rgba(249,115,22,0.5)]'
                                : 'border-border hover:border-primary/50 dark:border-cyan-500/50 dark:shadow-[0_0_15px_rgba(6,182,212,0.4)]',
                            )
                          : cn(
                              'bg-card border-border hover:border-primary/50 p-3 gap-2 text-card-foreground',
                              item?.is_outsourced
                                ? 'dark:border-orange-500 dark:shadow-[0_0_15px_rgba(249,115,22,0.5)]'
                                : 'dark:border-cyan-500/50 dark:shadow-[0_0_15px_rgba(6,182,212,0.4)]',
                            ),
                      ),
                )}
              >
                <div
                  className={cn(
                    'absolute right-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 z-10',
                    isAnaliseTecnica || isProducao || isMontagemRoute
                      ? 'top-1 text-muted-foreground/50 bg-card rounded'
                      : 'top-2 text-muted-foreground/50 bg-card rounded',
                  )}
                >
                  {col.id === columns[columns.length - 1].id &&
                    (isProducao || isMontagemRoute || isAnaliseTecnica) && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleArchiveCard(item.id)
                        }}
                        className={cn(
                          'p-1 rounded transition-colors',
                          isAnaliseTecnica || isProducao || isMontagemRoute
                            ? 'hover:text-amber-600 hover:bg-amber-600/10'
                            : 'hover:text-amber-600 hover:bg-amber-600/10',
                        )}
                        title="Arquivar"
                      >
                        <Archive className="h-3.5 w-3.5" />
                      </button>
                    )}
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteCard(item.id)
                      }}
                      className={cn(
                        'p-1 rounded transition-colors',
                        isAnaliseTecnica || isProducao || isMontagemRoute
                          ? 'hover:text-destructive hover:bg-destructive/10'
                          : 'hover:text-destructive hover:bg-destructive/10',
                      )}
                      title="Excluir card"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
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
                      {item?.codigo_rastreio && (
                        <span className="inline-block text-[9px] font-mono font-bold px-1 py-0.5 rounded border border-border text-primary bg-muted/50 shrink-0 leading-none w-fit">
                          {item.codigo_rastreio}
                        </span>
                      )}
                      <span
                        className="text-xs truncate text-foreground"
                        title={getClienteNome(item) || 'Avulso'}
                      >
                        {getClienteNome(item) || 'Avulso'}
                      </span>
                      <h4
                        className="font-semibold leading-tight text-card-foreground text-xs truncate"
                        title={item?.nome_produto ?? 'Sem nome'}
                      >
                        {item?.nome_produto ?? 'Sem nome'}
                      </h4>
                    </>
                  ) : isAnaliseTecnica ? (
                    <div className="flex flex-col gap-1 mt-0.5">
                      <div className="flex flex-row items-baseline gap-1.5 w-full truncate">
                        {item?.codigo_rastreio && (
                          <span className="inline-block text-[9px] font-mono font-bold px-1 py-0.5 rounded border border-border text-primary bg-muted/50 shrink-0 leading-none">
                            {item.codigo_rastreio}
                          </span>
                        )}
                        <span className="text-xs truncate" title={getClienteNome(item) || 'Avulso'}>
                          {getClienteNome(item) || 'Avulso'}
                        </span>
                      </div>
                      <h4
                        className="font-semibold leading-tight text-card-foreground text-xs truncate"
                        title={item?.nome_produto ?? 'Sem nome'}
                      >
                        {item?.nome_produto ?? 'Sem nome'}
                      </h4>
                      {!item?.is_outsourced && !item?.outsourced_checked && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (item?.id) handleOpenValidation(item.id)
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
                      <h4 className="font-semibold leading-tight text-foreground text-sm">
                        {item?.nome_produto ?? 'Sem nome'}
                      </h4>
                      {item?.codigo_rastreio && (
                        <div className="mt-1">
                          <span className="inline-block text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border text-primary bg-muted/50 border-border leading-none">
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
                        ? 'border-border text-muted-foreground pt-1 gap-0.5 text-[10px]'
                        : 'border-border text-muted-foreground pt-2 gap-1 text-xs',
                    )}
                  >
                    {!isAnaliseTecnica && getClienteNome(item) && (
                      <div className="flex items-center gap-1 truncate text-foreground">
                        <User className="h-3 w-3 shrink-0 text-primary" />
                        <span className="truncate">{getClienteNome(item)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Package
                          className={cn(
                            'h-3 w-3 shrink-0',
                            isAnaliseTecnica ? 'text-muted-foreground' : 'text-primary',
                          )}
                        />
                        <span>Qtd: {item?.qtd ?? 0}</span>
                      </div>
                      <div
                        className={cn(
                          'flex items-center gap-1',
                          isAnaliseTecnica ? 'text-muted-foreground' : 'text-muted-foreground',
                        )}
                      >
                        <CalendarClock className="h-3 w-3 shrink-0" />
                        <span>
                          {item?.criado_em
                            ? new Date(item.criado_em).toLocaleDateString('pt-BR')
                            : '-'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {(isProducao || isMontagemRoute) && (
                  <div className="flex items-center justify-between mt-auto pt-0.5">
                    <div className="flex items-center gap-2">
                      {item?.id && item?.status_analise && item?.criado_em && (
                        <TimeInColumn
                          cardId={item.id}
                          status={item.status_analise}
                          criado_em={item.criado_em}
                        />
                      )}
                      {isMontagemRoute &&
                        Array.isArray(item?.alocacao_montagem) &&
                        item.alocacao_montagem.length > 0 && (
                          <div className="flex items-center gap-0.5 text-[9px] leading-none text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            <Wrench className="w-2.5 h-2.5" />
                            <span>{item.alocacao_montagem.length} Alocado(s)</span>
                          </div>
                        )}
                    </div>
                    <div className="flex items-center gap-1 text-[10px]">
                      <Package className="h-3 w-3 shrink-0 text-muted-foreground" />
                      <span className="text-muted-foreground">Qtd: {item?.qtd ?? 0}</span>
                    </div>
                  </div>
                )}

                <div
                  className={cn(
                    'border-t flex flex-col',
                    isProducao || isMontagemRoute
                      ? 'border-border pt-1.5 gap-1'
                      : isAnaliseTecnica
                        ? 'border-border pt-1.5 gap-1'
                        : 'border-border pt-2 gap-1.5',
                  )}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  {isAnaliseTecnica && (
                    <Select
                      value={item?.status_analise ?? ''}
                      onValueChange={(val) => item?.id && handleStatusChange(item.id, val)}
                    >
                      <SelectTrigger className="h-6 text-[10px] w-full bg-muted/30 border-input text-foreground focus:ring-1 focus:ring-ring px-2">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {columns.map((c) => (
                          <SelectItem key={c.id} value={c.id} className="text-[10px] py-1">
                            {c.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  <Select
                    value={item?.analista_id || 'unassigned'}
                    onValueChange={(val) =>
                      item?.id && handleAssignAnalyst(item.id, val === 'unassigned' ? null : val)
                    }
                  >
                    <SelectTrigger
                      className={cn(
                        'h-6 text-[10px] px-2 w-full focus:ring-1 focus:ring-ring',
                        isAnaliseTecnica || isProducao || isMontagemRoute
                          ? 'bg-muted/30 border-input text-foreground'
                          : 'border-input bg-muted/30 text-foreground',
                      )}
                    >
                      <SelectValue placeholder="Atribuir responsável..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        value="unassigned"
                        className="text-[10px] py-1 text-muted-foreground"
                      >
                        Não atribuído
                      </SelectItem>
                      {allUsers.map((u) => (
                        <SelectItem key={u.id} value={u.id} className="text-[10px] py-1">
                          {u.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {isMontagemRoute && (
                    <MontadorSelect
                      item={item}
                      montadores={allMontadores || []}
                      onUpdate={fetchItems}
                    />
                  )}
                </div>
              </div>
            ))}

            {colItems.length === 0 && (
              <div className="flex-1 min-h-[120px] h-full flex items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/20 pointer-events-none">
                <p className="text-sm font-medium text-muted-foreground">Solte os cards aqui</p>
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
          ? 'bg-background rounded-none border-0'
          : 'bg-background rounded-lg border border-border',
      )}
    >
      {isAnaliseTecnica ? (
        <div className="flex flex-row flex-nowrap items-center justify-between bg-card border-b border-border px-6 py-3 shrink-0 gap-4 mt-0 mx-0 rounded-none w-full">
          <div className="flex flex-row flex-nowrap items-center gap-4">
            <div className="flex items-center gap-2 whitespace-nowrap">
              <FileSearch className="h-5 w-5 text-primary" />
              <h1 className="text-foreground font-bold text-lg">Análise Técnica</h1>
            </div>
            <div className="flex bg-muted p-0.5 rounded-lg whitespace-nowrap">
              <button
                onClick={() => setActiveView('kanban')}
                className={cn(
                  'px-3 py-1 rounded-md text-xs font-medium transition-colors',
                  activeView === 'kanban'
                    ? 'bg-card text-foreground shadow'
                    : 'text-muted-foreground hover:bg-muted',
                )}
              >
                Kanban
              </button>
              <button
                onClick={() => setActiveView('lista')}
                className={cn(
                  'px-3 py-1 rounded-md text-xs font-medium transition-colors',
                  activeView === 'lista'
                    ? 'bg-card text-foreground shadow'
                    : 'text-muted-foreground hover:bg-muted',
                )}
              >
                Lista
              </button>
              <button
                onClick={() => setActiveView('indicadores')}
                className={cn(
                  'px-3 py-1 rounded-md text-xs font-medium transition-colors',
                  activeView === 'indicadores'
                    ? 'bg-card text-foreground shadow'
                    : 'text-muted-foreground hover:bg-muted',
                )}
              >
                Indicadores
              </button>
            </div>
          </div>
          <div className="flex flex-row flex-nowrap items-center gap-2 justify-end min-w-0">
            <input
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-muted/30 border border-input text-foreground placeholder:text-muted-foreground h-8 w-[150px] min-w-0 text-xs px-3 rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Select value={selectedAnalyst} onValueChange={setSelectedAnalyst}>
              <SelectTrigger className="bg-muted/30 border-input text-foreground h-8 w-[140px] text-xs whitespace-nowrap">
                <SelectValue placeholder="Responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  Todos
                </SelectItem>
                <SelectItem value="unassigned" className="text-xs">
                  Não atribuído
                </SelectItem>
                {uniqueAnalysts.map(
                  (id) =>
                    usersMap[id] && (
                      <SelectItem key={id} value={id} className="text-xs">
                        {usersMap[id].nome}
                      </SelectItem>
                    ),
                )}
              </SelectContent>
            </Select>
            <Select value={selectedConsultant} onValueChange={setSelectedConsultant}>
              <SelectTrigger className="bg-muted/30 border-input text-foreground h-8 w-[140px] text-xs whitespace-nowrap">
                <SelectValue placeholder="Consultor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  Todos
                </SelectItem>
                {uniqueConsultants.map(
                  (id) =>
                    usersMap[id] && (
                      <SelectItem key={id} value={id} className="text-xs">
                        {usersMap[id].nome}
                      </SelectItem>
                    ),
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : (
        <div className={cn(isMontagemRoute ? '' : 'border-b border-border bg-card')}>
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
              <p className="text-muted-foreground text-sm">
                Arraste os cards entre as colunas para atualizar o status.
              </p>
            </div>
          )}
        </div>
      )}

      {activeView === 'kanban' && (
        <div className="flex flex-col h-full flex-1 overflow-hidden">
          <div
            ref={scrollContainerRef}
            onDragOver={handleContainerDragOver}
            onDragLeave={handleContainerDragLeave}
            className="w-full overflow-x-auto overflow-y-hidden flex flex-row items-stretch gap-4 px-6 pb-4 pt-4 custom-scrollbar flex-1 min-h-0"
          >
            {renderColumns()}
          </div>
          {hasMore && (
            <div className="p-4 flex justify-center shrink-0 border-t border-border bg-background">
              <Button
                variant="outline"
                onClick={() => fetchItems(true)}
                disabled={isLoadingMore}
                className="bg-card text-primary border-input hover:bg-muted/50"
              >
                {isLoadingMore && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Carregar Mais
              </Button>
            </div>
          )}
        </div>
      )}

      {activeView === 'lista' && (
        <div className="flex-1 p-6 overflow-hidden flex flex-col bg-background animate-in fade-in duration-300">
          <div className="bg-card rounded-xl border border-border shadow-sm flex-1 overflow-hidden flex flex-col">
            <div className="overflow-x-auto w-full flex-1">
              <Table>
                <TableHeader className="bg-card">
                  <TableRow className="hover:bg-card border-border">
                    <TableHead className="text-foreground font-semibold">Ambiente</TableHead>
                    <TableHead className="text-foreground font-semibold">Data</TableHead>
                    <TableHead className="text-foreground font-semibold">Status</TableHead>
                    <TableHead className="text-foreground font-semibold">Responsável</TableHead>
                    <TableHead className="text-foreground font-semibold text-right">
                      Ações
                    </TableHead>
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
                    filteredItems.map((item) =>
                      item ? (
                        <TableRow
                          key={item.id}
                          className="bg-card text-card-foreground hover:bg-muted/50 border-b border-border transition-colors"
                        >
                          <TableCell>
                            <div className="flex flex-col gap-1 items-start">
                              <span className="text-[10px] text-primary font-medium mb-0.5">
                                {getClienteNome(item) || 'Avulso'}
                              </span>
                              <span className="font-semibold leading-tight">
                                {item?.nome_produto ?? 'Sem nome'}
                              </span>
                              <div className="flex items-center gap-2">
                                {item?.codigo_rastreio && (
                                  <span className="inline-block text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-border bg-muted/50 text-primary">
                                    {item.codigo_rastreio}
                                  </span>
                                )}
                                {isAnaliseTecnica &&
                                  !item?.is_outsourced &&
                                  !item?.outsourced_checked && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        if (item?.id) handleOpenValidation(item.id)
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
                            {item?.criado_em
                              ? new Date(item.criado_em).toLocaleDateString('pt-BR')
                              : '-'}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={item?.status_analise ?? ''}
                              onValueChange={(val) => item?.id && handleStatusChange(item.id, val)}
                            >
                              <SelectTrigger className="h-8 text-xs w-[180px] border-input text-foreground focus:ring-1 focus:ring-ring">
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
                              value={item?.analista_id || 'unassigned'}
                              onValueChange={(val) =>
                                item?.id &&
                                handleAssignAnalyst(item.id, val === 'unassigned' ? null : val)
                              }
                            >
                              <SelectTrigger className="h-8 text-xs w-[180px] border-input text-foreground focus:ring-1 focus:ring-ring">
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
                            {isAdmin && (
                              <button
                                onClick={() => item?.id && handleDeleteCard(item.id)}
                                className="p-2 rounded-md hover:bg-destructive/10 text-destructive transition-colors inline-flex items-center justify-center"
                                title="Excluir item"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </TableCell>
                        </TableRow>
                      ) : null,
                    )
                  )}
                </TableBody>
              </Table>
            </div>
            {hasMore && (
              <div className="p-4 flex justify-center shrink-0 border-t border-border bg-card">
                <Button
                  variant="outline"
                  onClick={() => fetchItems(true)}
                  disabled={isLoadingMore}
                  className="bg-card text-foreground border-input hover:bg-muted/50"
                >
                  {isLoadingMore && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Carregar Mais
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeView === 'indicadores' && (
        <div className="flex-1 p-6 flex flex-col items-center justify-center bg-background animate-in fade-in duration-300">
          <div className="bg-card p-8 rounded-xl border border-border shadow-sm max-w-md text-center">
            <h3 className="text-xl font-bold text-foreground mb-2">
              Indicadores em desenvolvimento
            </h3>
            <p className="text-muted-foreground">
              Acompanhe métricas, gargalos e a performance da equipe de análise técnica em tempo
              real. Em breve.
            </p>
          </div>
        </div>
      )}

      {activeView === 'montadores' && (
        <div className="flex-1 overflow-auto bg-card m-6 rounded-xl shadow-sm border border-border p-6 animate-in fade-in duration-300">
          <MontadoresTab />
        </div>
      )}

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
    </div>
  )
}
