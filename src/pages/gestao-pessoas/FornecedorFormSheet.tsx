import { useEffect, useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'
import { maskCnpj, maskPhone, maskCep } from './utils'

const schema = z.object({
  cnpj: z.string().min(14, 'CNPJ inválido'),
  razao_social: z.string().min(2, 'Razão social obrigatória'),
  nome_fantasia: z.string().optional(),
  cep: z.string().optional(),
  logradouro: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  municipio: z.string().optional(),
  estado: z.string().optional(),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  telefone: z.string().optional(),
  inscricao_estadual: z.string().optional(),
  data_abertura: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export function FornecedorFormSheet({
  open,
  onOpenChange,
  fornecedor,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  fornecedor: any
  onSave: () => void
}) {
  const { toast } = useToast()
  const [isFetching, setIsFetching] = useState(false)

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      cnpj: '',
      razao_social: '',
      nome_fantasia: '',
      cep: '',
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      municipio: '',
      estado: '',
      email: '',
      telefone: '',
      inscricao_estadual: '',
      data_abertura: '',
    },
  })

  useEffect(() => {
    if (open) {
      if (fornecedor) {
        form.reset({
          cnpj: maskCnpj(fornecedor.cnpj || ''),
          razao_social: fornecedor.razao_social || '',
          nome_fantasia: fornecedor.nome_fantasia || '',
          cep: maskCep(fornecedor.cep || ''),
          logradouro: fornecedor.logradouro || '',
          numero: fornecedor.numero || '',
          complemento: fornecedor.complemento || '',
          bairro: fornecedor.bairro || '',
          municipio: fornecedor.municipio || '',
          estado: fornecedor.estado || '',
          email: fornecedor.email || '',
          telefone: maskPhone(fornecedor.telefone || ''),
          inscricao_estadual: fornecedor.inscricao_estadual || '',
          data_abertura: fornecedor.data_abertura || '',
        })
      } else {
        form.reset({
          cnpj: '',
          razao_social: '',
          nome_fantasia: '',
          cep: '',
          logradouro: '',
          numero: '',
          complemento: '',
          bairro: '',
          municipio: '',
          estado: '',
          email: '',
          telefone: '',
          inscricao_estadual: '',
          data_abertura: '',
        })
      }
    }
  }, [open, fornecedor, form])

  const watchCnpj = form.watch('cnpj')
  useEffect(() => {
    const unmasked = watchCnpj?.replace(/\D/g, '')
    if (unmasked?.length === 14 && !fornecedor) {
      fetchCNPJ(unmasked)
    }
  }, [watchCnpj, fornecedor])

  async function fetchCNPJ(cnpj: string) {
    setIsFetching(true)
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`)
      if (!res.ok) throw new Error('CNPJ não encontrado')
      const data = await res.json()

      form.setValue('razao_social', data.razao_social || '')
      form.setValue('nome_fantasia', data.nome_fantasia || '')
      form.setValue('cep', maskCep(data.cep || ''))
      form.setValue('logradouro', data.logradouro || '')
      form.setValue('numero', data.numero || '')
      form.setValue('complemento', data.complemento || '')
      form.setValue('bairro', data.bairro || '')
      form.setValue('municipio', data.municipio || '')
      form.setValue('estado', data.uf || '')
      form.setValue('telefone', maskPhone(data.ddd_telefone_1 || ''))
      form.setValue('data_abertura', data.data_inicio_atividade || '')
      toast({ title: 'Dados do CNPJ carregados' })
    } catch (e) {
      toast({
        title: 'Erro ao buscar CNPJ',
        description: 'Preencha manualmente.',
        variant: 'destructive',
      })
    } finally {
      setIsFetching(false)
    }
  }

  const onSubmit = async (data: FormData) => {
    try {
      const payload = {
        ...data,
        cnpj: data.cnpj.replace(/\D/g, ''),
        telefone: data.telefone?.replace(/\D/g, ''),
        cep: data.cep?.replace(/\D/g, ''),
        data_abertura: data.data_abertura || null,
      }
      if (fornecedor) {
        const { error } = await supabase
          .from('fornecedores')
          .update(payload)
          .eq('id', fornecedor.id)
        if (error) throw error
        toast({ title: 'Fornecedor atualizado' })
      } else {
        const { error } = await supabase.from('fornecedores').insert([payload])
        if (error) throw error
        toast({ title: 'Fornecedor cadastrado' })
      }
      onSave()
      onOpenChange(false)
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' })
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[90vw] sm:max-w-[600px] overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>{fornecedor ? 'Editar Fornecedor' : 'Novo Fornecedor'}</SheetTitle>
          <SheetDescription>Preencha os dados do fornecedor abaixo.</SheetDescription>
        </SheetHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1 space-y-2 relative">
              <Label>CNPJ</Label>
              <Input
                {...form.register('cnpj')}
                onChange={(e) =>
                  form.setValue('cnpj', maskCnpj(e.target.value), { shouldValidate: true })
                }
                maxLength={18}
                placeholder="00.000.000/0001-00"
              />
              {isFetching && (
                <Loader2 className="absolute right-3 top-8 h-4 w-4 animate-spin text-gray-400" />
              )}
              {form.formState.errors.cnpj && (
                <p className="text-xs text-red-500">{form.formState.errors.cnpj.message}</p>
              )}
            </div>
            <div className="col-span-2 sm:col-span-1 space-y-2">
              <Label>Inscrição Estadual</Label>
              <Input {...form.register('inscricao_estadual')} />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Razão Social</Label>
              <Input {...form.register('razao_social')} />
              {form.formState.errors.razao_social && (
                <p className="text-xs text-red-500">{form.formState.errors.razao_social.message}</p>
              )}
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Nome Fantasia</Label>
              <Input {...form.register('nome_fantasia')} />
            </div>
            <div className="col-span-2 sm:col-span-1 space-y-2">
              <Label>E-mail</Label>
              <Input type="email" {...form.register('email')} />
              {form.formState.errors.email && (
                <p className="text-xs text-red-500">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div className="col-span-2 sm:col-span-1 space-y-2">
              <Label>Telefone</Label>
              <Input
                {...form.register('telefone')}
                onChange={(e) =>
                  form.setValue('telefone', maskPhone(e.target.value), { shouldValidate: true })
                }
                maxLength={15}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="col-span-2 sm:col-span-1 space-y-2">
              <Label>Data de Abertura</Label>
              <Input type="date" {...form.register('data_abertura')} />
            </div>
            <div className="col-span-2 pt-4 pb-2">
              <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Endereço</h3>
            </div>
            <div className="col-span-2 sm:col-span-1 space-y-2">
              <Label>CEP</Label>
              <Input
                {...form.register('cep')}
                onChange={(e) =>
                  form.setValue('cep', maskCep(e.target.value), { shouldValidate: true })
                }
                maxLength={9}
                placeholder="00000-000"
              />
            </div>
            <div className="col-span-2 sm:col-span-1 space-y-2">
              <Label>Rua / Logradouro</Label>
              <Input {...form.register('logradouro')} />
            </div>
            <div className="col-span-2 sm:col-span-1 space-y-2">
              <Label>Número</Label>
              <Input {...form.register('numero')} />
            </div>
            <div className="col-span-2 sm:col-span-1 space-y-2">
              <Label>Complemento</Label>
              <Input {...form.register('complemento')} />
            </div>
            <div className="col-span-2 sm:col-span-1 space-y-2">
              <Label>Bairro</Label>
              <Input {...form.register('bairro')} />
            </div>
            <div className="col-span-2 sm:col-span-1 space-y-2">
              <Label>Cidade</Label>
              <Input {...form.register('municipio')} />
            </div>
            <div className="col-span-2 sm:col-span-1 space-y-2">
              <Label>Estado (UF)</Label>
              <Input {...form.register('estado')} maxLength={2} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-6">
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {fornecedor ? 'Salvar Alterações' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
