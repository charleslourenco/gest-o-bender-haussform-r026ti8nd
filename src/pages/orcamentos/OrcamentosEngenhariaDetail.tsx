import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { OcrUploadZone } from '@/components/OcrUploadZone'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Plus, Trash2, Save, Check, ChevronsUpDown } from 'lucide-react'
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
  const isNew = id === 'novo'

  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [clientes, setClientes] = useState<any[]>([])

  const [nome, setNome] = useState('')
  const [clienteId, setClienteId] = useState<string | null>(null)
  const [clienteNomeManual, setClienteNomeManual] = useState('')
  const [status, setStatus] = useState('Rascunho')

  const [itens, setItens] = useState<any[]>([])
  const [clientSearchOpen, setClientSearchOpen] = useState(false)

  useEffect(() => {
    fetchClientes()
    if (!isNew) {
      loadOrcamento()
    }
  }, [id])

  const fetchClientes = async () => {
    const { data } = await supabase.from('clientes').select('id, nome').order('nome')
    if (data) setClientes(data)
  }

  const loadOrcamento = async () => {
    if (!id || isNew) return
    try {
      setLoading(true)
      const { data: orc, error: orcErr } = await supabase
        .from('orcamentos_engenharia')
        .select('*')
        .eq('id', id)
        .single()

      if (orcErr) throw orcErr

      setNome(orc.nome || '')
      setClienteId(orc.cliente_id)
      setClienteNomeManual(orc.cliente_nome_manual || '')
      setStatus(orc.status || 'Rascunho')

      const { data: amb } = await supabase
        .from('orcamentos_ambientes')
        .select('*')
        .eq('orcamento_id', id)

      if (amb && amb.length > 0) {
        const { data: it } = await supabase
          .from('orcamentos_itens')
          .select('*')
          .in(
            'ambiente_id',
            amb.map((a) => a.id),
          )

        if (it) {
          setItens(
            it.map((i) => ({
              id: i.id,
              nome_item: i.nome_item,
              quantidade: i.quantidade,
              custo_unitario: i.custo_unitario,
              ambiente_id: i.ambiente_id,
            })),
          )
        }
      }
    } catch (error: any) {
      toast.error('Erro ao carregar orçamento: ' + error.message)
      navigate('/orcamentos')
    } finally {
      setLoading(false)
    }
  }

  const handleOcrSuccess = (data: any) => {
    if (data.cliente) {
      setClienteNomeManual(data.cliente)
      setClienteId(null)
    }
    if (data.itens && Array.isArray(data.itens)) {
      setItens((prev) => [
        ...prev,
        ...data.itens.map((i: any) => ({
          id: crypto.randomUUID(),
          nome_item: i.nome_item || i.nome || 'Item Extraído via OCR',
          quantidade: i.quantidade || 1,
          custo_unitario: i.custo_unitario || i.preco_unitario || 0,
        })),
      ])
    }
    toast.success('Documento processado. Itens inseridos!')
  }

  const handleSave = async () => {
    if (!nome) {
      toast.error('O nome do orçamento é obrigatório.')
      return
    }

    try {
      setSaving(true)
      let currentOrcId = id

      const orcData = {
        nome,
        cliente_id: clienteId || null,
        cliente_nome_manual: clienteId ? null : clienteNomeManual,
        status,
        markup_global: 2.5,
        desconto: 0,
        markup_divisor_normal: 0.35,
        markup_divisor_vista: 0.4,
        atualizado_em: new Date().toISOString(),
      }

      if (isNew) {
        const { data, error } = await supabase
          .from('orcamentos_engenharia')
          .insert(orcData)
          .select()
          .single()
        if (error) throw error
        currentOrcId = data.id
      } else {
        const { error } = await supabase
          .from('orcamentos_engenharia')
          .update(orcData)
          .eq('id', currentOrcId)
        if (error) throw error
      }

      let ambId = null
      const { data: amb } = await supabase
        .from('orcamentos_ambientes')
        .select('id')
        .eq('orcamento_id', currentOrcId)
        .limit(1)

      if (amb && amb.length > 0) {
        ambId = amb[0].id
      } else {
        const { data: newAmb, error: ambErr } = await supabase
          .from('orcamentos_ambientes')
          .insert({ orcamento_id: currentOrcId, nome: 'Geral' })
          .select()
          .single()
        if (ambErr) throw ambErr
        ambId = newAmb.id
      }

      if (!isNew) {
        await supabase.from('orcamentos_itens').delete().eq('ambiente_id', ambId)
      }

      if (itens.length > 0) {
        const itensToInsert = itens.map((i) => ({
          ambiente_id: ambId,
          nome_item: i.nome_item || 'Sem nome',
          quantidade: Number(i.quantidade) || 1,
          custo_unitario: Number(i.custo_unitario) || 0,
          unidade_medida: 'un',
          markup: 2.5,
          markup_manual: false,
        }))
        const { error: itErr } = await supabase.from('orcamentos_itens').insert(itensToInsert)
        if (itErr) throw itErr
      }

      toast.success('Orçamento salvo com sucesso!')
      navigate('/orcamentos')
    } catch (error: any) {
      toast.error('Erro ao salvar: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const addItem = () => {
    setItens([
      ...itens,
      { id: crypto.randomUUID(), nome_item: '', quantidade: 1, custo_unitario: 0 },
    ])
  }

  const updateItem = (itemId: string, field: string, value: any) => {
    setItens(itens.map((i) => (i.id === itemId ? { ...i, [field]: value } : i)))
  }

  const removeItem = (itemId: string) => {
    setItens(itens.filter((i) => i.id !== itemId))
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500">Carregando dados reais do orçamento...</div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/orcamentos')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-2xl font-bold text-slate-800">
          {isNew ? 'Novo Orçamento' : 'Editar Orçamento'}
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <Card>
          <CardHeader>
            <CardTitle>Dados Básicos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Nome do Orçamento</Label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Reforma Cozinha"
              />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Rascunho">Rascunho</SelectItem>
                  <SelectItem value="Enviado">Enviado</SelectItem>
                  <SelectItem value="Aprovado">Aprovado</SelectItem>
                  <SelectItem value="Rejeitado">Rejeitado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Cliente</Label>
              <div className="flex flex-col gap-3">
                <Popover open={clientSearchOpen} onOpenChange={setClientSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={clientSearchOpen}
                      className="w-full justify-between font-normal"
                    >
                      {clienteId
                        ? clientes.find((c) => c.id === clienteId)?.nome
                        : clienteNomeManual || 'Selecione ou digite um cliente...'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Buscar cliente..." />
                      <CommandList>
                        <CommandEmpty>Nenhum cliente no banco.</CommandEmpty>
                        <CommandGroup>
                          {clientes.map((c) => (
                            <CommandItem
                              key={c.id}
                              value={c.nome}
                              onSelect={() => {
                                setClienteId(c.id)
                                setClienteNomeManual('')
                                setClientSearchOpen(false)
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

                <div className="flex flex-col gap-1">
                  <span className="text-xs text-slate-500 font-medium">
                    Ou cadastre um nome avulso:
                  </span>
                  <Input
                    placeholder="Nome do cliente sem cadastro..."
                    value={clienteNomeManual}
                    onChange={(e) => {
                      setClienteNomeManual(e.target.value)
                      if (e.target.value) setClienteId(null)
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {isNew && (
          <Card>
            <CardHeader>
              <CardTitle>Inteligência OCR</CardTitle>
            </CardHeader>
            <CardContent>
              <OcrUploadZone onSuccess={handleOcrSuccess} label="Importar PDF ou Imagem" />
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
          <CardTitle>Itens do Orçamento</CardTitle>
          <Button size="sm" onClick={addItem} className="bg-slate-800 hover:bg-slate-900">
            <Plus className="w-4 h-4 mr-2" /> Adicionar Manualmente
          </Button>
        </CardHeader>
        <CardContent className="pt-6">
          {itens.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 border border-dashed rounded-lg">
              <p className="text-slate-500">Nenhum item adicionado a este orçamento ainda.</p>
              <p className="text-sm text-slate-400 mt-1">
                Importe um arquivo via OCR ou adicione manualmente.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {itens.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row gap-3 items-start sm:items-end border p-4 rounded-lg bg-white shadow-sm"
                >
                  <div className="flex-1 w-full space-y-1">
                    <Label className="text-xs text-slate-500">Descrição do Item</Label>
                    <Input
                      value={item.nome_item}
                      onChange={(e) => updateItem(item.id, 'nome_item', e.target.value)}
                    />
                  </div>
                  <div className="w-full sm:w-24 space-y-1">
                    <Label className="text-xs text-slate-500">Qtd</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantidade}
                      onChange={(e) => updateItem(item.id, 'quantidade', e.target.value)}
                    />
                  </div>
                  <div className="w-full sm:w-32 space-y-1">
                    <Label className="text-xs text-slate-500">Custo Unit. (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.custo_unitario}
                      onChange={(e) => updateItem(item.id, 'custo_unitario', e.target.value)}
                    />
                  </div>
                  <div className="pt-2 sm:pt-0 w-full sm:w-auto flex justify-end">
                    <Button
                      variant="ghost"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 h-10 w-10 p-0"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={() => navigate('/orcamentos')}>
          Cancelar
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Salvando...' : 'Salvar Orçamento'}
        </Button>
      </div>
    </div>
  )
}
