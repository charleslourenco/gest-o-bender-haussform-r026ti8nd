import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Loader2, AlertCircle, GripVertical, User, Package, CalendarClock } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

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
  criado_em: string
  analista_id: string | null
  formulario: { user_id: string } | null
}

export function KanbanBoard({ title, columns }: KanbanBoardProps) {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchItems()

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
          cliente:clientes(nome),
          formulario:formulario_comercial(user_id)
        `)

      if (err) throw err

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
    <div className="flex h-full flex-col overflow-hidden bg-off-white rounded-lg border border-steel-blue/10 shadow-sm">
      <div className="mb-4 px-6 pt-6 pb-2 border-b border-steel-blue/10 bg-white">
        <h1 className="text-2xl font-bold tracking-tight text-midnight-navy">{title}</h1>
        <p className="text-midnight-navy/60 text-sm mt-1">
          Arraste os cards entre as colunas para atualizar o status.
        </p>
      </div>

      <ScrollArea className="flex-1 px-6 pb-6">
        <div className="flex h-full gap-6 pb-4 pt-2">
          {columns.map((col) => {
            const colItems = items.filter((i) => i.status_analise === col.id)
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
                      className="group relative cursor-grab rounded-lg border border-steel-blue/20 bg-white p-4 shadow-sm hover:border-steel-blue/50 hover:shadow-md active:cursor-grabbing transition-all duration-200"
                    >
                      <div className="absolute top-4 right-3 text-steel-blue/30 opacity-0 group-hover:opacity-100 transition-opacity">
                        <GripVertical className="h-4 w-4" />
                      </div>

                      <div className="mb-3 pr-6">
                        <h4 className="font-semibold text-midnight-navy leading-snug">
                          {item.nome_produto}
                        </h4>
                        {item.codigo_rastreio && (
                          <div className="mt-2">
                            <span className="inline-block text-[11px] font-mono font-bold text-steel-blue bg-pale-cornflower px-2 py-0.5 rounded border border-steel-blue/20">
                              {item.codigo_rastreio}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2 mt-4 pt-3 border-t border-steel-blue/10 text-xs font-medium text-midnight-navy/70">
                        {item.cliente && (
                          <div className="flex items-center gap-2 text-midnight-navy/90">
                            <User className="h-3.5 w-3.5 shrink-0 text-steel-blue" />
                            <span className="truncate">{item.cliente.nome}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Package className="h-3.5 w-3.5 shrink-0 text-steel-blue" />
                            <span>Qtd: {item.qtd}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-midnight-navy/50">
                            <CalendarClock className="h-3.5 w-3.5 shrink-0" />
                            <span>{new Date(item.criado_em).toLocaleDateString('pt-BR')}</span>
                          </div>
                        </div>
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
    </div>
  )
}
