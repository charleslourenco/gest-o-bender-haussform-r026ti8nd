import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export function OutsourcedCheckModal({ onClose, onConfirm }: any) {
  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-card border-border text-card-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-500">
            <AlertTriangle className="w-5 h-5" />
            Verificação de Item Terceirizado
          </DialogTitle>
          <DialogDescription className="pt-2 text-muted-foreground">
            Este ambiente possui itens terceirizados? Verifique o caderno técnico ou lista de
            materiais para confirmar se há necessidade de criar cards para serviços terceirizados
            (ex: vidraçaria, serralheria).
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex gap-3 mt-4 sm:justify-between border-t border-border pt-4">
          <Button
            variant="outline"
            className="w-full sm:w-auto bg-transparent border-input text-foreground hover:bg-muted/50 hover:text-foreground"
            onClick={() => onConfirm(false)}
          >
            Não possui
          </Button>
          <Button
            className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-white border-none"
            onClick={() => onConfirm(true)}
          >
            Sim, criar card avulso
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
