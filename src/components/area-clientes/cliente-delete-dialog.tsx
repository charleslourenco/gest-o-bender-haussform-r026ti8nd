import { useState } from 'react'
import { Loader2, Trash2, AlertTriangle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

const DEPENDENT_DATA_ITEMS = [
  'Contratos e dossiês (PDFs gerados)',
  'Documentos assinados e envelopes de assinatura',
  'Pagamentos e contas a receber',
  'Itens de projeto (produtos e serviços)',
  'Acompanhamentos e respectivos históricos',
  'Caixas virtuais e itens de estoque do cliente',
  'Solicitações de compra vinculadas',
  'Eventos da timeline do cliente',
  'Mensagens e sessões do WhatsApp (se aplicável)',
]

export function ClienteDeleteDialog({
  clienteId,
  clienteNome,
  onDeleted,
  triggerClassName,
  triggerVariant = 'icon',
}: ClienteDeleteDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [confirmText, setConfirmText] = useState('')

  const expectedName = (clienteNome || '').trim()
  const canDelete = expectedName.length > 0 && confirmText.trim() === expectedName

  const reset = () => {
    setConfirmText('')
    setLoading(false)
  }

  const handleConfirm = async () => {
    if (!canDelete) return
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
      reset()
      return
    }
    const { toast } = await import('@/hooks/use-toast')
    toast({ title: 'Cliente excluído com sucesso.' })
    setOpen(false)
    reset()
    onDeleted()
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reset()
      }}
    >
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
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Excluir Cliente
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                Tem certeza que deseja excluir este cliente
                {clienteNome ? ` (${clienteNome})` : ''}? Esta ação é{' '}
                <span className="font-semibold text-destructive">irreversível</span> e removerá
                permanentemente todos os dados vinculados abaixo:
              </p>
              <ul className="list-disc pl-5 space-y-1 rounded-md border border-destructive/30 bg-destructive/5 p-3">
                {DEPENDENT_DATA_ITEMS.map((item) => (
                  <li key={item} className="text-foreground/80">
                    {item}
                  </li>
                ))}
              </ul>
              <p className="text-foreground">
                Para confirmar, digite o nome do cliente exatamente como exibido:
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Label
            htmlFor="cliente-confirm-name"
            className="text-xs font-medium text-muted-foreground"
          >
            Digite o nome do cliente para confirmar
          </Label>
          <Input
            id="cliente-confirm-name"
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={expectedName || 'Nome do cliente'}
            autoComplete="off"
            disabled={loading}
            className="bg-background"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleConfirm()
            }}
            disabled={!canDelete || loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Excluindo...
              </>
            ) : (
              'Confirmar Exclusão'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
