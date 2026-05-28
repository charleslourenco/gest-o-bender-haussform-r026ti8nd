import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2, Plus, Calculator, Settings, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Label } from '@/components/ui/label'

export default function OrcamentosEngenhariaList() {
  const navigate = useNavigate()
  const [orcamentos, setOrcamentos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Markup state
  const [markupVista, setMarkupVista] = useState<number>(0.4)
  const [markupPrazo, setMarkupPrazo] = useState<number>(0.35)
  const [savingMarkup, setSavingMarkup] = useState(false)

  useEffect(() => {
    fetchOrcamentos()
    fetchMarkup()
  }, [])

  async function fetchOrcamentos() {
    setLoading(true)
    const { data, error } = await supabase
      .from('orcamentos_engenharia')
      .select('*, cliente:clientes(nome)')
      .order('criado_em', { ascending: false })

    if (error) {
      toast.error('Erro ao buscar orçamentos')
    } else {
      setOrcamentos(data || [])
    }
    setLoading(false)
  }

  async function fetchMarkup() {
    const { data } = await supabase.from('configuracoes_sistema').select('*').limit(1).maybeSingle()
    if (data) {
      setMarkupVista(data.markup_vista)
      setMarkupPrazo(data.markup_prazo)
    }
  }

  async function handleSaveMarkup() {
    setSavingMarkup(true)
    const { data } = await supabase
      .from('configuracoes_sistema')
      .select('id')
      .limit(1)
      .maybeSingle()

    let error
    if (data) {
      const res = await supabase
        .from('configuracoes_sistema')
        .update({
          markup_vista: markupVista,
          markup_prazo: markupPrazo,
          atualizado_em: new Date().toISOString(),
        })
        .eq('id', data.id)
      error = res.error
    } else {
      const res = await supabase.from('configuracoes_sistema').insert({
        markup_vista: markupVista,
        markup_prazo: markupPrazo,
      })
      error = res.error
    }

    if (error) {
      toast.error('Erro ao salvar markups')
    } else {
      toast.success('Markups atualizados com sucesso!')
    }
    setSavingMarkup(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Deseja realmente excluir este orçamento?')) return
    const { error } = await supabase.from('orcamentos_engenharia').delete().eq('id', id)
    if (error) {
      toast.error('Erro ao excluir')
    } else {
      toast.success('Orçamento excluído')
      fetchOrcamentos()
    }
  }

  return (
    <div className="h-full flex flex-col bg-slate-50 p-6 space-y-6 overflow-hidden">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Orçamentos de Engenharia</h1>
          <p className="text-slate-500 text-sm">Gerencie orçamentos e markups globais</p>
        </div>
        <Button onClick={() => navigate('/orcamentos/novo')}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Orçamento
        </Button>
      </div>

      <Tabs defaultValue="lista" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="w-fit">
          <TabsTrigger value="lista" className="flex items-center gap-2">
            <Calculator className="w-4 h-4" />
            Orçamentos
          </TabsTrigger>
          <TabsTrigger value="markup" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Markups Globais
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lista" className="flex-1 overflow-auto mt-4 focus-visible:outline-none">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          ) : orcamentos.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <Calculator className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900">Nenhum orçamento</h3>
              <p className="text-slate-500 mt-1">Crie o seu primeiro orçamento de engenharia.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-10">
              {orcamentos.map((orc) => (
                <Card key={orc.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-base truncate" title={orc.nome}>
                      {orc.nome}
                    </CardTitle>
                    <CardDescription className="truncate">
                      {orc.cliente_nome_manual || orc.cliente?.nome || 'Cliente não informado'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-2 flex items-center justify-between">
                    <div className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                      {orc.status}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => navigate(`/orcamentos/${orc.id}`)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDelete(orc.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent
          value="markup"
          className="flex-1 overflow-auto mt-4 focus-visible:outline-none"
        >
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle>Configuração de Markup</CardTitle>
              <CardDescription>
                Estes valores serão usados como padrão para novos orçamentos calcularem o preço de
                venda com base no custo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Markup Divisor (À Vista)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="1"
                    value={markupVista}
                    onChange={(e) => setMarkupVista(parseFloat(e.target.value))}
                  />
                  <p className="text-xs text-slate-500">
                    Exemplo: 0.40 significa que o preço de venda é Custo / 0.40
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Markup Divisor (A Prazo)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="1"
                    value={markupPrazo}
                    onChange={(e) => setMarkupPrazo(parseFloat(e.target.value))}
                  />
                  <p className="text-xs text-slate-500">
                    Exemplo: 0.35 significa que o preço de venda é Custo / 0.35
                  </p>
                </div>
              </div>
              <Button onClick={handleSaveMarkup} disabled={savingMarkup}>
                {savingMarkup ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Salvar Configurações
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
