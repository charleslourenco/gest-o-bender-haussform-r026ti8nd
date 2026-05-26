import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { OcrUploadZone } from '@/components/OcrUploadZone'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Trash2, Save, ArrowLeft, Receipt } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'

export default function UploadOrcamento() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [step, setStep] = useState<'upload' | 'review'>('upload')
  const [clientes, setClientes] = useState<any[]>([])

  // Review Form State
  const [fileUrl, setFileUrl] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [ambiente, setAmbiente] = useState('')
  const [descricao, setDescricao] = useState('')
  const [itens, setItens] = useState<any[]>([])
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    supabase
      .from('clientes')
      .select('id, nome')
      .order('nome')
      .then(({ data }) => setClientes(data || []))
  }, [])

  const handleOcrSuccess = (data: any, url: string) => {
    setFileUrl(url)
    setAmbiente(data.ambiente || '')
    setDescricao(data.descricao || '')

    // Attempt to match client by name
    if (data.cliente) {
      const match = clientes.find((c) => c.nome.toLowerCase().includes(data.cliente.toLowerCase()))
      if (match) setClienteId(match.id)
    }

    setItens(
      (data.itens || []).map((i: any, idx: number) => ({
        id: `temp_${idx}`,
        nome_item: i.nome_item || '',
        quantidade: i.quantidade || 1,
        preco_venda: i.custo_unitario || 0,
      })),
    )

    setStep('review')
  }

  const handleItemChange = (id: string, field: string, value: any) => {
    setItens(itens.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  const handleRemoveItem = (id: string) => {
    setItens(itens.filter((item) => item.id !== id))
  }

  const handleSave = async () => {
    if (!clienteId) {
      toast.error('Selecione um cliente.')
      return
    }

    setIsSaving(true)
    try {
      const valorTotal = itens.reduce(
        (acc, item) => acc + Number(item.quantidade) * Number(item.preco_venda),
        0,
      )

      // 1. Save Orcamento
      const { data: orcData, error: orcError } = await supabase
        .from('orcamentos')
        .insert({
          cliente_id: clienteId,
          ambiente,
          descricao,
          arquivo_url: fileUrl,
          user_id: user?.id,
          valor_total: valorTotal,
          status: 'Rascunho',
        })
        .select()
        .single()

      if (orcError) throw orcError

      // 2. Save Itens
      if (itens.length > 0) {
        const itensToInsert = itens.map((i) => ({
          orcamento_id: orcData.id,
          nome_item: i.nome_item,
          quantidade: Number(i.quantidade),
          preco_venda: Number(i.preco_venda),
          preco_custo: 0,
        }))
        const { error: itensError } = await supabase.from('itens_orcamento').insert(itensToInsert)
        if (itensError) throw itensError
      }

      toast.success('Orçamento salvo com sucesso!')
      navigate('/orcamentos')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar orçamento.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="p-6 h-full flex flex-col bg-off-white space-y-6 overflow-y-auto">
      <div className="flex items-center gap-4 shrink-0 bg-midnight-navy p-6 rounded-xl shadow-sm">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="text-white hover:text-gray-900"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Receipt className="h-8 w-8 text-emerald-400 hidden sm:block" />
        <div>
          <h1 className="text-2xl font-bold text-off-white">Importar Orçamento via OCR</h1>
          <p className="text-pale-cornflower text-sm mt-0.5">
            Extraia dados automaticamente de PDFs, imagens e planilhas
          </p>
        </div>
      </div>

      <div className="flex-1 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        {step === 'upload' ? (
          <div className="max-w-2xl mx-auto mt-10">
            <OcrUploadZone onSuccess={handleOcrSuccess} label="Upload de Orçamento" />
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-midnight-navy">Revisar Dados Extraídos</h2>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {isSaving ? 'Salvando...' : 'Confirmar e Salvar'}
                <Save className="ml-2 h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <Select value={clienteId} onValueChange={setClienteId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cliente..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Ambiente</Label>
                  <Input
                    value={ambiente}
                    onChange={(e) => setAmbiente(e.target.value)}
                    placeholder="Ex: Cozinha Planejada"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descrição / Notas</Label>
                <Textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="h-24"
                  placeholder="Observações do orçamento..."
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg text-midnight-navy">Itens do Orçamento</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setItens([
                      ...itens,
                      { id: `new_${Date.now()}`, nome_item: '', quantidade: 1, preco_venda: 0 },
                    ])
                  }
                >
                  + Adicionar Item
                </Button>
              </div>

              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead>Nome do Item</TableHead>
                      <TableHead className="w-32">Quantidade</TableHead>
                      <TableHead className="w-48">Preço Unit. (R$)</TableHead>
                      <TableHead className="w-48">Total (R$)</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itens.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                          Nenhum item extraído.
                        </TableCell>
                      </TableRow>
                    ) : (
                      itens.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Input
                              value={item.nome_item}
                              onChange={(e) =>
                                handleItemChange(item.id, 'nome_item', e.target.value)
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantidade}
                              onChange={(e) =>
                                handleItemChange(item.id, 'quantidade', e.target.value)
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              value={item.preco_venda}
                              onChange={(e) =>
                                handleItemChange(item.id, 'preco_venda', e.target.value)
                              }
                            />
                          </TableCell>
                          <TableCell className="font-medium text-gray-700">
                            R$ {(Number(item.quantidade) * Number(item.preco_venda)).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveItem(item.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
