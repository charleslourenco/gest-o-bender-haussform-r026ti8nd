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
      <DialogContent className="sm:max-w-md bg-[#1A3D63] border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-500">
            <AlertTriangle className="w-5 h-5" />
            Verificação de Item Terceirizado
          </DialogTitle>
          <DialogDescription className="pt-2 text-slate-300">
            Este ambiente possui itens terceirizados? Verifique o caderno técnico ou lista de
            materiais para confirmar se há necessidade de criar cards para serviços terceirizados
            (ex: vidraçaria, serralheria).
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex gap-3 mt-4 sm:justify-between border-t border-slate-700 pt-4">
          <Button
            variant="outline"
            className="w-full sm:w-auto bg-transparent border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white"
            onClick={() => onConfirm(false)}
          >
            Não possui
          </Button>
          <Button
            className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white border-none"
            onClick={() => onConfirm(true)}
          >
            Sim, criar card avulso
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
