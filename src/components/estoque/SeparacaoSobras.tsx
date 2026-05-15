import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CaixasVirtuais } from './CaixasVirtuais'
import { GestaoSobras } from './GestaoSobras'

export function SeparacaoSobras() {
  return (
    <div className="space-y-6 pt-4 animate-in fade-in duration-300">
      <Tabs defaultValue="caixas" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="caixas">Caixas Virtuais</TabsTrigger>
          <TabsTrigger value="sobras">Gestão de Sobras</TabsTrigger>
        </TabsList>
        <TabsContent value="caixas" className="mt-4 outline-none border-none">
          <CaixasVirtuais />
        </TabsContent>
        <TabsContent value="sobras" className="mt-4 outline-none border-none">
          <GestaoSobras />
        </TabsContent>
      </Tabs>
    </div>
  )
}
