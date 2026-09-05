import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CardData, KanbanColumnDef } from './types'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'
import { useMontadorAllocation } from '@/hooks/use-montador-allocation'
import { AllocationConfirmDialog } from './AllocationConfirmDialog'
import { Button } from '@/components/ui/button'
import { ChevronsUpDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { fetchMontadores, MontadorOption } from '@/services/historico-montagem'
import { HistoricoTimelineFilters } from '@/components/montagem/HistoricoTimelineFilters'
import {
  HistoricoFiltros,
  DEFAULT_FILTROS,
  applyFiltros,
} from '@/components/montagem/HistoricoFilters'

export function KanbanDialog({
  selectedCard,
  setSelectedCard,
  columns,
  usersMap,
  onAssignAnalyst,
}: {
  selectedCard: CardData | null
  setSelectedCard: (c: CardData | null) => void
  columns: KanbanColumnDef[]
  usersMap: Record<string, { nome: string; foto_perfil: string | null }>
  onAssignAnalyst: (cardId: string, analystId: string | null) => void
}) {
  const location = useLocation()
  const isMontagem = location.pathname.includes('/montagem')
  const { toast } = useToast()

  const [montadores, setMontadores] = useState<any[]>([])
  const [montadorOptions, setMontadorOptions] = useState<MontadorOption[]>([])
  const [alocacoesCard, setAlocacoesCard] = useState<string[]>([])
  const [historico, setHistorico] = useState<any[]>([])
  const [timelineFiltros, setTimelineFiltros] = useState<HistoricoFiltros>(DEFAULT_FILTROS)

  const refreshAlocacoes = async () => {
    if (!selectedCard) return
    const { data: alocData } = await supabase
      .from('alocacao_montagem')
      .select('montador_id')
      .eq('card_id', selectedCard.id)
    setAlocacoesCard((alocData || []).map((a: any) => a.montador_id).filter(Boolean))

    const { data: montData } = await supabase
      .from('montadores')
      .select('*, alocacao_montagem(card_id, produtos_servicos_projeto(card_id, nome_produto))')
    if (montData) {
      setMontadores(
        montData.map((m: any) => ({
          ...m,
          alocacao_montagem: Array.isArray(m?.alocacao_montagem) ? m.alocacao_montagem : [],
        })),
      )
    }

    const { data: histData } = await (supabase as any)
      .from('historico_alocacao_montagem')
      .select(
        'id, acao, criado_em, montador_id, pessoa_id, pessoa_nome, tipo_origem, montador:montadores(nome_completo)',
      )
      .eq('card_id', selectedCard.id)
      .order('criado_em', { ascending: false })
    setHistorico(Array.isArray(histData) ? histData : [])

    if (montadorOptions.length === 0) {
      try {
        const montOpts = await fetchMontadores()
        setMontadorOptions(montOpts)
      } catch {
        // silent
      }
    }
  }

  const { pending, clearPending, toggleMontador, resolveChoice } =
    useMontadorAllocation(refreshAlocacoes)

  useEffect(() => {
    if (isMontagem && selectedCard) {
      refreshAlocacoes()
      setTimelineFiltros(DEFAULT_FILTROS)
    } else {
      setAlocacoesCard([])
      setHistorico([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMontagem, selectedCard?.id])

  const handleToggleMontador = (montadorId: string, isChecked: boolean) => {
    if (!selectedCard) return
    const montador = montadores.find((m) => m.id === montadorId)
    if (!montador) return
    toggleMontador(montador, selectedCard.id, selectedCard.cliente_id ?? null, isChecked)
  }

  if (!selectedCard) return null

  const colTitle =
    columns.find((c) => c.id === selectedCard.status_analise)?.title || selectedCard.status_analise

  const filteredHistorico = applyFiltros(
    historico.map((h: any) => ({ ...h, montador_id: h.montador_id })),
    timelineFiltros,
  )

  return (
    <>
      <Dialog open={!!selectedCard} onOpenChange={(o) => !o && setSelectedCard(null)}>
        <DialogContent className="bg-card text-card-foreground border-border sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-primary text-xl">Detalhes do Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-primary uppercase font-semibold">Produto</span>
                <p className="font-medium mt-1">{selectedCard.nome_produto}</p>
              </div>
              <div>
                <span className="text-xs text-primary uppercase font-semibold">Cliente</span>
                <p className="font-medium mt-1 text-muted-foreground">
                  {selectedCard.clientes?.nome || 'N/A'}
                </p>
              </div>
              <div>
                <span className="text-xs text-primary uppercase font-semibold">Quantidade</span>
                <p className="font-medium mt-1">{selectedCard.qtd}</p>
              </div>
              <div>
                <span className="text-xs text-primary uppercase font-semibold">Status Atual</span>
                <p className="font-medium mt-1 text-muted-foreground">{colTitle}</p>
              </div>
            </div>

            <div>
              <span className="text-xs text-primary uppercase font-semibold">Descrição</span>
              <div className="text-sm bg-muted/50 p-3 rounded-lg mt-1 min-h-[80px] border border-border whitespace-pre-wrap text-card-foreground">
                {selectedCard.descricao || 'Nenhuma descrição fornecida.'}
              </div>
            </div>

            {!isMontagem && (
              <div className="bg-muted/30 p-3 rounded-lg border border-border">
                <span className="text-xs text-primary uppercase font-semibold block mb-2">
                  Responsável (Analista)
                </span>
                <Select
                  value={selectedCard.analista_id || 'unassigned'}
                  onValueChange={(val) =>
                    onAssignAnalyst(selectedCard.id, val === 'unassigned' ? null : val)
                  }
                >
                  <SelectTrigger className="w-full bg-background border-input text-foreground">
                    <SelectValue placeholder="Selecione um responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Não atribuído</SelectItem>
                    {Object.entries(usersMap).map(([id, user]) => (
                      <SelectItem key={id} value={id}>
                        {user.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {isMontagem && (
              <div className="bg-muted/30 p-3 rounded-lg border border-border space-y-3">
                <span className="text-xs text-primary uppercase font-semibold block">
                  Equipe de Montagem
                </span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between bg-background border-input text-foreground hover:bg-muted/50 hover:text-foreground"
                    >
                      {alocacoesCard.length > 0
                        ? `${alocacoesCard.length} montador(es) alocado(s)`
                        : 'Selecione os montadores'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-popover border-border">
                    <Command className="bg-transparent">
                      <CommandInput placeholder="Buscar montador..." className="text-foreground" />
                      <CommandList>
                        <CommandEmpty>Nenhum montador encontrado.</CommandEmpty>
                        <CommandGroup>
                          {montadores.map((m) => {
                            const isChecked = alocacoesCard.includes(m.id)
                            const isBusyWithOtherClient =
                              !isChecked &&
                              Array.isArray(m?.alocacao_montagem) &&
                              m.alocacao_montagem.some(
                                (a: any) =>
                                  a?.produtos_servicos_projeto?.cliente_id !==
                                  selectedCard.cliente_id,
                              )

                            return (
                              <CommandItem
                                key={m.id}
                                value={m.nome_completo}
                                onSelect={() => handleToggleMontador(m.id, !isChecked)}
                                className="text-foreground data-[selected='true']:bg-accent data-[selected='true']:text-accent-foreground cursor-pointer"
                              >
                                <div
                                  className={cn(
                                    'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border',
                                    isChecked
                                      ? 'bg-emerald-500 border-emerald-500'
                                      : 'border-border opacity-50',
                                  )}
                                >
                                  <Check
                                    className={cn(
                                      'h-3 w-3 text-white',
                                      isChecked ? 'opacity-100' : 'opacity-0',
                                    )}
                                  />
                                </div>
                                <span className="flex-1">{m.nome_completo}</span>
                                {isBusyWithOtherClient && (
                                  <span className="text-[10px] bg-orange-500/20 text-orange-500 px-2 py-0.5 rounded ml-2 whitespace-nowrap">
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

                {alocacoesCard.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {alocacoesCard.map((id) => {
                      const m = montadores.find((x) => x.id === id)
                      if (!m) return null
                      return (
                        <Badge
                          key={id}
                          className="bg-emerald-500/20 text-emerald-600 hover:bg-emerald-500/30 border-emerald-500/30 font-normal"
                        >
                          {m.nome_completo}
                        </Badge>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {isMontagem && historico.length > 0 && (
              <div className="bg-muted/30 p-3 rounded-lg border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-primary uppercase font-semibold">
                    Histórico de Montagem
                  </span>
                </div>
                <div className="mb-3">
                  <HistoricoTimelineFilters
                    montadores={montadorOptions}
                    filtros={timelineFiltros}
                    onChange={setTimelineFiltros}
                  />
                </div>
                {filteredHistorico.length === 0 ? (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    Nenhum registro encontrado com os filtros atuais.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                    {filteredHistorico.map((h: any) => {
                      const montadorNome =
                        h?.pessoa_nome ||
                        (Array.isArray(h?.montador)
                          ? h.montador[0]?.nome_completo
                          : h?.montador?.nome_completo) ||
                        'Membro da equipe'
                      const isAlocado = h.acao === 'alocado'
                      return (
                        <div key={h.id} className="flex items-center gap-2 text-sm">
                          <div
                            className={cn(
                              'w-2 h-2 rounded-full shrink-0',
                              isAlocado ? 'bg-emerald-500' : 'bg-orange-500',
                            )}
                          />
                          <span className="font-medium text-card-foreground">
                            {montadorNome || 'Montador'}
                          </span>
                          <span
                            className={cn(
                              'text-xs px-1.5 py-0.5 rounded font-medium',
                              isAlocado
                                ? 'bg-emerald-500/20 text-emerald-600'
                                : 'bg-orange-500/20 text-orange-600',
                            )}
                          >
                            {isAlocado ? 'Alocado' : 'Desalocado'}
                          </span>
                          <span className="text-xs text-muted-foreground ml-auto whitespace-nowrap">
                            {h.criado_em
                              ? new Date(h.criado_em).toLocaleString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : ''}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between items-center bg-muted/30 p-3 rounded-lg border border-border">
              <div>
                <span className="text-xs text-primary uppercase font-semibold block">
                  Consultor Original
                </span>
                <p className="font-medium mt-1 text-sm">
                  {selectedCard.formulario_comercial?.usuario_id
                    ? usersMap[selectedCard.formulario_comercial.usuario_id]?.nome || 'Desconhecido'
                    : 'N/A'}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-primary uppercase font-semibold block">
                  Criado em
                </span>
                <p className="text-sm text-muted-foreground mt-1">
                  {new Date(selectedCard.criado_em).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AllocationConfirmDialog
        open={!!pending}
        onOpenChange={(o) => !o && clearPending()}
        montadorNome={pending?.montador.nome_completo ?? null}
        prevCardsCount={pending?.prevCards.length ?? 0}
        onChoose={(choice) => resolveChoice(choice, selectedCard.id)}
      />
    </>
  )
}
