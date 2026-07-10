import { useState, useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { MatchedItem } from '@/services/estoque-matching'
import { NotaReviewItemCard } from './NotaReviewItemCard'

interface NotaReviewPanelProps {
  nota: any
  onResolved: () => void
}

export function NotaReviewPanel({ nota, onResolved }: NotaReviewPanelProps) {
  const [estoqueItems, setEstoqueItems] = useState<any[]>([])

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

  const allItems: MatchedItem[] = nota.dados_ocr?.itens || []
  const pendingEntries = allItems
    .map((item, idx) => ({ item, idx }))
    .filter(({ item }) => item.status === 'pendente_revisao')

  if (pendingEntries.length === 0) return null

  return (
    <div className="mt-4 border-2 border-amber-300 dark:border-amber-700 rounded-lg p-4 bg-amber-50/50 dark:bg-amber-950/20">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-5 h-5 text-amber-500" />
        <h4 className="font-bold text-amber-800 dark:text-amber-300">
          Itens para Verificação ({pendingEntries.length})
        </h4>
      </div>
      <div className="space-y-4">
        {pendingEntries.map(({ item, idx }) => (
          <NotaReviewItemCard
            key={`${idx}-${item.produto}`}
            item={item}
            realIdx={idx}
            notaId={nota.id}
            notaFornecedor={nota.fornecedor}
            estoqueItems={estoqueItems}
            onResolved={onResolved}
          />
        ))}
      </div>
    </div>
  )
}
