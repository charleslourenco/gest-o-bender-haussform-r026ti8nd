import { supabase } from '@/lib/supabase/client'

export const fetchClientes = async () => {
  const { data, error } = await supabase.from('clientes').select('id, nome').order('nome')
  if (error) throw error
  return data
}

export const searchEstoqueItens = async (query: string) => {
  if (!query) return []
  const { data, error } = await supabase
    .from('estoque_itens')
    .select('id, nome, valor_unitario, categoria, unidade')
    .ilike('nome', `%${query}%`)
    .limit(20)
  if (error) throw error
  return data
}

export const saveOrcamento = async (orcamentoData: any, itensData: any[]) => {
  const { data: orcamento, error: orcError } = await supabase
    .from('orcamentos')
    .insert([
      {
        ...orcamentoData,
        data_criacao: new Date().toISOString(),
        data_atualizacao: new Date().toISOString(),
        status: 'Rascunho',
      },
    ])
    .select()
    .single()

  if (orcError) throw orcError

  const itens = itensData.map((item) => ({
    orcamento_id: orcamento.id,
    estoque_item_id: item.estoque_item_id,
    quantidade: item.quantidade,
    preco_custo: item.preco_custo,
    preco_venda: item.preco_venda,
    data_criacao: new Date().toISOString(),
  }))

  const { error: itensError } = await supabase.from('itens_orcamento').insert(itens)

  if (itensError) throw itensError

  return orcamento
}
