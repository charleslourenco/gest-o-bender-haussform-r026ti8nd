import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Settings, FileText, Search, Download } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function OrcamentosEngenhariaList() {
  const [orcamentos, setOrcamentos] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [config, setConfig] = useState<any>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const { data } = await supabase
      .from('orcamentos_engenharia')
      .select('*, cliente:clientes(nome)')
      .order('criado_em', { ascending: false })

    if (data) setOrcamentos(data)

    const { data: cfg } = await supabase.from('configuracoes_sistema').select('*').limit(1).single()
    if (cfg) setConfig(cfg)
  }

  const saveConfig = async () => {
    if (!config) return
    const { error } = await supabase
      .from('configuracoes_sistema')
      .update({
        markup_vista: config.markup_vista,
        markup_prazo: config.markup_prazo,
      })
      .eq('id', config.id)

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Sucesso', description: 'Configurações de Markup atualizadas.' })
    }
  }

  const exportPdf = async (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    try {
      const { data, error } = await supabase.functions.invoke('export-pdf-document', {
        body: { orcamento_id: id, format: 'analytic' },
      })
      if (error) throw error

      const linkSource = `data:application/pdf;base64,${data.pdfBase64}`
      const downloadLink = document.createElement('a')
      downloadLink.href = linkSource
      downloadLink.download = `orcamento-${id}.pdf`
      downloadLink.click()
    } catch (e: any) {
      toast({ title: 'Erro ao gerar PDF', description: e.message, variant: 'destructive' })
    }
  }

  const filtered = orcamentos.filter(
    (o) =>
      o.nome?.toLowerCase().includes(search.toLowerCase()) ||
      o.cliente?.nome?.toLowerCase().includes(search.toLowerCase()) ||
      o.cliente_nome_manual?.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Orçamentos de Engenharia</h1>
          <p className="text-gray-500 mt-1">Gerencie projetos, orçamentos e markups globais.</p>
        </div>
        <Link to="/orcamentos/novo">
          <Button className="w-full md:w-auto">
            <Plus className="w-4 h-4 mr-2" /> Novo Orçamento
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="lista" className="w-full">
        <TabsList className="bg-white border shadow-sm">
          <TabsTrigger value="lista" className="data-[state=active]:bg-gray-100">
            <FileText className="w-4 h-4 mr-2" /> Lista de Orçamentos
          </TabsTrigger>
          <TabsTrigger value="config" className="data-[state=active]:bg-gray-100">
            <Settings className="w-4 h-4 mr-2" /> Configurações de Markup
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lista" className="space-y-4 pt-4 mt-0">
          <Card>
            <CardContent className="p-4">
              <div className="relative mb-6">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <Input
                  placeholder="Buscar orçamentos por nome ou cliente..."
                  className="pl-9 bg-gray-50 border-gray-200 focus-visible:ring-gray-300"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filtered.map((orc) => (
                  <div
                    key={orc.id}
                    className="p-4 border rounded-xl hover:border-primary/50 transition-colors bg-white shadow-sm flex flex-col justify-between group"
                  >
                    <Link to={`/orcamentos/${orc.id}`} className="block flex-1">
                      <h3 className="font-semibold text-lg truncate text-gray-900">{orc.nome}</h3>
                      <p className="text-sm text-gray-600 truncate mt-1">
                        Cliente: {orc.cliente?.nome || orc.cliente_nome_manual || 'Não informado'}
                      </p>
                      <div className="mt-4 flex items-center justify-between text-sm">
                        <span className="bg-gray-100 px-2 py-1 rounded-md text-gray-600 font-medium">
                          {orc.status}
                        </span>
                        <span className="text-gray-500">
                          {new Date(orc.criado_em).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </Link>
                    <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => exportPdf(orc.id, e)}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        <Download className="w-4 h-4 mr-2" /> Exportar PDF
                      </Button>
                    </div>
                  </div>
                ))}
                {filtered.length === 0 && (
                  <div className="col-span-full py-12 text-center text-gray-500 border-2 border-dashed rounded-xl bg-gray-50/50">
                    Nenhum orçamento encontrado.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="pt-4 mt-0">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Markups Globais</CardTitle>
              <p className="text-sm text-gray-500">
                Estes divisores serão aplicados em todos os orçamentos que utilizam as modalidades
                correspondentes (À Vista ou A Prazo).
              </p>
            </CardHeader>
            <CardContent>
              {config ? (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-base">Markup Divisor (À Vista)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={config.markup_vista}
                      onChange={(e) =>
                        setConfig({ ...config, markup_vista: parseFloat(e.target.value) })
                      }
                      className="text-lg bg-gray-50"
                    />
                    <p className="text-xs text-gray-500">Valor padrão sugerido: 0.40</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-base">Markup Divisor (A Prazo)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={config.markup_prazo}
                      onChange={(e) =>
                        setConfig({ ...config, markup_prazo: parseFloat(e.target.value) })
                      }
                      className="text-lg bg-gray-50"
                    />
                    <p className="text-xs text-gray-500">Valor padrão sugerido: 0.35</p>
                  </div>
                  <Button onClick={saveConfig} className="w-full" size="lg">
                    Salvar Configurações
                  </Button>
                </div>
              ) : (
                <div className="py-8 text-center text-gray-500">Carregando configurações...</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
