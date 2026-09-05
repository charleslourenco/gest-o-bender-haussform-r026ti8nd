import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { AllocationChoice } from '@/components/kanban/AllocationConfirmDialog'

export interface MembroEquipe {
  id: string
  nome: string
  telefone?: string | null
  tipo: 'CLT' | 'PJ'
  alocacoes?: { card_id: string; produtos_servicos_projeto?: { cliente_id: string | null } }[]
}

interface PendingAllocation {
  membro: MembroEquipe
  prevCards: string[]
}

export function useEquipeAllocation(onUpdate: () => void) {
  const [pending, setPending] = useState<PendingAllocation | null>(null)

  const clearPending = useCallback(() => setPending(null), [])

  const toggleMembro = useCallback(
    async (
      membro: MembroEquipe,
      cardId: string,
      currentClientId: string | null,
      isChecked: boolean,
    ) => {
      if (!membro || !cardId) return

      if (isChecked) {
        // Exclui alocação por pessoa_id OU por montador_id (caso histórico)
        const { error: delErr } = await supabase
          .from('alocacao_montagem')
          .delete()
          .eq('card_id', cardId)
          .or(`pessoa_id.eq.${membro.id},montador_id.eq.${membro.id}`)

        if (delErr) {
          toast.error('Erro ao desalocar: ' + delErr.message)
          return
        }
        onUpdate()
        return
      }

      // Checa se já está alocado em cards de outro cliente
      const alocacoes = Array.isArray(membro.alocacoes) ? membro.alocacoes : []
      const conflicting = alocacoes.filter(
        (a: any) =>
          a?.card_id !== cardId && a?.produtos_servicos_projeto?.cliente_id !== currentClientId,
      )

      if (conflicting.length > 0) {
        setPending({
          membro,
          prevCards: conflicting.map((a: any) => a?.card_id).filter(Boolean),
        })
        return
      }

      // Localiza montador correspondente se existir, para preencher montador_id se possível
      let montadorId: string | null = null
      try {
        const { data: mont } = await supabase
          .from('montadores')
          .select('id')
          .ilike('nome_completo', membro.nome.trim())
          .limit(1)
        if (mont && mont.length > 0) {
          montadorId = mont[0].id
        }
      } catch {
        // ignora
      }

      const { error } = await supabase.from('alocacao_montagem').insert({
        card_id: cardId,
        pessoa_id: membro.id,
        tipo_origem: membro.tipo,
        pessoa_nome: membro.nome,
        montador_id: montadorId,
      })

      if (error) {
        toast.error('Erro ao alocar: ' + error.message)
        return
      }
      toast.success(`${membro.nome} alocado(a) com sucesso`)
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
          await supabase
            .from('alocacao_montagem')
            .delete()
            .or(`pessoa_id.eq.${pending.membro.id},montador_id.eq.${pending.membro.id}`)
            .in('card_id', pending.prevCards)
        }

        let montadorId: string | null = null
        try {
          const { data: mont } = await supabase
            .from('montadores')
            .select('id')
            .ilike('nome_completo', pending.membro.nome.trim())
            .limit(1)
          if (mont && mont.length > 0) {
            montadorId = mont[0].id
          }
        } catch {
          // ignora
        }

        const { error } = await supabase.from('alocacao_montagem').insert({
          card_id: cardId,
          pessoa_id: pending.membro.id,
          tipo_origem: pending.membro.tipo,
          pessoa_nome: pending.membro.nome,
          montador_id: montadorId,
        })
        if (error) throw error

        toast.success(`${pending.membro.nome} alocado(a) com sucesso`)
      } catch (err: any) {
        toast.error('Erro ao processar alocação: ' + (err?.message || 'desconhecido'))
      } finally {
        setPending(null)
        onUpdate()
      }
    },
    [pending, onUpdate],
  )

  return { pending, clearPending, toggleMembro, resolveChoice }
}
