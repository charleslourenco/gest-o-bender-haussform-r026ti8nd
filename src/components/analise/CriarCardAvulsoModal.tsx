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
import { Textarea } from '@/components/ui/textarea'
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
  const [qtd, setQtd] = useState<number | ''>(1)
  const [valorUnitario, setValorUnitario] = useState<number | ''>('')
  const [descricao, setDescricao] = useState('')

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
    if (!nome || !clienteId || qtd === '' || valorUnitario === '') {
      toast({ description: 'Preencha todos os campos obrigatórios.', variant: 'destructive' })
      return
    }
    setLoading(true)
    const newCard = {
      nome_produto: nome,
      status_analise: 'iniciar',
      qtd: Number(qtd),
      valor_unitario: Number(valorUnitario),
      valor_total: Number(qtd) * Number(valorUnitario),
      cliente_id: clienteId,
      descricao: descricao || null,
      formulario_comercial_id: null,
      is_outsourced: true,
      outsourced_checked: true,
      terceirizado_validado: true,
    }
    const { error } = await supabase.from('produtos_servicos_projeto').insert([newCard])
    setLoading(false)
    if (error) {
      toast({ description: 'Erro ao criar card avulso.', variant: 'destructive' })
    } else {
      toast({ description: 'Card avulso criado com sucesso!' })
      onSuccess()
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Criar Card Avulso</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>
              Cliente <span className="text-red-500">*</span>
            </Label>
            <Select value={clienteId} onValueChange={setClienteId} disabled={!!baseCard}>
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
          <div className="space-y-2">
            <Label>
              Nome do Produto/Serviço <span className="text-red-500">*</span>
            </Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Vidro Canelado 8mm"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Quantidade <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                min="1"
                value={qtd}
                onChange={(e) => setQtd(e.target.value ? Number(e.target.value) : '')}
              />
            </div>
            <div className="space-y-2">
              <Label>
                Valor Unitário (R$) <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={valorUnitario}
                onChange={(e) => setValorUnitario(e.target.value ? Number(e.target.value) : '')}
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Descrição (Opcional)</Label>
            <Textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Detalhes adicionais..."
              className="resize-none"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleCreate}
            disabled={loading || !nome || !clienteId || qtd === '' || valorUnitario === ''}
          >
            Criar Card
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
