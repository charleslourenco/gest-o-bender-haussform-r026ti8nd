import { supabase } from '@/lib/supabase/client'
import { fetchAliases } from './estoque-aliases'

export const CONFIDENCE_THRESHOLD = 85

export interface MatchedItem {
  produto: string
  quantidade: number
  preco_unitario: number
  metadados_normalizados: any
  status: 'matched' | 'pendente_revisao'
  item_id: string | null
  source: 'alias' | 'exact' | 'none'
  confianca: 'ALTA' | 'MEDIA' | 'BAIXA'
  score: number
}

function normalizeString(s: string | null | undefined): string {
  if (!s) return ''
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
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
    if (a.estoque_itens) aliasesMap.set(a.descricao_nota, a.item_id)
  })

  const normalizedResults = await normalizeItems(descricoes)

  return ocrItems.map((item, idx): MatchedItem => {
    const nome = item.produto || item.nome || ''
    const meta = normalizedResults[idx] || {}
    const qtd = Number(item.quantidade) || 1
    const precoUnitario = Number(item.preco_unitario) || 0

    const base = {
      produto: nome,
      quantidade: qtd,
      preco_unitario: precoUnitario,
      metadados_normalizados: meta,
    }

    const aliasItemId = aliasesMap.get(nome)
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
