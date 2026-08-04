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
  const { data, error } = await supabase
    .from('produtos_servicos_projeto')
    .update({ [flag]: true, atualizado_em: new Date().toISOString() } as any)
    .eq('id', id)
    .select('id')
  if (error) throw error
  if (!data || data.length === 0) {
    throw new Error('Sem permissão para excluir este card ou card não encontrado.')
  }
}

export async function assignAnalyst(id: string, analystId: string | null): Promise<void> {
  const { error } = await supabase
    .from('produtos_servicos_projeto')
    .update({ analista_id: analystId, atualizado_em: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}
