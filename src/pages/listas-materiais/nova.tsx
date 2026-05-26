import { useState, useEffect } from 'react'
import { FileDropzone } from '@/components/ui/file-dropzone'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { fileToBase64, uploadFileToStorage, processarListaMateriaisOcr } from '@/services/ocr'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Trash2, ArrowLeft, Save, ListChecks } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'

export default function NovaListaMateriais() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<{ ambiente: string; descricao: string; itens: any[] }>({
    ambiente: '',
    descricao: '',
    itens: [],
  })
  const [estoqueItens, setEstoqueItens] = useState<any[]>([])
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const { toast } = useToast()
  const navigate = useNavigate()
  const { user } = useAuth()

  useEffect(() => {
    const loadEstoque = async () => {
      const { data: itens } = await supabase
        .from('estoque_itens')
        .select('id, nome, unidade')
        .order('nome')
      if (itens) setEstoqueItens(itens)
    }
    loadEstoque()
  }, [])

  const handleFileSelect = async (selectedFile: File) => {
    setLoading(true)
    try {
      const url = await uploadFileToStorage(selectedFile)
      setFileUrl(url)

      const base64 = await fileToBase64(selectedFile)
      const isPdf = selectedFile.type === 'application/pdf'
      const ocrData = await processarListaMateriaisOcr(base64, isPdf)

      const newItens = (ocrData.itens || []).map((i: any) => {
        const extractedLower = (i.nome || '').toLowerCase()
        const match = estoqueItens.find(
          (e) =>
            e.nome.toLowerCase().includes(extractedLower) ||
            extractedLower.includes(e.nome.toLowerCase()),
        )

        return {
          id: Math.random().toString(),
          nome_extraido: i.nome || '',
          quantidade: Number(i.quantidade) || 1,
          estoque_item_id: match ? match.id : 'nenhum',
        }
      })

      setData((prev) => ({ ...prev, itens: [...prev.itens, ...newItens] }))
      toast({ title: 'Dados extraídos com sucesso' })
    } catch (error: any) {
      toast({
        title: 'Erro no processamento',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleItemChange = (id: string, field: string, value: any) => {
    setData((prev) => ({
      ...prev,
      itens: prev.itens.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    }))
  }

  const removeItem = (id: string) => {
    setData((prev) => ({
      ...prev,
      itens: prev.itens.filter((item) => item.id !== id),
    }))
  }

  const addItem = () => {
    setData((prev) => ({
      ...prev,
      itens: [
        ...prev.itens,
        {
          id: Math.random().toString(),
          nome_extraido: 'Novo Item Manual',
          quantidade: 1,
          estoque_item_id: 'nenhum',
        },
      ],
    }))
  }

  const handleSave = async () => {
    try {
      const { data: lista, error: listaError } = await supabase
        .from('listas_materiais')
        .insert({
          ambiente: data.ambiente,
          descricao: data.descricao,
          user_id: user?.id,
          status: 'Rascunho',
          arquivo_url: fileUrl,
        })
        .select()
        .single()

      if (listaError) throw listaError

      const validItems = data.itens.filter(
        (i) => i.estoque_item_id && i.estoque_item_id !== 'nenhum',
      )

      if (validItems.length > 0) {
        const itensToInsert = validItems.map((item: any) => ({
          lista_material_id: lista.id,
          estoque_item_id: item.estoque_item_id,
          quantidade: item.quantidade,
        }))

        const { error: itensError } = await supabase
          .from('itens_lista_material')
          .insert(itensToInsert)
        if (itensError) throw itensError
      }

      if (data.itens.length > validItems.length) {
        toast({
          title: 'Lista salva',
          description: 'Alguns itens não mapeados ao estoque foram ignorados.',
          variant: 'default',
        })
      } else {
        toast({ title: 'Lista salva com sucesso!' })
      }

      navigate('/listas-materiais')
    } catch (error: any) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' })
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ListChecks className="h-6 w-6 text-emerald-500" />
            Nova Lista de Materiais
          </h1>
          <p className="text-gray-500 mt-1">Importe via IA (OCR) ou crie manualmente.</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/listas-materiais')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <FileDropzone
            onFileSelect={handleFileSelect}
            loading={loading}
            accept=".pdf,.jpg,.png,.xlsx,.csv"
          />
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Dados Gerais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Ambiente Referência</Label>
              <Input
                value={data.ambiente}
                onChange={(e) => setData({ ...data, ambiente: e.target.value })}
                placeholder="Ex: Cozinha Planejada Cliente X"
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição / Notas Adicionais</Label>
              <Textarea
                value={data.descricao}
                onChange={(e) => setData({ ...data, descricao: e.target.value })}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Mapeamento de Materiais</CardTitle>
              <CardDescription>Vincule os itens lidos com o catálogo de estoque.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={addItem}>
              Adicionar Item Manual
            </Button>
          </CardHeader>
          <CardContent>
            {data.itens.length === 0 ? (
              <p className="text-center text-gray-500 py-4">Nenhum item na lista ainda.</p>
            ) : (
              <div className="space-y-3">
                {data.itens.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex flex-wrap md:flex-nowrap gap-3 items-end p-3 border rounded-lg bg-gray-50/50"
                  >
                    <div className="space-y-1 flex-1 min-w-[200px]">
                      <Label className="text-xs text-gray-500">Descrição Extraída (Original)</Label>
                      <Input
                        value={item.nome_extraido}
                        readOnly
                        className="bg-gray-100 text-gray-600"
                      />
                    </div>
                    <div className="space-y-1 flex-1 min-w-[200px]">
                      <Label className="text-xs font-semibold text-blue-700">
                        Item no Estoque (Vínculo)
                      </Label>
                      <Select
                        value={item.estoque_item_id}
                        onValueChange={(val) => handleItemChange(item.id, 'estoque_item_id', val)}
                      >
                        <SelectTrigger
                          className={
                            item.estoque_item_id === 'nenhum'
                              ? 'border-amber-300 bg-amber-50'
                              : 'border-blue-200'
                          }
                        >
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="nenhum" className="text-amber-600 italic">
                            -- Não Mapeado --
                          </SelectItem>
                          {estoqueItens.map((est) => (
                            <SelectItem key={est.id} value={est.id}>
                              {est.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1 w-[100px]">
                      <Label className="text-xs">Qtd.</Label>
                      <Input
                        type="number"
                        value={item.quantidade}
                        onChange={(e) =>
                          handleItemChange(item.id, 'quantidade', Number(e.target.value))
                        }
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button
            onClick={handleSave}
            className="bg-emerald-600 hover:bg-emerald-700"
            disabled={data.itens.length === 0}
          >
            <Save className="h-4 w-4 mr-2" />
            Salvar Lista
          </Button>
        </div>
      </div>
    </div>
  )
}
