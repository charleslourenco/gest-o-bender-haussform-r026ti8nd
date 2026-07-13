import { useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { deleteCliente } from '@/services/cliente-delete'

interface ClienteDeleteDialogProps {
  clienteId: string
  clienteNome?: string
  onDeleted: () => void
  triggerClassName?: string
  triggerVariant?: 'icon' | 'button'
}

export function ClienteDeleteDialog({
  clienteId,
  clienteNome,
  onDeleted,
  triggerClassName,
  triggerVariant = 'icon',
}: ClienteDeleteDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    setLoading(true)
    const { error } = await deleteCliente(clienteId)
    setLoading(false)
    if (error) {
      const { toast } = await import('@/hooks/use-toast')
      toast({
        title: 'Erro ao excluir cliente',
        description: 'Verifique se existem dependências pendentes.',
        variant: 'destructive',
      })
      setOpen(false)
      return
    }
    const { toast } = await import('@/hooks/use-toast')
    toast({ title: 'Cliente excluído com sucesso.' })
    setOpen(false)
    onDeleted()
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {triggerVariant === 'icon' ? (
          <button type="button" className={triggerClassName} title="Excluir cliente">
            <Trash2 className="w-4 h-4" />
          </button>
        ) : (
          <button type="button" className={triggerClassName}>
            <Trash2 className="w-4 h-4" />
            <span>Excluir Cliente</span>
          </button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Cliente</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir este cliente{clienteNome ? ` (${clienteNome})` : ''}?
            Esta ação é irreversível e removerá todos os dados vinculados (contratos, pagamentos,
            documentos e históricos).
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleConfirm()
            }}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Excluindo...
              </>
            ) : (
              'Excluir'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
