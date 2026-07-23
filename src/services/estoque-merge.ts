import { supabase } from '@/lib/supabase/client'

export interface MergeResult {
  data: { final_quantity: number; migrated_records: number } | null
  error: string | null
}

export async function mergeEstoqueItems(
  masterId: string,
  duplicateIds: string[],
): Promise<MergeResult> {
  if (!masterId || duplicateIds.length === 0) {
    return { data: null, error: 'Mestre e ao menos um duplicado devem ser informados.' }
  }
  if (duplicateIds.includes(masterId)) {
    return { data: null, error: 'O item mestre não pode estar na lista de duplicados.' }
  }

  try {
    const { data, error } = await supabase.functions.invoke('merge-estoque-items', {
      body: { master_id: masterId, duplicate_ids: duplicateIds },
    })

    if (error) {
      return { data: null, error: error.message || 'Erro ao invocar a função de mesclagem.' }
    }

    if (data?.error) {
      return { data: null, error: data.error }
    }

    return {
      data: {
        final_quantity: data?.final_quantity ?? 0,
        migrated_records: data?.migrated_records ?? 0,
      },
      error: null,
    }
  } catch (e: any) {
    return { data: null, error: e.message || 'Erro inesperado na mesclagem.' }
  }
}
