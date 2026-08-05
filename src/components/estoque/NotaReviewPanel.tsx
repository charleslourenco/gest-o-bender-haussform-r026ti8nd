import { useState, useEffect } from 'react'
import { AlertTriangle, PlusCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'
import { MatchedItem } from '@/services/estoque-matching'
import { NotaReviewItemCard } from './NotaReviewItemCard'
import { UnifiedItemModal } from './UnifiedItemModal'

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
  const matchedEntries = allItems
    .map((item, idx) => ({ item, idx }))
    .filter(({ item }) => item.status === 'matched')
  const hasPending = pendingEntries.length > 0

  return (
    <div
      className={`mt-4 border-2 rounded-lg p-4 ${
        hasPending
          ? 'border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20'
          : 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20'
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
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

      {matchedEntries.length > 0 && (
        <div
          className={`space-y-2 ${hasPending ? 'pb-4 mb-4 border-b dark:border-amber-700/50' : ''}`}
        >
          {matchedEntries.map(({ item, idx }) => (
            <div
              key={`matched-${idx}`}
              className="bg-white dark:bg-slate-900 rounded-md p-2 border dark:border-slate-800 flex items-center justify-between"
            >
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="text-sm text-slate-700 dark:text-slate-300 truncate">
                  {item.produto}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 shrink-0">
                <span>
                  Qtd: <strong>{item.quantidade}</strong>
                </span>
                {item.metadados_normalizados?.marca && (
                  <span>{item.metadados_normalizados.marca}</span>
                )}
                {item.metadados_normalizados?.cor && (
                  <span>Cor: {item.metadados_normalizados.cor}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {hasPending ? (
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
      ) : (
        matchedEntries.length === 0 && (
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
            Nenhum item encontrado. Use "Adicionar Item" para incluir itens não lidos pela OCR.
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
