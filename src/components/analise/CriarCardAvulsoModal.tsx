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
  const [nome, setNome] = useState(baseCard?.nome_produto || '')
  const [clienteId, setClienteId] = useState(baseCard?.cliente_id || '')
  const [qtd, setQtd] = useState<number | ''>(baseCard?.qtd || 1)
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
    if (!nome || !clienteId || qtd === '') {
      toast({ description: 'Preencha todos os campos obrigatórios.', variant: 'destructive' })
      return
    }
    setLoading(true)
    const newCard = {
      nome_produto: nome,
      status_analise: 'iniciar',
      qtd: Number(qtd),
      valor_unitario: 0,
      valor_total: 0,
      cliente_id: clienteId,
      descricao: descricao || null,
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
      toast({ description: 'Card avulso criado com sucesso!' })
      onSuccess()
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card text-card-foreground border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Criar Card Avulso</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-foreground">
              Cliente <span className="text-destructive">*</span>
            </Label>
            <Select value={clienteId} onValueChange={setClienteId} disabled={!!baseCard}>
              <SelectTrigger className="bg-background border-input text-foreground disabled:opacity-50">
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
            <Label className="text-foreground">
              Nome do Produto/Serviço <span className="text-destructive">*</span>
            </Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Vidro Canelado 8mm"
              className="bg-background border-input text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label className="text-foreground">
                Quantidade <span className="text-destructive">*</span>
              </Label>
              <Input
                type="number"
                min="1"
                value={qtd}
                onChange={(e) => setQtd(e.target.value ? Number(e.target.value) : '')}
                className="bg-background border-input text-foreground"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">Descrição (Opcional)</Label>
            <Textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Detalhes adicionais..."
              className="resize-none bg-background border-input text-foreground placeholder:text-muted-foreground"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter className="border-t border-border pt-4 mt-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="bg-transparent border-input text-foreground hover:bg-muted/50 hover:text-foreground"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleCreate}
            disabled={loading || !nome || !clienteId || qtd === ''}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Criar Card
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
