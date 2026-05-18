import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UploadTab } from './tabs/UploadTab'
import { OrcamentoTab } from './tabs/OrcamentoTab'
import { ComprasTab } from './tabs/ComprasTab'
import { supabase } from '@/lib/supabase/client'

export default function OrcamentosEngenhariaDetail() {
  const { id } = useParams()
  const [orcamento, setOrcamento] = useState<any>(null)

  useEffect(() => {
    if (id) {
      supabase
        .from('orcamentos_engenharia')
        .select('*')
        .eq('id', id)
        .single()
        .then(({ data }) => setOrcamento(data))
    }
  }, [id])

  if (!orcamento) return <div className="p-6">Carregando...</div>

  return (
    <div className="p-6 space-y-6 flex flex-col h-[calc(100vh-2rem)]">
      <div>
        <h1 className="text-2xl font-bold">{orcamento.nome}</h1>
        <p className="text-muted-foreground">Módulo de Orçamentos e Engenharia</p>
      </div>

      <Tabs defaultValue="orcamento" className="flex-1 flex flex-col min-h-0">
        <TabsList className="w-full justify-start rounded-b-none border-b rounded-t-lg px-2 pt-2 bg-transparent h-auto space-x-2">
          <TabsTrigger
            value="upload"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none py-2"
          >
            Upload de Projetos
          </TabsTrigger>
          <TabsTrigger
            value="orcamento"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none py-2"
          >
            Painel de Orçamento
          </TabsTrigger>
          <TabsTrigger
            value="compras"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none py-2"
          >
            Lista de Materiais
          </TabsTrigger>
        </TabsList>
        <div className="flex-1 overflow-auto bg-card border border-t-0 rounded-b-lg p-4">
          <TabsContent value="upload" className="h-full m-0">
            <UploadTab orcamentoId={id!} />
          </TabsContent>
          <TabsContent value="orcamento" className="h-full m-0">
            <OrcamentoTab orcamento={orcamento} onUpdate={(o) => setOrcamento(o)} />
          </TabsContent>
          <TabsContent value="compras" className="h-full m-0">
            <ComprasTab orcamentoId={id!} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
