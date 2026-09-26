import { useState, useEffect } from 'react'
import { CircleArrowUp, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CurrencyInput } from '@/components/ui/currency-input'
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
import { PlanoContasSelect } from './PlanoContasSelect'
import { PlanoContaItem } from '@/services/plano-contas'

export function NovaContaReceberDialog({ onRefresh }: { onRefresh?: () => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()

  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [dataVencimento, setDataVencimento] = useState('')
  const [categoria, setCategoria] = useState('Venda de Projetos')
  const [categoriaId, setCategoriaId] = useState<string | null>(null)
  const [natureza, setNatureza] = useState<string | null>('receita')
  const [meioPagamento, setMeioPagamento] = useState('Pix')
  const [clientes, setClientes] = useState<any[]>([])
  const [clienteId, setClienteId] = useState('none')
  const [contaBancariaId, setContaBancariaId] = useState('none')
  const [contas, setContas] = useState<any[]>([])
  const [observacoes, setObservacoes] = useState('')

  useEffect(() => {
    if (!open) {
      supabase
        .from('clientes')
        .select('id, nome')
        .order('nome')
        .then(({ data }) => {
          if (data) setClientes(data)
        })
      return
    }
    supabase
      .from('contas_bancarias')
      .select('id, nome_exibicao, status')
      .order('nome_exibicao')
      .then(({ data }) => {
        if (data) setContas(data.filter((c: any) => c.status))
      })
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { error } = await supabase.from('contas_receber').insert({
        descricao,
        valor: Number(valor),
        data_vencimento: dataVencimento,
        categoria: categoria || 'Venda de Projetos',
        categoria_id: categoriaId || null,
        natureza: natureza || 'receita',
        numero_parcela: '1/1',
        status_pagamento: 'aguardando',
        user_id: user?.id,
        meio_pagamento: meioPagamento,
        cliente_id: clienteId === 'none' ? null : clienteId,
        conta_bancaria_id: contaBancariaId === 'none' ? null : contaBancariaId,
        observacoes: observacoes || null,
      })

      if (error) throw error

      toast({ title: 'Sucesso', description: 'Conta a receber cadastrada com sucesso.' })
      setOpen(false)
      onRefresh?.()
      setDescricao('')
      setValor('')
      setDataVencimento('')
      setCategoria('Venda de Projetos')
      setCategoriaId(null)
      setNatureza('receita')
      setMeioPagamento('Pix')
      setClienteId('none')
      setContaBancariaId('none')
      setObservacoes('')
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível cadastrar a conta a receber.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white">
          <CircleArrowUp className="mr-2 h-4 w-4 text-white" />
          Nova Conta a Receber
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Conta a Receber</DialogTitle>
          <DialogDescription>
            Preencha os dados abaixo para cadastrar um novo recebimento.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input
              required
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Projeto Cozinha"
            />
          </div>
          <div className="space-y-2">
            <Label>Cliente (Opcional)</Label>
            <Select value={clienteId} onValueChange={setClienteId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um cliente" />
              </SelectTrigger>
              <SelectContent className="max-h-56">
                <SelectItem value="none">Nenhum</SelectItem>
                {clientes
                  .filter((c) => c && c.id && String(c.id).trim() !== '')
                  .map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.nome || 'Cliente sem nome'}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <CurrencyInput
                required
                value={valor}
                onValueChange={(val: number | string) => setValor(val ? val.toString() : '')}
                placeholder="R$ 0,00"
              />
            </div>
            <div className="space-y-2">
              <Label>Vencimento</Label>
              <Input
                required
                type="date"
                value={dataVencimento}
                onChange={(e) => setDataVencimento(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Categoria Contábil (Plano de Contas)</Label>
            <PlanoContasSelect
              value={categoriaId}
              naturezaFilter="receita"
              onChange={(selected: PlanoContaItem | null) => {
                if (selected) {
                  setCategoriaId(selected.id)
                  setNatureza(selected.natureza)
                  setCategoria(selected.nome)
                } else {
                  setCategoriaId(null)
                  setNatureza('receita')
                }
              }}
              placeholder="Selecione categoria de receita..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Classificação / Descrição Categoria</Label>
              <Input
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                placeholder="Ex: Venda de Projetos"
              />
            </div>
            <div className="space-y-2">
              <Label>Meio de Pagamento</Label>
              <Select value={meioPagamento} onValueChange={setMeioPagamento}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pix">Pix</SelectItem>
                  <SelectItem value="Boleto">Boleto</SelectItem>
                  <SelectItem value="Transferência">Transferência</SelectItem>
                  <SelectItem value="Cartão">Cartão</SelectItem>
                  <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Conta Bancária</Label>
            <Select value={contaBancariaId} onValueChange={setContaBancariaId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma conta (opcional)" />
              </SelectTrigger>
              <SelectContent className="max-h-56">
                <SelectItem value="none">Nenhuma</SelectItem>
                {contas
                  .filter((c) => c && c.id && String(c.id).trim() !== '')
                  .map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.nome_exibicao || 'Conta Bancária'}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Notas adicionais sobre este lançamento..."
              rows={2}
            />
          </div>
          <DialogFooter className="pt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
