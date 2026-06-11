import { useEffect, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Plus, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'

export function EstoqueLista() {
  const [items, setItems] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const { toast } = useToast()

  const [newItem, setNewItem] = useState({
    nome: '',
    categoria: '',
    quantidade: 0,
    unidade: 'un',
    estoque_minimo: 0,
    valor_unitario: 0,
    fornecedor: '',
    terceirizado: false,
    marca: '',
    cor: '',
    espessura_mm: '',
    largura_mm: '',
    comprimento_m: '',
  })

  async function fetchItems() {
    const { data } = await supabase
      .from('estoque_itens' as any)
      .select('*')
      .order('nome')
    if (data) setItems(data)
  }

  useEffect(() => {
    fetchItems()
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
    if (!window.confirm('Tem certeza que deseja apagar este item do inventário?')) return
    await supabase.from('estoque_itens').delete().eq('id', id)
    fetchItems()
    toast({ title: 'Item apagado' })
  }

  const handleSaveItem = async () => {
    try {
      const { data: allItems } = await supabase.from('estoque_itens').select('id, nome, quantidade')

      const normalize = (s: string) =>
        s
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim()
      const getCoreName = (s: string) => {
        let n = normalize(s)
        n = n.replace(/^[0-9]+\s*(chapas?|pecas?|unidades?|un|m2|m|x)?\s*(de\s*)?/, '')
        return n.trim()
      }

      const coreNew = getCoreName(newItem.nome)

      let existingItem = (allItems || []).find((i) => getCoreName(i.nome) === coreNew)

      if (!existingItem && coreNew.length > 10) {
        existingItem = (allItems || []).find((i) => {
          const coreExisting = getCoreName(i.nome)
          return coreNew.includes(coreExisting) || coreExisting.includes(coreNew)
        })
      }

      let metadados_normalizados = null
      try {
        const { data: normData } = await supabase.functions.invoke('material-normalization', {
          body: { action: 'normalize_batch', items: [newItem.nome] },
        })
        if (normData?.results?.[0]) {
          metadados_normalizados = normData.results[0]
        }
      } catch (e) {
        console.error('Failed to normalize manually added item:', e)
      }

      const payloadMarca = newItem.marca || metadados_normalizados?.marca || undefined
      const payloadCor = newItem.cor || metadados_normalizados?.cor || undefined
      const payloadEspessura = newItem.espessura_mm
        ? Number(newItem.espessura_mm)
        : metadados_normalizados?.espessura_mm || undefined
      const payloadLargura = newItem.largura_mm
        ? Number(newItem.largura_mm)
        : metadados_normalizados?.largura_mm || undefined
      const payloadComprimento = newItem.comprimento_m
        ? Number(newItem.comprimento_m)
        : metadados_normalizados?.comprimento_m || undefined

      if (existingItem) {
        const { error } = await supabase
          .from('estoque_itens')
          .update({
            quantidade: Number(existingItem.quantidade) + Number(newItem.quantidade),
            valor_unitario: newItem.valor_unitario > 0 ? newItem.valor_unitario : undefined,
            fornecedor: newItem.fornecedor || undefined,
            atualizado_em: new Date().toISOString(),
            ...(metadados_normalizados ? { metadados_normalizados } : {}),
            marca: payloadMarca,
            cor: payloadCor,
            espessura_mm: payloadEspessura,
            largura_mm: payloadLargura,
            comprimento_m: payloadComprimento,
          })
          .eq('id', existingItem.id)

        if (error) throw error

        await supabase.from('estoque_movimentacoes').insert({
          item_id: existingItem.id,
          tipo: 'entrada',
          quantidade: newItem.quantidade,
        })

        toast({
          title: 'Estoque Atualizado',
          description: 'O item já existia e sua quantidade foi somada.',
        })
      } else {
        const { data: inserted, error } = await supabase
          .from('estoque_itens' as any)
          .insert({
            nome: newItem.nome,
            categoria: newItem.categoria,
            quantidade: newItem.quantidade,
            unidade: newItem.unidade,
            estoque_minimo: newItem.estoque_minimo,
            valor_unitario: newItem.valor_unitario,
            fornecedor: newItem.fornecedor,
            terceirizado: newItem.terceirizado,
            marca: payloadMarca,
            cor: payloadCor,
            espessura_mm: payloadEspessura,
            largura_mm: payloadLargura,
            comprimento_m: payloadComprimento,
            metadados_normalizados,
          })
          .select('id')
          .single()
        if (error) throw error

        if (inserted) {
          await supabase.from('estoque_movimentacoes').insert({
            item_id: inserted.id,
            tipo: 'entrada',
            quantidade: newItem.quantidade,
          })
        }

        toast({ title: 'Item Cadastrado', description: 'O item foi adicionado ao inventário.' })
      }

      setIsModalOpen(false)
      setNewItem({
        nome: '',
        categoria: '',
        quantidade: 0,
        unidade: 'un',
        estoque_minimo: 0,
        valor_unitario: 0,
        fornecedor: '',
        terceirizado: false,
        marca: '',
        cor: '',
        espessura_mm: '',
        largura_mm: '',
        comprimento_m: '',
      })
      fetchItems()
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    }
  }

  const filteredItems = items.filter(
    (i) =>
      i.nome.toLowerCase().includes(search.toLowerCase()) ||
      i.categoria?.toLowerCase().includes(search.toLowerCase()) ||
      i.marca?.toLowerCase().includes(search.toLowerCase()) ||
      i.fornecedor?.toLowerCase().includes(search.toLowerCase()),
  )

  const [isNormalizing, setIsNormalizing] = useState(false)

  const handleNormalizeBatch = async () => {
    const unnormalized = items.filter((i) => !i.metadados_normalizados)
    if (unnormalized.length === 0) return
    setIsNormalizing(true)
    try {
      toast({
        title: 'Normalizando...',
        description: `Processando ${unnormalized.length} itens pelo motor de IA.`,
      })

      const batchSize = 50
      for (let i = 0; i < unnormalized.length; i += batchSize) {
        const batch = unnormalized.slice(i, i + batchSize)
        const descricoes = batch.map((b) => b.nome)

        const { data, error } = await supabase.functions.invoke('material-normalization', {
          body: { action: 'normalize_batch', items: descricoes },
        })

        if (error) throw error

        const results = data.results || []

        for (let j = 0; j < batch.length; j++) {
          if (results[j]) {
            const res = results[j]
            await supabase
              .from('estoque_itens')
              .update({
                metadados_normalizados: res,
                marca: res.marca || undefined,
                cor: res.cor || undefined,
                espessura_mm: res.espessura_mm || undefined,
                largura_mm: res.largura_mm || undefined,
                comprimento_m: res.comprimento_m || undefined,
              })
              .eq('id', batch[j].id)
          }
        }
      }

      toast({ title: 'Sucesso', description: 'Nomenclaturas normalizadas com sucesso.' })
      fetchItems()
    } catch (e: any) {
      toast({ title: 'Erro na Normalização', description: e.message, variant: 'destructive' })
    } finally {
      setIsNormalizing(false)
    }
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  const itemsSemMetadados = items.filter((i) => !i.metadados_normalizados).length

  return (
    <div className="space-y-4 bg-white dark:bg-slate-950 p-6 rounded-xl border dark:border-slate-800">
      {itemsSemMetadados > 0 && isAdmin && (
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-lg p-4 flex items-center justify-between mb-4">
          <div>
            <h4 className="font-semibold text-blue-800 dark:text-blue-300">
              Normalização Inteligente Pendente
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-200">
              Há {itemsSemMetadados} itens no estoque sem os metadados normalizados. Normalize para
              ativar a conciliação automática completa.
            </p>
          </div>
          <Button
            onClick={handleNormalizeBatch}
            disabled={isNormalizing}
            className="bg-blue-600 hover:bg-blue-700 text-white shrink-0"
          >
            {isNormalizing ? 'Processando...' : 'Normalizar Estoque'}
          </Button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-slate-500" />
          <Input
            placeholder="Buscar item, marca ou categoria..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 dark:bg-slate-900 dark:border-slate-800"
          />
        </div>
        <Button
          className="bg-steel-blue hover:bg-dark-denim dark:bg-blue-600 dark:hover:bg-blue-700 dark:text-white"
          onClick={() => setIsModalOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" /> Novo Item
        </Button>
      </div>

      <div className="rounded-md border dark:border-slate-800 overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50 dark:bg-slate-900/50">
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Marca</TableHead>
              <TableHead>Detalhes</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead className="text-right">Quantidade</TableHead>
              <TableHead className="text-right">V. Unitário</TableHead>
              <TableHead className="text-right">V. Total</TableHead>
              <TableHead className="text-center">Status</TableHead>
              {isAdmin && <TableHead className="text-right">Ação</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium max-w-[200px] truncate" title={item.nome}>
                  {item.nome}
                </TableCell>
                <TableCell>{item.marca || '-'}</TableCell>
                <TableCell>
                  <div className="text-xs text-gray-500 dark:text-slate-400 space-y-0.5 whitespace-nowrap">
                    {item.cor && (
                      <div>
                        <span className="font-medium">Cor:</span> {item.cor}
                      </div>
                    )}
                    {item.espessura_mm && (
                      <div>
                        <span className="font-medium">Esp:</span> {item.espessura_mm}mm
                      </div>
                    )}
                    {item.largura_mm && (
                      <div>
                        <span className="font-medium">Larg:</span> {item.largura_mm}mm
                      </div>
                    )}
                    {item.comprimento_m && (
                      <div>
                        <span className="font-medium">Comp:</span> {item.comprimento_m}m
                      </div>
                    )}
                    {!item.cor &&
                      !item.espessura_mm &&
                      !item.largura_mm &&
                      !item.comprimento_m &&
                      '-'}
                  </div>
                </TableCell>
                <TableCell>
                  {item.categoria || '-'}
                  {item.terceirizado && (
                    <Badge
                      variant="secondary"
                      className="ml-2 bg-purple-100 text-purple-700 hover:bg-purple-100 dark:bg-purple-950 dark:text-purple-300 dark:hover:bg-purple-900 text-[10px]"
                    >
                      Terceirizado
                    </Badge>
                  )}
                </TableCell>
                <TableCell>{item.fornecedor || '-'}</TableCell>
                <TableCell className="text-right">
                  {item.quantidade}{' '}
                  <span className="text-xs text-gray-500 dark:text-slate-400">{item.unidade}</span>
                </TableCell>
                <TableCell className="text-right">{formatCurrency(item.valor_unitario)}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(item.quantidade * item.valor_unitario)}
                </TableCell>
                <TableCell className="text-center">
                  {item.quantidade <= item.estoque_minimo ? (
                    <Badge
                      variant="destructive"
                      className="bg-amber-500/10 text-amber-600 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30"
                    >
                      Estoque Baixo
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-900"
                    >
                      Normal
                    </Badge>
                  )}
                </TableCell>
                {isAdmin && (
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(item.id)}
                      className="text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50 h-8 w-8"
                      title="Apagar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {filteredItems.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={10}
                  className="text-center py-8 text-gray-500 dark:text-slate-400"
                >
                  Nenhum item encontrado no estoque.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Novo Item de Estoque</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Nome do Item</Label>
              <Input
                value={newItem.nome}
                onChange={(e) => setNewItem({ ...newItem, nome: e.target.value })}
                placeholder="Ex: Dobradiça com amortecedor"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Input
                  value={newItem.categoria}
                  onChange={(e) => setNewItem({ ...newItem, categoria: e.target.value })}
                  placeholder="Ferragens"
                />
              </div>
              <div className="space-y-2">
                <Label>Fornecedor</Label>
                <Input
                  value={newItem.fornecedor}
                  onChange={(e) => setNewItem({ ...newItem, fornecedor: e.target.value })}
                  placeholder="Nome do Fornecedor"
                />
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-slate-900/50 p-4 rounded-lg space-y-4 border border-gray-100 dark:border-slate-800">
              <h4 className="font-medium text-sm text-gray-700 dark:text-slate-300">
                Atributos Técnicos (Opcional)
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Marca</Label>
                  <Input
                    value={newItem.marca}
                    onChange={(e) => setNewItem({ ...newItem, marca: e.target.value })}
                    placeholder="Ex: Arauco, Blum, Guararapes"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cor</Label>
                  <Input
                    value={newItem.cor}
                    onChange={(e) => setNewItem({ ...newItem, cor: e.target.value })}
                    placeholder="Ex: Branco TX, Preto Silk"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Espessura (mm)</Label>
                  <Input
                    type="number"
                    value={newItem.espessura_mm}
                    onChange={(e) => setNewItem({ ...newItem, espessura_mm: e.target.value })}
                    placeholder="15, 18..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Largura (mm)</Label>
                  <Input
                    type="number"
                    value={newItem.largura_mm}
                    onChange={(e) => setNewItem({ ...newItem, largura_mm: e.target.value })}
                    placeholder="Para fitas..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Comprimento (m)</Label>
                  <Input
                    type="number"
                    value={newItem.comprimento_m}
                    onChange={(e) => setNewItem({ ...newItem, comprimento_m: e.target.value })}
                    placeholder="Para perfis..."
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Qtd Inicial</Label>
                <Input
                  type="number"
                  value={newItem.quantidade}
                  onChange={(e) => setNewItem({ ...newItem, quantidade: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Unidade</Label>
                <Input
                  value={newItem.unidade}
                  onChange={(e) => setNewItem({ ...newItem, unidade: e.target.value })}
                  placeholder="un, m2, kg"
                />
              </div>
              <div className="space-y-2">
                <Label>Valor Unit. (R$)</Label>
                <Input
                  type="number"
                  value={newItem.valor_unitario}
                  onChange={(e) =>
                    setNewItem({ ...newItem, valor_unitario: Number(e.target.value) })
                  }
                />
              </div>
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <Switch
                id="terceirizado"
                checked={newItem.terceirizado}
                onCheckedChange={(c) => setNewItem({ ...newItem, terceirizado: c })}
              />
              <Label htmlFor="terceirizado" className="cursor-pointer text-purple-700 font-medium">
                Este é um item terceirizado (Ex: Vidros, Pedras)
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveItem}
              className="bg-steel-blue text-white hover:bg-dark-denim"
            >
              Salvar Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
