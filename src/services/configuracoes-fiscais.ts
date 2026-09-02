import { supabase } from '@/lib/supabase/client'

export type RegimeTributario = 'simples_nacional' | 'lucro_presumido' | 'lucro_real'

export const REGIME_TRIBUTARIO_LABELS: Record<RegimeTributario, string> = {
  simples_nacional: 'Simples Nacional',
  lucro_presumido: 'Lucro Presumido',
  lucro_real: 'Lucro Real',
}

export const REGIME_TRIBUTARIO_DESCRIPTIONS: Record<RegimeTributario, string> = {
  simples_nacional:
    'Regime simplificado com apuração em guia única (DAS) calculada sobre o faturamento bruto.',
  lucro_presumido:
    'Apuração simplificada de IRPJ/CSLL com base em margens pré-fixadas de lucro (8%/12%) e PIS/COFINS cumulativos.',
  lucro_real:
    'Apuração baseada no lucro líquido contábil efetivo do período, com PIS/COFINS no regime não-cumulativo.',
}

export interface ConfiguracaoFiscal {
  id: string
  regime_tributario: RegimeTributario | string
  data_inicio_vigencia: string
  data_fim_vigencia: string | null
  observacoes: string | null
  ativo: boolean
  criado_em: string
  atualizado_em: string
}

export interface AliquotaFiscal {
  id: string
  regime_tributario: RegimeTributario | string
  nome_imposto: string
  aliquota_percentual: number
  base_calculo_percentual: number | null
  data_inicio_vigencia: string
  data_fim_vigencia: string | null
  descricao: string | null
  ativo: boolean
  criado_em: string
  atualizado_em: string
}

export interface CreateConfiguracaoFiscalInput {
  regime_tributario: RegimeTributario | string
  data_inicio_vigencia: string
  observacoes?: string | null
}

export interface CreateAliquotaFiscalInput {
  regime_tributario: RegimeTributario | string
  nome_imposto: string
  aliquota_percentual: number
  base_calculo_percentual?: number | null
  data_inicio_vigencia?: string
  data_fim_vigencia?: string | null
  descricao?: string | null
  ativo?: boolean
}

export interface UpdateAliquotaFiscalInput {
  regime_tributario?: RegimeTributario | string
  nome_imposto?: string
  aliquota_percentual?: number
  base_calculo_percentual?: number | null
  data_inicio_vigencia?: string
  data_fim_vigencia?: string | null
  descricao?: string | null
  ativo?: boolean
}

// -------------------------------------------------------------
// SERVIÇOS: CONFIGURAÇÃO FISCAL (REGIME)
// -------------------------------------------------------------

/**
 * Busca a configuração fiscal ativa atual (a mais recente com ativo = true)
 */
export async function fetchConfiguracaoFiscalAtiva(): Promise<{
  data: ConfiguracaoFiscal | null
  error: string | null
}> {
  try {
    const { data, error } = await supabase
      .from('configuracoes_fiscais')
      .select('*')
      .eq('ativo', true)
      .order('data_inicio_vigencia', { ascending: false })
      .order('criado_em', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return { data: data as ConfiguracaoFiscal | null, error: null }
  } catch (err: any) {
    return { data: null, error: err.message || 'Erro ao carregar configuração fiscal' }
  }
}

/**
 * Busca o histórico de todas as configurações fiscais
 */
export async function fetchHistoricoConfiguracoesFiscais(): Promise<{
  data: ConfiguracaoFiscal[] | null
  error: string | null
}> {
  try {
    const { data, error } = await supabase
      .from('configuracoes_fiscais')
      .select('*')
      .order('data_inicio_vigencia', { ascending: false })
      .order('criado_em', { ascending: false })

    if (error) throw error
    return { data: (data as ConfiguracaoFiscal[]) || [], error: null }
  } catch (err: any) {
    return { data: null, error: err.message || 'Erro ao carregar histórico fiscal' }
  }
}

/**
 * Troca/Cria novo regime fiscal:
 * Encerra as configurações ativas anteriores preenchendo data_fim_vigencia e ativo = false,
 * e cria a nova com a data_inicio_vigencia especificada e ativo = true.
 */
export async function trocarRegimeFiscal(input: CreateConfiguracaoFiscalInput): Promise<{
  data: ConfiguracaoFiscal | null
  error: string | null
}> {
  try {
    const dataInicio = input.data_inicio_vigencia || new Date().toISOString().split('T')[0]

    // Calcular a data final para as anteriores (um dia antes do novo início)
    const startDateObj = new Date(dataInicio + 'T00:00:00')
    const endDateObj = new Date(startDateObj.getTime() - 24 * 60 * 60 * 1000)
    const dataFimAnterior = endDateObj.toISOString().split('T')[0]

    // Inativar configurações ativas anteriores
    const { error: updateError } = await supabase
      .from('configuracoes_fiscais')
      .update({
        ativo: false,
        data_fim_vigencia: dataFimAnterior,
        atualizado_em: new Date().toISOString(),
      })
      .eq('ativo', true)

    if (updateError) throw updateError

    // Criar nova configuração ativa
    const { data, error: insertError } = await supabase
      .from('configuracoes_fiscais')
      .insert({
        regime_tributario: input.regime_tributario,
        data_inicio_vigencia: dataInicio,
        observacoes: input.observacoes ? input.observacoes.trim() : null,
        ativo: true,
      })
      .select()
      .single()

    if (insertError) throw insertError
    return { data: data as ConfiguracaoFiscal, error: null }
  } catch (err: any) {
    return { data: null, error: err.message || 'Erro ao alterar regime fiscal' }
  }
}

/**
 * Atualizar observações ou vigência da configuração atual
 */
export async function updateConfiguracaoFiscal(
  id: string,
  updates: { observacoes?: string | null; data_inicio_vigencia?: string },
): Promise<{
  data: ConfiguracaoFiscal | null
  error: string | null
}> {
  try {
    const payload: any = {
      atualizado_em: new Date().toISOString(),
    }
    if (updates.observacoes !== undefined)
      payload.observacoes = updates.observacoes ? updates.observacoes.trim() : null
    if (updates.data_inicio_vigencia !== undefined)
      payload.data_inicio_vigencia = updates.data_inicio_vigencia

    const { data, error } = await supabase
      .from('configuracoes_fiscais')
      .update(payload)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return { data: data as ConfiguracaoFiscal, error: null }
  } catch (err: any) {
    return { data: null, error: err.message || 'Erro ao atualizar observações fiscais' }
  }
}

// -------------------------------------------------------------
// SERVIÇOS: ALÍQUOTAS FISCAIS
// -------------------------------------------------------------

/**
 * Listar alíquotas fiscais por regime tributário
 * @param regime Regime tributário a filtrar (ou null para todos)
 * @param includeInactive se true traz inativos também
 */
export async function fetchAliquotasFiscais(
  regime?: RegimeTributario | string | null,
  includeInactive = false,
): Promise<{
  data: AliquotaFiscal[] | null
  error: string | null
}> {
  try {
    let query = supabase
      .from('aliquotas_fiscais')
      .select('*')
      .order('nome_imposto', { ascending: true })
      .order('criado_em', { ascending: true })

    if (regime) {
      query = query.eq('regime_tributario', regime)
    }
    if (!includeInactive) {
      query = query.eq('ativo', true)
    }

    const { data, error } = await query
    if (error) throw error
    return { data: (data as AliquotaFiscal[]) || [], error: null }
  } catch (err: any) {
    return { data: null, error: err.message || 'Erro ao carregar alíquotas fiscais' }
  }
}

/**
 * Criar nova alíquota fiscal
 */
export async function createAliquotaFiscal(input: CreateAliquotaFiscalInput): Promise<{
  data: AliquotaFiscal | null
  error: string | null
}> {
  try {
    const { data, error } = await supabase
      .from('aliquotas_fiscais')
      .insert({
        regime_tributario: input.regime_tributario,
        nome_imposto: input.nome_imposto.trim(),
        aliquota_percentual: Number(input.aliquota_percentual) || 0,
        base_calculo_percentual:
          input.base_calculo_percentual !== undefined && input.base_calculo_percentual !== null
            ? Number(input.base_calculo_percentual)
            : 100.0,
        data_inicio_vigencia: input.data_inicio_vigencia || new Date().toISOString().split('T')[0],
        data_fim_vigencia: input.data_fim_vigencia || null,
        descricao: input.descricao ? input.descricao.trim() : null,
        ativo: input.ativo !== undefined ? input.ativo : true,
      })
      .select()
      .single()

    if (error) throw error
    return { data: data as AliquotaFiscal, error: null }
  } catch (err: any) {
    return { data: null, error: err.message || 'Erro ao criar alíquota fiscal' }
  }
}

/**
 * Atualizar alíquota fiscal
 */
export async function updateAliquotaFiscal(
  id: string,
  updates: UpdateAliquotaFiscalInput,
): Promise<{
  data: AliquotaFiscal | null
  error: string | null
}> {
  try {
    const payload: any = {
      atualizado_em: new Date().toISOString(),
    }
    if (updates.regime_tributario !== undefined)
      payload.regime_tributario = updates.regime_tributario
    if (updates.nome_imposto !== undefined) payload.nome_imposto = updates.nome_imposto.trim()
    if (updates.aliquota_percentual !== undefined)
      payload.aliquota_percentual = Number(updates.aliquota_percentual) || 0
    if (updates.base_calculo_percentual !== undefined)
      payload.base_calculo_percentual =
        updates.base_calculo_percentual !== null ? Number(updates.base_calculo_percentual) : 100.0
    if (updates.data_inicio_vigencia !== undefined)
      payload.data_inicio_vigencia = updates.data_inicio_vigencia
    if (updates.data_fim_vigencia !== undefined)
      payload.data_fim_vigencia = updates.data_fim_vigencia || null
    if (updates.descricao !== undefined)
      payload.descricao = updates.descricao ? updates.descricao.trim() : null
    if (updates.ativo !== undefined) payload.ativo = updates.ativo

    const { data, error } = await supabase
      .from('aliquotas_fiscais')
      .update(payload)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return { data: data as AliquotaFiscal, error: null }
  } catch (err: any) {
    return { data: null, error: err.message || 'Erro ao atualizar alíquota fiscal' }
  }
}

/**
 * Inativar/Reativar alíquota fiscal (SEM exclusão destrutiva)
 */
export async function setAliquotaFiscalAtiva(
  id: string,
  ativo: boolean,
): Promise<{
  data: AliquotaFiscal | null
  error: string | null
}> {
  return updateAliquotaFiscal(id, { ativo })
}
