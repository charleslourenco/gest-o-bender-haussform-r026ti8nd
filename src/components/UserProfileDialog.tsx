import { useEffect, useState, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Camera, Loader2, Save } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'

export function UserProfileDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [fotoUrl, setFotoUrl] = useState<string | null>(null)

  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open && user) {
      setNome(user.user_metadata?.nome || '')
      setEmail(user.email || '')

      const fetchUserData = async () => {
        const { data } = await supabase.from('users').select('*').eq('id', user.id).single()
        if (data) {
          setNome(data.nome || user.user_metadata?.nome || '')
          setTelefone(data.telefone || '')
          if (data.foto_perfil) {
            const url =
              data.foto_perfil.startsWith('http') || data.foto_perfil.startsWith('data:')
                ? data.foto_perfil
                : supabase.storage.from('avatars').getPublicUrl(data.foto_perfil).data.publicUrl
            setFotoUrl(url)
          }
        }
      }
      fetchUserData()
    } else {
      setSenha('')
      setConfirmarSenha('')
    }
  }, [open, user])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !user) return
    const file = e.target.files[0]

    try {
      setUploading(true)
      const fileExt = file.name.split('.').pop()
      const filePath = `${user.id}_${Math.random()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      const { error: updateError } = await supabase
        .from('users')
        .update({ foto_perfil: filePath })
        .eq('id', user.id)

      if (updateError) throw updateError

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
      setFotoUrl(data.publicUrl)

      window.dispatchEvent(new Event('user_updated'))
      toast.success('Foto atualizada com sucesso!')
    } catch (error: any) {
      toast.error('Erro ao atualizar foto: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    if (!user) return

    if (senha && senha !== confirmarSenha) {
      toast.error('As senhas não coincidem')
      return
    }

    try {
      setLoading(true)

      const authUpdates: any = {}
      if (email && email !== user.email) authUpdates.email = email
      if (senha) authUpdates.password = senha
      if (nome && nome !== user.user_metadata?.nome) authUpdates.data = { nome }

      if (Object.keys(authUpdates).length > 0) {
        const { error: authError } = await supabase.auth.updateUser(authUpdates)
        if (authError) throw authError
      }

      const { error: dbError } = await supabase
        .from('users')
        .update({
          nome,
          telefone: telefone || null,
        })
        .eq('id', user.id)

      if (dbError) throw dbError

      toast.success('Perfil atualizado com sucesso!')

      if (authUpdates.email) {
        toast.info('Um email de confirmação foi enviado para o novo endereço.')
      }

      window.dispatchEvent(new Event('user_updated'))
      onOpenChange(false)
    } catch (error: any) {
      toast.error('Erro ao atualizar perfil: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const userInitials = nome
    ? nome.substring(0, 2).toUpperCase()
    : user?.email?.substring(0, 2).toUpperCase() || 'US'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Meu Perfil</DialogTitle>
          <DialogDescription>Atualize suas informações pessoais e senha.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Avatar className="h-24 w-24 border-2 border-border">
                {fotoUrl ? (
                  <AvatarImage src={fotoUrl} alt={nome} className="object-cover" />
                ) : (
                  <AvatarFallback className="text-2xl">{userInitials}</AvatarFallback>
                )}
              </Avatar>
              <Button
                size="icon"
                variant="secondary"
                className="absolute bottom-0 right-0 h-8 w-8 rounded-full shadow-sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
              />
            </div>
            <div className="text-center">
              <h3 className="font-medium">{nome || 'Usuário'}</h3>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="nome">Nome Completo</Label>
              <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(00) 00000-0000"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="senha">Nova Senha</Label>
                <Input
                  id="senha"
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Em branco para manter"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirmar">Confirmar Senha</Label>
                <Input
                  id="confirmar"
                  type="password"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  placeholder="Confirme a senha"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={loading || uploading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Salvar Alterações
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
