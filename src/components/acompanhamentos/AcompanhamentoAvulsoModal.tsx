import { useState, useEffect, useMemo } from 'react'
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
import { extrairIniciais, gerarProximoCodigoAcompanhamento } from '@/lib/acompanhamento-codigo'
import { Badge } from '@/components/ui/badge'

export function AcompanhamentoAvulsoModal({ open, onOpenChange, onSuccess }: any) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [responsaveis, setResponsaveis] = useState<any[]>([])
  const [codigoPreview, setCodigoPreview] = useState<string>('')
  const [formData, setFormData] = useState({
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

  // Generate code preview when name changes
  useEffect(() => {
    if (!formData.nome_cliente || !open) {
      setCodigoPreview('')
      return
    }

    let cancelled = false
    gerarProximoCodigoAcompanhamento(formData.nome_cliente).then((code) => {
      if (!cancelled) setCodigoPreview(code)
    })

    return () => {
      cancelled = true
    }
  }, [formData.nome_cliente, open])

  const iniciais = useMemo(() => extrairIniciais(formData.nome_cliente), [formData.nome_cliente])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.nome_cliente) {
      toast({ title: 'Informe o nome do cliente', variant: 'destructive' })
      return
    }

    setLoading(true)

    let code = codigoPreview
    if (!code) {
      code = await gerarProximoCodigoAcompanhamento(formData.nome_cliente)
    }

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
      // If unique constraint violation, retry with incremented sequence
      if (error.code === '23505') {
        const { count } = await supabase
          .from('acompanhamentos')
          .select('*', { count: 'exact', head: true })
        const retryCode = `${iniciais}ACP${String((count || 0) + 2).padStart(3, '0')}`
        const { error: retryError } = await supabase.from('acompanhamentos').insert({
          codigo_projeto: retryCode,
          nome_cliente: formData.nome_cliente,
          tipo_acompanhamento: formData.tipo_acompanhamento,
          responsavel_id: formData.responsavel_id === 'none' ? null : formData.responsavel_id,
          quantidade_itens: formData.quantidade_itens,
          status_atual: 'INÍCIO',
        })
        if (retryError) {
          toast({
            title: 'Erro ao criar acompanhamento',
            description: retryError.message,
            variant: 'destructive',
          })
          return
        }
        toast({ title: 'Card criado com sucesso' })
        onSuccess()
        onOpenChange(false)
        setFormData({
          nome_cliente: '',
          tipo_acompanhamento: '',
          responsavel_id: 'none',
          quantidade_itens: 1,
        })
        return
      }
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
        nome_cliente: '',
        tipo_acompanhamento: '',
        responsavel_id: 'none',
        quantidade_itens: 1,
      })
      setCodigoPreview('')
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
            <Label>Nome do Cliente</Label>
            <Input
              required
              value={formData.nome_cliente}
              onChange={(e) => setFormData({ ...formData, nome_cliente: e.target.value })}
              placeholder="Ex: João Silva"
            />
            {codigoPreview && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Código gerado:</span>
                <Badge variant="secondary" className="font-mono">
                  {codigoPreview}
                </Badge>
              </div>
            )}
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
            {loading ? 'Criando...' : 'Criar Card'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
