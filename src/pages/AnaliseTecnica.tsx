import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, Search, Filter } from 'lucide-react'

const KANBAN_COLUMNS = [
  { id: 'iniciar', title: 'Iniciar' },
  { id: 'aguardando_liberacao', title: 'Aguardando liberação para medida fina' },
  { id: 'medida_fina', title: 'Medida fina' },
  { id: 'reuniao_analise', title: 'Reunião de análise' },
  { id: 'caderno_tecnico', title: 'Caderno técnico' },
  { id: 'alteracao_projeto', title: 'Alteração de projeto' },
  { id: 'lista_materiais', title: 'Lista de materiais' },
  { id: 'concluido', title: 'Concluído' },
]

interface CardData {
  id: string
  formulario_comercial_id: string | null
  cliente_id: string | null
  nome_produto: string
  qtd: number
  descricao: string | null
  valor_unitario: number
  valor_total: number
  status_analise: string
  criado_em: string
  atualizado_em: string
  clientes?: { nome: string } | null
  formulario_comercial?: { usuario_id: string | null } | null
}

export default function AnaliseTecnica() {
  const [cards, setCards] = useState<CardData[]>([])
  const [usersMap, setUsersMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedConsultant, setSelectedConsultant] = useState('all')
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [selectedCard, setSelectedCard] = useState<CardData | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [cardsRes, usersRes] = await Promise.all([
        supabase.from('produtos_servicos_projeto').select(`
          *,
          clientes (nome),
          formulario_comercial (usuario_id)
        `),
        supabase.from('users').select('id, nome'),
      ])

      if (cardsRes.error) throw cardsRes.error
      if (usersRes.error) throw usersRes.error

      const uMap: Record<string, string> = {}
      usersRes.data.forEach((u) => {
        uMap[u.id] = u.nome
      })
      setUsersMap(uMap)

      const validCards = (cardsRes.data || []).map((c) => {
        const isKnown = KANBAN_COLUMNS.some((col) => col.id === c.status_analise)
        return { ...c, status_analise: isKnown ? c.status_analise : 'iniciar' }
      })

      setCards(validCards)
    } catch (err: any) {
      toast({ title: 'Erro ao carregar dados', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggingId(id)
    e.dataTransfer.setData('text/plain', id)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
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

  const filteredCards = cards.filter((card) => {
    const matchesSearch =
      card.nome_produto.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (card.clientes?.nome || '').toLowerCase().includes(searchQuery.toLowerCase())

    const userId = card.formulario_comercial?.usuario_id
    const matchesConsultant = selectedConsultant === 'all' || userId === selectedConsultant

    return matchesSearch && matchesConsultant
  })

  const uniqueConsultants = Array.from(
    new Set(cards.map((c) => c.formulario_comercial?.usuario_id).filter(Boolean)),
  )

  return (
    <div className="flex flex-col h-full bg-midnight-navy text-off-white">
      <div className="p-6 pb-2">
        <h1 className="text-2xl font-bold text-pale-cornflower mb-6">Análise Técnica</h1>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-steel-blue" />
            <Input
              placeholder="Buscar por produto ou cliente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-dark-denim border-steel-blue text-off-white placeholder:text-steel-blue/70"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-steel-blue" />
            <Select value={selectedConsultant} onValueChange={setSelectedConsultant}>
              <SelectTrigger className="w-[200px] bg-dark-denim border-steel-blue text-off-white">
                <SelectValue placeholder="Filtrar consultor" />
              </SelectTrigger>
              <SelectContent className="bg-dark-denim border-steel-blue text-off-white">
                <SelectItem value="all">Todos os Consultores</SelectItem>
                {uniqueConsultants.map((id) => (
                  <SelectItem key={id as string} value={id as string}>
                    {usersMap[id as string] || 'Desconhecido'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-pale-cornflower" />
          </div>
        ) : (
          <div className="flex h-full w-full overflow-x-auto p-6 gap-6 items-start">
            {KANBAN_COLUMNS.map((col) => {
              const cardsInCol = filteredCards.filter((c) => c.status_analise === col.id)
              return (
                <div
                  key={col.id}
                  className="flex flex-col flex-shrink-0 w-[320px] max-h-full bg-dark-denim rounded-xl shadow-lg border border-steel-blue/30"
                  onDragOver={handleDragOver}
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
                        <div
                          key={card.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, card.id)}
                          onClick={() => setSelectedCard(card)}
                          className="p-4 bg-midnight-navy rounded-lg border border-steel-blue/40 shadow-sm cursor-pointer hover:border-pale-cornflower hover:shadow-md transition-all"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-mono text-steel-blue">
                              #{card.formulario_comercial_id?.split('-')[0].toUpperCase() || 'N/A'}
                            </span>
                            <Badge className="bg-steel-blue text-[10px] py-0">
                              Qtd: {card.qtd}
                            </Badge>
                          </div>
                          <div className="font-semibold text-off-white text-sm mb-1 leading-snug">
                            {card.nome_produto}
                          </div>
                          <div className="text-xs text-pale-cornflower/80 truncate">
                            Cliente: {card.clientes?.nome || 'N/A'}
                          </div>
                        </div>
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

      <Dialog open={!!selectedCard} onOpenChange={(o) => !o && setSelectedCard(null)}>
        <DialogContent className="bg-midnight-navy text-off-white border-steel-blue sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-pale-cornflower text-xl">Detalhes do Item</DialogTitle>
          </DialogHeader>
          {selectedCard && (
            <div className="space-y-5 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-steel-blue uppercase font-semibold">Produto</span>
                  <p className="font-medium mt-1">{selectedCard.nome_produto}</p>
                </div>
                <div>
                  <span className="text-xs text-steel-blue uppercase font-semibold">Cliente</span>
                  <p className="font-medium mt-1 text-pale-cornflower">
                    {selectedCard.clientes?.nome || 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-steel-blue uppercase font-semibold">
                    Quantidade
                  </span>
                  <p className="font-medium mt-1">{selectedCard.qtd}</p>
                </div>
                <div>
                  <span className="text-xs text-steel-blue uppercase font-semibold">
                    Status Atual
                  </span>
                  <p className="font-medium mt-1 text-pale-cornflower">
                    {KANBAN_COLUMNS.find((c) => c.id === selectedCard.status_analise)?.title ||
                      selectedCard.status_analise}
                  </p>
                </div>
              </div>

              <div>
                <span className="text-xs text-steel-blue uppercase font-semibold">Descrição</span>
                <div className="text-sm bg-dark-denim p-3 rounded-lg mt-1 min-h-[80px] border border-steel-blue/30 whitespace-pre-wrap text-off-white/90">
                  {selectedCard.descricao || 'Nenhuma descrição fornecida.'}
                </div>
              </div>

              <div className="flex justify-between items-center bg-dark-denim/50 p-3 rounded-lg border border-steel-blue/20">
                <div>
                  <span className="text-xs text-steel-blue uppercase font-semibold block">
                    Consultor
                  </span>
                  <p className="font-medium mt-1 text-sm">
                    {selectedCard.formulario_comercial?.usuario_id
                      ? usersMap[selectedCard.formulario_comercial.usuario_id] || 'Desconhecido'
                      : 'N/A'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-steel-blue uppercase font-semibold block">
                    Criado em
                  </span>
                  <p className="text-sm text-off-white/80 mt-1">
                    {new Date(selectedCard.criado_em).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
