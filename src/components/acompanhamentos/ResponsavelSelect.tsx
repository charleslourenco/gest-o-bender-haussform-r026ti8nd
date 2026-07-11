import { useState, useEffect } from 'react'
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
import { Check, ChevronsUpDown, UserCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface ResponsavelRow {
  id: string
  nome: string
  status: string | null
}

export function ResponsavelSelect({
  acompanhamentoId,
  responsavelId,
  responsavelNome,
  onUpdate,
  variant = 'card',
}: {
  acompanhamentoId: string
  responsavelId: string | null
  responsavelNome: string | null
  onUpdate: () => void
  variant?: 'card' | 'inline'
}) {
  const [open, setOpen] = useState(false)
  const [responsaveis, setResponsaveis] = useState<ResponsavelRow[]>([])

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('responsaveis_acompanhamentos')
        .select('id, nome, status')
        .order('nome')
      if (data) setResponsaveis(data as ResponsavelRow[])
    }
    load()
  }, [])

  const handleSelect = async (id: string | null) => {
    setOpen(false)
    if (id === responsavelId) return

    const { error } = await supabase
      .from('acompanhamentos')
      .update({ responsavel_id: id })
      .eq('id', acompanhamentoId)

    if (error) {
      toast.error('Erro ao atualizar responsável: ' + (error.message || 'desconhecido'))
      return
    }

    toast.success(id ? 'Responsável atribuído com sucesso' : 'Responsável removido')
    onUpdate()
  }

  const safeNome = responsavelNome && responsavelNome.trim() ? responsavelNome : null
  const displayNome = safeNome || 'Sem responsável'
  const hasResponsavel = !!responsavelId

  const triggerClass =
    variant === 'card'
      ? 'h-7 text-[11px] w-full justify-between px-2 bg-muted/50 hover:bg-muted border-transparent focus:ring-0 focus:ring-offset-0'
      : 'h-8 text-xs w-full justify-between px-2 focus:ring-0 focus:ring-offset-0'

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            triggerClass,
            hasResponsavel ? 'text-emerald-700 dark:text-emerald-300' : 'text-muted-foreground',
          )}
        >
          <span className="flex items-center gap-1.5 truncate min-w-0">
            <UserCircle className="w-3 h-3 shrink-0" />
            <span className="truncate">{displayNome}</span>
          </span>
          <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0 z-50 bg-popover text-popover-foreground border border-border"
        align="start"
      >
        <Command>
          <CommandInput placeholder="Buscar responsável..." className="text-xs h-8" />
          <CommandList>
            <CommandEmpty className="text-xs p-2 text-center text-muted-foreground">
              Nenhum encontrado.
            </CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__none__"
                onSelect={() => handleSelect(null)}
                className="text-xs cursor-pointer py-1.5"
              >
                <div
                  className={cn(
                    'mr-2 flex h-3.5 w-3.5 items-center justify-center rounded-sm border shrink-0',
                    !hasResponsavel ? 'bg-primary border-primary' : 'border-border',
                  )}
                >
                  <Check
                    className={cn(
                      'h-2.5 w-2.5 text-primary-foreground',
                      !hasResponsavel ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                </div>
                <span className="flex-1 truncate text-muted-foreground">Sem responsável</span>
              </CommandItem>
              {responsaveis.map((r) => {
                const isChecked = r.id === responsavelId
                const isBusy = r.status === 'Alocado' && !isChecked
                return (
                  <CommandItem
                    key={r.id}
                    value={r.nome}
                    onSelect={() => handleSelect(r.id)}
                    className="text-xs cursor-pointer py-1.5"
                  >
                    <div
                      className={cn(
                        'mr-2 flex h-3.5 w-3.5 items-center justify-center rounded-sm border shrink-0',
                        isChecked ? 'bg-primary border-primary' : 'border-border',
                      )}
                    >
                      <Check
                        className={cn(
                          'h-2.5 w-2.5 text-primary-foreground',
                          isChecked ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                    </div>
                    <span className="flex-1 truncate">{r.nome}</span>
                    {isBusy && (
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
  )
}
