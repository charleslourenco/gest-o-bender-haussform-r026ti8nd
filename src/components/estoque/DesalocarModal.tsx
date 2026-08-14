import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PackageMinus, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'

export function DesalocarModal({
  isOpen,
  onClose,
  item,
  onDone,
}: {
  isOpen: boolean
  onClose: () => void
  item: any
  onDone: () => void
}) {
  const { toast } = useToast()
  const [allocations, setAllocations] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!isOpen || !item) return
    setLoading(true)
    setSelectedId(null)
    supabase
      .from('estoque_alocacoes')
      .select('*')
      .eq('item_id', item.id)
      .eq('status', 'ativo')
      .order('criado_em', { ascending: false })
      .then(({ data }) => {
        setAllocations(data || [])
        setLoading(false)
      })
  }, [isOpen, item])

  if (!item) return null

  const handleConfirm = async () => {
    if (!selectedId) return
    const alloc = allocations.find((a) => a.id === selectedId)
    if (!alloc) return

    setSubmitting(true)
    try {
      const { error: allocErr } = await supabase
        .from('estoque_alocacoes')
        .update({ status: 'desalocado' })
        .eq('id', alloc.id)
      if (allocErr) throw allocErr

      toast({
        title: 'Desalocação concluída',
        description: `A alocação de ${alloc.cliente_nome} foi removida. A quantidade física do estoque não foi alterada.`,
      })
      onDone()
      onClose()
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageMinus className="w-5 h-5 text-amber-500" />
            Desalocar Item
          </DialogTitle>
          <DialogDescription>
            Selecione uma alocação ativa para desfazer. A quantidade retornará ao estoque
            disponível.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="mb-3 text-sm">
            <span className="text-gray-500">Item: </span>
            <span className="font-medium">{item.nome}</span>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : allocations.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              Nenhuma alocação ativa para este item.
            </div>
          ) : (
            <div className="space-y-2">
              {allocations.map((alloc) => (
                <button
                  key={alloc.id}
                  onClick={() => setSelectedId(alloc.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedId === alloc.id
                      ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/30'
                      : 'border-border hover:bg-muted/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{alloc.cliente_nome}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(alloc.criado_em).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                    >
                      {alloc.quantidade} {item.unidade}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedId || submitting}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {submitting ? 'Processando...' : 'Confirmar Desalocação'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
