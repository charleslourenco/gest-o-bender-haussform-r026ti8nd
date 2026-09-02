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
import { Check, ChevronsUpDown, Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMontadorAllocation } from '@/hooks/use-montador-allocation'
import { AllocationConfirmDialog } from './AllocationConfirmDialog'

export function MontadorSelect({
  item,
  montadores,
  onUpdate,
}: {
  item: any
  montadores: any[]
  onUpdate: () => void
}) {
  const alocacoesCard: string[] = Array.isArray(item?.alocacao_montagem)
    ? item.alocacao_montagem.map((a: any) => a?.montador_id).filter(Boolean)
    : Array.isArray(item?.montador_ids)
      ? item.montador_ids.filter(Boolean)
      : []

  const { pending, clearPending, toggleMontador, resolveChoice } = useMontadorAllocation(onUpdate)

  if (!item?.id) return null

  const handleSelect = (montadorId: string) => {
    if (typeof item?.onToggleMontador === 'function') {
      item.onToggleMontador(montadorId)
      return
    }
    const montador = montadores.find((m) => m?.id === montadorId)
    if (!montador) return
    const isChecked = alocacoesCard.includes(montadorId)
    toggleMontador(montador, item.id, item?.cliente_id ?? null, isChecked)
  }

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className="h-8 text-[11px] border-steel-blue/20 bg-emerald-500/20 text-emerald-900 hover:bg-emerald-500/30 hover:text-emerald-900 dark:bg-emerald-500/10 dark:text-white dark:hover:bg-emerald-500/20 dark:hover:text-white w-full justify-between focus:ring-0 focus:ring-offset-0 px-2"
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
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0 z-50 bg-popover text-popover-foreground border border-border">
          <Command>
            <CommandInput placeholder="Buscar montador..." className="text-xs h-8" />
            <CommandList>
              <CommandEmpty className="text-xs p-2 text-center text-muted-foreground">
                Nenhum encontrado.
              </CommandEmpty>
              <CommandGroup>
                {(montadores || []).map((m) => {
                  if (!m?.id) return null
                  const isChecked = alocacoesCard.includes(m.id)
                  const isBusyWithOtherClient =
                    !isChecked &&
                    Array.isArray(m?.alocacao_montagem) &&
                    m.alocacao_montagem.some(
                      (a: any) => a?.produtos_servicos_projeto?.cliente_id !== item?.cliente_id,
                    )
                  return (
                    <CommandItem
                      key={m.id}
                      value={m.nome_completo || ''}
                      onSelect={() => handleSelect(m.id)}
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

      <AllocationConfirmDialog
        open={!!pending}
        onOpenChange={(o) => !o && clearPending()}
        montadorNome={pending?.montador.nome_completo ?? null}
        prevCardsCount={pending?.prevCards.length ?? 0}
        onChoose={(choice) => resolveChoice(choice, item.id)}
      />
    </>
  )
}
