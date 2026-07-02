import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, AlertTriangle, Check, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'
import { saveAlias } from '@/services/estoque-aliases'
import { MatchedItem } from '@/services/estoque-matching'

interface NotaReviewPanelProps {
  nota: any
  onResolved: () => void
}

export function NotaReviewPanel({ nota, onResolved }: NotaReviewPanelProps) {
  const { toast } = useToast()
  const [estoqueItems, setEstoqueItems] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [resolvingIdx, setResolvingIdx] = useState<number | null>(null)
  const [lembrarMap, setLembrarMap] = useState<Record<number, boolean>>({})
  const [selectedMap, setSelectedMap] = useState<Record<number, string>>({})

  const pendingItems: MatchedItem[] = (nota.dados_ocr?.itens || []).filter(
    (i: MatchedItem) => i.status === 'pendente_revisao',
  )

  useEffect(() => {
    fetchEstoque()
  }, [])

  async function fetchEstoque() {
    const { data } = await supabase
      .from('estoque_itens')
      .select('id, nome, quantidade, marca, cor')
      .order('nome')
    if (data) setEstoqueItems(data)
  }

  const filteredEstoque = estoqueItems.filter((i) =>
    i.nome.toLowerCase().includes(search.toLowerCase()),
  )

  const handleResolve = async (itemIndex: number) => {
    const item = pendingItems[itemIndex]
    const selectedItemId = selectedMap[itemIndex]
    if (!selectedItemId) {
      toast({
        title: 'Selecione um item',
        description: 'Escolha um item do estoque.',
        variant: 'destructive',
      })
      return
    }
    setResolvingIdx(itemIndex)
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
        nota_fiscal_id: nota.id,
        tipo: 'entrada',
        quantidade: Number(item.quantidade),
      })

      if (lembrarMap[itemIndex]) {
        const { data: userData } = await supabase.auth.getUser()
        await saveAlias(item.produto, selectedItemId, userData.user?.id)
      }

      const itens = [...(nota.dados_ocr.itens || [])]
      const realIdx = itens.findIndex((i: MatchedItem) => i === item)
      if (realIdx >= 0) {
        itens[realIdx] = { ...item, status: 'matched', item_id: selectedItemId, source: 'manual' }
      }

      const stillPending = itens.filter((i: MatchedItem) => i.status === 'pendente_revisao').length
      const novoStatus = stillPending === 0 ? 'conciliado' : 'pendente_revisao'

      await supabase
        .from('notas_fiscais')
        .update({ dados_ocr: { ...nota.dados_ocr, itens }, status_reconciliacao: novoStatus })
        .eq('id', nota.id)

      toast({ title: 'Item associado!', description: 'Estoque atualizado com sucesso.' })
      onResolved()
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    } finally {
      setResolvingIdx(null)
    }
  }

  if (pendingItems.length === 0) return null

  return (
    <div className="mt-4 border-2 border-amber-300 dark:border-amber-700 rounded-lg p-4 bg-amber-50/50 dark:bg-amber-950/20">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-5 h-5 text-amber-500" />
        <h4 className="font-bold text-amber-800 dark:text-amber-300">
          Itens para Verificação ({pendingItems.length})
        </h4>
      </div>
      <div className="space-y-4">
        {pendingItems.map((item, idx) => (
          <div
            key={idx}
            className="bg-white dark:bg-slate-900 rounded-lg p-3 border dark:border-slate-800"
          >
            <div className="flex flex-col gap-2 mb-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-sm dark:text-slate-200">{item.produto}</span>
                <Badge className="bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800">
                  Verificar
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>Qtd: {item.quantidade}</span>
                {item.metadados_normalizados?.espessura_mm && (
                  <span>Esp: {item.metadados_normalizados.espessura_mm}mm</span>
                )}
                {item.metadados_normalizados?.cor && (
                  <span>Cor: {item.metadados_normalizados.cor}</span>
                )}
                {item.metadados_normalizados?.marca && (
                  <span>Marca: {item.metadados_normalizados.marca}</span>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Buscar item no estoque..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 pl-7 text-xs dark:bg-slate-800 dark:border-slate-700"
                />
              </div>
              <select
                value={selectedMap[idx] || ''}
                onChange={(e) => setSelectedMap({ ...selectedMap, [idx]: e.target.value })}
                className="w-full h-9 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-sm dark:text-slate-100"
              >
                <option value="">Selecione um item do estoque...</option>
                {filteredEstoque.slice(0, 50).map((ei) => (
                  <option key={ei.id} value={ei.id}>
                    {ei.nome} {ei.marca ? `(${ei.marca})` : ''} — Estq: {ei.quantidade}
                  </option>
                ))}
              </select>
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={lembrarMap[idx] || false}
                    onCheckedChange={(c) => setLembrarMap({ ...lembrarMap, [idx]: !!c })}
                  />
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    Lembrar desta associação para futuras notas
                  </span>
                </label>
                <Button
                  size="sm"
                  onClick={() => handleResolve(idx)}
                  disabled={resolvingIdx === idx}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {resolvingIdx === idx ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5 mr-1" />
                  )}
                  Confirmar
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
