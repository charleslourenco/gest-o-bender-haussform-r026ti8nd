import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { AnaliseKanbanColumn } from './AnaliseKanbanColumn'
import { useRef } from 'react'
import { CriarCardAvulsoModal } from './CriarCardAvulsoModal'
import { CriarSubcardModal } from './CriarSubcardModal'
import { OutsourcedCheckModal } from './OutsourcedCheckModal'
import { Button } from '@/components/ui/button'
import { Plus, Sparkles, AlertTriangle, RefreshCw, LogIn } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { runWithAuthRecovery, redirectToLogin } from '@/lib/supabase/auth-recovery'
import { parseWeekNumber, getCurrentIsoWeek } from '@/lib/pcp-capacity'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export function AnaliseKanbanBoard({
  columns,
  title,
  formularioComercialId,
}: {
  columns: any[]
  title: string
  formularioComercialId?: string
}) {
  const [cards, setCards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const [dragOverCol, setDragOverCol] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState({
    cliente: '',
    consultor: '',
    dateRange: { from: undefined, to: undefined } as any,
  })
  const [somenteSemanaAtual, setSomenteSemanaAtual] = useState(false)

  const [checkModalCard, setCheckModalCard] = useState<any | null>(null)
  const [avulsoModalOpen, setAvulsoModalOpen] = useState(false)
  const [avulsoCardToUpdate, setAvulsoCardToUpdate] = useState<any | null>(null)
  const [subcardModalParent, setSubcardModalParent] = useState<any | null>(null)
  const [listaMateriaisAlert, setListaMateriaisAlert] = useState<any | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSessionExpired, setIsSessionExpired] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)
  const navigate = useNavigate()

  const topScrollRef = useRef<HTMLDivElement>(null)
  const bottomScrollRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [contentWidth, setContentWidth] = useState(0)

  const isSyncingTop = useRef(false)
  const isSyncingBottom = useRef(false)

  const scrollSpeedRef = useRef(0)
  const animationRef = useRef<number | null>(null)

  const startAutoScroll = () => {
    if (!animationRef.current) {
      const scroll = () => {
        if (bottomScrollRef.current && scrollSpeedRef.current !== 0) {
          bottomScrollRef.current.scrollLeft += scrollSpeedRef.current
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
    if (!bottomScrollRef.current) return

    const container = bottomScrollRef.current
    const rect = container.getBoundingClientRect()
    const x = e.clientX - rect.left
    const scrollThreshold = 100

    let speed = 0
    if (x < scrollThreshold) {
      speed = -15 * (1 - Math.max(0, x) / scrollThreshold)
    } else if (rect.width - x < scrollThreshold) {
      speed = 15 * (1 - Math.max(0, rect.width - x) / scrollThreshold)
    }

    if (speed !== 0) {
      scrollSpeedRef.current = speed
      startAutoScroll()
    } else {
      stopAutoScroll()
    }
  }

  const handleContainerDragLeave = (e: React.DragEvent) => {
    const rect = bottomScrollRef.current?.getBoundingClientRect()
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

  const loadCards = async () => {
    setLoading(true)
    setErrorMessage(null)
    setIsSessionExpired(false)
    try {
      const result = await runWithAuthRecovery<any[]>(() => {
        let query = supabase
          .from('produtos_servicos_projeto')
          .select(
            '*, clientes(nome), users(nome), project_item_names, formulario_comercial(leads(kanban_ativo))',
          )
          .eq('arquivado_analise', false)
          .eq('excluido_analise' as any, false)

        if (formularioComercialId) {
          query = query.eq('formulario_comercial_id', formularioComercialId)
        }
        return query
      })

      if (result.error) {
        console.error('Erro ao carregar cards da análise técnica:', result.error)
        const msg = result.sessionExpired
          ? 'Sua sessão expirou ou é inválida. Por favor, faça login novamente.'
          : result.error?.message || 'Falha ao carregar os ambientes da análise técnica.'
        setErrorMessage(msg)
        setIsSessionExpired(result.sessionExpired)
        setCards([])
        return
      }

      setCards(result.data || [])
    } catch (err: any) {
      console.error('Erro inesperado em loadCards AnaliseKanbanBoard:', err)
      setErrorMessage(err?.message || 'Erro inesperado ao carregar cards.')
      setCards([])
    } finally {
      setLoading(false)
      setIsRetrying(false)
    }
  }

  useEffect(() => {
    loadCards()

    // Recarregar automaticamente ao restabelecer sessão
    const handleAuthRestored = () => {
      console.info('[AnaliseKanbanBoard] auth_session_restored detectado. Recarregando...')
      loadCards()
    }
    window.addEventListener('auth_session_restored', handleAuthRestored)
    const sub = supabase
      .channel('psp_changes_analise')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'produtos_servicos_projeto' },
        (payload) => {
          if (formularioComercialId) {
            const newRecord = payload.new as any
            const oldRecord = payload.old as any
            if (
              (newRecord && newRecord.formulario_comercial_id === formularioComercialId) ||
              (oldRecord && oldRecord.formulario_comercial_id === formularioComercialId)
            ) {
              loadCards()
            }
          } else {
            loadCards()
          }
        },
      )
      .subscribe()

    const handleSearch = (e: any) => setSearchQuery(e.detail?.toLowerCase() || '')
    const handleFilters = (e: any) => setFilters(e.detail)
    const handleWeekFilter = (e: any) => {
      if (e.detail && typeof e.detail === 'object' && 'somente_semana_atual' in e.detail) {
        setSomenteSemanaAtual(Boolean(e.detail.somente_semana_atual))
      }
    }
    const handleOpenAvulso = () => {
      setAvulsoCardToUpdate(null)
      setAvulsoModalOpen(true)
    }

    window.addEventListener('kanban_search_change', handleSearch)
    window.addEventListener('analise_detalhe_filters', handleFilters)
    window.addEventListener('toggle_filtro_semana_atual', handleWeekFilter)
    window.addEventListener('open_criar_card_avulso', handleOpenAvulso)

    return () => {
      supabase.removeChannel(sub)
      window.removeEventListener('kanban_search_change', handleSearch)
      window.removeEventListener('analise_detalhe_filters', handleFilters)
      window.removeEventListener('toggle_filtro_semana_atual', handleWeekFilter)
      window.removeEventListener('open_criar_card_avulso', handleOpenAvulso)
      window.removeEventListener('auth_session_restored', handleAuthRestored)
    }
  }, [formularioComercialId])

  useEffect(() => {
    if (!contentRef.current) return
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContentWidth(entry.target.scrollWidth)
      }
    })
    ro.observe(contentRef.current)
    setContentWidth(contentRef.current.scrollWidth)
    return () => ro.disconnect()
  }, [columns, cards])

  const handleTopScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (isSyncingTop.current) {
      isSyncingTop.current = false
      return
    }
    if (bottomScrollRef.current) {
      isSyncingBottom.current = true
      bottomScrollRef.current.scrollLeft = e.currentTarget.scrollLeft
    }
  }

  const handleBottomScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (isSyncingBottom.current) {
      isSyncingBottom.current = false
      return
    }
    if (topScrollRef.current) {
      isSyncingTop.current = true
      topScrollRef.current.scrollLeft = e.currentTarget.scrollLeft
    }
  }

  const handleUpdateCardStatus = async (cardId: string, status: string) => {
    const card = cards.find((c) => c?.id === cardId)
    if (!card || card.status_analise === status) return

    let finalStatus = status
    let isAutoTransition = false

    if (status === 'lista_materiais') {
      finalStatus = 'aguardando_plano_corte'
      isAutoTransition = true
    }

    setCards((prev) =>
      prev.map((c) => (c?.id === cardId ? { ...c, status_analise: finalStatus } : c)),
    )

    try {
      if (isAutoTransition) {
        const { error: err1 } = await supabase
          .from('produtos_servicos_projeto')
          .update({ status_analise: status })
          .eq('id', cardId)

        if (err1) throw err1

        const { error: err2 } = await supabase
          .from('produtos_servicos_projeto')
          .update({ status_analise: finalStatus })
          .eq('id', cardId)

        if (err2) throw err2

        toast({
          description:
            'Card transferido automaticamente para Produção (Aguardando Plano de Corte).',
        })
      } else {
        const { error } = await supabase
          .from('produtos_servicos_projeto')
          .update({ status_analise: status })
          .eq('id', cardId)

        if (error) throw error
      }

      if (status === 'lista_materiais' && card.cliente_id) {
        setListaMateriaisAlert(card)
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao alterar status',
        description: error.message || 'Sem permissão ou erro interno.',
      })
      loadCards()
    }
  }

  const handleDrop = async (e: React.DragEvent, status: string) => {
    e.preventDefault()
    setDragOverCol(null)
    if (!draggingId) return
    await handleUpdateCardStatus(draggingId, status)
  }

  const handleCheckOutsourced = async (hasOutsourced: boolean) => {
    if (!checkModalCard) return
    if (!hasOutsourced) {
      await supabase
        .from('produtos_servicos_projeto')
        .update({ outsourced_checked: true })
        .eq('id', checkModalCard.id)
      toast({ description: 'Ambiente verificado com sucesso. Nenhum terceirizado.' })
      setCheckModalCard(null)
      loadCards()
    } else {
      setAvulsoCardToUpdate(checkModalCard)
      setCheckModalCard(null)
      setAvulsoModalOpen(true)
    }
  }

  const handleAvulsoCreated = async () => {
    if (avulsoCardToUpdate && !avulsoCardToUpdate.is_outsourced) {
      await supabase
        .from('produtos_servicos_projeto')
        .update({ outsourced_checked: true })
        .eq('id', avulsoCardToUpdate.id)
    }
    setAvulsoModalOpen(false)
    setAvulsoCardToUpdate(null)
    toast({ description: 'Card avulso criado com sucesso!' })
    loadCards()
  }

  useEffect(() => {
    const handleSolicitarCompraCard = async (e: any) => {
      const item = e.detail
      if (!item) return

      setCards((prev) => prev.filter((c) => c?.id !== item.id))

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) throw new Error('Usuário não autenticado')

        const [resCompra, resProj] = await Promise.all([
          supabase.from('solicitacoes_compra').insert({
            usuario_id: user.id,
            cliente_id: item.cliente_id,
            nome_item: item.nome_produto,
            quantidade: item.qtd || 1,
            unidade: 'un',
            urgencia: 'Média',
            status: 'Pendente',
            motivo: 'Solicitado via Análise Técnica',
          }),
          supabase
            .from('produtos_servicos_projeto')
            .update({
              is_outsourced: true,
            })
            .eq('id', item.id),
        ])

        if (resCompra.error) throw resCompra.error
        if (resProj.error) throw resProj.error

        toast({ title: 'Compra solicitada com sucesso!' })
      } catch (err: any) {
        loadCards()
        toast({
          title: 'Erro ao solicitar compra',
          description: err.message,
          variant: 'destructive',
          className: 'bg-red-500 text-white',
        })
      }
    }

    window.addEventListener('solicitar_compra_card', handleSolicitarCompraCard)
    return () => window.removeEventListener('solicitar_compra_card', handleSolicitarCompraCard)
  }, [toast])

  const outsourcedNamesByForm = new Map()
  cards.forEach((c) => {
    if (c && c.is_outsourced && c.formulario_comercial_id) {
      outsourcedNamesByForm.set(`${c.formulario_comercial_id}_${c.nome_produto}`, true)
    }
  })

  // Agrupar subcards por card_pai_id para Análise Técnica
  const subcardsByParentId: Record<string, any[]> = {}
  cards.forEach((c) => {
    if (c?.card_pai_id) {
      if (!subcardsByParentId[c.card_pai_id]) {
        subcardsByParentId[c.card_pai_id] = []
      }
      subcardsByParentId[c.card_pai_id].push(c)
    }
  })

  // Na Análise Técnica, no board de ambientes (detalhe do projeto),
  // mostramos os ambientes (cards sem card_pai_id) nas colunas do kanban,
  // e cada ambiente exibe seus subcards como mini-cards dentro dele.
  const parentCardsOnly = cards.filter((c) => !c?.card_pai_id)

  const cardsWithDeps = parentCardsOnly.map((c) => {
    const leadsData = c?.formulario_comercial?.leads
    const kanbanAtivo = Array.isArray(leadsData)
      ? leadsData[0]?.kanban_ativo
      : leadsData?.kanban_ativo
    return {
      ...c,
      kanban_ativo: kanbanAtivo ?? false,
      has_outsourced_dependency:
        c && !c.is_outsourced && c.formulario_comercial_id
          ? outsourcedNamesByForm.has(`${c.formulario_comercial_id}_${c.nome_produto}`)
          : false,
    }
  })

  const filteredCards = (cardsWithDeps || []).filter((c) => {
    if (!c) return false
    let matches = true

    if (filters?.cliente || searchQuery) {
      const q = (filters?.cliente || searchQuery || '').toLowerCase()
      const clientMatch =
        (c.clientes?.nome || '').toLowerCase().includes(q) ||
        (c.nome_produto || '').toLowerCase().includes(q) ||
        (c.project_item_names || '').toLowerCase().includes(q)
      matches = matches && !!clientMatch
    }

    if (filters?.consultor) {
      const consultorName = c.users?.nome || ''
      matches = matches && consultorName.toLowerCase().includes(filters.consultor.toLowerCase())
    }

    // Spec Etapa 4: Filtro [ 🚀 Ver Somente Programação da Semana ]
    if (somenteSemanaAtual) {
      const current = getCurrentIsoWeek()
      const semCard = parseWeekNumber(c.semana_planejada_producao)
      if (semCard !== current.weekNumber) return false
    }

    if (filters?.dateRange?.from && c.criado_em) {
      const cardDate = new Date(c.criado_em)
      cardDate.setHours(0, 0, 0, 0)
      const fromDate = new Date(filters.dateRange.from)
      fromDate.setHours(0, 0, 0, 0)

      if (filters.dateRange.to) {
        const toDate = new Date(filters.dateRange.to)
        toDate.setHours(23, 59, 59, 999)
        matches = matches && new Date(c.criado_em) >= fromDate && new Date(c.criado_em) <= toDate
      } else {
        matches = matches && cardDate.getTime() === fromDate.getTime()
      }
    }

    return matches
  })

  if (loading) return <div className="p-8 text-muted-foreground">Carregando...</div>

  if (errorMessage) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-background min-h-[360px]">
        <div className="max-w-md w-full p-6 bg-card border border-border rounded-xl shadow-sm flex flex-col items-center animate-in fade-in duration-200">
          <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-3">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base text-foreground mb-1">
            {isSessionExpired ? 'Sessão Expirada' : 'Erro ao Carregar Ambientes'}
          </h3>
          <p className="text-xs text-muted-foreground mb-5">{errorMessage}</p>
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <Button
              onClick={() => {
                setIsRetrying(true)
                loadCards()
              }}
              disabled={isRetrying}
              size="sm"
              className="gap-2 text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
              {isRetrying ? 'Tentando novamente...' : 'Tentar novamente'}
            </Button>
            {isSessionExpired && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  redirectToLogin(
                    formularioComercialId
                      ? `/pcp/analise-tecnica/${formularioComercialId}`
                      : '/pcp/analise-tecnica',
                  )
                }
                className="gap-2 text-xs"
              >
                <LogIn className="w-3.5 h-3.5" />
                Fazer login novamente
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col h-full w-full bg-background">
      <div className="px-6 py-3 bg-card border-b border-border flex justify-between items-center shadow-sm z-10 shrink-0 gap-3 flex-wrap">
        <h2 className="font-semibold text-lg text-foreground">{title}</h2>

        {/* Spec Etapa 4: Botão de filtro rápido [ 🚀 Ver Somente Programação da Semana ] */}
        <Button
          variant={somenteSemanaAtual ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSomenteSemanaAtual((prev) => !prev)}
          className={`h-8 text-xs font-bold gap-1.5 transition-all ${
            somenteSemanaAtual
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
              : 'border-emerald-600/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10'
          }`}
          title="Filtrar cards programados para a semana ISO atual"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {somenteSemanaAtual
            ? '✓ Mostrando Somente S. Atual'
            : '🚀 Ver Somente Programação da Semana'}
        </Button>
      </div>

      <div
        ref={topScrollRef}
        className="overflow-x-auto overflow-y-hidden shrink-0 bg-card border-b border-border [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-muted/50"
        onScroll={handleTopScroll}
      >
        <div style={{ width: contentWidth > 0 ? `${contentWidth}px` : '100%', height: '1px' }} />
      </div>

      <div
        ref={bottomScrollRef}
        className="flex-1 overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-muted/50 min-h-0"
        onScroll={handleBottomScroll}
        onDragOver={handleContainerDragOver}
        onDragLeave={handleContainerDragLeave}
      >
        <div ref={contentRef} className="flex gap-2.5 p-3 h-full min-h-full w-max items-stretch">
          {(columns || []).map((col) => {
            const colCards = (filteredCards || [])
              .filter((c) => {
                if (!c || c.status_analise !== col.id) return false
                return true
              })
              .map((c) => ({
                ...c,
                is_parent_card: !formularioComercialId,
              }))

            return (
              <AnaliseKanbanColumn
                key={col.id}
                column={col}
                cards={colCards}
                subcardsByParentId={subcardsByParentId}
                onDragOver={(e: any) => {
                  e.preventDefault()
                  setDragOverCol(col.id)
                }}
                onDragLeave={(e: React.DragEvent) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  if (
                    e.clientX <= rect.left ||
                    e.clientX >= rect.right ||
                    e.clientY <= rect.top ||
                    e.clientY >= rect.bottom
                  ) {
                    setDragOverCol(null)
                  }
                }}
                onDrop={(e: any) => handleDrop(e, col.id)}
                isDragOver={dragOverCol === col.id}
                onDragStart={(e: any, id: string) => {
                  e.dataTransfer.setData('cardId', id)
                  setDraggingId(id)
                }}
                onDragEnd={() => setDraggingId(null)}
                draggingId={draggingId}
                onCheckOutsourced={(card: any) => {
                  setCheckModalCard(card)
                }}
                onDelete={(id: string) => setCards((prev) => prev.filter((c) => c?.id !== id))}
                onAddSubcard={(parent: any) => setSubcardModalParent(parent)}
                onStatusChange={handleUpdateCardStatus}
              />
            )
          })}
        </div>
      </div>

      {checkModalCard && (
        <OutsourcedCheckModal
          onClose={() => setCheckModalCard(null)}
          onConfirm={handleCheckOutsourced}
        />
      )}
      {avulsoModalOpen && (
        <CriarCardAvulsoModal
          onClose={() => setAvulsoModalOpen(false)}
          onSuccess={handleAvulsoCreated}
          baseCard={avulsoCardToUpdate}
        />
      )}

      {subcardModalParent && (
        <CriarSubcardModal
          parentCard={subcardModalParent}
          onClose={() => setSubcardModalParent(null)}
          onSuccess={() => {
            setSubcardModalParent(null)
            loadCards()
          }}
        />
      )}

      <Dialog
        open={!!listaMateriaisAlert}
        onOpenChange={(open) => !open && setListaMateriaisAlert(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lista de Materiais</DialogTitle>
            <DialogDescription className="text-base text-foreground mt-2">
              Para finalizar essa etapa faça o upload da lista de materiais no módulo de clientes
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              className="bg-orange-500 hover:bg-orange-600 text-white"
              onClick={() => {
                const clienteId = listaMateriaisAlert?.cliente_id
                setListaMateriaisAlert(null)
                if (clienteId) {
                  navigate(`/clientes/${clienteId}?tab=documentos`)
                }
              }}
            >
              [ir para aba de clientes]
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
