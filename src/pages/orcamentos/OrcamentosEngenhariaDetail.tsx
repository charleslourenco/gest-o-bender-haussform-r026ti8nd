import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UploadTab } from './tabs/UploadTab'
import { OrcamentoInterno } from './tabs/OrcamentoInterno'
import { ComprasTab } from './tabs/ComprasTab'
import { supabase } from '@/lib/supabase/client'
import { Calculator, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'

export default function OrcamentosEngenhariaDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
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
      <div className="bg-slate-900 rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-300 hover:text-white hover:bg-slate-800"
            onClick={() => navigate('/orcamentos')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-blue-400" />
              <input
                className="text-2xl font-bold text-white border-none bg-transparent hover:bg-slate-800/50 p-1 -ml-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 w-full max-w-2xl placeholder:text-slate-500"
                value={orcamento.nome}
                onChange={(e) => {
                  setOrcamento({ ...orcamento, nome: e.target.value })
                }}
                onBlur={(e) => {
                  supabase
                    .from('orcamentos_engenharia')
                    .update({ nome: e.target.value })
                    .eq('id', orcamento.id)
                }}
                placeholder="Nome do Orçamento/Projeto"
              />
            </div>
            <div className="flex items-center gap-2 pl-8">
              <span className="text-slate-400 text-sm font-medium">Cliente:</span>
              <input
                className="text-slate-300 border-none bg-transparent hover:bg-slate-800/50 h-6 p-1 -ml-1 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 placeholder:text-slate-600"
                placeholder="Digite o nome do cliente..."
                value={orcamento.cliente_nome_manual || ''}
                onChange={(e) => {
                  setOrcamento({ ...orcamento, cliente_nome_manual: e.target.value })
                }}
                onBlur={(e) => {
                  supabase
                    .from('orcamentos_engenharia')
                    .update({ cliente_nome_manual: e.target.value })
                    .eq('id', orcamento.id)
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="orcamento" className="flex-1 flex flex-col min-h-0 space-y-6">
        <div className="bg-slate-50 p-2 rounded-xl border shadow-sm overflow-x-auto">
          <TabsList className="w-full justify-start bg-transparent h-auto p-0 space-x-2">
            <TabsTrigger
              value="upload"
              className="data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm rounded-lg px-4 py-2"
            >
              Upload de Projetos
            </TabsTrigger>
            <TabsTrigger
              value="orcamento"
              className="data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm rounded-lg px-4 py-2"
            >
              Orçamento
            </TabsTrigger>
            <TabsTrigger
              value="compras"
              className="data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm rounded-lg px-4 py-2"
            >
              Lista de Materiais
            </TabsTrigger>
          </TabsList>
        </div>
        <div className="flex-1 overflow-auto bg-card border rounded-xl shadow-sm p-4">
          <TabsContent value="upload" className="h-full m-0">
            <UploadTab orcamentoId={id!} />
          </TabsContent>
          <TabsContent value="orcamento" className="h-full m-0">
            <OrcamentoInterno orcamento={orcamento} onUpdate={(o) => setOrcamento(o)} />
          </TabsContent>
          <TabsContent value="compras" className="h-full m-0">
            <ComprasTab orcamentoId={id!} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
