import { useEffect, useState } from 'react'
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
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
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
  const isMontagem = typeof window !== 'undefined' && window.location.pathname.includes('/montagem')
  const { toast } = useToast()

  const [montadores, setMontadores] = useState<any[]>([])
  const [alocacoesCard, setAlocacoesCard] = useState<string[]>([])
  const [pendingAllocation, setPendingAllocation] = useState<{
    montadorId: string
    montadorNome: string
    prevCards: any[]
  } | null>(null)

  useEffect(() => {
    if (isMontagem && selectedCard) {
      fetchMontadoresData()
    }
  }, [isMontagem, selectedCard])

  const fetchMontadoresData = async () => {
    const { data: montData } = await supabase
      .from('montadores')
      .select('*, alocacao_montagem(card_id, produtos_servicos_projeto(cliente_id, nome_produto))')

    if (montData) setMontadores(montData)

    if (selectedCard) {
      const { data: alocData } = await supabase
        .from('alocacao_montagem')
        .select('montador_id')
        .eq('card_id', selectedCard.id)

      if (alocData) {
        setAlocacoesCard(alocData.map((a) => a.montador_id))
      }
    }
  }

  const handleToggleMontador = async (montadorId: string, checked: boolean) => {
    if (!selectedCard) return

    if (!checked) {
      await supabase
        .from('alocacao_montagem')
        .delete()
        .match({ montador_id: montadorId, card_id: selectedCard.id })
      setAlocacoesCard((prev) => prev.filter((id) => id !== montadorId))
      return
    }

    const montador = montadores.find((m) => m.id === montadorId)
    if (!montador) return

    const currentCardClientId = selectedCard.cliente_id
    const conflictingAllocations =
      montador.alocacao_montagem?.filter(
        (a: any) =>
          a.produtos_servicos_projeto?.cliente_id !== currentCardClientId &&
          a.card_id !== selectedCard.id,
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
    if (!selectedCard) return
    await supabase.from('alocacao_montagem').insert({
      montador_id: montadorId,
      card_id: selectedCard.id,
    })
    setAlocacoesCard((prev) => [...prev, montadorId])
    toast({ title: 'Montador alocado com sucesso' })
    fetchMontadoresData()
  }

  const confirmPendingAllocation = async () => {
    if (!pendingAllocation || !selectedCard) return

    if (pendingAllocation.prevCards.length > 0) {
      await supabase
        .from('produtos_servicos_projeto')
        .update({ status_analise: 'pendencias' })
        .in('id', pendingAllocation.prevCards)
    }

    await proceedAllocation(pendingAllocation.montadorId)
    setPendingAllocation(null)
  }

  if (!selectedCard) return null

  const colTitle =
    columns.find((c) => c.id === selectedCard.status_analise)?.title || selectedCard.status_analise

  return (
    <>
      <Dialog open={!!selectedCard} onOpenChange={(o) => !o && setSelectedCard(null)}>
        <DialogContent className="bg-midnight-navy text-off-white border-steel-blue sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-pale-cornflower text-xl">Detalhes do Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-steel-blue uppercase font-semibold">Produto</span>
                <p className="font-medium mt-1">{selectedCard.nome_produto}</p>
              </div>
              <div>
                <span className="text-xs text-steel-blue uppercase font-semibold">Cliente</span>
                <p className="font-medium mt-1 text-pale-cornflower">
                  {selectedCard.clientes?.nome || 'N/A'}
                </p>
              </div>
              <div>
                <span className="text-xs text-steel-blue uppercase font-semibold">Quantidade</span>
                <p className="font-medium mt-1">{selectedCard.qtd}</p>
              </div>
              <div>
                <span className="text-xs text-steel-blue uppercase font-semibold">
                  Status Atual
                </span>
                <p className="font-medium mt-1 text-pale-cornflower">{colTitle}</p>
              </div>
            </div>

            <div>
              <span className="text-xs text-steel-blue uppercase font-semibold">Descrição</span>
              <div className="text-sm bg-dark-denim p-3 rounded-lg mt-1 min-h-[80px] border border-steel-blue/30 whitespace-pre-wrap text-off-white/90">
                {selectedCard.descricao || 'Nenhuma descrição fornecida.'}
              </div>
            </div>

            <div className="bg-dark-denim/50 p-3 rounded-lg border border-steel-blue/20">
              <span className="text-xs text-steel-blue uppercase font-semibold block mb-2">
                Responsável (Analista)
              </span>
              <Select
                value={selectedCard.analista_id || 'unassigned'}
                onValueChange={(val) =>
                  onAssignAnalyst(selectedCard.id, val === 'unassigned' ? null : val)
                }
              >
                <SelectTrigger className="w-full bg-midnight-navy border-steel-blue text-off-white">
                  <SelectValue placeholder="Selecione um responsável" />
                </SelectTrigger>
                <SelectContent className="bg-dark-denim border-steel-blue text-off-white">
                  <SelectItem value="unassigned">Não atribuído</SelectItem>
                  {Object.entries(usersMap).map(([id, user]) => (
                    <SelectItem key={id} value={id}>
                      {user.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isMontagem && (
              <div className="bg-dark-denim/50 p-3 rounded-lg border border-steel-blue/20 space-y-3">
                <span className="text-xs text-steel-blue uppercase font-semibold block">
                  Montadores Alocados
                </span>
                {montadores.length === 0 ? (
                  <p className="text-xs text-off-white/60">Nenhum montador cadastrado.</p>
                ) : (
                  <div className="space-y-2">
                    {montadores.map((m) => {
                      const isChecked = alocacoesCard.includes(m.id)
                      const isBusyWithOtherClient =
                        !isChecked &&
                        m.alocacao_montagem?.some(
                          (a: any) =>
                            a.produtos_servicos_projeto?.cliente_id !== selectedCard.cliente_id,
                        )

                      return (
                        <div
                          key={m.id}
                          className="flex items-center space-x-2 bg-midnight-navy p-2 rounded-md border border-steel-blue/30"
                        >
                          <Checkbox
                            id={`montador-${m.id}`}
                            checked={isChecked}
                            onCheckedChange={(val) => handleToggleMontador(m.id, !!val)}
                            className="border-steel-blue data-[state=checked]:bg-emerald-500 data-[state=checked]:text-white"
                          />
                          <label
                            htmlFor={`montador-${m.id}`}
                            className="text-sm font-medium leading-none cursor-pointer flex-1 text-off-white flex justify-between items-center"
                          >
                            <span>{m.nome_completo}</span>
                            {isBusyWithOtherClient && (
                              <span className="text-[10px] bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded ml-2 whitespace-nowrap">
                                Ocupado (Outro Cliente)
                              </span>
                            )}
                          </label>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between items-center bg-dark-denim/50 p-3 rounded-lg border border-steel-blue/20">
              <div>
                <span className="text-xs text-steel-blue uppercase font-semibold block">
                  Consultor Original
                </span>
                <p className="font-medium mt-1 text-sm">
                  {selectedCard.formulario_comercial?.usuario_id
                    ? usersMap[selectedCard.formulario_comercial.usuario_id]?.nome || 'Desconhecido'
                    : 'N/A'}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-steel-blue uppercase font-semibold block">
                  Criado em
                </span>
                <p className="text-sm text-off-white/80 mt-1">
                  {new Date(selectedCard.criado_em).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!pendingAllocation}
        onOpenChange={(open) => !open && setPendingAllocation(null)}
      >
        <AlertDialogContent className="bg-midnight-navy text-off-white border-steel-blue">
          <AlertDialogHeader>
            <AlertDialogTitle>Autorizar Realocação?</AlertDialogTitle>
            <AlertDialogDescription className="text-pale-cornflower">
              O montador <strong>{pendingAllocation?.montadorNome}</strong> já está alocado em outro
              cliente.
              <br />
              <br />
              Deseja autorizar a nova alocação e mover a(s) montagem(ns) anterior(es) para{' '}
              <strong>Pendências</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-steel-blue text-off-white hover:bg-steel-blue/20 hover:text-white">
              Cancelar
            </AlertDialogCancel>
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
