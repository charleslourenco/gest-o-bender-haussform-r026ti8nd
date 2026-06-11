import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { AnaliseKanbanColumn } from './AnaliseKanbanColumn'
import { useRef } from 'react'
import { CriarCardAvulsoModal } from './CriarCardAvulsoModal'
import { OutsourcedCheckModal } from './OutsourcedCheckModal'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

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

  const [checkModalCard, setCheckModalCard] = useState<any | null>(null)
  const [avulsoModalOpen, setAvulsoModalOpen] = useState(false)
  const [avulsoCardToUpdate, setAvulsoCardToUpdate] = useState<any | null>(null)

  const topScrollRef = useRef<HTMLDivElement>(null)
  const bottomScrollRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [contentWidth, setContentWidth] = useState(0)

  const isSyncingTop = useRef(false)
  const isSyncingBottom = useRef(false)

  const loadCards = async () => {
    let query = supabase
      .from('produtos_servicos_projeto')
      .select('*, clientes(nome)')
      .eq('is_outsourced', false)

    if (formularioComercialId) {
      query = query.eq('formulario_comercial_id', formularioComercialId)
    }

    const { data } = await query
    if (data) setCards(data)
    setLoading(false)
  }

  useEffect(() => {
    loadCards()
    const sub = supabase
      .channel('psp_changes')
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
    const handleOpenAvulso = () => {
      setAvulsoCardToUpdate(null)
      setAvulsoModalOpen(true)
    }

    window.addEventListener('kanban_search_change', handleSearch)
    window.addEventListener('open_criar_card_avulso', handleOpenAvulso)

    return () => {
      supabase.removeChannel(sub)
      window.removeEventListener('kanban_search_change', handleSearch)
      window.removeEventListener('open_criar_card_avulso', handleOpenAvulso)
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

  const handleDrop = async (e: React.DragEvent, status: string) => {
    e.preventDefault()
    setDragOverCol(null)
    if (!draggingId) return

    const card = cards.find((c) => c.id === draggingId)
    if (!card || card.status_analise === status) return

    if (card.outsourced_checked === false || card.outsourced_checked === null) {
      toast({
        description: 'Verifique os itens terceirizados primeiro clicando no alerta vermelho.',
        variant: 'destructive',
        className: 'bg-red-500 text-white border-none',
      })
      return
    }

    setCards((prev) =>
      prev.map((c) => (c.id === draggingId ? { ...c, status_analise: status } : c)),
    )
    await supabase
      .from('produtos_servicos_projeto')
      .update({ status_analise: status })
      .eq('id', draggingId)
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
    if (avulsoCardToUpdate) {
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

      setCards((prev) => prev.filter((c) => c.id !== item.id))

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

  const filteredCards = cards.filter((c) => {
    if (!searchQuery) return true
    return (
      c.nome_produto?.toLowerCase().includes(searchQuery) ||
      c.clientes?.nome?.toLowerCase().includes(searchQuery)
    )
  })

  if (loading) return <div className="p-8 text-slate-500">Carregando...</div>

  return (
    <div className="flex-1 overflow-hidden flex flex-col h-full w-full bg-slate-50">
      <div className="px-4 py-2.5 bg-white border-b flex justify-between items-center shadow-sm z-10 shrink-0">
        <h2 className="font-bold text-base text-slate-800">{title}</h2>
      </div>

      <div
        ref={topScrollRef}
        className="overflow-x-auto overflow-y-hidden shrink-0 bg-white border-b border-slate-200 [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-100"
        onScroll={handleTopScroll}
      >
        <div style={{ width: contentWidth > 0 ? `${contentWidth}px` : '100%', height: '1px' }} />
      </div>

      <div
        ref={bottomScrollRef}
        className="flex-1 overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-100"
        onScroll={handleBottomScroll}
      >
        <div ref={contentRef} className="flex gap-2.5 p-3 h-full w-max items-stretch">
          {columns.map((col) => (
            <AnaliseKanbanColumn
              key={col.id}
              column={col}
              cards={filteredCards.filter((c) => c.status_analise === col.id)}
              onDragOver={(e: any) => {
                e.preventDefault()
                setDragOverCol(col.id)
              }}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={(e: any) => handleDrop(e, col.id)}
              isDragOver={dragOverCol === col.id}
              onDragStart={(e: any, id: string) => {
                e.dataTransfer.setData('cardId', id)
                setDraggingId(id)
              }}
              onDragEnd={() => setDraggingId(null)}
              draggingId={draggingId}
              onCheckOutsourced={(card: any) => setCheckModalCard(card)}
            />
          ))}
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
    </div>
  )
}
