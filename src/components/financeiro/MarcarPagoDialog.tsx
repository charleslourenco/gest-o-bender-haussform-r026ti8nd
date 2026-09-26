import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/utils'
import { ExtendedTransaction } from '@/components/financeiro/FinanceiroMovimentacoes'

interface MarcarPagoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tipo: 'pagar' | 'receber'
  selectedTransactions: ExtendedTransaction[]
  onSuccess: () => void
}

const MEIO_PAGAMENTO_OPTIONS = [
  { value: 'Pix', label: 'Pix' },
  { value: 'Boleto', label: 'Boleto' },
  { value: 'Transferência', label: 'Transferência' },
  { value: 'Cartão', label: 'Cartão' },
  { value: 'Dinheiro', label: 'Dinheiro' },
  { value: 'Cheque', label: 'Cheque' },
]

export function MarcarPagoDialog({
  open,
  onOpenChange,
  tipo,
  selectedTransactions,
  onSuccess,
}: MarcarPagoDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [contas, setContas] = useState<any[]>([])

  const [meioPagamento, setMeioPagamento] = useState('Pix')
  const [contaBancariaId, setContaBancariaId] = useState('')
  const [dataPagamento, setDataPagamento] = useState(() => new Date().toISOString().split('T')[0])
  const [antecipado, setAntecipado] = useState(false)

  const table = tipo === 'pagar' ? 'contas_pagar' : 'contas_receber'
  const isPagar = tipo === 'pagar'

  useEffect(() => {
    if (!open) return
    setDataPagamento(new Date().toISOString().split('T')[0])
    setMeioPagamento('Pix')
    setAntecipado(false)

    // Se houver apenas 1 selecionado e ele já tiver valores padrão pré-preenchidos:
    if (selectedTransactions.length === 1) {
      const single = selectedTransactions[0]
      if (single.meioPagamento) setMeioPagamento(single.meioPagamento)
      if (single.contaBancariaId) setContaBancariaId(single.contaBancariaId)
      if (single.paidDate) setDataPagamento(single.paidDate)
      if (single.antecipado) setAntecipado(single.antecipado)
    }

    let cancelled = false
    const loadContas = async () => {
      setLoading(true)
      try {
        const { data } = await supabase
          .from('contas_bancarias')
          .select('id, nome_exibicao, banco, status')
          .eq('status', true)
          .order('nome_exibicao')
        if (!cancelled && data) {
          setContas(data)
          if (
            data.length > 0 &&
            (!contaBancariaId || !data.some((c: any) => c.id === contaBancariaId))
          ) {
            setContaBancariaId(data[0].id)
          }
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadContas()
    return () => {
      cancelled = true
    }
  }, [open, selectedTransactions])

  const totalValor = selectedTransactions.reduce((acc, t) => acc + (Number(t.amount) || 0), 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTransactions.length) return

    if (!contaBancariaId || contaBancariaId === 'none') {
      toast({
        title: 'Conta bancária obrigatória',
        description: 'Selecione a conta bancária para atualizar o saldo corretamente.',
        variant: 'destructive',
      })
      return
    }

    if (!meioPagamento) {
      toast({
        title: 'Meio de pagamento obrigatório',
        description: 'Selecione o meio de pagamento utilizado.',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      const ids = selectedTransactions.map((t) => t.id)
      const payload: any = {
        status_pagamento: 'pago',
        data_pagamento: dataPagamento || new Date().toISOString().split('T')[0],
        meio_pagamento: meioPagamento,
        conta_bancaria_id: contaBancariaId,
        antecipado: antecipado,
        atualizado_em: new Date().toISOString(),
      }

      const { error } = await supabase.from(table).update(payload).in('id', ids)

      if (error) throw error

      toast({
        title: 'Sucesso',
        description: `${ids.length} conta(s) marcada(s) como paga(s) e saldo bancário atualizado.`,
      })
      onOpenChange(false)
      onSuccess()
    } catch (err: any) {
      toast({
        title: 'Erro ao marcar como pago',
        description: err?.message || 'Falha ao atualizar o lançamento.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            Marcar como Pago ({selectedTransactions.length})
          </DialogTitle>
          <DialogDescription>
            Informe a conta bancária e meio de pagamento para registrar a baixa e atualizar o saldo
            bancário.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Carregando contas bancárias...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-muted rounded-lg p-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tipo:</span>
                <span className="font-semibold">
                  {isPagar ? 'Conta(s) a Pagar' : 'Conta(s) a Receber'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Quantidade selecionada:</span>
                <span className="font-semibold">{selectedTransactions.length} item(ns)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valor total:</span>
                <span className={`font-bold ${isPagar ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {formatCurrency(totalValor)}
                </span>
              </div>
              {selectedTransactions.length === 1 && (
                <div className="flex justify-between text-xs pt-1 border-t">
                  <span className="text-muted-foreground">
                    {isPagar ? 'Fornecedor:' : 'Cliente:'}
                  </span>
                  <span className="font-medium truncate max-w-[200px]">
                    {selectedTransactions[0].entityName || '-'}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="marcar-pago-conta" className="text-sm font-medium">
                Conta Bancária <span className="text-rose-500">*</span>
              </Label>
              <Select value={contaBancariaId} onValueChange={setContaBancariaId}>
                <SelectTrigger id="marcar-pago-conta">
                  <SelectValue placeholder="Selecione a conta bancária" />
                </SelectTrigger>
                <SelectContent>
                  {contas.length === 0 ? (
                    <SelectItem value="none_disabled" disabled>
                      Nenhuma conta bancária cadastrada
                    </SelectItem>
                  ) : (
                    contas
                      .filter((c) => c && c.id && String(c.id).trim() !== '')
                      .map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.nome_exibicao || 'Conta Bancária'}
                          {c.banco ? ` — ${c.banco}` : ''}
                        </SelectItem>
                      ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="marcar-pago-meio" className="text-sm font-medium">
                Meio de Pagamento <span className="text-rose-500">*</span>
              </Label>
              <Select value={meioPagamento} onValueChange={setMeioPagamento}>
                <SelectTrigger id="marcar-pago-meio">
                  <SelectValue placeholder="Selecione o meio de pagamento" />
                </SelectTrigger>
                <SelectContent>
                  {MEIO_PAGAMENTO_OPTIONS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="marcar-pago-data" className="text-sm font-medium">
                Data do Pagamento / Recebimento <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="marcar-pago-data"
                type="date"
                value={dataPagamento}
                onChange={(e) => setDataPagamento(e.target.value)}
                required
              />
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <Checkbox
                id="marcar-pago-antecipado"
                checked={antecipado}
                onCheckedChange={(v) => setAntecipado(v === true)}
              />
              <Label htmlFor="marcar-pago-antecipado" className="cursor-pointer text-sm">
                Pagamento Antecipado
              </Label>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving || !contaBancariaId || contas.length === 0}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                )}
                {saving ? 'Confirmando...' : 'Confirmar Pagamento'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
