import { useState, useEffect, useMemo } from 'react'
import {
  AlertTriangle,
  PlusCircle,
  CheckCircle2,
  Trash2,
  Pencil,
  Save,
  RotateCcw,
  Loader2,
  Tag,
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
import { MatchedItem } from '@/services/estoque-matching'
import { syncItensNotaFiscal } from '@/services/itens-nota-fiscal'
import { CATEGORIAS_ESTOQUE } from './EstoqueLista'
import { NotaReviewItemCard } from './NotaReviewItemCard'
import { UnifiedItemModal } from './UnifiedItemModal'

interface NotaReviewPanelProps {
  nota: any
  onResolved: () => void
}

export function NotaReviewPanel({ nota, onResolved }: NotaReviewPanelProps) {
  const { toast } = useToast()
  const [estoqueItems, setEstoqueItems] = useState<any[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [draftItens, setDraftItens] = useState<(MatchedItem & { _draftId: string })[]>([])
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [editingMatchedIdx, setEditingMatchedIdx] = useState<number | null>(null)

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
    return (rawItens || []).map((item) => {
      const qtd = Number(item.quantidade) || 1
      const pu = Number(item.preco_unitario) || 0
      const pt =
        item.preco_total !== undefined ? Number(item.preco_total) : Math.round(qtd * pu * 100) / 100
      return {
        _draftId: item._draftId || item.id || generateItemId(),
        produto: item.produto || item.nome || '',
        quantidade: qtd,
        preco_unitario: pu,
        preco_total: pt,
        unidade: item.unidade || 'un',
        categoria: item.categoria || '',
        metadados_normalizados: item.metadados_normalizados || {},
        status: item.item_id ? item.status || 'matched' : 'pendente_revisao',
        item_id: item.item_id || null,
        source: item.source || 'none',
        confianca: item.confianca || 'BAIXA',
        score: item.score || 0,
      }
    })
  }

  useEffect(() => {
    const rawItens: any[] = nota.dados_ocr?.itens || []
    setDraftItens(parseItensToDraft(rawItens))
    setHasChanges(false)
  }, [nota.id, nota.dados_ocr])

  const originalTotal = useMemo(() => {
    return Number(nota.valor_total) || 0
  }, [nota.valor_total])

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

  // Manipulação de itens no rascunho local por _draftId ou índice
  const handleItemChange = (target: number | string, updated: Partial<MatchedItem>) => {
    setDraftItens((prev) => {
      const idx = typeof target === 'string' ? prev.findIndex((i) => i._draftId === target) : target
      if (idx < 0 || idx >= prev.length) return prev
      const next = [...prev]
      const item = { ...next[idx], ...updated }
      if (updated.quantidade !== undefined || updated.preco_unitario !== undefined) {
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

  const handleAddNewBlankItem = () => {
    const newItem: MatchedItem & { _draftId: string } = {
      _draftId: generateItemId(),
      produto: '',
      quantidade: 1,
      preco_unitario: 0,
      preco_total: 0,
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

  const handleConfirmAndSave = async () => {
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

    setIsSavingDraft(true)
    try {
      // 1. Buscar a versão mais recente da nota para evitar sobrescrita concorrente
      const { data: latestNota, error: fetchErr } = await supabase
        .from('notas_fiscais')
        .select('dados_ocr, valor_total')
        .eq('id', nota.id)
        .single()

      if (fetchErr) {
        throw new Error(`Falha ao verificar nota no servidor: ${fetchErr.message}`)
      }

      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser()

      const remoteItens: any[] = latestNota?.dados_ocr?.itens || []

      // (1) ROLLBACK E COERÊNCIA DE ESTOQUE:
      // A. Itens que existiam como matched no remote e foram EXCLUÍDOS ou alterados para sem vínculo
      // B. Itens matched cuja QUANTIDADE foi alterada
      // C. Itens que tiveram o VÍNCULO (item_id) alterado

      // Processar cada item do remote para verificar exclusões ou desvinculações
      for (const rItem of remoteItens) {
        if (rItem.status === 'matched' && rItem.item_id) {
          const rQty = Number(rItem.quantidade) || 0
          // Procurar no draftItens
          const draftMatch = draftItens.find(
            (d) =>
              (rItem._draftId && d._draftId === rItem._draftId) ||
              (d.item_id === rItem.item_id && d.produto === rItem.produto),
          )

          if (!draftMatch) {
            // ITEM EXCLUÍDO DA NOTA: Devolver quantidade ao estoque
            const { data: estItem } = await supabase
              .from('estoque_itens')
              .select('quantidade')
              .eq('id', rItem.item_id)
              .single()

            if (estItem) {
              await supabase
                .from('estoque_itens')
                .update({
                  quantidade: Math.max(0, Number(estItem.quantidade) - rQty),
                  atualizado_em: new Date().toISOString(),
                })
                .eq('id', rItem.item_id)

              await supabase.from('estoque_movimentacoes').insert({
                item_id: rItem.item_id,
                nota_fiscal_id: nota.id,
                tipo: 'saida',
                quantidade: rQty,
                usuario_id: currentUser?.id || null,
              })
            }
          } else if (draftMatch.status !== 'matched' || !draftMatch.item_id) {
            // ITEM TEVE VÍNCULO REMOVIDO / RETORNADO PARA REVISÃO: Devolver quantidade do antigo
            const { data: estItem } = await supabase
              .from('estoque_itens')
              .select('quantidade')
              .eq('id', rItem.item_id)
              .single()

            if (estItem) {
              await supabase
                .from('estoque_itens')
                .update({
                  quantidade: Math.max(0, Number(estItem.quantidade) - rQty),
                  atualizado_em: new Date().toISOString(),
                })
                .eq('id', rItem.item_id)

              await supabase.from('estoque_movimentacoes').insert({
                item_id: rItem.item_id,
                nota_fiscal_id: nota.id,
                tipo: 'saida',
                quantidade: rQty,
                usuario_id: currentUser?.id || null,
              })
            }
          }
        }
      }

      // Processar cada item do draftItens para ajustes de quantidade e novos vínculos
      const finalItens = [...draftItens]
      for (let i = 0; i < finalItens.length; i++) {
        const dItem = finalItens[i]
        const remoteMatch =
          remoteItens.find((r) => r._draftId && r._draftId === dItem._draftId) ||
          (dItem.item_id ? remoteItens.find((r) => r.item_id === dItem.item_id) : null)

        if (dItem.status === 'matched' && dItem.item_id) {
          const newQty = Number(dItem.quantidade) || 0

          if (remoteMatch && remoteMatch.status === 'matched' && remoteMatch.item_id) {
            const oldQty = Number(remoteMatch.quantidade) || 0
            const oldItemId = remoteMatch.item_id

            if (oldItemId === dItem.item_id) {
              // Mesmo item: verificar diferença de quantidade
              const diff = newQty - oldQty
              if (Math.abs(diff) > 0.0001) {
                const { data: estItem } = await supabase
                  .from('estoque_itens')
                  .select('quantidade')
                  .eq('id', dItem.item_id)
                  .single()

                if (estItem) {
                  const updatedQty = Math.max(0, Number(estItem.quantidade) + diff)
                  await supabase
                    .from('estoque_itens')
                    .update({
                      quantidade: updatedQty,
                      atualizado_em: new Date().toISOString(),
                    })
                    .eq('id', dItem.item_id)

                  await supabase.from('estoque_movimentacoes').insert({
                    item_id: dItem.item_id,
                    nota_fiscal_id: nota.id,
                    tipo: diff > 0 ? 'entrada' : 'saida',
                    quantidade: Math.abs(diff),
                    usuario_id: currentUser?.id || null,
                  })
                }
              }
            } else {
              // O vínculo mudou de um item antigo para um novo:
              // Devolver a quantidade antiga do oldItemId
              const { data: oldEstItem } = await supabase
                .from('estoque_itens')
                .select('quantidade')
                .eq('id', oldItemId)
                .single()

              if (oldEstItem) {
                await supabase
                  .from('estoque_itens')
                  .update({
                    quantidade: Math.max(0, Number(oldEstItem.quantidade) - oldQty),
                    atualizado_em: new Date().toISOString(),
                  })
                  .eq('id', oldItemId)

                await supabase.from('estoque_movimentacoes').insert({
                  item_id: oldItemId,
                  nota_fiscal_id: nota.id,
                  tipo: 'saida',
                  quantidade: oldQty,
                  usuario_id: currentUser?.id || null,
                })
              }

              // Somar a nova quantidade no novo item
              const { data: newEstItem } = await supabase
                .from('estoque_itens')
                .select('quantidade')
                .eq('id', dItem.item_id)
                .single()

              if (newEstItem) {
                await supabase
                  .from('estoque_itens')
                  .update({
                    quantidade: Number(newEstItem.quantidade) + newQty,
                    atualizado_em: new Date().toISOString(),
                  })
                  .eq('id', dItem.item_id)

                await supabase.from('estoque_movimentacoes').insert({
                  item_id: dItem.item_id,
                  nota_fiscal_id: nota.id,
                  tipo: 'entrada',
                  quantidade: newQty,
                  usuario_id: currentUser?.id || null,
                })
              }
            }
          }
        }
      }

      const pendingCount = finalItens.filter((i) => i.status === 'pendente_revisao').length
      const novoStatus =
        finalItens.length === 0 ? 'pendente' : pendingCount > 0 ? 'pendente_revisao' : 'conciliado'

      const updatedDadosOcr = {
        ...(latestNota?.dados_ocr || nota.dados_ocr || {}),
        itens: finalItens,
        valor: recalculatedTotal,
      }

      const { error } = await supabase
        .from('notas_fiscais')
        .update({
          valor_total: recalculatedTotal,
          dados_ocr: updatedDadosOcr,
          status_reconciliacao: novoStatus,
        })
        .eq('id', nota.id)

      if (error) throw error

      // Sincronizar tabela itens_nota_fiscal
      await syncItensNotaFiscal(nota.id, finalItens)

      toast({
        title: 'Revisão gravada com sucesso!',
        description: `Total atualizado para ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(recalculatedTotal)} com ${mergedItens.length} itens.`,
      })
      setDraftItens(mergedItens)
      setHasChanges(false)
      onResolved()
    } catch (e: any) {
      toast({
        title: 'Erro ao salvar alterações da nota',
        description: e.message || 'Ocorreu uma falha inesperada ao tentar gravar a revisão.',
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
                disabled={isSavingDraft}
                className="text-slate-600 dark:text-slate-300"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Descartar Edições
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleConfirmAndSave}
              disabled={isSavingDraft}
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
            const linkedEstoque = item.item_id
              ? estoqueItems.find((e) => e.id === item.item_id)
              : null

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
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {formatBRL(currentItemTotal)}
                    </span>
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
                      Unit: <strong>{formatBRL(Number(item.preco_unitario) || 0)}</strong>
                    </span>
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

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                          Preço Unitário (R$)
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
                          Total do Item (R$)
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

      {hasPending ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">
              Itens Aguardando Verificação ({pendingEntries.length})
            </span>
          </div>
          {pendingEntries.map(({ item, idx }) => (
            <NotaReviewItemCard
              key={item._draftId || `pending-${idx}`}
              item={item}
              realIdx={idx}
              notaId={nota.id}
              notaFornecedor={nota.fornecedor}
              estoqueItems={estoqueItems}
              onResolved={onResolved}
              onItemChange={handleItemChange}
              onItemDelete={handleItemDelete}
            />
          ))}
        </div>
      ) : (
        matchedEntries.length === 0 && (
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
            Nenhum item encontrado. Use "Adicionar Item" para incluir itens na nota fiscal.
          </p>
        )
      )}

      {showAddModal && (
        <UnifiedItemModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          mode="create"
          notaId={nota.id}
          notaFornecedor={nota.fornecedor}
          onSaved={() => {
            setShowAddModal(false)
            onResolved()
          }}
        />
      )}
    </div>
  )
}
