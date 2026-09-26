import { useState, useMemo, useEffect } from 'react'
import { Loader2, Layers } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'
import type { ExtendedTransaction } from '@/components/financeiro/FinanceiroMovimentacoes'

interface AgruparContasDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedTransactions: ExtendedTransaction[]
  onSuccess: () => void
}

export function AgruparContasDialog({
  open,
  onOpenChange,
  selectedTransactions,
  onSuccess,
}: AgruparContasDialogProps) {
  const [numParcelas, setNumParcelas] = useState('2')
  const [meioPagamento, setMeioPagamento] = useState('Boleto')
  const [dataPrimeiroVencimento, setDataPrimeiroVencimento] = useState('')
  const [contaBancariaId, setContaBancariaId] = useState('none')
  const [contas, setContas] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      supabase
        .from('contas_bancarias')
        .select('id, nome_exibicao, status')
        .order('nome_exibicao')
        .then(({ data }) => {
          if (data) setContas(data.filter((c) => c.status))
        })
    }
  }, [open])

  const total = useMemo(
    () => selectedTransactions.reduce((sum, t) => sum + t.amount, 0),
    [selectedTransactions],
  )

  const valorParcela = useMemo(() => {
    const n = parseInt(numParcelas) || 1
    return n > 0 ? total / n : 0
  }, [total, numParcelas])

  const fornecedor = selectedTransactions[0]?.entityName || ''
  const ids = useMemo(() => selectedTransactions.map((t) => t.id), [selectedTransactions])

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  const resetForm = () => {
    setNumParcelas('2')
    setMeioPagamento('Boleto')
    setDataPrimeiroVencimento('')
    setContaBancariaId('none')
  }

  const handleSubmit = async () => {
    if (!dataPrimeiroVencimento) {
      toast({
        title: 'Erro',
        description: 'Informe a data do primeiro vencimento.',
        variant: 'destructive',
      })
      return
    }

    const parcelasNum = parseInt(numParcelas)
    if (!parcelasNum || parcelasNum < 1) {
      toast({
        title: 'Erro',
        description: 'Informe um número válido de parcelas.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const { data, error } = await supabase.rpc('group_contas_pagar', {
        p_ids: ids,
        p_num_parcelas: parcelasNum,
        p_meio_pagamento: meioPagamento,
        p_data_primeiro_vencimento: dataPrimeiroVencimento,
        p_user_id: user?.id,
        p_conta_bancaria_id: contaBancariaId === 'none' ? null : contaBancariaId,
      })

      if (error) throw error

      toast({
        title: 'Sucesso',
        description: `Contas agrupadas em ${parcelasNum}x de ${formatCurrency(valorParcela)}.`,
      })
      resetForm()
      onOpenChange(false)
      onSuccess()
    } catch (err: any) {
      toast({
        title: 'Erro ao agrupar',
        description: err.message || 'Falha ao agrupar contas.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetForm()
        onOpenChange(v)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-blue-600" />
            Agrupar Contas para Pagamento
          </DialogTitle>
          <DialogDescription>
            Fornecedor: <strong>{fornecedor}</strong>
            <br />
            {selectedTransactions.length} conta(s) selecionada(s)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted rounded-lg p-3 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total selecionado:</span>
              <span className="font-bold">{formatCurrency(total)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Nº de parcelas:</span>
              <span>{numParcelas}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Valor por parcela:</span>
              <span className="font-bold text-emerald-600">{formatCurrency(valorParcela)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="num-parcelas">Número de Parcelas</Label>
              <Input
                id="num-parcelas"
                type="number"
                min={1}
                value={numParcelas}
                onChange={(e) => setNumParcelas(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Meio de Pagamento</Label>
              <Select value={meioPagamento} onValueChange={setMeioPagamento}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Boleto">Boleto</SelectItem>
                  <SelectItem value="Transferência">Transferência</SelectItem>
                  <SelectItem value="Pix">Pix</SelectItem>
                  <SelectItem value="Cartão">Cartão</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                  <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="data-primeiro-venc">Data do Primeiro Vencimento</Label>
            <Input
              id="data-primeiro-venc"
              type="date"
              value={dataPrimeiroVencimento}
              onChange={(e) => setDataPrimeiroVencimento(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Conta Bancária (opcional)</Label>
            <Select value={contaBancariaId} onValueChange={setContaBancariaId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma conta" />
              </SelectTrigger>
              <SelectContent className="max-h-56">
                <SelectItem value="none">Nenhuma</SelectItem>
                {contas
                  .filter((c) => c && c.id && String(c.id).trim() !== '')
                  .map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.nome_exibicao || 'Conta Bancária'}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar Agrupamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
