import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function CriarCardAvulsoModal({ onClose, onSuccess, baseCard }: any) {
  const [nome, setNome] = useState('')
  const [clienteId, setClienteId] = useState(baseCard?.cliente_id || '')
  const [clientes, setClientes] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const fetchClientes = async () => {
      const { data } = await supabase.from('clientes').select('id, nome').order('nome')
      if (data) setClientes(data)
    }
    fetchClientes()
  }, [])

  const handleCreate = async () => {
    if (!nome) return
    setLoading(true)
    const newCard = {
      nome_produto: nome,
      status_analise: 'iniciar',
      qtd: 1,
      valor_unitario: 0,
      valor_total: 0,
      cliente_id: clienteId || null,
      formulario_comercial_id: baseCard?.formulario_comercial_id || null,
      is_outsourced: true,
      outsourced_checked: true,
      terceirizado_validado: true,
    }
    const { error } = await supabase.from('produtos_servicos_projeto').insert([newCard])
    setLoading(false)
    if (error) {
      toast({ description: 'Erro ao criar card avulso.', variant: 'destructive' })
    } else {
      onSuccess()
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>+ Criar Card Avulso / Terceirizado</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nome do Serviço/Produto Terceirizado</Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Vidro Canelado 8mm"
            />
          </div>
          {!baseCard && (
            <div className="space-y-2">
              <Label>Cliente (Opcional)</Label>
              <Select value={clienteId} onValueChange={setClienteId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cliente" />
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
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={loading || !nome}>
            Criar Card
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
