import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { FileText, Save, ArrowLeft, Trash2, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function OrcamentosEngenhariaDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [budget, setBudget] = useState({
    nome: '',
    cliente_id: '',
    status: 'Rascunho',
    modo_preco: 'vista',
  })
  const [ambientes, setAmbientes] = useState<any[]>([])
  const [clientes, setClientes] = useState<any[]>([])
  const [estoque, setEstoque] = useState<any[]>([])
  const [config, setConfig] = useState({ vista: 0.4, prazo: 0.35 })

  useEffect(() => {
    const init = async () => {
      const [cliRes, estRes, confRes] = await Promise.all([
        supabase.from('clientes').select('id, nome'),
        supabase.from('estoque_itens').select('id, nome, valor_unitario, unidade'),
        supabase
          .from('configuracoes_sistema')
          .select('markup_vista, markup_prazo')
          .limit(1)
          .single(),
      ])
      if (cliRes.data) setClientes(cliRes.data)
      if (estRes.data) setEstoque(estRes.data)
      if (confRes.data)
        setConfig({ vista: confRes.data.markup_vista, prazo: confRes.data.markup_prazo })

      if (id && id !== 'novo') {
        const { data: orc } = await supabase
          .from('orcamentos_engenharia')
          .select(`*, ambientes:orcamentos_ambientes(*, itens:orcamentos_itens(*))`)
          .eq('id', id)
          .single()
        if (orc) {
          setBudget({
            nome: orc.nome,
            cliente_id: orc.cliente_id || '',
            status: orc.status,
            modo_preco: (orc as any).modo_preco || 'vista',
          })
          setAmbientes(orc.ambientes || [])
        }
      }
    }
    init()
  }, [id])

  const activeMarkup = budget.modo_preco === 'vista' ? config.vista : config.prazo

  const handleModeChange = (mode: string) => {
    if (!mode) return
    setBudget((prev) => ({ ...prev, modo_preco: mode }))
    const newMarkup = mode === 'vista' ? config.vista : config.prazo
    setAmbientes((prev) =>
      prev.map((amb) => ({
        ...amb,
        itens: amb.itens.map((it: any) => (it.markup_manual ? it : { ...it, markup: newMarkup })),
      })),
    )
  }

  const handleSave = async () => {
    try {
      const orcData = {
        nome: budget.nome,
        cliente_id: budget.cliente_id || null,
        status: budget.status,
        modo_preco: budget.modo_preco,
      } as any

      let orcId = id
      if (id === 'novo') {
        const { data, error } = await supabase
          .from('orcamentos_engenharia')
          .insert(orcData)
          .select('id')
          .single()
        if (error) throw error
        orcId = data.id
      } else {
        const { error } = await supabase.from('orcamentos_engenharia').update(orcData).eq('id', id)
        if (error) throw error
        await supabase.from('orcamentos_ambientes').delete().eq('orcamento_id', id)
      }

      for (const amb of ambientes) {
        const { data: newAmb, error: ambErr } = await supabase
          .from('orcamentos_ambientes')
          .insert({
            orcamento_id: orcId,
            nome: amb.nome,
          })
          .select('id')
          .single()
        if (ambErr) throw ambErr

        const itemsToInsert = amb.itens.map((it: any) => ({
          ambiente_id: newAmb.id,
          nome_item: it.nome_item,
          quantidade: it.quantidade,
          unidade_medida: it.unidade_medida,
          custo_unitario: it.custo_unitario,
          markup: it.markup,
          markup_manual: it.markup_manual,
          item_estoque_id: it.item_estoque_id,
        }))

        if (itemsToInsert.length > 0) await supabase.from('orcamentos_itens').insert(itemsToInsert)
      }

      toast({ title: 'Sucesso', description: 'Orçamento salvo!' })
      if (id === 'novo') navigate(`/orcamentos/${orcId}`)
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    }
  }

  const exportPdf = async (format: string) => {
    if (id === 'novo')
      return toast({ title: 'Aviso', description: 'Salve primeiro para exportar.' })
    toast({ title: 'Gerando PDF...', description: 'Aguarde um instante.' })
    const { data, error } = await supabase.functions.invoke('export-pdf-document', {
      body: { orcamento_id: id, format },
    })
    if (error || !data?.pdfBase64)
      return toast({ title: 'Erro', description: 'Falha ao gerar o PDF.', variant: 'destructive' })

    const link = document.createElement('a')
    link.href = `data:application/pdf;base64,${data.pdfBase64}`
    link.download = `Orcamento_${format}.pdf`
    link.click()
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/orcamentos')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">
            {id === 'novo' ? 'Novo Orçamento' : 'Editar Orçamento'}
          </h1>
        </div>
        <div className="flex gap-2">
          {id !== 'novo' && (
            <>
              <Button variant="outline" onClick={() => exportPdf('analytic')}>
                <FileText className="w-4 h-4 mr-2" /> Analítico
              </Button>
              <Button variant="outline" onClick={() => exportPdf('synthetic')}>
                <FileText className="w-4 h-4 mr-2 text-blue-600" /> Sintético
              </Button>
            </>
          )}
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" /> Salvar
          </Button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input
            placeholder="Nome do Projeto"
            value={budget.nome}
            onChange={(e) => setBudget({ ...budget, nome: e.target.value })}
          />
          <Select
            value={budget.cliente_id}
            onValueChange={(v) => setBudget({ ...budget, cliente_id: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Cliente" />
            </SelectTrigger>
            <SelectContent>
              {clientes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={budget.status} onValueChange={(v) => setBudget({ ...budget, status: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Rascunho">Rascunho</SelectItem>
              <SelectItem value="Enviado">Enviado</SelectItem>
              <SelectItem value="Aprovado">Aprovado</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center justify-end">
            <ToggleGroup type="single" value={budget.modo_preco} onValueChange={handleModeChange}>
              <ToggleGroupItem
                value="vista"
                className="data-[state=on]:bg-midnight-navy data-[state=on]:text-white"
              >
                À Vista
              </ToggleGroupItem>
              <ToggleGroupItem
                value="prazo"
                className="data-[state=on]:bg-midnight-navy data-[state=on]:text-white"
              >
                A Prazo
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      </div>

      {ambientes.map((amb, aIdx) => (
        <AmbienteEditor
          key={amb.id}
          ambiente={amb}
          estoque={estoque}
          globalMarkup={activeMarkup}
          onChange={(newAmb) => {
            const arr = [...ambientes]
            arr[aIdx] = newAmb
            setAmbientes(arr)
          }}
          onDelete={() => setAmbientes(ambientes.filter((_, i) => i !== aIdx))}
        />
      ))}

      <Button
        variant="outline"
        className="w-full border-dashed"
        onClick={() =>
          setAmbientes([
            ...ambientes,
            { id: crypto.randomUUID(), nome: 'Novo Ambiente', itens: [] },
          ])
        }
      >
        <Plus className="w-4 h-4 mr-2" /> Adicionar Novo Ambiente
      </Button>
    </div>
  )
}

function AmbienteEditor({ ambiente, estoque, globalMarkup, onChange, onDelete }: any) {
  const updateItem = (idx: number, field: string, value: any) => {
    const newItens = [...ambiente.itens]
    const item = { ...newItens[idx], [field]: value }
    if (field === 'item_estoque_id' && value) {
      const found = estoque.find((e: any) => e.id === value)
      if (found) {
        item.custo_unitario = found.valor_unitario
        item.nome_item = found.nome
        item.unidade_medida = found.unidade
      }
    }
    if (field === 'markup') item.markup_manual = true
    newItens[idx] = item
    onChange({ ...ambiente, itens: newItens })
  }

  const formatBRL = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0)

  return (
    <div className="border rounded-lg p-4 space-y-4 bg-white shadow-sm">
      <div className="flex justify-between items-center">
        <Input
          value={ambiente.nome}
          onChange={(e) => onChange({ ...ambiente, nome: e.target.value })}
          placeholder="Nome do Ambiente"
          className="max-w-sm font-bold text-lg border-none"
        />
        <Button variant="ghost" size="icon" onClick={onDelete}>
          <Trash2 className="w-4 h-4 text-red-500" />
        </Button>
      </div>
      <div className="space-y-2">
        {ambiente.itens.map((it: any, idx: number) => (
          <div
            key={it.id}
            className={cn(
              'flex flex-wrap gap-2 items-center p-2 rounded',
              (it.markup_manual || !it.item_estoque_id) && 'bg-yellow-50 border border-yellow-200',
            )}
          >
            <Select
              value={it.item_estoque_id || ''}
              onValueChange={(v) => updateItem(idx, 'item_estoque_id', v)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Item do Estoque" />
              </SelectTrigger>
              <SelectContent>
                {estoque.map((e: any) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Descrição"
              value={it.nome_item}
              onChange={(e) => updateItem(idx, 'nome_item', e.target.value)}
              className="flex-1 min-w-[150px]"
            />
            <Input
              type="number"
              className="w-20"
              placeholder="Qtd"
              value={it.quantidade}
              onChange={(e) => updateItem(idx, 'quantidade', parseFloat(e.target.value))}
            />
            <Input
              type="number"
              className="w-24"
              placeholder="Custo"
              value={it.custo_unitario}
              onChange={(e) => updateItem(idx, 'custo_unitario', parseFloat(e.target.value))}
            />
            <Input
              type="number"
              step="0.01"
              className="w-24"
              placeholder="Markup"
              value={it.markup}
              onChange={(e) => updateItem(idx, 'markup', parseFloat(e.target.value))}
              title="Divisor da margem"
            />
            <div className="w-28 font-bold text-right text-sm">
              {formatBRL((it.custo_unitario * it.quantidade) / (it.markup || globalMarkup))}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                onChange({
                  ...ambiente,
                  itens: ambiente.itens.filter((_: any, i: number) => i !== idx),
                })
              }
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </div>
        ))}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          onChange({
            ...ambiente,
            itens: [
              ...ambiente.itens,
              {
                id: crypto.randomUUID(),
                nome_item: '',
                quantidade: 1,
                custo_unitario: 0,
                markup: globalMarkup,
                markup_manual: false,
                item_estoque_id: null,
                unidade_medida: 'un',
              },
            ],
          })
        }
      >
        <Plus className="w-4 h-4 mr-2" /> Adicionar Item
      </Button>
    </div>
  )
}
