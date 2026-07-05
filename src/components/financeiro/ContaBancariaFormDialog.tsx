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
import { Switch } from '@/components/ui/switch'
import { Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { ContaBancaria, upsertContaBancaria } from '@/services/contas-bancarias'
import { CurrencyInput } from '@/components/ui/currency-input'

export function ContaBancariaFormDialog({
  open,
  onOpenChange,
  conta,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  conta: ContaBancaria | null
  onSuccess: () => void
}) {
  const [nome, setNome] = useState('')
  const [banco, setBanco] = useState('')
  const [agencia, setAgencia] = useState('')
  const [numeroConta, setNumeroConta] = useState('')
  const [saldoInicial, setSaldoInicial] = useState('')
  const [status, setStatus] = useState(true)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      setNome(conta?.nome_exibicao || '')
      setBanco(conta?.banco || '')
      setAgencia(conta?.agencia || '')
      setNumeroConta(conta?.numero_conta || '')
      setSaldoInicial(conta ? String(conta.saldo_inicial) : '')
      setStatus(conta?.status ?? true)
    }
  }, [open, conta])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await upsertContaBancaria({
        id: conta?.id,
        nome_exibicao: nome,
        banco,
        agencia,
        numero_conta: numeroConta,
        saldo_inicial: saldoInicial ? Number(saldoInicial) : 0,
        status,
      })
      toast({ title: 'Sucesso', description: conta ? 'Conta atualizada.' : 'Conta criada.' })
      onOpenChange(false)
      onSuccess()
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{conta ? 'Editar Conta Bancária' : 'Nova Conta Bancária'}</DialogTitle>
          <DialogDescription>Preencha os dados da conta.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome da Conta</Label>
            <Input
              id="nome"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Conta Operacional"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="banco">Banco</Label>
            <Input
              id="banco"
              value={banco}
              onChange={(e) => setBanco(e.target.value)}
              placeholder="Ex: Banco do Brasil"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="agencia">Agência</Label>
              <Input id="agencia" value={agencia} onChange={(e) => setAgencia(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="numero">Número da Conta</Label>
              <Input
                id="numero"
                value={numeroConta}
                onChange={(e) => setNumeroConta(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="saldo">Saldo Inicial (R$)</Label>
            <CurrencyInput
              id="saldo"
              value={saldoInicial}
              onValueChange={(val: number | string) => setSaldoInicial(val ? val.toString() : '')}
              placeholder="R$ 0,00"
              disabled={!!conta}
            />
            {conta && (
              <p className="text-xs text-gray-500">
                O saldo inicial não pode ser alterado após a criação.
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={status} onCheckedChange={setStatus} id="status" />
            <Label htmlFor="status">Conta ativa</Label>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {conta ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
