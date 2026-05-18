import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Trash2, Plus } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

export function OrcamentoInterno({
  orcamento,
  onUpdate,
}: {
  orcamento: any
  onUpdate: (o: any) => void
}) {
  const [ambientes, setAmbientes] = useState<any[]>([])
  const [markupGlobal, setMarkupGlobal] = useState(orcamento.markup_global || 2.5)
  const { toast } = useToast()

  const loadData = async () => {
    const { data } = await supabase
      .from('orcamentos_ambientes')
      .select('*, itens:orcamentos_itens(*)')
      .eq('orcamento_id', orcamento.id)
      .order('criado_em')
    setAmbientes(data || [])
  }

  useEffect(() => {
    loadData()
  }, [orcamento.id])

  const applyMarkupGlobal = async () => {
    await supabase
      .from('orcamentos_engenharia')
      .update({ markup_global: markupGlobal })
      .eq('id', orcamento.id)
    onUpdate({ ...orcamento, markup_global: markupGlobal })

    for (const amb of ambientes) {
      const itensToUpdate = amb.itens.filter((i: any) => !i.markup_manual).map((i: any) => i.id)
      if (itensToUpdate.length > 0) {
        await supabase
          .from('orcamentos_itens')
          .update({ markup: markupGlobal })
          .in('id', itensToUpdate)
      }
    }
    toast({ title: 'Markup Global Aplicado' })
    loadData()
  }

  const updateItem = async (itemId: string, field: string, value: any) => {
    const isMarkup = field === 'markup'
    await supabase
      .from('orcamentos_itens')
      .update({
        [field]: value,
        ...(isMarkup ? { markup_manual: true } : {}),
      })
      .eq('id', itemId)
    loadData()
  }

  const deleteItem = async (itemId: string) => {
    await supabase.from('orcamentos_itens').delete().eq('id', itemId)
    loadData()
  }

  const addAmbiente = async () => {
    await supabase
      .from('orcamentos_ambientes')
      .insert({ orcamento_id: orcamento.id, nome: 'Novo Ambiente' })
    loadData()
  }

  const addItemManual = async (ambId: string) => {
    await supabase.from('orcamentos_itens').insert({
      ambiente_id: ambId,
      nome_item: 'Novo Item Avulso',
      quantidade: 1,
      custo_unitario: 0,
      markup: markupGlobal,
    })
    loadData()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end gap-4 bg-background p-4 border rounded-xl shadow-sm">
        <div className="space-y-1">
          <label className="text-sm font-medium">Markup Global do Projeto</label>
          <Input
            type="number"
            step="0.1"
            value={markupGlobal}
            onChange={(e) => setMarkupGlobal(Number(e.target.value))}
            className="w-32"
          />
        </div>
        <Button onClick={applyMarkupGlobal}>Aplicar a Todo o Projeto</Button>
      </div>

      {ambientes.map((amb) => {
        const subCusto = amb.itens.reduce(
          (acc: number, i: any) => acc + i.quantidade * i.custo_unitario,
          0,
        )
        const subFinal = amb.itens.reduce(
          (acc: number, i: any) => acc + i.quantidade * i.custo_unitario * i.markup,
          0,
        )

        return (
          <div key={amb.id} className="bg-background border rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 bg-accent/30 border-b flex justify-between items-center">
              <h3 className="font-bold text-lg">{amb.nome}</h3>
              <Button size="sm" variant="outline" onClick={() => addItemManual(amb.id)}>
                <Plus className="w-4 h-4 mr-1" /> Adicionar Item Manual
              </Button>
            </div>
            <div className="p-0 overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-3">Item</th>
                    <th className="p-3 w-20">Qtd</th>
                    <th className="p-3 w-20">Un.</th>
                    <th className="p-3 w-32">Custo Un.</th>
                    <th className="p-3 w-32">Total Custo</th>
                    <th className="p-3 w-24">Markup</th>
                    <th className="p-3 w-32">Valor Cliente</th>
                    <th className="p-3 w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {amb.itens.map((i: any) => (
                    <tr key={i.id} className="hover:bg-accent/10 transition-colors">
                      <td className="p-3">
                        <Input
                          value={i.nome_item}
                          onChange={(e) => updateItem(i.id, 'nome_item', e.target.value)}
                          className="h-8 border-transparent hover:border-input focus:border-input bg-transparent"
                        />
                      </td>
                      <td className="p-3">
                        <Input
                          type="number"
                          value={i.quantidade}
                          onChange={(e) => updateItem(i.id, 'quantidade', Number(e.target.value))}
                          className="h-8"
                        />
                      </td>
                      <td className="p-3">
                        <Input
                          value={i.unidade_medida}
                          onChange={(e) => updateItem(i.id, 'unidade_medida', e.target.value)}
                          className="h-8"
                        />
                      </td>
                      <td className="p-3">
                        <Input
                          type="number"
                          value={i.custo_unitario}
                          onChange={(e) =>
                            updateItem(i.id, 'custo_unitario', Number(e.target.value))
                          }
                          className="h-8"
                        />
                      </td>
                      <td className="p-3 font-medium text-muted-foreground">
                        {formatCurrency(i.quantidade * i.custo_unitario)}
                      </td>
                      <td className="p-3">
                        <Input
                          type="number"
                          step="0.1"
                          value={i.markup}
                          onChange={(e) => updateItem(i.id, 'markup', Number(e.target.value))}
                          className={`h-8 ${i.markup_manual ? 'border-amber-500/50 bg-amber-500/10' : ''}`}
                        />
                      </td>
                      <td className="p-3 font-bold text-primary">
                        {formatCurrency(i.quantidade * i.custo_unitario * i.markup)}
                      </td>
                      <td className="p-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => deleteItem(i.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {amb.itens.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-muted-foreground">
                        Nenhum item neste ambiente.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-muted/30 font-medium border-t">
                  <tr>
                    <td colSpan={4} className="p-3 text-right">
                      SUBTOTAL:
                    </td>
                    <td className="p-3 text-muted-foreground">{formatCurrency(subCusto)}</td>
                    <td></td>
                    <td className="p-3 text-primary text-lg">{formatCurrency(subFinal)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )
      })}
      <Button onClick={addAmbiente} variant="outline" className="w-full py-6 border-dashed">
        <Plus className="w-4 h-4 mr-2" /> Novo Ambiente
      </Button>
    </div>
  )
}
