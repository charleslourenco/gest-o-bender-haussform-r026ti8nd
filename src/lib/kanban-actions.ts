import { supabase } from '@/lib/supabase/client'

export type KanbanModule = 'analise' | 'producao' | 'montagem'

export async function releaseAssemblers(cardId: string): Promise<void> {
  const { error } = await supabase.from('alocacao_montagem').delete().eq('card_id', cardId)
  if (error) throw error
}

export async function updateCardStatus(
  itemId: string,
  newStatus: string,
  opts?: { isMontagem?: boolean; autoReleaseOnConcluido?: boolean },
): Promise<void> {
  const isMontagem = opts?.isMontagem ?? false
  const autoRelease = opts?.autoReleaseOnConcluido ?? true
  if (isMontagem && autoRelease && newStatus === 'concluido') {
    await releaseAssemblers(itemId)
  }
  const { error } = await supabase
    .from('produtos_servicos_projeto')
    .update({ status_analise: newStatus, atualizado_em: new Date().toISOString() })
    .eq('id', itemId)
  if (error) throw error
}

export async function deleteCard(id: string, module: KanbanModule): Promise<void> {
  const flag = `excluido_${module}` as
    | 'excluido_analise'
    | 'excluido_producao'
    | 'excluido_montagem'

  // 1. Busca os dados do card a ser excluído (para saber se é subcard e qual é seu card pai)
  const { data: cardToDel, error: fetchErr } = await supabase
    .from('produtos_servicos_projeto')
    .select('id, card_pai_id')
    .eq('id', id)
    .maybeSingle()

  if (fetchErr) throw fetchErr
  if (!cardToDel) {
    throw new Error('Sem permissão para excluir este card ou card não encontrado.')
  }

  // 2. Executa a exclusão lógica (soft-delete) marcando a flag do módulo
  const { data, error } = await supabase
    .from('produtos_servicos_projeto')
    .update({ [flag]: true, atualizado_em: new Date().toISOString() } as any)
    .eq('id', id)
    .select('id')
  if (error) throw error
  if (!data || data.length === 0) {
    throw new Error('Sem permissão para excluir este card ou card não encontrado.')
  }

  // 3. Libera alocações da equipe associadas a este card excluído (auditoria automática pelo trigger)
  try {
    await supabase.from('alocacao_montagem').delete().eq('card_id', id)
  } catch (alocErr) {
    console.error('Erro ao desalocar equipe do card excluído:', alocErr)
  }

  // 4. Se for um subcard (card_pai_id preenchido), verifica se o card pai ainda possui
  // algum subcard ativo (excluido_producao = false). Se não restar nenhum ativo,
  // limpa a coluna cor_vinculo do pai (SET cor_vinculo = NULL).
  if (cardToDel.card_pai_id) {
    const parentId = cardToDel.card_pai_id
    const { count, error: countErr } = await supabase
      .from('produtos_servicos_projeto')
      .select('id', { count: 'exact', head: true })
      .eq('card_pai_id', parentId)
      .eq('excluido_producao', false)

    if (countErr) {
      console.error('Erro ao verificar subcards ativos do pai após exclusão:', countErr)
    } else if (count === 0) {
      const { error: clearColorErr } = await supabase
        .from('produtos_servicos_projeto')
        .update({ cor_vinculo: null, atualizado_em: new Date().toISOString() })
        .eq('id', parentId)

      if (clearColorErr) {
        console.error('Erro ao limpar cor_vinculo do card pai:', clearColorErr)
      }
    }
  }
}

export async function assignAnalyst(id: string, analystId: string | null): Promise<void> {
  const { error } = await supabase
    .from('produtos_servicos_projeto')
    .update({ analista_id: analystId, atualizado_em: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}
