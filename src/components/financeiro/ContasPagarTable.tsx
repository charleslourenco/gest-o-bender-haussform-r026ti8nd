import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { AlertTriangle, Paperclip, Check, Calendar } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { ContaPagar, fetchContasPagar, updateDataVencimento } from '@/services/contas-pagar'
import { getInvoiceSignedUrl } from '@/services/notas-fiscais-storage'
import { formatCurrency } from '@/lib/utils'

interface ContasPagarTableProps {
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
  refreshKey?: number
}

export function ContasPagarTable({
  selectedIds,
  onSelectionChange,
  refreshKey,
}: ContasPagarTableProps) {
  const [contas, setContas] = useState<ContaPagar[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newDate, setNewDate] = useState('')
  const { toast } = useToast()

  useEffect(() => {
    loadContas()
  }, [refreshKey])

  async function loadContas() {
    setLoading(true)
    const { data } = await fetchContasPagar()
    setContas(data || [])
    setLoading(false)
  }

  async function handleSetVencimento(id: string) {
    if (!newDate) {
      toast({ title: 'Selecione uma data', variant: 'destructive' })
      return
    }
    const { error } = await updateDataVencimento(id, newDate)
    if (error) {
      toast({ title: 'Erro ao atualizar', variant: 'destructive' })
      return
    }
    toast({ title: 'Vencimento definido!' })
    setContas((prev) => prev.map((c) => (c.id === id ? { ...c, data_vencimento: newDate } : c)))
    setEditingId(null)
    setNewDate('')
  }

  async function handleViewComprovante(url: string) {
    const { url: signedUrl, error } = await getInvoiceSignedUrl(url)
    if (error || !signedUrl) {
      toast({ title: 'Erro ao acessar arquivo', variant: 'destructive' })
      return
    }
    window.open(signedUrl, '_blank')
  }

  function handleToggleSelection(id: string) {
    onSelectionChange(
      selectedIds.includes(id) ? selectedIds.filter((i) => i !== id) : [...selectedIds, id],
    )
  }

  if (loading) return <div className="text-center py-4 text-sm text-gray-500">Carregando...</div>

  if (contas.length === 0) {
    return <div className="text-center py-4 text-sm text-gray-500">Nenhuma conta a pagar.</div>
  }

  return (
    <div className="space-y-2">
      {contas.map((conta) => {
        const needsAction = !conta.data_vencimento
        const isSelected = selectedIds.includes(conta.id)
        const isGrouped = conta.status_pagamento.toLowerCase() === 'agrupado'
        const isPaid = conta.status_pagamento.toLowerCase() === 'pago'
        const canSelect = !isGrouped && !isPaid

        return (
          <div
            key={conta.id}
            className={`border-2 rounded-lg p-3 flex items-center gap-3 transition-all ${
              needsAction
                ? 'border-red-400 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20'
                : 'border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50'
            }`}
          >
            {canSelect && (
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => handleToggleSelection(conta.id)}
              />
            )}
            {needsAction && <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">{conta.fornecedor}</span>
                {needsAction && (
                  <Badge className="bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800 text-[10px]">
                    Requer Acao
                  </Badge>
                )}
                {isGrouped && (
                  <Badge variant="outline" className="text-[10px]">
                    Agrupado
                  </Badge>
                )}
                {isPaid && (
                  <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-600">
                    Pago
                  </Badge>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-slate-400 truncate">
                {conta.categoria} • {conta.descricao}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-bold text-sm">{formatCurrency(conta.valor)}</p>
              {conta.data_vencimento ? (
                <p className="text-xs text-gray-500">
                  Venc: {new Date(conta.data_vencimento).toLocaleDateString('pt-BR')}
                </p>
              ) : (
                <p className="text-xs text-red-500">Sem vencimento</p>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {conta.comprovante_url && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => handleViewComprovante(conta.comprovante_url!)}
                  title="Ver Nota Fiscal"
                >
                  <Paperclip className="w-4 h-4" />
                </Button>
              )}
              {needsAction && editingId === conta.id ? (
                <div className="flex items-center gap-1">
                  <Input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-36 h-8"
                  />
                  <Button
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => handleSetVencimento(conta.id)}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                </div>
              ) : needsAction ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => {
                    setEditingId(conta.id)
                    setNewDate('')
                  }}
                >
                  <Calendar className="w-3 h-3 mr-1" /> Definir
                </Button>
              ) : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}
