import { supabase } from '@/lib/supabase/client'

export type NaturezaPlanoContas =
  | 'receita'
  | 'custo_direto'
  | 'despesa_fixa'
  | 'imposto'
  | 'financeiro'

export const NATUREZA_LABELS: Record<NaturezaPlanoContas, string> = {
  receita: 'Receita',
  custo_direto: 'Custo Direto',
  despesa_fixa: 'Despesa Fixa',
  imposto: 'Imposto',
  financeiro: 'Financeiro',
}

export const NATUREZA_COLORS: Record<
  NaturezaPlanoContas,
  { badge: string; text: string; bg: string }
> = {
  receita: {
    badge:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800',
    text: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-500',
  },
  custo_direto: {
    badge:
      'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800',
    text: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500',
  },
  despesa_fixa: {
    badge:
      'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800',
    text: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-500',
  },
  imposto: {
    badge:
      'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800',
    text: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-500',
  },
  financeiro: {
    badge:
      'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800',
    text: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-500',
  },
}

export interface PlanoContaItem {
  id: string
  nome: string
  codigo: string | null
  natureza: NaturezaPlanoContas | string
  tipo: string
  pai_id: string | null
  ativo: boolean
  padrao: boolean
  descricao: string | null
  ordem: number
  criado_em: string
  atualizado_em: string
}

export interface CreatePlanoContaInput {
  nome: string
  codigo?: string | null
  natureza: NaturezaPlanoContas | string
  tipo?: string
  pai_id?: string | null
  descricao?: string | null
  ordem?: number
  ativo?: boolean
}

export interface UpdatePlanoContaInput {
  nome?: string
  codigo?: string | null
  natureza?: NaturezaPlanoContas | string
  tipo?: string
  pai_id?: string | null
  descricao?: string | null
  ordem?: number
  ativo?: boolean
}

/**
 * Listar todas as categorias do plano de contas
 * @param includeInactive se true traz inativos também; se false traz apenas ativos
 */
export async function fetchPlanoContas(includeInactive = false): Promise<{
  data: PlanoContaItem[] | null
  error: string | null
}> {
  try {
    let query = supabase
      .from('plano_contas')
      .select('*')
      .order('ordem', { ascending: true })
      .order('codigo', { ascending: true })
      .order('nome', { ascending: true })

    if (!includeInactive) {
      query = query.eq('ativo', true)
    }

    const { data, error } = await query
    if (error) throw error
    return { data: (data as PlanoContaItem[]) || [], error: null }
  } catch (err: any) {
    return { data: null, error: err.message || 'Erro ao carregar plano de contas' }
  }
}

/**
 * Criar nova categoria no plano de contas
 */
export async function createPlanoConta(input: CreatePlanoContaInput): Promise<{
  data: PlanoContaItem | null
  error: string | null
}> {
  try {
    const { data, error } = await supabase
      .from('plano_contas')
      .insert({
        nome: input.nome.trim(),
        codigo: input.codigo ? input.codigo.trim() : null,
        natureza: input.natureza,
        tipo: input.tipo || 'analitica',
        pai_id: input.pai_id || null,
        descricao: input.descricao ? input.descricao.trim() : null,
        ordem: input.ordem !== undefined ? input.ordem : 0,
        ativo: input.ativo !== undefined ? input.ativo : true,
      })
      .select()
      .single()

    if (error) throw error
    return { data: data as PlanoContaItem, error: null }
  } catch (err: any) {
    return { data: null, error: err.message || 'Erro ao criar item no plano de contas' }
  }
}

/**
 * Atualizar categoria do plano de contas
 */
export async function updatePlanoConta(
  id: string,
  updates: UpdatePlanoContaInput,
): Promise<{
  data: PlanoContaItem | null
  error: string | null
}> {
  try {
    const payload: any = {
      atualizado_em: new Date().toISOString(),
    }
    if (updates.nome !== undefined) payload.nome = updates.nome.trim()
    if (updates.codigo !== undefined) payload.codigo = updates.codigo ? updates.codigo.trim() : null
    if (updates.natureza !== undefined) payload.natureza = updates.natureza
    if (updates.tipo !== undefined) payload.tipo = updates.tipo
    if (updates.pai_id !== undefined) payload.pai_id = updates.pai_id || null
    if (updates.descricao !== undefined)
      payload.descricao = updates.descricao ? updates.descricao.trim() : null
    if (updates.ordem !== undefined) payload.ordem = updates.ordem
    if (updates.ativo !== undefined) payload.ativo = updates.ativo

    const { data, error } = await supabase
      .from('plano_contas')
      .update(payload)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return { data: data as PlanoContaItem, error: null }
  } catch (err: any) {
    return { data: null, error: err.message || 'Erro ao atualizar item do plano de contas' }
  }
}

/**
 * Inativar/Reativar categoria (NUNCA deletar destrutivamente)
 */
export async function setPlanoContaAtivo(
  id: string,
  ativo: boolean,
): Promise<{
  data: PlanoContaItem | null
  error: string | null
}> {
  return updatePlanoConta(id, { ativo })
}
