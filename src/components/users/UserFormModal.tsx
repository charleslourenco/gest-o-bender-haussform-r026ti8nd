import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { supabase } from '@/lib/supabase/client'
import { AppUser } from '@/types/user'
import { useToast } from '@/hooks/use-toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface UserFormModalProps {
  isOpen: boolean
  onClose: () => void
  user: AppUser | null
  onSuccess: (user: AppUser, isNew: boolean) => void
}

const MODULES = [
  'Dashboard',
  'Comercial',
  'Criar Orçamento',
  'Clientes',
  'Análise Técnica',
  'Produção',
  'Criar Lista de Materiais',
  'Montagem',
  'Estoque & Compras',
  'Financeiro',
  'Gestão de Pessoas',
  'Usuários',
  'Administrativo',
]

export function UserFormModal({ isOpen, onClose, user, onSuccess }: UserFormModalProps) {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [telefone, setTelefone] = useState('')
  const [funcao, setFuncao] = useState('Consultor')
  const [status, setStatus] = useState(true)
  const [loading, setLoading] = useState(false)
  const [permissions, setPermissions] = useState<Record<string, string>>({})
  const { toast } = useToast()

  useEffect(() => {
    if (isOpen) {
      if (user) {
        setNome(user.nome)
        setEmail(user.email)
        setSenha('')
        setTelefone(user.telefone || '')
        setFuncao(user.funcao || 'Consultor')
        setStatus(user.status)
        fetchPermissions(user.id)
      } else {
        setNome('')
        setEmail('')
        setSenha('')
        setTelefone('')
        setFuncao('Consultor')
        setStatus(true)
        const initialPerms: Record<string, string> = {}
        MODULES.forEach((m) => {
          initialPerms[m] = 'Sem Acesso'
        })
        setPermissions(initialPerms)
      }
    }
  }, [isOpen, user])

  const fetchPermissions = async (userId: string) => {
    const { data } = await supabase.from('matriz_permissoes').select('*').eq('usuario_id', userId)
    const perms: Record<string, string> = {}
    MODULES.forEach((m) => {
      perms[m] = 'Sem Acesso'
    })
    if (data) {
      data.forEach((p) => {
        if (MODULES.includes(p.modulo)) {
          perms[p.modulo] = p.nivel_acesso
        }
      })
    }
    setPermissions(perms)
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const userData = { nome, email, senha, telefone, funcao, status }
      const permissionsData = Object.entries(permissions)
        .filter(([_, level]) => level !== 'Sem Acesso')
        .map(([mod, level]) => ({ modulo: mod, nivel_acesso: level }))

      const { data, error } = await supabase.functions.invoke('admin-users', {
        body: {
          action: user ? 'update' : 'create',
          userId: user?.id,
          userData,
          permissionsData: user ? null : permissionsData,
        },
      })
      if (error) throw error

      let createdUserId = user?.id
      if (!user && data?.user) {
        createdUserId = data.user.id
        if (permissionsData.length > 0) {
          const { error: permErr } = await supabase.functions.invoke('admin-users', {
            body: { action: 'update_permissions', userId: createdUserId, permissionsData },
          })
          if (permErr) throw permErr
        }
      } else if (user) {
        const { error: permErr } = await supabase.functions.invoke('admin-users', {
          body: { action: 'update_permissions', userId: createdUserId, permissionsData },
        })
        if (permErr) throw permErr
      }

      toast({
        title: user ? 'Usuário atualizado com sucesso!' : 'Usuário criado com sucesso!',
        className: 'bg-dark-denim text-off-white',
      })
      onSuccess(
        {
          id: createdUserId!,
          email,
          nome,
          telefone,
          funcao,
          status,
          criado_em: '',
          atualizado_em: '',
          foto_perfil: null,
        },
        !user,
      )
    } catch (error: any) {
      toast({ title: 'Erro ao salvar usuário', description: error.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-off-white border-none shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-midnight-navy">
            {user ? 'Editar Usuário' : 'Novo Usuário'}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="dados" className="mt-4">
          <TabsList className="bg-pale-cornflower/30 border border-steel-blue/20 mb-6 w-full justify-start p-1 h-auto">
            <TabsTrigger
              value="dados"
              className="data-[state=active]:bg-midnight-navy data-[state=active]:text-off-white"
            >
              Dados Pessoais
            </TabsTrigger>
            <TabsTrigger
              value="permissoes"
              className="data-[state=active]:bg-midnight-navy data-[state=active]:text-off-white"
            >
              Permissões
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dados" className="space-y-6 m-0 focus:outline-none">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-midnight-navy font-semibold">Nome Completo</Label>
                <Input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="bg-white border-steel-blue/40 focus-visible:ring-dark-denim"
                  placeholder="Ex: João da Silva"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-midnight-navy font-semibold">Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!!user}
                  className="bg-white border-steel-blue/40 focus-visible:ring-dark-denim disabled:opacity-60"
                  placeholder="joao@bender.com"
                />
              </div>
              {!user && (
                <div className="space-y-2">
                  <Label className="text-midnight-navy font-semibold">Senha Inicial</Label>
                  <Input
                    type="password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className="bg-white border-steel-blue/40 focus-visible:ring-dark-denim"
                    placeholder="Mínimo 8 caracteres"
                  />
                </div>
              )}
              {user && (
                <div className="space-y-2">
                  <Label className="text-midnight-navy font-semibold">Nova Senha (Opcional)</Label>
                  <Input
                    type="password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className="bg-white border-steel-blue/40 focus-visible:ring-dark-denim"
                    placeholder="Deixe em branco para não alterar"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-midnight-navy font-semibold">Telefone</Label>
                <Input
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  className="bg-white border-steel-blue/40 focus-visible:ring-dark-denim"
                  placeholder="(47) 90000-0000"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-midnight-navy font-semibold">Função/Cargo</Label>
                <Select value={funcao} onValueChange={setFuncao}>
                  <SelectTrigger className="bg-white border-steel-blue/40 focus:ring-0 focus:border-dark-denim focus:border-2 transition-all h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-off-white border-steel-blue">
                    <SelectItem value="Consultor" className="focus:bg-pale-cornflower">
                      Consultor Comercial
                    </SelectItem>
                    <SelectItem value="Analista" className="focus:bg-pale-cornflower">
                      Analista Técnico
                    </SelectItem>
                    <SelectItem value="Gerente" className="focus:bg-pale-cornflower">
                      Gerente
                    </SelectItem>
                    <SelectItem value="Admin" className="focus:bg-pale-cornflower">
                      Administrador
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center space-x-3 mt-6 p-4 border border-steel-blue/20 rounded-lg bg-white">
              <Switch
                checked={status}
                onCheckedChange={setStatus}
                className="data-[state=checked]:bg-emerald-500"
              />
              <div>
                <Label className="text-midnight-navy font-semibold text-base cursor-pointer">
                  Usuário Ativo
                </Label>
                <p className="text-sm text-midnight-navy/60">
                  Permite que o usuário faça login no sistema.
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="permissoes" className="space-y-6 m-0 focus:outline-none">
            <div className="bg-pale-cornflower/20 p-4 rounded-lg mb-4 border border-steel-blue/10">
              <p className="text-sm text-midnight-navy/80">
                Defina o nível de acesso para cada módulo. <strong>Admin</strong> possui acesso
                total de edição e exclusão. <strong>Editor</strong> pode modificar registros.{' '}
                <strong>Leitor</strong> apenas visualiza.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              {MODULES.map((mod) => (
                <div
                  key={mod}
                  className="flex flex-col space-y-1.5 pb-3 border-b border-steel-blue/10"
                >
                  <Label className="text-midnight-navy font-medium">{mod}</Label>
                  <Select
                    value={permissions[mod] || 'Sem Acesso'}
                    onValueChange={(val) => setPermissions((p) => ({ ...p, [mod]: val }))}
                  >
                    <SelectTrigger className="bg-white border-steel-blue/30 h-10 focus:ring-0 focus:border-dark-denim focus:border-2 transition-all">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-off-white border-steel-blue">
                      <SelectItem value="Sem Acesso" className="focus:bg-pale-cornflower">
                        Sem Acesso
                      </SelectItem>
                      <SelectItem value="Leitor" className="focus:bg-pale-cornflower">
                        Leitor
                      </SelectItem>
                      <SelectItem value="Editor" className="focus:bg-pale-cornflower">
                        Editor
                      </SelectItem>
                      <SelectItem value="Admin" className="focus:bg-pale-cornflower">
                        Admin
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end mt-8 gap-3 pt-6 border-t border-steel-blue/20">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-steel-blue text-steel-blue hover:bg-pale-cornflower"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-dark-denim text-off-white hover:bg-midnight-navy hover:opacity-90 min-w-[120px]"
          >
            {loading ? 'Salvando...' : 'Salvar Usuário'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
