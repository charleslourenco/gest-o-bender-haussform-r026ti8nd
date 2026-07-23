import { supabase } from '@/lib/supabase/client'
import { saveAlias } from './estoque-aliases'

export interface UnifiedItemData {
  nome: string
  marca: string
  cor: string
  espessura_mm: string
  largura_mm: string
  comprimento_m: string
  fornecedor: string
  unidade: string
  valor_unitario: number
  quantidade: number
  categoria: string
  classe: string
  grupo: string
}

export interface SaveUnifiedItemParams {
  data: UnifiedItemData
  notaId: string
  mode: 'create' | 'edit'
  realIdx?: number
  ocrProduto?: string
  lembrar?: boolean
  userId?: string
}

function normalizeString(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

export async function saveUnifiedItem(
  params: SaveUnifiedItemParams,
): Promise<{ error: string | null }> {
  const { data, notaId, mode, realIdx, ocrProduto, lembrar, userId } = params

  try {
    const { data: existing } = await supabase.from('estoque_itens').select('id, nome, quantidade')

    const exactMatch = (existing || []).find(
      (i) => normalizeString(i.nome) === normalizeString(data.nome),
    )

    let itemId: string

    const stockFields = {
      nome: data.nome,
      marca: data.marca || null,
      cor: data.cor || null,
      espessura_mm: data.espessura_mm ? Number(data.espessura_mm) : null,
      largura_mm: data.largura_mm ? Number(data.largura_mm) : null,
      comprimento_m: data.comprimento_m ? Number(data.comprimento_m) : null,
      fornecedor: data.fornecedor || null,
      unidade: data.unidade,
      valor_unitario: Number(data.valor_unitario),
      categoria: data.categoria || null,
      classe: data.classe || null,
      grupo: data.grupo || null,
    }

    if (exactMatch) {
      const { error } = await supabase
        .from('estoque_itens')
        .update({
          ...stockFields,
          quantidade: Number(exactMatch.quantidade) + Number(data.quantidade),
          atualizado_em: new Date().toISOString(),
        })
        .eq('id', exactMatch.id)
      if (error) return { error: error.message }
      itemId = exactMatch.id
    } else {
      const { data: inserted, error } = await supabase
        .from('estoque_itens')
        .insert({
          ...stockFields,
          quantidade: Number(data.quantidade),
          atualizado_em: new Date().toISOString(),
        })
        .select('id')
        .single()
      if (error) return { error: error.message }
      itemId = inserted.id
    }

    await supabase.from('estoque_movimentacoes').insert({
      item_id: itemId,
      nota_fiscal_id: notaId,
      tipo: 'entrada',
      quantidade: Number(data.quantidade),
      usuario_id: userId || null,
    })

    const { data: existingItemNF } = await supabase
      .from('itens_nota_fiscal')
      .select('id')
      .eq('nota_fiscal_id', notaId)
      .eq('nome_produto', data.nome)
      .maybeSingle()

    const nfFields = {
      produto_id: itemId,
      nome_produto: data.nome,
      quantidade: Number(data.quantidade),
      unidade: data.unidade,
      valor_unitario: Number(data.valor_unitario),
    }

    if (existingItemNF) {
      await supabase.from('itens_nota_fiscal').update(nfFields).eq('id', existingItemNF.id)
    } else {
      await supabase.from('itens_nota_fiscal').insert({ nota_fiscal_id: notaId, ...nfFields })
    }

    const { data: notaData } = await supabase
      .from('notas_fiscais')
      .select('dados_ocr')
      .eq('id', notaId)
      .single()

    if (notaData?.dados_ocr) {
      const itens: any[] = [...(notaData.dados_ocr.itens || [])]

      if (mode === 'edit' && realIdx !== undefined && realIdx >= 0 && realIdx < itens.length) {
        itens[realIdx] = {
          ...itens[realIdx],
          status: 'matched',
          item_id: itemId,
          source: 'manual',
        }
      } else {
        itens.push({
          produto: data.nome,
          quantidade: Number(data.quantidade),
          preco_unitario: Number(data.valor_unitario),
          metadados_normalizados: {},
          status: 'matched',
          item_id: itemId,
          source: 'manual',
          confianca: 'ALTA',
          score: 100,
        })
      }

      const stillPending = itens.filter((i) => i.status === 'pendente_revisao').length
      const novoStatus = stillPending === 0 ? 'conciliado' : 'pendente_revisao'

      await supabase
        .from('notas_fiscais')
        .update({
          dados_ocr: { ...notaData.dados_ocr, itens },
          status_reconciliacao: novoStatus,
        })
        .eq('id', notaId)
    }

    if (mode === 'edit' && lembrar && ocrProduto) {
      await saveAlias(ocrProduto, itemId, userId)
    }

    return { error: null }
  } catch (e: any) {
    return { error: e.message }
  }
}
