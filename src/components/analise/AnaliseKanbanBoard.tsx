import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { AnaliseKanbanColumn } from './AnaliseKanbanColumn'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { CriarCardAvulsoModal } from './CriarCardAvulsoModal'
import { OutsourcedCheckModal } from './OutsourcedCheckModal'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export function AnaliseKanbanBoard({ columns, title }: { columns: any[]; title: string }) {
  const [cards, setCards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const [dragOverCol, setDragOverCol] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const [checkModalCard, setCheckModalCard] = useState<any | null>(null)
  const [avulsoModalOpen, setAvulsoModalOpen] = useState(false)
  const [avulsoCardToUpdate, setAvulsoCardToUpdate] = useState<any | null>(null)

  const loadCards = async () => {
    const { data } = await supabase.from('produtos_servicos_projeto').select('*, clientes(nome)')
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
        loadCards,
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
  }, [])

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

  const filteredCards = cards.filter((c) => {
    if (!searchQuery) return true
    return (
      c.nome_produto?.toLowerCase().includes(searchQuery) ||
      c.clientes?.nome?.toLowerCase().includes(searchQuery)
    )
  })

  if (loading) return <div className="p-8">Carregando...</div>

  return (
    <div className="flex-1 overflow-hidden flex flex-col h-full w-full bg-off-white">
      <div className="p-4 bg-white border-b flex justify-between items-center shadow-sm z-10">
        <h2 className="font-bold text-lg text-slate-800">{title}</h2>
      </div>
      <ScrollArea className="flex-1 w-full kanban-scroll-wrapper">
        <div className="flex gap-4 p-4 h-full min-h-[calc(100vh-200px)] w-max items-stretch">
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
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

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
