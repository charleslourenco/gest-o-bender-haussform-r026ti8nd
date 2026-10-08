import { supabase } from '@/lib/supabase/client'

export interface EstoqueSobra {
  id: string
  nome: string
  largura: number
  altura: number
  area: number
  status: 'disponivel' | 'usado'
  criado_em: string
  marca?: string | null
  cliente_nome?: string | null
  espessura?: number | null
  usado_em?: string | null
  tipo?: string | null
  item_id?: string | null
  comprimento?: number | null
  baixado_por?: string | null
  canal_baixa?: 'manual' | 'qr' | string | null
  restaurado_em?: string | null
  restaurado_por?: string | null
}

export async function baixarSobra(params: {
  sobraId: string
  canal: 'manual' | 'qr'
  usuarioId?: string | null
}): Promise<{ error: any }> {
  const agora = new Date().toISOString()

  // 1. Atualizar estoque_sobras (operação principal na tabela estoque_sobras)
  const { error } = await supabase
    .from('estoque_sobras' as any)
    .update({
      status: 'usado',
      usado_em: agora,
      baixado_por: params.usuarioId || null,
      canal_baixa: params.canal,
    })
    .eq('id', params.sobraId)

  if (error) {
    return { error }
  }

  // 2. Registrar no histórico de sobras (não bloqueante se falhar)
  try {
    await supabase.from('sobras_historico' as any).insert({
      sobra_id: params.sobraId,
      acao: 'baixa',
      canal: params.canal,
      usuario_id: params.usuarioId || null,
    })
  } catch (err) {
    console.warn('Falha ao gravar histórico de baixa da sobra:', err)
  }

  return { error: null }
}

export async function restaurarSobra(params: {
  sobraId: string
  usuarioId?: string | null
}): Promise<{ error: any }> {
  const agora = new Date().toISOString()

  // 1. Limpa usado_em e volta para disponivel, gravando restaurado_em (isolado em estoque_sobras)
  const { error } = await supabase
    .from('estoque_sobras' as any)
    .update({
      status: 'disponivel',
      usado_em: null,
      restaurado_em: agora,
      restaurado_por: params.usuarioId || null,
    })
    .eq('id', params.sobraId)

  if (error) {
    return { error }
  }

  // 2. Registrar no histórico de eventos (rastreabilidade permanente)
  try {
    await supabase.from('sobras_historico' as any).insert({
      sobra_id: params.sobraId,
      acao: 'restauracao',
      canal: 'manual',
      usuario_id: params.usuarioId || null,
    })
  } catch (err) {
    console.warn('Falha ao gravar histórico de restauração da sobra:', err)
  }

  return { error: null }
}
