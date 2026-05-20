export interface NormalizedMaterial {
  descricao_original: string
  tipo_material: string
  cor: string | null
  codigo_cor: string | null
  acabamento: string | null
  espessura_mm: number | null
  largura_mm: number | null
  comprimento_m: number | null
  marca: string | null
  material: string | null
  atributos_extras?: Record<string, any>
}

export interface ComparisonResult {
  status: 'EQUIVALENTE' | 'NAO_EQUIVALENTE' | 'INCERTO'
  confianca: 'ALTA' | 'MEDIA' | 'BAIXA'
  justificativa: string
  divergencias: string[]
  recomendacao: string
}

function normalizeString(s: string | null | undefined): string {
  if (!s) return ''
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

export function compareMaterials(m1: NormalizedMaterial, m2: NormalizedMaterial): ComparisonResult {
  const divergencias: string[] = []
  let status: ComparisonResult['status'] = 'EQUIVALENTE'
  let confianca: ComparisonResult['confianca'] = 'ALTA'

  const t1 = normalizeString(m1.tipo_material)
  const t2 = normalizeString(m2.tipo_material)

  // 1. Tipo Material
  if (t1 !== t2 && t1 && t2) {
    divergencias.push(`Tipo de material diferente (${m1.tipo_material} vs ${m2.tipo_material})`)
    return {
      status: 'NAO_EQUIVALENTE',
      confianca: 'ALTA',
      justificativa: 'Tipos de materiais incompatíveis.',
      divergencias,
      recomendacao: 'Verifique a categoria do item no estoque.',
    }
  }

  // 2. Chapas (MDF, MDP, Compensado)
  if (['mdf', 'mdp', 'compensado', 'chapa', 'painel'].includes(t1)) {
    if (m1.espessura_mm && m2.espessura_mm && m1.espessura_mm !== m2.espessura_mm) {
      divergencias.push(`Espessura incompatível (${m1.espessura_mm}mm vs ${m2.espessura_mm}mm)`)
      status = 'NAO_EQUIVALENTE'
    }
  }

  // 3. Fita de Borda
  if (t1 === 'fita_de_borda' || t1.includes('fita')) {
    if (m1.largura_mm && m2.largura_mm) {
      const diff = Math.abs(m1.largura_mm - m2.largura_mm)
      if (diff > 2) {
        divergencias.push(
          `Largura incompatível (${m1.largura_mm}mm vs ${m2.largura_mm}mm, tolerância: 2mm)`,
        )
        status = 'NAO_EQUIVALENTE'
      } else if (diff > 0) {
        divergencias.push(`Largura tem pequena variação (${m1.largura_mm}mm vs ${m2.largura_mm}mm)`)
        confianca = 'MEDIA'
      }
    }
  }

  // 4. Cor Compatibility
  if (m1.cor && m2.cor) {
    const c1 = normalizeString(m1.cor)
    const c2 = normalizeString(m2.cor)
    const brancos = ['branco', 'branco nevado', 'off-white', 'off white', 'neve', 'white']
    const pretos = ['preto', 'grafite', 'noir', 'black']

    const isBranco1 = brancos.some((b) => c1.includes(b))
    const isBranco2 = brancos.some((b) => c2.includes(b))
    const isPreto1 = pretos.some((p) => c1.includes(p))
    const isPreto2 = pretos.some((p) => c2.includes(p))

    if (isBranco1 && isBranco2) {
      // compatível
    } else if (isPreto1 && isPreto2) {
      // compatível
    } else if (c1 !== c2 && !c1.includes(c2) && !c2.includes(c1)) {
      divergencias.push(`Cores parecem ser incompatíveis (${m1.cor} vs ${m2.cor})`)
      if (status === 'EQUIVALENTE') {
        status = 'INCERTO'
        confianca = 'BAIXA'
      }
    }
  }

  // 5. Acabamento
  if (m1.acabamento && m2.acabamento) {
    const a1 = normalizeString(m1.acabamento)
    const a2 = normalizeString(m2.acabamento)
    const liso = ['liso', 'bp', 'branco perolizado', 'matte']
    const textura = ['texturizado', 'tx', 'textura', 'rugoso']

    const isLiso1 = liso.some((l) => a1.includes(l))
    const isLiso2 = liso.some((l) => a2.includes(l))
    const isTex1 = textura.some((t) => a1.includes(t))
    const isTex2 = textura.some((t) => a2.includes(t))

    if ((isLiso1 && isTex2) || (isTex1 && isLiso2)) {
      divergencias.push(`Acabamento divergente (${m1.acabamento} vs ${m2.acabamento})`)
      if (status === 'EQUIVALENTE') {
        status = 'INCERTO'
        confianca = 'BAIXA'
      }
    }
  }

  let justificativa = ''
  let recomendacao = ''

  if (status === 'EQUIVALENTE') {
    justificativa = 'Atributos principais (tipo, medidas, cor) idênticos ou compatíveis.'
    recomendacao = 'Material sugerido para conciliação automática.'
    if (divergencias.length > 0) confianca = 'MEDIA'
  } else if (status === 'INCERTO') {
    justificativa = 'Diferenças nos atributos secundários detectadas.'
    recomendacao = 'Validação humana necessária (verifique cor/acabamento).'
  } else {
    justificativa = 'Divergências críticas (Tipo, Espessura ou Medidas maiores que a tolerância).'
    recomendacao = 'Material não compatível para substituição automática.'
  }

  return { status, confianca, justificativa, divergencias, recomendacao }
}

export function findBestMatch(
  listMaterial: NormalizedMaterial,
  stockItems: Array<{
    id: string
    nome: string
    quantidade: number
    metadados_normalizados?: NormalizedMaterial
  }>,
) {
  let bestMatch = null
  let bestScore = -1
  let bestResult: ComparisonResult | null = null

  const scoreMap = { EQUIVALENTE: 3, INCERTO: 1, NAO_EQUIVALENTE: 0 }
  const confMap = { ALTA: 2, MEDIA: 1, BAIXA: 0 }

  for (const stock of stockItems) {
    if (!stock.metadados_normalizados) continue

    const result = compareMaterials(listMaterial, stock.metadados_normalizados)
    const score = scoreMap[result.status] * 10 + confMap[result.confianca]

    let similarityBoost = 0
    if (normalizeString(stock.nome).includes(normalizeString(listMaterial.descricao_original)))
      similarityBoost += 2

    const totalScore = score + similarityBoost

    if (totalScore > bestScore && scoreMap[result.status] > 0) {
      bestScore = totalScore
      bestMatch = stock
      bestResult = result
    }
  }

  return { match: bestMatch, result: bestResult }
}
