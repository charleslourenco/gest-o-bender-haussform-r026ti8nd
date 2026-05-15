import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, PackageOpen, Check, Box, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'

export function CaixasVirtuais() {
  const [caixas, setCaixas] = useState<any[]>([])
  const [clientes, setClientes] = useState<any[]>([])
  const [itensEstoque, setItensEstoque] = useState<any[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isItemModalOpen, setIsItemModalOpen] = useState(false)
  const [selectedCaixa, setSelectedCaixa] = useState<any>(null)

  const [novaCaixa, setNovaCaixa] = useState({ nome: '', cliente_id: '' })
  const [novoItem, setNovoItem] = useState({ item_id: '', quantidade: 1 })

  const { toast } = useToast()

  useEffect(() => {
    fetchCaixas()
    fetchClientes()
    fetchItensEstoque()
  }, [])

  async function fetchCaixas() {
    const { data } = await supabase
      .from('estoque_caixas' as any)
      .select(
        '*, cliente:clientes(nome), itens:estoque_caixas_itens(*, item:estoque_itens(nome, unidade))',
      )
      .order('criado_em', { ascending: false })
    if (data) setCaixas(data)
  }

  async function fetchClientes() {
    const { data } = await supabase
      .from('clientes' as any)
      .select('id, nome')
      .order('nome')
    if (data) setClientes(data)
  }

  async function fetchItensEstoque() {
    const { data } = await supabase
      .from('estoque_itens' as any)
      .select('id, nome, quantidade, unidade')
      .gt('quantidade', 0)
      .order('nome')
    if (data) setItensEstoque(data)
  }

  async function handleCriarCaixa() {
    if (!novaCaixa.nome || !novaCaixa.cliente_id)
      return toast({ title: 'Preencha todos os campos', variant: 'destructive' })
    const { error } = await supabase
      .from('estoque_caixas' as any)
      .insert({ nome: novaCaixa.nome, cliente_id: novaCaixa.cliente_id })
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Caixa criada com sucesso!' })
      setIsModalOpen(false)
      setNovaCaixa({ nome: '', cliente_id: '' })
      fetchCaixas()
    }
  }

  async function handleAdicionarItem() {
    if (!novoItem.item_id || novoItem.quantidade <= 0)
      return toast({ title: 'Dados inválidos', variant: 'destructive' })

    const itemEstoque = itensEstoque.find((i) => i.id === novoItem.item_id)
    if (itemEstoque && novoItem.quantidade > itemEstoque.quantidade) {
      return toast({
        title: 'Quantidade indisponível',
        description: `Temos apenas ${itemEstoque.quantidade} em estoque.`,
        variant: 'destructive',
      })
    }

    const { error } = await supabase.from('estoque_caixas_itens' as any).insert({
      caixa_id: selectedCaixa.id,
      item_id: novoItem.item_id,
      quantidade: novoItem.quantidade,
    })

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Item adicionado à caixa!' })
      setIsItemModalOpen(false)
      setNovoItem({ item_id: '', quantidade: 1 })
      fetchCaixas()
      fetchItensEstoque()
    }
  }

  async function handleDeletarCaixa(caixaId: string) {
    if (
      !confirm(
        'Tem certeza que deseja apagar esta caixa? Todos os materiais reservados voltarão ao estoque livre.',
      )
    )
      return

    const { error } = await supabase
      .from('estoque_caixas' as any)
      .delete()
      .eq('id', caixaId)

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Caixa apagada', description: 'Itens retornados ao estoque.' })
      fetchCaixas()
      fetchItensEstoque()
    }
  }

  async function handleEntregarCaixa(caixaId: string) {
    if (!confirm('Confirmar a entrega de todos os itens desta caixa?')) return

    const caixa = caixas.find((c) => c.id === caixaId)
    const itensPendentes = caixa.itens.filter((i: any) => i.status === 'reservado')

    for (const item of itensPendentes) {
      await supabase
        .from('estoque_caixas_itens' as any)
        .update({ status: 'entregue' })
        .eq('id', item.id)
      await supabase.from('estoque_movimentacoes' as any).insert({
        item_id: item.item_id,
        tipo: 'Saída',
        quantidade: item.quantidade,
      })
    }

    await supabase
      .from('estoque_caixas' as any)
      .update({ status: 'entregue' })
      .eq('id', caixaId)
    toast({ title: 'Caixa entregue e baixa realizada no estoque!' })
    fetchCaixas()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-midnight-navy">Caixas Virtuais</h2>
          <p className="text-gray-500">
            Separe os materiais para cada projeto e dê baixa na entrega.
          </p>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          className="bg-steel-blue hover:bg-dark-denim w-full sm:w-auto"
        >
          <PackageOpen className="w-4 h-4 mr-2" />
          Nova Caixa
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {caixas.map((caixa) => (
          <Card
            key={caixa.id}
            className={`border-2 ${caixa.status === 'entregue' ? 'border-emerald-200 bg-emerald-50/30' : 'border-steel-blue/20'}`}
          >
            <CardHeader className="pb-3 border-b border-gray-100 bg-gray-50/50">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Box
                      className={`w-5 h-5 ${caixa.status === 'entregue' ? 'text-emerald-500' : 'text-steel-blue'}`}
                    />
                    {caixa.nome}
                  </CardTitle>
                  <p className="text-sm text-gray-500 mt-1">Cliente: {caixa.cliente?.nome}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={caixa.status === 'entregue' ? 'outline' : 'secondary'}
                    className={
                      caixa.status === 'entregue'
                        ? 'text-emerald-600 border-emerald-200 bg-emerald-50'
                        : 'bg-steel-blue/10 text-steel-blue'
                    }
                  >
                    {caixa.status.toUpperCase()}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 -mr-2"
                    onClick={() => handleDeletarCaixa(caixa.id)}
                    title="Apagar caixa e retornar itens livres ao estoque"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-700 flex justify-between items-center">
                  Itens Separados
                  {caixa.status !== 'entregue' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs px-2 text-steel-blue"
                      onClick={() => {
                        setSelectedCaixa(caixa)
                        setIsItemModalOpen(true)
                      }}
                    >
                      <Plus className="w-3 h-3 mr-1" /> Adicionar
                    </Button>
                  )}
                </h4>
                {caixa.itens.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">Caixa vazia.</p>
                ) : (
                  <ul className="space-y-2">
                    {caixa.itens.map((item: any) => (
                      <li
                        key={item.id}
                        className="flex justify-between items-center text-sm p-2 rounded-md bg-white border border-gray-100 shadow-sm"
                      >
                        <span className="truncate pr-2 font-medium text-gray-700">
                          {item.item?.nome}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="outline" className="font-mono bg-gray-50">
                            {item.quantidade} {item.item?.unidade}
                          </Badge>
                          {item.status === 'entregue' && (
                            <Check className="w-4 h-4 text-emerald-500" />
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </CardContent>
            {caixa.status !== 'entregue' && caixa.itens.length > 0 && (
              <CardFooter className="pt-4 pb-4">
                <Button
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
                  onClick={() => handleEntregarCaixa(caixa.id)}
                >
                  <Check className="w-4 h-4 mr-2" /> Confirmar Entrega
                </Button>
              </CardFooter>
            )}
          </Card>
        ))}
        {caixas.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-500 border-2 border-dashed rounded-xl">
            <PackageOpen className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p>Nenhuma caixa criada. Crie uma para começar a separar materiais.</p>
          </div>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Caixa Virtual</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome da Caixa (Ex: Cozinha Sr. João)</Label>
              <Input
                value={novaCaixa.nome}
                onChange={(e) => setNovaCaixa({ ...novaCaixa, nome: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select
                value={novaCaixa.cliente_id}
                onValueChange={(v) => setNovaCaixa({ ...novaCaixa, cliente_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCriarCaixa}
              className="bg-steel-blue text-white hover:bg-dark-denim"
            >
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isItemModalOpen} onOpenChange={setIsItemModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Item à Caixa: {selectedCaixa?.nome}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Item do Estoque</Label>
              <Select
                value={novoItem.item_id}
                onValueChange={(v) => setNovoItem({ ...novoItem, item_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um item disponível..." />
                </SelectTrigger>
                <SelectContent>
                  {itensEstoque.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.nome} (Disp: {i.quantidade} {i.unidade})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantidade</Label>
              <Input
                type="number"
                step="0.01"
                value={novoItem.quantidade}
                onChange={(e) => setNovoItem({ ...novoItem, quantidade: Number(e.target.value) })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsItemModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAdicionarItem}
              className="bg-steel-blue text-white hover:bg-dark-denim"
            >
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
