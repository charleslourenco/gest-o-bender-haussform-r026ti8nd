import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Check, ChevronsUpDown, Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export function MontadorSelect({
  item,
  montadores,
  onUpdate,
}: {
  item: any
  montadores: any[]
  onUpdate: () => void
}) {
  const alocacoesCard = item.alocacao_montagem?.map((a: any) => a.montador_id) || []
  const [pendingAllocation, setPendingAllocation] = useState<{
    montadorId: string
    montadorNome: string
    prevCards: any[]
  } | null>(null)

  const handleToggleMontador = async (montadorId: string, checked: boolean) => {
    if (!checked) {
      await supabase
        .from('alocacao_montagem')
        .delete()
        .match({ montador_id: montadorId, card_id: item.id })
      onUpdate()
      return
    }

    const montador = montadores.find((m) => m.id === montadorId)
    if (!montador) return

    const currentCardClientId = item.cliente_id
    const conflictingAllocations =
      montador.alocacao_montagem?.filter(
        (a: any) =>
          a.produtos_servicos_projeto?.cliente_id !== currentCardClientId && a.card_id !== item.id,
      ) || []

    if (conflictingAllocations.length > 0) {
      setPendingAllocation({
        montadorId,
        montadorNome: montador.nome_completo,
        prevCards: conflictingAllocations.map((a: any) => a.card_id),
      })
      return
    }

    await proceedAllocation(montadorId)
  }

  const proceedAllocation = async (montadorId: string) => {
    await supabase.from('alocacao_montagem').insert({
      montador_id: montadorId,
      card_id: item.id,
    })
    toast.success('Montador alocado com sucesso')
    onUpdate()
  }

  const confirmPendingAllocation = async () => {
    if (!pendingAllocation) return

    if (pendingAllocation.prevCards.length > 0) {
      await supabase
        .from('produtos_servicos_projeto')
        .update({ status_analise: 'pendencias' })
        .in('id', pendingAllocation.prevCards)
    }

    await proceedAllocation(pendingAllocation.montadorId)
    setPendingAllocation(null)
  }

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className="h-8 text-[11px] border-steel-blue/20 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 hover:text-emerald-800 w-full justify-between focus:ring-0 focus:ring-offset-0 px-2"
          >
            <div className="flex items-center gap-1.5 truncate">
              <Wrench className="w-3 h-3 shrink-0" />
              <span className="truncate">
                {alocacoesCard.length > 0
                  ? `${alocacoesCard.length} montador(es)`
                  : 'Atribuir montador...'}
              </span>
            </div>
            <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0 z-50 bg-white">
          <Command>
            <CommandInput placeholder="Buscar montador..." className="text-xs h-8" />
            <CommandList>
              <CommandEmpty className="text-xs p-2 text-center text-muted-foreground">
                Nenhum encontrado.
              </CommandEmpty>
              <CommandGroup>
                {montadores.map((m) => {
                  const isChecked = alocacoesCard.includes(m.id)
                  const isBusyWithOtherClient =
                    !isChecked &&
                    m.alocacao_montagem?.some(
                      (a: any) => a.produtos_servicos_projeto?.cliente_id !== item.cliente_id,
                    )

                  return (
                    <CommandItem
                      key={m.id}
                      value={m.nome_completo}
                      onSelect={() => handleToggleMontador(m.id, !isChecked)}
                      className="text-xs cursor-pointer py-1.5"
                    >
                      <div
                        className={cn(
                          'mr-2 flex h-3.5 w-3.5 items-center justify-center rounded-sm border shrink-0',
                          isChecked ? 'bg-emerald-500 border-emerald-500' : 'border-steel-blue/40',
                        )}
                      >
                        <Check
                          className={cn(
                            'h-2.5 w-2.5 text-white',
                            isChecked ? 'opacity-100' : 'opacity-0',
                          )}
                        />
                      </div>
                      <span className="flex-1 truncate">{m.nome_completo}</span>
                      {isBusyWithOtherClient && (
                        <span className="text-[9px] bg-orange-50 text-orange-600 border border-orange-200 px-1.5 py-0.5 rounded ml-2 whitespace-nowrap shrink-0">
                          Ocupado
                        </span>
                      )}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <AlertDialog
        open={!!pendingAllocation}
        onOpenChange={(open) => !open && setPendingAllocation(null)}
      >
        <AlertDialogContent className="z-[60] bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Autorizar Realocação?</AlertDialogTitle>
            <AlertDialogDescription>
              O montador <strong>{pendingAllocation?.montadorNome}</strong> já está alocado em outro
              cliente.
              <br />
              <br />
              Deseja autorizar a nova alocação e mover a(s) montagem(ns) anterior(es) para{' '}
              <strong>Pendências</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmPendingAllocation}
              className="bg-emerald-500 text-white hover:bg-emerald-600"
            >
              Sim, Autorizar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
