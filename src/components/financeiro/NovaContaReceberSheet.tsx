import { useState, useEffect } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
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
import { useAuth } from '@/hooks/use-auth'
import { ArrowUpCircle } from 'lucide-react'

export function NovaContaReceberSheet({ onRefresh }: { onRefresh: () => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [clientes, setClientes] = useState<any[]>([])
  const { toast } = useToast()
  const { user } = useAuth()

  const [formData, setFormData] = useState({
    cliente_id: '',
    valor: '',
    data_vencimento: '',
    status_pagamento: 'aguardando',
    descricao: '',
    categoria: '',
    meio_pagamento: '',
    numero_parcela: '1/1',
  })

  useEffect(() => {
    if (open) {
      supabase
        .from('clientes')
        .select('id, nome')
        .order('nome')
        .then(({ data }) => {
          if (data) setClientes(data)
        })
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.from('contas_receber').insert({
        user_id: user?.id,
        cliente_id: formData.cliente_id,
        valor: parseFloat(formData.valor),
        data_vencimento: formData.data_vencimento,
        status_pagamento: formData.status_pagamento,
        descricao: formData.descricao,
        categoria: formData.categoria,
        meio_pagamento: formData.meio_pagamento,
        numero_parcela: formData.numero_parcela,
      })

      if (error) throw error

      toast({ title: 'Sucesso', description: 'Conta a receber cadastrada com sucesso!' })
      setOpen(false)
      onRefresh()
      setFormData({
        cliente_id: '',
        valor: '',
        data_vencimento: '',
        status_pagamento: 'aguardando',
        descricao: '',
        categoria: '',
        meio_pagamento: '',
        numero_parcela: '1/1',
      })
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 w-full sm:w-auto"
        >
          <ArrowUpCircle className="h-4 w-4 mr-2" />
          Nova Conta a Receber
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Cadastrar Conta a Receber</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          <div className="space-y-2">
            <Label>Cliente *</Label>
            <Select
              required
              value={formData.cliente_id}
              onValueChange={(v) => setFormData({ ...formData, cliente_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um cliente" />
              </SelectTrigger>
              <SelectContent>
                {clientes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valor (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                required
                value={formData.valor}
                onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Data de Venc. *</Label>
              <Input
                type="date"
                required
                value={formData.data_vencimento}
                onChange={(e) => setFormData({ ...formData, data_vencimento: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Status *</Label>
            <Select
              value={formData.status_pagamento}
              onValueChange={(v) => setFormData({ ...formData, status_pagamento: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aguardando">Aguardando</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Input
                value={formData.categoria}
                onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Meio de Pgto</Label>
              <Input
                value={formData.meio_pagamento}
                onChange={(e) => setFormData({ ...formData, meio_pagamento: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Parcela</Label>
            <Input
              value={formData.numero_parcela}
              placeholder="Ex: 1/1"
              onChange={(e) => setFormData({ ...formData, numero_parcela: e.target.value })}
            />
          </div>
          <Button type="submit" className="w-full mt-4" disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar Conta'}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
