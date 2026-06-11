import { useState, useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  FileText,
  Loader2,
  Copy,
  Bot,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  UploadCloud,
  AlertCircle,
} from 'lucide-react'
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
import { findBestMatch } from '@/lib/material-engine'

export function ConciliacaoListas() {
  const [listas, setListas] = useState<any[]>([])
  const [estoque, setEstoque] = useState<any[]>([])
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessingUpload, setIsProcessingUpload] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
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

      let dataUrl = ''

      if (lista.arquivo_url) {
        const { data: fileData, error: fileError } = await supabase.storage
          .from('bender_clientes')
          .download(lista.arquivo_url)

        if (fileError) {
          const { data: fallbackData, error: fallbackError } = await supabase.storage
            .from('documentos_equipe')
            .download(lista.arquivo_url)

          if (fallbackError) throw fallbackError

          if (fallbackData) {
            const buffer = await fallbackData.arrayBuffer()
            const mimeType = fallbackData.type
            if (mimeType !== 'application/pdf') {
              throw new Error('Apenas arquivos PDF são suportados para processamento automático.')
            }
            const base64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader()
              reader.onload = () => resolve((reader.result as string).split(',')[1])
              reader.onerror = reject
              reader.readAsDataURL(new Blob([buffer], { type: mimeType }))
            })
            dataUrl = `data:${mimeType};base64,${base64}`
          }
        } else if (fileData) {
          const buffer = await fileData.arrayBuffer()
          const mimeType = fileData.type
          if (mimeType !== 'application/pdf') {
            throw new Error('Apenas arquivos PDF são suportados para processamento automático.')
          }
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve((reader.result as string).split(',')[1])
            reader.onerror = reject
            reader.readAsDataURL(new Blob([buffer], { type: mimeType }))
          })
          dataUrl = `data:${mimeType};base64,${base64}`
        }
      }

      const response = await supabase.functions.invoke('financeiro-ai', {
        body: {
          action: 'ocr_lista_materiais',
          payload: { imageBase64: dataUrl, isPdf: true },
        },
      })

      if (response.error) {
        console.error('Function error:', response.error)
        throw new Error(response.error.message || 'Falha ao comunicar com a inteligência.')
      }

      let parsed = response.data
      if (typeof parsed === 'string') {
        if (parsed === '[object Object]') {
          throw new Error('Falha ao interpretar dados do OCR (recebido object).')
        }
        try {
          parsed = JSON.parse(parsed)
        } catch (e) {
          console.error('Parse error:', e, parsed)
          throw new Error('Falha ao interpretar dados do OCR.')
        }
      }

      let finalItens = parsed?.itens || []
      if (finalItens.length > 0) {
        try {
          const descricoes = finalItens.map((i: any) => i.nome)
          const normResponse = await supabase.functions.invoke('material-normalization', {
            body: { action: 'normalize_batch', items: descricoes },
          })
          if (normResponse.data && normResponse.data.results) {
            finalItens = finalItens.map((i: any, idx: number) => ({
              ...i,
              metadados_normalizados: normResponse.data.results[idx],
            }))
          }
        } catch (err) {
          console.error('Falha ao normalizar itens extraídos da lista:', err)
        }
      }

      await supabase
        .from('listas_materiais' as any)
        .update({
          status: 'conciliado',
          itens: finalItens,
          metadados_normalizados: { processado_em: new Date().toISOString() },
        })
        .eq('id', lista.id)

      toast({ title: 'Sucesso', description: 'Lista processada e conciliada com sucesso!' })
      fetchData()
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    } finally {
      setProcessingId(null)
    }
  }

  const handleUploadList = async (file: File) => {
    if (!file) return
    if (file.type !== 'application/pdf') {
      toast({
        title: 'Formato inválido',
        description: 'Por favor, envie PDF.',
        variant: 'destructive',
      })
      return
    }

    setIsProcessingUpload(true)
    try {
      toast({
        title: 'Fazendo upload da lista...',
        description: 'Enviando documento para o sistema.',
      })

      const fileName = `lista_avulsa_${Date.now()}.pdf`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documentos_equipe')
        .upload(fileName, file, { contentType: 'application/pdf' })

      if (uploadError) throw uploadError

      const { error: insertError } = await supabase.from('listas_materiais' as any).insert({
        arquivo_url: fileName,
        status: 'pendente',
      })

      if (insertError) throw insertError

      toast({
        title: 'Sucesso',
        description: 'Lista enviada. Agora você pode processá-la com a Zenaide.',
      })
      fetchData()
    } catch (e: any) {
      toast({ title: 'Erro no Upload', description: e.message, variant: 'destructive' })
    } finally {
      setIsProcessingUpload(false)
    }
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUploadList(e.dataTransfer.files[0])
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
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-lg p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-semibold text-amber-800 dark:text-amber-300">
            Atenção: Compras Externas & Terceirizados
          </h4>
          <p className="text-sm text-amber-700 dark:text-amber-400/90 mt-1">
            Fique atento aos itens com o badge "Terceirizado" e demandas que faltam no estoque. Eles
            possuem tempo de lead time maior e precisam ser encomendados com prioridade. Use o botão
            "Copiar Pedido" para agilizar a comunicação com o fornecedor.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="pt-6">
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                  isDragging
                    ? 'border-steel-blue bg-steel-blue/5 dark:border-blue-500 dark:bg-blue-900/20'
                    : 'border-gray-200 bg-gray-50 dark:border-slate-800 dark:bg-slate-900/50'
                }`}
                onDragOver={(e) => {
                  e.preventDefault()
                  setIsDragging(true)
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
              >
                {isProcessingUpload ? (
                  <div className="flex flex-col items-center">
                    <Loader2 className="h-10 w-10 text-steel-blue dark:text-blue-400 animate-spin mb-4" />
                    <p className="text-sm font-medium">Fazendo upload...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <UploadCloud className="h-10 w-10 text-gray-400 dark:text-slate-500 mb-4" />
                    <h3 className="font-semibold mb-1 dark:text-slate-200">
                      Upload de Lista (PDF)
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
                      Arraste a lista de materiais aqui
                    </p>
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-midnight-navy hover:bg-dark-denim dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                    >
                      Selecionar Arquivo
                    </Button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept=".pdf"
                      onChange={(e) => {
                        if (e.target.files) handleUploadList(e.target.files[0])
                        if (fileInputRef.current) fileInputRef.current.value = ''
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="mt-6 bg-blue-50/50 dark:bg-blue-950/30 p-4 rounded-lg border border-blue-100 dark:border-blue-900/50">
                <h4 className="text-sm font-semibold flex items-center gap-2 mb-2 text-blue-800 dark:text-blue-300">
                  <AlertCircle className="w-4 h-4" /> Inteligência da Zenaide
                </h4>
                <p className="text-xs text-blue-700/80 dark:text-blue-200/80 leading-relaxed">
                  Envie a lista de materiais em PDF. A Zenaide lerá todos os itens e fará a
                  conciliação cruzando os dados com o inventário atual, apontando exatamente o que
                  precisa ser comprado.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {listas.map((lista) => {
            const isConciliado = lista.status === 'conciliado'
            return (
              <Card
                key={lista.id}
                className="overflow-hidden border-2 dark:border-slate-800 hover:border-steel-blue/50 dark:hover:border-blue-500/50 transition-colors"
              >
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-steel-blue/10 dark:bg-blue-900/30 p-3 rounded-full">
                        <FileText className="w-6 h-6 text-steel-blue dark:text-blue-400" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-midnight-navy dark:text-slate-100">
                          Lista de Materiais{' '}
                          {lista.clientes?.nome ? `- ${lista.clientes.nome}` : '(Avulsa)'}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-slate-400">
                          Enviada em {new Date(lista.criado_em).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!isConciliado ? (
                        <Button
                          onClick={() => handleProcessarZenaide(lista)}
                          disabled={processingId === lista.id}
                          className="bg-midnight-navy hover:bg-dark-denim dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900 text-white font-bold shadow"
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
                          className="bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-900 px-3 py-1 text-sm font-bold"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1 inline" /> Processado / Conciliado
                        </Badge>
                      )}
                      {isAdmin && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDelete(lista.id)}
                          className="text-red-500 hover:bg-red-50 border-red-200 dark:text-red-400 dark:border-red-900 dark:hover:bg-red-950/50"
                          title="Apagar Lista"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {isConciliado && lista.itens && lista.itens.length > 0 && (
                    <div className="mt-6 border dark:border-slate-800 rounded-lg overflow-hidden shadow-sm">
                      <Table>
                        <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                          <TableRow>
                            <TableHead className="font-bold text-slate-700 dark:text-slate-300">
                              Item (Projeto)
                            </TableHead>
                            <TableHead className="font-bold text-slate-700 dark:text-slate-300">
                              Fornecedor / Tipo
                            </TableHead>
                            <TableHead className="text-right font-bold text-slate-700 dark:text-slate-300">
                              Qtd Necessária
                            </TableHead>
                            <TableHead className="text-right font-bold text-slate-700 dark:text-slate-300">
                              Em Estoque
                            </TableHead>
                            <TableHead className="text-right font-bold text-slate-700 dark:text-slate-300">
                              Falta Comprar
                            </TableHead>
                            <TableHead className="text-center font-bold text-slate-700 dark:text-slate-300">
                              Ação
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {lista.itens.map((item: any, idx: number) => {
                            let itemEstoque = null
                            let matchResult = null

                            if (item.metadados_normalizados) {
                              const best = findBestMatch(item.metadados_normalizados, estoque)
                              if (best.match) {
                                itemEstoque = best.match
                                matchResult = best.result
                              }
                            }

                            if (!itemEstoque) {
                              itemEstoque = estoque.find(
                                (e) =>
                                  e.nome.toLowerCase().includes(item.nome.toLowerCase()) ||
                                  item.nome.toLowerCase().includes(e.nome.toLowerCase()),
                              )
                            }

                            const estoqueQtd = itemEstoque ? Number(itemEstoque.quantidade) : 0
                            const falta = Math.max(0, Number(item.quantidade) - estoqueQtd)
                            const isTerceirizado =
                              itemEstoque?.terceirizado ||
                              item.nome.toLowerCase().includes('terceirizado')

                            return (
                              <TableRow
                                key={idx}
                                className={falta > 0 ? 'bg-red-50/20 dark:bg-red-950/20' : ''}
                              >
                                <TableCell className="font-medium text-midnight-navy dark:text-slate-100">
                                  <div className="flex flex-col gap-1">
                                    <span>{item.nome}</span>
                                    {matchResult && (
                                      <div className="flex items-center gap-2 mt-1">
                                        <Badge
                                          variant="outline"
                                          className={
                                            matchResult.status === 'EQUIVALENTE'
                                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-900 text-[10px]'
                                              : matchResult.status === 'INCERTO'
                                                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-900 text-[10px]'
                                                : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-900 text-[10px]'
                                          }
                                        >
                                          {matchResult.status} ({matchResult.confianca})
                                        </Badge>
                                        <span
                                          className="text-[10px] text-slate-500 dark:text-slate-400 max-w-[180px] truncate"
                                          title={`${matchResult.justificativa} ${matchResult.recomendacao}`}
                                        >
                                          {matchResult.justificativa}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-col items-start gap-1">
                                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                                      {itemEstoque?.fornecedor || 'Não cadastrado no sistema'}
                                    </span>
                                    {isTerceirizado && (
                                      <Badge
                                        variant="secondary"
                                        className="bg-purple-100 text-purple-700 hover:bg-purple-100 dark:bg-purple-950 dark:text-purple-300 dark:hover:bg-purple-900 text-xs border-purple-200 dark:border-purple-900"
                                      >
                                        Terceirizado
                                      </Badge>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right font-bold text-slate-700 dark:text-slate-300">
                                  {item.quantidade}
                                </TableCell>
                                <TableCell className="text-right font-medium text-slate-500 dark:text-slate-400">
                                  {estoqueQtd}
                                </TableCell>
                                <TableCell className="text-right">
                                  {falta > 0 ? (
                                    <span className="text-red-600 font-bold bg-red-100 dark:text-red-400 dark:bg-red-950/50 px-2 py-1 rounded-md">
                                      {falta}
                                    </span>
                                  ) : (
                                    <span className="text-emerald-600 font-bold bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-950/50 px-2 py-1 rounded-md">
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
                                      className="border-steel-blue text-steel-blue hover:bg-steel-blue hover:text-white dark:border-blue-500 dark:text-blue-400 dark:hover:bg-blue-600 font-medium"
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
            <div className="text-center py-16 bg-white dark:bg-slate-950 border-2 border-dashed dark:border-slate-800 rounded-xl h-full flex flex-col justify-center items-center">
              <div className="bg-slate-50 dark:bg-slate-900 w-20 h-20 rounded-full flex items-center justify-center mb-4">
                <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">
                Nenhuma lista pendente
              </h3>
              <p className="text-sm mt-1 text-slate-500 dark:text-slate-400 max-w-md">
                Faça o upload de uma lista ao lado ou importe através do perfil do cliente. As
                listas aparecerão aqui para serem conciliadas.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
