import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Download, Plus, Trash2, Save } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export function ListaMateriaisTab({ orcamento }: { orcamento: any }) {
  const [lista, setLista] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    if (orcamento?.id) loadLista()
  }, [orcamento?.id])

  const loadLista = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('listas_materiais')
      .select('*')
      .eq('orcamento_id', orcamento.id)
      .order('criado_em', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (data) {
      setLista(data)
    } else {
      setLista(null)
    }
    setLoading(false)
  }

  const handleCreateEmpty = async () => {
    const { data, error } = await supabase
      .from('listas_materiais')
      .insert({
        orcamento_id: orcamento.id,
        cliente_id: orcamento.cliente_id,
        status: 'pendente',
        itens: [],
      })
      .select()
      .single()

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    } else if (data) {
      setLista(data)
    }
  }

  const updateItem = (index: number, field: string, value: any) => {
    const newItens = [...(lista.itens || [])]
    newItens[index] = { ...newItens[index], [field]: value }
    setLista({ ...lista, itens: newItens })
  }

  const removeItem = (index: number) => {
    const newItens = [...(lista.itens || [])]
    newItens.splice(index, 1)
    setLista({ ...lista, itens: newItens })
  }

  const addItem = () => {
    const newItens = [...(lista.itens || []), { nome: 'Novo Item', qtd: 1, un: 'un', material: '' }]
    setLista({ ...lista, itens: newItens })
  }

  const saveLista = async () => {
    if (!lista) return
    const { error } = await supabase
      .from('listas_materiais')
      .update({ itens: lista.itens })
      .eq('id', lista.id)
    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Lista salva com sucesso' })
    }
  }

  const exportPdf = async () => {
    if (!lista || !lista.itens || lista.itens.length === 0) {
      return toast({ title: 'Lista vazia', variant: 'destructive' })
    }
    toast({ title: 'Gerando PDF...', description: 'Aguarde um momento.' })

    try {
      const rows = lista.itens.map((i: any) => [
        i.nome || '-',
        String(i.qtd || '1'),
        i.unidade_medida || i.un || 'un',
        i.material || '-',
      ])

      const { data, error } = await supabase.functions.invoke('export-pdf-document', {
        body: {
          title: `Lista de Materiais Técnica`,
          subtitle: `Projeto: ${orcamento.nome}`,
          columns: ['Item/Descrição', 'Qtd', 'Unidade', 'Material/Obs'],
          rows,
        },
      })

      if (error) throw error
      if (data?.pdfBase64) {
        const link = document.createElement('a')
        link.href = `data:application/pdf;base64,${data.pdfBase64}`
        link.download = `Lista_Materiais_${orcamento.nome}.pdf`
        link.click()
      }
    } catch (e: any) {
      toast({ title: 'Erro ao gerar PDF', description: e.message, variant: 'destructive' })
    }
  }

  if (loading)
    return <div className="p-8 text-center text-muted-foreground">Carregando lista...</div>

  if (!lista) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <Download className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-bold">Nenhuma lista técnica encontrada</h3>
        <p className="text-muted-foreground max-w-md">
          Você pode usar a inteligência artificial na aba "Upload" para extrair a lista
          automaticamente ou criar uma lista manual do zero.
        </p>
        <Button onClick={handleCreateEmpty}>
          <Plus className="w-4 h-4 mr-2" /> Criar Lista Manual
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex items-center justify-between bg-card p-4 border rounded-xl shadow-sm">
        <div>
          <h2 className="text-lg font-bold">Lista de Materiais Técnica</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie os itens brutos necessários para produção e separação.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={saveLista} variant="outline" className="gap-2 bg-background">
            <Save className="w-4 h-4" /> Salvar
          </Button>
          <Button onClick={exportPdf} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
            <Download className="w-4 h-4" /> Exportar PDF
          </Button>
        </div>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-3 font-bold">Item / Descrição</th>
                <th className="p-3 w-24 text-center font-bold">Qtd</th>
                <th className="p-3 w-24 text-center font-bold">Un.</th>
                <th className="p-3 w-64 font-bold">Material / Obs</th>
                <th className="p-3 w-16 text-center">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(lista.itens || []).map((item: any, idx: number) => (
                <tr key={idx} className="hover:bg-accent/10 transition-colors group">
                  <td className="p-2">
                    <Input
                      value={item.nome}
                      onChange={(e) => updateItem(idx, 'nome', e.target.value)}
                      className="h-9 border-transparent hover:border-input focus:border-input bg-transparent"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      value={item.qtd}
                      onChange={(e) => updateItem(idx, 'qtd', Number(e.target.value))}
                      className="h-9 w-20 px-2 text-center mx-auto bg-transparent border-transparent hover:border-input focus:border-input"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      value={item.unidade_medida || item.un}
                      onChange={(e) => {
                        updateItem(idx, 'un', e.target.value)
                        updateItem(idx, 'unidade_medida', e.target.value)
                      }}
                      className="h-9 w-16 px-2 text-center mx-auto bg-transparent border-transparent hover:border-input focus:border-input"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      value={item.material}
                      onChange={(e) => updateItem(idx, 'material', e.target.value)}
                      className="h-9 border-transparent hover:border-input focus:border-input bg-transparent"
                    />
                  </td>
                  <td className="p-2 text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeItem(idx)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              {(!lista.itens || lista.itens.length === 0) && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    Nenhum item adicionado a esta lista.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t bg-muted/20">
          <Button
            variant="outline"
            size="sm"
            onClick={addItem}
            className="w-full border-dashed bg-background"
          >
            <Plus className="w-4 h-4 mr-2" /> Adicionar Linha Manual
          </Button>
        </div>
      </div>
    </div>
  )
}
