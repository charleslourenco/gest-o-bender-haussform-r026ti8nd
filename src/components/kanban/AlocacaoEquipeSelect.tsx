import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Check, ChevronsUpDown, Plus, UserPlus, Users, Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useEquipeAllocation, MembroEquipe } from '@/hooks/use-equipe-allocation'
import { AllocationConfirmDialog } from './AllocationConfirmDialog'

const AREAS_CADASTRO = [
  { id: 'producao', label: 'Produção' },
  { id: 'montagem', label: 'Montagem' },
  { id: 'analise_tecnica', label: 'Análise Técnica' },
] as const

interface AlocacaoEquipeSelectProps {
  item: any
  modulo?: 'producao' | 'montagem'
  equipe?: MembroEquipe[]
  onUpdate: () => void
  onMembroCadastrado?: (novoMembro: MembroEquipe) => void
}

export function AlocacaoEquipeSelect({
  item,
  modulo = 'producao',
  equipe = [],
  onUpdate,
  onMembroCadastrado,
}: AlocacaoEquipeSelectProps) {
  const [openPopover, setOpenPopover] = useState(false)
  const [search, setSearch] = useState('')
  const [openQuickCreate, setOpenQuickCreate] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [novoTelefone, setNovoTelefone] = useState('')
  const [novoTipo, setNovoTipo] = useState<'CLT' | 'PJ'>('CLT')
  const [novasAreas, setNovasAreas] = useState<string[]>([modulo])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isMontagem = modulo === 'montagem'
  const placeholderText = isMontagem ? 'Atribuir montador...' : 'Atribuir profissional...'
  const badgeLabel = isMontagem ? 'montador(es)' : 'profissional(is)'

  // Identifica quais IDs de pessoas ou montadores estão alocados neste card
  const alocacoesRaw: any[] = Array.isArray(item?.alocacao_montagem) ? item.alocacao_montagem : []

  const alocadosIds = new Set<string>()
  alocacoesRaw.forEach((a) => {
    if (a?.pessoa_id) alocadosIds.add(a.pessoa_id)
    if (a?.montador_id) alocadosIds.add(a.montador_id)
  })

  // Conta total de alocações do card
  const alocacoesCount = alocacoesRaw.length

  const { pending, clearPending, toggleMembro, resolveChoice } = useEquipeAllocation(onUpdate)

  if (!item?.id) return null

  const handleSelect = (membro: MembroEquipe) => {
    if (typeof item?.onToggleMontador === 'function') {
      item.onToggleMontador(membro.id)
      return
    }
    const isChecked = alocadosIds.has(membro.id)
    toggleMembro(membro, item.id, item?.cliente_id ?? null, isChecked)
  }

  const handleOpenQuickCreate = () => {
    // Pré-marca a área do módulo atual (produção ou montagem)
    setNovasAreas(modulo ? [modulo] : ['producao'])
    setOpenPopover(false)
    setOpenQuickCreate(true)
  }

  const handleQuickCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const nomeLimpo = novoNome.trim()
    if (!nomeLimpo) {
      toast.error('Informe o nome da pessoa.')
      return
    }

    if (novasAreas.length === 0) {
      toast.error('Selecione pelo menos uma área de atuação.')
      return
    }

    setIsSubmitting(true)
    try {
      let createdId = ''
      if (novoTipo === 'CLT') {
        const { data, error } = await supabase
          .from('equipe_clt')
          .insert({
            nome_completo: nomeLimpo,
            telefone: novoTelefone.trim() || null,
            areas_atuacao: novasAreas,
          })
          .select('id')
          .single()

        if (error) throw error
        createdId = data.id
      } else {
        // PJ em parceiros_pj
        const { data, error } = await supabase
          .from('parceiros_pj')
          .insert({
            razao_social: nomeLimpo,
            socio_nome: nomeLimpo,
            telefone: novoTelefone.trim() || null,
            areas_atuacao: novasAreas,
          })
          .select('id')
          .single()

        if (error) throw error
        createdId = data.id
      }

      toast.success(`${nomeLimpo} cadastrado(a) na Gestão de Pessoas (${novoTipo})!`)

      const novoMembro: MembroEquipe = {
        id: createdId,
        nome: nomeLimpo,
        telefone: novoTelefone.trim() || null,
        tipo: novoTipo,
        areas_atuacao: novasAreas,
        alocacoes: [],
      }

      onMembroCadastrado?.(novoMembro)

      // Alocar imediatamente no card atual
      await toggleMembro(novoMembro, item.id, item?.cliente_id ?? null, false)

      // Limpar formulário e fechar modal
      setNovoNome('')
      setNovoTelefone('')
      setNovoTipo('CLT')
      setNovasAreas([modulo])
      setOpenQuickCreate(false)
      setOpenPopover(false)
    } catch (err: any) {
      toast.error('Erro ao cadastrar pessoa: ' + (err?.message || 'Erro inesperado'))
    } finally {
      setIsSubmitting(false)
    }
  }

  // Filtragem da lista pelo módulo e busca por texto
  // Registros sem array preenchido (ou indefinido) aparecem em todas as áreas por compatibilidade
  const filteredEquipe = (equipe || [])
    .filter((m) => {
      if (!modulo) return true
      const areas = m.areas_atuacao
      if (!Array.isArray(areas) || areas.length === 0) {
        return true
      }
      return areas.includes(modulo)
    })
    .filter((m) => (m?.nome || '').toLowerCase().includes(search.toLowerCase()))

  return (
    <>
      <Popover open={openPopover} onOpenChange={setOpenPopover}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className="h-8 text-[11px] border-steel-blue/20 bg-emerald-500/20 text-emerald-900 hover:bg-emerald-500/30 hover:text-emerald-900 dark:bg-emerald-500/10 dark:text-white dark:hover:bg-emerald-500/20 dark:hover:text-white w-full justify-between focus:ring-0 focus:ring-offset-0 px-2"
          >
            <div className="flex items-center gap-1.5 truncate">
              {isMontagem ? (
                <Wrench className="w-3 h-3 shrink-0" />
              ) : (
                <Users className="w-3 h-3 shrink-0" />
              )}
              <span className="truncate">
                {alocacoesCount > 0 ? `${alocacoesCount} ${badgeLabel}` : placeholderText}
              </span>
            </div>
            <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[280px] sm:w-[320px] p-0 z-50 bg-popover text-popover-foreground border border-border"
          align="start"
        >
          <Command shouldFilter={false}>
            <div className="flex items-center border-b px-2">
              <CommandInput
                placeholder="Buscar por nome..."
                value={search}
                onValueChange={setSearch}
                className="text-xs h-9 flex-1"
              />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleOpenQuickCreate}
                className="h-7 px-2 text-[11px] text-primary hover:text-primary hover:bg-primary/10 flex items-center gap-1 shrink-0 font-semibold"
                title="Cadastrar nova pessoa na Gestão de Pessoas"
              >
                <Plus className="w-3.5 h-3.5" />
                Cadastrar
              </Button>
            </div>
            <CommandList className="max-h-[260px] overflow-y-auto">
              {filteredEquipe.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                  <span>
                    Nenhuma pessoa encontrada para {modulo === 'montagem' ? 'Montagem' : 'Produção'}
                    .
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleOpenQuickCreate}
                    className="text-xs h-7 gap-1"
                  >
                    <UserPlus className="w-3.5 h-3.5" />+ Cadastrar agora
                  </Button>
                </div>
              ) : (
                <CommandGroup heading="Equipe (CLT & PJ)">
                  {filteredEquipe.map((m) => {
                    const isChecked = alocadosIds.has(m.id)
                    const isBusyWithOtherClient =
                      !isChecked &&
                      Array.isArray(m?.alocacoes) &&
                      m.alocacoes.some(
                        (a: any) => a?.produtos_servicos_projeto?.cliente_id !== item?.cliente_id,
                      )

                    return (
                      <CommandItem
                        key={m.id}
                        value={m.nome}
                        onSelect={() => handleSelect(m)}
                        className="text-xs cursor-pointer py-1.5 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div
                            className={cn(
                              'flex h-3.5 w-3.5 items-center justify-center rounded-sm border shrink-0',
                              isChecked
                                ? 'bg-emerald-500 border-emerald-500'
                                : 'border-steel-blue/40',
                            )}
                          >
                            <Check
                              className={cn(
                                'h-2.5 w-2.5 text-white',
                                isChecked ? 'opacity-100' : 'opacity-0',
                              )}
                            />
                          </div>
                          <span className="truncate flex-1 font-medium text-foreground">
                            {m.nome}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          {isBusyWithOtherClient && (
                            <span className="text-[9px] bg-orange-500/10 text-orange-600 border border-orange-500/20 px-1 py-0.5 rounded whitespace-nowrap">
                              Ocupado
                            </span>
                          )}
                          <Badge
                            variant="secondary"
                            className={cn(
                              'text-[9px] px-1.5 py-0 h-4 font-bold border uppercase',
                              m.tipo === 'CLT'
                                ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30'
                                : 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
                            )}
                          >
                            {m.tipo}
                          </Badge>
                        </div>
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Mini formulário inline de cadastro rápido de pessoa na Gestão de Pessoas */}
      <Dialog open={openQuickCreate} onOpenChange={setOpenQuickCreate}>
        <DialogContent className="sm:max-w-[400px]">
          <form onSubmit={handleQuickCreateSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <UserPlus className="w-5 h-5 text-primary" />
                Cadastrar Pessoa na Gestão de Pessoas
              </DialogTitle>
              <DialogDescription className="text-xs">
                Cadastre o profissional (CLT ou PJ). A função/especialidade é definida no próprio
                subcard.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 py-4 text-xs">
              <div className="grid gap-1.5">
                <Label htmlFor="quick-nome" className="text-xs font-semibold">
                  Nome Completo *
                </Label>
                <Input
                  id="quick-nome"
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  placeholder="Ex: Carlos Eduardo Silva"
                  className="h-8 text-xs"
                  required
                  autoFocus
                  disabled={isSubmitting}
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="quick-tel" className="text-xs font-semibold">
                  Telefone / WhatsApp
                </Label>
                <Input
                  id="quick-tel"
                  value={novoTelefone}
                  onChange={(e) => setNovoTelefone(e.target.value)}
                  placeholder="Ex: (47) 99999-9999"
                  className="h-8 text-xs"
                  disabled={isSubmitting}
                />
              </div>

              <div className="grid gap-1.5 pt-1">
                <Label className="text-xs font-semibold">Tipo de Vínculo *</Label>
                <RadioGroup
                  value={novoTipo}
                  onValueChange={(val) => setNovoTipo(val as 'CLT' | 'PJ')}
                  className="flex items-center gap-4 pt-1"
                  disabled={isSubmitting}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="CLT" id="tipo-clt" />
                    <Label
                      htmlFor="tipo-clt"
                      className="text-xs font-medium cursor-pointer flex items-center gap-1"
                    >
                      <Badge
                        variant="secondary"
                        className="text-[10px] bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30"
                      >
                        CLT
                      </Badge>
                      Funcionário
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="PJ" id="tipo-pj" />
                    <Label
                      htmlFor="tipo-pj"
                      className="text-xs font-medium cursor-pointer flex items-center gap-1"
                    >
                      <Badge
                        variant="secondary"
                        className="text-[10px] bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30"
                      >
                        PJ
                      </Badge>
                      Prestador / Parceiro
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="grid gap-1.5 pt-1">
                <Label className="text-xs font-semibold">Áreas de Atuação *</Label>
                <div className="grid grid-cols-1 gap-2 p-2 rounded-md border border-border bg-muted/30">
                  {AREAS_CADASTRO.map((area) => {
                    const isChecked = novasAreas.includes(area.id)
                    return (
                      <label
                        key={area.id}
                        className="flex items-center space-x-2 cursor-pointer text-xs font-medium select-none"
                      >
                        <Checkbox
                          id={`quick-area-${area.id}`}
                          checked={isChecked}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setNovasAreas((prev) => Array.from(new Set([...prev, area.id])))
                            } else {
                              setNovasAreas((prev) => prev.filter((a) => a !== area.id))
                            }
                          }}
                          disabled={isSubmitting}
                        />
                        <span className="text-foreground">{area.label}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOpenQuickCreate(false)}
                disabled={isSubmitting}
                className="h-8 text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting || !novoNome.trim()}
                className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isSubmitting ? 'Salvando...' : 'Salvar e Alocar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmação de alocação se já alocado em outro cliente */}
      <AllocationConfirmDialog
        open={!!pending}
        onOpenChange={(o) => !o && clearPending()}
        montadorNome={pending?.membro?.nome ?? null}
        prevCardsCount={pending?.prevCards?.length ?? 0}
        onChoose={(choice) => resolveChoice(choice, item.id)}
      />
    </>
  )
}
