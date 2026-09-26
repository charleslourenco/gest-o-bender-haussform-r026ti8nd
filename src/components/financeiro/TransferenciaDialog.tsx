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
import { Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { ContaBancaria, createTransferencia } from '@/services/contas-bancarias'
import { CurrencyInput } from '@/components/ui/currency-input'

export function TransferenciaDialog({
  open,
  onOpenChange,
  contas,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  contas: ContaBancaria[]
  onSuccess: () => void
}) {
  const [origem, setOrigem] = useState('')
  const [destino, setDestino] = useState('')
  const [valor, setValor] = useState('')
  const [data, setData] = useState('')
  const [descricao, setDescricao] = useState('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()

  useEffect(() => {
    if (open) {
      setOrigem('')
      setDestino('')
      setValor('')
      setData(new Date().toISOString().split('T')[0])
      setDescricao('')
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!origem || !destino) {
      toast({ title: 'Erro', description: 'Selecione as contas.', variant: 'destructive' })
      return
    }
    if (origem === destino) {
      toast({
        title: 'Erro',
        description: 'Contas de origem e destino devem ser diferentes.',
        variant: 'destructive',
      })
      return
    }
    if (!valor || Number(valor) <= 0) {
      toast({ title: 'Erro', description: 'Informe um valor válido.', variant: 'destructive' })
      return
    }
    setLoading(true)
    try {
      await createTransferencia({
        conta_origem_id: origem,
        conta_destino_id: destino,
        valor: Number(valor),
        data_transferencia: data,
        descricao,
        usuario_id: user?.id,
      })
      toast({ title: 'Sucesso', description: 'Transferência registrada.' })
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
          <DialogTitle>Nova Transferência</DialogTitle>
          <DialogDescription>Transfira valores entre contas bancárias internas.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Conta de Origem</Label>
            <Select value={origem} onValueChange={setOrigem}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {contas
                  .filter((c) => c && c.id && String(c.id).trim() !== '')
                  .map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.nome_exibicao || 'Conta Bancária'}
                    </SelectItem>
                  ))}{' '}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Conta de Destino</Label>
            <Select value={destino} onValueChange={setDestino}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {contas
                  .filter((c) => c && c.id && String(c.id).trim() !== '')
                  .map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.nome_exibicao || 'Conta Bancária'}
                    </SelectItem>
                  ))}{' '}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <CurrencyInput
                value={valor}
                onValueChange={(val: number | string) => setValor(val ? val.toString() : '')}
                placeholder="R$ 0,00"
              />
            </div>
            <div className="space-y-2">
              <Label>Data</Label>
              <Input type="date" required value={data} onChange={(e) => setData(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Descrição (opcional)</Label>
            <Input
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Cobertura de fluxo de caixa"
            />
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
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Transferir
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
