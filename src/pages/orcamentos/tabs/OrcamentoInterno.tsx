import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { AmbienteTable } from '../components/AmbienteTable'
import { AddItemSheet } from '../components/AddItemSheet'

export function OrcamentoInterno({
  orcamento,
  onUpdate,
}: {
  orcamento: any
  onUpdate: (o: any) => void
}) {
  const [ambientes, setAmbientes] = useState<any[]>([])
  const [markupGlobal, setMarkupGlobal] = useState(orcamento.markup_global || 2.5)
  const [addModalAmbienteId, setAddModalAmbienteId] = useState<string | null>(null)
  const { toast } = useToast()

  const loadData = async () => {
    const { data } = await supabase
      .from('orcamentos_ambientes')
      .select('*, itens:orcamentos_itens(*)')
      .eq('orcamento_id', orcamento.id)
      .order('criado_em')

    if (data) {
      data.forEach((a) => {
        a.itens.sort(
          (x: any, y: any) => new Date(x.criado_em).getTime() - new Date(y.criado_em).getTime(),
        )
      })
      setAmbientes(data)
    }
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

    const ambIds = ambientes.map((a) => a.id)
    if (ambIds.length > 0) {
      await supabase
        .from('orcamentos_itens')
        .update({ markup: markupGlobal, markup_manual: false })
        .in('ambiente_id', ambIds)
    }
    toast({ title: 'Markup Aplicado', description: 'Todos os itens foram atualizados.' })
    loadData()
  }

  const updateItem = async (itemId: string, field: string, value: any) => {
    const isMarkup = field === 'markup'

    // Otimista
    setAmbientes((prev) =>
      prev.map((a) => ({
        ...a,
        itens: a.itens.map((i: any) =>
          i.id === itemId
            ? { ...i, [field]: value, ...(isMarkup ? { markup_manual: true } : {}) }
            : i,
        ),
      })),
    )

    await supabase
      .from('orcamentos_itens')
      .update({
        [field]: value,
        ...(isMarkup ? { markup_manual: true } : {}),
      })
      .eq('id', itemId)
  }

  const deleteItem = async (itemId: string) => {
    await supabase.from('orcamentos_itens').delete().eq('id', itemId)
    loadData()
  }

  const updateAmbiente = async (id: string, field: string, value: string) => {
    setAmbientes((prev) => prev.map((a) => (a.id === id ? { ...a, [field]: value } : a)))
    await supabase
      .from('orcamentos_ambientes')
      .update({ [field]: value })
      .eq('id', id)
  }

  const addAmbiente = async () => {
    await supabase
      .from('orcamentos_ambientes')
      .insert({ orcamento_id: orcamento.id, nome: 'Novo Ambiente' })
    loadData()
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex items-center justify-between gap-4 bg-background p-6 border rounded-xl shadow-sm">
        <div className="space-y-1">
          <h2 className="text-lg font-bold">Controle Financeiro Interno</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie os custos reais e a margem de lucro por ambiente.
          </p>
        </div>
        <div className="bg-accent/30 p-4 rounded-lg border flex flex-col gap-2">
          <label className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Markup Geral do Projeto
          </label>
          <div className="flex gap-3">
            <Input
              type="number"
              step="0.1"
              value={markupGlobal}
              onChange={(e) => setMarkupGlobal(Number(e.target.value))}
              className="w-24 font-bold text-lg text-center"
            />
            <Button onClick={applyMarkupGlobal} className="bg-primary text-primary-foreground">
              Aplicar a Todo o Projeto
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {ambientes.map((amb) => (
          <AmbienteTable
            key={amb.id}
            amb={amb}
            onUpdateItem={updateItem}
            onDeleteItem={deleteItem}
            onAddItem={setAddModalAmbienteId}
            onUpdateAmbiente={updateAmbiente}
          />
        ))}
      </div>

      <Button
        onClick={addAmbiente}
        variant="outline"
        className="w-full py-8 border-dashed border-2 text-muted-foreground hover:text-primary transition-colors text-lg"
      >
        <Plus className="w-6 h-6 mr-2" /> Adicionar Novo Ambiente
      </Button>

      <AddItemSheet
        ambienteId={addModalAmbienteId}
        markupGlobal={markupGlobal}
        onClose={() => setAddModalAmbienteId(null)}
        onSuccess={loadData}
      />
    </div>
  )
}
