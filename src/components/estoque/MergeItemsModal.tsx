import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { mergeEstoqueItems } from '@/services/estoque-merge'

interface MergeItemsModalProps {
  isOpen: boolean
  onClose: () => void
  masterItem: any
  duplicateItems: any[]
  onMerged: () => void
}

export function MergeItemsModal({
  isOpen,
  onClose,
  masterItem,
  duplicateItems,
  onMerged,
}: MergeItemsModalProps) {
  const { toast } = useToast()
  const [merging, setMerging] = useState(false)

  const totalDuplicateQty = duplicateItems.reduce((acc, d) => acc + Number(d.quantidade || 0), 0)
  const newMasterQty = Number(masterItem?.quantidade || 0) + totalDuplicateQty

  const handleConfirm = async () => {
    if (!masterItem || duplicateItems.length === 0) return
    setMerging(true)
    try {
      const result = await mergeEstoqueItems(
        masterItem.id,
        duplicateItems.map((d) => d.id),
      )

      if (result.error) throw new Error(result.error)

      toast({
        title: 'Mesclagem concluída!',
        description: `${duplicateItems.length} item(ns) duplicado(s) foram unificados em "${masterItem.nome}". Quantidade final: ${result.data?.final_quantity ?? newMasterQty}.`,
      })
      onMerged()
    } catch (e: any) {
      toast({ title: 'Erro na mesclagem', description: e.message, variant: 'destructive' })
    } finally {
      setMerging(false)
    }
  }

  if (!masterItem) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !merging && onClose()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Confirmar Mesclagem de Itens
          </DialogTitle>
          <DialogDescription>
            Esta ação é irreversível. Todos os registros relacionados serão migrados para o item
            mestre.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                ITEM MESTRE (permanece)
              </span>
            </div>
            <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200 break-words">
              {masterItem.nome}
            </p>
            <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
              Quantidade atual: {masterItem.quantidade} {masterItem.unidade}
            </p>
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-lg p-3">
            <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-2">
              ITENS DUPLICADOS (serão excluídos):
            </p>
            <ul className="space-y-1">
              {duplicateItems.map((d) => (
                <li key={d.id} className="text-sm text-amber-900 dark:text-amber-200 break-words">
                  • {d.nome}{' '}
                  <span className="text-xs">
                    ({d.quantidade} {d.unidade})
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg p-3 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">Quantidade do mestre:</span>
              <span className="font-medium">
                {masterItem.quantidade} {masterItem.unidade}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">+ Soma dos duplicados:</span>
              <span className="font-medium">
                {totalDuplicateQty} {masterItem.unidade}
              </span>
            </div>
            <div className="flex justify-between text-sm pt-1.5 border-t border-slate-200 dark:border-slate-700">
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                Nova quantidade final:
              </span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {newMasterQty} {masterItem.unidade}
              </span>
            </div>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
            <p className="font-medium text-slate-600 dark:text-slate-300">O que será migrado:</p>
            <ul className="list-disc list-inside space-y-0.5 ml-1">
              <li>Movimentações de estoque</li>
              <li>Alocações de clientes</li>
              <li>Itens de notas fiscais</li>
              <li>Sobras de chapas</li>
              <li>Caixas virtuais (itens)</li>
              <li>Aliases de descrição</li>
              <li>Itens de pedidos de compra</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={merging}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={merging}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {merging && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            Confirmar Mesclagem
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
