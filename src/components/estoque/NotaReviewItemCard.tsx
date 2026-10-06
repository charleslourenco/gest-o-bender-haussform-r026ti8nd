import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Check, Search, Percent, PlusCircle, Trash2, Pencil } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'
import { saveAlias } from '@/services/estoque-aliases'
import { MatchedItem } from '@/services/estoque-matching'
import { syncItensNotaFiscal } from '@/services/itens-nota-fiscal'
import { CATEGORIAS_ESTOQUE } from './EstoqueLista'
import { UnifiedItemModal } from './UnifiedItemModal'

interface NotaReviewItemCardProps {
  item: MatchedItem & { _draftId?: string }
  realIdx: number
  notaId: string
  notaFornecedor: string
  estoqueItems: any[]
  onResolved: () => void
  onItemResolved?: (draftId?: string, matchedEstoqueItemId?: string) => void
  custoEfetivoUnitario?: number
  acrescimoRateado?: number
  onItemChange?: (idx: number | string, updated: Partial<MatchedItem>) => void
  onItemDelete?: (idx: number | string) => void
}

export function NotaReviewItemCard({
  item,
  realIdx,
  notaId,
  notaFornecedor,
  estoqueItems,
  onResolved,
  onItemResolved,
  custoEfetivoUnitario,
  acrescimoRateado,
  onItemChange,
  onItemDelete,
}: NotaReviewItemCardProps) {
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [resolving, setResolving] = useState(false)
  const [lembrar, setLembrar] = useState(true)
  const [selectedItemId, setSelectedItemId] = useState('')
  const [showRegister, setShowRegister] = useState(false)
  const [isEditingInline, setIsEditingInline] = useState(false)

  const filteredEstoque = useMemo(() => {
    if (!search.trim()) return estoqueItems
    const q = search.toLowerCase()
    return estoqueItems.filter(
      (i) =>
        i.nome?.toLowerCase().includes(q) ||
        i.marca?.toLowerCase().includes(q) ||
        i.cor?.toLowerCase().includes(q),
    )
  }, [estoqueItems, search])

  const handleResolve = async () => {
    if (!selectedItemId) {
      toast({
        title: 'Selecione um item',
        description: 'Escolha um item do estoque ou cadastre um novo.',
        variant: 'destructive',
      })
      return
    }
    setResolving(true)
    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser()

      // Verificar se o item já estava conciliado anteriormente com outro item_id (para devolver a quantidade anterior)
      const oldItemId = item.item_id
      const oldQty = Number(item.quantidade) || 0
      if (oldItemId && oldItemId !== selectedItemId) {
        const { data: oldEstItem } = await supabase
          .from('estoque_itens')
          .select('id, quantidade')
          .eq('id', oldItemId)
          .single()

        if (oldEstItem) {
          const { error: revErr } = await supabase
            .from('estoque_itens')
            .update({
              quantidade: Math.max(0, Number(oldEstItem.quantidade) - oldQty),
              atualizado_em: new Date().toISOString(),
            })
            .eq('id', oldItemId)

          if (revErr) {
            console.error('Erro ao reverter estoque do item antigo:', revErr.message)
          } else {
            await supabase.from('estoque_movimentacoes').insert({
              item_id: oldItemId,
              nota_fiscal_id: notaId,
              tipo: 'saida',
              quantidade: oldQty,
              usuario_id: currentUser?.id || null,
            })
          }
        }
      }

      const { data: estItem, error: estFetchErr } = await supabase
        .from('estoque_itens')
        .select('id, nome, quantidade')
        .eq('id', selectedItemId)
        .single()
      if (estFetchErr || !estItem) throw new Error('Item não encontrado no estoque')

      const precoUnitarioLiquido = Number(item.preco_unitario) || 0
      // Se custo efetivo unitário foi calculado (com rateio de IPI/ST/frete), gravar o custo efetivo
      const valorUnitarioParaEstoque =
        custoEfetivoUnitario !== undefined && custoEfetivoUnitario > 0
          ? custoEfetivoUnitario
          : precoUnitarioLiquido > 0
            ? precoUnitarioLiquido
            : undefined

      const { error: updateEstErr } = await supabase
        .from('estoque_itens')
        .update({
          quantidade: Number(estItem.quantidade) + Number(item.quantidade),
          valor_unitario: valorUnitarioParaEstoque,
          fornecedor: notaFornecedor || undefined,
          atualizado_em: new Date().toISOString(),
        })
        .eq('id', selectedItemId)

      if (updateEstErr) throw updateEstErr

      await supabase.from('estoque_movimentacoes').insert({
        item_id: selectedItemId,
        nota_fiscal_id: notaId,
        tipo: 'entrada',
        quantidade: Number(item.quantidade),
        usuario_id: currentUser?.id || null,
      })

      if (lembrar) {
        const { data: userData } = await supabase.auth.getUser()
        await saveAlias(item.produto, selectedItemId, userData.user?.id)
      }

      const { data: notaData, error: fetchNotaErr } = await supabase
        .from('notas_fiscais')
        .select('dados_ocr')
        .eq('id', notaId)
        .single()

      if (fetchNotaErr) throw fetchNotaErr

      if (notaData?.dados_ocr) {
        const itens = [...(notaData.dados_ocr.itens || [])]
        // Localizar o item alvo EXCLUSIVAMENTE por _draftId
        const targetIndex = item._draftId
          ? itens.findIndex((it: any) => it._draftId === item._draftId)
          : -1

        if (targetIndex >= 0 && targetIndex < itens.length) {
          itens[targetIndex] = {
            ...itens[targetIndex],
            status: 'matched',
            item_id: selectedItemId,
            source: 'manual',
          }
        }
        const stillPending = itens.filter(
          (i: MatchedItem) => i.status === 'pendente_revisao',
        ).length
        const novoStatus = stillPending === 0 ? 'conciliado' : 'pendente_revisao'
        const { error: updateNotaErr } = await supabase
          .from('notas_fiscais')
          .update({ dados_ocr: { ...notaData.dados_ocr, itens }, status_reconciliacao: novoStatus })
          .eq('id', notaId)

        if (updateNotaErr) throw updateNotaErr

        // Sincronizar itens_nota_fiscal
        await syncItensNotaFiscal(notaId, itens)
      }
      toast({ title: 'Item associado!', description: 'Estoque atualizado com sucesso.' })
      onItemResolved?.(item._draftId, selectedItemId)
      onResolved()
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    } finally {
      setResolving(false)
    }
  }

  const currentTotal =
    item.preco_total !== undefined
      ? item.preco_total
      : Math.round(Number(item.quantidade || 0) * Number(item.preco_unitario || 0) * 100) / 100

  const hasDesconto = item.desconto !== undefined && Number(item.desconto) > 0
  const precoBrutoExibicao =
    item.preco_bruto !== undefined && Number(item.preco_bruto) > 0
      ? Number(item.preco_bruto)
      : hasDesconto
        ? currentTotal + Number(item.desconto)
        : undefined

  const formatBRL = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg p-3 border dark:border-slate-800 space-y-3">
      {/* Top Header com Descrição, Badges e Botões de Ação rápida */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 rounded-md p-2 mb-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                Descrição do Item
              </p>
              {onItemChange && (
                <button
                  type="button"
                  onClick={() => setIsEditingInline(!isEditingInline)}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  <Pencil className="w-3 h-3" />
                  {isEditingInline ? 'Ocultar Edição' : 'Editar Item'}
                </button>
              )}
            </div>
            <p className="text-sm text-blue-900 dark:text-blue-200 font-medium break-words mt-0.5">
              {item.produto || '(Sem descrição)'}
            </p>
          </div>
        </div>

        {onItemDelete && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onItemDelete(item._draftId || realIdx)}
            title="Excluir item da nota"
            className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 h-8 w-8 p-0 shrink-0"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Formulário de edição inline dos campos do item */}
      {(isEditingInline || onItemChange) && (
        <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-md border border-slate-200 dark:border-slate-700 space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300 block mb-1">
                Descrição / Produto *
              </label>
              <Input
                value={item.produto}
                onChange={(e) =>
                  onItemChange?.(item._draftId || realIdx, { produto: e.target.value })
                }
                className="h-8 text-xs bg-white dark:bg-slate-900"
                placeholder="Descrição do item na nota"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300 block mb-1">
                Categoria
              </label>
              <Select
                value={item.categoria || ''}
                onValueChange={(val) =>
                  onItemChange?.(item._draftId || realIdx, { categoria: val })
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
                  const pu = Number(item.preco_unitario) || 0
                  onItemChange?.(item._draftId || realIdx, {
                    quantidade: qtd,
                    preco_total: Math.round(qtd * pu * 100) / 100,
                  })
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
                  onItemChange?.(item._draftId || realIdx, { unidade: e.target.value })
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
                  const qtd = Number(item.quantidade) || 0
                  onItemChange?.(item._draftId || realIdx, {
                    preco_unitario: pu,
                    preco_total: Math.round(qtd * pu * 100) / 100,
                  })
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
                  onItemChange?.(item._draftId || realIdx, {
                    desconto: desc,
                  })
                }}
                className="h-8 text-xs bg-white dark:bg-slate-900"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300 block mb-1">
                Total Líquido (R$)
              </label>
              <div className="h-8 px-2 flex items-center font-bold text-xs bg-white dark:bg-slate-900 border rounded-md text-emerald-700 dark:text-emerald-400">
                {formatBRL(currentTotal)}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {item.score !== undefined && item.score > 0 && (
            <Badge variant="outline" className="text-[10px] flex items-center gap-0.5">
              <Percent className="w-2.5 h-2.5" />
              {item.score}%
            </Badge>
          )}
          <Badge className="bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800 text-[10px]">
            Verificar
          </Badge>
          {item.categoria && (
            <Badge variant="secondary" className="text-[10px]">
              {item.categoria}
            </Badge>
          )}
          {item.unidade && (
            <Badge variant="outline" className="text-[10px]">
              {item.unidade}
            </Badge>
          )}
          {hasDesconto && (
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800 text-[10px]">
              Desc: -{formatBRL(Number(item.desconto))}
            </Badge>
          )}
          {custoEfetivoUnitario !== undefined &&
            Math.abs(custoEfetivoUnitario - (Number(item.preco_unitario) || 0)) > 0.005 && (
              <Badge className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800 text-[10px]">
                Líquido: {formatBRL(Number(item.preco_unitario) || 0)} · Custo efetivo no estoque:{' '}
                {formatBRL(custoEfetivoUnitario)} c/ impostos e frete
              </Badge>
            )}
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1.5 justify-end">
            {hasDesconto && precoBrutoExibicao && (
              <span className="text-xs text-slate-400 line-through">
                {formatBRL(precoBrutoExibicao)}
              </span>
            )}
            <span className="text-xs text-slate-800 dark:text-slate-200 font-bold">
              Total Líquido: {formatBRL(currentTotal)}
            </span>
          </div>
          {custoEfetivoUnitario !== undefined &&
            Math.abs(custoEfetivoUnitario - (Number(item.preco_unitario) || 0)) > 0.005 && (
              <span className="text-[10px] text-blue-600 dark:text-blue-400 block font-medium">
                Efetivo c/ rateio:{' '}
                {formatBRL(
                  Math.round((Number(currentTotal) + Number(acrescimoRateado || 0)) * 100) / 100,
                )}
              </span>
            )}
        </div>
      </div>
      <div className="relative mb-2">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
        <Input
          placeholder="Buscar item no estoque..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 pl-7 text-xs dark:bg-slate-800 dark:border-slate-700"
        />
      </div>

      <div className="max-h-[160px] overflow-y-auto rounded-md border dark:border-slate-700 mb-3 bg-white dark:bg-slate-900">
        {filteredEstoque.length === 0 ? (
          <p className="text-xs text-slate-400 p-3 text-center">
            Nenhum item encontrado. Considere cadastrar um novo.
          </p>
        ) : (
          filteredEstoque.slice(0, 100).map((ei) => (
            <div
              key={ei.id}
              onClick={() => setSelectedItemId(ei.id)}
              className={`px-2 py-1.5 cursor-pointer text-xs flex items-center justify-between border-b dark:border-slate-700/50 last:border-0 ${selectedItemId === ei.id ? 'bg-emerald-50 dark:bg-emerald-950/30 font-medium' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
            >
              <span className="truncate">
                {ei.nome} {ei.marca ? `(${ei.marca})` : ''}
              </span>
              <span className="text-slate-400 shrink-0 ml-2">Estq: {ei.quantidade}</span>
            </div>
          ))
        )}
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox checked={lembrar} onCheckedChange={(c) => setLembrar(!!c)} />
          <span className="text-xs text-slate-600 dark:text-slate-400">
            Lembrar desta associação
          </span>
        </label>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRegister(true)}
            className="text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-950/30"
          >
            <PlusCircle className="w-3.5 h-3.5 mr-1" />
            Cadastrar como novo item
          </Button>
          <Button
            size="sm"
            onClick={handleResolve}
            disabled={resolving || !selectedItemId}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {resolving ? (
              <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5 mr-1" />
            )}
            Confirmar
          </Button>
        </div>
      </div>

      {showRegister && (
        <UnifiedItemModal
          isOpen={showRegister}
          onClose={() => setShowRegister(false)}
          mode="edit"
          notaId={notaId}
          notaFornecedor={notaFornecedor}
          ocrItem={item}
          realIdx={realIdx}
          onSaved={(draftId, matchedId) => {
            setShowRegister(false)
            onItemResolved?.(draftId || item._draftId, matchedId)
            onResolved()
          }}
        />
      )}
    </div>
  )
}
