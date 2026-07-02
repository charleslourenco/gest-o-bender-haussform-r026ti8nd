import { supabase } from '@/lib/supabase/client'
import { fetchAliases } from './estoque-aliases'

export interface MatchedItem {
  produto: string
  quantidade: number
  preco_unitario: number
  metadados_normalizados: any
  status: 'matched' | 'pendente_revisao'
  item_id: string | null
  source: 'alias' | 'exact' | 'none'
  confianca: 'ALTA' | 'MEDIA' | 'BAIXA'
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

    // 1. Alias exact match (user-defined memory)
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
        }
      }
    }

    // 2. Exact match on normalized name + primary attributes
    if (meta?.nome_padronizado) {
      const coreNorm = normalizeString(meta.nome_padronizado)
      const exact = existingItems.find(
        (i) => normalizeString(i.nome) === coreNorm && checkAttributes(meta, i),
      )
      if (exact) {
        return { ...base, status: 'matched', item_id: exact.id, source: 'exact', confianca: 'ALTA' }
      }

      const coreOcr = getCoreName(nome)
      if (coreOcr.length > 5) {
        const coreMatch = existingItems.find((i) => {
          const iCore = getCoreName(i.nome)
          return iCore === coreOcr && checkAttributes(meta, i)
        })
        if (coreMatch) {
          return {
            ...base,
            status: 'matched',
            item_id: coreMatch.id,
            source: 'exact',
            confianca: 'MEDIA',
          }
        }
      }
    }

    // 3. No reliable match — pending review
    return {
      ...base,
      status: 'pendente_revisao',
      item_id: null,
      source: 'none',
      confianca: 'BAIXA',
    }
  })
}
