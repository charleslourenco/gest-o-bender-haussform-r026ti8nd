import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { ArrowLeft, Save, Plus, Trash2, Check, ChevronsUpDown } from 'lucide-react'
import { OcrUploadZone } from '@/components/OcrUploadZone'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { cn } from '@/lib/utils'

export default function OrcamentosEngenhariaDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [nome, setNome] = useState('')
  const [clienteId, setClienteId] = useState<string | null>(null)
  const [clienteNomeManual, setClienteNomeManual] = useState('')
  const [status, setStatus] = useState('Rascunho')
  const [desconto, setDesconto] = useState(0)
  const [markupGlobal, setMarkupGlobal] = useState(2.5)
  const [ambientes, setAmbientes] = useState<any[]>([])

  const [clientes, setClientes] = useState<any[]>([])
  const [openCliente, setOpenCliente] = useState(false)
  const [searchCliente, setSearchCliente] = useState('')

  useEffect(() => {
    supabase
      .from('clientes')
      .select('id, nome')
      .order('nome')
      .then(({ data }) => setClientes(data || []))
  }, [])

  useEffect(() => {
    if (id === 'novo') return
    const fetchOrcamento = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('orcamentos_engenharia')
        .select('*')
        .eq('id', id)
        .single()
      if (error || !data) {
        toast.error('Orçamento não encontrado')
        navigate('/orcamentos')
        return
      }
      setNome(data.nome)
      setClienteId(data.cliente_id)
      setClienteNomeManual(data.cliente_nome_manual || '')
      setStatus(data.status)
      setDesconto(data.desconto || 0)
      setMarkupGlobal(data.markup_global || 2.5)

      const { data: ambData } = await supabase
        .from('orcamentos_ambientes')
        .select('*, orcamentos_itens(*)')
        .eq('orcamento_id', id)
      if (ambData) {
        setAmbientes(
          ambData.map((a) => ({
            id: a.id,
            nome: a.nome,
            itens: a.orcamentos_itens.map((i: any) => ({ ...i, id: i.id })),
          })),
        )
      }
      setLoading(false)
    }
    fetchOrcamento()
  }, [id, navigate])

  const handleSave = async () => {
    if (!nome) return toast.error('Preencha o nome do projeto')
    setSaving(true)
    try {
      let orcId = id
      const payload = {
        nome,
        cliente_id: clienteId,
        cliente_nome_manual: clienteNomeManual,
        status,
        desconto,
        markup_global: markupGlobal,
      }
      if (id === 'novo') {
        const { data, error } = await supabase
          .from('orcamentos_engenharia')
          .insert(payload)
          .select()
          .single()
        if (error) throw error
        orcId = data.id
      } else {
        const { error } = await supabase.from('orcamentos_engenharia').update(payload).eq('id', id)
        if (error) throw error
        await supabase.from('orcamentos_ambientes').delete().eq('orcamento_id', orcId)
      }
      for (const amb of ambientes) {
        const { data: ambRes, error: ambErr } = await supabase
          .from('orcamentos_ambientes')
          .insert({ orcamento_id: orcId, nome: amb.nome })
          .select()
          .single()
        if (ambErr) throw ambErr
        if (amb.itens?.length > 0) {
          const itensPayload = amb.itens.map((i: any) => ({
            ambiente_id: ambRes.id,
            nome_item: i.nome_item,
            quantidade: i.quantidade,
            unidade_medida: i.unidade_medida || 'un',
            custo_unitario: i.custo_unitario,
            markup: i.markup || markupGlobal,
          }))
          await supabase.from('orcamentos_itens').insert(itensPayload)
        }
      }
      toast.success('Orçamento salvo!')
      if (id === 'novo') navigate(`/orcamentos/${orcId}`)
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const addAmbiente = () =>
    setAmbientes([...ambientes, { id: crypto.randomUUID(), nome: 'Novo Ambiente', itens: [] }])
  const removeAmbiente = (ambId: string) => setAmbientes(ambientes.filter((a) => a.id !== ambId))
  const addItem = (ambId: string) =>
    setAmbientes(
      ambientes.map((a) =>
        a.id === ambId
          ? {
              ...a,
              itens: [
                ...a.itens,
                {
                  id: crypto.randomUUID(),
                  nome_item: 'Novo Item',
                  quantidade: 1,
                  custo_unitario: 0,
                  markup: markupGlobal,
                },
              ],
            }
          : a,
      ),
    )
  const updateItem = (ambId: string, itemId: string, field: string, val: any) =>
    setAmbientes(
      ambientes.map((a) =>
        a.id === ambId
          ? { ...a, itens: a.itens.map((i: any) => (i.id === itemId ? { ...i, [field]: val } : i)) }
          : a,
      ),
    )
  const removeItem = (ambId: string, itemId: string) =>
    setAmbientes(
      ambientes.map((a) =>
        a.id === ambId ? { ...a, itens: a.itens.filter((i: any) => i.id !== itemId) } : a,
      ),
    )

  const handleOcrSuccess = (data: any) => {
    if (data.cliente && !clienteId && !clienteNomeManual) setClienteNomeManual(data.cliente)
    if (data.ambiente || data.itens?.length > 0) {
      setAmbientes([
        ...ambientes,
        {
          id: crypto.randomUUID(),
          nome: data.ambiente || 'Ambiente Extraído',
          itens: (data.itens || []).map((i: any) => ({
            id: crypto.randomUUID(),
            nome_item: i.nome_item || 'Item',
            quantidade: i.quantidade || 1,
            custo_unitario: i.custo_unitario || 0,
            unidade_medida: 'un',
            markup: markupGlobal,
          })),
        },
      ])
    }
  }

  const selectedClienteName = useMemo(
    () => (clienteId ? clientes.find((x) => x.id === clienteId)?.nome : clienteNomeManual),
    [clienteId, clienteNomeManual, clientes],
  )

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando...</div>

  const calcNetSales = () =>
    ambientes.reduce(
      (acc, amb) =>
        acc +
        amb.itens.reduce(
          (iAcc: number, i: any) =>
            iAcc + i.custo_unitario * i.quantidade * (i.markup || markupGlobal),
          0,
        ),
      0,
    ) - desconto
  const calcCosts = () =>
    ambientes.reduce(
      (acc, amb) =>
        acc + amb.itens.reduce((iAcc: number, i: any) => iAcc + i.custo_unitario * i.quantidade, 0),
      0,
    )

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/orcamentos')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          {id === 'novo' ? 'Novo Orçamento' : 'Editar Orçamento'}
        </h1>
        <Button onClick={handleSave} disabled={saving} className="ml-auto">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold border-b pb-2">Informações Gerais</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do Projeto</Label>
                <Input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Móveis Cozinha AP 201"
                />
              </div>
              <div className="space-y-2 flex flex-col">
                <Label>Cliente</Label>
                <Popover open={openCliente} onOpenChange={setOpenCliente}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openCliente}
                      className={cn(
                        'w-full justify-between',
                        !selectedClienteName && 'text-muted-foreground',
                      )}
                    >
                      {selectedClienteName || 'Selecione ou digite...'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" align="start">
                    <Command>
                      <CommandInput
                        placeholder="Buscar cliente..."
                        value={searchCliente}
                        onValueChange={setSearchCliente}
                      />
                      <CommandList>
                        <CommandEmpty>
                          <Button
                            variant="ghost"
                            className="w-full justify-start font-normal px-2 py-1.5 h-auto"
                            onClick={() => {
                              setClienteId(null)
                              setClienteNomeManual(searchCliente)
                              setOpenCliente(false)
                              setSearchCliente('')
                            }}
                          >
                            Usar texto livre: "{searchCliente}"
                          </Button>
                        </CommandEmpty>
                        <CommandGroup>
                          {clientes.map((c) => (
                            <CommandItem
                              key={c.id}
                              value={c.nome}
                              onSelect={() => {
                                setClienteId(c.id)
                                setClienteNomeManual('')
                                setOpenCliente(false)
                                setSearchCliente('')
                              }}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  clienteId === c.id ? 'opacity-100' : 'opacity-0',
                                )}
                              />
                              {c.nome}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="Rascunho">Rascunho</option>
                  <option value="Enviado">Enviado</option>
                  <option value="Aprovado">Aprovado</option>
                  <option value="Rejeitado">Rejeitado</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Markup Global</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={markupGlobal}
                  onChange={(e) => setMarkupGlobal(Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h2 className="text-lg font-semibold">Ambientes e Itens</h2>
              <Button size="sm" variant="outline" onClick={addAmbiente}>
                <Plus className="h-4 w-4 mr-2" /> Ambiente
              </Button>
            </div>
            {ambientes.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Nenhum ambiente adicionado.</p>
            ) : (
              <div className="space-y-6">
                {ambientes.map((amb) => (
                  <div key={amb.id} className="border rounded-lg p-4 bg-gray-50 space-y-4">
                    <div className="flex gap-4 items-center">
                      <Input
                        value={amb.nome}
                        onChange={(e) =>
                          setAmbientes(
                            ambientes.map((x) =>
                              x.id === amb.id ? { ...x, nome: e.target.value } : x,
                            ),
                          )
                        }
                        className="font-semibold bg-white"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeAmbiente(amb.id)}
                        className="text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {amb.itens.map((item: any) => (
                        <div
                          key={item.id}
                          className="flex flex-col sm:flex-row gap-2 items-center bg-white p-2 rounded border"
                        >
                          <Input
                            placeholder="Nome"
                            value={item.nome_item}
                            onChange={(e) =>
                              updateItem(amb.id, item.id, 'nome_item', e.target.value)
                            }
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            placeholder="Qtd"
                            value={item.quantidade}
                            onChange={(e) =>
                              updateItem(amb.id, item.id, 'quantidade', Number(e.target.value))
                            }
                            className="w-20"
                          />
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Custo"
                            value={item.custo_unitario}
                            onChange={(e) =>
                              updateItem(amb.id, item.id, 'custo_unitario', Number(e.target.value))
                            }
                            className="w-32"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(amb.id, item.id)}
                            className="text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => addItem(amb.id)}
                        className="text-emerald-600"
                      >
                        <Plus className="h-4 w-4 mr-2" /> Item
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold border-b pb-2">Assistente OCR</h2>
            <OcrUploadZone onSuccess={handleOcrSuccess} />
          </div>
          <div className="bg-gray-900 p-6 rounded-xl shadow-sm space-y-4 text-white">
            <h2 className="text-lg font-semibold border-b border-gray-700 pb-2">Resumo</h2>
            <div className="space-y-2">
              <div className="flex justify-between text-gray-300">
                <span>Custo Total:</span>
                <span>R$ {calcCosts().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Desconto:</span>
                <span>R$ {desconto.toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t border-gray-700 flex justify-between font-bold text-lg text-emerald-400">
                <span>Venda Líquida:</span>
                <span>R$ {calcNetSales().toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
