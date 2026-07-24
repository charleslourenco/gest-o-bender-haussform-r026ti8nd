import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ShoppingBag, Loader2 } from 'lucide-react'
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import type { ReactNode } from 'react'

const formSchema = z.object({
  nome_item: z.string().min(2, 'Nome do item é obrigatório'),
  motivo: z.string().min(2, 'Motivo é obrigatório'),
  link: z.string().optional(),
  quantidade: z.coerce.number().min(0.01, 'Quantidade deve ser maior que zero'),
  unidade: z.string().min(1, 'Selecione uma unidade'),
  urgencia: z.string().min(1, 'Selecione a urgência'),
  observacoes: z.string().optional(),
  cliente_id: z.string().optional().nullable(),
  tipo_solicitacao: z.enum(['Cliente', 'Produção', 'Reposição']),
})

type FormValues = z.infer<typeof formSchema>

interface ClienteOption {
  id: string
  nome: string
}

interface Props {
  onCreated?: () => void
  trigger?: ReactNode
}

export function SolicitacaoCompraDialog({ onCreated, trigger }: Props) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [userNome, setUserNome] = useState('')
  const [clientes, setClientes] = useState<ClienteOption[]>([])
  const [loadingClientes, setLoadingClientes] = useState(false)
  const { user } = useAuth()
  const { toast } = useToast()

  const today = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome_item: '',
      motivo: '',
      link: '',
      quantidade: 1,
      unidade: 'un',
      urgencia: 'Média',
      observacoes: '',
      cliente_id: '',
      tipo_solicitacao: 'Cliente',
    },
  })

  const tipoSolicitacao = form.watch('tipo_solicitacao')
  const showCliente = tipoSolicitacao === 'Cliente'

  useEffect(() => {
    if (!showCliente && form.getValues('cliente_id')) {
      form.setValue('cliente_id', '')
    }
  }, [showCliente, form])

  useEffect(() => {
    const fetchUserName = async () => {
      if (!user) return
      const { data } = await supabase.from('users').select('nome').eq('id', user.id).single()
      if (data?.nome) {
        setUserNome(data.nome)
      } else {
        setUserNome(user.email || '')
      }
    }
    if (open) fetchUserName()
  }, [open, user])

  useEffect(() => {
    const fetchClientes = async () => {
      if (!open) return
      setLoadingClientes(true)
      try {
        const { data, error } = await supabase
          .from('clientes')
          .select('id, nome')
          .eq('status', 'Ativo')
          .order('nome')
        if (error) throw error
        setClientes((data as ClienteOption[]) || [])
      } catch {
        setClientes([])
      } finally {
        setLoadingClientes(false)
      }
    }
    if (open) fetchClientes()
  }, [open])

  const onSubmit = async (values: FormValues) => {
    if (!user) return
    setIsSubmitting(true)
    try {
      const motivoCompleto = values.observacoes?.trim()
        ? `${values.motivo}\n\nObservações: ${values.observacoes.trim()}`
        : values.motivo

      const payload = {
        usuario_id: user.id,
        nome_item: values.nome_item,
        quantidade: values.quantidade,
        unidade: values.unidade,
        motivo: motivoCompleto,
        link: values.link || null,
        urgencia: values.urgencia,
        status: 'Pendente',
        cliente_id: values.tipo_solicitacao === 'Cliente' ? values.cliente_id || null : null,
        tipo_solicitacao: values.tipo_solicitacao,
      }

      const { error } = await supabase.from('solicitacoes_compra').insert(payload as any)

      if (error) throw error

      toast({
        title: 'Solicitação enviada',
        description:
          'Sua solicitação de compra foi enviada com sucesso e está pendente de aprovação.',
      })
      setOpen(false)
      form.reset()
      onCreated?.()
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
        {trigger ?? (
          <Button size="sm" title="Nova Solicitação de Compra">
            <ShoppingBag className="h-4 w-4 mr-1" />
            Nova Solicitação
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Solicitação de Compra</DialogTitle>
          <DialogDescription>
            Preencha os dados do material que você precisa. O pedido será enviado para aprovação.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Solicitante</label>
            <Input value={userNome || 'Carregando...'} readOnly disabled className="bg-muted/50" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Data da solicitação</label>
            <Input value={today} readOnly disabled className="bg-muted/50" />
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="tipo_solicitacao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Solicitação</FormLabel>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="grid grid-cols-3 gap-2"
                    >
                      {(
                        [
                          { value: 'Cliente', label: 'Cliente' },
                          { value: 'Produção', label: 'Para Produção' },
                          { value: 'Reposição', label: 'Reposição de Estoque' },
                        ] as const
                      ).map((opt) => (
                        <label
                          key={opt.value}
                          className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer transition-colors ${
                            field.value === opt.value
                              ? 'border-primary bg-primary/5 text-foreground'
                              : 'border-input hover:bg-muted/50 text-muted-foreground'
                          }`}
                        >
                          <RadioGroupItem value={opt.value} />
                          <span className="font-medium">{opt.label}</span>
                        </label>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {showCliente && (
              <FormField
                control={form.control}
                name="cliente_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente (opcional)</FormLabel>
                    <Select
                      value={field.value ?? ''}
                      onValueChange={(value) => field.onChange(value || '')}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={loadingClientes ? 'Carregando...' : 'Selecione um cliente'}
                          />
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
            )}

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

            <FormField
              control={form.control}
              name="motivo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Falta material para o projeto X" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="link"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Link de Referência (Opcional)</FormLabel>
                  <FormControl>
                    <Input type="url" placeholder="https://..." {...field} />
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
                    <FormLabel>Unidade</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="un">Unidades (un)</SelectItem>
                        <SelectItem value="kg">Quilogramas (kg)</SelectItem>
                        <SelectItem value="m">Metros (m)</SelectItem>
                        <SelectItem value="m²">Metros Quadrados (m²)</SelectItem>
                        <SelectItem value="litro">Litros (l)</SelectItem>
                        <SelectItem value="par">Par</SelectItem>
                        <SelectItem value="conjunto">Conjunto</SelectItem>
                        <SelectItem value="pacote">Pacote (pct)</SelectItem>
                        <SelectItem value="chapa">Chapa</SelectItem>
                        <SelectItem value="cx">Caixa (cx)</SelectItem>
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
                  <FormLabel>Nível de Urgência</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Baixa">Baixa</SelectItem>
                      <SelectItem value="Média">Média</SelectItem>
                      <SelectItem value="Alta">Alta</SelectItem>
                      <SelectItem value="Urgente">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Informações adicionais sobre o material..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
