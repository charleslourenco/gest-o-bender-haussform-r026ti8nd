import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { OrcamentoInterno } from './OrcamentoInterno'
import { PropostaComercial } from './PropostaComercial'

export function OrcamentoTab({
  orcamento,
  onUpdate,
}: {
  orcamento: any
  onUpdate: (o: any) => void
}) {
  return (
    <Tabs defaultValue="interno" className="h-full flex flex-col min-h-0">
      <div className="flex justify-center mb-6">
        <TabsList className="bg-muted">
          <TabsTrigger value="interno">Subaba A: Orçamento Interno</TabsTrigger>
          <TabsTrigger value="comercial">Subaba B: Proposta Comercial</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="interno" className="flex-1 m-0 overflow-auto">
        <OrcamentoInterno orcamento={orcamento} onUpdate={onUpdate} />
      </TabsContent>
      <TabsContent value="comercial" className="flex-1 m-0 overflow-auto">
        <PropostaComercial orcamento={orcamento} />
      </TabsContent>
    </Tabs>
  )
}
