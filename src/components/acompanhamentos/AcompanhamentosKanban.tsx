import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Users, Archive } from 'lucide-react'
import { AcompanhamentoAvulsoModal } from './AcompanhamentoAvulsoModal'
import { useToast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'
import { arquivarAcompanhamento } from '@/services/arquivamento'

const COLUMNS = [
  'INÍCIO',
  'REFORMAS',
  'PRESTADORES DE SERVIÇO',
  'MÓVEIS SOLTOS',
  'LIMPEZA',
  'DECORAÇÃO',
  'FINALIZAÇÃO',
]

export function AcompanhamentosKanban() {
  const [cards, setCards] = useState<any[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { toast } = useToast()

  const [dragOverCol, setDragOverCol] = useState<string | null>(null)

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

  const fetchCards = async () => {
    try {
      const { data, error } = await supabase
        .from('acompanhamentos')
        .select('*, responsaveis_acompanhamentos(nome)')
        .eq('arquivado_acompanhamento' as any, false)
        .order('data_criacao', { ascending: false })

      if (error) {
        console.error('Error fetching acompanhamentos:', error)
        setCards([])
        return
      }
      setCards(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Unexpected error fetching acompanhamentos:', err)
      setCards([])
    }
  }

  const handleArchive = async (cardId: string) => {
    try {
      await arquivarAcompanhamento(cardId)
      toast({ description: 'Acompanhamento arquivado com sucesso!' })
      fetchCards()
    } catch (e: any) {
      toast({ description: e.message, variant: 'destructive' })
    }
  }

  useEffect(() => {
    fetchCards()

    const channel = supabase
      .channel('acompanhamentos_kanban')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'acompanhamentos' },
        fetchCards,
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleDragStart = (e: React.DragEvent, cardId: string) => {
    e.dataTransfer.setData('cardId', cardId)
  }

  const handleDragOver = (e: React.DragEvent, status: string) => {
    e.preventDefault()
    setDragOverCol(status)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    if (
      e.clientX <= rect.left ||
      e.clientX >= rect.right ||
      e.clientY <= rect.top ||
      e.clientY >= rect.bottom
    ) {
      setDragOverCol(null)
    }
  }

  const handleDrop = async (e: React.DragEvent, status: string) => {
    e.preventDefault()
    setDragOverCol(null)
    const cardId = e.dataTransfer.getData('cardId')
    if (!cardId) return

    try {
      // Optimistic update
      setCards((prev) => prev.map((c) => (c?.id === cardId ? { ...c, status_atual: status } : c)))

      const { error } = await supabase
        .from('acompanhamentos')
        .update({ status_atual: status })
        .eq('id', cardId)

      if (error) throw error
    } catch (error: any) {
      toast({
        title: 'Erro ao mover card',
        description: error.message || 'Erro desconhecido',
        variant: 'destructive',
      })
      fetchCards() // Revert
    }
  }

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex justify-end mb-4 shrink-0">
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Criar Card Avulso
        </Button>
      </div>

      <div
        ref={scrollContainerRef}
        onDragOver={handleContainerDragOver}
        onDragLeave={handleContainerDragLeave}
        className="flex-1 flex gap-4 overflow-x-auto overflow-y-hidden pb-4 items-stretch min-h-0"
      >
        {COLUMNS.map((col) => {
          const colCards = (cards || []).filter((c) => c && c.status_atual === col)
          return (
            <div
              key={col}
              className={cn(
                'flex flex-col flex-shrink-0 w-[300px] h-full rounded-lg border transition-colors',
                dragOverCol === col
                  ? 'bg-muted/50 border-primary/50 ring-2 ring-primary/20'
                  : 'bg-muted/30 border-border',
              )}
              onDragOver={(e) => handleDragOver(e, col)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col)}
            >
              <div className="p-3 font-semibold border-b border-border flex justify-between items-center bg-muted/50 rounded-t-lg shrink-0">
                <span className="text-sm truncate mr-2" title={col}>
                  {col}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {colCards.length}
                </Badge>
              </div>

              <div className="p-2 flex-1 overflow-y-auto space-y-2 min-h-0 flex flex-col">
                {colCards.length === 0 ? (
                  <div className="flex-1 min-h-[120px] flex items-center justify-center text-muted-foreground text-xs italic opacity-50 border-2 border-dashed border-border/50 rounded-md pointer-events-none">
                    Solte os cards aqui
                  </div>
                ) : (
                  colCards
                    .filter((c) => c && c.id)
                    .map((card) => {
                      const responsavelNome = card?.responsaveis_acompanhamentos
                        ? (Array.isArray(card.responsaveis_acompanhamentos)
                            ? card.responsaveis_acompanhamentos[0]?.nome
                            : card.responsaveis_acompanhamentos.nome) || 'Sem responsável'
                        : 'Sem responsável'
                      return (
                        <Card
                          key={card.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, card.id)}
                          className="cursor-grab active:cursor-grabbing border-2 border-border dark:border-cyan-500/50 dark:shadow-[0_0_15px_rgba(6,182,212,0.4)] hover:shadow-md hover:border-primary/50 dark:hover:border-cyan-400 transition-all duration-200 shadow-sm"
                        >
                          <CardContent className="p-3">
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded">
                                {card?.codigo_projeto || 'N/A'}
                              </span>
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                                  {card?.quantidade_itens || 0} iten(s)
                                </span>
                                {col === 'FINALIZAÇÃO' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleArchive(card.id)
                                    }}
                                    className="text-muted-foreground hover:text-amber-600 p-0.5 transition-colors"
                                    title="Arquivar"
                                  >
                                    <Archive className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                            <h4 className="font-semibold text-[14px] mb-1 leading-tight">
                              {card?.nome_cliente || 'Sem cliente'}
                            </h4>
                            <p
                              className="text-[11px] text-muted-foreground mb-3 line-clamp-2"
                              title={card?.tipo_acompanhamento || ''}
                            >
                              {card?.tipo_acompanhamento || 'Sem descrição'}
                            </p>

                            <div className="flex items-center text-[11px] text-muted-foreground bg-muted/50 p-1.5 rounded-md">
                              <Users className="w-3 h-3 mr-1.5 shrink-0" />
                              <span className="truncate">{responsavelNome}</span>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })
                )}
              </div>
            </div>
          )
        })}
      </div>

      <AcompanhamentoAvulsoModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSuccess={fetchCards}
      />
    </div>
  )
}
