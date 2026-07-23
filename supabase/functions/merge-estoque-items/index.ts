import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, x-supabase-client-platform, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Sem cabeçalho de autorização')

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) throw new Error('Não autorizado')

    const body = await req.json()
    const { master_id, duplicate_ids } = body

    if (!master_id || !Array.isArray(duplicate_ids) || duplicate_ids.length === 0) {
      throw new Error('Parâmetros inválidos: master_id e duplicate_ids são obrigatórios.')
    }
    if (duplicate_ids.includes(master_id)) {
      throw new Error('O item mestre não pode estar na lista de duplicados.')
    }

    const { data: masterItem, error: masterError } = await supabaseAdmin
      .from('estoque_itens')
      .select('id, nome, quantidade')
      .eq('id', master_id)
      .single()
    if (masterError || !masterItem) throw new Error('Item mestre não encontrado.')

    const { data: dupItems, error: dupError } = await supabaseAdmin
      .from('estoque_itens')
      .select('id, nome, quantidade')
      .in('id', duplicate_ids)
    if (dupError) throw dupError
    if (!dupItems || dupItems.length !== duplicate_ids.length) {
      throw new Error('Um ou mais itens duplicados não foram encontrados.')
    }

    const sumQty = dupItems.reduce((acc, d) => acc + Number(d.quantidade || 0), 0)
    const finalQuantity = Number(masterItem.quantidade || 0) + sumQty

    let migratedRecords = 0

    const tables: Array<{ table: string; column: string }> = [
      { table: 'estoque_movimentacoes', column: 'item_id' },
      { table: 'estoque_alocacoes', column: 'item_id' },
      { table: 'itens_nota_fiscal', column: 'produto_id' },
      { table: 'estoque_sobras', column: 'item_id' },
      { table: 'estoque_caixas_itens', column: 'item_id' },
      { table: 'estoque_item_aliases', column: 'item_id' },
      { table: 'pedidos_compra_itens', column: 'item_id' },
    ]

    for (const { table, column } of tables) {
      const { error: updError } = await supabaseAdmin
        .from(table)
        .update({ [column]: master_id })
        .in(column, duplicate_ids)

      if (updError) {
        throw new Error(`Falha ao migrar ${table}: ${updError.message}`)
      }
    }

    const { error: updateMasterError } = await supabaseAdmin
      .from('estoque_itens')
      .update({
        quantidade: finalQuantity,
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', master_id)
    if (updateMasterError) throw updateMasterError

    const { error: deleteError } = await supabaseAdmin
      .from('estoque_itens')
      .delete()
      .in('id', duplicate_ids)
    if (deleteError) throw deleteError

    migratedRecords = dupItems.length

    return new Response(
      JSON.stringify({
        success: true,
        master_id,
        final_quantity: finalQuantity,
        migrated_records: migratedRecords,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error: any) {
    console.error('Erro na função merge-estoque-items:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
