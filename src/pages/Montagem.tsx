import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Wrench } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MontadoresTab } from './MontadoresTab'
import { toast } from 'sonner'

const COLUMNS = [
  { id: 'transporte', title: 'Transporte' },
  { id: 'montagem', title: 'Montagem' },
  { id: 'assistencia', title: 'Assistência' },
  { id: 'concluido', title: 'Concluído' },
]

export default function Montagem() {
  const [cards, setCards] = useState<any[]>([])

  const fetchCards = async () => {
    const { data, error } = await supabase
      .from('produtos_servicos_projeto')
      .select('*')
      .in(
        'status_analise',
        COLUMNS.map((c) => c.id),
      )

    if (!error && data) {
      setCards(data)
    }
  }

  useEffect(() => {
    fetchCards()

    const channel = supabase
      .channel('montagem_kanban_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'produtos_servicos_projeto' },
        () => {
          fetchCards()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const onStatusChange = async (id: string, newStatus: string) => {
    const previousCards = [...cards]
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, status_analise: newStatus } : c)))

    const { error } = await supabase
      .from('produtos_servicos_projeto')
      .update({ status_analise: newStatus })
      .eq('id', id)

    if (error) {
      toast.error('Erro ao atualizar status: ' + error.message)
      setCards(previousCards)
    } else {
      toast.success('Status atualizado com sucesso')
    }
  }

  return (
    <div className="h-[calc(100vh-2rem)] md:h-screen flex flex-col bg-off-white p-6 space-y-6 animate-in fade-in duration-300">
      <div className="bg-midnight-navy p-6 rounded-xl shadow-sm shrink-0 flex items-center gap-4">
        <Wrench className="h-10 w-10 text-emerald-400 hidden sm:block" />
        <div>
          <h1 className="text-off-white font-bold text-[32px]">Montagem</h1>
          <p className="text-pale-cornflower mt-1">Gestão de expedição e montagem em campo</p>
        </div>
      </div>

      <Tabs defaultValue="kanban" className="flex-1 flex flex-col min-h-0">
        <div className="flex justify-between items-center mb-4">
          <TabsList className="bg-steel-blue/20">
            <TabsTrigger
              value="kanban"
              className="data-[state=active]:bg-steel-blue data-[state=active]:text-white"
            >
              Quadro Kanban
            </TabsTrigger>
            <TabsTrigger
              value="montadores"
              className="data-[state=active]:bg-steel-blue data-[state=active]:text-white"
            >
              Gestão de Montadores
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          value="kanban"
          className="flex-1 overflow-hidden min-h-0 bg-off-white rounded-xl relative m-0 flex flex-col"
        >
          <div className="overflow-x-auto pb-4 flex-1 h-full">
            <div className="flex gap-4 min-w-max h-full p-4">
              {COLUMNS.map((column) => {
                const columnCards = cards.filter((c) => c.status_analise === column.id)
                return (
                  <div
                    key={column.id}
                    className="min-w-[320px] flex flex-col bg-gray-100 p-4 rounded-lg h-full"
                  >
                    <h3 className="font-bold mb-4 shrink-0">{column.title}</h3>
                    <div className="flex flex-col gap-3 overflow-y-auto flex-1 pb-4">
                      {columnCards.map((card) => (
                        <div
                          key={card.id}
                          className="bg-white p-4 rounded shadow flex flex-col gap-2 shrink-0"
                        >
                          <div className="font-semibold text-gray-900">{card.nome_produto}</div>
                          <div className="text-sm text-gray-600">Qtd: {card.qtd}</div>
                          {card.codigo_rastreio && (
                            <div className="text-sm text-gray-500">
                              Rastreio: {card.codigo_rastreio}
                            </div>
                          )}
                          <select
                            className="mt-2 p-1.5 border border-gray-200 rounded text-sm w-full bg-white focus:outline-none focus:ring-2 focus:ring-steel-blue/20"
                            value={card.status_analise}
                            onChange={(e) => onStatusChange(card.id, e.target.value)}
                          >
                            {COLUMNS.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.title}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </TabsContent>

        <TabsContent
          value="montadores"
          className="flex-1 overflow-auto bg-white rounded-xl shadow-sm border border-steel-blue/10 p-6 m-0"
        >
          <MontadoresTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
