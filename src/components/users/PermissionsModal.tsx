import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

const MODULES = ['Usuários', 'Administrativo', 'Comercial', 'Clientes', 'Financeiro', 'Dashboard']
const LEVELS = ['Sem Acesso', 'Leitor', 'Editor', 'Admin']

interface PermissionsModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  userEmail: string
  onSuccess: () => void
}

export function PermissionsModal({
  isOpen,
  onClose,
  userId,
  userEmail,
  onSuccess,
}: PermissionsModalProps) {
  const { toast } = useToast()
  const [perms, setPerms] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const isSuperAdmin = userEmail === 'admin@bender.com'

  useEffect(() => {
    if (isOpen && userId) {
      if (isSuperAdmin) {
        const adminPerms: Record<string, string> = {}
        MODULES.forEach((m) => (adminPerms[m] = 'Admin'))
        setPerms(adminPerms)
      } else {
        fetchPerms()
      }
    }
  }, [isOpen, userId])

  const fetchPerms = async () => {
    setIsLoading(true)
    const { data } = await supabase.from('matriz_permissoes').select('*').eq('usuario_id', userId)
    if (data) {
      const p: Record<string, string> = {}
      data.forEach((d) => {
        p[d.modulo] = d.nivel_acesso
      })
      setPerms(p)
    }
    setIsLoading(false)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const payload = MODULES.map((m) => ({ modulo: m, nivel_acesso: perms[m] || 'Sem Acesso' }))
      const { error } = await supabase.functions.invoke('admin-users', {
        body: { action: 'update_permissions', userId, permissionsData: payload },
      })
      if (error) throw error
      toast({ title: 'Permissões salvas com sucesso!' })
      onSuccess()
      onClose()
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar permissões',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Definir Permissões</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="py-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Módulo</TableHead>
                  {LEVELS.map((level) => (
                    <TableHead key={level} className="text-center">
                      {level}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {MODULES.map((mod) => (
                  <TableRow key={mod}>
                    <TableCell className="font-medium">{mod}</TableCell>
                    {LEVELS.map((level) => (
                      <TableCell key={level} className="text-center">
                        <input
                          type="radio"
                          name={`perm-${mod}`}
                          value={level}
                          checked={(perms[mod] || 'Sem Acesso') === level}
                          onChange={() => setPerms({ ...perms, [mod]: level })}
                          disabled={isSuperAdmin}
                          className="h-4 w-4 accent-primary cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {isSuperAdmin && (
              <p className="text-sm text-muted-foreground mt-4 text-center">
                O Super Admin possui nível máximo inalterável em todos os módulos.
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isLoading}>
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar Permissões
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
