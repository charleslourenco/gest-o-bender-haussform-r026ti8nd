import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Trash2, Plus, Save, Check, ArrowLeft } from 'lucide-react'
import { ItemSearchModal } from './ItemSearchModal'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { cn } from '@/lib/utils'

const formSchema = z.object({
  cliente_id: z.string().min(1, 'Selecione um cliente'),
  ambiente: z.string().min(1, 'Obrigatório'),
  descricao: z.string().optional(),
  orcamento_id: z.string().optional(),
  itens: z
    .array(
      z.object({
        estoque_item_id: z.string(),
        nome: z.string(),
        unidade: z.string(),
        quantidade: z.number().min(0.01),
        quantidade_disponivel: z.number(),
      }),
    )
    .min(1, 'Mínimo 1 item'),
})

export default function NovaListaMateriais() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()

  const [clientes, setClientes] = useState<any[]>([])
  const [orcamentos, setOrcamentos] = useState<any[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { cliente_id: '', ambiente: '', descricao: '', orcamento_id: 'none', itens: [] },
  })
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'itens' })

  useEffect(() => {
    const load = async () => {
      const [cliRes, orcRes] = await Promise.all([
        supabase.from('clientes').select('id, nome').order('nome'),
        supabase.from('orcamentos').select('id, cliente_id, ambiente, clientes(nome)'),
      ])
      if (cliRes.data) setClientes(cliRes.data)
      if (orcRes.data) setOrcamentos(orcRes.data)

      if (id) {
        const { data: list } = await supabase
          .from('listas_materiais')
          .select('*')
          .eq('id', id)
          .single()
        if (!list) return
        form.reset({
          cliente_id: list.cliente_id || '',
          ambiente: list.ambiente || '',
          descricao: list.descricao || '',
          orcamento_id: list.orcamento_id || 'none',
          itens: [],
        })
        const { data: items } = await supabase
          .from('itens_lista_material')
          .select('*, estoque_itens(nome, unidade, quantidade)')
          .eq('lista_material_id', id)
        if (items) {
          form.setValue(
            'itens',
            items.map((i) => {
              const ei = Array.isArray(i.estoque_itens) ? i.estoque_itens[0] : i.estoque_itens
              return {
                estoque_item_id: i.estoque_item_id!,
                nome: ei?.nome || '',
                unidade: ei?.unidade || 'un',
                quantidade: Number(i.quantidade),
                quantidade_disponivel: Number(ei?.quantidade || 0),
              }
            }),
          )
        }
      }
    }
    load()
  }, [id])

  const handleImport = async (orcId: string) => {
    if (!orcId || orcId === 'none') return
    const orc = orcamentos.find((o) => o.id === orcId)
    if (orc) {
      if (orc.cliente_id) form.setValue('cliente_id', orc.cliente_id)
      if (orc.ambiente) form.setValue('ambiente', orc.ambiente)
    }
    const { data: items } = await supabase
      .from('itens_orcamento')
      .select('quantidade, estoque_item_id, estoque_itens(nome, unidade, quantidade)')
      .eq('orcamento_id', orcId)
    if (items) {
      form.setValue(
        'itens',
        items.map((i) => {
          const ei = Array.isArray(i.estoque_itens) ? i.estoque_itens[0] : i.estoque_itens
          return {
            estoque_item_id: i.estoque_item_id!,
            nome: ei?.nome || '',
            unidade: ei?.unidade || 'un',
            quantidade: Number(i.quantidade),
            quantidade_disponivel: Number(ei?.quantidade || 0),
          }
        }),
        { shouldValidate: true },
      )
    }
  }

  const onSubmit = async (data: z.infer<typeof formSchema>, status: 'Rascunho' | 'Finalizada') => {
    try {
      setSaving(true)
      const payload = {
        cliente_id: data.cliente_id,
        ambiente: data.ambiente,
        descricao: data.descricao,
        orcamento_id: data.orcamento_id !== 'none' ? data.orcamento_id : null,
        status,
        user_id: user?.id,
        data_atualizacao: new Date().toISOString(),
      }
      let listId = id
      if (id) {
        await supabase.from('listas_materiais').update(payload).eq('id', id).throwOnError()
        await supabase
          .from('itens_lista_material')
          .delete()
          .eq('lista_material_id', id)
          .throwOnError()
      } else {
        const res = await supabase
          .from('listas_materiais')
          .insert(payload)
          .select()
          .single()
          .throwOnError()
        listId = res.data?.id
        if (payload.orcamento_id) {
          await supabase
            .from('versoes_orcamentos')
            .insert({
              orcamento_id: payload.orcamento_id,
              dados_json: data.itens,
              criado_por: user?.id,
            })
        }
      }
      if (data.itens.length > 0) {
        await supabase
          .from('itens_lista_material')
          .insert(
            data.itens.map((i) => ({
              lista_material_id: listId,
              estoque_item_id: i.estoque_item_id,
              quantidade: i.quantidade,
            })),
          )
          .throwOnError()
      }
      toast({ title: 'Sucesso', description: 'Lista de materiais salva!' })
      navigate('/listas-materiais')
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/listas-materiais">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{id ? 'Editar' : 'Nova'} Lista</h1>
          <p className="text-muted-foreground">Especifique os materiais necessários</p>
        </div>
      </div>
      <Form {...form}>
        <form className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-card p-6 rounded-lg border shadow-sm">
            <FormField
              control={form.control}
              name="orcamento_id"
              render={({ field }) => (
                <FormItem className="col-span-full">
                  <FormLabel>Importar de Orçamento (Opcional)</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(v) => {
                      field.onChange(v)
                      handleImport(v)
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um orçamento..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Não importar</SelectItem>
                      {orcamentos.map((o) => {
                        const cName = Array.isArray(o.clientes)
                          ? o.clientes[0]?.nome
                          : o.clientes?.nome
                        return (
                          <SelectItem key={o.id} value={o.id}>
                            {cName} - {o.ambiente || 'Sem ambiente'}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cliente_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
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
                  <FormLabel>Ambiente</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem className="col-span-full">
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          <div className="bg-card p-6 rounded-lg border shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Itens da Lista</h3>
              <Button type="button" variant="outline" onClick={() => setModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" /> Adicionar
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead className="w-32">Necessária</TableHead>
                  <TableHead className="w-32">Estoque</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      Nenhum item
                    </TableCell>
                  </TableRow>
                ) : (
                  fields.map((f, idx) => (
                    <TableRow key={f.id}>
                      <TableCell>{form.getValues(`itens.${idx}.nome`)}</TableCell>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`itens.${idx}.quantidade`}
                          render={({ field }) => (
                            <Input
                              type="number"
                              step="0.01"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            form.watch(`itens.${idx}.quantidade`) >
                              form.getValues(`itens.${idx}.quantidade_disponivel`)
                              ? 'text-red-500'
                              : 'text-green-500',
                          )}
                        >
                          {form.getValues(`itens.${idx}.quantidade_disponivel`)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          className="text-red-500"
                          onClick={() => remove(idx)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {form.formState.errors.itens?.root && (
              <p className="text-red-500 text-sm">{form.formState.errors.itens.root.message}</p>
            )}
          </div>
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={form.handleSubmit((d) => onSubmit(d, 'Rascunho'))}
            >
              <Save className="w-4 h-4 mr-2" /> Salvar Rascunho
            </Button>
            <Button
              type="button"
              disabled={saving}
              onClick={form.handleSubmit((d) => onSubmit(d, 'Finalizada'))}
            >
              <Check className="w-4 h-4 mr-2" /> Finalizar
            </Button>
          </div>
        </form>
      </Form>
      <ItemSearchModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSelect={(i) =>
          append({
            estoque_item_id: i.id,
            nome: i.nome,
            unidade: i.unidade,
            quantidade: 1,
            quantidade_disponivel: i.quantidade,
          })
        }
      />
    </div>
  )
}
