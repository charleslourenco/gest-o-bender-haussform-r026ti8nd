import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { AllocationChoice } from '@/components/kanban/AllocationConfirmDialog'

interface PendingAllocation {
  montador: { id: string; nome_completo: string }
  prevCards: string[]
}

export function useMontadorAllocation(onUpdate: () => void) {
  const [pending, setPending] = useState<PendingAllocation | null>(null)

  const clearPending = useCallback(() => setPending(null), [])

  const toggleMontador = useCallback(
    async (
      montador: { id: string; nome_completo: string; alocacao_montagem?: any[] } | undefined,
      cardId: string,
      currentClientId: string | null,
      isChecked: boolean,
    ) => {
      if (!montador || !cardId) return

      if (isChecked) {
        await supabase
          .from('alocacao_montagem')
          .delete()
          .match({ montador_id: montador.id, card_id: cardId })
        onUpdate()
        return
      }

      const alocacoes = Array.isArray(montador?.alocacao_montagem) ? montador.alocacao_montagem : []
      const conflicting = alocacoes.filter(
        (a: any) =>
          a?.card_id !== cardId && a?.produtos_servicos_projeto?.cliente_id !== currentClientId,
      )

      if (conflicting.length > 0) {
        setPending({
          montador: { id: montador.id, nome_completo: montador.nome_completo },
          prevCards: conflicting.map((a: any) => a?.card_id).filter(Boolean),
        })
        return
      }

      const { error } = await supabase
        .from('alocacao_montagem')
        .insert({ montador_id: montador.id, card_id: cardId })
      if (error) {
        toast.error('Erro ao alocar montador: ' + error.message)
        return
      }
      toast.success('Montador alocado com sucesso')
      onUpdate()
    },
    [onUpdate],
  )

  const resolveChoice = useCallback(
    async (choice: AllocationChoice, cardId: string) => {
      if (!pending || !cardId) {
        setPending(null)
        return
      }

      if (choice === 'cancel') {
        setPending(null)
        return
      }

      try {
        if (choice === 'swap' && pending.prevCards.length > 0) {
          const { error: swapErr } = await supabase
            .from('produtos_servicos_projeto')
            .update({ status_analise: 'pendencia' })
            .in('id', pending.prevCards)
          if (swapErr) throw swapErr
        }

        const { error: insertErr } = await supabase
          .from('alocacao_montagem')
          .insert({ montador_id: pending.montador.id, card_id: cardId })
        if (insertErr) throw insertErr

        toast.success('Montador alocado com sucesso')
      } catch (err: any) {
        toast.error('Erro ao processar alocação: ' + (err?.message || 'desconhecido'))
      } finally {
        setPending(null)
        onUpdate()
      }
    },
    [pending, onUpdate],
  )

  return { pending, clearPending, toggleMontador, resolveChoice }
}
