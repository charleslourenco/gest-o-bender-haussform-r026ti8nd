import { KanbanBoard } from '@/components/kanban/KanbanBoard'
import { Wrench } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MontadoresTab } from './MontadoresTab'

const COLUMNS = [
  { id: 'aguardando_agenda', title: 'Aguardando agenda' },
  { id: 'designar_equipe', title: 'Designar equipe' },
  { id: 'transporte', title: 'Transporte' },
  { id: 'inicio_montagem', title: 'Início montagem' },
  { id: 'item_terceirizado', title: 'Item terceirizado' },
  { id: 'finalizacao', title: 'Finalização' },
  { id: 'termo_conclusao', title: 'Termo conclusão e vistoria' },
  { id: 'assistencias', title: 'Assistências' },
  { id: 'pendencias', title: 'Pendências' },
  { id: 'finalizado_montagem', title: 'Concluído' },
]

export default function Montagem() {
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
          className="flex-1 overflow-hidden min-h-0 bg-off-white rounded-xl relative m-0"
        >
          <KanbanBoard title="" columns={COLUMNS} />
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
