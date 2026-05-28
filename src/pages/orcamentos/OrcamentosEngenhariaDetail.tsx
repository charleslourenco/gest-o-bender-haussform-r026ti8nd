import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function OrcamentosEngenhariaDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [clients, setClients] = useState<any[]>([])

  const [openClient, setOpenClient] = useState(false)
  const [clientSearch, setClientSearch] = useState('')

  const [ambientes, setAmbientes] = useState<any[]>([])

  const [orcamento, setOrcamento] = useState({
    nome: '',
    cliente_id: null as string | null,
    cliente_nome_manual: null as string | null,
    modo_pagamento: 'vista',
    status: 'Rascunho',
    desconto: 0,
  })

  useEffect(() => {
    fetchData()
  }, [id])

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data: clientesData } = await supabase
        .from('clientes')
        .select('id, nome')
        .order('nome')
      if (clientesData) setClients(clientesData)

      if (id && id !== 'novo') {
        const { data, error } = await supabase
          .from('orcamentos_engenharia')
          .select('*')
          .eq('id', id)
          .single()

        if (error) throw error
        if (data) {
          setOrcamento({
            nome: data.nome || '',
            cliente_id: data.cliente_id,
            cliente_nome_manual: data.cliente_nome_manual,
            modo_pagamento: data.modo_pagamento || 'vista',
            status: data.status || 'Rascunho',
            desconto: data.desconto || 0,
          })
          if (data.cliente_nome_manual) {
            setClientSearch(data.cliente_nome_manual)
          } else if (data.cliente_id) {
            const c = clientesData?.find((x) => x.id === data.cliente_id)
            if (c) setClientSearch(c.nome)
          }
        }

        const { data: ambData } = await supabase
          .from('orcamentos_ambientes')
          .select('*, itens:orcamentos_itens(*)')
          .eq('orcamento_id', id)
          .order('criado_em', { ascending: true })

        if (ambData) setAmbientes(ambData)
      }
    } catch (e: any) {
      toast({ title: 'Erro ao carregar', description: e.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!orcamento.nome) {
      toast({ title: 'Aviso', description: 'Preencha o nome do projeto', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      const payload = {
        nome: orcamento.nome,
        cliente_id: orcamento.cliente_id,
        cliente_nome_manual: orcamento.cliente_nome_manual,
        modo_pagamento: orcamento.modo_pagamento,
        modo_preco: orcamento.modo_pagamento, // mantendo sincronizado
        status: orcamento.status,
        desconto: orcamento.desconto,
      }

      if (id && id !== 'novo') {
        const { error } = await supabase.from('orcamentos_engenharia').update(payload).eq('id', id)
        if (error) throw error
        toast({ title: 'Sucesso', description: 'Orçamento atualizado!' })
      } else {
        const { data, error } = await supabase
          .from('orcamentos_engenharia')
          .insert([payload])
          .select()
          .single()
        if (error) throw error
        toast({ title: 'Sucesso', description: 'Orçamento criado!' })
        navigate(`/orcamentos/${data.id}`)
      }
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const addAmbiente = async () => {
    const nome = window.prompt('Nome do Ambiente:')
    if (!nome || !id || id === 'novo') return
    const { data, error } = await supabase
      .from('orcamentos_ambientes')
      .insert({ orcamento_id: id, nome })
      .select()
      .single()
    if (!error && data) {
      setAmbientes([...ambientes, { ...data, itens: [] }])
    }
  }

  const deleteAmbiente = async (ambId: string) => {
    if (!window.confirm('Tem certeza?')) return
    await supabase.from('orcamentos_ambientes').delete().eq('id', ambId)
    setAmbientes(ambientes.filter((a) => a.id !== ambId))
  }

  const addItem = async (ambienteId: string) => {
    const nome = window.prompt('Nome do Item:')
    if (!nome) return
    const { data, error } = await supabase
      .from('orcamentos_itens')
      .insert({
        ambiente_id: ambienteId,
        nome_item: nome,
        quantidade: 1,
        custo_unitario: 0,
        unidade_medida: 'un',
        markup_manual: false,
      })
      .select()
      .single()

    if (!error && data) {
      setAmbientes(
        ambientes.map((a) =>
          a.id === ambienteId ? { ...a, itens: [...(a.itens || []), data] } : a,
        ),
      )
    }
  }

  const updateItem = async (ambienteId: string, itemId: string, field: string, value: any) => {
    await supabase
      .from('orcamentos_itens')
      .update({ [field]: value })
      .eq('id', itemId)
    setAmbientes(
      ambientes.map((a) => {
        if (a.id === ambienteId) {
          return {
            ...a,
            itens: a.itens.map((i: any) => (i.id === itemId ? { ...i, [field]: value } : i)),
          }
        }
        return a
      }),
    )
  }

  const deleteItem = async (ambienteId: string, itemId: string) => {
    await supabase.from('orcamentos_itens').delete().eq('id', itemId)
    setAmbientes(
      ambientes.map((a) => {
        if (a.id === ambienteId) {
          return { ...a, itens: a.itens.filter((i: any) => i.id !== itemId) }
        }
        return a
      }),
    )
  }

  const getClientDisplay = () => {
    if (orcamento.cliente_id) {
      const c = clients.find((x) => x.id === orcamento.cliente_id)
      return c ? c.nome : 'Cliente Desconhecido'
    }
    if (orcamento.cliente_nome_manual) {
      return orcamento.cliente_nome_manual
    }
    return 'Selecione ou digite um cliente...'
  }

  if (loading) return <div className="p-6 text-center text-gray-500">Carregando...</div>

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/orcamentos')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {id === 'novo' ? 'Novo Orçamento' : 'Editar Orçamento'}
            </h1>
            <p className="text-gray-500 mt-1">Detalhes do projeto e precificação</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} size="lg">
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Salvando...' : 'Salvar Orçamento'}
        </Button>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Informações Principais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Nome do Projeto / Orçamento</Label>
              <Input
                value={orcamento.nome}
                onChange={(e) => setOrcamento({ ...orcamento, nome: e.target.value })}
                placeholder="Ex: Cozinha Planejada Silva"
                className="h-11 bg-gray-50"
              />
            </div>

            <div className="space-y-2 flex flex-col">
              <Label className="text-sm font-semibold">Cliente</Label>
              <Popover open={openClient} onOpenChange={setOpenClient}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openClient}
                    className="w-full justify-between font-normal h-11 bg-gray-50 hover:bg-gray-100"
                  >
                    <span className="truncate">{getClientDisplay()}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Buscar ou adicionar cliente..."
                      value={clientSearch}
                      onValueChange={setClientSearch}
                    />
                    <CommandList>
                      <CommandEmpty>
                        <Button
                          variant="ghost"
                          className="w-full justify-start font-normal rounded-none h-12 text-primary hover:text-primary hover:bg-primary/10"
                          onClick={() => {
                            setOrcamento({
                              ...orcamento,
                              cliente_id: null,
                              cliente_nome_manual: clientSearch,
                            })
                            setOpenClient(false)
                          }}
                        >
                          <Plus className="w-4 h-4 mr-2" /> Adicionar "{clientSearch}"
                        </Button>
                      </CommandEmpty>
                      <CommandGroup>
                        {clients.map((c) => (
                          <CommandItem
                            key={c.id}
                            onSelect={() => {
                              setOrcamento({
                                ...orcamento,
                                cliente_id: c.id,
                                cliente_nome_manual: null,
                              })
                              setClientSearch('')
                              setOpenClient(false)
                            }}
                          >
                            {c.nome}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-3 md:col-span-2 bg-gray-50/50 p-5 rounded-xl border border-gray-100">
              <Label className="text-sm font-semibold">
                Modo de Preço (Baseado na Configuração Global)
              </Label>
              <ToggleGroup
                type="single"
                value={orcamento.modo_pagamento}
                onValueChange={(v) => {
                  if (v) setOrcamento({ ...orcamento, modo_pagamento: v })
                }}
                className="justify-start bg-gray-200/50 p-1.5 rounded-lg w-fit"
              >
                <ToggleGroupItem
                  value="vista"
                  className="data-[state=on]:bg-white data-[state=on]:shadow-sm px-8 py-2 font-medium"
                >
                  À Vista
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="prazo"
                  className="data-[state=on]:bg-white data-[state=on]:shadow-sm px-8 py-2 font-medium"
                >
                  A Prazo
                </ToggleGroupItem>
              </ToggleGroup>
              <p className="text-xs text-gray-500">
                A tabela de markup utilizada será definida de acordo com o modo selecionado acima.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Desconto Final (R$)</Label>
              <Input
                type="number"
                value={orcamento.desconto}
                onChange={(e) =>
                  setOrcamento({ ...orcamento, desconto: parseFloat(e.target.value) || 0 })
                }
                className="h-11 bg-gray-50"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Status do Orçamento</Label>
              <select
                className="flex h-11 w-full rounded-md border border-input bg-gray-50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={orcamento.status}
                onChange={(e) => setOrcamento({ ...orcamento, status: e.target.value })}
              >
                <option value="Rascunho">Rascunho</option>
                <option value="Enviado">Enviado</option>
                <option value="Aprovado">Aprovado</option>
                <option value="Rejeitado">Rejeitado</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {id !== 'novo' && (
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Ambientes e Itens</CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                Gerencie os ambientes e adicione materiais para compor o custo.
              </p>
            </div>
            <Button onClick={addAmbiente} variant="outline" className="bg-white">
              <Plus className="w-4 h-4 mr-2" /> Novo Ambiente
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {ambientes.length === 0 ? (
              <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-12 text-center text-gray-500">
                Nenhum ambiente adicionado ainda.
              </div>
            ) : (
              ambientes.map((amb) => (
                <div
                  key={amb.id}
                  className="border border-gray-200 rounded-xl overflow-hidden shadow-sm"
                >
                  <div className="bg-gray-50 px-4 py-3 border-b flex items-center justify-between">
                    <h3 className="font-bold text-gray-800">{amb.nome}</h3>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="hover:bg-gray-200/50"
                        onClick={() => addItem(amb.id)}
                      >
                        <Plus className="w-4 h-4 mr-2" /> Item
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => deleteAmbiente(amb.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="p-4 space-y-3 bg-white">
                    {amb.itens?.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-2">
                        Nenhum item neste ambiente.
                      </p>
                    ) : (
                      <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-500 mb-2 px-2 uppercase tracking-wider">
                        <div className="col-span-5">Item</div>
                        <div className="col-span-2">Qtd</div>
                        <div className="col-span-2">Un.</div>
                        <div className="col-span-2">Custo Un.</div>
                        <div className="col-span-1"></div>
                      </div>
                    )}
                    {amb.itens?.map((it: any) => (
                      <div
                        key={it.id}
                        className="grid grid-cols-12 gap-2 items-center bg-gray-50/50 p-2 rounded-lg border shadow-sm"
                      >
                        <div className="col-span-5">
                          <Input
                            className="h-9 bg-white"
                            value={it.nome_item}
                            onChange={(e) => updateItem(amb.id, it.id, 'nome_item', e.target.value)}
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            className="h-9 bg-white"
                            type="number"
                            value={it.quantidade}
                            onChange={(e) =>
                              updateItem(amb.id, it.id, 'quantidade', parseFloat(e.target.value))
                            }
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            className="h-9 bg-white"
                            value={it.unidade_medida}
                            onChange={(e) =>
                              updateItem(amb.id, it.id, 'unidade_medida', e.target.value)
                            }
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            className="h-9 bg-white"
                            type="number"
                            value={it.custo_unitario}
                            onChange={(e) =>
                              updateItem(
                                amb.id,
                                it.id,
                                'custo_unitario',
                                parseFloat(e.target.value),
                              )
                            }
                          />
                        </div>
                        <div className="col-span-1 flex justify-end">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-9 w-9 text-red-500 hover:bg-red-50"
                            onClick={() => deleteItem(amb.id, it.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
