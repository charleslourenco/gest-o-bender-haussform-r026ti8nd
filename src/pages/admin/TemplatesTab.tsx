import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TemplatesList } from './TemplatesList'
import { PlaceholdersList } from './PlaceholdersList'

export function TemplatesTab() {
  return (
    <div className="space-y-4">
      <Tabs defaultValue="modelos" className="w-full">
        <TabsList className="bg-white/50 border border-steel-blue/20 w-full flex flex-col sm:flex-row h-auto p-1 rounded-lg gap-2 sm:gap-1 mb-4">
          <TabsTrigger
            value="modelos"
            className="w-full sm:w-auto data-[state=active]:bg-steel-blue data-[state=active]:text-off-white data-[state=active]:shadow-sm px-6 py-2.5 rounded-md transition-all text-sm font-medium text-midnight-navy hover:bg-white/80"
          >
            Modelos de Documentos
          </TabsTrigger>
          <TabsTrigger
            value="placeholders"
            className="w-full sm:w-auto data-[state=active]:bg-steel-blue data-[state=active]:text-off-white data-[state=active]:shadow-sm px-6 py-2.5 rounded-md transition-all text-sm font-medium text-midnight-navy hover:bg-white/80"
          >
            Placeholders
          </TabsTrigger>
        </TabsList>
        <TabsContent value="modelos" className="outline-none focus-visible:ring-0">
          <TemplatesList />
        </TabsContent>
        <TabsContent value="placeholders" className="outline-none focus-visible:ring-0">
          <PlaceholdersList />
        </TabsContent>
      </Tabs>
    </div>
  )
}
