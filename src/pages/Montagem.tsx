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
      .select('*, clientes(nome)')
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
    <div className="h-[calc(100vh-2rem)] md:h-screen flex flex-col bg-off-white pt-0 px-6 pb-6 animate-in fade-in duration-300">
      <Tabs defaultValue="kanban" className="flex-1 flex flex-col min-h-0 w-full mt-4">
        <div className="flex flex-row items-center justify-between w-full bg-[#0A1931] text-white px-4 py-3 mb-4 rounded-md mt-0 flex-nowrap overflow-x-auto overflow-y-hidden gap-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="flex flex-row items-center gap-2 shrink-0 whitespace-nowrap">
            <div className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-bold text-white">Montagem</h2>
            </div>

            <TabsList className="bg-white/10 border-none h-9 ml-2">
              <TabsTrigger
                value="kanban"
                className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/60"
              >
                Quadro Kanban
              </TabsTrigger>
              <TabsTrigger
                value="montadores"
                className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/60"
              >
                Gestão de Montadores
              </TabsTrigger>
            </TabsList>
          </div>
          <div className="flex flex-row items-center gap-2 shrink-0 whitespace-nowrap"></div>
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
                          className="bg-[#1A3D63] text-white p-2 rounded-md shadow-sm flex flex-col gap-1 w-full border-none shrink-0"
                        >
                          <div className="flex flex-row items-baseline gap-1 w-full truncate text-xs font-medium">
                            <span className="truncate w-full">
                              {card.codigo_rastreio
                                ? `#${card.codigo_rastreio}`
                                : `#${card.formulario_comercial_id?.split('-')[0]?.toUpperCase() || 'N/A'}`}
                              {' - '}
                              {card.clientes?.nome || 'Cliente N/A'}
                            </span>
                          </div>

                          <div className="truncate w-full text-xs font-semibold text-[#F6FAFD]">
                            {card.nome_produto}
                          </div>

                          <div className="truncate w-full text-[10px] text-white/70">
                            Qtd: {card.qtd}
                          </div>

                          <select
                            className="mt-1 p-1 border border-white/20 rounded text-[11px] w-full bg-[#0A1931] text-white focus:outline-none focus:ring-1 focus:ring-white/30 truncate"
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
