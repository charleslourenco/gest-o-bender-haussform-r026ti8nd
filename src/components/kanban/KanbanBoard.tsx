import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import {
  Loader2,
  AlertCircle,
  GripVertical,
  User,
  Package,
  CalendarClock,
  Trash2,
  FileSearch,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { KanbanHeader } from './KanbanHeader'
import { MontadorSelect } from './MontadorSelect'
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

  const [showSobrasPrompt, setShowSobrasPrompt] = useState(false)
  const [showSobrasRegister, setShowSobrasRegister] = useState(false)
  const [novaSobra, setNovaSobra] = useState({ nome: '', largura: 0, altura: 0 })
  const [descarteSugerido, setDescarteSugerido] = useState(false)

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
    window.addEventListener('kanban_updated', handleKanbanUpdated)

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
          cliente:clientes(nome),
          formulario:formulario_comercial(user_id),
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

  const filteredItems = items.filter((item) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const matchName = item.nome_produto?.toLowerCase().includes(q)
      const matchCode = item.codigo_rastreio?.toLowerCase().includes(q)
      const matchClient = item.cliente?.nome?.toLowerCase().includes(q)
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

  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    e.dataTransfer.setData('itemId', itemId)
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

    // Optimistic UI update
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, status_analise: columnId } : i)))

    try {
      const { error: updateErr } = await supabase
        .from('produtos_servicos_projeto')
        .update({ status_analise: columnId, atualizado_em: new Date().toISOString() })
        .eq('id', itemId)

      if (updateErr) throw updateErr
      toast.success('Card movido com sucesso!')

      if (columnId === 'aguardando_agenda') {
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

  return (
    <div
      className={cn(
        'flex h-full flex-col overflow-hidden shadow-sm',
        isAnaliseTecnica
          ? 'bg-off-white rounded-xl'
          : 'bg-off-white rounded-lg border border-steel-blue/10',
      )}
    >
      {isAnaliseTecnica ? (
        <div className="flex flex-col sm:flex-row items-center justify-between bg-[#0A1931] px-6 py-3 shrink-0">
          <div className="flex items-center gap-3 w-full sm:w-auto mb-3 sm:mb-0">
            <FileSearch className="h-6 w-6 text-emerald-400" />
            <h1 className="text-white font-bold text-xl">Análise Técnica</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
            <Input
              placeholder="Buscar cards..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50 h-9 w-[200px]"
            />
            <Select value={selectedAnalyst} onValueChange={setSelectedAnalyst}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white h-9 w-[180px]">
                <SelectValue placeholder="Responsável" />
              </SelectTrigger>
              <SelectContent className="bg-[#1A3D63] border-white/20 text-white">
                <SelectItem value="all" className="focus:bg-white/10 focus:text-white">
                  Todos Responsáveis
                </SelectItem>
                <SelectItem value="unassigned" className="focus:bg-white/10 focus:text-white">
                  Não atribuído
                </SelectItem>
                {uniqueAnalysts.map(
                  (id) =>
                    usersMap[id] && (
                      <SelectItem
                        key={id}
                        value={id}
                        className="focus:bg-white/10 focus:text-white"
                      >
                        {usersMap[id].nome}
                      </SelectItem>
                    ),
                )}
              </SelectContent>
            </Select>
            <Select value={selectedConsultant} onValueChange={setSelectedConsultant}>
              <SelectTrigger className="bg-white/10 border-white/20 text-white h-9 w-[180px]">
                <SelectValue placeholder="Consultor" />
              </SelectTrigger>
              <SelectContent className="bg-[#1A3D63] border-white/20 text-white">
                <SelectItem value="all" className="focus:bg-white/10 focus:text-white">
                  Todos Consultores
                </SelectItem>
                {uniqueConsultants.map(
                  (id) =>
                    usersMap[id] && (
                      <SelectItem
                        key={id}
                        value={id}
                        className="focus:bg-white/10 focus:text-white"
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
        <div className="border-b border-steel-blue/10 bg-white">
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
          <div className="px-6 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-2">
            <p className="text-midnight-navy/60 text-sm">
              Arraste os cards entre as colunas para atualizar o status.
            </p>
          </div>
        </div>
      )}

      <ScrollArea className="flex-1 px-6 pb-6">
        <div className="flex h-full gap-6 pb-4 pt-4">
          {columns.map((col) => {
            const colItems = filteredItems.filter((i) => i.status_analise === col.id)
            return (
              <div
                key={col.id}
                className="flex h-full w-[320px] shrink-0 flex-col rounded-xl bg-pale-cornflower/30 border border-steel-blue/20 transition-colors duration-200"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col.id)}
              >
                <div className="flex items-center justify-between border-b border-steel-blue/10 bg-pale-cornflower/60 px-4 py-3 rounded-t-xl sticky top-0 z-10 shadow-sm">
                  <h3 className="font-semibold text-midnight-navy text-sm uppercase tracking-wider">
                    {col.title}
                  </h3>
                  <Badge
                    variant="secondary"
                    className="bg-white text-steel-blue font-bold shadow-sm"
                  >
                    {colItems.length}
                  </Badge>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar min-h-[150px]">
                  {colItems.map((item) => (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, item.id)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        'group relative cursor-grab rounded-lg border p-4 shadow-sm hover:shadow-md active:cursor-grabbing transition-all duration-200',
                        isAnaliseTecnica
                          ? 'bg-[#1A3D63] border-white/10 hover:border-white/30'
                          : 'bg-white border-steel-blue/20 hover:border-steel-blue/50',
                      )}
                    >
                      <div
                        className={cn(
                          'absolute top-4 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 pl-2',
                          isAnaliseTecnica
                            ? 'text-white/30 bg-[#1A3D63]'
                            : 'text-steel-blue/30 bg-white',
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
                            isAnaliseTecnica
                              ? 'hover:text-red-400 hover:bg-red-400/10'
                              : 'hover:text-red-500 hover:bg-red-50',
                          )}
                          title="Excluir card"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <div className="p-1 cursor-grab active:cursor-grabbing">
                          <GripVertical className="h-4 w-4" />
                        </div>
                      </div>

                      <div className="mb-3 pr-16">
                        <h4
                          className={cn(
                            'font-semibold leading-snug',
                            isAnaliseTecnica ? 'text-[#F6FAFD]' : 'text-midnight-navy',
                          )}
                        >
                          {item.nome_produto}
                        </h4>
                        {item.codigo_rastreio && (
                          <div className="mt-2">
                            <span
                              className={cn(
                                'inline-block text-[11px] font-mono font-bold px-2 py-0.5 rounded border',
                                isAnaliseTecnica
                                  ? 'text-white bg-white/10 border-white/20'
                                  : 'text-steel-blue bg-pale-cornflower border-steel-blue/20',
                              )}
                            >
                              {item.codigo_rastreio}
                            </span>
                          </div>
                        )}
                      </div>

                      <div
                        className={cn(
                          'space-y-2 mt-4 pt-3 border-t text-xs font-medium',
                          isAnaliseTecnica
                            ? 'border-white/10 text-white/70'
                            : 'border-steel-blue/10 text-midnight-navy/70',
                        )}
                      >
                        {item.cliente && (
                          <div
                            className={cn(
                              'flex items-center gap-2',
                              isAnaliseTecnica ? 'text-[#F6FAFD]' : 'text-midnight-navy/90',
                            )}
                          >
                            <User
                              className={cn(
                                'h-3.5 w-3.5 shrink-0',
                                isAnaliseTecnica ? 'text-emerald-400' : 'text-steel-blue',
                              )}
                            />
                            <span className="truncate">{item.cliente.nome}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Package
                              className={cn(
                                'h-3.5 w-3.5 shrink-0',
                                isAnaliseTecnica ? 'text-white/50' : 'text-steel-blue',
                              )}
                            />
                            <span>Qtd: {item.qtd}</span>
                          </div>
                          <div
                            className={cn(
                              'flex items-center gap-1.5',
                              isAnaliseTecnica ? 'text-white/50' : 'text-midnight-navy/50',
                            )}
                          >
                            <CalendarClock className="h-3.5 w-3.5 shrink-0" />
                            <span>{new Date(item.criado_em).toLocaleDateString('pt-BR')}</span>
                          </div>
                        </div>
                      </div>

                      <div
                        className={cn(
                          'mt-4 pt-3 border-t flex flex-col gap-1.5',
                          isAnaliseTecnica ? 'border-white/10' : 'border-steel-blue/10',
                        )}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Select
                          value={item.analista_id || 'unassigned'}
                          onValueChange={(val) =>
                            handleAssignAnalyst(item.id, val === 'unassigned' ? null : val)
                          }
                        >
                          <SelectTrigger
                            className={cn(
                              'h-8 text-xs w-full focus:ring-0 focus:ring-offset-0',
                              isAnaliseTecnica
                                ? 'bg-white/10 border-white/20 text-white'
                                : 'border-steel-blue/20 bg-pale-cornflower/20 text-midnight-navy',
                            )}
                          >
                            <SelectValue placeholder="Atribuir responsável..." />
                          </SelectTrigger>
                          <SelectContent
                            className={cn(
                              isAnaliseTecnica && 'bg-[#1A3D63] border-white/20 text-white',
                            )}
                          >
                            <SelectItem
                              value="unassigned"
                              className={cn(
                                'text-xs',
                                isAnaliseTecnica
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
                                  'text-xs',
                                  isAnaliseTecnica && 'focus:bg-white/10 focus:text-white',
                                )}
                              >
                                {u.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {isMontagemRoute && (
                          <MontadorSelect
                            item={item}
                            montadores={allMontadores}
                            onUpdate={fetchItems}
                          />
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
          })}
        </div>
        <ScrollBar orientation="horizontal" className="h-2.5" />
      </ScrollArea>

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
