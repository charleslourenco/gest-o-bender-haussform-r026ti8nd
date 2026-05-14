import { useState } from 'react'
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
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'

const formSchema = z
  .object({
    nome_item: z.string().min(2, 'Nome do item é obrigatório'),
    quantidade: z.coerce.number().min(0.01, 'Quantidade deve ser maior que zero'),
    unidade: z.string().min(1, 'Selecione uma unidade'),
    link: z.string().optional(),
    cor: z.string().optional(),
    tamanho: z.string().optional(),
    modelo: z.string().optional(),
    motivo: z.string().optional(),
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

export function SolicitacaoCompraDialog() {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { user } = useAuth()
  const { toast } = useToast()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome_item: '',
      quantidade: 1,
      unidade: 'un',
      link: '',
      cor: '',
      tamanho: '',
      modelo: '',
      motivo: '',
      urgencia: 'Média',
    },
  })

  const onSubmit = async (values: FormValues) => {
    if (!user) return
    setIsSubmitting(true)
    try {
      const { error } = await supabase.from('solicitacoes_compra' as any).insert({
        usuario_id: user.id,
        nome_item: values.nome_item,
        quantidade: values.quantidade,
        unidade: values.unidade,
        link: values.link || null,
        cor: values.cor || null,
        tamanho: values.tamanho || null,
        modelo: values.modelo || null,
        motivo: values.motivo || null,
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Solicitação de Compra</DialogTitle>
          <DialogDescription>
            Preencha os dados do material que você precisa. O pedido será enviado para aprovação e
            compra pelo setor financeiro/estoque.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="nome_item"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Material</FormLabel>
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
              name="link"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Link de Referência (Opcional)</FormLabel>
                  <FormControl>
                    <Input type="url" placeholder="https://..." {...field} />
                  </FormControl>
                  <FormDescription>
                    Cole o link do produto na internet. Se não possuir, detalhe obrigatoriamente
                    cor, tamanho ou modelo abaixo.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4 border p-4 rounded-md bg-muted/20">
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
            </div>

            <div className="grid grid-cols-2 gap-4">
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

            <div className="flex justify-end gap-3 pt-4">
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
