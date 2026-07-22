import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ShoppingBag, Loader2, ChevronsUpDown, Check, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'

const formSchema = z
  .object({
    cliente_id: z.string().optional().nullable(),
    nome_item: z.string().min(2, 'Nome do item é obrigatório'),
    quantidade: z.coerce.number().min(0.01, 'Quantidade deve ser maior que zero'),
    unidade: z.string().min(1, 'Selecione uma unidade'),
    motivo: z.string().optional(),
    modelo: z.string().optional(),
    tamanho: z.string().optional(),
    cor: z.string().optional(),
    link: z.string().optional(),
    urgencia: z.string().min(1, 'Selecione a urgência'),
  })
  .superRefine((data, ctx) => {
    const hasLink = data.link && data.link.trim().length > 0
    const hasDetails =
      (data.cor && data.cor.trim().length > 0) ||
      (data.tamanho && data.tamanho.trim().length > 0) ||
      (data.modelo && data.modelo.trim().length > 0)

    if (!hasLink && !hasDetails) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Se não houver link, é obrigatório preencher Cor, Tamanho ou Modelo',
        path: ['link'],
      })
    }
  })

type FormValues = z.infer<typeof formSchema>

type Cliente = {
  id: string
  nome: string
}

export function SolicitacaoCompraDialog() {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [openClienteCombobox, setOpenClienteCombobox] = useState(false)
  const [clienteSearch, setClienteSearch] = useState('')
  const { user } = useAuth()
  const { toast } = useToast()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cliente_id: null,
      nome_item: '',
      quantidade: 1,
      unidade: 'un',
      motivo: '',
      modelo: '',
      tamanho: '',
      cor: '',
      link: '',
      urgencia: 'Média',
    },
  })

  const fetchClientes = useCallback(async (searchTerm: string) => {
    let query = supabase
      .from('clientes')
      .select('id, nome')
      .order('nome', { ascending: true })
      .limit(50)

    if (searchTerm && searchTerm.trim().length > 0) {
      query = query.ilike('nome', `%${searchTerm.trim()}%`)
    }

    const { data, error } = await query
    if (!error && data) {
      setClientes(data as Cliente[])
    }
  }, [])

  useEffect(() => {
    if (open) {
      fetchClientes('')
    }
  }, [open, fetchClientes])

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchClientes(clienteSearch)
    }, 300)
    return () => clearTimeout(timeout)
  }, [clienteSearch, fetchClientes])

  const selectedClienteId = form.watch('cliente_id')
  const selectedCliente = clientes.find((c) => c.id === selectedClienteId)

  const onSubmit = async (values: FormValues) => {
    if (!user) return
    setIsSubmitting(true)
    try {
      const { error } = await supabase.from('solicitacoes_compra').insert({
        usuario_id: user.id,
        cliente_id: values.cliente_id || null,
        nome_item: values.nome_item,
        quantidade: values.quantidade,
        unidade: values.unidade,
        motivo: values.motivo || null,
        modelo: values.modelo || null,
        tamanho: values.tamanho || null,
        cor: values.cor || null,
        link: values.link || null,
        urgencia: values.urgencia,
        status: 'Pendente',
      })

      if (error) throw error

      toast({
        title: 'Solicitação enviada',
        description:
          'Sua solicitação de compra foi enviada com sucesso e está pendente de aprovação.',
      })
      setOpen(false)
      form.reset()
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao enviar solicitação.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground hover:text-foreground hover:bg-muted"
          title="Solicitar Compra de Material"
        >
          <ShoppingBag className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Solicitação de Compra</DialogTitle>
          <DialogDescription>
            Preencha os dados do material que você precisa. O pedido será enviado para aprovação e
            compra pelo setor financeiro/estoque.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 py-4">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Item</h3>

              <FormField
                control={form.control}
                name="cliente_id"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Cliente (Opcional)</FormLabel>
                    <Popover open={openClienteCombobox} onOpenChange={setOpenClienteCombobox}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openClienteCombobox}
                            className="w-full justify-between font-normal"
                          >
                            {selectedCliente ? selectedCliente.nome : 'Selecione um cliente...'}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0" align="start">
                        <Command shouldFilter={false}>
                          <div className="flex items-center border-b px-3">
                            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                            <CommandInput
                              placeholder="Buscar cliente..."
                              value={clienteSearch}
                              onValueChange={setClienteSearch}
                              className="flex h-9 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                            />
                          </div>
                          <CommandList>
                            <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                            <CommandGroup>
                              <CommandItem
                                value="__none__"
                                onSelect={() => {
                                  form.setValue('cliente_id', null)
                                  setOpenClienteCombobox(false)
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    !field.value ? 'opacity-100' : 'opacity-0',
                                  )}
                                />
                                Sem cliente
                              </CommandItem>
                              {clientes.map((cliente) => (
                                <CommandItem
                                  key={cliente.id}
                                  value={cliente.id}
                                  onSelect={() => {
                                    form.setValue('cliente_id', cliente.id)
                                    setOpenClienteCombobox(false)
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      'mr-2 h-4 w-4',
                                      field.value === cliente.id ? 'opacity-100' : 'opacity-0',
                                    )}
                                  />
                                  {cliente.nome}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      Selecione o cliente ao qual esta solicitação está vinculada.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nome_item"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Material *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Dobradiça FGV, Fita de Borda..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="quantidade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantidade</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="unidade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unidade de Medida</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="un">Unidade (un)</SelectItem>
                          <SelectItem value="chapa">Chapa</SelectItem>
                          <SelectItem value="m">Metros (m)</SelectItem>
                          <SelectItem value="m2">Metros Quadrados (m²)</SelectItem>
                          <SelectItem value="kg">Quilogramas (kg)</SelectItem>
                          <SelectItem value="cx">Caixa (cx)</SelectItem>
                          <SelectItem value="pct">Pacote (pct)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="urgencia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Urgência</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Baixa">
                          Baixa (Pode aguardar compras regulares)
                        </SelectItem>
                        <SelectItem value="Média">Média (Necessário no próximo ciclo)</SelectItem>
                        <SelectItem value="Alta">Alta (Urgente, prioridade)</SelectItem>
                        <SelectItem value="Urgente">Crítica (Parando a produção)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4 border-t pt-4">
              <h3 className="text-sm font-semibold text-foreground">Observações</h3>

              <FormField
                control={form.control}
                name="motivo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Motivo da Compra</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Ex: Falta material para o projeto X, ou quebra da correia Y."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="modelo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Modelo/Marca</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: FGVTN" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tamanho"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tamanho</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: 35mm" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cor</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Branco TX" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="link"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link de Referência (Opcional)</FormLabel>
                    <FormControl>
                      <Input type="url" placeholder="https://..." {...field} />
                    </FormControl>
                    <FormDescription>
                      Cole o link do produto na internet. Se não possuir, detalhe obrigatoriamente
                      cor, tamanho ou modelo acima.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enviar Solicitação
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
