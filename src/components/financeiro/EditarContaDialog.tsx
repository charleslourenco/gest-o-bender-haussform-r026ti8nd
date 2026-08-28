import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import { CurrencyInput } from '@/components/ui/currency-input'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'
import { deleteContaPagar, deleteContaReceber } from '@/services/contas-financeiras'

export type EditarTipo = 'pagar' | 'receber'

interface EditarContaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tipo: EditarTipo
  conta: any
  onSuccess: () => void
}

const STATUS_OPTIONS = [
  { value: 'aguardando', label: 'Aguardando' },
  { value: 'a_classificar', label: 'A Classificar' },
  { value: 'pago', label: 'Pago' },
  { value: 'agrupado', label: 'Agrupado' },
]

export function EditarContaDialog({
  open,
  onOpenChange,
  tipo,
  conta,
  onSuccess,
}: EditarContaDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [dataVencimento, setDataVencimento] = useState('')
  const [entidade, setEntidade] = useState('')
  const [categoria, setCategoria] = useState('')
  const [status, setStatus] = useState('aguardando')
  const [meioPagamento, setMeioPagamento] = useState('')
  const [contaBancariaId, setContaBancariaId] = useState('none')
  const [dataPagamento, setDataPagamento] = useState('')
  const [antecipado, setAntecipado] = useState(false)
  const [clientes, setClientes] = useState<any[]>([])
  const [contasBancarias, setContasBancarias] = useState<any[]>([])

  useEffect(() => {
    if (open && conta) {
      setDescricao(conta.descricao || '')
      setValor(conta.valor?.toString() || '')
      setDataVencimento(conta.data_vencimento || '')
      setEntidade(tipo === 'pagar' ? conta.fornecedor || '' : conta.cliente_id || 'none')
      setCategoria(conta.categoria || '')
      setStatus((conta.status_pagamento || 'aguardando').toLowerCase())
      setMeioPagamento(conta.meio_pagamento || 'Pix')
      setContaBancariaId(conta.conta_bancaria_id || 'none')
      setDataPagamento(conta.data_pagamento || new Date().toISOString().split('T')[0])
      setAntecipado(!!conta.antecipado)
      setConfirmDelete(false)
    }
  }, [open, conta, tipo])

  useEffect(() => {
    if (!open) return

    if (tipo === 'receber') {
      supabase
        .from('clientes')
        .select('id, nome')
        .order('nome')
        .then(({ data }) => {
          if (data) setClientes(data)
        })
    }

    supabase
      .from('contas_bancarias')
      .select('id, nome_exibicao, banco, status')
      .eq('status', true)
      .order('nome_exibicao')
      .then(({ data }) => {
        if (data) setContasBancarias(data)
      })
  }, [open, tipo])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!conta) return
    setLoading(true)
    try {
      const valorNum = Number(valor) || 0
      const isPago = status.toLowerCase() === 'pago'

      if (isPago && (!contaBancariaId || contaBancariaId === 'none')) {
        toast({
          title: 'Conta bancária obrigatória',
          description:
            'Ao definir status como Pago, selecione a conta bancária para atualizar o saldo.',
          variant: 'destructive',
        })
        setLoading(false)
        return
      }

      const payload: any = {
        descricao: descricao || null,
        valor: valorNum,
        data_vencimento: dataVencimento || null,
        categoria: categoria || null,
        status_pagamento: status,
        meio_pagamento: isPago ? meioPagamento || null : null,
        conta_bancaria_id: isPago ? (contaBancariaId === 'none' ? null : contaBancariaId) : null,
        data_pagamento: isPago ? dataPagamento || new Date().toISOString().split('T')[0] : null,
        antecipado: isPago ? antecipado : false,
        atualizado_em: new Date().toISOString(),
      }

      if (tipo === 'pagar') {
        payload.fornecedor = entidade || 'Desconhecido'
        const { error } = await supabase.from('contas_pagar').update(payload).eq('id', conta.id)
        if (error) throw error
      } else {
        payload.cliente_id = entidade === 'none' ? null : entidade
        const { error } = await supabase.from('contas_receber').update(payload).eq('id', conta.id)
        if (error) throw error
      }
      toast({ title: 'Sucesso', description: 'Lançamento atualizado.' })
      onOpenChange(false)
      onSuccess()
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err.message || 'Falha ao atualizar.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!conta) return
    setDeleting(true)
    try {
      const { error } =
        tipo === 'pagar' ? await deleteContaPagar(conta.id) : await deleteContaReceber(conta.id)
      if (error) throw error
      toast({ title: 'Sucesso', description: 'Lançamento excluído.' })
      onOpenChange(false)
      onSuccess()
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err.message || 'Falha ao excluir.',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar {tipo === 'pagar' ? 'Conta a Pagar' : 'Conta a Receber'}</DialogTitle>
          <DialogDescription>Atualize os dados do lançamento financeiro.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-descricao">Descrição</Label>
            <Input
              id="edit-descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descrição"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-entidade">{tipo === 'pagar' ? 'Fornecedor' : 'Cliente'}</Label>
            {tipo === 'pagar' ? (
              <Input
                id="edit-entidade"
                value={entidade}
                onChange={(e) => setEntidade(e.target.value)}
                placeholder="Nome do fornecedor"
              />
            ) : (
              <Select value={entidade} onValueChange={setEntidade}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-valor">Valor (R$)</Label>
              <CurrencyInput
                id="edit-valor"
                value={valor}
                onValueChange={(val) => setValor(val ? val.toString() : '')}
                placeholder="R$ 0,00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-vencimento">Vencimento</Label>
              <Input
                id="edit-vencimento"
                type="date"
                value={dataVencimento}
                onChange={(e) => setDataVencimento(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-categoria">Categoria</Label>
              <Input
                id="edit-categoria"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                placeholder="Categoria"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {status.toLowerCase() === 'pago' && (
            <div className="rounded-md border p-3 space-y-3 bg-muted/40">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Dados de Pagamento / Baixa Bancária
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-conta-bancaria" className="text-xs">
                    Conta Bancária <span className="text-rose-500">*</span>
                  </Label>
                  <Select value={contaBancariaId} onValueChange={setContaBancariaId}>
                    <SelectTrigger id="edit-conta-bancaria" className="h-9">
                      <SelectValue placeholder="Selecione a conta" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Selecione...</SelectItem>
                      {contasBancarias.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nome_exibicao}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-meio-pagamento" className="text-xs">
                    Meio de Pagamento <span className="text-rose-500">*</span>
                  </Label>
                  <Select value={meioPagamento} onValueChange={setMeioPagamento}>
                    <SelectTrigger id="edit-meio-pagamento" className="h-9">
                      <SelectValue placeholder="Selecione o meio" />
                    </SelectTrigger>
                    <SelectContent>
                      {['Pix', 'Boleto', 'Transferência', 'Cartão', 'Dinheiro', 'Cheque'].map(
                        (m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-data-pagamento" className="text-xs">
                  Data do Pagamento
                </Label>
                <Input
                  id="edit-data-pagamento"
                  type="date"
                  className="h-9"
                  value={dataPagamento}
                  onChange={(e) => setDataPagamento(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between">
            <div className="flex gap-2">
              {confirmDelete ? (
                <>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={deleting}
                    onClick={handleDelete}
                  >
                    {deleting ? 'Excluindo...' : 'Confirmar'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmDelete(false)}
                  >
                    Cancelar
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-300 hover:bg-red-50"
                  onClick={() => setConfirmDelete(true)}
                >
                  Excluir
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
