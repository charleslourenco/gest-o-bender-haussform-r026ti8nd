import { useState, useEffect } from 'react'
import { AlertTriangle, PlusCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'
import { MatchedItem } from '@/services/estoque-matching'
import { NotaReviewItemCard } from './NotaReviewItemCard'
import { AdicionarItemManualModal } from './AdicionarItemManualModal'

interface NotaReviewPanelProps {
  nota: any
  onResolved: () => void
}

export function NotaReviewPanel({ nota, onResolved }: NotaReviewPanelProps) {
  const [estoqueItems, setEstoqueItems] = useState<any[]>([])
  const [showAddModal, setShowAddModal] = useState(false)

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

  return (
    <div className="mt-4 border-2 border-amber-300 dark:border-amber-700 rounded-lg p-4 bg-amber-50/50 dark:bg-amber-950/20">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <h4 className="font-bold text-amber-800 dark:text-amber-300">
            Itens para Verificação ({pendingEntries.length})
          </h4>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAddModal(true)}
          className="text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-700 dark:hover:bg-emerald-950/30"
        >
          <PlusCircle className="w-4 h-4 mr-1" />
          Adicionar Item
        </Button>
      </div>
      {pendingEntries.length === 0 ? (
        <p className="text-sm text-amber-700 dark:text-amber-300/70 text-center py-4">
          Nenhum item pendente. Use "Adicionar Item" para incluir itens não lidos pela OCR.
        </p>
      ) : (
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
      )}

      {showAddModal && (
        <AdicionarItemManualModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          notaId={nota.id}
          onSaved={() => {
            setShowAddModal(false)
            onResolved()
          }}
        />
      )}
    </div>
  )
}
