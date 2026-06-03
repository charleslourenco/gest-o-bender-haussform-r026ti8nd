import { useState } from 'react'
import { CircleArrowDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { CurrencyInput } from '@/components/ui/currency-input'

export function NovaContaPagarSheet({ onRefresh }: { onRefresh?: () => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()

  const [fornecedor, setFornecedor] = useState('')
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [dataVencimento, setDataVencimento] = useState('')
  const [categoria, setCategoria] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      const { error } = await supabase.from('contas_pagar').insert({
        fornecedor,
        descricao,
        valor: Number(valor),
        data_vencimento: dataVencimento,
        categoria,
        user_id: user?.id,
        status_pagamento: 'aguardando',
      })

      if (error) throw error

      toast({
        title: 'Sucesso',
        description: 'Conta a pagar cadastrada com sucesso.',
      })
      setOpen(false)
      onRefresh?.()

      setFornecedor('')
      setDescricao('')
      setValor('')
      setDataVencimento('')
      setCategoria('')
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Não foi possível cadastrar a conta.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button className="bg-red-600 hover:bg-red-700 text-white border-0 inline-flex items-center rounded-md h-10 px-4 w-full sm:w-auto">
          <CircleArrowDown className="mr-2 h-4 w-4 text-white" />
          Nova Conta a Pagar
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Nova Conta a Pagar</SheetTitle>
          <SheetDescription>
            Preencha os dados abaixo para cadastrar uma nova despesa.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="fornecedor">Fornecedor</Label>
            <Input
              id="fornecedor"
              required
              value={fornecedor}
              onChange={(e) => setFornecedor(e.target.value)}
              placeholder="Nome do fornecedor"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Input
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Compra de materiais"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="valor">Valor (R$)</Label>
            <CurrencyInput
              id="valor"
              required
              value={valor}
              onValueChange={(val) => setValor(val ? val.toString() : '')}
              placeholder="R$ 0,00"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dataVencimento">Data de Vencimento</Label>
            <Input
              id="dataVencimento"
              type="date"
              required
              value={dataVencimento}
              onChange={(e) => setDataVencimento(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="categoria">Categoria</Label>
            <Input
              id="categoria"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              placeholder="Ex: Material de Consumo"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar Conta a Pagar'}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
