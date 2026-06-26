import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { RefreshCw, Send, Check, Trash2 } from 'lucide-react'
import { useGrabScroll } from '@/hooks/use-grab-scroll'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'

type ItemCliente = {
  id: string
  cliente_nome: string
  produto: string
  recebido_em: string
  entregue_em: string | null
  responsavel_entrega: string | null
}

export function ItensCliente() {
  const [itens, setItens] = useState<ItemCliente[]>([])
  const [loading, setLoading] = useState(true)
  const [cliente, setCliente] = useState('')
  const [produto, setProduto] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [responsavel, setResponsavel] = useState('')
  const [selectedItem, setSelectedItem] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const { toast } = useToast()
  const { ref: scrollRef, events: scrollEvents, isDragging } = useGrabScroll<HTMLDivElement>()

  const fetchItens = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('estoque_itens_cliente' as any)
      .select('*')
      .order('recebido_em', { ascending: false })

    if (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao buscar itens de clientes.',
        variant: 'destructive',
      })
    } else {
      setItens(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchItens()
    checkAdmin()
  }, [])

  async function checkAdmin() {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase.rpc('is_admin', { user_id: user.id })
      setIsAdmin(!!data)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja apagar este item?')) return
    await supabase.from('estoque_itens_cliente').delete().eq('id', id)
    fetchItens()
    toast({ title: 'Item apagado' })
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cliente || !produto) return
    setIsSubmitting(true)
    const { error } = await supabase.from('estoque_itens_cliente' as any).insert({
      cliente_nome: cliente,
      produto: produto,
    })

    if (error) {
      toast({ title: 'Erro', description: 'Erro ao registrar item.', variant: 'destructive' })
    } else {
      toast({ title: 'Sucesso', description: 'Item registrado com sucesso.' })
      setCliente('')
      setProduto('')
      fetchItens()
    }
    setIsSubmitting(false)
  }

  const handleDeliver = async () => {
    if (!selectedItem || !responsavel) return
    const { error } = await supabase
      .from('estoque_itens_cliente' as any)
      .update({
        entregue_em: new Date().toISOString(),
        responsavel_entrega: responsavel,
      })
      .eq('id', selectedItem)

    if (error) {
      toast({ title: 'Erro', description: 'Erro ao registrar entrega.', variant: 'destructive' })
    } else {
      toast({ title: 'Sucesso', description: 'Entrega registrada com sucesso.' })
      setDialogOpen(false)
      setResponsavel('')
      setSelectedItem(null)
      fetchItens()
    }
  }

  const formatDate = (isoString: string) => {
    const d = new Date(isoString)
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d)
  }

  return (
    <div className="h-full flex flex-col space-y-6 min-h-0">
      <Card className="flex-none animate-in fade-in duration-300">
        <CardHeader>
          <CardTitle>Registrar Novo Item de Cliente</CardTitle>
          <CardDescription>
            Use para fogões, geladeiras ou outros produtos que o cliente enviou para guardar na
            fábrica.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="space-y-2 w-full sm:w-1/3">
              <Label htmlFor="cliente">Nome do Cliente</Label>
              <Input
                id="cliente"
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                required
                placeholder="Ex: João Silva"
              />
            </div>
            <div className="space-y-2 w-full sm:w-1/2">
              <Label htmlFor="produto">Produto Recebido</Label>
              <Input
                id="produto"
                value={produto}
                onChange={(e) => setProduto(e.target.value)}
                required
                placeholder="Ex: Fogão 4 bocas Electrolux"
              />
            </div>
            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto shrink-0">
              Registrar Entrada
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="flex-1 min-h-0 flex flex-col animate-in fade-in duration-300 delay-100 fill-mode-both">
        <CardHeader className="flex-none flex flex-row items-center justify-between">
          <CardTitle>Histórico de Itens</CardTitle>
          <Button
            variant="outline"
            size="icon"
            onClick={fetchItens}
            disabled={loading}
            title="Atualizar"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 flex flex-col pb-6">
          <div className="flex-1 rounded-md border overflow-hidden flex flex-col min-h-0">
            <div
              ref={scrollRef}
              {...scrollEvents}
              className={`overflow-auto flex-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'}`}
            >
              <Table className="min-w-[1000px] relative">
                <TableHeader className="bg-gray-50 dark:bg-slate-900 sticky top-0 z-10 shadow-sm">
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Cliente</TableHead>
                    <TableHead className="min-w-[200px] max-w-[350px]">Produto</TableHead>
                    <TableHead className="whitespace-nowrap">Recebido Em</TableHead>
                    <TableHead className="whitespace-nowrap">Entregue Em</TableHead>
                    <TableHead className="whitespace-nowrap">Responsável (Entrega)</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itens.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Nenhum item registrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    itens.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium whitespace-nowrap">
                          {item.cliente_nome}
                        </TableCell>
                        <TableCell className="min-w-[200px] max-w-[350px] whitespace-normal break-words">
                          {item.produto}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {formatDate(item.recebido_em)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {item.entregue_em ? (
                            formatDate(item.entregue_em)
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {item.responsavel_entrega ? (
                            item.responsavel_entrega
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {!item.entregue_em && (
                            <Dialog
                              open={dialogOpen && selectedItem === item.id}
                              onOpenChange={(open) => {
                                if (!open) {
                                  setDialogOpen(false)
                                  setSelectedItem(null)
                                } else {
                                  setSelectedItem(item.id)
                                  setDialogOpen(true)
                                }
                              }}
                            >
                              <DialogTrigger asChild>
                                <Button size="sm" variant="outline">
                                  <Send className="h-4 w-4 mr-2" />
                                  Registrar Entrega
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Registrar Entrega</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <div className="space-y-2">
                                    <Label>Item</Label>
                                    <p className="text-sm font-medium">
                                      {item.produto} (Cliente: {item.cliente_nome})
                                    </p>
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="responsavel">
                                      Quem levou / Responsável pela entrega?
                                    </Label>
                                    <Input
                                      id="responsavel"
                                      value={responsavel}
                                      onChange={(e) => setResponsavel(e.target.value)}
                                      placeholder="Ex: Motorista Carlos"
                                    />
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                                    Cancelar
                                  </Button>
                                  <Button onClick={handleDeliver} disabled={!responsavel}>
                                    Confirmar Entrega
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          )}
                          {item.entregue_em && (
                            <Badge
                              variant="secondary"
                              className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-400 dark:hover:bg-emerald-900"
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Entregue
                            </Badge>
                          )}
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(item.id)}
                              className="ml-2 text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50 h-8 w-8"
                              title="Apagar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
