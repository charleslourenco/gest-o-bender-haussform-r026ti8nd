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

      toast({
        title: (
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-off-white" />
            <span>Permissões salvas com sucesso!</span>
          </div>
        ),
        className: 'bg-dark-denim text-off-white border-none',
      })

      onSuccess()
      onClose()
    } catch (err: any) {
      toast({
        title: (
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-off-white" />
            <span>Erro ao salvar permissões</span>
          </div>
        ),
        description: err.message,
        className: 'bg-steel-blue text-off-white border-none',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="sm:max-w-[700px] bg-off-white border-none shadow-xl"
        overlayClassName="bg-midnight-navy/50"
      >
        <DialogHeader>
          <DialogTitle className="text-midnight-navy text-[24px] font-bold">
            Definir Permissões
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-10 h-10 animate-spin text-dark-denim" />
          </div>
        ) : (
          <div className="py-2">
            <div className="rounded-xl border border-steel-blue/20 overflow-hidden shadow-sm hidden sm:block">
              <Table className="bg-off-white">
                <TableHeader className="bg-dark-denim">
                  <TableRow className="hover:bg-transparent border-b-steel-blue/20">
                    <TableHead className="text-off-white font-semibold p-4">Módulo</TableHead>
                    {LEVELS.map((level) => (
                      <TableHead
                        key={level}
                        className="text-center text-off-white font-semibold p-4"
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
                        'border-b-steel-blue/20 hover:bg-pale-cornflower/40 transition-colors',
                        idx % 2 === 0 ? 'bg-off-white' : 'bg-pale-cornflower/20',
                      )}
                    >
                      <TableCell className="font-semibold text-midnight-navy p-4">{mod}</TableCell>
                      {LEVELS.map((level) => (
                        <TableCell key={level} className="text-center p-4">
                          <input
                            type="radio"
                            name={`perm-${mod}`}
                            value={level}
                            checked={(perms[mod] || 'Sem Acesso') === level}
                            onChange={() => setPerms({ ...perms, [mod]: level })}
                            disabled={isSuperAdmin}
                            className="appearance-none w-6 h-6 rounded-full border-2 border-steel-blue checked:border-[7px] checked:border-dark-denim bg-off-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="sm:hidden flex flex-col gap-4">
              {MODULES.map((mod, idx) => (
                <div
                  key={mod}
                  className={cn(
                    'flex flex-col gap-3 p-4 rounded-xl border border-steel-blue/20 shadow-sm',
                    idx % 2 === 0 ? 'bg-off-white' : 'bg-pale-cornflower/20',
                  )}
                >
                  <h4 className="font-bold text-midnight-navy text-lg">{mod}</h4>
                  <div className="flex flex-col gap-2 mt-2">
                    {LEVELS.map((level) => (
                      <label
                        key={level}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                          (perms[mod] || 'Sem Acesso') === level
                            ? 'bg-pale-cornflower/50 border-dark-denim'
                            : 'bg-off-white border-steel-blue/30',
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
                          className="appearance-none shrink-0 w-6 h-6 rounded-full border-2 border-steel-blue checked:border-[7px] checked:border-dark-denim bg-off-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        />
                        <span className="text-midnight-navy font-medium text-base">{level}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {isSuperAdmin && (
              <p className="text-base text-midnight-navy/80 mt-6 text-center bg-pale-cornflower/50 p-4 rounded-lg font-medium border border-steel-blue/20">
                O Super Admin possui nível máximo inalterável em todos os módulos.
              </p>
            )}
          </div>
        )}

        <DialogFooter className="mt-4 pt-6 border-t border-steel-blue/20 gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
            className="bg-steel-blue text-off-white hover:bg-steel-blue hover:opacity-90 hover:text-off-white px-6 py-3 h-auto min-h-[44px] border-none rounded-lg mt-0 sm:mt-0"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="bg-dark-denim text-off-white hover:opacity-90 hover:bg-dark-denim px-6 py-3 h-auto min-h-[44px] rounded-lg"
          >
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar Permissões
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
