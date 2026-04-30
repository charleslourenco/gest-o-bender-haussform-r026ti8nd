import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { AppUser } from '@/types/user'
import { supabase } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

const formSchema = z.object({
  nome: z.string().min(3, 'Mínimo de 3 caracteres'),
  email: z.string().email('E-mail inválido'),
  telefone: z.string().min(14, 'Telefone inválido'),
  funcao: z.string().min(1, 'Selecione uma função'),
  status: z.boolean(),
})

interface UserFormModalProps {
  isOpen: boolean
  onClose: () => void
  user: AppUser | null
  onSuccess: (user: AppUser, isNew: boolean) => void
}

const formatPhone = (val: string) => {
  const v = val.replace(/\D/g, '')
  if (v.length <= 10) {
    return v.replace(/(\d{2})(\d{0,4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '')
  }
  return v.replace(/(\d{2})(\d{0,5})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '')
}

export function UserFormModal({ isOpen, onClose, user, onSuccess }: UserFormModalProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: '',
      email: '',
      telefone: '',
      funcao: '',
      status: true,
    },
  })

  useEffect(() => {
    if (user) {
      form.reset({
        nome: user.nome || '',
        email: user.email || '',
        telefone: user.telefone || '',
        funcao: user.funcao || '',
        status: user.status ?? true,
      })
    } else {
      form.reset({
        nome: '',
        email: '',
        telefone: '',
        funcao: '',
        status: true,
      })
    }
  }, [user, form, isOpen])

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true)
    try {
      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: {
          action: user ? 'update' : 'create',
          userId: user?.id,
          userData: values,
        },
      })
      if (error) throw error

      toast({
        title: user ? 'Usuário atualizado com sucesso!' : 'Usuário criado com sucesso!',
      })

      const savedUser = user || { id: data.user.id, ...values }
      onSuccess(savedUser as AppUser, !user)
      onClose()
    } catch (err: any) {
      const isAlreadyRegistered =
        err.message?.includes('already registered') || err.message?.includes('já existe')
      toast({
        title: 'Erro ao salvar usuário',
        description: isAlreadyRegistered ? 'Este e-mail já está cadastrado.' : err.message,
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{user ? 'Editar Usuário' : 'Adicionar Usuário'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo</FormLabel>
                  <FormControl>
                    <Input placeholder="João da Silva" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail</FormLabel>
                  <FormControl>
                    <Input placeholder="joao@exemplo.com" {...field} disabled={!!user} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="telefone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="(00) 00000-0000"
                        {...field}
                        onChange={(e) => field.onChange(formatPhone(e.target.value))}
                        maxLength={15}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="funcao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Função</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Consultor">Consultor</SelectItem>
                        <SelectItem value="Analista">Analista</SelectItem>
                        <SelectItem value="Gerente">Gerente</SelectItem>
                        <SelectItem value="Admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormItem>
              <FormLabel>Foto de Perfil (Opcional)</FormLabel>
              <FormControl>
                <Input
                  type="file"
                  accept="image/jpeg, image/png"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file && file.size > 5 * 1024 * 1024) {
                      toast({
                        title: 'Erro',
                        description: 'Arquivo muito grande. Máximo 5MB.',
                        variant: 'destructive',
                      })
                      e.target.value = ''
                    }
                  }}
                />
              </FormControl>
            </FormItem>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Status do Usuário</FormLabel>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting || !form.formState.isValid}>
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Salvar
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
