import { useState, useEffect } from 'react'
import { ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function SolicitarCompraDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const { toast } = useToast()
  const { user } = useAuth()

  const [nomeItem, setNomeItem] = useState('')
  const [quantidade, setQuantidade] = useState('1')
  const [unidade, setUnidade] = useState('un')
  const [urgencia, setUrgencia] = useState('Média')
  const [motivo, setMotivo] = useState('')

  useEffect(() => {
    const fetchPending = async () => {
      const { count } = await supabase
        .from('solicitacoes_compra')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Pendente')

      setPendingCount(count || 0)
    }

    fetchPending()

    const channel = supabase
      .channel('solicitacoes_compra_badge')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'solicitacoes_compra' },
        () => {
          fetchPending()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setLoading(true)
    try {
      const { error } = await supabase.from('solicitacoes_compra').insert({
        usuario_id: user.id,
        nome_item: nomeItem,
        quantidade: Number(quantidade),
        unidade,
        urgencia,
        motivo,
        status: 'Pendente',
      })
      if (error) throw error
      toast({ title: 'Sucesso', description: 'Solicitação de compra enviada.' })
      setOpen(false)
      setNomeItem('')
      setQuantidade('1')
      setMotivo('')
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
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground hover:text-foreground hover:bg-muted"
          title="Solicitações de Compra"
        >
          <ShoppingBag className="h-5 w-5" />
          {pendingCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 rounded-full bg-blue-600 text-white text-[10px] border-none">
              {pendingCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Solicitar Compra</SheetTitle>
          <SheetDescription>
            Preencha os dados do material que precisa ser comprado para notificar o setor de
            compras.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          <div className="space-y-2">
            <Label>Nome do Item</Label>
            <Input
              required
              value={nomeItem}
              onChange={(e) => setNomeItem(e.target.value)}
              placeholder="Ex: Dobradiça com amortecedor"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Quantidade</Label>
              <Input
                type="number"
                required
                min="0.01"
                step="0.01"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Unidade</Label>
              <Select value={unidade} onValueChange={setUnidade}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="un">Unidade (un)</SelectItem>
                  <SelectItem value="m">Metros (m)</SelectItem>
                  <SelectItem value="m²">Metros Quadrados (m²)</SelectItem>
                  <SelectItem value="kg">Quilos (kg)</SelectItem>
                  <SelectItem value="litro">Litros (l)</SelectItem>
                  <SelectItem value="caixa">Caixa (cx)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Urgência</Label>
            <Select value={urgencia} onValueChange={setUrgencia}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Baixa">Baixa</SelectItem>
                <SelectItem value="Média">Média</SelectItem>
                <SelectItem value="Alta">Alta</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Motivo / Observações</Label>
            <Input
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex: Para o projeto do cliente Silva"
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            disabled={loading}
          >
            {loading ? 'Enviando...' : 'Enviar Solicitação'}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
