import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Users } from 'lucide-react'
import { AcompanhamentoAvulsoModal } from './AcompanhamentoAvulsoModal'
import { useToast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'

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

  const fetchCards = async () => {
    const { data, error } = await supabase
      .from('acompanhamentos')
      .select('*, responsaveis_acompanhamentos(nome)')
      .order('data_criacao', { ascending: false })

    if (!error && data) setCards(data)
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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent, status: string) => {
    e.preventDefault()
    const cardId = e.dataTransfer.getData('cardId')
    if (!cardId) return

    // Optimistic update
    setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, status_atual: status } : c)))

    const { error } = await supabase
      .from('acompanhamentos')
      .update({ status_atual: status })
      .eq('id', cardId)

    if (error) {
      toast({ title: 'Erro ao mover card', description: error.message, variant: 'destructive' })
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

      <div className="flex-1 flex gap-4 overflow-x-auto overflow-y-hidden pb-4">
        {COLUMNS.map((col) => (
          <div
            key={col}
            className="flex flex-col flex-shrink-0 w-[300px] h-full bg-muted/30 rounded-lg border border-border"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col)}
          >
            <div className="p-3 font-semibold border-b border-border flex justify-between items-center bg-muted/50 rounded-t-lg shrink-0">
              <span className="text-sm truncate mr-2" title={col}>
                {col}
              </span>
              <Badge variant="secondary" className="text-xs">
                {cards.filter((c) => c.status_atual === col).length}
              </Badge>
            </div>

            <div className="p-2 flex-1 overflow-y-auto space-y-2 min-h-0">
              {cards.filter((c) => c.status_atual === col).length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-xs italic opacity-50 border-2 border-dashed border-border/50 rounded-md">
                  Solte os cards aqui
                </div>
              ) : (
                cards
                  .filter((c) => c.status_atual === col)
                  .map((card) => (
                    <Card
                      key={card.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, card.id)}
                      className="cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors shadow-sm"
                    >
                      <CardContent className="p-3">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded">
                            {card.codigo_projeto}
                          </span>
                          <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                            {card.quantidade_itens} iten(s)
                          </span>
                        </div>
                        <h4 className="font-semibold text-sm mb-1 leading-tight">
                          {card.nome_cliente}
                        </h4>
                        <p
                          className="text-xs text-muted-foreground mb-3 line-clamp-2"
                          title={card.tipo_acompanhamento}
                        >
                          {card.tipo_acompanhamento}
                        </p>

                        <div className="flex items-center text-[11px] text-muted-foreground bg-muted/50 p-1.5 rounded-md">
                          <Users className="w-3 h-3 mr-1.5 shrink-0" />
                          <span className="truncate">
                            {card.responsaveis_acompanhamentos?.nome || 'Sem responsável'}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))
              )}
            </div>
          </div>
        ))}
      </div>

      <AcompanhamentoAvulsoModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSuccess={fetchCards}
      />
    </div>
  )
}
