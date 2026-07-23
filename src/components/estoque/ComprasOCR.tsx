import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  FileText,
  Loader2,
  Trash2,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Eye,
  Paperclip,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { matchInvoiceItems, MatchedItem } from '@/services/estoque-matching'
import { NotaReviewPanel } from './NotaReviewPanel'
import {
  uploadInvoiceFile,
  getInvoiceSignedUrl,
  attachInvoiceFile,
  validateInvoiceFile,
} from '@/services/notas-fiscais-storage'

export function ComprasOCR() {
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [notas, setNotas] = useState<any[]>([])
  const [expandedNota, setExpandedNota] = useState<string | null>(null)
  const [attachingNotaId, setAttachingNotaId] = useState<string | null>(null)
  const [viewingUrl, setViewingUrl] = useState<string | null>(null)
  const [viewingTitle, setViewingTitle] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const attachInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    fetchNotas()
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
    if (!window.confirm('Tem certeza que deseja apagar esta nota?')) return
    await supabase.from('notas_fiscais').delete().eq('id', id)
    fetchNotas()
    toast({ title: 'Nota apagada' })
  }

  async function fetchNotas() {
    const { data } = await supabase
      .from('notas_fiscais')
      .select('*')
      .order('criado_em', { ascending: false })
    if (data) setNotas(data)
  }

  const handleViewNota = async (nota: any) => {
    if (!nota.arquivo_url) {
      toast({
        title: 'Erro ao acessar o arquivo da nota fiscal',
        description: 'Verifique se o arquivo foi enviado corretamente.',
        variant: 'destructive',
      })
      return
    }

    toast({ title: 'Gerando link de acesso...' })
    const { url, error } = await getInvoiceSignedUrl(nota.arquivo_url)

    if (error || !url) {
      toast({
        title: 'Não foi possível gerar o link de visualização',
        description: 'O arquivo pode estar ausente ou as permissões podem estar incorretas.',
        variant: 'destructive',
      })
      return
    }

    const isPdf = nota.arquivo_url.toLowerCase().endsWith('.pdf')
    if (isPdf) {
      window.open(url, '_blank')
    } else {
      setViewingUrl(url)
      setViewingTitle(`Nota: ${nota.numero_nota || nota.fornecedor}`)
    }
  }

  const handleAttachClick = (notaId: string) => {
    setAttachingNotaId(notaId)
    attachInputRef.current?.click()
  }

  const handleAttachFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const targetId = attachingNotaId
    setAttachingNotaId(null)
    if (attachInputRef.current) attachInputRef.current.value = ''
    if (!file || !targetId) return

    const validationError = validateInvoiceFile(file)
    if (validationError) {
      toast({ title: 'Arquivo inválido', description: validationError, variant: 'destructive' })
      return
    }

    toast({ title: 'Anexando arquivo...', description: 'Enviando para o armazenamento seguro.' })
    const { path, error } = await attachInvoiceFile(targetId, file)
    if (error) {
      toast({ title: 'Erro ao anexar', description: error, variant: 'destructive' })
      return
    }
    toast({ title: 'Arquivo anexado!', description: 'O documento foi vinculado à nota fiscal.' })
    fetchNotas()
  }

  const handleProcessFile = async (file: File) => {
    if (!file) return
    const validationError = validateInvoiceFile(file)
    if (validationError) {
      toast({ title: 'Formato inválido', description: validationError, variant: 'destructive' })
      return
    }

    setIsProcessing(true)
    try {
      const uploadResult = await uploadInvoiceFile(file)
      if (uploadResult.error) {
        throw new Error(uploadResult.error)
      }
      const arquivoUrl = uploadResult.path

      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64Data = reader.result as string
        const isPdf = file.type === 'application/pdf'

        toast({
          title: 'Zenaide: Processando Documento...',
          description: 'A IA está lendo a nota fiscal e normalizando os itens.',
        })

        const response = await supabase.functions.invoke('financeiro-ai', {
          body: { action: 'ocr_compras', payload: { imageBase64: base64Data, isPdf } },
        })

        if (response.error) {
          throw new Error(response.error.message || 'Falha ao comunicar com a inteligência.')
        }

        let extractedData = response.data
        if (typeof extractedData === 'string') {
          if (extractedData === '[object Object]') {
            throw new Error('Falha ao interpretar dados do OCR (recebido object).')
          }
          try {
            extractedData = JSON.parse(extractedData)
          } catch (e) {
            throw new Error('Falha ao interpretar dados do OCR.')
          }
        }

        if (extractedData?.numero_nota) {
          const { data: existente } = await supabase
            .from('notas_fiscais')
            .select('id')
            .eq('numero_nota', extractedData.numero_nota)
            .maybeSingle()
          if (existente) {
            toast({
              title: 'Documento Duplicado',
              description: `A nota ${extractedData.numero_nota} já foi processada.`,
              variant: 'destructive',
            })
            setIsProcessing(false)
            return
          }
        }

        const hasItens =
          extractedData?.itens &&
          Array.isArray(extractedData.itens) &&
          extractedData.itens.length > 0

        const { data: allItems } = await supabase
          .from('estoque_itens')
          .select('id, nome, quantidade, marca, cor, espessura_mm, largura_mm')
        const existingItems = allItems || []

        let matchedItems: MatchedItem[] = []
        let inventoryInserted = 0

        if (hasItens) {
          matchedItems = await matchInvoiceItems(extractedData.itens, existingItems)

          for (const item of matchedItems) {
            if (
              (item.status === 'matched' || (item.score !== undefined && item.score >= 85)) &&
              item.item_id
            ) {
              const existing = existingItems.find((i) => i.id === item.item_id)
              if (existing) {
                await supabase
                  .from('estoque_itens')
                  .update({
                    quantidade: Number(existing.quantidade) + Number(item.quantidade),
                    valor_unitario: item.preco_unitario > 0 ? item.preco_unitario : undefined,
                    fornecedor: extractedData?.fornecedor || 'Desconhecido',
                    atualizado_em: new Date().toISOString(),
                  })
                  .eq('id', existing.id)
                existing.quantidade = Number(existing.quantidade) + Number(item.quantidade)
                inventoryInserted++

                await supabase.from('estoque_movimentacoes').insert({
                  item_id: existing.id,
                  tipo: 'entrada',
                  quantidade: Number(item.quantidade),
                })
              }
            }
          }
        }

        const pendingCount = matchedItems.filter((i) => i.status === 'pendente_revisao').length
        const notaStatus = pendingCount > 0 ? 'pendente_revisao' : 'conciliado'

        const { error: dbError } = await supabase.from('notas_fiscais').insert({
          fornecedor: extractedData?.fornecedor || 'Desconhecido',
          valor_total: extractedData?.valor || 0,
          data_emissao: extractedData?.data_emissao || new Date().toISOString().split('T')[0],
          dados_ocr: { ...extractedData, itens: matchedItems },
          status_reconciliacao: notaStatus,
          numero_nota: extractedData?.numero_nota || `OCR-${Math.floor(Math.random() * 10000)}`,
          arquivo_url: arquivoUrl,
        })

        if (dbError) throw dbError

        if (pendingCount > 0) {
          toast({
            title: 'Documento Processado — Revisão Necessária',
            description: `${inventoryInserted} itens alocados. ${pendingCount} item(ns) precisam de verificação manual. Arquivo armazenado com segurança.`,
            variant: 'default',
          })
        } else {
          toast({
            title: 'Documento Processado e Estoque Atualizado!',
            description: `Nº: ${extractedData?.numero_nota || '-'} | Fornecedor: ${extractedData?.fornecedor || '-'} | Total: R$ ${extractedData?.valor || 0}. Arquivo armazenado.`,
          })
        }

        fetchNotas()
      }
      reader.readAsDataURL(file)
    } catch (error: any) {
      toast({
        title: 'Erro na leitura OCR',
        description: error.message || 'Falha ao conectar com o serviço de OCR.',
        variant: 'destructive',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessFile(e.dataTransfer.files[0])
    }
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  const getPendingCount = (nota: any): number => {
    const itens = nota.dados_ocr?.itens || []
    return itens.filter((i: MatchedItem) => i.status === 'pendente_revisao').length
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1">
        <Card>
          <CardContent className="pt-6">
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                isDragging
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20'
                  : 'border-gray-200 bg-gray-50 dark:border-slate-800 dark:bg-slate-900/50'
              }`}
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragging(true)
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
            >
              {isProcessing ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="h-10 w-10 text-steel-blue animate-spin mb-4" />
                  <p className="text-sm font-medium">Extraindo e normalizando dados (OCR)...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <UploadCloud className="h-10 w-10 text-gray-400 dark:text-slate-500 mb-4" />
                  <h3 className="font-semibold mb-1 dark:text-slate-200">
                    Upload de Nota Fiscal / Fatura
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
                    Arraste o PDF ou Imagem (JPG/PNG)
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
                    accept=".pdf,image/png,image/jpeg,image/jpg,application/pdf"
                    onChange={(e) => {
                      if (e.target.files) handleProcessFile(e.target.files[0])
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
                A IA extrai dados da NF, normaliza atributos técnicos e cruza com o inventário.
                Itens ambíguos ficam em "Verificar" para confirmação manual — evitando cadastros
                duplicados. O arquivo original é armazenado com segurança para auditoria.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-2">
        <Card className="h-full">
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 dark:text-slate-100">
              <FileText className="w-5 h-5 text-gray-500 dark:text-slate-400" /> Notas Fiscais
              Processadas
            </h3>
            <div className="space-y-3">
              {notas.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-slate-400 text-sm">
                  Nenhuma nota processada recentemente.
                </div>
              ) : (
                notas.map((nota) => {
                  const pendingCount = getPendingCount(nota)
                  const isPending =
                    nota.status_reconciliacao === 'pendente_revisao' || pendingCount > 0
                  const isExpanded = expandedNota === nota.id
                  return (
                    <div
                      key={nota.id}
                      className="border dark:border-slate-800 rounded-lg overflow-hidden"
                    >
                      <div
                        className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                        onClick={() => isPending && setExpandedNota(isExpanded ? null : nota.id)}
                      >
                        <div className="flex items-center gap-4">
                          {isPending ? (
                            <div className="bg-amber-100 dark:bg-amber-950 p-2 rounded-full">
                              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                            </div>
                          ) : (
                            <div className="bg-emerald-100 dark:bg-emerald-950 p-2 rounded-full">
                              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm dark:text-slate-200">
                                {nota.fornecedor}
                              </p>
                              {isPending && (
                                <Badge className="bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800 text-[10px]">
                                  Verificar ({pendingCount})
                                </Badge>
                              )}
                              {nota.arquivo_url && (
                                <Badge className="bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800 text-[10px]">
                                  <Paperclip className="w-2.5 h-2.5 mr-0.5" /> Arquivo
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-slate-400">
                              Nota: {nota.numero_nota} | Emissão:{' '}
                              {nota.data_emissao
                                ? new Date(nota.data_emissao).toLocaleDateString('pt-BR')
                                : '-'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <p className="font-bold text-sm">{formatCurrency(nota.valor_total)}</p>
                            <Badge
                              variant="outline"
                              className={
                                isPending
                                  ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-900'
                                  : 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-900'
                              }
                            >
                              {isPending ? 'Revisão Pendente' : 'Processado / Validado'}
                            </Badge>
                          </div>
                          {nota.arquivo_url ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/50"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleViewNota(nota)
                              }}
                              title="Visualizar Nota"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleAttachClick(nota.id)
                              }}
                              title="Anexar Arquivo"
                            >
                              <Paperclip className="w-4 h-4" />
                            </Button>
                          )}
                          {isPending && (
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </Button>
                          )}
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDelete(nota.id)
                              }}
                              className="text-red-500 h-6 px-2 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      {isExpanded && isPending && (
                        <div className="px-4 pb-4">
                          <NotaReviewPanel nota={nota} onResolved={fetchNotas} />
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <input
        type="file"
        ref={attachInputRef}
        className="hidden"
        accept=".pdf,image/png,image/jpeg,image/jpg,application/pdf"
        onChange={handleAttachFile}
      />

      {viewingUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => {
            setViewingUrl(null)
            setViewingTitle('')
          }}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b dark:border-slate-700">
              <h3 className="font-semibold text-sm dark:text-slate-100">{viewingTitle}</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setViewingUrl(null)
                  setViewingTitle('')
                }}
              >
                Fechar
              </Button>
            </div>
            <div className="flex-1 overflow-auto flex items-center justify-center bg-slate-100 dark:bg-slate-950">
              <img
                src={viewingUrl}
                alt={viewingTitle}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
