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
  'Planejamento e Programação de Operações',
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border border-border shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-foreground">
            {user ? 'Editar Usuário' : 'Novo Usuário'}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="dados" className="mt-2">
          <TabsList className="bg-muted/60 mb-4 h-8 p-0.5 rounded-md">
            <TabsTrigger
              value="dados"
              className="h-7 px-3 text-xs font-medium rounded-sm data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            >
              Dados Pessoais
            </TabsTrigger>
            <TabsTrigger
              value="permissoes"
              className="h-7 px-3 text-xs font-medium rounded-sm data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            >
              Permissões
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dados" className="space-y-4 m-0 focus:outline-none">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground">Nome Completo</Label>
                <Input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="h-9 text-xs bg-background border-border"
                  placeholder="Ex: João da Silva"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground">Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!!user}
                  className="h-9 text-xs bg-background border-border disabled:opacity-60"
                  placeholder="joao@bender.com"
                />
              </div>
              {!user && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground">Senha Inicial</Label>
                  <Input
                    type="password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className="h-9 text-xs bg-background border-border"
                    placeholder="Mínimo 8 caracteres"
                  />
                </div>
              )}
              {user && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-foreground">
                    Nova Senha (Opcional)
                  </Label>
                  <Input
                    type="password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className="h-9 text-xs bg-background border-border"
                    placeholder="Deixe em branco para não alterar"
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground">Telefone</Label>
                <Input
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  className="h-9 text-xs bg-background border-border"
                  placeholder="(47) 90000-0000"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground">Função/Cargo</Label>
                <Select value={funcao} onValueChange={setFuncao}>
                  <SelectTrigger className="h-9 text-xs bg-background border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="Consultor" className="text-xs">
                      Consultor Comercial
                    </SelectItem>
                    <SelectItem value="Analista" className="text-xs">
                      Analista Técnico
                    </SelectItem>
                    <SelectItem value="Gerente" className="text-xs">
                      Gerente
                    </SelectItem>
                    <SelectItem value="Admin" className="text-xs">
                      Administrador
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center space-x-3 mt-4 p-3 border border-border rounded-lg bg-muted/20">
              <Switch
                checked={status}
                onCheckedChange={setStatus}
                className="data-[state=checked]:bg-emerald-600"
              />
              <div>
                <Label className="text-xs font-semibold text-foreground cursor-pointer">
                  Usuário Ativo
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Permite que o usuário faça login no sistema.
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="permissoes" className="space-y-4 m-0 focus:outline-none">
            <div className="bg-muted/40 p-3 rounded-lg border border-border">
              <p className="text-xs text-muted-foreground">
                Defina o nível de acesso para cada módulo. <strong>Admin</strong> possui acesso
                total de edição e exclusão. <strong>Editor</strong> pode modificar registros.{' '}
                <strong>Leitor</strong> apenas visualiza.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
              {MODULES.map((mod) => (
                <div key={mod} className="flex flex-col space-y-1 pb-2.5 border-b border-border">
                  <Label className="text-xs font-medium text-foreground">{mod}</Label>
                  <Select
                    value={permissions[mod] || 'Sem Acesso'}
                    onValueChange={(val) => setPermissions((p) => ({ ...p, [mod]: val }))}
                  >
                    <SelectTrigger className="h-8 text-xs bg-background border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="Sem Acesso" className="text-xs">
                        Sem Acesso
                      </SelectItem>
                      <SelectItem value="Leitor" className="text-xs">
                        Leitor
                      </SelectItem>
                      <SelectItem value="Editor" className="text-xs">
                        Editor
                      </SelectItem>
                      <SelectItem value="Admin" className="text-xs">
                        Admin
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end mt-4 gap-2 pt-4 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-8 text-xs border-border"
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={loading}
            className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground min-w-[100px]"
          >
            {loading ? 'Salvando...' : 'Salvar Usuário'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
