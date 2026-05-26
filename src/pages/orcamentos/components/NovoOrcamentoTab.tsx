import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2, Plus, Trash2, Search, Upload, Save } from 'lucide-react'
import { saveOrcamento, saveCliente } from '@/services/orcamento-vendas'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { OcrUploadZone } from '@/components/OcrUploadZone'

interface ItemOrcamento {
  id: string
  nome_item: string
  quantidade: number
  preco_custo: number
  preco_venda: number
  estoque_item_id?: string
}

export default function NovoOrcamentoTab({ onSuccess }: { onSuccess: () => void }) {
  const [loading, setLoading] = useState(false)
  const [nome, setNome] = useState('')
  const [clientes, setClientes] = useState<any[]>([])
  const [clienteSearch, setClienteSearch] = useState('')
  const [selectedClienteId, setSelectedClienteId] = useState<string>('')
  const [tipoPagamento, setTipoPagamento] = useState<'vista' | 'prazo'>('vista')
  const [openClientCombo, setOpenClientCombo] = useState(false)
  const [itens, setItens] = useState<ItemOrcamento[]>([])
  const [markups, setMarkups] = useState({ vista: 1, prazo: 1 })
  const [showUpload, setShowUpload] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      const { data: cData } = await supabase.from('clientes').select('id, nome').order('nome')
      if (cData) setClientes(cData)

      const { data: mData } = await supabase
        .from('configuracoes')
        .select('chave, valor')
        .in('chave', ['markup_vista', 'markup_prazo'])
      let v = 1,
        p = 1
      if (mData) {
        const vRaw = mData.find((d) => d.chave === 'markup_vista')?.valor
        const pRaw = mData.find((d) => d.chave === 'markup_prazo')?.valor
        if (vRaw) v = Number(vRaw)
        if (pRaw) p = Number(pRaw)
      } else {
        v = Number(localStorage.getItem('markup_vista')) || 1
        p = Number(localStorage.getItem('markup_prazo')) || 1
      }
      setMarkups({ vista: v, prazo: p })
    }
    fetchData()
  }, [])

  useEffect(() => {
    const activeMarkup = tipoPagamento === 'vista' ? markups.vista : markups.prazo
    setItens((prev) =>
      prev.map((item) => ({
        ...item,
        preco_venda: Number((item.preco_custo * activeMarkup).toFixed(2)),
      })),
    )
  }, [tipoPagamento, markups])

  const handleAddItem = () => {
    setItens((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        nome_item: '',
        quantidade: 1,
        preco_custo: 0,
        preco_venda: 0,
      },
    ])
  }

  const updateItem = (id: string, field: keyof ItemOrcamento, value: any) => {
    const activeMarkup = tipoPagamento === 'vista' ? markups.vista : markups.prazo
    setItens((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        const updated = { ...item, [field]: value }
        if (field === 'preco_custo') {
          updated.preco_venda = Number((Number(value) * activeMarkup).toFixed(2))
        }
        return updated
      }),
    )
  }

  const removeItem = (id: string) => {
    setItens((prev) => prev.filter((i) => i.id !== id))
  }

  const handleOcrSuccess = async (extractedData: any) => {
    try {
      setShowUpload(false)
      toast.info('Buscando itens no estoque para conciliação...')

      const { data: estoque } = await supabase
        .from('estoque_itens')
        .select('id, nome, valor_unitario')
      const activeMarkup = tipoPagamento === 'vista' ? markups.vista : markups.prazo

      const parsedItems = Array.isArray(extractedData) ? extractedData : extractedData.itens || []

      const novosItens = parsedItems.map((item: any) => {
        let matched = null
        if (estoque) {
          matched = estoque.find((e) =>
            e.nome.toLowerCase().includes((item.descricao || item.nome_item || '').toLowerCase()),
          )
        }

        const custo = matched?.valor_unitario || item.preco_custo || item.valor_unitario || 0

        return {
          id: Math.random().toString(),
          nome_item: item.descricao || item.nome_item || 'Item Desconhecido',
          quantidade: item.quantidade || 1,
          preco_custo: custo,
          preco_venda: Number((custo * activeMarkup).toFixed(2)),
          estoque_item_id: matched?.id,
        }
      })

      if (novosItens.length > 0) {
        setItens((prev) => [...prev, ...novosItens])
        toast.success(`${novosItens.length} itens importados e conciliados.`)
      } else {
        toast.warning('Nenhum item identificado no documento.')
      }
    } catch (err) {
      toast.error('Erro ao processar itens.')
    }
  }

  const handleSave = async () => {
    if (!nome) return toast.error('Informe um título/referência para o orçamento.')
    if (itens.length === 0) return toast.error('Adicione pelo menos um item.')

    let finalClienteId = selectedClienteId
    if (!finalClienteId) {
      if (!clienteSearch) return toast.error('Selecione ou digite um nome de cliente.')
      try {
        setLoading(true)
        const newClient = await saveCliente(clienteSearch)
        finalClienteId = newClient.id
      } catch (err) {
        setLoading(false)
        return toast.error('Erro ao criar novo cliente.')
      }
    }

    try {
      setLoading(true)
      const orcamentoData = {
        nome,
        cliente_id: finalClienteId,
        tipo_pagamento: tipoPagamento,
        valor_total: itens.reduce((acc, i) => acc + i.preco_venda * i.quantidade, 0),
      }

      await saveOrcamento(orcamentoData, itens)
      toast.success('Orçamento salvo com sucesso!')
      onSuccess()
    } catch (err: any) {
      toast.error('Erro ao salvar orçamento: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const valorTotal = itens.reduce((acc, i) => acc + i.preco_venda * i.quantidade, 0)

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-300 pb-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/30 p-5 rounded-lg border">
        <div className="space-y-2">
          <Label htmlFor="nome">Título / Referência do Orçamento</Label>
          <Input
            id="nome"
            placeholder="Ex: Projeto Cozinha Sr. João"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Cliente</Label>
          <Popover open={openClientCombo} onOpenChange={setOpenClientCombo}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={openClientCombo}
                className="w-full justify-between font-normal bg-background"
              >
                {selectedClienteId
                  ? clientes.find((c) => c.id === selectedClienteId)?.nome
                  : clienteSearch || 'Selecione ou digite um cliente...'}
                <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
              <Command>
                <CommandInput
                  placeholder="Buscar ou criar cliente..."
                  value={clienteSearch}
                  onValueChange={setClienteSearch}
                />
                <CommandList>
                  <CommandEmpty className="p-3 text-sm text-center text-muted-foreground">
                    Nenhum cliente encontrado. "{clienteSearch}" será criado como novo ao salvar.
                  </CommandEmpty>
                  <CommandGroup>
                    {clientes.map((c) => (
                      <CommandItem
                        key={c.id}
                        value={c.nome}
                        onSelect={() => {
                          setSelectedClienteId(c.id)
                          setClienteSearch('')
                          setOpenClientCombo(false)
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

        <div className="space-y-2">
          <Label>Condição de Pagamento (Define o Markup)</Label>
          <Select
            value={tipoPagamento}
            onValueChange={(v: 'vista' | 'prazo') => setTipoPagamento(v)}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="vista">À Vista (Markup: {markups.vista.toFixed(5)})</SelectItem>
              <SelectItem value="prazo">A Prazo (Markup: {markups.prazo.toFixed(5)})</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b pb-4">
          <h3 className="text-lg font-medium">Itens do Orçamento</h3>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowUpload(!showUpload)}>
              <Upload className="w-4 h-4 mr-2" />
              Importar Planilha
            </Button>
            <Button variant="default" onClick={handleAddItem}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Item
            </Button>
          </div>
        </div>

        {showUpload && (
          <div className="mb-6 bg-card p-1 rounded-xl shadow-sm border">
            <OcrUploadZone onSuccess={handleOcrSuccess} label="Importar Planilha de Itens" />
          </div>
        )}

        <div className="border rounded-md overflow-x-auto bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[45%]">Descrição / Material</TableHead>
                <TableHead className="w-[12%] text-right">Qtd.</TableHead>
                <TableHead className="w-[18%] text-right">Custo Unit.</TableHead>
                <TableHead className="w-[18%] text-right">Venda Unit.</TableHead>
                <TableHead className="w-[7%]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itens.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-32 text-muted-foreground">
                    Nenhum item adicionado. Adicione manualmente ou importe via planilha.
                  </TableCell>
                </TableRow>
              )}
              {itens.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Input
                      value={item.nome_item}
                      onChange={(e) => updateItem(item.id, 'nome_item', e.target.value)}
                      placeholder="Descrição do item"
                      className="border-0 shadow-none focus-visible:ring-1 bg-transparent"
                    />
                    {item.estoque_item_id && (
                      <span className="text-[10px] font-medium text-emerald-600 ml-3">
                        ✅ Vinculado ao estoque
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantidade}
                      onChange={(e) => updateItem(item.id, 'quantidade', Number(e.target.value))}
                      className="text-right border-0 shadow-none focus-visible:ring-1 bg-transparent"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.preco_custo}
                      onChange={(e) => updateItem(item.id, 'preco_custo', Number(e.target.value))}
                      className="text-right border-0 shadow-none focus-visible:ring-1 bg-transparent"
                    />
                  </TableCell>
                  <TableCell className="text-right font-medium text-primary">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                      item.preco_venda,
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(item.id)}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-end pt-4">
          <div className="bg-primary/5 border border-primary/20 p-5 rounded-lg min-w-[320px] text-right shadow-sm">
            <p className="text-sm font-medium text-muted-foreground mb-1">
              Valor Total ({tipoPagamento === 'vista' ? 'À Vista' : 'A Prazo'})
            </p>
            <p className="text-3xl font-bold text-primary">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                valorTotal,
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-4 pt-6">
        <Button variant="outline" size="lg" onClick={onSuccess}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={loading} size="lg" className="px-8">
          {loading ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <Save className="w-5 h-5 mr-2" />
          )}
          Salvar Orçamento
        </Button>
      </div>
    </div>
  )
}
