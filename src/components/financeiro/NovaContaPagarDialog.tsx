import { useState, useEffect, useMemo, useCallback } from 'react'
import { CircleArrowDown, Loader2, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { CurrencyInput } from '@/components/ui/currency-input'
import { UnifiedPayeeSelect, PayeeOption } from './UnifiedPayeeSelect'
import { DivisaoRow } from './DivisoesRateioSection'
import { formatCurrency } from '@/lib/utils'

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDate()
  d.setMonth(d.getMonth() + months)
  if (d.getDate() < day) d.setDate(0)
  return d.toISOString().slice(0, 10)
}

export function NovaContaPagarDialog({ onRefresh }: { onRefresh?: () => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()

  const [payee, setPayee] = useState<PayeeOption | null>(null)
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [dataVencimento, setDataVencimento] = useState('')
  const [categoria, setCategoria] = useState('')
  const [contaBancariaId, setContaBancariaId] = useState('none')
  const [contas, setContas] = useState<any[]>([])
  const [recorrente, setRecorrente] = useState(false)
  const [qtdMeses, setQtdMeses] = useState('2')
  const [divisoes, setDivisoes] = useState<DivisaoRow[]>([])
  const [divisaoError, setDivisaoError] = useState<string | null>(null)
  const [observacoes, setObservacoes] = useState('')

  useEffect(() => {
    if (!open) {
      supabase
        .from('contas_bancarias')
        .select('id, nome_exibicao, status')
        .order('nome_exibicao')
        .then(({ data }) => {
          if (data) setContas(data.filter((c: any) => c.status))
        })
    }
  }, [open])

  const isValid = useMemo(() => {
    return payee !== null && Number(valor) > 0 && !!dataVencimento
  }, [payee, valor, dataVencimento])

  const divisaoDiff = useMemo(() => {
    const totalDivisoes = divisoes.reduce((acc, r) => acc + (Number(r.valor) || 0), 0)
    return Number(valor) - totalDivisoes
  }, [divisoes, valor])

  const divisoesValid = useMemo(() => {
    if (divisoes.length === 0) return true
    if (Math.abs(divisaoDiff) > 0.001) return false
    return divisoes.every((d) => d.descricao.trim() !== '' && Number(d.valor) > 0)
  }, [divisoes, divisaoDiff])

  const handleDivisoesChange = useCallback((next: DivisaoRow[]) => {
    setDivisoes(next)
    setDivisaoError(null)
  }, [])

  const divisoesTotal = useMemo(() => {
    return divisoes.reduce((acc, d) => acc + (Number(d.valor) || 0), 0)
  }, [divisoes])

  const divisoesMatch = useMemo(() => {
    if (divisoes.length === 0) return true
    return Math.round(divisoesTotal * 100) === Math.round(Number(valor) * 100)
  }, [divisoes.length, divisoesTotal, valor])

  function addDivisao() {
    setDivisoes((prev) => [...prev, { descricao: '', valor: '' }])
  }

  function removeDivisao(index: number) {
    setDivisoes((prev) => prev.filter((_, i) => i !== index))
  }

  function updateDivisao(index: number, field: 'descricao' | 'valor', value: string) {
    setDivisoes((prev) => prev.map((d, i) => (i === index ? { ...d, [field]: value } : d)))
  }

  const resetForm = () => {
    setPayee(null)
    setDescricao('')
    setValor('')
    setDataVencimento('')
    setCategoria('')
    setContaBancariaId('none')
    setRecorrente(false)
    setQtdMeses('2')
    setDivisoes([])
    setObservacoes('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid || !payee) return
    try {
      setLoading(true)
      const valorNum = Number(valor)
      const meses = recorrente ? Math.max(1, parseInt(qtdMeses, 10) || 1) : 1
      const grupoId = meses > 1 ? crypto.randomUUID() : null

      const hasDivisoes = divisoes.length > 0

      if (hasDivisoes && !divisoesMatch) {
        toast({
          title: 'Divisões inválidas',
          description: 'A soma das divisões deve ser igual ao valor total da conta a pagar.',
          variant: 'destructive',
        })
        return
      }

      if (hasDivisoes) {
        const divisoesPayload = divisoes
          .filter((d) => d.descricao.trim() !== '' && Number(d.valor) > 0)
          .map((d) => ({ descricao: d.descricao.trim(), valor: Number(d.valor) }))

        if (divisoesPayload.length !== divisoes.length) {
          toast({
            title: 'Divisões incompletas',
            description: 'Preencha a descrição e o valor de todas as divisões.',
            variant: 'destructive',
          })
          return
        }

        const { data: rpcData, error: rpcError } = await supabase.rpc(
          'insert_conta_pagar_with_divisoes',
          {
            p_fornecedor: payee.name,
            p_descricao: descricao,
            p_valor: valorNum,
            p_data_vencimento: dataVencimento,
            p_categoria: categoria || null,
            p_user_id: user?.id,
            p_conta_bancaria_id: contaBancariaId === 'none' ? null : contaBancariaId,
            p_meses: meses,
            p_divisoes: divisoesPayload,
            p_grupo_id: grupoId,
            p_observacoes: observacoes || null,
          },
        )

        if (rpcError) throw rpcError

        toast({
          title: 'Sucesso',
          description:
            meses > 1
              ? `${meses} contas a pagar recorrentes cadastradas com divisões.`
              : 'Conta a pagar cadastrada com sucesso.',
        })
      } else {
        const rows: any[] = []
        for (let i = 0; i < meses; i++) {
          rows.push({
            fornecedor: payee.name,
            descricao,
            valor: valorNum,
            data_vencimento: addMonths(dataVencimento, i),
            categoria: categoria || null,
            user_id: user?.id,
            status_pagamento: 'aguardando',
            conta_bancaria_id: contaBancariaId === 'none' ? null : contaBancariaId,
            grupo_id: grupoId,
            observacoes: observacoes || null,
          })
        }

        const { error } = await supabase.from('contas_pagar').insert(rows)
        if (error) throw error

        toast({
          title: 'Sucesso',
          description:
            meses > 1
              ? `${meses} contas a pagar recorrentes cadastradas.`
              : 'Conta a pagar cadastrada com sucesso.',
        })
      }
      setOpen(false)
      resetForm()
      onRefresh?.()
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error?.message || 'Não foi possível cadastrar a conta.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-red-600 hover:bg-red-700 text-white border-0 inline-flex items-center rounded-md h-10 px-4 w-full sm:w-auto">
          <CircleArrowDown className="mr-2 h-4 w-4 text-white" />
          Nova Conta a Pagar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Conta a Pagar</DialogTitle>
          <DialogDescription>
            Preencha os dados abaixo para cadastrar uma nova despesa.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <UnifiedPayeeSelect value={payee} onChange={setPayee} />

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Input
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Compra de materiais"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="valor">Valor (R$) *</Label>
              <CurrencyInput
                id="valor"
                value={valor}
                onValueChange={(val: number | string) => setValor(val ? val.toString() : '')}
                placeholder="R$ 0,00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dataVencimento">Vencimento *</Label>
              <Input
                id="dataVencimento"
                type="date"
                value={dataVencimento}
                onChange={(e) => setDataVencimento(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="categoria">Categoria</Label>
              <Input
                id="categoria"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                placeholder="Ex: Material de Consumo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contaBancaria">Conta Bancária</Label>
              <Select value={contaBancariaId} onValueChange={setContaBancariaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {contas.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome_exibicao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-md border p-3 space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="recorrente"
                checked={recorrente}
                onCheckedChange={(v) => setRecorrente(v === true)}
              />
              <Label htmlFor="recorrente" className="cursor-pointer">
                Lançamento Recorrente
              </Label>
            </div>
            {recorrente && (
              <div className="space-y-2">
                <Label htmlFor="qtdMeses">Quantidade de Meses</Label>
                <Input
                  id="qtdMeses"
                  type="number"
                  min={1}
                  max={60}
                  value={qtdMeses}
                  onChange={(e) => setQtdMeses(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Serão criadas {Math.max(1, parseInt(qtdMeses, 10) || 1)} contas, com vencimento
                  mensal a partir de {dataVencimento || '—'}.
                </p>
              </div>
            )}
          </div>

          <div className="rounded-md border p-3 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Divisões / Rateio</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                onClick={addDivisao}
              >
                <Plus className="w-3 h-3 mr-1" /> Adicionar divisão
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Opcional. A soma das divisões deve ser igual ao valor total.
            </p>
            {divisoes.length > 0 && (
              <div className="space-y-2">
                {divisoes.map((div, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      value={div.descricao}
                      onChange={(e) => updateDivisao(idx, 'descricao', e.target.value)}
                      placeholder="Ex: Ajuda de custo"
                      className="flex-1 h-9"
                    />
                    <CurrencyInput
                      value={div.valor}
                      onValueChange={(val: number | string) =>
                        updateDivisao(idx, 'valor', val ? val.toString() : '')
                      }
                      placeholder="R$ 0,00"
                      className="w-32 h-9"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 p-0 text-red-600 hover:text-red-700"
                      onClick={() => removeDivisao(idx)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-1 border-t">
                  <span className="text-xs font-medium text-muted-foreground">
                    Total das divisões:
                  </span>
                  <span
                    className={`text-sm font-bold ${
                      divisoesMatch ? 'text-emerald-600' : 'text-red-600'
                    }`}
                  >
                    {formatCurrency(divisoesTotal)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Notas adicionais sobre este lançamento..."
              rows={2}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading || !isValid}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? 'Salvando...' : 'Salvar Conta a Pagar'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
