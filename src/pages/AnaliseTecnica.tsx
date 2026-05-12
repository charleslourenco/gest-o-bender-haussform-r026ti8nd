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
  codigo_rastreio?: string | null
  analista_id?: string | null
  clientes?: { nome: string } | null
  formulario_comercial?: { usuario_id: string | null } | null
}

export default function AnaliseTecnica() {
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
        supabase.from('users').select('id, nome, foto_perfil'),
      ])

      if (cardsRes.error) throw cardsRes.error
      if (usersRes.error) throw usersRes.error

      const uMap: Record<string, { nome: string; foto_perfil: string | null }> = {}
      usersRes.data.forEach((u) => {
        uMap[u.id] = { nome: u.nome, foto_perfil: u.foto_perfil }
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
      <div className="p-6 pb-2">
        <h1 className="text-2xl font-bold text-pale-cornflower mb-6">Análise Técnica</h1>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-steel-blue" />
            <Input
              placeholder="Buscar por produto, cliente ou código..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-dark-denim border-steel-blue text-off-white placeholder:text-steel-blue/70"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-steel-blue" />
            <Select value={selectedAnalyst} onValueChange={setSelectedAnalyst}>
              <SelectTrigger className="w-[200px] bg-dark-denim border-steel-blue text-off-white">
                <SelectValue placeholder="Filtrar Analista" />
              </SelectTrigger>
              <SelectContent className="bg-dark-denim border-steel-blue text-off-white">
                <SelectItem value="all">Todos os Analistas</SelectItem>
                <SelectItem value="unassigned">Não atribuídos</SelectItem>
                {uniqueAnalysts.map((id) => (
                  <SelectItem key={id as string} value={id as string}>
                    {usersMap[id as string]?.nome || 'Desconhecido'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedConsultant} onValueChange={setSelectedConsultant}>
              <SelectTrigger className="w-[200px] bg-dark-denim border-steel-blue text-off-white">
                <SelectValue placeholder="Filtrar Consultor" />
              </SelectTrigger>
              <SelectContent className="bg-dark-denim border-steel-blue text-off-white">
                <SelectItem value="all">Todos os Consultores</SelectItem>
                {uniqueConsultants.map((id) => (
                  <SelectItem key={id as string} value={id as string}>
                    {usersMap[id as string]?.nome || 'Desconhecido'}
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
                            <span className="text-xs font-mono font-bold text-pale-cornflower bg-steel-blue/20 px-1.5 py-0.5 rounded">
                              {card.codigo_rastreio ||
                                `#${card.formulario_comercial_id?.split('-')[0].toUpperCase() || 'N/A'}`}
                            </span>
                            <Badge className="bg-steel-blue text-[10px] py-0">
                              Qtd: {card.qtd}
                            </Badge>
                          </div>
                          <div className="font-semibold text-off-white text-sm mb-1 leading-snug">
                            {card.nome_produto}
                          </div>
                          <div className="flex justify-between items-center mt-2">
                            <div className="text-xs text-pale-cornflower/80 truncate max-w-[150px]">
                              {card.clientes?.nome || 'Cliente N/A'}
                            </div>
                            {card.analista_id && usersMap[card.analista_id] && (
                              <div
                                className="flex items-center gap-1.5 shrink-0"
                                title={`Analista: ${usersMap[card.analista_id].nome}`}
                              >
                                {usersMap[card.analista_id].foto_perfil ? (
                                  <img
                                    src={usersMap[card.analista_id].foto_perfil as string}
                                    className="w-5 h-5 rounded-full object-cover border border-steel-blue"
                                    alt="Avatar"
                                  />
                                ) : (
                                  <div className="w-5 h-5 rounded-full bg-steel-blue text-midnight-navy flex items-center justify-center text-[9px] font-bold">
                                    {usersMap[card.analista_id].nome.charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </div>
                            )}
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

              <div className="bg-dark-denim/50 p-3 rounded-lg border border-steel-blue/20">
                <span className="text-xs text-steel-blue uppercase font-semibold block mb-2">
                  Analista Responsável
                </span>
                <Select
                  value={selectedCard.analista_id || 'unassigned'}
                  onValueChange={async (val) => {
                    const newAnalistaId = val === 'unassigned' ? null : val
                    setSelectedCard({ ...selectedCard, analista_id: newAnalistaId })
                    setCards(
                      cards.map((c) =>
                        c.id === selectedCard.id ? { ...c, analista_id: newAnalistaId } : c,
                      ),
                    )

                    const { error } = await supabase
                      .from('produtos_servicos_projeto')
                      .update({
                        analista_id: newAnalistaId,
                        atualizado_em: new Date().toISOString(),
                      })
                      .eq('id', selectedCard.id)

                    if (error) {
                      toast({
                        title: 'Erro ao atribuir analista',
                        description: error.message,
                        variant: 'destructive',
                      })
                      fetchData()
                    } else {
                      toast({
                        title: 'Analista atualizado',
                        description: 'Responsável atribuído com sucesso.',
                      })
                    }
                  }}
                >
                  <SelectTrigger className="w-full bg-midnight-navy border-steel-blue text-off-white">
                    <SelectValue placeholder="Selecione um analista" />
                  </SelectTrigger>
                  <SelectContent className="bg-dark-denim border-steel-blue text-off-white">
                    <SelectItem value="unassigned">Não atribuído</SelectItem>
                    {Object.entries(usersMap).map(([id, user]) => (
                      <SelectItem key={id} value={id}>
                        {user.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-between items-center bg-dark-denim/50 p-3 rounded-lg border border-steel-blue/20">
                <div>
                  <span className="text-xs text-steel-blue uppercase font-semibold block">
                    Consultor Original
                  </span>
                  <p className="font-medium mt-1 text-sm">
                    {selectedCard.formulario_comercial?.usuario_id
                      ? usersMap[selectedCard.formulario_comercial.usuario_id]?.nome ||
                        'Desconhecido'
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
