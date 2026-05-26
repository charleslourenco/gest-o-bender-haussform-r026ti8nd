import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { ChevronRight, Plus, Trash2, Check, ChevronsUpDown } from 'lucide-react'

import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

const formSchema = z.object({
  cliente_id: z.string().min(1, 'Cliente é obrigatório'),
  ambiente: z.string().min(1, 'Ambiente é obrigatório'),
  descricao: z.string().max(500, 'Máximo de 500 caracteres').optional(),
  indice_preco_vista: z.coerce.number().min(0.01),
  indice_preco_prazo: z.coerce.number().min(0.01),
  tipo_indice: z.enum(['vista', 'prazo']).default('vista'),
  itens: z
    .array(
      z.object({
        estoque_item_id: z.string(),
        nome: z.string(),
        quantidade: z.number().min(0.01),
        preco_custo: z.number(),
      }),
    )
    .min(1, 'Adicione pelo menos 1 item'),
})

type FormValues = z.infer<typeof formSchema>

export default function NovoOrcamento() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()

  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([])
  const [estoqueItens, setEstoqueItens] = useState<
    { id: string; nome: string; valor_unitario: number }[]
  >([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [openClient, setOpenClient] = useState(false)
  const [openItem, setOpenItem] = useState(false)
  const [selectedItem, setSelectedItem] = useState('')
  const [itemQty, setItemQty] = useState(1)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cliente_id: '',
      ambiente: '',
      descricao: '',
      indice_preco_vista: 1.0,
      indice_preco_prazo: 1.0,
      tipo_indice: 'vista',
      itens: [],
    },
  })

  useEffect(() => {
    async function loadData() {
      try {
        const [cliRes, estRes] = await Promise.all([
          supabase.from('clientes').select('id, nome').eq('status', 'Ativo').order('nome'),
          supabase.from('estoque_itens').select('id, nome, valor_unitario').order('nome'),
        ])
        if (cliRes.data) setClientes(cliRes.data)
        if (estRes.data) setEstoqueItens(estRes.data)

        if (user) {
          const { data: adminRes } = await supabase.rpc('is_admin', { user_id: user.id })
          setIsAdmin(!!adminRes)
        }
      } catch (err) {
        toast({ title: 'Erro ao carregar dados', variant: 'destructive' })
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [user, toast])

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  const formItens = form.watch('itens')
  const tipoIndice = form.watch('tipo_indice')
  const currentIdx =
    tipoIndice === 'vista' ? form.watch('indice_preco_vista') : form.watch('indice_preco_prazo')

  const totalItens = formItens.reduce((acc, curr) => acc + curr.quantidade, 0)
  const valorTotal = formItens.reduce(
    (acc, curr) => acc + curr.quantidade * curr.preco_custo * currentIdx,
    0,
  )

  const handleAddItem = () => {
    if (!selectedItem || itemQty <= 0) return
    const itemData = estoqueItens.find((i) => i.id === selectedItem)
    if (!itemData) return
    form.setValue(
      'itens',
      [
        ...formItens,
        {
          estoque_item_id: itemData.id,
          nome: itemData.nome,
          quantidade: itemQty,
          preco_custo: itemData.valor_unitario,
        },
      ],
      { shouldValidate: true },
    )
    setSelectedItem('')
    setItemQty(1)
    setOpenItem(false)
  }

  const onSubmit = async (data: FormValues, status: 'Rascunho' | 'Enviado') => {
    setIsSubmitting(true)
    try {
      const { data: orcData, error: orcErr } = await supabase
        .from('orcamentos')
        .insert({
          cliente_id: data.cliente_id,
          ambiente: data.ambiente,
          descricao: data.descricao,
          indice_preco_vista: data.indice_preco_vista,
          indice_preco_prazo: data.indice_preco_prazo,
          valor_total: valorTotal,
          status,
          user_id: user?.id,
        })
        .select()
        .single()

      if (orcErr) throw orcErr

      const itensToInsert = data.itens.map((i) => ({
        orcamento_id: orcData.id,
        estoque_item_id: i.estoque_item_id,
        quantidade: i.quantidade,
        preco_custo: i.preco_custo,
        preco_venda: i.preco_custo * currentIdx,
      }))

      const { error: itensErr } = await supabase.from('itens_orcamento').insert(itensToInsert)
      if (itensErr) throw itensErr

      toast({ title: 'Orçamento salvo com sucesso!' })
      navigate('/orcamentos')
    } catch (err) {
      toast({ title: 'Erro ao salvar. Tente novamente.', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <Skeleton className="h-[400px]" />
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Novo Orçamento</h2>
          <div className="flex items-center text-sm text-muted-foreground mt-2">
            <Link to="/orcamentos" className="hover:text-foreground">
              Orçamentos
            </Link>
            <ChevronRight className="h-4 w-4 mx-1" />
            <span>Novo</span>
          </div>
        </div>
        <Button variant="outline" onClick={() => navigate('/orcamentos')}>
          Cancelar
        </Button>
      </div>

      <Form {...form}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="cliente_id"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Cliente</FormLabel>
                    <Popover open={openClient} onOpenChange={setOpenClient}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              'w-full justify-between',
                              !field.value && 'text-muted-foreground',
                            )}
                          >
                            {field.value
                              ? clientes.find((c) => c.id === field.value)?.nome
                              : 'Selecione o cliente...'}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0">
                        <Command>
                          <CommandInput placeholder="Buscar cliente..." />
                          <CommandList>
                            <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                            <CommandGroup>
                              {clientes.map((cli) => (
                                <CommandItem
                                  key={cli.id}
                                  value={cli.nome}
                                  onSelect={() => {
                                    form.setValue('cliente_id', cli.id, { shouldValidate: true })
                                    setOpenClient(false)
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      'mr-2 h-4 w-4',
                                      cli.id === field.value ? 'opacity-100' : 'opacity-0',
                                    )}
                                  />
                                  {cli.nome}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ambiente"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ambiente</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um ambiente" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {['Cozinha', 'Sala', 'Quarto', 'Banheiro', 'Varanda', 'Outro'].map(
                          (amb) => (
                            <SelectItem key={amb} value={amb}>
                              {amb}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="descricao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Detalhes do orçamento..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="indice_preco_vista"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Índice à Vista</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" disabled={!isAdmin} {...field} />
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
                        <Input type="number" step="0.01" disabled={!isAdmin} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="tipo_indice"
                render={({ field }) => (
                  <FormItem className="space-y-3 mt-2">
                    <FormLabel>Índice a Aplicar (Cálculo)</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex space-x-4"
                      >
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="vista" />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">À Vista</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="prazo" />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">A Prazo</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Itens do Orçamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-2">
                  <Label>Item do Estoque</Label>
                  <Popover open={openItem} onOpenChange={setOpenItem}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between font-normal"
                      >
                        <span className="truncate">
                          {selectedItem
                            ? estoqueItens.find((i) => i.id === selectedItem)?.nome
                            : 'Buscar item...'}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0">
                      <Command>
                        <CommandInput placeholder="Buscar item..." />
                        <CommandList>
                          <CommandEmpty>Nenhum item encontrado.</CommandEmpty>
                          <CommandGroup>
                            {estoqueItens.map((item) => (
                              <CommandItem
                                key={item.id}
                                value={item.nome}
                                onSelect={() => {
                                  setSelectedItem(item.id)
                                  setOpenItem(false)
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    selectedItem === item.id ? 'opacity-100' : 'opacity-0',
                                  )}
                                />
                                {item.nome}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="w-24 space-y-2">
                  <Label>Qtd</Label>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={itemQty}
                    onChange={(e) => setItemQty(Number(e.target.value))}
                  />
                </div>
                <Button type="button" onClick={handleAddItem}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="w-[80px]">Qtd</TableHead>
                      <TableHead className="w-[120px]">P. Custo</TableHead>
                      <TableHead className="w-[120px]">P. Venda</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formItens.map((it, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium max-w-[200px] truncate">
                          {it.nome}
                        </TableCell>
                        <TableCell>{it.quantidade}</TableCell>
                        <TableCell>{formatCurrency(it.preco_custo)}</TableCell>
                        <TableCell>{formatCurrency(it.preco_custo * currentIdx)}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const newItens = [...formItens]
                              newItens.splice(idx, 1)
                              form.setValue('itens', newItens, { shouldValidate: true })
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {formItens.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                          Nenhum item adicionado ao orçamento.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={2}>Total de Itens: {totalItens}</TableCell>
                      <TableCell colSpan={3} className="text-right">
                        Valor Total: {formatCurrency(valorTotal)}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
              {form.formState.errors.itens && (
                <p className="text-sm font-medium text-destructive mt-2">
                  {form.formState.errors.itens.message}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-4 mt-6">
          <Button
            variant="outline"
            type="button"
            disabled={isSubmitting}
            onClick={form.handleSubmit((d) => onSubmit(d, 'Rascunho'))}
          >
            Salvar como Rascunho
          </Button>
          <Button
            type="button"
            disabled={isSubmitting}
            onClick={form.handleSubmit((d) => onSubmit(d, 'Enviado'))}
          >
            Validar e Enviar
          </Button>
        </div>
      </Form>
    </div>
  )
}
