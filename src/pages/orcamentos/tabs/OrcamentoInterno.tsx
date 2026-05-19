import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Plus, Copy, Check } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { AmbienteTable } from '../components/AmbienteTable'
import { AddItemSheet } from '../components/AddItemSheet'

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
  const [desconto, setDesconto] = useState(orcamento.desconto || 0)
  const [addModalAmbienteId, setAddModalAmbienteId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
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

  const updateDesconto = async (val: number) => {
    setDesconto(val)
    await supabase.from('orcamentos_engenharia').update({ desconto: val }).eq('id', orcamento.id)
    onUpdate({ ...orcamento, desconto: val })
  }

  const updateItem = async (itemId: string, field: string, value: any) => {
    const isMarkup = field === 'markup'

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

  const copyToClipboard = () => {
    const table = document.getElementById('export-table')
    if (!table) return

    const range = document.createRange()
    range.selectNode(table)
    window.getSelection()?.removeAllRanges()
    window.getSelection()?.addRange(range)

    try {
      document.execCommand('copy')
      setCopied(true)
      toast({
        title: 'Tabela copiada!',
        description: 'Você já pode colar a tabela no seu documento.',
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast({ title: 'Erro ao copiar', variant: 'destructive' })
    }

    window.getSelection()?.removeAllRanges()
  }

  const subtotalFinal = ambientes.reduce((acc, amb) => {
    return (
      acc +
      amb.itens.reduce((sum: number, i: any) => sum + i.quantidade * i.custo_unitario * i.markup, 0)
    )
  }, 0)

  const totalFinal = subtotalFinal - (desconto || 0)

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex items-center justify-between gap-4 bg-background p-6 border rounded-xl shadow-sm">
        <div className="space-y-1">
          <h2 className="text-lg font-bold">Orçamento</h2>
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
              className="w-24 font-bold text-lg text-center bg-background"
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

      <div className="mt-12 bg-card p-6 border rounded-xl shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold font-serif text-foreground">Tabela de Exportação</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Selecione, copie e cole no seu template de proposta final.
            </p>
          </div>
          <Button onClick={copyToClipboard} variant="outline" className="gap-2">
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copiado!' : 'Copiar Tabela'}
          </Button>
        </div>

        <div className="bg-white p-6 border rounded-lg overflow-x-auto">
          <table
            id="export-table"
            className="w-full text-sm border-collapse"
            style={{ color: '#000', fontFamily: 'Arial, sans-serif' }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    borderBottom: '2px solid #ccc',
                    padding: '10px 8px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                  }}
                >
                  Qtd
                </th>
                <th
                  style={{
                    borderBottom: '2px solid #ccc',
                    padding: '10px 8px',
                    textAlign: 'left',
                    fontWeight: 'bold',
                  }}
                >
                  Ambiente
                </th>
                <th
                  style={{
                    borderBottom: '2px solid #ccc',
                    padding: '10px 8px',
                    textAlign: 'left',
                    fontWeight: 'bold',
                  }}
                >
                  Descrição
                </th>
                <th
                  style={{
                    borderBottom: '2px solid #ccc',
                    padding: '10px 8px',
                    textAlign: 'right',
                    fontWeight: 'bold',
                  }}
                >
                  Valor Unitário
                </th>
                <th
                  style={{
                    borderBottom: '2px solid #ccc',
                    padding: '10px 8px',
                    textAlign: 'right',
                    fontWeight: 'bold',
                  }}
                >
                  Valor Total
                </th>
              </tr>
            </thead>
            <tbody>
              {ambientes.map((amb) =>
                amb.itens.map((item: any) => {
                  const vUnit = item.custo_unitario * item.markup
                  const vTot = vUnit * item.quantidade
                  return (
                    <tr key={item.id}>
                      <td
                        style={{
                          borderBottom: '1px solid #eee',
                          padding: '8px',
                          textAlign: 'center',
                        }}
                      >
                        {item.quantidade}
                      </td>
                      <td style={{ borderBottom: '1px solid #eee', padding: '8px' }}>{amb.nome}</td>
                      <td style={{ borderBottom: '1px solid #eee', padding: '8px' }}>
                        {item.nome_item}
                      </td>
                      <td
                        style={{
                          borderBottom: '1px solid #eee',
                          padding: '8px',
                          textAlign: 'right',
                        }}
                      >
                        {formatCurrency(vUnit)}
                      </td>
                      <td
                        style={{
                          borderBottom: '1px solid #eee',
                          padding: '8px',
                          textAlign: 'right',
                        }}
                      >
                        {formatCurrency(vTot)}
                      </td>
                    </tr>
                  )
                }),
              )}
              <tr>
                <td colSpan={3} style={{ border: 'none', padding: '12px 8px' }}></td>
                <td
                  style={{
                    borderBottom: '1px solid #eee',
                    padding: '12px 8px',
                    textAlign: 'right',
                    fontWeight: 'bold',
                  }}
                >
                  Subtotal
                </td>
                <td
                  style={{
                    borderBottom: '1px solid #eee',
                    padding: '12px 8px',
                    textAlign: 'right',
                    fontWeight: 'bold',
                  }}
                >
                  {formatCurrency(subtotalFinal)}
                </td>
              </tr>
              <tr>
                <td
                  colSpan={3}
                  style={{ border: 'none', padding: '12px 8px' }}
                  className="align-middle"
                >
                  <div className="flex items-center text-xs text-muted-foreground print:hidden">
                    <span className="mr-2">Definir desconto (R$):</span>
                    <Input
                      type="number"
                      value={desconto}
                      onChange={(e) => updateDesconto(Number(e.target.value))}
                      className="w-24 h-7 text-right bg-background border-input"
                    />
                  </div>
                </td>
                <td
                  style={{
                    borderBottom: '1px solid #eee',
                    padding: '12px 8px',
                    textAlign: 'right',
                    fontWeight: 'bold',
                  }}
                >
                  Desconto
                </td>
                <td
                  style={{
                    borderBottom: '1px solid #eee',
                    padding: '12px 8px',
                    textAlign: 'right',
                    fontWeight: 'bold',
                    color: '#ef4444',
                  }}
                >
                  - {formatCurrency(desconto)}
                </td>
              </tr>
              <tr>
                <td colSpan={3} style={{ border: 'none', padding: '16px 8px' }}></td>
                <td
                  style={{
                    borderBottom: '2px solid #ccc',
                    padding: '16px 8px',
                    textAlign: 'right',
                    fontWeight: 'bold',
                    fontSize: '1.1em',
                  }}
                >
                  Total Final
                </td>
                <td
                  style={{
                    borderBottom: '2px solid #ccc',
                    padding: '16px 8px',
                    textAlign: 'right',
                    fontWeight: 'bold',
                    fontSize: '1.1em',
                  }}
                >
                  {formatCurrency(totalFinal)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <AddItemSheet
        ambienteId={addModalAmbienteId}
        markupGlobal={markupGlobal}
        onClose={() => setAddModalAmbienteId(null)}
        onSuccess={loadData}
      />
    </div>
  )
}
