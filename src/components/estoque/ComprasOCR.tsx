import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { UploadCloud, CheckCircle2, AlertCircle, FileText, Loader2, Trash2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'

export function ComprasOCR() {
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [notas, setNotas] = useState<any[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
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
      .from('notas_fiscais' as any)
      .select('*')
      .order('criado_em', { ascending: false })
    if (data) setNotas(data)
  }

  const handleProcessFile = async (file: File) => {
    if (!file) return
    if (file.type !== 'application/pdf' && !file.type.startsWith('image/')) {
      toast({
        title: 'Formato inválido',
        description: 'Por favor, envie PDF ou Imagens (JPG/PNG).',
        variant: 'destructive',
      })
      return
    }

    setIsProcessing(true)
    try {
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64Data = reader.result as string
        const isPdf = file.type === 'application/pdf'

        toast({
          title: 'Zenaide: Processando Documento...',
          description: 'A IA está lendo a nota fiscal para extrair os dados.',
        })

        const response = await supabase.functions.invoke('financeiro-ai', {
          body: {
            action: 'ocr_compras',
            payload: { imageBase64: base64Data, isPdf },
          },
        })

        if (response.error) throw response.error

        let extractedData = response.data
        if (typeof extractedData === 'string') {
          try {
            extractedData = JSON.parse(extractedData)
          } catch (e) {
            console.error('Failed to parse OCR response', e)
            throw new Error('Falha ao interpretar dados do OCR.')
          }
        }

        if (extractedData?.numero_nota) {
          const { data: existente } = await supabase
            .from('notas_fiscais' as any)
            .select('id')
            .eq('numero_nota', extractedData.numero_nota)
            .maybeSingle()

          if (existente) {
            toast({
              title: 'Documento Duplicado',
              description: `A nota ${extractedData.numero_nota} já foi processada anteriormente.`,
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

        // Save to database
        const { data: newNota, error: dbError } = await supabase
          .from('notas_fiscais' as any)
          .insert({
            fornecedor: extractedData?.fornecedor || 'Desconhecido',
            valor_total: extractedData?.valor || 0,
            data_emissao: extractedData?.data_emissao || new Date().toISOString().split('T')[0],
            dados_ocr: extractedData,
            status_reconciliacao: hasItens ? 'conciliado' : 'pendente',
            numero_nota: extractedData?.numero_nota || `OCR-${Math.floor(Math.random() * 10000)}`,
          })
          .select()
          .single()

        if (dbError) throw dbError

        // População Automática do Inventário
        let inventoryInserted = 0
        if (hasItens && newNota) {
          for (const item of extractedData.itens) {
            const nomeProduto = item.produto || 'Item Desconhecido'
            const qtd = Number(item.quantidade) || 1
            const precoUnitario = Number(item.preco_unitario) || 0

            const { data: existingItem } = await supabase
              .from('estoque_itens')
              .select('id, quantidade')
              .ilike('nome', `%${nomeProduto}%`)
              .limit(1)
              .maybeSingle()

            let itemId = ''
            if (existingItem) {
              itemId = existingItem.id
              await supabase
                .from('estoque_itens')
                .update({
                  quantidade: Number(existingItem.quantidade) + qtd,
                  valor_unitario: precoUnitario,
                  fornecedor: extractedData?.fornecedor || 'Desconhecido',
                  atualizado_em: new Date().toISOString(),
                })
                .eq('id', existingItem.id)
            } else {
              const { data: insertedItem } = await supabase
                .from('estoque_itens')
                .insert({
                  nome: nomeProduto,
                  quantidade: qtd,
                  valor_unitario: precoUnitario,
                  fornecedor: extractedData?.fornecedor || 'Desconhecido',
                  unidade: 'un',
                  estoque_minimo: 5,
                })
                .select('id')
                .single()

              if (insertedItem) itemId = insertedItem.id
            }

            if (itemId) {
              inventoryInserted++
              await supabase.from('estoque_movimentacoes').insert({
                item_id: itemId,
                nota_fiscal_id: newNota.id,
                tipo: 'entrada',
                quantidade: qtd,
              })
            }
          }
        }

        toast({
          title:
            inventoryInserted > 0
              ? 'Documento Processado e Estoque Atualizado!'
              : 'Documento Validado!',
          description: `Nº Doc: ${extractedData?.numero_nota || '-'} | Fornecedor: ${extractedData?.fornecedor || '-'} | Total: R$ ${extractedData?.valor || 0}`,
          variant: 'default',
        })

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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1">
        <Card>
          <CardContent className="pt-6">
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                isDragging ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 bg-gray-50'
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
                  <p className="text-sm font-medium">Extraindo dados (OCR)...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <UploadCloud className="h-10 w-10 text-gray-400 mb-4" />
                  <h3 className="font-semibold mb-1">Upload de Nota Fiscal / Fatura</h3>
                  <p className="text-sm text-gray-500 mb-4">Arraste o PDF ou Imagem (JPG/PNG)</p>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-midnight-navy hover:bg-dark-denim"
                  >
                    Selecionar Arquivo
                  </Button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".pdf,image/png,image/jpeg,image/jpg"
                    onChange={(e) => {
                      if (e.target.files) handleProcessFile(e.target.files[0])
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                  />
                </div>
              )}
            </div>

            <div className="mt-6 bg-blue-50/50 p-4 rounded-lg border border-blue-100">
              <h4 className="text-sm font-semibold flex items-center gap-2 mb-2 text-blue-800">
                <AlertCircle className="w-4 h-4" /> Inteligência da Zenaide
              </h4>
              <p className="text-xs text-blue-700/80 leading-relaxed">
                Nossa IA utiliza OCR avançado para extrair automaticamente Fornecedor, Valor e Itens
                da sua nota fiscal. Os documentos são enviados para conciliação automática com
                Pedidos de Compra (POs).
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-2">
        <Card className="h-full">
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-500" /> Notas Fiscais Processadas
            </h3>
            <div className="space-y-3">
              {notas.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                  Nenhuma nota processada recentemente.
                </div>
              ) : (
                notas.map((nota) => (
                  <div
                    key={nota.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="bg-emerald-100 p-2 rounded-full">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{nota.fornecedor}</p>
                        <p className="text-xs text-gray-500">
                          Nota: {nota.numero_nota} | Emissão:{' '}
                          {nota.data_emissao
                            ? new Date(nota.data_emissao).toLocaleDateString('pt-BR')
                            : '-'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">{formatCurrency(nota.valor_total)}</p>
                      <div className="flex flex-col items-end gap-2 mt-1">
                        <Badge
                          variant="outline"
                          className={
                            nota.status_reconciliacao === 'pendente'
                              ? 'bg-amber-50 text-amber-600 border-amber-200'
                              : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                          }
                        >
                          {nota.status_reconciliacao === 'pendente'
                            ? 'Conciliação Pendente'
                            : 'Validado'}
                        </Badge>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(nota.id)}
                            className="text-red-500 h-6 px-2 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4 mr-1" /> Apagar
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
