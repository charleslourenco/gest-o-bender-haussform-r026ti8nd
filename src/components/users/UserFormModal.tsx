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
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'

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
        title: (
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-400" />
            <span>{user ? 'Usuário atualizado com sucesso!' : 'Usuário criado com sucesso!'}</span>
          </div>
        ),
        className: 'bg-bender-denim text-bender-offwhite border-none',
      })

      const savedUser = user || { id: data.user.id, ...values }
      onSuccess(savedUser as AppUser, !user)
      onClose()
    } catch (err: any) {
      const isAlreadyRegistered =
        err.message?.includes('already registered') || err.message?.includes('já existe')
      toast({
        title: (
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-400" />
            <span>Erro ao salvar usuário</span>
          </div>
        ),
        description: isAlreadyRegistered ? 'Este e-mail já está cadastrado.' : err.message,
        className: 'bg-bender-steel text-bender-offwhite border-none',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="sm:max-w-[500px] bg-bender-offwhite border-none shadow-xl"
        overlayClassName="bg-bender-navy/50"
      >
        <DialogHeader>
          <DialogTitle className="text-bender-navy text-[24px] font-bold">
            {user ? 'Editar Usuário' : 'Adicionar Usuário'}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-bender-navy font-semibold text-base">
                    Nome Completo
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="João da Silva"
                      className="bg-bender-pale border-2 border-bender-steel text-bender-navy text-base min-h-[44px] focus-visible:border-bender-denim focus-visible:border-[3px] focus-visible:ring-0 placeholder:text-bender-navy/60 rounded-lg"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-red-500 font-medium" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-bender-navy font-semibold text-base">E-mail</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="joao@exemplo.com"
                      className="bg-bender-pale border-2 border-bender-steel text-bender-navy text-base min-h-[44px] focus-visible:border-bender-denim focus-visible:border-[3px] focus-visible:ring-0 placeholder:text-bender-navy/60 rounded-lg disabled:opacity-70 disabled:cursor-not-allowed"
                      {...field}
                      disabled={!!user}
                    />
                  </FormControl>
                  <FormMessage className="text-red-500 font-medium" />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <FormField
                control={form.control}
                name="telefone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-bender-navy font-semibold text-base">
                      Telefone
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="(00) 00000-0000"
                        className="bg-bender-pale border-2 border-bender-steel text-bender-navy text-base min-h-[44px] focus-visible:border-bender-denim focus-visible:border-[3px] focus-visible:ring-0 placeholder:text-bender-navy/60 rounded-lg"
                        {...field}
                        onChange={(e) => field.onChange(formatPhone(e.target.value))}
                        maxLength={15}
                      />
                    </FormControl>
                    <FormMessage className="text-red-500 font-medium" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="funcao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-bender-navy font-semibold text-base">
                      Função
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-bender-pale border-2 border-bender-steel text-bender-navy text-base min-h-[44px] focus:border-bender-denim focus:border-[3px] focus:ring-0 rounded-lg">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-bender-offwhite border-2 border-bender-steel">
                        <SelectItem
                          value="Consultor"
                          className="focus:bg-bender-pale focus:text-bender-navy text-base"
                        >
                          Consultor
                        </SelectItem>
                        <SelectItem
                          value="Analista"
                          className="focus:bg-bender-pale focus:text-bender-navy text-base"
                        >
                          Analista
                        </SelectItem>
                        <SelectItem
                          value="Gerente"
                          className="focus:bg-bender-pale focus:text-bender-navy text-base"
                        >
                          Gerente
                        </SelectItem>
                        <SelectItem
                          value="Admin"
                          className="focus:bg-bender-pale focus:text-bender-navy text-base"
                        >
                          Admin
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-red-500 font-medium" />
                  </FormItem>
                )}
              />
            </div>

            <FormItem>
              <FormLabel className="text-bender-navy font-semibold text-base">
                Foto de Perfil (Opcional)
              </FormLabel>
              <FormControl>
                <Input
                  type="file"
                  accept="image/jpeg, image/png"
                  className="bg-bender-pale border-2 border-bender-steel text-bender-navy text-base min-h-[44px] focus-visible:border-bender-denim focus-visible:border-[3px] focus-visible:ring-0 file:text-bender-navy file:font-semibold rounded-lg pt-2 cursor-pointer"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file && file.size > 5 * 1024 * 1024) {
                      toast({
                        title: (
                          <div className="flex items-center gap-2">
                            <XCircle className="h-5 w-5 text-red-400" />
                            <span>Erro</span>
                          </div>
                        ),
                        description: 'Arquivo muito grande. Máximo 5MB.',
                        className: 'bg-bender-steel text-bender-offwhite border-none',
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
                <FormItem className="flex flex-row items-center justify-between rounded-lg border-2 border-bender-steel bg-bender-pale p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base text-bender-navy font-semibold">
                      Status do Usuário (Ativo)
                    </FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="data-[state=checked]:bg-bender-denim data-[state=unchecked]:bg-bender-steel shadow-sm border-2 border-transparent"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-6 border-t border-bender-steel/20 mt-6">
              <Button
                type="button"
                variant="outline"
                className="bg-bender-steel text-bender-offwhite hover:bg-bender-steel/90 hover:text-bender-offwhite px-6 py-3 h-auto min-h-[44px] border-none rounded-lg"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-bender-denim text-bender-offwhite hover:bg-bender-denim/90 px-6 py-3 h-auto min-h-[44px] rounded-lg"
                disabled={isSubmitting || !form.formState.isValid}
              >
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
