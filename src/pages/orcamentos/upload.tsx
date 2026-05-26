import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { UploadCloud, CheckCircle, AlertCircle, Loader2, X, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
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
import { processarOrcamentoOcr } from '@/services/orcamento-ocr'
import { supabase } from '@/lib/supabase/client'

const itemSchema = z.object({
  nome_item: z.string().min(1, 'Nome obrigatório'),
  quantidade: z.number().min(0.01, 'Deve ser > 0'),
  custo_unitario: z.number().min(0, 'Não pode ser negativo'),
})

const orcamentoSchema = z.object({
  cliente_id: z.string().min(1, 'Cliente obrigatório'),
  ambiente: z.string().min(1, 'Ambiente obrigatório'),
  descricao: z.string().optional(),
  itens: z.array(itemSchema).min(1, 'Adicione pelo menos 1 item'),
})

type OrcamentoFormValues = z.infer<typeof orcamentoSchema>

export default function UploadOrcamento() {
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [stage, setStage] = useState<
    'idle' | 'uploading' | 'extracting' | 'processing' | 'review' | 'success' | 'error'
  >('idle')
  const [progress, setProgress] = useState(0)
  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([])
  const [lowConfidence, setLowConfidence] = useState(false)

  const { toast } = useToast()
  const navigate = useNavigate()

  const form = useForm<OrcamentoFormValues>({
    resolver: zodResolver(orcamentoSchema),
    defaultValues: {
      cliente_id: '',
      ambiente: '',
      descricao: '',
      itens: [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'itens',
  })

  useEffect(() => {
    supabase
      .from('clientes')
      .select('id, nome')
      .order('nome')
      .then(({ data }) => {
        if (data) setClientes(data)
      })
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0])
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0])
    }
  }

  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const processFile = async (f: File) => {
    if (f.size > 5 * 1024 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: 'O limite é 5MB',
        variant: 'destructive',
      })
      return
    }
    const validTypes = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ]
    if (!validTypes.includes(f.type) && !f.name.endsWith('.csv') && !f.name.endsWith('.xlsx')) {
      toast({
        title: 'Formato inválido',
        description: 'Use PDF, PNG, JPEG, CSV ou XLSX',
        variant: 'destructive',
      })
      return
    }

    setFile(f)
    setStage('uploading')
    setProgress(15)

    try {
      const base64 = await fileToDataUrl(f)
      setProgress(30)
      setStage('extracting')

      const interval = setInterval(() => {
        setProgress((p) => (p < 75 ? p + 5 : p))
      }, 500)

      const data = await processarOrcamentoOcr(base64, f.type, f.name)
      clearInterval(interval)

      setProgress(80)
      setStage('processing')

      let matchedClientId = ''
      if (data.cliente) {
        const match = clientes.find((c) =>
          c.nome.toLowerCase().includes(data.cliente.toLowerCase()),
        )
        if (match) matchedClientId = match.id
      }

      if (data.confianca && data.confianca < 70) {
        setLowConfidence(true)
      } else {
        setLowConfidence(false)
      }

      form.reset({
        cliente_id: matchedClientId,
        ambiente:
          data.ambiente &&
          ['Cozinha', 'Sala', 'Quarto', 'Banheiro', 'Varanda', 'Outro'].includes(data.ambiente)
            ? data.ambiente
            : 'Outro',
        descricao: data.descricao || '',
        itens: (data.itens || []).map((i: any) => ({
          nome_item: i.nome_item || '',
          quantidade: i.quantidade || 1,
          custo_unitario: i.custo_unitario || 0,
        })),
      })

      setProgress(100)
      setTimeout(() => setStage('review'), 500)
    } catch (err: any) {
      setStage('error')
      toast({ title: 'Erro ao processar', description: err.message, variant: 'destructive' })
    }
  }

  const onSubmit = async (values: OrcamentoFormValues) => {
    try {
      setStage('processing')
      const { data: userData } = await supabase.auth.getUser()
      if (!userData?.user) throw new Error('Usuário não autenticado')

      const valorTotal = values.itens.reduce(
        (acc, item) => acc + item.custo_unitario * 2.5 * item.quantidade,
        0,
      )

      const { data: orcamento, error: orcError } = await supabase
        .from('orcamentos')
        .insert({
          cliente_id: values.cliente_id,
          ambiente: values.ambiente,
          descricao: values.descricao,
          user_id: userData.user.id,
          status: 'Rascunho',
          valor_total: valorTotal,
        })
        .select()
        .single()

      if (orcError) throw orcError

      if (values.itens.length > 0) {
        const itensToInsert = values.itens.map((i) => ({
          orcamento_id: orcamento.id,
          quantidade: i.quantidade,
          preco_custo: i.custo_unitario,
          preco_venda: i.custo_unitario * 2.5,
        }))
        const { error: itError } = await supabase.from('itens_orcamento').insert(itensToInsert)
        if (itError) throw itError
      }

      await supabase.from('versoes_orcamentos').insert({
        orcamento_id: orcamento.id,
        criado_por: userData.user.id,
        numero_versao: 1,
        dados_json: values as any,
      })

      setStage('success')
      toast({ title: 'Sucesso', description: 'Orçamento criado a partir do arquivo!' })
      navigate('/orcamentos')
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' })
      setStage('review')
    }
  }

  const resetUpload = () => {
    setFile(null)
    setStage('idle')
    setProgress(0)
    setLowConfidence(false)
    form.reset({ cliente_id: '', ambiente: '', descricao: '', itens: [] })
  }

  return (
    <div className="container max-w-4xl py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Extração de Orçamento com IA</h1>
      </div>

      {stage === 'idle' && (
        <Card className="border-dashed border-2 bg-muted/30">
          <CardContent className="p-12">
            <div
              className={cn(
                'flex flex-col items-center justify-center space-y-4 rounded-lg p-12 transition-all',
                isDragging ? 'bg-primary/10 border-primary' : '',
              )}
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragging(true)
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <div className="p-4 bg-background rounded-full shadow-sm border">
                <UploadCloud className="w-8 h-8 text-muted-foreground" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold">
                  Arraste um arquivo aqui ou clique para selecionar
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Suporta PDF, PNG, JPEG, CSV e XLSX (Max 5MB)
                </p>
              </div>
              <label htmlFor="file-upload">
                <Button variant="outline" className="cursor-pointer" asChild>
                  <span>Selecionar Arquivo</span>
                </Button>
                <input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  accept=".pdf,image/png,image/jpeg,.csv,.xlsx"
                  onChange={handleFileSelect}
                />
              </label>
            </div>
          </CardContent>
        </Card>
      )}

      {(stage === 'uploading' || stage === 'extracting' || stage === 'processing') && (
        <Card>
          <CardContent className="p-12 flex flex-col items-center justify-center space-y-6">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <div className="text-center space-y-2 w-full max-w-md">
              <h3 className="text-lg font-medium">
                {stage === 'uploading' && 'Enviando arquivo...'}
                {stage === 'extracting' && 'Extraindo dados com IA...'}
                {stage === 'processing' && 'Processando...'}
              </h3>
              <Progress value={progress} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {stage === 'error' && (
        <Card className="border-destructive">
          <CardContent className="p-12 flex flex-col items-center justify-center space-y-4 text-center">
            <div className="p-3 bg-destructive/10 rounded-full">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold">Falha na extração</h3>
            <p className="text-muted-foreground max-w-sm">
              Não foi possível processar o arquivo. Verifique se ele está legível e não ultrapassa
              5MB.
            </p>
            <Button onClick={resetUpload} variant="outline" className="mt-4">
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      )}

      {stage === 'review' && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {lowConfidence && (
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 shrink-0" />
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Não consegui extrair os dados com clareza. Tente um arquivo mais legível ou
                  preencha manualmente.
                </p>
              </div>
            )}

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>Revisão de Dados Extraídos</CardTitle>
                  <CardDescription>
                    Arquivo original:{' '}
                    <span className="font-medium text-foreground">{file?.name}</span>
                  </CardDescription>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={resetUpload}>
                  <X className="w-4 h-4 mr-2" /> Cancelar
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="cliente_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cliente</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
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
                        <FormLabel>Ambiente</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o ambiente" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {['Cozinha', 'Sala', 'Quarto', 'Banheiro', 'Varanda', 'Outro'].map(
                              (a) => (
                                <SelectItem key={a} value={a}>
                                  {a}
                                </SelectItem>
                              ),
                            )}
                          </SelectContent>
                        </Select>
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
                      <FormLabel>Descrição / Observações</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Itens do Orçamento</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => append({ nome_item: '', quantidade: 1, custo_unitario: 0 })}
                    >
                      <Plus className="w-4 h-4 mr-2" /> Adicionar Item
                    </Button>
                  </div>

                  <div className="border rounded-md divide-y">
                    <div className="grid grid-cols-12 gap-4 p-3 bg-muted/50 text-sm font-medium hidden md:grid">
                      <div className="col-span-5">Descrição</div>
                      <div className="col-span-2">Qtd</div>
                      <div className="col-span-2">Custo Unit.</div>
                      <div className="col-span-2">Preço Venda (Ref)</div>
                      <div className="col-span-1"></div>
                    </div>
                    {fields.length === 0 && (
                      <div className="p-8 text-center text-muted-foreground text-sm">
                        Nenhum item extraído ou adicionado.
                      </div>
                    )}
                    {fields.map((field, index) => {
                      const qtd = form.watch(`itens.${index}.quantidade`) || 0
                      const custo = form.watch(`itens.${index}.custo_unitario`) || 0
                      const venda = custo * 2.5

                      return (
                        <div
                          key={field.id}
                          className="grid grid-cols-1 md:grid-cols-12 gap-4 p-3 items-center"
                        >
                          <div className="md:col-span-5">
                            <FormField
                              control={form.control}
                              name={`itens.${index}.nome_item`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input placeholder="Nome do Item" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <div className="md:col-span-2">
                            <FormField
                              control={form.control}
                              name={`itens.${index}.quantidade`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      placeholder="Qtd"
                                      {...field}
                                      onChange={(e) =>
                                        field.onChange(parseFloat(e.target.value) || 0)
                                      }
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <div className="md:col-span-2">
                            <FormField
                              control={form.control}
                              name={`itens.${index}.custo_unitario`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      placeholder="Custo"
                                      {...field}
                                      onChange={(e) =>
                                        field.onChange(parseFloat(e.target.value) || 0)
                                      }
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <div className="md:col-span-2 flex items-center justify-between md:justify-end text-sm">
                            <span className="md:hidden text-muted-foreground">Preço Venda:</span>
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            }).format(venda)}
                          </div>
                          <div className="md:col-span-1 flex justify-end">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => remove(index)}
                              className="text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="flex justify-end p-4 bg-muted/30 rounded-lg">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Valor Total Estimado</p>
                      <p className="text-2xl font-bold text-primary">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(
                          form
                            .watch('itens')
                            .reduce(
                              (acc, item) => acc + item.custo_unitario * 2.5 * item.quantidade,
                              0,
                            ),
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between border-t p-6">
                <Button type="button" variant="outline" onClick={resetUpload}>
                  Descartar
                </Button>
                <Button type="submit">
                  <CheckCircle className="w-4 h-4 mr-2" /> Salvar Orçamento
                </Button>
              </CardFooter>
            </Card>
          </form>
        </Form>
      )}
    </div>
  )
}
