import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, Loader2, Copy, Bot, AlertTriangle, CheckCircle2, Trash2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function ConciliacaoListas() {
  const [listas, setListas] = useState<any[]>([])
  const [estoque, setEstoque] = useState<any[]>([])
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchData()
    checkAdmin()
  }, [])

  async function checkAdmin() {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase.rpc('is_admin', { user_id: user.id })
      setIsAdmin(!!data)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja apagar esta lista?')) return
    await supabase.from('listas_materiais').delete().eq('id', id)
    fetchData()
    toast({ title: 'Lista apagada' })
  }

  async function fetchData() {
    const [resListas, resEstoque] = await Promise.all([
      supabase
        .from('listas_materiais' as any)
        .select('*, clientes(nome)')
        .order('criado_em', { ascending: false }),
      supabase.from('estoque_itens' as any).select('*'),
    ])
    if (resListas.data) setListas(resListas.data)
    if (resEstoque.data) setEstoque(resEstoque.data)
  }

  const handleProcessarZenaide = async (lista: any) => {
    setProcessingId(lista.id)
    try {
      toast({ title: 'Zenaide: Lendo Lista...', description: 'Extraindo materiais do documento.' })

      const { data: fileData, error: fileError } = await supabase.storage
        .from('bender_clientes')
        .download(lista.arquivo_url)
      if (fileError) throw fileError

      const buffer = await fileData.arrayBuffer()
      const mimeType = fileData.type

      if (mimeType !== 'application/pdf') {
        throw new Error('Apenas arquivos PDF são suportados para processamento automático.')
      }

      // Safe base64 conversion for large files
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve((reader.result as string).split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(new Blob([buffer], { type: mimeType }))
      })
      const dataUrl = `data:${mimeType};base64,${base64}`

      const response = await supabase.functions.invoke('financeiro-ai', {
        body: {
          action: 'ocr_lista_materiais',
          payload: { imageBase64: dataUrl, isPdf: true },
        },
      })

      if (response.error) throw response.error

      let parsed = response.data
      if (typeof parsed === 'string') {
        try {
          parsed = JSON.parse(parsed)
        } catch (e) {
          throw new Error('Falha ao interpretar dados do OCR.')
        }
      }

      await supabase
        .from('listas_materiais' as any)
        .update({ status: 'conciliado', itens: parsed?.itens || [] })
        .eq('id', lista.id)

      toast({ title: 'Sucesso', description: 'Lista processada e conciliada com sucesso!' })
      fetchData()
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    } finally {
      setProcessingId(null)
    }
  }

  const handleCopiarPedido = (itemExtraido: any, itemEstoque: any) => {
    const qtdPedir = Math.max(
      0,
      itemExtraido.quantidade - (itemEstoque ? itemEstoque.quantidade : 0),
    )
    if (qtdPedir <= 0) return

    const fornecedor = itemEstoque?.fornecedor || 'Fornecedor'
    const texto = `Olá! Gostaria de realizar o seguinte pedido:\n\n- ${qtdPedir}x ${itemExtraido.nome}\n\nObrigado.`
    navigator.clipboard.writeText(texto)
    toast({
      title: 'Pedido Copiado!',
      description: 'Texto pronto para colar no WhatsApp ou E-mail.',
    })
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-semibold text-amber-800">
            Atenção: Compras Externas & Terceirizados
          </h4>
          <p className="text-sm text-amber-700 mt-1">
            Fique atento aos itens com o badge "Terceirizado" e demandas que faltam no estoque. Eles
            possuem tempo de lead time maior e precisam ser encomendados com prioridade. Use o botão
            "Copiar Pedido" para agilizar a comunicação com o fornecedor.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {listas.map((lista) => {
          const isConciliado = lista.status === 'conciliado'
          return (
            <Card
              key={lista.id}
              className="overflow-hidden border-2 hover:border-steel-blue/50 transition-colors"
            >
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-steel-blue/10 p-3 rounded-full">
                      <FileText className="w-6 h-6 text-steel-blue" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-midnight-navy">
                        Lista de Materiais - {lista.clientes?.nome || 'Cliente'}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Enviada em {new Date(lista.criado_em).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isConciliado ? (
                      <Button
                        onClick={() => handleProcessarZenaide(lista)}
                        disabled={processingId === lista.id}
                        className="bg-midnight-navy hover:bg-dark-denim text-white font-bold shadow"
                      >
                        {processingId === lista.id ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Bot className="w-4 h-4 mr-2" />
                        )}
                        Processar com Zenaide (OCR)
                      </Button>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-emerald-50 text-emerald-600 border-emerald-200 px-3 py-1 text-sm font-bold"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1 inline" /> Processado / Conciliado
                      </Badge>
                    )}
                    {isAdmin && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDelete(lista.id)}
                        className="text-red-500 hover:bg-red-50 border-red-200"
                        title="Apagar Lista"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {isConciliado && lista.itens && lista.itens.length > 0 && (
                  <div className="mt-6 border rounded-lg overflow-hidden shadow-sm">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="font-bold text-slate-700">Item (Projeto)</TableHead>
                          <TableHead className="font-bold text-slate-700">
                            Fornecedor / Tipo
                          </TableHead>
                          <TableHead className="text-right font-bold text-slate-700">
                            Qtd Necessária
                          </TableHead>
                          <TableHead className="text-right font-bold text-slate-700">
                            Em Estoque
                          </TableHead>
                          <TableHead className="text-right font-bold text-slate-700">
                            Falta Comprar
                          </TableHead>
                          <TableHead className="text-center font-bold text-slate-700">
                            Ação
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lista.itens.map((item: any, idx: number) => {
                          const itemEstoque = estoque.find(
                            (e) =>
                              e.nome.toLowerCase().includes(item.nome.toLowerCase()) ||
                              item.nome.toLowerCase().includes(e.nome.toLowerCase()),
                          )

                          const estoqueQtd = itemEstoque ? Number(itemEstoque.quantidade) : 0
                          const falta = Math.max(0, Number(item.quantidade) - estoqueQtd)
                          const isTerceirizado =
                            itemEstoque?.terceirizado ||
                            item.nome.toLowerCase().includes('terceirizado')

                          return (
                            <TableRow key={idx} className={falta > 0 ? 'bg-red-50/20' : ''}>
                              <TableCell className="font-medium text-midnight-navy">
                                {item.nome}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col items-start gap-1">
                                  <span className="text-sm font-medium text-slate-600">
                                    {itemEstoque?.fornecedor || 'Não cadastrado no sistema'}
                                  </span>
                                  {isTerceirizado && (
                                    <Badge
                                      variant="secondary"
                                      className="bg-purple-100 text-purple-700 hover:bg-purple-100 text-xs border-purple-200"
                                    >
                                      Terceirizado
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-bold text-slate-700">
                                {item.quantidade}
                              </TableCell>
                              <TableCell className="text-right font-medium text-slate-500">
                                {estoqueQtd}
                              </TableCell>
                              <TableCell className="text-right">
                                {falta > 0 ? (
                                  <span className="text-red-600 font-bold bg-red-100 px-2 py-1 rounded-md">
                                    {falta}
                                  </span>
                                ) : (
                                  <span className="text-emerald-600 font-bold bg-emerald-100 px-2 py-1 rounded-md">
                                    OK
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {falta > 0 && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleCopiarPedido(item, itemEstoque)}
                                    className="border-steel-blue text-steel-blue hover:bg-steel-blue hover:text-white font-medium"
                                  >
                                    <Copy className="w-4 h-4 mr-1" /> Copiar Pedido
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
        {listas.length === 0 && (
          <div className="text-center py-16 bg-white border-2 border-dashed rounded-xl">
            <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-700">Nenhuma lista pendente</h3>
            <p className="text-sm mt-1 text-slate-500 max-w-md mx-auto">
              As listas de materiais importadas diretamente no perfil dos clientes (na aba de
              Documentos) aparecerão automaticamente aqui para a Zenaide conciliar.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
