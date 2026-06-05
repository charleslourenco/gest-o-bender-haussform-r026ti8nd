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
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            Este ambiente possui itens terceirizados?
          </DialogTitle>
          <DialogDescription className="pt-2 text-slate-600">
            Verifique o caderno técnico ou lista de materiais para confirmar se há necessidade de
            criar cards para serviços terceirizados (ex: vidraçaria, serralheria).
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex gap-3 mt-4 sm:justify-between">
          <Button variant="outline" className="w-full sm:w-auto" onClick={() => onConfirm(false)}>
            Não possui
          </Button>
          <Button className="w-full sm:w-auto" onClick={() => onConfirm(true)}>
            Sim, possui
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
