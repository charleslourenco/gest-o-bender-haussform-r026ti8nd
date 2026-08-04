import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

export type AllocationChoice = 'cancel' | 'swap' | 'both'

export function AllocationConfirmDialog({
  open,
  onOpenChange,
  montadorNome,
  prevCardsCount,
  onChoose,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  montadorNome: string | null
  prevCardsCount: number
  onChoose: (choice: AllocationChoice) => void
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-card text-card-foreground border-border z-[60] sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Montador já alocado</AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            O montador <strong>{montadorNome}</strong> já está alocado em{' '}
            <strong>{prevCardsCount}</strong> card(s). Como deseja prosseguir com a nova alocação?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-2 mt-4">
          <Button
            type="button"
            variant="outline"
            className="w-full bg-transparent border-border text-foreground hover:bg-muted hover:text-foreground justify-start"
            onClick={() => onChoose('cancel')}
          >
            Manter na mesma alocação
          </Button>
          <Button
            type="button"
            className="w-full bg-amber-500 text-white hover:bg-amber-600 justify-start"
            onClick={() => onChoose('swap')}
          >
            Trocar alocação
          </Button>
          <Button
            type="button"
            className="w-full bg-emerald-500 text-white hover:bg-emerald-600 justify-start"
            onClick={() => onChoose('both')}
          >
            Manter o montador alocado nas duas montagens
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
