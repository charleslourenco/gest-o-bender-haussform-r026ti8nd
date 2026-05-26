import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Trash2, Save, ArrowLeft, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command'

import { fetchClientes, searchEstoqueItens, saveOrcamento } from '@/services/orcamento-vendas'
import { useDebounce } from '@/hooks/use-debounce'
import { useCalculoPreco } from '@/hooks/use-calculo-preco'

const itemSchema = z
  .object({
    estoque_item_id: z.string().min(1, 'Selecione um item do estoque'),
    nome_item: z.string(),
    categoria: z.string().nullable().optional(),
    unidade: z.string(),
    quantidade: z
      .number({ invalid_type_error: 'Quantidade inválida' })
      .positive('A quantidade deve ser maior que zero'),
    preco_custo: z.number().min(0, 'O preço de custo não pode ser negativo'),
    preco_venda: z.number().min(0, 'O preço de venda não pode ser negativo'),
  })
  .refine((data) => data.preco_venda >= data.preco_custo, {
    message: 'O preço de venda não pode ser menor que o preço de custo',
    path: ['preco_venda'],
  })

const formSchema = z.object({
  cliente_id: z.string().optional(),
  ambiente: z.string().min(1, 'Ambiente é obrigatório'),
  descricao: z.string().optional(),
  indice_preco_vista: z.number().min(0.1, 'Índice inválido'),
  indice_preco_prazo: z.number().min(0.1, 'Índice inválido'),
  tipo_indice: z.enum(['vista', 'prazo']),
  itens: z.array(itemSchema).min(1, 'Adicione pelo menos um item ao orçamento'),
})

type FormValues = z.infer<typeof formSchema>

function AddItemModal({
  open,
  onOpenChange,
  onAdd,
  indiceAplicado,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (item: z.infer<typeof itemSchema>) => void
  indiceAplicado: number
}) {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [results, setResults] = useState<any[]>([])
  const [loadingSearch, setLoadingSearch] = useState(false)
  const [openPopover, setOpenPopover] = useState(false)

  const [selectedItem, setSelectedItem] = useState<any | null>(null)

  const [quantidade, setQuantidade] = useState<number | ''>(1)
  const [precoCusto, setPrecoCusto] = useState<number | ''>(0)
  const [precoVenda, setPrecoVenda] = useState<number | ''>(0)
  const [errors, setErrors] = useState<any>({})

  useEffect(() => {
    if (!open) {
      setSearch('')
      setSelectedItem(null)
      setQuantidade(1)
      setPrecoCusto(0)
      setPrecoVenda(0)
      setErrors({})
      setOpenPopover(false)
    }
  }, [open])

  useEffect(() => {
    if (debouncedSearch.length >= 2) {
      setLoadingSearch(true)
      searchEstoqueItens(debouncedSearch)
        .then((data) => {
          setResults(data || [])
          setLoadingSearch(false)
        })
        .catch(() => setLoadingSearch(false))
    } else {
      setResults([])
    }
  }, [debouncedSearch])

  useEffect(() => {
    if (selectedItem) {
      const custo = selectedItem.valor_unitario || 0
      setPrecoCusto(custo)
      setPrecoVenda(custo * indiceAplicado)
      setQuantidade(1)
      setErrors({})
    }
  }, [selectedItem, indiceAplicado])

  const handlePrecoCustoChange = (val: number | '') => {
    setPrecoCusto(val)
    if (typeof val === 'number') {
      setPrecoVenda(val * indiceAplicado)
    }
  }

  const handleAdd = () => {
    const data = {
      estoque_item_id: selectedItem?.id || '',
      nome_item: selectedItem?.nome || '',
      categoria: selectedItem?.categoria,
      unidade: selectedItem?.unidade || 'un',
      quantidade: Number(quantidade) || 0,
      preco_custo: Number(precoCusto) || 0,
      preco_venda: Number(precoVenda) || 0,
    }
    const result = itemSchema.safeParse(data)
    if (!result.success) {
      const fieldErrors: any = {}
      result.error.issues.forEach((iss) => {
        fieldErrors[iss.path[0]] = iss.message
      })
      setErrors(fieldErrors)
      return
    }
    onAdd(result.data)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Item ao Orçamento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2 flex flex-col">
            <Label>Buscar no Estoque</Label>
            <Popover open={openPopover} onOpenChange={setOpenPopover}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-start text-left font-normal truncate h-auto py-2 px-3"
                >
                  {selectedItem ? (
                    <span className="truncate block">
                      {selectedItem.nome} - {selectedItem.categoria || 'S/ Cat'} - R${' '}
                      {selectedItem.valor_unitario.toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-gray-500">Selecione um item...</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Digite o nome do material..."
                    value={search}
                    onValueChange={setSearch}
                  />
                  <CommandList>
                    <CommandEmpty>
                      {loadingSearch
                        ? 'Buscando...'
                        : search.length < 2
                          ? 'Digite pelo menos 2 letras.'
                          : 'Nenhum item encontrado.'}
                    </CommandEmpty>
                    <CommandGroup>
                      {results.map((item) => (
                        <CommandItem
                          key={item.id}
                          value={item.id}
                          onSelect={() => {
                            setSelectedItem(item)
                            setOpenPopover(false)
                          }}
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">{item.nome}</span>
                            <span className="text-xs text-gray-500">
                              {item.categoria || 'Sem Categoria'} - R${' '}
                              {item.valor_unitario.toFixed(2)}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {errors.estoque_item_id && (
              <p className="text-xs text-red-500">{errors.estoque_item_id}</p>
            )}
          </div>

          {selectedItem && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quantidade</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={quantidade}
                    onChange={(e) =>
                      setQuantidade(e.target.value ? parseFloat(e.target.value) : '')
                    }
                  />
                  {errors.quantidade && <p className="text-xs text-red-500">{errors.quantidade}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Unidade</Label>
                  <Input value={selectedItem.unidade} disabled className="bg-gray-100" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Preço de Custo (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={precoCusto}
                    onChange={(e) =>
                      handlePrecoCustoChange(e.target.value ? parseFloat(e.target.value) : '')
                    }
                  />
                  {errors.preco_custo && (
                    <p className="text-xs text-red-500">{errors.preco_custo}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Preço de Venda (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={precoVenda}
                    onChange={(e) =>
                      setPrecoVenda(e.target.value ? parseFloat(e.target.value) : '')
                    }
                  />
                  {errors.preco_venda && (
                    <p className="text-xs text-red-500">{errors.preco_venda}</p>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 text-blue-800 text-xs p-3 rounded-md border border-blue-100">
                Índice aplicado: <strong>{indiceAplicado}x</strong> (Cálculo sugerido: Preço de
                Custo x Índice)
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleAdd}>Confirmar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function NovoOrcamento() {
  const navigate = useNavigate()
  const { user, permissions, loading: authLoading } = useAuth()

  const isAdmin =
    permissions['Orçamentos'] === 'Admin' || Object.values(permissions).includes('Admin')

  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([])
  const [loadingClientes, setLoadingClientes] = useState(true)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ambiente: '',
      descricao: '',
      indice_preco_vista: 1.0,
      indice_preco_prazo: 1.0,
      tipo_indice: 'vista',
      itens: [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'itens',
  })

  useEffect(() => {
    fetchClientes()
      .then((data) => {
        setClientes(data || [])
        setLoadingClientes(false)
      })
      .catch((err) => {
        console.error(err)
        toast.error('Erro ao carregar clientes')
        setLoadingClientes(false)
      })
  }, [])

  const indiceVista = form.watch('indice_preco_vista')
  const indicePrazo = form.watch('indice_preco_prazo')
  const tipoIndice = form.watch('tipo_indice')
  const itensAtuais = form.watch('itens')

  const { indiceAplicado, calcularValorTotal } = useCalculoPreco(
    indiceVista,
    indicePrazo,
    tipoIndice,
  )

  const prevIndiceAplicado = useRef(indiceAplicado)

  useEffect(() => {
    if (prevIndiceAplicado.current !== indiceAplicado) {
      const currentItens = form.getValues('itens')
      if (currentItens.length > 0) {
        currentItens.forEach((item, index) => {
          form.setValue(`itens.${index}.preco_venda`, item.preco_custo * indiceAplicado)
        })
      }
      prevIndiceAplicado.current = indiceAplicado
    }
  }, [indiceAplicado, form])

  const valorTotal = calcularValorTotal(itensAtuais)

  const onSubmit = async (data: FormValues) => {
    try {
      const orcamentoData = {
        user_id: user?.id,
        cliente_id: data.cliente_id || null,
        ambiente: data.ambiente,
        descricao: data.descricao,
        indice_preco_vista: data.indice_preco_vista,
        indice_preco_prazo: data.indice_preco_prazo,
        valor_total: valorTotal,
      }
      await saveOrcamento(orcamentoData, data.itens)
      toast.success('Orçamento salvo com sucesso!')
      navigate('/orcamentos')
    } catch (err) {
      console.error(err)
      toast.error('Erro ao calcular preços. Tente novamente.')
    }
  }

  const [isItemModalOpen, setIsItemModalOpen] = useState(false)

  if (authLoading || loadingClientes) {
    return (
      <div className="p-6 space-y-4 max-w-5xl mx-auto mt-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/orcamentos')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Novo Orçamento</h1>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
            <h2 className="text-lg font-semibold border-b pb-2">Dados Gerais</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cliente_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente (Opcional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um cliente" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clientes.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ambiente"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ambiente *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Cozinha, Sala..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Detalhes do orçamento..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
            <h2 className="text-lg font-semibold border-b pb-2">Configurações Financeiras</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="indice_preco_vista"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Índice à Vista</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        disabled={!isAdmin}
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="indice_preco_prazo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Índice a Prazo</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        disabled={!isAdmin}
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tipo_indice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Índice Aplicado</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="vista">À Vista ({indiceVista})</SelectItem>
                        <SelectItem value="prazo">A Prazo ({indicePrazo})</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {!isAdmin && (
              <p className="text-xs text-gray-500 italic">
                * Apenas administradores podem editar os índices financeiros padrão.
              </p>
            )}
          </div>

          <div className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="text-lg font-semibold">Itens do Orçamento</h2>
              <Button type="button" size="sm" onClick={() => setIsItemModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" /> Adicionar Item
              </Button>
            </div>

            {fields.length === 0 ? (
              <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
                Nenhum item adicionado. Clique no botão acima para incluir materiais.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                      <TableHead className="text-right">Preço Custo</TableHead>
                      <TableHead className="text-right">Preço Venda</TableHead>
                      <TableHead className="text-right">Total (Venda)</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => {
                      const totalItem = field.quantidade * field.preco_venda
                      return (
                        <TableRow key={field.id}>
                          <TableCell
                            className="font-medium max-w-[200px] truncate"
                            title={field.nome_item}
                          >
                            {field.nome_item}
                          </TableCell>
                          <TableCell>{field.categoria || '-'}</TableCell>
                          <TableCell className="text-right">
                            {field.quantidade} {field.unidade}
                          </TableCell>
                          <TableCell className="text-right">
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            }).format(field.preco_custo)}
                          </TableCell>
                          <TableCell className="text-right">
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            }).format(field.preco_venda)}
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            }).format(totalItem)}
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-red-500 hover:text-red-700"
                              onClick={() => remove(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {form.formState.errors.itens && (
              <p className="text-sm text-red-500 font-medium">
                {form.formState.errors.itens.message}
              </p>
            )}

            <div className="flex justify-end pt-4">
              <div className="bg-gray-100 px-6 py-4 rounded-lg flex items-center justify-between min-w-[300px]">
                <span className="font-semibold text-gray-700">Valor Total:</span>
                <span className="text-2xl font-bold text-emerald-600">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    valorTotal,
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              size="lg"
              className="min-w-[200px]"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar Orçamento
            </Button>
          </div>
        </form>
      </Form>

      <AddItemModal
        open={isItemModalOpen}
        onOpenChange={setIsItemModalOpen}
        onAdd={(item) => append(item)}
        indiceAplicado={indiceAplicado}
      />
    </div>
  )
}
