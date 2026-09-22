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
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const MODULES = [
  'Dashboard',
  'Comercial',
  'Clientes',
  'Planejamento e Programação de Operações',
  'Financeiro',
  'Usuários',
  'Administrativo',
]
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

      toast({
        title: 'Permissões salvas com sucesso!',
      })

      onSuccess()
      onClose()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar permissões',
        description: err.message,
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] bg-card border border-border shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-foreground text-lg font-bold">
            Definir Permissões
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="py-2">
            <div className="rounded-lg border border-border overflow-hidden shadow-xs hidden sm:block">
              <Table className="bg-card">
                <TableHeader className="bg-muted/50">
                  <TableRow className="border-b border-border">
                    <TableHead className="text-foreground font-semibold py-2.5 px-3 text-xs">
                      Módulo
                    </TableHead>
                    {LEVELS.map((level) => (
                      <TableHead
                        key={level}
                        className="text-center text-foreground font-semibold py-2.5 px-3 text-xs"
                      >
                        {level}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MODULES.map((mod, idx) => (
                    <TableRow
                      key={mod}
                      className={cn(
                        'border-b border-border hover:bg-muted/30 transition-colors',
                        idx % 2 === 0 ? 'bg-card' : 'bg-muted/15',
                      )}
                    >
                      <TableCell className="font-medium text-foreground py-2 px-3 text-xs">
                        {mod}
                      </TableCell>
                      {LEVELS.map((level) => (
                        <TableCell key={level} className="text-center py-2 px-3">
                          <input
                            type="radio"
                            name={`perm-${mod}`}
                            value={level}
                            checked={(perms[mod] || 'Sem Acesso') === level}
                            onChange={() => setPerms({ ...perms, [mod]: level })}
                            disabled={isSuperAdmin}
                            className="w-4 h-4 text-primary border-border focus:ring-primary cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="sm:hidden flex flex-col gap-2.5">
              {MODULES.map((mod, idx) => (
                <div
                  key={mod}
                  className={cn(
                    'flex flex-col gap-2 p-3 rounded-lg border border-border shadow-xs',
                    idx % 2 === 0 ? 'bg-card' : 'bg-muted/15',
                  )}
                >
                  <h4 className="font-semibold text-foreground text-sm">{mod}</h4>
                  <div className="flex flex-col gap-1.5 mt-1">
                    {LEVELS.map((level) => (
                      <label
                        key={level}
                        className={cn(
                          'flex items-center gap-2.5 p-2 rounded-md border cursor-pointer transition-colors text-xs',
                          (perms[mod] || 'Sem Acesso') === level
                            ? 'bg-muted/70 border-primary font-medium'
                            : 'bg-card border-border',
                          isSuperAdmin && 'opacity-60 cursor-not-allowed',
                        )}
                      >
                        <input
                          type="radio"
                          name={`perm-mobile-${mod}`}
                          value={level}
                          checked={(perms[mod] || 'Sem Acesso') === level}
                          onChange={() => setPerms({ ...perms, [mod]: level })}
                          disabled={isSuperAdmin}
                          className="w-4 h-4 text-primary border-border focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <span className="text-foreground">{level}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {isSuperAdmin && (
              <p className="text-xs text-muted-foreground mt-4 text-center bg-muted/40 p-3 rounded-md border border-border">
                O Super Admin possui nível máximo inalterável em todos os módulos.
              </p>
            )}
          </div>
        )}

        <DialogFooter className="mt-3 pt-3 border-t border-border gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSaving}
            className="h-8 text-xs border-border"
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isSaving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
            Salvar Permissões
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
