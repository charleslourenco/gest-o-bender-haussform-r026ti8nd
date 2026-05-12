import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2 } from 'lucide-react'
import { KanbanColumnDef, CardData } from './types'
import { KanbanCard } from './KanbanCard'
import { KanbanDialog } from './KanbanDialog'
import { KanbanHeader } from './KanbanHeader'

export function KanbanBoard({ title, columns }: { title: string; columns: KanbanColumnDef[] }) {
  const [cards, setCards] = useState<CardData[]>([])
  const [usersMap, setUsersMap] = useState<
    Record<string, { nome: string; foto_perfil: string | null }>
  >({})
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedConsultant, setSelectedConsultant] = useState('all')
  const [selectedAnalyst, setSelectedAnalyst] = useState('all')
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [selectedCard, setSelectedCard] = useState<CardData | null>(null)
  const { toast } = useToast()

  const columnIds = columns.map((c) => c.id)

  useEffect(() => {
    fetchData()
  }, [columns])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [cardsRes, usersRes] = await Promise.all([
        supabase
          .from('produtos_servicos_projeto')
          .select(`*, clientes (nome), formulario_comercial (usuario_id)`),
        supabase.from('users').select('id, nome, foto_perfil'),
      ])

      if (cardsRes.error) throw cardsRes.error
      if (usersRes.error) throw usersRes.error

      const uMap: Record<string, { nome: string; foto_perfil: string | null }> = {}
      usersRes.data.forEach((u) => {
        uMap[u.id] = { nome: u.nome, foto_perfil: u.foto_perfil }
      })
      setUsersMap(uMap)

      const validCards = (cardsRes.data || []).filter((c) => columnIds.includes(c.status_analise))
      setCards(validCards)
    } catch (err: any) {
      toast({ title: 'Erro ao carregar', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault()
    const cardId = e.dataTransfer.getData('text/plain')
    if (!cardId || cardId === draggingId) return

    const card = cards.find((c) => c.id === cardId)
    if (card && card.status_analise !== newStatus) {
      setCards(cards.map((c) => (c.id === cardId ? { ...c, status_analise: newStatus } : c)))
      const { error } = await supabase
        .from('produtos_servicos_projeto')
        .update({ status_analise: newStatus, atualizado_em: new Date().toISOString() })
        .eq('id', cardId)

      if (error) {
        toast({ title: 'Erro ao mover card', description: error.message, variant: 'destructive' })
        fetchData()
      }
    }
    setDraggingId(null)
  }

  const handleAssignAnalyst = async (cardId: string, analystId: string | null) => {
    setSelectedCard((prev) => (prev ? { ...prev, analista_id: analystId } : null))
    setCards(cards.map((c) => (c.id === cardId ? { ...c, analista_id: analystId } : c)))

    const { error } = await supabase
      .from('produtos_servicos_projeto')
      .update({ analista_id: analystId, atualizado_em: new Date().toISOString() })
      .eq('id', cardId)

    if (error) {
      toast({ title: 'Erro ao atribuir', description: error.message, variant: 'destructive' })
      fetchData()
    } else {
      toast({ title: 'Responsável atualizado', description: 'Atribuição salva com sucesso.' })
    }
  }

  const filteredCards = cards.filter((card) => {
    const matchesSearch =
      card.nome_produto.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (card.clientes?.nome || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (card.codigo_rastreio || '').toLowerCase().includes(searchQuery.toLowerCase())

    const userId = card.formulario_comercial?.usuario_id
    const matchesConsultant = selectedConsultant === 'all' || userId === selectedConsultant
    const analystId = card.analista_id
    const matchesAnalyst =
      selectedAnalyst === 'all' ||
      (selectedAnalyst === 'unassigned' ? !analystId : analystId === selectedAnalyst)

    return matchesSearch && matchesConsultant && matchesAnalyst
  })

  const uniqueConsultants = Array.from(
    new Set(cards.map((c) => c.formulario_comercial?.usuario_id).filter(Boolean)),
  )
  const uniqueAnalysts = Array.from(new Set(cards.map((c) => c.analista_id).filter(Boolean)))

  return (
    <div className="flex flex-col h-full bg-midnight-navy text-off-white">
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
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-pale-cornflower" />
          </div>
        ) : (
          <div className="flex h-full w-full overflow-x-auto p-6 gap-6 items-start">
            {columns.map((col) => {
              const cardsInCol = filteredCards.filter((c) => c.status_analise === col.id)
              return (
                <div
                  key={col.id}
                  className="flex flex-col flex-shrink-0 w-[320px] max-h-full bg-dark-denim rounded-xl shadow-lg border border-steel-blue/30"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, col.id)}
                >
                  <div className="p-4 border-b border-steel-blue/30 bg-midnight-navy/40 rounded-t-xl flex justify-between items-center">
                    <h3 className="font-semibold text-pale-cornflower text-sm leading-tight flex-1">
                      {col.title}
                    </h3>
                    <Badge
                      variant="secondary"
                      className="ml-2 bg-steel-blue/20 text-pale-cornflower shrink-0"
                    >
                      {cardsInCol.length}
                    </Badge>
                  </div>
                  <ScrollArea className="flex-1 p-3">
                    <div className="flex flex-col gap-3 min-h-[100px]">
                      {cardsInCol.map((card) => (
                        <KanbanCard
                          key={card.id}
                          card={card}
                          usersMap={usersMap}
                          onClick={() => setSelectedCard(card)}
                          onDragStart={(e, id) => {
                            setDraggingId(id)
                            e.dataTransfer.setData('text/plain', id)
                          }}
                        />
                      ))}
                      {cardsInCol.length === 0 && (
                        <div className="text-center text-steel-blue text-xs py-8 border-2 border-dashed border-steel-blue/20 rounded-lg">
                          Solte itens aqui
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              )
            })}
          </div>
        )}
      </div>
      <KanbanDialog
        selectedCard={selectedCard}
        setSelectedCard={setSelectedCard}
        columns={columns}
        usersMap={usersMap}
        onAssignAnalyst={handleAssignAnalyst}
      />
    </div>
  )
}
