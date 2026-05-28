import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Trash2, Plus, Upload, Save, ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { processarOrcamentoOcr, toBase64 } from '@/services/orcamento-ocr'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type Orcamento = {
  id?: string
  nome: string
  cliente_id: string | null
  cliente_nome_manual: string
  markup_divisor_normal: number
  markup_divisor_vista: number
  ambientes: Ambiente[]
}

type Ambiente = {
  id?: string
  nome: string
  itens: Item[]
}

type Item = {
  id?: string
  item_estoque_id: string | null
  nome_item: string
  quantidade: number
  unidade_medida: string
  custo_unitario: number
}

export default function OrcamentosEngenhariaDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [clientes, setClientes] = useState<any[]>([])
  const [estoque, setEstoque] = useState<any[]>([])
  const [orcamento, setOrcamento] = useState<Orcamento>({
    nome: '',
    cliente_id: null,
    cliente_nome_manual: '',
    markup_divisor_normal: 0.35,
    markup_divisor_vista: 0.4,
    ambientes: [],
  })

  useEffect(() => {
    loadDependencies()
    if (id) loadOrcamento(id)
  }, [id])

  const loadDependencies = async () => {
    const [cliRes, estRes] = await Promise.all([
      supabase.from('clientes').select('id, nome').order('nome'),
      supabase.from('estoque_itens').select('id, nome, unidade, valor_unitario'),
    ])
    setClientes(cliRes.data || [])
    setEstoque(estRes.data || [])
  }

  const loadOrcamento = async (orcId: string) => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('orcamentos_engenharia')
      .select('*, orcamentos_ambientes(*, orcamentos_itens(*))')
      .eq('id', orcId)
      .single()

    if (error) {
      toast.error('Erro ao carregar: ' + error.message)
    } else if (data) {
      setOrcamento({
        id: data.id,
        nome: data.nome,
        cliente_id: data.cliente_id,
        cliente_nome_manual: data.cliente_nome_manual || '',
        markup_divisor_normal: data.markup_divisor_normal || 0.35,
        markup_divisor_vista: data.markup_divisor_vista || 0.4,
        ambientes: (data.orcamentos_ambientes || []).map((amb: any) => ({
          id: amb.id,
          nome: amb.nome,
          itens: (amb.orcamentos_itens || []).map((it: any) => ({
            id: it.id,
            item_estoque_id: it.item_estoque_id,
            nome_item: it.nome_item,
            quantidade: Number(it.quantidade) || 0,
            unidade_medida: it.unidade_medida,
            custo_unitario: Number(it.custo_unitario) || 0,
          })),
        })),
      })
    }
    setIsLoading(false)
  }

  const handleClienteChange = (val: string) => {
    const match = clientes.find((c) => c.nome.toLowerCase() === val.toLowerCase())
    setOrcamento((prev) => ({
      ...prev,
      cliente_nome_manual: val,
      cliente_id: match ? match.id : null,
    }))
  }

  const addAmbiente = () => {
    setOrcamento((prev) => ({
      ...prev,
      ambientes: [...prev.ambientes, { id: crypto.randomUUID(), nome: 'Novo Ambiente', itens: [] }],
    }))
  }

  const removeAmbiente = (index: number) => {
    setOrcamento((prev) => {
      const newAmbs = [...prev.ambientes]
      newAmbs.splice(index, 1)
      return { ...prev, ambientes: newAmbs }
    })
  }

  const updateAmbienteNome = (index: number, nome: string) => {
    setOrcamento((prev) => {
      const newAmbs = [...prev.ambientes]
      newAmbs[index].nome = nome
      return { ...prev, ambientes: newAmbs }
    })
  }

  const addItem = (ambIndex: number) => {
    setOrcamento((prev) => {
      const newAmbs = [...prev.ambientes]
      newAmbs[ambIndex].itens.push({
        id: crypto.randomUUID(),
        item_estoque_id: null,
        nome_item: '',
        quantidade: 1,
        unidade_medida: 'un',
        custo_unitario: 0,
      })
      return { ...prev, ambientes: newAmbs }
    })
  }

  const updateItem = (ambIndex: number, itemIndex: number, field: keyof Item, value: any) => {
    setOrcamento((prev) => {
      const newAmbs = [...prev.ambientes]
      const item = { ...newAmbs[ambIndex].itens[itemIndex], [field]: value }

      if (field === 'nome_item') {
        const match = estoque.find((e) => e.nome.toLowerCase() === String(value).toLowerCase())
        if (match) {
          item.item_estoque_id = match.id
          item.custo_unitario = match.valor_unitario
          item.unidade_medida = match.unidade
        } else {
          item.item_estoque_id = null
        }
      }

      newAmbs[ambIndex].itens[itemIndex] = item
      return { ...prev, ambientes: newAmbs }
    })
  }

  const removeItem = (ambIndex: number, itemIndex: number) => {
    setOrcamento((prev) => {
      const newAmbs = [...prev.ambientes]
      newAmbs[ambIndex].itens.splice(itemIndex, 1)
      return { ...prev, ambientes: newAmbs }
    })
  }

  const handleUploadOcr = async (ambienteIndex: number, file: File) => {
    try {
      toast.info('Processando arquivo OCR... Isso pode levar alguns segundos.')
      const base64Data = await toBase64(file)
      const data = await processarOrcamentoOcr(base64Data, file.type, file.name)

      if (data && data.itens && data.itens.length > 0) {
        const newItens = data.itens.map((item: any) => {
          const match = estoque.find((e) =>
            e.nome.toLowerCase().includes(item.nome_item?.toLowerCase() || ''),
          )
          return {
            id: crypto.randomUUID(),
            nome_item: item.nome_item || 'Item Desconhecido',
            quantidade: item.quantidade || 1,
            unidade_medida: item.unidade || (match ? match.unidade : 'un'),
            custo_unitario: match ? match.valor_unitario : item.custo_unitario || 0,
            item_estoque_id: match ? match.id : null,
          }
        })

        setOrcamento((prev) => {
          const newAmbs = [...prev.ambientes]
          newAmbs[ambienteIndex].itens.push(...newItens)
          return { ...prev, ambientes: newAmbs }
        })
        toast.success(`${newItens.length} itens extraídos com sucesso!`)
      } else {
        toast.warning('Nenhum item encontrado no documento.')
      }
    } catch (e: any) {
      toast.error('Erro no OCR: ' + e.message)
    }
  }

  const handleSave = async () => {
    if (!orcamento.nome.trim()) return toast.error('Preencha o nome do projeto')

    try {
      setIsSaving(true)
      let orcId = orcamento.id

      const orcData = {
        nome: orcamento.nome,
        cliente_id: orcamento.cliente_id || null,
        cliente_nome_manual: orcamento.cliente_nome_manual,
        markup_divisor_normal: orcamento.markup_divisor_normal,
        markup_divisor_vista: orcamento.markup_divisor_vista,
        usuario_id: user?.id,
        status: 'Rascunho',
      }

      if (orcId) {
        const { error } = await supabase
          .from('orcamentos_engenharia')
          .update(orcData)
          .eq('id', orcId)
        if (error) throw error
      } else {
        const { data: newOrc, error } = await supabase
          .from('orcamentos_engenharia')
          .insert(orcData)
          .select()
          .single()
        if (error) throw error
        orcId = newOrc.id
      }

      if (orcamento.id) {
        await supabase.from('orcamentos_ambientes').delete().eq('orcamento_id', orcamento.id)
      }

      for (const amb of orcamento.ambientes) {
        const { data: newAmb, error: ambError } = await supabase
          .from('orcamentos_ambientes')
          .insert({
            orcamento_id: orcId,
            nome: amb.nome,
          })
          .select()
          .single()

        if (ambError) throw ambError

        if (amb.itens.length > 0) {
          const itensToInsert = amb.itens.map((it) => ({
            ambiente_id: newAmb.id,
            nome_item: it.nome_item,
            quantidade: it.quantidade,
            unidade_medida: it.unidade_medida,
            custo_unitario: it.custo_unitario,
            item_estoque_id: it.item_estoque_id || null,
            markup: 0,
            markup_manual: false,
          }))
          const { error: itError } = await supabase.from('orcamentos_itens').insert(itensToInsert)
          if (itError) throw itError
        }
      }

      toast.success('Orçamento salvo com sucesso!')
      navigate('/orcamentos')
    } catch (e: any) {
      toast.error('Erro ao salvar: ' + e.message)
    } finally {
      setIsSaving(false)
    }
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  const totalCusto = orcamento.ambientes.reduce(
    (acc, amb) => acc + amb.itens.reduce((iAcc, it) => iAcc + it.quantidade * it.custo_unitario, 0),
    0,
  )
  const totalVista = totalCusto / (orcamento.markup_divisor_vista || 0.4)
  const totalPrazo = totalCusto / (orcamento.markup_divisor_normal || 0.35)

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto bg-gray-50/50 p-6">
      <datalist id="clientes-list">
        {clientes.map((c) => (
          <option key={c.id} value={c.nome} />
        ))}
      </datalist>

      <div className="max-w-6xl mx-auto space-y-6 pb-24">
        <div className="bg-[#0B1A28] rounded-xl p-6 text-white shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              className="text-white hover:bg-white/20"
              onClick={() => navigate('/orcamentos')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">
                {orcamento.id ? 'Editar Orçamento' : 'Novo Orçamento'}
              </h1>
              <p className="text-sm text-gray-300">
                Construção de custos de engenharia e precificação
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Salvar Orçamento
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 bg-white border shadow-sm rounded-xl">
          <div>
            <Label>Nome do Projeto</Label>
            <Input
              value={orcamento.nome}
              onChange={(e) => setOrcamento({ ...orcamento, nome: e.target.value })}
              placeholder="Ex: Apartamento 402"
            />
          </div>
          <div>
            <Label>Cliente</Label>
            <Input
              list="clientes-list"
              value={orcamento.cliente_nome_manual || ''}
              onChange={(e) => handleClienteChange(e.target.value)}
              placeholder="Selecione ou digite..."
            />
          </div>
          <div>
            <Label>Divisor Markup (À Vista)</Label>
            <Input
              type="number"
              step="0.01"
              value={orcamento.markup_divisor_vista}
              onChange={(e) =>
                setOrcamento({ ...orcamento, markup_divisor_vista: Number(e.target.value) })
              }
            />
          </div>
          <div>
            <Label>Divisor Markup (A Prazo)</Label>
            <Input
              type="number"
              step="0.01"
              value={orcamento.markup_divisor_normal}
              onChange={(e) =>
                setOrcamento({ ...orcamento, markup_divisor_normal: Number(e.target.value) })
              }
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-800">Ambientes</h2>
            <Button
              onClick={addAmbiente}
              variant="outline"
              className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            >
              <Plus className="w-4 h-4 mr-2" /> Adicionar Ambiente
            </Button>
          </div>

          {orcamento.ambientes.map((amb, ambIndex) => {
            const ambCusto = amb.itens.reduce(
              (acc, it) => acc + it.quantidade * it.custo_unitario,
              0,
            )
            const ambVista = ambCusto / (orcamento.markup_divisor_vista || 0.4)
            const ambPrazo = ambCusto / (orcamento.markup_divisor_normal || 0.35)

            return (
              <div key={ambIndex} className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <div className="bg-gray-50 border-b p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex items-center gap-4 flex-1 w-full max-w-md">
                    <Input
                      value={amb.nome}
                      onChange={(e) => updateAmbienteNome(ambIndex, e.target.value)}
                      className="font-bold text-lg bg-white"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      className="hidden"
                      id={`ocr-upload-${ambIndex}`}
                      accept=".pdf,.png,.jpg,.jpeg,.csv,.xlsx"
                      onChange={(e) => {
                        if (e.target.files?.[0]) handleUploadOcr(ambIndex, e.target.files[0])
                        e.target.value = ''
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById(`ocr-upload-${ambIndex}`)?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" /> Importar Lista (OCR)
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeAmbiente(ambIndex)}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Excluir
                    </Button>
                  </div>
                </div>

                <div className="p-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40%]">Material / Item</TableHead>
                        <TableHead className="w-[15%]">Qtd</TableHead>
                        <TableHead className="w-[10%]">Un.</TableHead>
                        <TableHead className="w-[15%]">Custo Un.</TableHead>
                        <TableHead className="w-[15%]">Custo Total</TableHead>
                        <TableHead className="w-[5%]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {amb.itens.map((item, itemIndex) => (
                        <TableRow
                          key={itemIndex}
                          className={cn(
                            !item.item_estoque_id &&
                              'bg-yellow-50 hover:bg-yellow-100 transition-colors',
                          )}
                        >
                          <TableCell>
                            <Input
                              value={item.nome_item}
                              onChange={(e) =>
                                updateItem(ambIndex, itemIndex, 'nome_item', e.target.value)
                              }
                              className={cn(
                                !item.item_estoque_id &&
                                  'bg-yellow-50/50 border-yellow-300 focus-visible:ring-yellow-400',
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={item.quantidade || ''}
                              onChange={(e) =>
                                updateItem(
                                  ambIndex,
                                  itemIndex,
                                  'quantidade',
                                  Number(e.target.value),
                                )
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={item.unidade_medida}
                              onChange={(e) =>
                                updateItem(ambIndex, itemIndex, 'unidade_medida', e.target.value)
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              value={item.custo_unitario || ''}
                              onChange={(e) =>
                                updateItem(
                                  ambIndex,
                                  itemIndex,
                                  'custo_unitario',
                                  Number(e.target.value),
                                )
                              }
                            />
                          </TableCell>
                          <TableCell className="font-medium text-gray-700">
                            {formatCurrency(item.quantidade * item.custo_unitario)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeItem(ambIndex, itemIndex)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {amb.itens.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                            Nenhum item adicionado. Importe uma lista ou adicione manualmente.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                  <div className="mt-4 flex justify-between items-center bg-gray-50/50 p-4 rounded-lg border">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => addItem(ambIndex)}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <Plus className="w-4 h-4 mr-2" /> Adicionar Item Manual
                    </Button>
                    <div className="flex gap-6 text-sm">
                      <div>
                        <span className="text-gray-500">Custo Base:</span>{' '}
                        <span className="font-medium">{formatCurrency(ambCusto)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Venda à Vista:</span>{' '}
                        <span className="font-medium text-emerald-700">
                          {formatCurrency(ambVista)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Venda a Prazo:</span>{' '}
                        <span className="font-medium text-blue-700">
                          {formatCurrency(ambPrazo)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          {orcamento.ambientes.length === 0 && (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed">
              <p className="text-muted-foreground">Nenhum ambiente adicionado ainda.</p>
              <Button onClick={addAmbiente} variant="outline" className="mt-4">
                <Plus className="w-4 h-4 mr-2" /> Adicionar Primeiro Ambiente
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white border-t p-4 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-40">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-sm text-gray-500">
            <span className="inline-block w-3 h-3 rounded-full bg-yellow-100 border border-yellow-300 mr-2"></span>
            Itens destacados em amarelo precisam de validação manual de custo.
          </div>
          <div className="flex gap-8 items-center">
            <div className="text-right">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                Custo Total
              </p>
              <p className="text-lg font-medium">{formatCurrency(totalCusto)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-blue-600 uppercase tracking-wider font-semibold">
                Venda a Prazo
              </p>
              <p className="text-lg font-bold text-blue-700">{formatCurrency(totalPrazo)}</p>
            </div>
            <div className="text-right bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-100">
              <p className="text-xs text-emerald-600 uppercase tracking-wider font-semibold">
                Venda à Vista
              </p>
              <p className="text-2xl font-black text-emerald-700">{formatCurrency(totalVista)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
