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
  const [valorUnitario, setValorUnitario] = useState<number | ''>(baseCard?.valor_unitario || '')
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
      <DialogContent className="sm:max-w-md bg-[#1A3D63] text-white border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white">Criar Card Avulso</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-slate-200">
              Cliente <span className="text-red-500">*</span>
            </Label>
            <Select value={clienteId} onValueChange={setClienteId} disabled={!!baseCard}>
              <SelectTrigger className="bg-[#0B1B2E] border-slate-700 text-white disabled:opacity-50">
                <SelectValue placeholder="Selecione o cliente" />
              </SelectTrigger>
              <SelectContent className="bg-[#0B1B2E] border-slate-700 text-white">
                {clientes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-slate-200">
              Nome do Produto/Serviço <span className="text-red-500">*</span>
            </Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Vidro Canelado 8mm"
              className="bg-[#0B1B2E] border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-200">
                Quantidade <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                min="1"
                value={qtd}
                onChange={(e) => setQtd(e.target.value ? Number(e.target.value) : '')}
                className="bg-[#0B1B2E] border-slate-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-200">
                Valor Unitário (R$) <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={valorUnitario}
                onChange={(e) => setValorUnitario(e.target.value ? Number(e.target.value) : '')}
                placeholder="0.00"
                className="bg-[#0B1B2E] border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-slate-200">Descrição (Opcional)</Label>
            <Textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Detalhes adicionais..."
              className="resize-none bg-[#0B1B2E] border-slate-700 text-white placeholder:text-slate-500"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter className="border-t border-slate-700 pt-4 mt-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="bg-transparent border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleCreate}
            disabled={loading || !nome || !clienteId || qtd === '' || valorUnitario === ''}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            Criar Card
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
