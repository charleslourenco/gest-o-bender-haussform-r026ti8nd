import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Save, Trash2, ListChecks, Wand2 } from 'lucide-react'
import { OcrUploadZone } from '@/components/OcrUploadZone'

export default function NovaListaMateriais() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [clientes, setClientes] = useState<any[]>([])
  const [estoqueItens, setEstoqueItens] = useState<any[]>([])
  const [isSaving, setIsSaving] = useState(false)

  // Form State
  const [clienteId, setClienteId] = useState('')
  const [ambiente, setAmbiente] = useState('')
  const [descricao, setDescricao] = useState('')
  const [arquivoUrl, setArquivoUrl] = useState('')
  const [itens, setItens] = useState<any[]>([])

  useEffect(() => {
    Promise.all([
      supabase.from('clientes').select('id, nome').order('nome'),
      supabase.from('estoque_itens').select('id, nome, unidade').order('nome'),
    ]).then(([clientesRes, estoqueRes]) => {
      if (clientesRes.data) setClientes(clientesRes.data)
      if (estoqueRes.data) setEstoqueItens(estoqueRes.data)
    })
  }, [])

  const handleOcrSuccess = (data: any, url: string) => {
    setArquivoUrl(url)
    setAmbiente(data.ambiente || '')
    setDescricao(data.descricao || '')

    if (data.cliente) {
      const match = clientes.find((c) => c.nome.toLowerCase().includes(data.cliente.toLowerCase()))
      if (match) setClienteId(match.id)
    }

    const mappedItens = (data.itens || []).map((i: any, idx: number) => {
      // Find best match in stock
      const match = estoqueItens.find((e) => e.nome.toLowerCase() === i.nome_item.toLowerCase())
      return {
        id: `ocr_${idx}`,
        estoque_item_id: match ? match.id : 'avulso',
        nome_avulso: match ? '' : i.nome_item,
        quantidade: i.quantidade || 1,
      }
    })

    setItens(mappedItens)
    toast.success('Dados importados com sucesso! Revise os itens abaixo.')
  }

  const handleAddItem = () => {
    setItens([
      ...itens,
      { id: `new_${Date.now()}`, estoque_item_id: '', nome_avulso: '', quantidade: 1 },
    ])
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
      const { data: listaData, error: listaError } = await supabase
        .from('listas_materiais')
        .insert({
          cliente_id: clienteId,
          ambiente,
          descricao,
          arquivo_url: arquivoUrl,
          user_id: user?.id,
          status: 'Rascunho',
        })
        .select()
        .single()

      if (listaError) throw listaError

      const itensToInsert = itens
        .map((i) => ({
          lista_material_id: listaData.id,
          estoque_item_id: i.estoque_item_id === 'avulso' ? null : i.estoque_item_id,
          quantidade: Number(i.quantidade),
        }))
        .filter((i) => i.estoque_item_id !== null) // Current DB only saves linked items. If we need avulso, we need to alter table or just ignore for now as per schema.

      if (itensToInsert.length > 0) {
        const { error: itensError } = await supabase
          .from('itens_lista_material')
          .insert(itensToInsert)
        if (itensError) throw itensError
      }

      toast.success('Lista salva com sucesso!')
      navigate('/listas-materiais')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar lista.')
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
        <ListChecks className="h-8 w-8 text-emerald-400 hidden sm:block" />
        <div>
          <h1 className="text-2xl font-bold text-off-white">Nova Lista de Materiais</h1>
          <p className="text-pale-cornflower text-sm mt-0.5">
            Crie manualmente ou gere através de Inteligência Artificial
          </p>
        </div>
      </div>

      <div className="flex-1 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <Tabs defaultValue="ocr" className="space-y-6">
          <TabsList className="bg-gray-100 p-1">
            <TabsTrigger
              value="ocr"
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <Wand2 className="w-4 h-4 mr-2" /> Gerar via OCR
            </TabsTrigger>
            <TabsTrigger
              value="manual"
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              Preenchimento Manual
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ocr" className="m-0 border-none">
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-6">
              <OcrUploadZone onSuccess={handleOcrSuccess} label="Importar Documento da Lista" />
            </div>
          </TabsContent>

          <TabsContent value="manual" className="m-0 border-none" />

          {/* Form Content - Shared between both tabs once data is populated or manual mode */}
          <div className="space-y-8 animate-in fade-in duration-500 pt-4 border-t">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-midnight-navy">Detalhes da Lista</h2>
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
                    placeholder="Ex: Cozinha Principal"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descrição / Notas</Label>
                <Textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="h-24"
                  placeholder="Observações adicionais..."
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg text-midnight-navy">Itens da Lista</h3>
                <Button variant="outline" size="sm" onClick={handleAddItem}>
                  + Adicionar Item
                </Button>
              </div>

              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead>Item do Estoque (Match)</TableHead>
                      <TableHead>Nome Original (OCR)</TableHead>
                      <TableHead className="w-32">Quantidade</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itens.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                          Nenhum item na lista.
                        </TableCell>
                      </TableRow>
                    ) : (
                      itens.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Select
                              value={item.estoque_item_id}
                              onValueChange={(val) =>
                                handleItemChange(item.id, 'estoque_item_id', val)
                              }
                            >
                              <SelectTrigger
                                className={
                                  item.estoque_item_id === 'avulso'
                                    ? 'border-amber-300 bg-amber-50'
                                    : ''
                                }
                              >
                                <SelectValue placeholder="Selecione no estoque..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="avulso" className="text-amber-600 font-medium">
                                  -- Item Avulso (Não salvar no BD) --
                                </SelectItem>
                                {estoqueItens.map((e) => (
                                  <SelectItem key={e.id} value={e.id}>
                                    {e.nome} ({e.unidade})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              value={item.nome_avulso}
                              onChange={(e) =>
                                handleItemChange(item.id, 'nome_avulso', e.target.value)
                              }
                              placeholder="Nome original lido"
                              readOnly={
                                item.estoque_item_id !== 'avulso' && item.nome_avulso === ''
                              }
                              className={
                                item.estoque_item_id !== 'avulso' ? 'bg-gray-50 text-gray-500' : ''
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
        </Tabs>
      </div>
    </div>
  )
}
