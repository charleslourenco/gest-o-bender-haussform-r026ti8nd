import { useState, useEffect, useMemo } from 'react'
import {
  AlertTriangle,
  AlertCircle,
  PlusCircle,
  CheckCircle2,
  Trash2,
  Pencil,
  Save,
  RotateCcw,
  Loader2,
  Tag,
  RefreshCw,
  FileSearch,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'
import { MatchedItem, calcularCustosEfetivos, matchInvoiceItems } from '@/services/estoque-matching'
import { syncItensNotaFiscal } from '@/services/itens-nota-fiscal'
import { CATEGORIAS_ESTOQUE } from './EstoqueLista'
import { NotaReviewItemCard } from './NotaReviewItemCard'
import { UnifiedItemModal } from './UnifiedItemModal'

interface NotaReviewPanelProps {
  nota: any
  onResolved: () => void
  onReprocess?: (notaId: string) => Promise<void> | void
}

export function NotaReviewPanel({ nota, onResolved, onReprocess }: NotaReviewPanelProps) {
  const { toast } = useToast()
  const [estoqueItems, setEstoqueItems] = useState<any[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [draftItens, setDraftItens] = useState<(MatchedItem & { _draftId: string })[]>([])
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [isReprocessing, setIsReprocessing] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [editingMatchedIdx, setEditingMatchedIdx] = useState<number | null>(null)
  const [showManualForm, setShowManualForm] = useState(false)
  const [manualDescricao, setManualDescricao] = useState('')
  const [manualQuantidade, setManualQuantidade] = useState<number | string>(1)
  const [manualValorUnitario, setManualValorUnitario] = useState<number | string>(0)
  const [manualUnidade, setManualUnidade] = useState('un')
  const [manualCategoria, setManualCategoria] = useState('')
  const [pendingConfirmDivergence, setPendingConfirmDivergence] = useState<{
    diff: number
    totalItens: number
    totalNota: number
  } | null>(null)

  useEffect(() => {
    fetchEstoque()
  }, [])

  async function fetchEstoque() {
    const { data } = await supabase
      .from('estoque_itens')
      .select('id, nome, quantidade, marca, cor, espessura_mm')
      .order('nome')
    if (data) setEstoqueItems(data)
  }

  const generateItemId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID()
    }
    return `item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  }

  const parseItensToDraft = (rawItens: any[]): (MatchedItem & { _draftId: string })[] => {
    let hadMissingDraftId = false
    const parsed = (rawItens || []).map((item) => {
      if (!item._draftId && !item.id) {
        hadMissingDraftId = true
      }
      const draftId = item._draftId || item.id || generateItemId()
      const qtd = Number(item.quantidade) || 1
      const pu = Number(item.preco_unitario) || 0
      const desc = item.desconto !== undefined ? Number(item.desconto) : undefined
      const pBruto = item.preco_bruto !== undefined ? Number(item.preco_bruto) : undefined
      const vUnitBruto =
        item.valor_unitario_bruto !== undefined ? Number(item.valor_unitario_bruto) : undefined

      const pt =
        item.preco_total !== undefined ? Number(item.preco_total) : Math.round(qtd * pu * 100) / 100
      return {
        _draftId: draftId,
        produto: item.produto || item.nome || '',
        quantidade: qtd,
        preco_unitario: pu,
        preco_total: pt,
        preco_bruto: pBruto,
        desconto: desc,
        valor_unitario_bruto: vUnitBruto,
        unidade: item.unidade || 'un',
        categoria: item.categoria || '',
        metadados_normalizados: item.metadados_normalizados || {},
        status: item.item_id ? item.status || 'matched' : 'pendente_revisao',
        item_id: item.item_id || null,
        source: item.source || 'none',
        confianca:
          item.confianca ||
          (item.score && item.score >= 85
            ? 'ALTA'
            : item.score && item.score >= 60
              ? 'MEDIA'
              : 'BAIXA'),
        score: item.score || 0,
      }
    })

    // Se encontramos itens antigos sem _draftId persistido no JSONB, sincronizamos em background
    // para que a associação item<->estoque e reconciliação funcionem retroativamente
    if (hadMissingDraftId && parsed.length > 0 && nota?.id) {
      const updatedDadosOcr = {
        ...(nota.dados_ocr || {}),
        itens: parsed,
      }
      supabase
        .from('notas_fiscais')
        .update({ dados_ocr: updatedDadosOcr })
        .eq('id', nota.id)
        .then(({ error }) => {
          if (error) {
            console.warn(
              '[parseItensToDraft] Falha ao persistir _draftId gerados na nota:',
              error.message,
            )
          } else {
            console.info('[parseItensToDraft] _draftId persistidos na nota', nota.id)
          }
        })
        .catch((e) => console.warn('[parseItensToDraft] Erro assíncrono ao persistir _draftId:', e))
    }

    return parsed
  }

  // Callback de atualização otimista imediata para itens resolvidos
  const handleItemResolvedOptimistic = (draftId?: string, matchedEstoqueItemId?: string) => {
    if (draftId) {
      setDraftItens((prev) =>
        prev.map((it) =>
          it._draftId === draftId
            ? {
                ...it,
                status: 'matched',
                item_id: matchedEstoqueItemId || it.item_id,
              }
            : it,
        ),
      )
    }
    // Dispara também o onResolved para sincronização
    onResolved()
  }

  useEffect(() => {
    const rawItens: any[] = nota.dados_ocr?.itens || []
    const parsed = parseItensToDraft(rawItens)

    // Se temos itens e estoque disponível, caso algum item pendente ainda não tenha item_id
    // mas o algoritmo de matching local encontre uma correspondência boa (score >= 60),
    // sugerimos o item_id no rascunho para que o card já acorde pré-selecionado (B1)
    if (parsed.length > 0 && estoqueItems.length > 0) {
      let changedAny = false
      const enhanced = parsed.map((it) => {
        if (!it.item_id && it.status === 'pendente_revisao') {
          const ranked = estoqueItems
            .map((ei) => ({
              ei,
              score:
                it.produto && ei.nome
                  ? it.produto.toLowerCase().includes(ei.nome.toLowerCase()) ||
                    ei.nome.toLowerCase().includes(it.produto.toLowerCase())
                    ? 70
                    : 0
                  : 0,
            }))
            .filter((r) => r.score >= 60)
            .sort((a, b) => b.score - a.score)

          if (ranked.length > 0) {
            changedAny = true
            return {
              ...it,
              item_id: ranked[0].ei.id,
              score: ranked[0].score,
              confianca: (ranked[0].score >= 85 ? 'ALTA' : 'MEDIA') as any,
            }
          }
        }
        return it
      })
      setDraftItens(changedAny ? enhanced : parsed)
    } else {
      setDraftItens(parsed)
    }

    setHasChanges(false)
    setEditingMatchedIdx(null)
    // Regra 3: draftItens é a ÚNICA fonte de verdade; depende apenas de nota.id (e estoqueItems para sugestões)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nota.id, estoqueItems.length > 0])

  const originalTotal = useMemo(() => {
    // Regra 5: priorizar dados_ocr_original.totais.valor_total_nota, fallback dados_ocr/valor_total
    const origTotais = (nota as any).dados_ocr_original?.totais
    if (origTotais?.valor_total_nota !== undefined && !isNaN(Number(origTotais.valor_total_nota))) {
      return Number(origTotais.valor_total_nota)
    }
    const ocrTotais = nota.dados_ocr?.totais
    if (ocrTotais?.valor_total_nota !== undefined && !isNaN(Number(ocrTotais.valor_total_nota))) {
      return Number(ocrTotais.valor_total_nota)
    }
    return Number(nota.dados_ocr?.valor || nota.dados_ocr?.valor_total || nota.valor_total || 0)
  }, [nota])

  const recalculatedTotal = useMemo(() => {
    return draftItens.reduce((acc, curr) => {
      const itemTot =
        curr.preco_total !== undefined
          ? Number(curr.preco_total)
          : Math.round(Number(curr.quantidade || 0) * Number(curr.preco_unitario || 0) * 100) / 100
      return acc + (isNaN(itemTot) ? 0 : itemTot)
    }, 0)
  }, [draftItens])

  const totalDivergence = Math.abs(recalculatedTotal - originalTotal) > 0.01

  // Dados de conciliação / totais do XML ou cálculo derivado
  const totaisXml = useMemo(() => {
    const dadosOcrTotais = nota.dados_ocr?.totais
    const somaProdutosBruto = draftItens.reduce((acc, curr) => {
      const bruto =
        curr.preco_bruto !== undefined
          ? Number(curr.preco_bruto)
          : curr.preco_total !== undefined && curr.desconto
            ? Number(curr.preco_total) + Number(curr.desconto)
            : Number(curr.quantidade || 0) * Number(curr.preco_unitario || 0)
      return acc + bruto
    }, 0)

    const somaDescontosItens = draftItens.reduce((acc, curr) => {
      return acc + (curr.desconto ? Number(curr.desconto) : 0)
    }, 0)

    return {
      valor_produtos:
        dadosOcrTotais?.valor_produtos !== undefined
          ? Number(dadosOcrTotais.valor_produtos)
          : Math.round(somaProdutosBruto * 100) / 100,
      valor_desconto:
        dadosOcrTotais?.valor_desconto !== undefined
          ? Number(dadosOcrTotais.valor_desconto)
          : Math.round(somaDescontosItens * 100) / 100,
      valor_frete: Number(dadosOcrTotais?.valor_frete || 0),
      valor_icms: Number(dadosOcrTotais?.valor_icms || 0),
      valor_ipi: Number(dadosOcrTotais?.valor_ipi || 0),
      valor_st: Number(dadosOcrTotais?.valor_st || 0),
      valor_seguro: Number(dadosOcrTotais?.valor_seguro || 0),
      valor_outras_despesas: Number(dadosOcrTotais?.valor_outras_despesas || 0),
      valor_total_nota:
        dadosOcrTotais?.valor_total_nota !== undefined
          ? Number(dadosOcrTotais.valor_total_nota)
          : originalTotal,
      somaDescontosItens: Math.round(somaDescontosItens * 100) / 100,
    }
  }, [nota.dados_ocr, draftItens, originalTotal])

  // Mapa de custos efetivos com rateio de frete/IPI/ST/seguro/outras despesas
  const custosEfetivosMap = useMemo(() => {
    return calcularCustosEfetivos(draftItens, totaisXml)
  }, [draftItens, totaisXml])

  // Manipulação de itens no rascunho local por _draftId ou índice
  const handleItemChange = (target: number | string, updated: Partial<MatchedItem>) => {
    setDraftItens((prev) => {
      const idx = typeof target === 'string' ? prev.findIndex((i) => i._draftId === target) : target
      if (idx < 0 || idx >= prev.length) return prev
      const next = [...prev]
      const current = next[idx]
      const item = { ...current, ...updated }

      // Se editou desconto ou preco_bruto diretamente, recalcula preco_total líquido e preco_unitario líquido
      if (updated.desconto !== undefined || updated.preco_bruto !== undefined) {
        const desc = Number(item.desconto || 0)
        const bruto =
          item.preco_bruto !== undefined
            ? Number(item.preco_bruto)
            : Math.round(
                Number(item.quantidade || 1) *
                  Number(item.valor_unitario_bruto || item.preco_unitario || 0) *
                  100,
              ) / 100
        const liqTotal = Math.max(0, Math.round((bruto - desc) * 100) / 100)
        item.preco_total = liqTotal
        const q = Number(item.quantidade) || 1
        item.preco_unitario = q > 0 ? Math.round((liqTotal / q) * 10000) / 10000 : liqTotal
      } else if (updated.quantidade !== undefined || updated.preco_unitario !== undefined) {
        const q = Number(item.quantidade) || 0
        const pu = Number(item.preco_unitario) || 0
        item.preco_total = Math.round(q * pu * 100) / 100
      }

      next[idx] = item
      return next
    })
    setHasChanges(true)
  }

  const handleItemDelete = (target: number | string) => {
    if (!window.confirm('Deseja remover este item da revisão da nota fiscal?')) return
    setDraftItens((prev) => {
      const idx = typeof target === 'string' ? prev.findIndex((i) => i._draftId === target) : target
      if (idx >= 0 && editingMatchedIdx === idx) {
        setEditingMatchedIdx(null)
      }
      return prev.filter((_, i) => i !== idx)
    })
    setHasChanges(true)
    toast({
      title: 'Item removido do rascunho',
      description: 'Clique em "Confirmar e Gravar Revisão" para estornar o estoque e salvar.',
    })
  }

  const handleReopenMatch = (target: number | string) => {
    setDraftItens((prev) => {
      const idx = typeof target === 'string' ? prev.findIndex((i) => i._draftId === target) : target
      if (idx < 0 || idx >= prev.length) return prev
      const next = [...prev]
      next[idx] = {
        ...next[idx],
        status: 'pendente_revisao',
        item_id: null,
      }
      return next
    })
    setHasChanges(true)
    setEditingMatchedIdx(null)
    toast({
      title: 'Item retornado para revisão',
      description:
        'Agora você pode pesquisar e associar a outro item do estoque. Ao confirmar, o estoque antigo será devolvido.',
    })
  }

  const handleReprocessInvoice = async () => {
    if (onReprocess) {
      setIsReprocessing(true)
      try {
        await onReprocess(nota.id)
      } finally {
        setIsReprocessing(false)
      }
      return
    }

    if (!nota.arquivo_url) {
      toast({
        title: 'Arquivo original não disponível',
        description:
          'Esta nota não possui o PDF ou imagem original arquivado no storage para reprocessamento.',
        variant: 'destructive',
      })
      return
    }

    setIsReprocessing(true)
    try {
      toast({
        title: 'Reprocessando nota com IA...',
        description: 'Baixando documento original e reexecutando leitura OCR.',
      })

      // Download do arquivo do storage com busca nos buckets possíveis (notas-fiscais, documentos, comprovantes)
      let fileBlob: Blob | null = null
      let downloadErr: any = null

      const cleanPath = nota.arquivo_url
        .replace(/^https?:\/\/[^/]+\/storage\/v1\/object\/(?:public|sign)\/[^/]+\//, '')
        .replace(/^\/+/, '')

      const tryBuckets = ['notas-fiscais', 'documentos', 'comprovantes']
      for (const b of tryBuckets) {
        const pathCandidate = cleanPath.startsWith(`${b}/`)
          ? cleanPath.replace(`${b}/`, '')
          : cleanPath
        const res = await supabase.storage.from(b).download(pathCandidate)
        if (res.data) {
          fileBlob = res.data
          break
        }
        downloadErr = res.error
      }

      if (!fileBlob) {
        throw new Error(downloadErr?.message || 'Não foi possível baixar o arquivo do storage')
      }

      const fileName =
        cleanPath.split('/').pop() || (nota.numero_nota ? `NF_${nota.numero_nota}.pdf` : 'nota.pdf')
      const file = new File([fileBlob], fileName, { type: fileBlob.type || 'application/pdf' })

      const { processInvoiceWithAutoReforco } = await import('@/services/compras-ocr-pipeline')
      const pipelineRes = await processInvoiceWithAutoReforco(file, {
        forceReforco: true,
        onProgress: (msg) => {
          toast({
            title: 'Reprocessando nota...',
            description: msg,
          })
        },
      })

      if (!pipelineRes || !pipelineRes.data) {
        throw new Error('A IA não retornou dados estruturados da nota fiscal')
      }

      const extracted = pipelineRes.data
      if (pipelineRes.itensRecuperadosNoReforco) {
        toast({
          title: 'Auto-Reforço Concluído!',
          description: 'Itens recuperados com sucesso na leitura reforçada em alta resolução.',
        })
      }
      const rawExtractedItens = extracted.itens || []
      const itensWithDraft = rawExtractedItens.map((it: any, idx: number) => ({
        ...it,
        _draftId: it._draftId || generateItemId(),
      }))

      // Executar matching inicial contra o estoque
      const matched = await matchInvoiceItems(itensWithDraft, estoqueItems)

      const updatedDadosOcr = {
        ...(nota.dados_ocr || {}),
        ...extracted,
        itens: matched,
      }

      const { error: updateErr } = await supabase
        .from('notas_fiscais')
        .update({
          dados_ocr: updatedDadosOcr,
          valor_total: extracted.valor_total || nota.valor_total,
          fornecedor: extracted.fornecedor || nota.fornecedor,
          numero_nota: extracted.numero_nota || nota.numero_nota,
          status_reconciliacao: matched.length > 0 ? 'pendente_revisao' : 'pendente_revisao',
        })
        .eq('id', nota.id)

      if (updateErr) throw updateErr

      setDraftItens(parseItensToDraft(matched))
      setHasChanges(false)

      toast({
        title: 'Reprocessamento concluído!',
        description: `${matched.length} item(ns) identificados na leitura.`,
      })
      onResolved()
    } catch (e: any) {
      console.error('[handleReprocessInvoice] Erro:', e)
      toast({
        title: 'Falha no reprocessamento',
        description: e.message || 'Não foi possível reprocessar a nota via IA.',
        variant: 'destructive',
      })
    } finally {
      setIsReprocessing(false)
    }
  }

  const handleAddNewBlankItem = () => {
    const newItem: MatchedItem & { _draftId: string } = {
      _draftId: generateItemId(),
      produto: '',
      quantidade: 1,
      preco_unitario: 0,
      preco_total: 0,
      preco_bruto: 0,
      desconto: 0,
      unidade: 'un',
      categoria: '',
      metadados_normalizados: {},
      status: 'pendente_revisao',
      item_id: null,
      source: 'manual',
      confianca: 'BAIXA',
      score: 0,
    }
    setDraftItens((prev) => [newItem, ...prev])
    setHasChanges(true)
    toast({
      title: 'Item em branco adicionado',
      description: 'Preencha a descrição, quantidade, preço e categoria do novo item.',
    })
  }

  const handleResetChanges = () => {
    const rawItens: any[] = nota.dados_ocr?.itens || []
    setDraftItens(parseItensToDraft(rawItens))
    setHasChanges(false)
    setEditingMatchedIdx(null)
    toast({ title: 'Alterações descartadas' })
  }

  const handleConfirmAndSave = async (skipDivergenceCheck: boolean = false) => {
    // Validações explícitas com toast visível
    if (!draftItens || draftItens.length === 0) {
      toast({
        title: 'Nenhum item na nota',
        description: 'Adicione pelo menos um item antes de salvar a revisão.',
        variant: 'destructive',
      })
      return
    }

    for (let i = 0; i < draftItens.length; i++) {
      const it = draftItens[i]
      if (!it.produto || !it.produto.trim()) {
        toast({
          title: `Item #${i + 1} sem descrição`,
          description: 'Todos os itens precisam ter um nome/descrição preenchido.',
          variant: 'destructive',
        })
        return
      }
      const qtd = Number(it.quantidade)
      if (isNaN(qtd) || qtd <= 0) {
        toast({
          title: `Item "${it.produto || `#${i + 1}`}" inválido`,
          description: 'A quantidade precisa ser um número maior que zero (> 0).',
          variant: 'destructive',
        })
        return
      }
      const pu = Number(it.preco_unitario)
      if (isNaN(pu) || pu < 0) {
        toast({
          title: `Item "${it.produto || `#${i + 1}`}" com preço inválido`,
          description: 'O preço unitário não pode ser negativo.',
          variant: 'destructive',
        })
        return
      }
    }

    // Regra 5: Antes de finalizar, comparar soma (quantidade x valor_unitario) dos drafts com o total lido.
    // Diferença > R$ 1,00 → pedir confirmação explícita antes de salvar.
    const diff = Math.abs(recalculatedTotal - originalTotal)
    if (!skipDivergenceCheck && originalTotal > 0 && diff > 1.0) {
      setPendingConfirmDivergence({
        diff,
        totalItens: recalculatedTotal,
        totalNota: originalTotal,
      })
      return
    }

    setIsSavingDraft(true)
    try {
      // Regra 4: Chamar a RPC supabase.rpc('salvar_itens_nota', { p_nota_id, p_itens })
      // p_itens: array de { produto_id, nome_produto, quantidade, unidade, valor_unitario }
      const payloadRpc = draftItens.map((d) => ({
        produto_id: d.item_id || null,
        nome_produto: (d.produto || '').trim(),
        quantidade: Number(d.quantidade) || 0,
        unidade: (d.unidade || 'UN').trim(),
        valor_unitario: Number(d.preco_unitario) || 0,
      }))

      const { data: rpcResult, error: rpcError } = await supabase.rpc('salvar_itens_nota', {
        p_nota_id: nota.id,
        p_itens: payloadRpc,
      })

      if (rpcError) {
        toast({
          title: 'Erro ao salvar itens da nota',
          description: rpcError.message || 'Falha na validação transacional dos itens.',
          variant: 'destructive',
        })
        return
      }

      // Regra 5 e 6: Gravar notas_fiscais.valor_total com o total da NOTA (com frete e impostos), NÃO a soma dos itens!
      // NUNCA sobrescrever notas_fiscais.dados_ocr com estado da tela se puder corromper; dados_ocr_original fica intocado.
      // dados_ocr guarda apenas o estado da revisão.
      const valorTotalNotaFinal = originalTotal > 0 ? originalTotal : recalculatedTotal
      const pendingCount = draftItens.filter((i) => i.status === 'pendente_revisao').length
      const novoStatus =
        draftItens.length === 0 ? 'pendente' : pendingCount > 0 ? 'pendente_revisao' : 'conciliado'

      // Manter a integridade de dados_ocr gravando itens revisados e metadados de conciliação
      const updatedDadosOcr = {
        ...(nota.dados_ocr || {}),
        itens: draftItens,
      }

      const { error: updateNotaErr } = await supabase
        .from('notas_fiscais')
        .update({
          valor_total: valorTotalNotaFinal,
          dados_ocr: updatedDadosOcr,
          status_reconciliacao: novoStatus,
        })
        .eq('id', nota.id)

      if (updateNotaErr) {
        console.warn('[NotaReviewPanel] Aviso ao atualizar dados_ocr da nota:', updateNotaErr)
      }

      toast({
        title: 'Itens da nota fiscal salvos!',
        description: `${payloadRpc.length} itens gravados com sucesso no banco de dados. Total da nota: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorTotalNotaFinal)}.`,
      })
      setHasChanges(false)
      setEditingMatchedIdx(null)
      setPendingConfirmDivergence(null)
      onResolved()
    } catch (e: any) {
      toast({
        title: 'Erro inesperado ao salvar nota',
        description: e.message || 'Ocorreu uma falha ao tentar gravar a revisão.',
        variant: 'destructive',
      })
    } finally {
      setIsSavingDraft(false)
    }
  }

  const pendingEntries = draftItens
    .map((item, idx) => ({ item, idx }))
    .filter(({ item }) => item.status === 'pendente_revisao')
  const matchedEntries = draftItens
    .map((item, idx) => ({ item, idx }))
    .filter(({ item }) => item.status === 'matched')
  const hasPending = pendingEntries.length > 0

  const formatBRL = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  return (
    <div
      className={`mt-4 border-2 rounded-lg p-4 ${
        hasPending
          ? 'border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20'
          : 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20'
      }`}
    >
      {/* Resumo do Total Recalculado vs Original */}
      <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-lg p-3 mb-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">
                Total Original da Nota
              </p>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {formatBRL(originalTotal)}
              </p>
            </div>
            <div className="h-7 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />
            <div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">
                Total Recalculado dos Itens
              </p>
              <p
                className={`text-base font-bold ${
                  totalDivergence
                    ? 'text-orange-600 dark:text-orange-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {formatBRL(recalculatedTotal)}
              </p>
            </div>
            {totalDivergence && (
              <Badge
                variant="outline"
                className="bg-orange-50 border-orange-300 text-orange-700 dark:bg-orange-950/50 dark:border-orange-800 dark:text-orange-300 text-[11px]"
              >
                Diferença: {formatBRL(recalculatedTotal - originalTotal)}
              </Badge>
            )}
            {hasChanges && (
              <Badge className="bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 text-[11px]">
                Edições não salvas
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {hasChanges && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetChanges}
                disabled={isSavingDraft || isReprocessing}
                className="text-slate-600 dark:text-slate-300"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Descartar Edições
              </Button>
            )}
            {(nota.arquivo_url || onReprocess) && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleReprocessInvoice}
                disabled={isSavingDraft || isReprocessing}
                title="Reprocessar leitura OCR do PDF original via IA"
                className="text-blue-700 border-blue-300 hover:bg-blue-50 dark:text-blue-300 dark:border-blue-700 dark:hover:bg-blue-950/40"
              >
                {isReprocessing ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5 mr-1" />
                )}
                Reprocessar com IA
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleConfirmAndSave}
              disabled={isSavingDraft || isReprocessing}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
            >
              {isSavingDraft ? (
                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5 mr-1" />
              )}
              Confirmar e Gravar Revisão
            </Button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          {hasPending ? (
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          )}
          <h4
            className={`font-bold ${
              hasPending
                ? 'text-amber-800 dark:text-amber-300'
                : 'text-emerald-800 dark:text-emerald-300'
            }`}
          >
            {hasPending
              ? `Itens para Verificação (${pendingEntries.length})`
              : `Itens Conciliados (${matchedEntries.length})`}
          </h4>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddNewBlankItem}
            className="text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-700 dark:hover:bg-emerald-950/30"
          >
            <PlusCircle className="w-4 h-4 mr-1" />
            Adicionar Item
          </Button>
        </div>
      </div>

      {matchedEntries.length > 0 && (
        <div
          className={`space-y-2 ${hasPending ? 'pb-4 mb-4 border-b dark:border-amber-700/50' : ''}`}
        >
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              Itens Conciliados / Vinculados ({matchedEntries.length})
            </span>
          </div>

          {matchedEntries.map(({ item, idx }) => {
            const isEditing = editingMatchedIdx === idx
            const currentItemTotal =
              item.preco_total !== undefined
                ? item.preco_total
                : Math.round(
                    Number(item.quantidade || 0) * Number(item.preco_unitario || 0) * 100,
                  ) / 100
            const hasItemDesconto = item.desconto !== undefined && Number(item.desconto) > 0
            const precoBrutoExibicao =
              item.preco_bruto !== undefined && Number(item.preco_bruto) > 0
                ? Number(item.preco_bruto)
                : hasItemDesconto
                  ? currentItemTotal + Number(item.desconto)
                  : undefined

            const linkedEstoque = item.item_id
              ? estoqueItems.find((e) => e.id === item.item_id)
              : null
            const custoItem = custosEfetivosMap.get(item._draftId || idx)
            const temAcrescimoEfetivo =
              custoItem?.custo_efetivo_unitario &&
              Math.abs(custoItem.custo_efetivo_unitario - (Number(item.preco_unitario) || 0)) >
                0.005

            return (
              <div
                key={item._draftId || `matched-${idx}`}
                className="bg-white dark:bg-slate-900 rounded-md p-3 border dark:border-slate-800 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                      {item.produto}
                    </span>
                    {item.categoria && (
                      <Badge variant="secondary" className="text-[10px] hidden sm:inline-flex">
                        <Tag className="w-2.5 h-2.5 mr-1" />
                        {item.categoria}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <div className="flex items-center gap-1.5 justify-end">
                        {hasItemDesconto && precoBrutoExibicao && (
                          <span className="text-xs text-slate-400 line-through">
                            {formatBRL(precoBrutoExibicao)}
                          </span>
                        )}
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {formatBRL(currentItemTotal)}
                        </span>
                      </div>
                      {hasItemDesconto && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-medium">
                          Desc: -{formatBRL(Number(item.desconto))}
                        </span>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReopenMatch(item._draftId || idx)}
                      title="Alterar vínculo no estoque"
                      className="h-7 text-xs px-2 text-blue-700 border-blue-200 hover:bg-blue-50 dark:text-blue-300 dark:border-blue-800 dark:hover:bg-blue-950/40"
                    >
                      Alterar vínculo
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingMatchedIdx(isEditing ? null : idx)}
                      title="Editar dados do item"
                      className="h-7 w-7 p-0 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleItemDelete(item._draftId || idx)}
                      title="Excluir item da nota"
                      className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Linha de resumo compacta quando não está em edição */}
                {!isEditing ? (
                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                    {linkedEstoque && (
                      <span className="text-emerald-700 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                        Vínculo: <strong>{linkedEstoque.nome}</strong>
                      </span>
                    )}
                    <span>
                      Qtd: <strong>{item.quantidade}</strong> {item.unidade || 'un'}
                    </span>
                    <span>
                      Unit. Líquido:{' '}
                      <strong className="text-emerald-700 dark:text-emerald-400">
                        {formatBRL(Number(item.preco_unitario) || 0)}
                      </strong>
                      {hasItemDesconto && item.valor_unitario_bruto && (
                        <span className="text-slate-400 line-through ml-1 text-[11px]">
                          ({formatBRL(Number(item.valor_unitario_bruto))})
                        </span>
                      )}
                    </span>
                    {hasItemDesconto && (
                      <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 text-[11px]">
                        Desconto aplicado: {formatBRL(Number(item.desconto))}
                      </span>
                    )}
                    {temAcrescimoEfetivo && custoItem && (
                      <span className="bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800 text-[11px]">
                        Líquido: {formatBRL(Number(item.preco_unitario) || 0)} · Custo efetivo no
                        estoque: <strong>{formatBRL(custoItem.custo_efetivo_unitario)}</strong> c/
                        impostos e frete
                      </span>
                    )}
                    {item.metadados_normalizados?.marca && (
                      <span>Marca: {item.metadados_normalizados.marca}</span>
                    )}
                    {item.metadados_normalizados?.cor && (
                      <span>Cor: {item.metadados_normalizados.cor}</span>
                    )}
                  </div>
                ) : (
                  /* Painel inline de edição de item conciliado */
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-md border border-slate-200 dark:border-slate-700 space-y-2 mt-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300 block mb-1">
                          Descrição / Produto *
                        </label>
                        <Input
                          value={item.produto}
                          onChange={(e) =>
                            handleItemChange(item._draftId || idx, { produto: e.target.value })
                          }
                          className="h-8 text-xs bg-white dark:bg-slate-900"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300 block mb-1">
                          Categoria
                        </label>
                        <Select
                          value={item.categoria || ''}
                          onValueChange={(val) =>
                            handleItemChange(item._draftId || idx, { categoria: val })
                          }
                        >
                          <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-900">
                            <SelectValue placeholder="Selecione categoria" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            {CATEGORIAS_ESTOQUE.map((cat) => (
                              <SelectItem key={cat} value={cat} className="text-xs">
                                {cat}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      <div>
                        <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300 block mb-1">
                          Quantidade (&gt;0) *
                        </label>
                        <Input
                          type="number"
                          min="0.001"
                          step="any"
                          value={item.quantidade}
                          onChange={(e) => {
                            const qtd = parseFloat(e.target.value) || 0
                            handleItemChange(item._draftId || idx, { quantidade: qtd })
                          }}
                          className="h-8 text-xs bg-white dark:bg-slate-900"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300 block mb-1">
                          Unidade
                        </label>
                        <Input
                          value={item.unidade || ''}
                          onChange={(e) =>
                            handleItemChange(item._draftId || idx, { unidade: e.target.value })
                          }
                          placeholder="un, m², rolo..."
                          className="h-8 text-xs bg-white dark:bg-slate-900"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300 block mb-1">
                          Preço Unit. Líquido (R$)
                        </label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.preco_unitario}
                          onChange={(e) => {
                            const pu = parseFloat(e.target.value) || 0
                            handleItemChange(item._draftId || idx, { preco_unitario: pu })
                          }}
                          className="h-8 text-xs bg-white dark:bg-slate-900"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300 block mb-1">
                          Desconto Item (R$)
                        </label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.desconto || 0}
                          onChange={(e) => {
                            const desc = parseFloat(e.target.value) || 0
                            handleItemChange(item._draftId || idx, { desconto: desc })
                          }}
                          className="h-8 text-xs bg-white dark:bg-slate-900"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300 block mb-1">
                          Total Líquido (R$)
                        </label>
                        <div className="h-8 px-2 flex items-center font-bold text-xs bg-white dark:bg-slate-900 border rounded-md text-emerald-700 dark:text-emerald-400">
                          {formatBRL(currentItemTotal)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {draftItens.length === 0 ? (
        <div className="p-6 bg-amber-50 dark:bg-amber-950/30 border-2 border-dashed border-amber-300 dark:border-amber-800 rounded-lg text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h5 className="text-base font-bold text-amber-900 dark:text-amber-200">
              Nenhum item foi lido nesta nota fiscal
            </h5>
            <p className="text-xs text-amber-700 dark:text-amber-300 max-w-md mx-auto mt-1">
              Notas escaneadas ou com layout incomum podem vir da IA sem a extração automática da
              tabela de itens. Você pode reprocessar com IA usando a leitura reforçada ou adicionar
              os itens diretamente abaixo para associá-los ao estoque.
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-1 flex-wrap">
            {(nota.arquivo_url || onReprocess) && (
              <Button
                variant="outline"
                size="default"
                onClick={handleReprocessInvoice}
                disabled={isReprocessing}
                className="bg-white dark:bg-slate-900 border-blue-400 text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:border-blue-700 font-medium px-4 shadow-xs"
              >
                {isReprocessing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2 text-blue-600" />
                )}
                Reprocessar com IA (Leitura Reforçada)
              </Button>
            )}
            <Button
              size="default"
              onClick={() => setShowManualForm((prev) => !prev)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 shadow-xs text-sm"
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              {showManualForm ? 'Fechar Entrada Manual' : 'Adicionar Itens Manualmente'}
            </Button>
          </div>

          {/* Formulário de entrada manual em destaque dentro do quadro de aviso */}
          {showManualForm && (
            <div className="mt-4 p-4 bg-white dark:bg-slate-900 rounded-lg border-2 border-emerald-500/40 text-left shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b dark:border-slate-800">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                  Novo Item da Nota
                </span>
                <span className="text-[11px] text-slate-500">
                  O item entrará no rascunho com _draftId e poderá ser associado ao estoque
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300 block mb-1">
                    Descrição do Produto / Material *
                  </label>
                  <Input
                    placeholder="Ex: MDF Branco TX 15mm 2 Faces"
                    value={manualDescricao}
                    onChange={(e) => setManualDescricao(e.target.value)}
                    className="h-8 text-xs"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300 block mb-1">
                    Categoria
                  </label>
                  <Select value={manualCategoria} onValueChange={setManualCategoria}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Selecione categoria" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {CATEGORIAS_ESTOQUE.map((cat) => (
                        <SelectItem key={cat} value={cat} className="text-xs">
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300 block mb-1">
                    Quantidade *
                  </label>
                  <Input
                    type="number"
                    min="0.001"
                    step="any"
                    value={manualQuantidade}
                    onChange={(e) => setManualQuantidade(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300 block mb-1">
                    Unidade
                  </label>
                  <Input
                    placeholder="un, m², chapa, barra..."
                    value={manualUnidade}
                    onChange={(e) => setManualUnidade(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300 block mb-1">
                    Valor Unitário Líquido (R$)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={manualValorUnitario}
                    onChange={(e) => setManualValorUnitario(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowManualForm(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    const desc = manualDescricao.trim()
                    if (!desc) {
                      toast({
                        title: 'Descrição obrigatória',
                        description: 'Informe a descrição do produto.',
                        variant: 'destructive',
                      })
                      return
                    }
                    const qtd = Number(manualQuantidade) || 1
                    const pu = Number(manualValorUnitario) || 0
                    const pt = Math.round(qtd * pu * 100) / 100

                    const newItem: MatchedItem & { _draftId: string } = {
                      _draftId: generateItemId(),
                      produto: desc,
                      quantidade: qtd,
                      preco_unitario: pu,
                      preco_total: pt,
                      preco_bruto: pt,
                      desconto: 0,
                      unidade: manualUnidade || 'un',
                      categoria: manualCategoria || '',
                      metadados_normalizados: {},
                      status: 'pendente_revisao',
                      item_id: null,
                      source: 'manual',
                      confianca: 'BAIXA',
                      score: 0,
                    }

                    setDraftItens((prev) => [newItem, ...prev])
                    setHasChanges(true)
                    setShowManualForm(false)
                    setManualDescricao('')
                    setManualQuantidade(1)
                    setManualValorUnitario(0)
                    setManualUnidade('un')
                    setManualCategoria('')
                    toast({
                      title: 'Item adicionado à nota!',
                      description: 'Você já pode vinculá-lo a um item do estoque abaixo.',
                    })
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
                  Incluir no Rascunho
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : hasPending ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">
              Itens Aguardando Verificação ({pendingEntries.length})
            </span>
          </div>
          {pendingEntries.map(({ item, idx }) => {
            const custoItem = custosEfetivosMap.get(item._draftId || idx)
            return (
              <NotaReviewItemCard
                key={item._draftId || `pending-${idx}`}
                item={item}
                realIdx={idx}
                notaId={nota.id}
                notaFornecedor={nota.fornecedor}
                estoqueItems={estoqueItems}
                onResolved={onResolved}
                onItemResolved={handleItemResolvedOptimistic}
                custoEfetivoUnitario={custoItem?.custo_efetivo_unitario}
                acrescimoRateado={custoItem?.acrescimo_rateado}
                onItemChange={handleItemChange}
                onItemDelete={handleItemDelete}
              />
            )
          })}
        </div>
      ) : (
        matchedEntries.length === 0 && (
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
            Nenhum item encontrado. Use "Adicionar Item" para incluir itens na nota fiscal.
          </p>
        )
      )}

      {/* 3. AVISO DE DIVERGÊNCIA INLINE (Quando soma dos itens líquidos ≠ total da nota vNF) */}
      {totalDivergence && (
        <div className="mt-4 p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-lg text-amber-900 dark:text-amber-200">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs leading-relaxed">
              <p className="font-semibold text-sm mb-1 text-amber-800 dark:text-amber-300">
                Aviso: Divergência entre soma dos itens e total da nota fiscal
              </p>
              <p>
                A soma dos itens líquidos ({formatBRL(recalculatedTotal)}) difere do total da nota (
                {formatBRL(originalTotal)}) em{' '}
                <strong className="underline">
                  {formatBRL(Math.abs(recalculatedTotal - originalTotal))}
                </strong>
                .
              </p>
              <p className="mt-1 text-slate-600 dark:text-slate-400">
                Essa diferença geralmente decorre de <strong>frete</strong>,{' '}
                <strong>impostos adicionais (IPI, ICMS-ST)</strong> ou{' '}
                <strong>descontos globais</strong> da nota (consulte a tabela de conciliação
                abaixo). Você pode confirmar o rascunho normalmente ou editar os itens se
                necessário.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. RODAPÉ DE CONCILIAÇÃO DA NOTA FISCAL (Extraído do grupo total/icmsTot do XML) */}
      <div className="mt-4 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-lg p-4 shadow-xs">
        <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide mb-3 flex items-center justify-between">
          <span>Conciliação Financeira da Nota Fiscal (Totais SEFAZ)</span>
          <Badge variant="outline" className="text-[10px] font-normal">
            Grupo ICMSTot
          </Badge>
        </h5>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded border dark:border-slate-800">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
              1. Produtos (vProd)
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
              {formatBRL(totaisXml.valor_produtos)}
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded border dark:border-slate-800">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
              2. Descontos (vDesc)
            </span>
            <span
              className={`font-semibold text-sm ${
                totaisXml.valor_desconto > 0 || totaisXml.somaDescontosItens > 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              -{formatBRL(totaisXml.valor_desconto || totaisXml.somaDescontosItens)}
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded border dark:border-slate-800">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
              3. Frete (vFrete)
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
              +{formatBRL(totaisXml.valor_frete)}
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded border dark:border-slate-800">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
              4. Impostos (IPI + ST)
            </span>
            <div className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
              +{formatBRL(totaisXml.valor_ipi + totaisXml.valor_st)}
            </div>
            {(totaisXml.valor_ipi > 0 || totaisXml.valor_st > 0 || totaisXml.valor_icms > 0) && (
              <span className="text-[10px] text-slate-400 block mt-0.5">
                IPI: {formatBRL(totaisXml.valor_ipi)} | ST: {formatBRL(totaisXml.valor_st)}
                {totaisXml.valor_icms > 0 ? ` | ICMS: ${formatBRL(totaisXml.valor_icms)}` : ''}
              </span>
            )}
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded border dark:border-slate-800">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
              5. Soma Itens Líquidos
            </span>
            <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
              {formatBRL(recalculatedTotal)}
            </span>
          </div>

          <div className="bg-emerald-50 dark:bg-emerald-950/30 p-2.5 rounded border border-emerald-200 dark:border-emerald-800">
            <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium block">
              6. Total da Nota (vNF)
            </span>
            <span className="font-bold text-emerald-800 dark:text-emerald-300 text-sm">
              {formatBRL(originalTotal)}
            </span>
          </div>
        </div>

        <p className="text-[11px] text-slate-400 mt-2.5">
          * Os custos unitários gravados no estoque incorporam o{' '}
          <strong>custo efetivo unitário</strong> com rateio proporcional de frete, IPI e
          substituição tributária (ST), garantindo precisão contábil e orçamentária dos projetos.
        </p>
      </div>

      {showAddModal && (
        <UnifiedItemModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          mode="create"
          notaId={nota.id}
          notaFornecedor={nota.fornecedor}
          onSaved={(draftId, matchedId) => {
            setShowAddModal(false)
            handleItemResolvedOptimistic(draftId, matchedId)
          }}
        />
      )}

      {/* Diálogo de confirmação explícita de divergência > R$ 1,00 */}
      {pendingConfirmDivergence && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg p-6 max-w-md w-full shadow-xl border dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Confirmar Divergência de Valores
              </h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              A soma dos itens calculados (
              <strong>{formatBRL(pendingConfirmDivergence.totalItens)}</strong>) diverge do total
              lido da nota fiscal (<strong>{formatBRL(pendingConfirmDivergence.totalNota)}</strong>)
              em{' '}
              <strong className="text-orange-600">
                {formatBRL(pendingConfirmDivergence.diff)}
              </strong>
              .
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              O valor total da nota será mantido como{' '}
              <strong>{formatBRL(pendingConfirmDivergence.totalNota)}</strong> (incluindo impostos e
              frete). Deseja prosseguir com a gravação dos itens?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2 border-t dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPendingConfirmDivergence(null)}
                disabled={isSavingDraft}
              >
                Cancelar e Revisar Itens
              </Button>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => handleConfirmAndSave(true)}
                disabled={isSavingDraft}
              >
                {isSavingDraft ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                )}
                Confirmar e Gravar Mesmo Assim
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
