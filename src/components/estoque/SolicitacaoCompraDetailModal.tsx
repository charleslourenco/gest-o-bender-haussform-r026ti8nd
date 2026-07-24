import { useState, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { Save, Archive, Loader2, History } from 'lucide-react'

export type SolicitacaoDetalhe = {
  id: string
  usuario_id: string
  nome_item: string
  quantidade: number
  unidade: string
  link: string | null
  cor: string | null
  tamanho: string | null
  modelo: string | null
  motivo: string | null
  urgencia: string
  status: string
  criado_em: string
  cliente_id?: string | null
  fornecedor?: string | null
  data_entrega_prevista?: string | null
  arquivado?: boolean | null
  editado_por?: string | null
  editado_em?: string | null
  tipo_solicitacao?: string | null
  usuario?: { nome: string } | null
  cliente?: { nome: string } | null
  editado_por_usuario?: { nome: string } | null
}

interface Props {
  solicitacao: SolicitacaoDetalhe | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onStatusChanged: () => void
}

const formSchema = z.object({
  nome_item: z.string().min(1, 'Nome do item é obrigatório'),
  link: z.string().optional(),
  quantidade: z.coerce.number().min(0.01, 'Quantidade deve ser maior que zero'),
  unidade: z.string().min(1, 'Selecione uma unidade'),
  cor: z.string().optional(),
  tamanho: z.string().optional(),
  modelo: z.string().optional(),
  fornecedor: z.string().optional(),
  data_entrega_prevista: z.string().optional(),
  motivo: z.string().optional(),
  cliente_id: z.string().optional().nullable(),
  status: z.string().min(1, 'Selecione um status'),
  urgencia: z.string().min(1, 'Selecione a urgência'),
  tipo_solicitacao: z.enum(['Cliente', 'Produção', 'Reposição']),
})

type FormValues = z.infer<typeof formSchema>

const UNIDADES = ['un', 'kg', 'm', 'm²', 'litro', 'par', 'conjunto', 'pacote', 'chapa', 'cx']
const STATUS_OPTIONS = ['Pendente', 'Aprovado', 'Comprado', 'Rejeitado']
const URGENCIA_OPTIONS = ['Baixa', 'Média', 'Alta', 'Urgente']

interface ClienteOption {
  id: string
  nome: string
}

const parseMotivo = (motivo: string | null): { motivo: string; observacoes: string } => {
  if (!motivo) return { motivo: '', observacoes: '' }
  const parts = motivo.split('\n\nObservações:')
  return {
    motivo: parts[0]?.trim() || '',
    observacoes: parts[1]?.trim() || '',
  }
}

export function SolicitacaoCompraDetailModal({
  solicitacao,
  open,
  onOpenChange,
  onStatusChanged,
}: Props) {
  const { toast } = useToast()
  const { user } = useAuth()
  const [isSaving, setIsSaving] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)
  const [clientes, setClientes] = useState<ClienteOption[]>([])
  const [loadingClientes, setLoadingClientes] = useState(false)
  const [editadoPorNome, setEditadoPorNome] = useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome_item: '',
      link: '',
      quantidade: 1,
      unidade: 'un',
      cor: '',
      tamanho: '',
      modelo: '',
      fornecedor: '',
      data_entrega_prevista: '',
      motivo: '',
      cliente_id: '',
      status: 'Pendente',
      urgencia: 'Média',
      tipo_solicitacao: 'Cliente',
    },
  })

  useEffect(() => {
    if (solicitacao && open) {
      const { motivo: motivoTexto, observacoes } = parseMotivo(solicitacao.motivo)
      const tipo =
        solicitacao.tipo_solicitacao &&
        ['Cliente', 'Produção', 'Reposição'].includes(solicitacao.tipo_solicitacao)
          ? (solicitacao.tipo_solicitacao as 'Cliente' | 'Produção' | 'Reposição')
          : 'Cliente'
      form.reset({
        nome_item: solicitacao.nome_item || '',
        link: solicitacao.link || '',
        quantidade: solicitacao.quantidade || 1,
        unidade: solicitacao.unidade || 'un',
        cor: solicitacao.cor || '',
        tamanho: solicitacao.tamanho || '',
        modelo: solicitacao.modelo || '',
        fornecedor: solicitacao.fornecedor || '',
        data_entrega_prevista: solicitacao.data_entrega_prevista || '',
        motivo: motivoTexto,
        cliente_id: solicitacao.cliente_id || '',
        status: solicitacao.status || 'Pendente',
        urgencia: solicitacao.urgencia || 'Média',
        tipo_solicitacao: tipo,
      })
      void observacoes
    }
  }, [solicitacao, open, form])

  const tipoSolicitacao = form.watch('tipo_solicitacao')
  const showCliente = tipoSolicitacao === 'Cliente'

  useEffect(() => {
    if (!showCliente && form.getValues('cliente_id')) {
      form.setValue('cliente_id', '')
    }
  }, [showCliente, form])

  useEffect(() => {
    if (!open) return
    let active = true
    const fetchClientes = async () => {
      setLoadingClientes(true)
      try {
        const { data, error } = await supabase.from('clientes').select('id, nome').order('nome')
        if (error) throw error
        if (active) setClientes((data as ClienteOption[]) || [])
      } catch {
        if (active) setClientes([])
      } finally {
        if (active) setLoadingClientes(false)
      }
    }
    fetchClientes()
    return () => {
      active = false
    }
  }, [open])

  useEffect(() => {
    const fetchEditadoPor = async () => {
      if (!solicitacao?.editado_por) {
        setEditadoPorNome(null)
        return
      }
      const { data } = await supabase
        .from('users')
        .select('nome')
        .eq('id', solicitacao.editado_por)
        .maybeSingle()
      setEditadoPorNome(data?.nome || 'Usuário')
    }
    if (open) fetchEditadoPor()
  }, [solicitacao?.editado_por, open])

  const statusValue = form.watch('status')
  const isComprado = statusValue === 'Comprado'

  const formatEditadoEm = useMemo(() => {
    if (!solicitacao?.editado_em) return ''
    return new Date(solicitacao.editado_em).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }, [solicitacao?.editado_em])

  if (!solicitacao) return null

  const buildMotivoCompleto = (motivo: string): string | null => {
    const trimmed = motivo?.trim() || ''
    return trimmed || null
  }

  const onSubmit = async (values: FormValues) => {
    if (!solicitacao) return
    setIsSaving(true)
    try {
      const motivoCompleto = buildMotivoCompleto(values.motivo)

      const nonStatusFields = {
        nome_item: values.nome_item,
        link: values.link || null,
        quantidade: values.quantidade,
        unidade: values.unidade,
        cor: values.cor || null,
        tamanho: values.tamanho || null,
        modelo: values.modelo || null,
        fornecedor: values.fornecedor || null,
        data_entrega_prevista: values.data_entrega_prevista || null,
        motivo: motivoCompleto,
        urgencia: values.urgencia,
        cliente_id: values.tipo_solicitacao === 'Cliente' ? values.cliente_id || null : null,
        status: values.status,
        tipo_solicitacao: values.tipo_solicitacao,
      }

      const originalNonStatus = {
        nome_item: solicitacao.nome_item,
        link: solicitacao.link,
        quantidade: solicitacao.quantidade,
        unidade: solicitacao.unidade,
        cor: solicitacao.cor,
        tamanho: solicitacao.tamanho,
        modelo: solicitacao.modelo,
        fornecedor: solicitacao.fornecedor,
        data_entrega_prevista: solicitacao.data_entrega_prevista,
        motivo: solicitacao.motivo,
        urgencia: solicitacao.urgencia,
        cliente_id: solicitacao.cliente_id,
        tipo_solicitacao: solicitacao.tipo_solicitacao,
      }

      const hasNonStatusChanges = Object.keys(originalNonStatus).some((key) => {
        const oldVal = (originalNonStatus as any)[key]
        const newVal = (nonStatusFields as any)[key]
        const oldNorm = oldVal === '' ? null : oldVal
        const newNorm = newVal === '' ? null : newVal
        return String(oldNorm ?? '') !== String(newNorm ?? '')
      })

      const updatePayload: any = { ...nonStatusFields }
      if (hasNonStatusChanges && user) {
        updatePayload.editado_por = user.id
        updatePayload.editado_em = new Date().toISOString()
      }

      const { error } = await supabase
        .from('solicitacoes_compra')
        .update(updatePayload)
        .eq('id', solicitacao.id)

      if (error) throw error

      toast({
        title: 'Solicitação atualizada',
        description: 'As alterações foram salvas com sucesso.',
      })
      onStatusChanged()
      onOpenChange(false)
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar',
        description: err.message || 'Não foi possível salvar as alterações.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleArchive = async () => {
    if (!solicitacao) return
    setIsArchiving(true)
    try {
      const { error } = await supabase
        .from('solicitacoes_compra')
        .update({ arquivado: true } as any)
        .eq('id', solicitacao.id)
      if (error) throw error
      toast({
        title: 'Solicitação arquivada',
        description: 'A solicitação foi arquivada com sucesso.',
      })
      onStatusChanged()
      onOpenChange(false)
    } catch (err: any) {
      toast({
        title: 'Erro ao arquivar',
        description: err.message || 'Não foi possível arquivar a solicitação.',
        variant: 'destructive',
      })
    } finally {
      setIsArchiving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            Editar Solicitação de Compra
            {solicitacao.arquivado && (
              <Badge variant="secondary" className="ml-1">
                Arquivado
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Edite os campos da solicitação e clique em Salvar para persistir as alterações.
          </DialogDescription>
        </DialogHeader>

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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
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
                name="urgencia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Urgência</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {URGENCIA_OPTIONS.map((u) => (
                          <SelectItem key={u} value={u}>
                            {u}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="nome_item"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Item *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Dobradiça com amortecedor" {...field} />
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
                  <FormLabel>Link de Referência</FormLabel>
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {UNIDADES.map((u) => (
                          <SelectItem key={u} value={u}>
                            {u}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cor</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Branco" {...field} />
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
                      <Input placeholder="Ex: 100mm" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="modelo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modelo</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Modelo X" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fornecedor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fornecedor</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Fornecedor Y" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="data_entrega_prevista"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de Entrega Prevista</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
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
                  <FormLabel>Motivo / Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Informações adicionais sobre o material..."
                      className="resize-none min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {solicitacao.editado_por && editadoPorNome && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
                <History className="w-3.5 h-3.5" />
                <span>
                  Editado por <strong className="text-foreground">{editadoPorNome}</strong> em{' '}
                  {formatEditadoEm}
                </span>
              </div>
            )}

            <Separator className="my-2" />

            <DialogFooter className="flex flex-wrap items-center justify-between gap-2 sm:justify-between">
              <div className="flex items-center gap-2">
                {isComprado && !solicitacao.arquivado && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleArchive}
                    disabled={isArchiving || isSaving}
                  >
                    {isArchiving ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Archive className="w-4 h-4 mr-1" />
                    )}
                    Arquivar
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  disabled={isSaving || isArchiving}
                >
                  Cancelar
                </Button>
                <Button type="submit" size="sm" disabled={isSaving || isArchiving}>
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-1" />
                  )}
                  Salvar
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
