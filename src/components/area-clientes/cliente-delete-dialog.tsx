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

const PRESERVED_DATA_ITEMS = [
  'Projetos e itens de projeto (produtos e serviços)',
  'Cards nos kanbans (Comercial, PCP, Produção e Montagem)',
  'Acompanhamentos e respectivos históricos',
  'Formulário comercial e dados de venda vinculados',
  'Contratos, dossiês e documentos gerados',
  'Envelopes e assinaturas digitais',
  'Pagamentos e contas a receber',
  'Caixas virtuais e itens de estoque',
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
        title: 'Erro ao desativar cliente',
        description: 'Não foi possível ocultar o cliente. Tente novamente.',
        variant: 'destructive',
      })
      setOpen(false)
      reset()
      return
    }
    const { toast } = await import('@/hooks/use-toast')
    toast({ title: 'Cliente ocultado com sucesso.' })
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
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Ocultar / Desativar Cliente
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                Tem certeza que deseja desativar o cliente
                {clienteNome ? ` (${clienteNome})` : ''}? O cliente será ocultado da listagem do
                módulo de Clientes, mas{' '}
                <strong className="text-foreground">nenhum dado operacional será apagado</strong>.
              </p>
              <div className="rounded-md border border-border bg-muted/40 p-3 space-y-1.5">
                <p className="text-xs font-semibold text-foreground">
                  Permanecerão preservados e intactos no sistema:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-xs text-muted-foreground">
                  {PRESERVED_DATA_ITEMS.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <p className="text-xs text-muted-foreground">
                Um administrador poderá restaurar este cliente a qualquer momento através do botão{' '}
                <strong className="text-foreground">"Recuperar Cliente"</strong>.
              </p>
              <p className="text-foreground font-medium text-xs">
                Para confirmar a desativação, digite o nome do cliente exatamente como exibido:
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
                Desativando...
              </>
            ) : (
              'Confirmar Desativação'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
