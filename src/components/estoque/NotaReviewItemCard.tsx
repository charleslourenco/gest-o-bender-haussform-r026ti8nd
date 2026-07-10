import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Check, Search, Percent, PlusCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'
import { saveAlias } from '@/services/estoque-aliases'
import { MatchedItem } from '@/services/estoque-matching'
import { QuickRegisterItemModal } from './QuickRegisterItemModal'

interface NotaReviewItemCardProps {
  item: MatchedItem
  realIdx: number
  notaId: string
  notaFornecedor: string
  estoqueItems: any[]
  onResolved: () => void
}

export function NotaReviewItemCard({
  item,
  realIdx,
  notaId,
  notaFornecedor,
  estoqueItems,
  onResolved,
}: NotaReviewItemCardProps) {
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [resolving, setResolving] = useState(false)
  const [lembrar, setLembrar] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState('')
  const [showRegister, setShowRegister] = useState(false)

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
      const { data: estItem } = await supabase
        .from('estoque_itens')
        .select('id, nome, quantidade')
        .eq('id', selectedItemId)
        .single()
      if (!estItem) throw new Error('Item não encontrado')

      await supabase
        .from('estoque_itens')
        .update({
          quantidade: Number(estItem.quantidade) + Number(item.quantidade),
          atualizado_em: new Date().toISOString(),
        })
        .eq('id', selectedItemId)

      await supabase.from('estoque_movimentacoes').insert({
        item_id: selectedItemId,
        nota_fiscal_id: notaId,
        tipo: 'entrada',
        quantidade: Number(item.quantidade),
      })

      if (lembrar) {
        const { data: userData } = await supabase.auth.getUser()
        await saveAlias(item.produto, selectedItemId, userData.user?.id)
      }

      const { data: notaData } = await supabase
        .from('notas_fiscais')
        .select('dados_ocr')
        .eq('id', notaId)
        .single()
      if (notaData?.dados_ocr) {
        const itens = [...(notaData.dados_ocr.itens || [])]
        if (realIdx >= 0 && realIdx < itens.length) {
          itens[realIdx] = {
            ...itens[realIdx],
            status: 'matched',
            item_id: selectedItemId,
            source: 'manual',
          }
        }
        const stillPending = itens.filter(
          (i: MatchedItem) => i.status === 'pendente_revisao',
        ).length
        const novoStatus = stillPending === 0 ? 'conciliado' : 'pendente_revisao'
        await supabase
          .from('notas_fiscais')
          .update({ dados_ocr: { ...notaData.dados_ocr, itens }, status_reconciliacao: novoStatus })
          .eq('id', notaId)
      }

      toast({ title: 'Item associado!', description: 'Estoque atualizado com sucesso.' })
      onResolved()
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    } finally {
      setResolving(false)
    }
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg p-3 border dark:border-slate-800">
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 rounded-md p-2 mb-3">
        <p className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-0.5">
          Texto lido pela OCR
        </p>
        <p className="text-sm text-blue-900 dark:text-blue-200 font-mono break-words">
          {item.produto}
        </p>
      </div>

      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          {item.score !== undefined && item.score > 0 && (
            <Badge variant="outline" className="text-[10px] flex items-center gap-0.5">
              <Percent className="w-2.5 h-2.5" />
              {item.score}%
            </Badge>
          )}
          <Badge className="bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800">
            Verificar
          </Badge>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400 mb-3">
        <span>
          Qtd: <strong>{item.quantidade}</strong>
        </span>
        {item.metadados_normalizados?.espessura_mm && (
          <span>Esp: {item.metadados_normalizados.espessura_mm}mm</span>
        )}
        {item.metadados_normalizados?.cor && <span>Cor: {item.metadados_normalizados.cor}</span>}
        {item.metadados_normalizados?.marca && (
          <span>Marca: {item.metadados_normalizados.marca}</span>
        )}
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
        <QuickRegisterItemModal
          isOpen={showRegister}
          onClose={() => setShowRegister(false)}
          item={item}
          realIdx={realIdx}
          notaId={notaId}
          notaFornecedor={notaFornecedor}
          onSaved={() => {
            setShowRegister(false)
            onResolved()
          }}
        />
      )}
    </div>
  )
}
