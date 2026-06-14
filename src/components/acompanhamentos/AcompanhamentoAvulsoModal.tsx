import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'

export function AcompanhamentoAvulsoModal({ open, onOpenChange, onSuccess }: any) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [responsaveis, setResponsaveis] = useState<any[]>([])
  const [formData, setFormData] = useState({
    codigo_projeto: '',
    nome_cliente: '',
    tipo_acompanhamento: '',
    responsavel_id: 'none',
    quantidade_itens: 1,
  })

  useEffect(() => {
    if (open) {
      supabase
        .from('responsaveis_acompanhamentos')
        .select('*')
        .then(({ data }) => {
          if (data) setResponsaveis(data)
        })
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const code =
      formData.codigo_projeto || `ACP-${Math.random().toString(36).substr(2, 6).toUpperCase()}`

    const { error } = await supabase.from('acompanhamentos').insert({
      codigo_projeto: code,
      nome_cliente: formData.nome_cliente,
      tipo_acompanhamento: formData.tipo_acompanhamento,
      responsavel_id: formData.responsavel_id === 'none' ? null : formData.responsavel_id,
      quantidade_itens: formData.quantidade_itens,
      status_atual: 'INÍCIO',
    })

    setLoading(false)

    if (error) {
      toast({
        title: 'Erro ao criar acompanhamento',
        description: error.message,
        variant: 'destructive',
      })
    } else {
      toast({ title: 'Card criado com sucesso' })
      onSuccess()
      onOpenChange(false)
      setFormData({
        codigo_projeto: '',
        nome_cliente: '',
        tipo_acompanhamento: '',
        responsavel_id: 'none',
        quantidade_itens: 1,
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar Acompanhamento Avulso</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Código do Projeto (Opcional)</Label>
            <Input
              value={formData.codigo_projeto}
              onChange={(e) => setFormData({ ...formData, codigo_projeto: e.target.value })}
              placeholder="Ex: PRJ-123"
            />
          </div>
          <div className="space-y-2">
            <Label>Nome do Cliente</Label>
            <Input
              required
              value={formData.nome_cliente}
              onChange={(e) => setFormData({ ...formData, nome_cliente: e.target.value })}
              placeholder="Ex: João Silva"
            />
          </div>
          <div className="space-y-2">
            <Label>Tipo de Acompanhamento</Label>
            <Input
              required
              value={formData.tipo_acompanhamento}
              onChange={(e) => setFormData({ ...formData, tipo_acompanhamento: e.target.value })}
              placeholder="Ex: Reforma de Interiores"
            />
          </div>
          <div className="space-y-2">
            <Label>Quantidade de Itens</Label>
            <Input
              type="number"
              min={1}
              required
              value={formData.quantidade_itens}
              onChange={(e) =>
                setFormData({ ...formData, quantidade_itens: parseInt(e.target.value) || 1 })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Responsável</Label>
            <Select
              value={formData.responsavel_id}
              onValueChange={(v) => setFormData({ ...formData, responsavel_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem responsável</SelectItem>
                {responsaveis.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            Criar Card
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
