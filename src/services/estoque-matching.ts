import { supabase } from '@/lib/supabase/client'
import { fetchAliases, upsertAliasesBatch } from './estoque-aliases'
import { normalizeDescription } from '@/lib/normalize'

export const CONFIDENCE_THRESHOLD = 85

export interface MatchedItem {
  _draftId?: string
  produto: string
  quantidade: number
  preco_unitario: number
  preco_total?: number
  preco_bruto?: number
  desconto?: number
  valor_unitario_bruto?: number
  unidade?: string
  categoria?: string
  metadados_normalizados: any
  status: 'matched' | 'pendente_revisao'
  item_id: string | null
  source: 'alias' | 'exact' | 'none' | 'manual'
  confianca: 'ALTA' | 'MEDIA' | 'BAIXA'
  score: number
}

export interface CustosEfetivosTotais {
  valor_produtos?: number
  valor_desconto?: number
  valor_frete?: number
  valor_seguro?: number
  valor_outras_despesas?: number
  valor_ipi?: number
  valor_st?: number
  valor_icms?: number
  valor_total_nota?: number
}

export interface ItemCustoEfetivoResult {
  _draftId?: string
  preco_unitario_liquido: number
  preco_total_liquido: number
  acrescimo_rateado: number
  preco_total_efetivo: number
  custo_efetivo_unitario: number
}

/**
 * Helper para rateio de frete, IPI, ST, seguro e outras despesas sobre o valor líquido dos itens.
 * Fórmula:
 * Acréscimos = vFrete + vIPI + vST + vSeguro + vOutrasDespesas − vDescGlobal (quando não houver vDesc por item);
 * Fator_i = preco_total_liquido_i / BaseTotal;
 * Acrescimo_Item_i = round(Acréscimos × Fator_i, 2);
 * Total Efetivo_i = líquido_i + acréscimo_i;
 * Custo efetivo unitário = Total Efetivo / quantidade.
 * Fechar centavos ajustando a diferença no item de MAIOR valor, de modo que a soma bata com vNF.
 *
 * Regras:
 * - Notas antigas sem totais: custo efetivo = líquido, sem erro.
 */
export function calcularCustosEfetivos(
  itens: Array<{
    _draftId?: string
    preco_total?: number
    preco_unitario?: number
    quantidade?: number
    desconto?: number
  }>,
  totais?: CustosEfetivosTotais | null,
): Map<string | number, ItemCustoEfetivoResult> {
  const result = new Map<string | number, ItemCustoEfetivoResult>()
  if (!itens || itens.length === 0) return result

  // Itens normalizados com valor líquido
  const itensCalculados = itens.map((it, idx) => {
    const qtd = Number(it.quantidade) || 1
    const pu = Number(it.preco_unitario) || 0
    const ptLiq =
      it.preco_total !== undefined ? Number(it.preco_total) : Math.round(qtd * pu * 100) / 100
    const key = it._draftId || idx
    return {
      key,
      _draftId: it._draftId,
      quantidade: qtd,
      preco_unitario_liquido: pu,
      preco_total_liquido: ptLiq,
      hasDescontoItem: it.desconto !== undefined && Number(it.desconto) > 0,
    }
  })

  // Se totais não foram informados ou não há acréscimos/totais
  if (
    !totais ||
    (!totais.valor_total_nota && !totais.valor_frete && !totais.valor_ipi && !totais.valor_st)
  ) {
    itensCalculados.forEach((item) => {
      const puEfetivo =
        item.quantidade > 0
          ? Math.round((item.preco_total_liquido / item.quantidade) * 10000) / 10000
          : item.preco_unitario_liquido
      result.set(item.key, {
        _draftId: item._draftId,
        preco_unitario_liquido: item.preco_unitario_liquido,
        preco_total_liquido: item.preco_total_liquido,
        acrescimo_rateado: 0,
        preco_total_efetivo: item.preco_total_liquido,
        custo_efetivo_unitario: puEfetivo,
      })
    })
    return result
  }

  const vFrete = Number(totais.valor_frete) || 0
  const vIPI = Number(totais.valor_ipi) || 0
  const vST = Number(totais.valor_st) || 0
  const vSeguro = Number(totais.valor_seguro) || 0
  const vOutrasDespesas = Number(totais.valor_outras_despesas) || 0

  // Se os itens NÃO têm desconto discriminado, mas o cabeçalho tem vDesc, abate vDescGlobal
  const temDescontoNosItens = itensCalculados.some((it) => it.hasDescontoItem)
  const vDescGlobal = !temDescontoNosItens ? Number(totais.valor_desconto) || 0 : 0

  const acrescimosTotais =
    Math.round((vFrete + vIPI + vST + vSeguro + vOutrasDespesas - vDescGlobal) * 100) / 100

  const baseTotal = itensCalculados.reduce((acc, it) => acc + it.preco_total_liquido, 0)

  // Se não há acréscimos ou a base total é 0
  if (acrescimosTotais === 0 || baseTotal <= 0) {
    itensCalculados.forEach((item) => {
      const puEfetivo =
        item.quantidade > 0
          ? Math.round((item.preco_total_liquido / item.quantidade) * 10000) / 10000
          : item.preco_unitario_liquido
      result.set(item.key, {
        _draftId: item._draftId,
        preco_unitario_liquido: item.preco_unitario_liquido,
        preco_total_liquido: item.preco_total_liquido,
        acrescimo_rateado: 0,
        preco_total_efetivo: item.preco_total_liquido,
        custo_efetivo_unitario: puEfetivo,
      })
    })
    return result
  }

  // 1. Rateio proporcional
  let somaAcrescimosCalculados = 0
  const parciais = itensCalculados.map((item) => {
    const fator = item.preco_total_liquido / baseTotal
    const acrescimoItem = Math.round(acrescimosTotais * fator * 100) / 100
    somaAcrescimosCalculados += acrescimoItem
    return {
      ...item,
      acrescimoItem,
    }
  })

  // 2. Fechar centavos ajustando a diferença no item de MAIOR valor
  const diffCentavos = Math.round((acrescimosTotais - somaAcrescimosCalculados) * 100) / 100
  if (Math.abs(diffCentavos) > 0.0001 && parciais.length > 0) {
    let maiorIdx = 0
    let maiorValor = parciais[0].preco_total_liquido
    for (let i = 1; i < parciais.length; i++) {
      if (parciais[i].preco_total_liquido > maiorValor) {
        maiorValor = parciais[i].preco_total_liquido
        maiorIdx = i
      }
    }
    parciais[maiorIdx].acrescimoItem =
      Math.round((parciais[maiorIdx].acrescimoItem + diffCentavos) * 100) / 100
  }

  // 3. Montar resultado final
  parciais.forEach((item) => {
    const totalEfetivo = Math.max(
      0,
      Math.round((item.preco_total_liquido + item.acrescimoItem) * 100) / 100,
    )
    const custoEfetivoUnitario =
      item.quantidade > 0
        ? Math.round((totalEfetivo / item.quantidade) * 10000) / 10000
        : totalEfetivo

    result.set(item.key, {
      _draftId: item._draftId,
      preco_unitario_liquido: item.preco_unitario_liquido,
      preco_total_liquido: item.preco_total_liquido,
      acrescimo_rateado: item.acrescimoItem,
      preco_total_efetivo: totalEfetivo,
      custo_efetivo_unitario: custoEfetivoUnitario,
    })
  })

  return result
}

function normalizeString(s: string | null | undefined): string {
  return normalizeDescription(s)
}

function getCoreName(s: string): string {
  let n = normalizeString(s)
  n = n.replace(/^[0-9]+\s*(chapas?|pecas?|unidades?|un|m2|m|x)?\s*(de\s*)?/, '')
  return n.trim()
}

function checkAttributes(meta: any, item: any): boolean {
  if (meta?.espessura_mm && item.espessura_mm) {
    if (Number(meta.espessura_mm) !== Number(item.espessura_mm)) return false
  }
  if (meta?.largura_mm && item.largura_mm) {
    if (Number(meta.largura_mm) !== Number(item.largura_mm)) return false
  }
  if (meta?.cor && item.cor) {
    const mc = normalizeString(meta.cor)
    const ic = normalizeString(item.cor)
    if (mc !== ic && !mc.includes(ic) && !ic.includes(mc)) return false
  }
  if (meta?.marca && item.marca) {
    const mm = normalizeString(meta.marca)
    const im = normalizeString(item.marca)
    if (mm !== im && !mm.includes(im) && !im.includes(mm)) return false
  }
  return true
}

function calculateSimilarityScore(nome: string, meta: any, item: any): number {
  let score = 0
  const maxScore = 100

  const coreNorm = normalizeString(meta?.nome_padronizado || nome)
  const itemNorm = normalizeString(item.nome)

  if (coreNorm === itemNorm) {
    score += 45
  } else if (coreNorm && (coreNorm.includes(itemNorm) || itemNorm.includes(coreNorm))) {
    score += 35
  } else {
    const coreOcr = getCoreName(nome)
    const itemCore = getCoreName(item.nome)
    if (coreOcr === itemCore && coreOcr.length > 5) {
      score += 30
    } else if (coreOcr.length > 5 && (coreOcr.includes(itemCore) || itemCore.includes(coreOcr))) {
      score += 20
    } else {
      return 0
    }
  }

  if (meta?.espessura_mm && item.espessura_mm) {
    if (Number(meta.espessura_mm) === Number(item.espessura_mm)) {
      score += 15
    } else {
      score -= 20
    }
  } else if (meta?.espessura_mm || item.espessura_mm) {
    score += 5
  }

  if (meta?.cor && item.cor) {
    const mc = normalizeString(meta.cor)
    const ic = normalizeString(item.cor)
    if (mc === ic) {
      score += 20
    } else if (mc.includes(ic) || ic.includes(mc)) {
      score += 12
    } else {
      score -= 15
    }
  } else if (meta?.cor || item.cor) {
    score += 8
  }

  if (meta?.marca && item.marca) {
    const mm = normalizeString(meta.marca)
    const im = normalizeString(item.marca)
    if (mm === im) {
      score += 20
    } else if (mm.includes(im) || im.includes(mm)) {
      score += 10
    } else {
      score -= 10
    }
  } else if (meta?.marca || item.marca) {
    score += 8
  }

  return Math.max(0, Math.min(maxScore, score))
}

export async function normalizeItems(descricoes: string[]): Promise<any[]> {
  if (!descricoes || descricoes.length === 0) return []
  const { data, error } = await supabase.functions.invoke('material-normalization', {
    body: { action: 'normalize_batch', items: descricoes },
  })
  if (error) {
    console.error('Normalization failed:', error)
    return descricoes.map(() => ({}))
  }
  return data?.results || descricoes.map(() => ({}))
}

export async function matchInvoiceItems(
  ocrItems: any[],
  existingItems: any[],
): Promise<MatchedItem[]> {
  if (!ocrItems || ocrItems.length === 0) return []

  const descricoes = ocrItems.map((i) => i.produto || i.nome || 'Item sem descrição')

  const aliasesRaw = await fetchAliases(descricoes)
  const aliasesMap = new Map<string, string>()
  aliasesRaw.forEach((a) => {
    if (a.estoque_itens) {
      aliasesMap.set(a.descricao_nota, a.item_id)
      const norm = normalizeDescription(a.descricao_nota)
      if (norm) aliasesMap.set(norm, a.item_id)
    }
  })

  const normalizedResults = await normalizeItems(descricoes)

  return ocrItems.map((item, idx): MatchedItem => {
    const nome = item.produto || item.nome || ''
    const meta = normalizedResults[idx] || {}
    const qtd = Number(item.quantidade) || 1
    const precoUnitario = Number(item.preco_unitario) || 0
    const precoTotal =
      item.preco_total !== undefined
        ? Number(item.preco_total)
        : Math.round(qtd * precoUnitario * 100) / 100
    const unidade = item.unidade || meta?.unidade || 'un'
    const categoria = item.categoria || meta?.categoria || ''
    const draftId =
      item._draftId ||
      (typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `draft-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`)

    const base = {
      _draftId: draftId,
      produto: nome,
      quantidade: qtd,
      preco_unitario: precoUnitario,
      preco_total: precoTotal,
      preco_bruto: item.preco_bruto !== undefined ? Number(item.preco_bruto) : undefined,
      desconto: item.desconto !== undefined ? Number(item.desconto) : undefined,
      valor_unitario_bruto:
        item.valor_unitario_bruto !== undefined ? Number(item.valor_unitario_bruto) : undefined,
      unidade,
      categoria,
      metadados_normalizados: meta,
    }

    const aliasItemId = aliasesMap.get(nome) || aliasesMap.get(normalizeDescription(nome))
    if (aliasItemId) {
      const matched = existingItems.find((i) => i.id === aliasItemId)
      if (matched) {
        return {
          ...base,
          status: 'matched',
          item_id: matched.id,
          source: 'alias',
          confianca: 'ALTA',
          score: 100,
        }
      }
    }

    let bestMatch: any = null
    let bestScore = 0

    if (meta?.nome_padronizado) {
      for (const existing of existingItems) {
        if (!checkAttributes(meta, existing)) continue
        const score = calculateSimilarityScore(nome, meta, existing)
        if (score > bestScore) {
          bestScore = score
          bestMatch = existing
        }
      }

      if (!bestMatch) {
        const coreOcr = getCoreName(nome)
        if (coreOcr.length > 5) {
          for (const existing of existingItems) {
            const iCore = getCoreName(existing.nome)
            if (iCore === coreOcr && checkAttributes(meta, existing)) {
              const score = 70
              if (score > bestScore) {
                bestScore = score
                bestMatch = existing
              }
            }
          }
        }
      }
    }

    if (bestMatch && bestScore >= CONFIDENCE_THRESHOLD) {
      const confianca = bestScore >= 95 ? 'ALTA' : 'MEDIA'
      return {
        ...base,
        status: 'matched',
        item_id: bestMatch.id,
        source: 'exact',
        confianca,
        score: bestScore,
      }
    }

    if (bestMatch && bestScore >= 60) {
      return {
        ...base,
        status: 'pendente_revisao',
        item_id: bestMatch.id,
        source: 'exact',
        confianca: 'BAIXA',
        score: bestScore,
      }
    }

    return {
      ...base,
      status: 'pendente_revisao',
      item_id: null,
      source: 'none',
      confianca: 'BAIXA',
      score: bestScore,
    }
  })
}

export async function persistAutoMatchedAliases(
  matchedItems: MatchedItem[],
  userId?: string,
): Promise<void> {
  const toSave = matchedItems.filter(
    (i) => i.status === 'matched' && i.item_id && i.source !== 'alias',
  )
  if (toSave.length === 0) return
  await upsertAliasesBatch(
    toSave.map((i) => ({
      descricao_nota: i.produto,
      item_id: i.item_id as string,
      usuario_id: userId ?? null,
    })),
  )
}
