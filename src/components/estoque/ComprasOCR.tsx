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
  Pencil,
  Check,
  X,
  RefreshCw,
  FileQuestion,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  matchInvoiceItems,
  persistAutoMatchedAliases,
  MatchedItem,
} from '@/services/estoque-matching'
import { syncItensNotaFiscal } from '@/services/itens-nota-fiscal'
import { NotaReviewPanel } from './NotaReviewPanel'
import {
  uploadInvoiceFile,
  attachInvoiceFile,
  validateInvoiceFile,
  prepareInvoiceForOcr,
} from '@/services/notas-fiscais-storage'
import { openStorageFileInNewTab } from '@/lib/file-viewer'
import { parseNFeXml } from '@/lib/nfe-xml-parser'
import { convertPdfToImages } from '@/lib/pdf-to-images'

export function ComprasOCR() {
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [notas, setNotas] = useState<any[]>([])
  const [expandedNota, setExpandedNota] = useState<string | null>(null)
  const [attachingNotaId, setAttachingNotaId] = useState<string | null>(null)
  const [viewingNotaId, setViewingNotaId] = useState<string | null>(null)
  const [editingNotaId, setEditingNotaId] = useState<string | null>(null)
  const [editFornecedorValue, setEditFornecedorValue] = useState('')
  const [savingFornecedor, setSavingFornecedor] = useState(false)
  const [reprocessingNotaId, setReprocessingNotaId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const attachInputRef = useRef<HTMLInputElement>(null)
  const reprocessFileInputRef = useRef<HTMLInputElement>(null)
  const [reprocessTargetNota, setReprocessTargetNota] = useState<any | null>(null)
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
        title: 'Arquivo não disponível',
        description: 'Esta nota fiscal não possui arquivo vinculado.',
        variant: 'destructive',
      })
      return
    }

    setViewingNotaId(nota.id)
    try {
      const result = await openStorageFileInNewTab(nota.arquivo_url)

      if (!result.success) {
        toast({
          title: 'Erro ao carregar o arquivo',
          description:
            result.error || 'Verifique se o caminho do arquivo está correto e tente novamente.',
          variant: 'destructive',
        })
        return
      }
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar o arquivo',
        description: err?.message || 'Não foi possível abrir a nota fiscal.',
        variant: 'destructive',
      })
    } finally {
      setViewingNotaId(null)
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

  const handleSaveFornecedor = async (notaId: string) => {
    const value = editFornecedorValue.trim()
    if (!value) {
      toast({ title: 'Fornecedor inválido', variant: 'destructive' })
      return
    }
    setSavingFornecedor(true)
    try {
      const { error } = await supabase
        .from('notas_fiscais')
        .update({ fornecedor: value })
        .eq('id', notaId)
      if (error) throw error
      setNotas((prev) => prev.map((n) => (n.id === notaId ? { ...n, fornecedor: value } : n)))
      setEditingNotaId(null)
      toast({ title: 'Fornecedor atualizado!' })
    } catch (e: any) {
      toast({
        title: 'Erro ao salvar',
        description: e.message,
        variant: 'destructive',
      })
    } finally {
      setSavingFornecedor(false)
    }
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

      // Preparação unificada de arquivo via helper de serviço (PDF->Visão com fallback, XML, ou JPG/PNG)
      const prepared = await prepareInvoiceForOcr(file, convertPdfToImages)
      const isXml = prepared.isXml

      let extractedData: any = null

      if (isXml) {
        // TAREFA B: FLUXO DETERMINÍSTICO (Sem IA): XML da NF-e
        toast({
          title: 'Processando XML da NF-e...',
          description: 'Lendo dados estruturados da SEFAZ com precisão direta.',
        })

        extractedData = parseNFeXml(prepared.xmlContent || '')
      } else {
        // TAREFA A: FLUXO DE IMAGEM / PDF COM VISÃO DO GPT-4O
        let payload: any = null

        if (prepared.isPdf) {
          if (prepared.images && prepared.images.length > 0) {
            toast({
              title: 'Zenaide: Lendo Nota Fiscal em PDF...',
              description: 'Renderizando layout visual do DANFE para visão de alta precisão.',
            })
            payload = { images: prepared.images, isPdf: true }
          } else {
            toast({
              title: 'Zenaide: Lendo Nota Fiscal...',
              description: 'Processando documento via inteligência artificial.',
            })
            payload = { imageBase64: prepared.imageBase64, isPdf: true }
          }
        } else {
          // Imagem direta (JPG/PNG)
          toast({
            title: 'Zenaide: Processando Documento...',
            description: 'A IA está lendo a nota fiscal e normalizando os itens.',
          })
          payload = { imageBase64: prepared.imageBase64, isPdf: false }
        }

        const response = await supabase.functions.invoke('financeiro-ai', {
          body: { action: 'ocr_compras', payload },
        })

        if (response.error) {
          throw new Error(response.error.message || 'Falha ao comunicar com a inteligência.')
        }

        extractedData = response.data
        if (typeof extractedData === 'string') {
          if (extractedData === '[object Object]') {
            throw new Error('Falha ao interpretar dados do OCR (recebido object).')
          }
          try {
            extractedData = JSON.parse(extractedData)
          } catch {
            throw new Error('Falha ao interpretar dados do OCR.')
          }
        }
      }

      // Verificação de duplicação por número da nota
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
        extractedData?.itens && Array.isArray(extractedData.itens) && extractedData.itens.length > 0

      const { data: allItems } = await supabase
        .from('estoque_itens')
        .select('id, nome, quantidade, marca, cor, espessura_mm, largura_mm')
      const existingItems = allItems || []

      // Totais estruturados fiscais (garantir que totais do OCR sejam persistidos no dados_ocr)
      const totaisFiscais = extractedData?.totais || undefined

      // 1. Criar a nota_fiscal primeiro para obter seu ID (necessário para FK de estoque_movimentacoes e itens_nota_fiscal)
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser()

      const { data: insertedNota, error: notaInsertErr } = await supabase
        .from('notas_fiscais')
        .insert({
          fornecedor: extractedData?.fornecedor || 'Desconhecido',
          valor_total: extractedData?.valor || 0,
          data_emissao: extractedData?.data_emissao || new Date().toISOString().split('T')[0],
          dados_ocr: { ...extractedData, totais: totaisFiscais, itens: [] },
          status_reconciliacao: 'pendente_revisao',
          numero_nota: extractedData?.numero_nota || `OCR-${Math.floor(Math.random() * 10000)}`,
          arquivo_url: arquivoUrl,
        })
        .select('id')
        .single()

      if (notaInsertErr || !insertedNota) {
        throw new Error(notaInsertErr?.message || 'Falha ao registrar nota fiscal no banco.')
      }

      const notaId = insertedNota.id
      let matchedItems: MatchedItem[] = []
      let inventoryInserted = 0

      if (hasItens) {
        // Garantir _draftId em todos os itens retornados antes de qualquer processamento
        const itensWithDraftId = (extractedData.itens || []).map((it: any, idx: number) => ({
          ...it,
          _draftId:
            it._draftId ||
            (typeof crypto !== 'undefined' && crypto.randomUUID
              ? crypto.randomUUID()
              : `item-${Date.now()}-${idx}`),
        }))
        matchedItems = await matchInvoiceItems(itensWithDraftId, existingItems)
        const custosEfetivosMap = calcularCustosEfetivos(matchedItems, totaisFiscais)

        for (let i = 0; i < matchedItems.length; i++) {
          const item = matchedItems[i]
          const isEligible =
            (item.status === 'matched' || (item.score !== undefined && item.score >= 85)) &&
            !!item.item_id

          if (isEligible && item.item_id) {
            const existing = existingItems.find((it) => it.id === item.item_id)
            if (existing) {
              const custoCalc = custosEfetivosMap.get(item._draftId || i)
              const valorParaEstoque =
                custoCalc?.custo_efetivo_unitario && custoCalc.custo_efetivo_unitario > 0
                  ? custoCalc.custo_efetivo_unitario
                  : item.preco_unitario > 0
                    ? item.preco_unitario
                    : undefined

              const { error: updateItemErr } = await supabase
                .from('estoque_itens')
                .update({
                  quantidade: Number(existing.quantidade) + Number(item.quantidade),
                  valor_unitario: valorParaEstoque,
                  fornecedor: extractedData?.fornecedor || 'Desconhecido',
                  atualizado_em: new Date().toISOString(),
                })
                .eq('id', existing.id)
              if (updateItemErr) {
                console.error(
                  `Erro ao atualizar estoque para o item ${item.produto}:`,
                  updateItemErr.message,
                )
                // Se a atualização falhou, item NÃO pode ficar como matched
                matchedItems[i] = {
                  ...item,
                  status: 'pendente_revisao',
                }
                continue
              }

              // Inserir movimentação com nota_fiscal_id e usuario_id
              const { error: movErr } = await supabase.from('estoque_movimentacoes').insert({
                item_id: existing.id,
                tipo: 'entrada',
                quantidade: Number(item.quantidade),
                nota_fiscal_id: notaId,
                usuario_id: currentUser?.id || null,
              })

              if (movErr) {
                console.error(
                  `Erro ao registrar movimentação de estoque para ${item.produto}:`,
                  movErr.message,
                )
                // Rollback da quantidade de estoque somada
                await supabase
                  .from('estoque_itens')
                  .update({
                    quantidade: Number(existing.quantidade),
                    atualizado_em: new Date().toISOString(),
                  })
                  .eq('id', existing.id)

                matchedItems[i] = {
                  ...item,
                  status: 'pendente_revisao',
                }
                continue
              }

              // Sucesso no estoque e movimentação
              existing.quantidade = Number(existing.quantidade) + Number(item.quantidade)
              inventoryInserted++
            } else {
              matchedItems[i] = {
                ...item,
                status: 'pendente_revisao',
              }
            }
          }
        }

        await persistAutoMatchedAliases(matchedItems, currentUser?.id)
      }

      const pendingCount = matchedItems.filter((i) => i.status === 'pendente_revisao').length
      // Se não há itens lidos, não pode ser conciliado (deve ir como pendente ou pendente_revisao)
      const notaStatus =
        !hasItens || matchedItems.length === 0
          ? 'pendente'
          : pendingCount > 0
            ? 'pendente_revisao'
            : 'conciliado'

      // Atualizar dados_ocr e status da nota criada (incluindo totais)
      const { error: updateNotaErr } = await supabase
        .from('notas_fiscais')
        .update({
          dados_ocr: { ...extractedData, totais: totaisFiscais, itens: matchedItems },
          status_reconciliacao: notaStatus,
        })
        .eq('id', notaId)
      if (updateNotaErr) {
        console.error('Erro ao atualizar status final da nota:', updateNotaErr.message)
      }

      // Correção (4): Gravar itens na tabela itens_nota_fiscal
      if (matchedItems.length > 0) {
        await syncItensNotaFiscal(notaId, matchedItems)
      }

      if (pendingCount > 0) {
        toast({
          title: isXml
            ? 'XML da NF-e Processado — Revisão Necessária'
            : 'Documento Processado — Revisão Necessária',
          description: `${inventoryInserted} itens alocados. ${pendingCount} item(ns) precisam de verificação manual. Arquivo armazenado com segurança.`,
          variant: 'default',
        })
      } else {
        toast({
          title: isXml
            ? 'XML da NF-e Importado com Sucesso!'
            : 'Documento Processado e Estoque Atualizado!',
          description: `Nº: ${extractedData?.numero_nota || '-'} | Fornecedor: ${extractedData?.fornecedor || '-'} | Total: R$ ${extractedData?.valor || 0}. Arquivo armazenado.`,
        })
      }

      fetchNotas()
    } catch (error: any) {
      toast({
        title: 'Erro no processamento da nota',
        description: error.message || 'Falha ao processar o arquivo da nota fiscal.',
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

  const handleReprocessExisting = async (nota: any) => {
    if (!nota.arquivo_url) {
      // Sem arquivo anexado: abre o file picker para selecionar o arquivo e reprocessar direto nesta nota
      setReprocessTargetNota(nota)
      reprocessFileInputRef.current?.click()
      return
    }

    setReprocessingNotaId(nota.id)
    toast({
      title: 'Reprocessando arquivo anexado...',
      description: 'Baixando documento e executando leitura novamente.',
    })

    try {
      // 1. Baixar o arquivo do Supabase Storage
      const { data: fileBlob, error: downloadErr } = await supabase.storage
        .from('comprovantes')
        .download(nota.arquivo_url)

      if (downloadErr || !fileBlob) {
        throw new Error(
          downloadErr?.message || 'Não foi possível baixar o arquivo do armazenamento.',
        )
      }

      const fileName = nota.arquivo_url.split('/').pop() || 'nota.pdf'
      const file = new File([fileBlob], fileName, { type: fileBlob.type })

      const prepared = await prepareInvoiceForOcr(file, convertPdfToImages)
      const isXml = prepared.isXml

      let extractedData: any = null

      if (isXml) {
        extractedData = parseNFeXml(prepared.xmlContent || '')
      } else {
        let payload: any = null
        if (prepared.isPdf) {
          if (prepared.images && prepared.images.length > 0) {
            payload = { images: prepared.images, isPdf: true }
          } else {
            payload = { imageBase64: prepared.imageBase64, isPdf: true }
          }
        } else {
          payload = { imageBase64: prepared.imageBase64, isPdf: false }
        }

        const response = await supabase.functions.invoke('financeiro-ai', {
          body: { action: 'ocr_compras', payload },
        })

        if (response.error) {
          throw new Error(response.error.message || 'Falha ao comunicar com a inteligência.')
        }

        extractedData = response.data
        if (typeof extractedData === 'string') {
          try {
            extractedData = JSON.parse(extractedData)
          } catch {
            throw new Error('Falha ao interpretar dados do OCR.')
          }
        }
      }

      const hasItens =
        extractedData?.itens && Array.isArray(extractedData.itens) && extractedData.itens.length > 0

      const { data: allItems } = await supabase
        .from('estoque_itens')
        .select('id, nome, quantidade, marca, cor, espessura_mm, largura_mm')
      const existingItems = allItems || []
      const totaisFiscais = extractedData?.totais || undefined

      let matchedItems: MatchedItem[] = []
      let inventoryInserted = 0

      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser()

      if (hasItens) {
        const itensWithDraftId = (extractedData.itens || []).map((it: any, idx: number) => ({
          ...it,
          _draftId:
            it._draftId ||
            (typeof crypto !== 'undefined' && crypto.randomUUID
              ? crypto.randomUUID()
              : `item-${Date.now()}-${idx}`),
        }))
        matchedItems = await matchInvoiceItems(itensWithDraftId, existingItems)
        const custosEfetivosMap = calcularCustosEfetivos(matchedItems, totaisFiscais)

        for (let i = 0; i < matchedItems.length; i++) {
          const item = matchedItems[i]
          const isEligible =
            (item.status === 'matched' || (item.score !== undefined && item.score >= 85)) &&
            !!item.item_id

          if (isEligible && item.item_id) {
            const existing = existingItems.find((it) => it.id === item.item_id)
            if (existing) {
              const custoCalc = custosEfetivosMap.get(item._draftId || i)
              const valorParaEstoque =
                custoCalc?.custo_efetivo_unitario && custoCalc.custo_efetivo_unitario > 0
                  ? custoCalc.custo_efetivo_unitario
                  : item.preco_unitario > 0
                    ? item.preco_unitario
                    : undefined

              const { error: updateItemErr } = await supabase
                .from('estoque_itens')
                .update({
                  quantidade: Number(existing.quantidade) + Number(item.quantidade),
                  valor_unitario: valorParaEstoque,
                  fornecedor: extractedData?.fornecedor || nota.fornecedor || 'Desconhecido',
                  atualizado_em: new Date().toISOString(),
                })
                .eq('id', existing.id)
              if (updateItemErr) {
                matchedItems[i] = { ...item, status: 'pendente_revisao' }
                continue
              }

              const { error: movErr } = await supabase.from('estoque_movimentacoes').insert({
                item_id: existing.id,
                tipo: 'entrada',
                quantidade: Number(item.quantidade),
                nota_fiscal_id: nota.id,
                usuario_id: currentUser?.id || null,
              })

              if (movErr) {
                await supabase
                  .from('estoque_itens')
                  .update({
                    quantidade: Number(existing.quantidade),
                    atualizado_em: new Date().toISOString(),
                  })
                  .eq('id', existing.id)
                matchedItems[i] = { ...item, status: 'pendente_revisao' }
                continue
              }

              existing.quantidade = Number(existing.quantidade) + Number(item.quantidade)
              inventoryInserted++
            } else {
              matchedItems[i] = { ...item, status: 'pendente_revisao' }
            }
          }
        }

        await persistAutoMatchedAliases(matchedItems, currentUser?.id)
      }

      const pendingCount = matchedItems.filter((i) => i.status === 'pendente_revisao').length
      const notaStatus =
        !hasItens || matchedItems.length === 0
          ? 'pendente'
          : pendingCount > 0
            ? 'pendente_revisao'
            : 'conciliado'

      const { error: updateNotaErr } = await supabase
        .from('notas_fiscais')
        .update({
          fornecedor: extractedData?.fornecedor || nota.fornecedor,
          valor_total: extractedData?.valor || nota.valor_total,
          data_emissao: extractedData?.data_emissao || nota.data_emissao,
          dados_ocr: { ...extractedData, totais: totaisFiscais, itens: matchedItems },
          status_reconciliacao: notaStatus,
        })
        .eq('id', nota.id)
      if (updateNotaErr) throw updateNotaErr

      if (matchedItems.length > 0) {
        await syncItensNotaFiscal(nota.id, matchedItems)
      }

      toast({
        title: 'Nota reprocessada!',
        description: `${matchedItems.length} itens lidos, ${inventoryInserted} alocados.`,
      })
      fetchNotas()
    } catch (err: any) {
      toast({
        title: 'Erro ao reprocessar nota',
        description: err?.message || 'Falha na leitura.',
        variant: 'destructive',
      })
    } finally {
      setReprocessingNotaId(null)
    }
  }

  const handleReprocessFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const target = reprocessTargetNota
    setReprocessTargetNota(null)
    if (reprocessFileInputRef.current) reprocessFileInputRef.current.value = ''
    if (!file || !target) return

    const validationError = validateInvoiceFile(file)
    if (validationError) {
      toast({ title: 'Arquivo inválido', description: validationError, variant: 'destructive' })
      return
    }

    setReprocessingNotaId(target.id)
    toast({
      title: 'Enviando e processando arquivo...',
      description: 'Anexando arquivo e realizando leitura da nota.',
    })

    try {
      const { path, error: attachErr } = await attachInvoiceFile(target.id, file)
      if (attachErr || !path) {
        throw new Error(attachErr || 'Falha ao anexar arquivo.')
      }

      const prepared = await prepareInvoiceForOcr(file, convertPdfToImages)
      const isXml = prepared.isXml

      let extractedData: any = null

      if (isXml) {
        extractedData = parseNFeXml(prepared.xmlContent || '')
      } else {
        let payload: any = null
        if (prepared.isPdf) {
          if (prepared.images && prepared.images.length > 0) {
            payload = { images: prepared.images, isPdf: true }
          } else {
            payload = { imageBase64: prepared.imageBase64, isPdf: true }
          }
        } else {
          payload = { imageBase64: prepared.imageBase64, isPdf: false }
        }

        const response = await supabase.functions.invoke('financeiro-ai', {
          body: { action: 'ocr_compras', payload },
        })

        if (response.error) {
          throw new Error(response.error.message || 'Falha ao comunicar com a inteligência.')
        }

        extractedData = response.data
        if (typeof extractedData === 'string') {
          try {
            extractedData = JSON.parse(extractedData)
          } catch {
            throw new Error('Falha ao interpretar dados do OCR.')
          }
        }
      }

      const hasItens =
        extractedData?.itens && Array.isArray(extractedData.itens) && extractedData.itens.length > 0

      const { data: allItems } = await supabase
        .from('estoque_itens')
        .select('id, nome, quantidade, marca, cor, espessura_mm, largura_mm')
      const existingItems = allItems || []
      const totaisFiscais = extractedData?.totais || undefined

      let matchedItems: MatchedItem[] = []
      let inventoryInserted = 0

      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser()

      if (hasItens) {
        const itensWithDraftId = (extractedData.itens || []).map((it: any, idx: number) => ({
          ...it,
          _draftId:
            it._draftId ||
            (typeof crypto !== 'undefined' && crypto.randomUUID
              ? crypto.randomUUID()
              : `item-${Date.now()}-${idx}`),
        }))
        matchedItems = await matchInvoiceItems(itensWithDraftId, existingItems)
        const custosEfetivosMap = calcularCustosEfetivos(matchedItems, totaisFiscais)

        for (let i = 0; i < matchedItems.length; i++) {
          const item = matchedItems[i]
          const isEligible =
            (item.status === 'matched' || (item.score !== undefined && item.score >= 85)) &&
            !!item.item_id

          if (isEligible && item.item_id) {
            const existing = existingItems.find((it) => it.id === item.item_id)
            if (existing) {
              const custoCalc = custosEfetivosMap.get(item._draftId || i)
              const valorParaEstoque =
                custoCalc?.custo_efetivo_unitario && custoCalc.custo_efetivo_unitario > 0
                  ? custoCalc.custo_efetivo_unitario
                  : item.preco_unitario > 0
                    ? item.preco_unitario
                    : undefined

              const { error: updateItemErr } = await supabase
                .from('estoque_itens')
                .update({
                  quantidade: Number(existing.quantidade) + Number(item.quantidade),
                  valor_unitario: valorParaEstoque,
                  fornecedor: extractedData?.fornecedor || target.fornecedor || 'Desconhecido',
                  atualizado_em: new Date().toISOString(),
                })
                .eq('id', existing.id)
              if (updateItemErr) {
                matchedItems[i] = { ...item, status: 'pendente_revisao' }
                continue
              }

              const { error: movErr } = await supabase.from('estoque_movimentacoes').insert({
                item_id: existing.id,
                tipo: 'entrada',
                quantidade: Number(item.quantidade),
                nota_fiscal_id: target.id,
                usuario_id: currentUser?.id || null,
              })

              if (movErr) {
                await supabase
                  .from('estoque_itens')
                  .update({
                    quantidade: Number(existing.quantidade),
                    atualizado_em: new Date().toISOString(),
                  })
                  .eq('id', existing.id)
                matchedItems[i] = { ...item, status: 'pendente_revisao' }
                continue
              }

              existing.quantidade = Number(existing.quantidade) + Number(item.quantidade)
              inventoryInserted++
            } else {
              matchedItems[i] = { ...item, status: 'pendente_revisao' }
            }
          }
        }

        await persistAutoMatchedAliases(matchedItems, currentUser?.id)
      }

      const pendingCount = matchedItems.filter((i) => i.status === 'pendente_revisao').length
      const notaStatus =
        !hasItens || matchedItems.length === 0
          ? 'pendente'
          : pendingCount > 0
            ? 'pendente_revisao'
            : 'conciliado'

      const { error: updateNotaErr } = await supabase
        .from('notas_fiscais')
        .update({
          fornecedor: extractedData?.fornecedor || target.fornecedor,
          valor_total: extractedData?.valor || target.valor_total,
          data_emissao: extractedData?.data_emissao || target.data_emissao,
          dados_ocr: { ...extractedData, totais: totaisFiscais, itens: matchedItems },
          status_reconciliacao: notaStatus,
        })
        .eq('id', target.id)
      if (updateNotaErr) throw updateNotaErr

      if (matchedItems.length > 0) {
        await syncItensNotaFiscal(target.id, matchedItems)
      }

      toast({
        title: 'Arquivo processado!',
        description: `${matchedItems.length} itens lidos e vinculados.`,
      })
      fetchNotas()
    } catch (err: any) {
      toast({
        title: 'Erro ao processar arquivo',
        description: err?.message || 'Falha na leitura.',
        variant: 'destructive',
      })
    } finally {
      setReprocessingNotaId(null)
    }
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
                  : 'border-border bg-muted dark:bg-muted'
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
                  <p className="text-sm font-medium">
                    Lendo e normalizando dados da nota fiscal...
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <UploadCloud className="h-10 w-10 text-gray-400 dark:text-slate-500 mb-4" />
                  <h3 className="font-semibold mb-1 dark:text-slate-200">
                    Importar Nota Fiscal (XML, PDF ou Foto)
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
                    Arraste o XML da NF-e, PDF ou Foto (JPG/PNG)
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
                    accept=".pdf,image/png,image/jpeg,image/jpg,application/pdf,.xml,text/xml,application/xml"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) handleProcessFile(e.target.files[0])
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                  />
                </div>
              )}
            </div>
            <div className="mt-6 bg-blue-50/50 dark:bg-blue-950/30 p-4 rounded-lg border border-blue-100 dark:border-blue-900/50">
              <h4 className="text-sm font-semibold flex items-center gap-2 mb-2 text-blue-800 dark:text-blue-300">
                <AlertCircle className="w-4 h-4" /> Leitor de Notas Fiscais
              </h4>
              <p className="text-xs text-blue-700/80 dark:text-blue-200/80 leading-relaxed">
                O sistema lê notas fiscais via XML (precisão 100% direta) ou via IA inteligente para
                fotos e PDFs. Cruza itens com o estoque e permite editar qualquer dado antes de
                salvar. O arquivo original é armazenado com segurança para auditoria.
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
                  const totalItensLidos = (nota.dados_ocr?.itens || []).length
                  const isSemItens =
                    nota.status_reconciliacao === 'pendente' && totalItensLidos === 0
                  const isPending =
                    !isSemItens &&
                    (nota.status_reconciliacao === 'pendente_revisao' || pendingCount > 0)
                  const isExpanded = expandedNota === nota.id
                  const isReprocessing = reprocessingNotaId === nota.id
                  return (
                    <div key={nota.id} className="border border-border rounded-lg overflow-hidden">
                      <div
                        className="flex items-center justify-between p-4 hover:bg-muted transition-colors cursor-pointer"
                        onClick={() => setExpandedNota(isExpanded ? null : nota.id)}
                      >
                        <div className="flex items-center gap-4">
                          {isSemItens ? (
                            <div className="bg-rose-100 dark:bg-rose-950 p-2 rounded-full">
                              <FileQuestion className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                            </div>
                          ) : isPending ? (
                            <div className="bg-amber-100 dark:bg-amber-950 p-2 rounded-full">
                              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                            </div>
                          ) : (
                            <div className="bg-emerald-100 dark:bg-emerald-950 p-2 rounded-full">
                              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {editingNotaId === nota.id ? (
                                <div
                                  className="flex items-center gap-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Input
                                    value={editFornecedorValue}
                                    onChange={(e) => setEditFornecedorValue(e.target.value)}
                                    className="h-6 text-sm py-0 max-w-[200px]"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSaveFornecedor(nota.id)
                                      if (e.key === 'Escape') setEditingNotaId(null)
                                    }}
                                  />
                                  <Button
                                    size="sm"
                                    className="h-6 w-6 p-0 bg-emerald-600 hover:bg-emerald-700"
                                    onClick={() => handleSaveFornecedor(nota.id)}
                                    disabled={savingFornecedor}
                                  >
                                    {savingFornecedor ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <Check className="w-3 h-3" />
                                    )}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0"
                                    onClick={() => setEditingNotaId(null)}
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <p className="font-medium text-sm dark:text-slate-200">
                                    {nota.fornecedor}
                                  </p>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 w-5 p-0 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setEditingNotaId(nota.id)
                                      setEditFornecedorValue(nota.fornecedor)
                                    }}
                                    title="Editar fornecedor"
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </Button>
                                </div>
                              )}
                              {isSemItens ? (
                                <Badge className="bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-400 dark:border-rose-800 text-[10px]">
                                  Sem itens lidos (0)
                                </Badge>
                              ) : isPending ? (
                                <Badge className="bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800 text-[10px]">
                                  Verificar ({pendingCount})
                                </Badge>
                              ) : null}
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
                          </div>{' '}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <p className="font-bold text-sm">{formatCurrency(nota.valor_total)}</p>
                            <Badge
                              variant="outline"
                              className={
                                isSemItens
                                  ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950 dark:text-rose-400 dark:border-rose-900'
                                  : isPending
                                    ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-900'
                                    : 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-900'
                              }
                            >
                              {isSemItens
                                ? 'Sem itens lidos / Reprocessar'
                                : isPending
                                  ? 'Revisão Pendente'
                                  : 'Processado / Validado'}
                            </Badge>
                          </div>
                          {/* Botão de Reprocessar (especialmente útil para notas sem itens ou que precisam de releitura) */}
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isReprocessing}
                            className={`h-8 text-xs gap-1 ${
                              isSemItens
                                ? 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                                : 'text-slate-600 dark:text-slate-300'
                            }`}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleReprocessExisting(nota)
                            }}
                            title={
                              nota.arquivo_url
                                ? 'Reprocessar arquivo da nota'
                                : 'Anexar e reprocessar arquivo desta nota'
                            }
                          >
                            {isReprocessing ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <RefreshCw className="w-3.5 h-3.5" />
                            )}
                            <span className="hidden sm:inline">Reprocessar</span>
                          </Button>{' '}
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
                              {viewingNotaId === nota.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
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
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </Button>
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
                      {isExpanded && (
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
        accept=".pdf,image/png,image/jpeg,image/jpg,application/pdf,.xml,text/xml,application/xml"
        onChange={handleAttachFile}
      />
      <input
        type="file"
        ref={reprocessFileInputRef}
        className="hidden"
        accept=".pdf,image/png,image/jpeg,image/jpg,application/pdf,.xml,text/xml,application/xml"
        onChange={handleReprocessFileSelected}
      />
    </div>
  )
}
