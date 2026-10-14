/**
 * Parser determinístico de DANFE em PDF eletrônico (Camada 1).
 * Não depende de IA nem de chamadas externas de rede.
 *
 * Utiliza o texto extraído da camada vetorial do PDF para extrair:
 * - Cabeçalho: Chave de acesso, número da nota, emitente/CNPJ, data de emissão, totais
 * - Itens: Código, descrição (com multilinhas), NCM, CST, CFOP, UN, quantidade, v_unit, v_desc, v_total
 * - Validação matemática: Soma(v_total dos itens) == valor_produtos com tolerância de R$ 0,05
 */

export interface ParsedDanfeItem {
  _draftId?: string
  codigo_produto: string
  produto: string
  ncm: string
  cst?: string
  cfop?: string
  unidade: string
  quantidade: number
  preco_unitario: number
  preco_bruto?: number
  desconto?: number
  preco_total: number
  confianca: 'ALTA' | 'MEDIA' | 'BAIXA'
  source: 'texto_pdf' | 'ia' | 'manual'
  status: 'matched' | 'pendente_revisao'
  item_id: null
  score: number
  categoria?: string
}

export interface ParsedDanfeTotais {
  base_calculo_icms?: number
  valor_icms?: number
  base_calculo_st?: number
  valor_st?: number
  valor_produtos: number
  valor_frete?: number
  valor_seguro?: number
  valor_desconto?: number
  valor_outras_despesas?: number
  valor_ipi?: number
  valor_total_nota: number
}

export interface ParsedDanfeResult {
  sucesso: boolean
  motivo_falha?: string
  numero_nota?: string
  chave_acesso?: string
  cnpj_emitente?: string
  fornecedor?: string
  data_emissao?: string // YYYY-MM-DD sem fuso
  totais?: ParsedDanfeTotais
  valor: number // Total da nota
  itens: ParsedDanfeItem[]
  camada_utilizada: 'camada_1_texto_pdf'
  confianca: 'ALTA'
  soma_bateu: boolean
  diferenca_soma: number
}

/**
 * Converte valor em formato monetário/numérico brasileiro ("1.642,89" ou "6,0000" ou "1642.89") para number.
 */
export function parseBrazilianNumber(valStr: string | number | undefined | null): number {
  if (valStr === undefined || valStr === null) return 0
  if (typeof valStr === 'number') return isNaN(valStr) ? 0 : valStr

  let s = String(valStr).trim()
  if (!s) return 0

  // Se vier com pontos e vírgulas: "1.642,89" -> "1642.89"
  if (s.includes(',') && s.includes('.')) {
    s = s.replace(/\./g, '').replace(',', '.')
  } else if (s.includes(',')) {
    // "1642,89"
    s = s.replace(',', '.')
  }

  const num = parseFloat(s)
  return isNaN(num) ? 0 : num
}

/**
 * Normaliza data em formato dd/mm/aaaa para YYYY-MM-DD puro.
 */
export function parseBrazilianDateToIso(dateStr: string): string | null {
  if (!dateStr) return null
  const match = dateStr.trim().match(/(\d{2})\/(\d{2})\/(\d{4})/)
  if (!match) return null
  const [, dia, mes, ano] = match
  return `${ano}-${mes}-${dia}`
}

/**
 * Identifica se o texto possui as características mínimas de uma DANFE eletrônica.
 */
export function isDanfeText(text: string): boolean {
  if (!text || text.length < 200) return false
  const upper = text.toUpperCase()
  return (
    upper.includes('DANFE') ||
    upper.includes('DOCUMENTO AUXILIAR DA NOTA FISCAL') ||
    upper.includes('DADOS DO PRODUTO') ||
    upper.includes('DADOS DOS PRODUTOS')
  )
}

/**
 * Regex dos itens da DANFE segundo a especificação:
 * CÓDIGO DESCRIÇÃO NCM(8 dígitos) CST(3-4) CFOP(4) UN QUANTIDADE V_UNIT V_DESC V_TOTAL
 */
const ITEM_REGEX =
  /^(\S+)\s+(.+?)\s+(\d{8})\s+(\d{3,4})\s+(\d{4})\s+([A-Za-z]{1,4})\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)(.*)$/

/**
 * Alternativa quando V_DESC não está presente na linha ou colunas variam:
 * CÓDIGO DESCRIÇÃO NCM(8) CST(3-4) CFOP(4) UN QUANTIDADE V_UNIT V_TOTAL
 */
const ITEM_REGEX_SEM_DESC =
  /^(\S+)\s+(.+?)\s+(\d{8})\s+(\d{3,4})\s+(\d{4})\s+([A-Za-z]{1,4})\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)(.*)$/

/**
 * Parser determinístico que processa linhas do texto de um PDF de DANFE.
 */
export function parseDanfeText(text: string): ParsedDanfeResult | null {
  if (!isDanfeText(text)) {
    return null
  }

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  // 1. Extração do cabeçalho
  // 1.1 Chave de acesso: 44 dígitos (podem ter espaços ou hífens a cada 4 dígitos)
  let chaveAcesso: string | undefined
  const chaveMatch = text.match(/\b(?:\d{4}[\s-]?){10}\d{4}\b/)
  if (chaveMatch) {
    const rawChave = chaveMatch[0].replace(/[\s-]/g, '')
    if (rawChave.length === 44) {
      chaveAcesso = rawChave
    }
  }

  // 1.2 Número da nota: após "Nº" ou "N°" ou "NF-e Nº"
  let numeroNota: string | undefined
  const nfeNumMatch = text.match(/(?:N[º°]|NF-e\s*N[º°]|N\.)\s*[:.]?\s*(\d{1,3}(?:\.\d{3})*|\d+)/i)
  if (nfeNumMatch) {
    numeroNota = nfeNumMatch[1].trim()
  } else if (chaveAcesso) {
    // Da chave de acesso: posições 25 a 34 (índice 25..34) correspondem ao número da nota
    const numFromChave = parseInt(chaveAcesso.substring(25, 34), 10)
    if (!isNaN(numFromChave) && numFromChave > 0) {
      numeroNota = String(numFromChave)
    }
  }

  // 1.3 CNPJ do emitente: primeiro CNPJ que aparece no documento ou após razão social
  let cnpjEmitente: string | undefined
  const cnpjMatches = text.match(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g)
  if (cnpjMatches && cnpjMatches.length > 0) {
    cnpjEmitente = cnpjMatches[0]
  }

  // 1.4 Fornecedor / Razão Social:
  let fornecedor: string | undefined
  // Se for GMAD conhecida no texto
  if (/GMAD\s+PLACAS/i.test(text)) {
    fornecedor = 'GMAD PLACAS'
  } else if (/CASA\s+DO\s+MDF/i.test(text)) {
    fornecedor = 'CASA DO MDF'
  } else {
    // Tentar linha antes de "DANFE" ou primeira linha não vazia que contenha razão social
    for (const line of lines.slice(0, 15)) {
      if (
        !line.includes('DANFE') &&
        !line.includes('DOCUMENTO AUXILIAR') &&
        !/^\d/.test(line) &&
        line.length > 3 &&
        !/RECEBEMOS\s+DE/i.test(line) &&
        !/IDENTIFICAÇÃO\s+DO\s+EMITENTE/i.test(line)
      ) {
        // Possível nome do emitente
        if (!fornecedor) fornecedor = line
      }
    }
  }

  // 1.5 Data de Emissão: campo DATA DA EMISSÃO (formato dd/mm/aaaa)
  let dataEmissao: string | undefined
  const dataEmissaoMatch =
    text.match(/DATA\s+D[AE]\s+EMISS[ÃA]O\s*[:.]?\s*(\d{2}\/\d{2}\/\d{4})/i) ||
    text.match(/EMISS[ÃA]O\s*[:.]?\s*(\d{2}\/\d{2}\/\d{4})/i) ||
    text.match(/(\d{2}\/\d{2}\/\d{4})/i)

  if (dataEmissaoMatch) {
    const iso = parseBrazilianDateToIso(dataEmissaoMatch[1])
    if (iso) dataEmissao = iso
  }

  // 1.6 Totais da DANFE:
  // Duas linhas de valores após "CÁLCULO DO IMPOSTO":
  // Linha 1 de totais: BASE CÁLC ICMS, VALOR ICMS, BASE CÁLC ST, VALOR ST, VALOR TOTAL PRODUTOS (5 valores)
  // Linha 2 de totais: VALOR FRETE, VALOR SEGURO, DESCONTO, OUTRAS DESP, VALOR IPI, VALOR TOTAL NOTA (6 valores)
  let baseCalculoIcmsLido = 0
  let valorIcmsLido = 0
  let baseCalculoStLido = 0
  let valorStLido = 0
  let valorProdutosLido = 0
  let valorFreteLido = 0
  let valorSeguroLido = 0
  let valorDescontoLido = 0
  let valorOutrasDespesasLido = 0
  let valorIpiLido = 0
  let valorNotaLido = 0

  // 1.6.1 Tentar capturar por regex de labels específicos
  const matchLabeled = (pattern: RegExp) => {
    const m = text.match(pattern)
    return m ? parseBrazilianNumber(m[1] || m[2]) : 0
  }

  valorProdutosLido = matchLabeled(
    /VALOR\s+TOTAL\s+DOS\s+PRODUTOS\s*[:.]?\s*R?\$?\s*([\d.,]+)|(?:V\.?\s*PRODUTOS?)\s*[:.]?\s*([\d.,]+)/i,
  )
  valorNotaLido = matchLabeled(
    /VALOR\s+TOTAL\s+DA\s+NOTA\s*[:.]?\s*R?\$?\s*([\d.,]+)|(?:V\.?\s*TOTAL\s*DA\s*NOTA)\s*[:.]?\s*([\d.,]+)/i,
  )
  valorFreteLido = matchLabeled(
    /VALOR\s+D[OE]\s+FRETE\s*[:.]?\s*R?\$?\s*([\d.,]+)|(?:V\.?\s*FRETE)\s*[:.]?\s*([\d.,]+)/i,
  )
  valorSeguroLido = matchLabeled(
    /VALOR\s+D[OE]\s+SEGURO\s*[:.]?\s*R?\$?\s*([\d.,]+)|(?:V\.?\s*SEG(?:URO)?)\s*[:.]?\s*([\d.,]+)/i,
  )
  valorDescontoLido = matchLabeled(
    /(?:VALOR\s+D[OE]\s+)?DESCONTO\s*[:.]?\s*R?\$?\s*([\d.,]+)|(?:V\.?\s*DESC)\s*[:.]?\s*([\d.,]+)/i,
  )
  valorOutrasDespesasLido = matchLabeled(
    /OUTRAS\s+DESPESAS(?:\s+ACESS[ÓO]RIAS)?\s*[:.]?\s*R?\$?\s*([\d.,]+)|(?:V\.?\s*OUTR(?:O|AS)?)\s*[:.]?\s*([\d.,]+)/i,
  )
  valorIpiLido = matchLabeled(
    /VALOR\s+TOTAL\s+D[OE]\s+IPI\s*[:.]?\s*R?\$?\s*([\d.,]+)|VALOR\s+D[OE]\s+IPI\s*[:.]?\s*R?\$?\s*([\d.,]+)|(?:V\.?\s*IPI)\s*[:.]?\s*([\d.,]+)/i,
  )
  valorStLido = matchLabeled(
    /VALOR\s+D[OE]\s+ICMS\s+ST\s*[:.]?\s*R?\$?\s*([\d.,]+)|VALOR\s+ST\s*[:.]?\s*R?\$?\s*([\d.,]+)|(?:V\.?\s*ST)\s*[:.]?\s*([\d.,]+)/i,
  )
  valorIcmsLido = matchLabeled(
    /VALOR\s+D[OE]\s+ICMS\s*[:.]?\s*R?\$?\s*([\d.,]+)|(?:V\.?\s*ICMS)\s*[:.]?\s*([\d.,]+)/i,
  )

  // 1.6.2 Se faltou valor_produtos ou valor_total_nota, busca por sequências de valores na seção CÁLCULO DO IMPOSTO
  const posCalculo = text.search(/C[AÁ]LCULO\s+DO\s+IMPOSTO/i)
  if (posCalculo >= 0) {
    const sub = text.substring(posCalculo, posCalculo + 1400)
    // Procurar números com vírgula no subtrecho
    const numberMatches = sub.match(/\b\d{1,3}(?:\.\d{3})*,\d{2}\b/g)
    if (numberMatches && numberMatches.length >= 11) {
      // Formato clássico DANFE: 11 valores
      // 0: BC ICMS, 1: V.ICMS, 2: BC ST, 3: V.ICMS ST, 4: V.PROD
      // 5: V.FRETE, 6: V.SEG, 7: V.DESC, 8: OUTRAS, 9: V.IPI, 10: V.NF
      if (!baseCalculoIcmsLido && numberMatches[0])
        baseCalculoIcmsLido = parseBrazilianNumber(numberMatches[0])
      if (!valorIcmsLido && numberMatches[1]) valorIcmsLido = parseBrazilianNumber(numberMatches[1])
      if (!baseCalculoStLido && numberMatches[2])
        baseCalculoStLido = parseBrazilianNumber(numberMatches[2])
      if (!valorStLido && numberMatches[3]) valorStLido = parseBrazilianNumber(numberMatches[3])
      if (!valorProdutosLido && numberMatches[4])
        valorProdutosLido = parseBrazilianNumber(numberMatches[4])

      if (!valorFreteLido && numberMatches[5])
        valorFreteLido = parseBrazilianNumber(numberMatches[5])
      if (!valorSeguroLido && numberMatches[6])
        valorSeguroLido = parseBrazilianNumber(numberMatches[6])
      if (!valorDescontoLido && numberMatches[7])
        valorDescontoLido = parseBrazilianNumber(numberMatches[7])
      if (!valorOutrasDespesasLido && numberMatches[8])
        valorOutrasDespesasLido = parseBrazilianNumber(numberMatches[8])
      if (!valorIpiLido && numberMatches[9]) valorIpiLido = parseBrazilianNumber(numberMatches[9])
      if (!valorNotaLido && numberMatches[10])
        valorNotaLido = parseBrazilianNumber(numberMatches[10])
    } else if (numberMatches && numberMatches.length >= 6) {
      if (valorProdutosLido === 0 && numberMatches[4]) {
        valorProdutosLido = parseBrazilianNumber(numberMatches[4])
      }
      if (valorNotaLido === 0 && numberMatches.length >= 10) {
        valorNotaLido = parseBrazilianNumber(numberMatches[numberMatches.length - 1])
      }
    }
  }

  // Se ainda estiver 0, procurar qualquer "VALOR TOTAL"
  if (valorNotaLido === 0) {
    const genericTotal = text.match(/TOTAL\s+(?:DA\s+NOTA|GERAL)?\s*[:.]?\s*R?\$?\s*([\d.,]+)/i)
    if (genericTotal) {
      valorNotaLido = parseBrazilianNumber(genericTotal[1])
    }
  }

  // 2. Extração dos ITENS
  // A tabela começa após "DADOS DO PRODUTO" ou "DADOS DOS PRODUTOS/SERVIÇOS"
  const idxDadosProd = text.search(/DADOS\s+DO[S]?\s+PRODUTO/i)
  let itemsSection = text
  if (idxDadosProd >= 0) {
    itemsSection = text.substring(idxDadosProd)
  }

  // Limite da tabela de itens: onde começa "CÁLCULO DO ISSQN" ou "DADOS ADICIONAIS"
  const idxFimItens = itemsSection.search(
    /(?:C[AÁ]LCULO\s+DO\s+ISSQN|DADOS\s+ADICIONAIS|CONTINUA[CÇ][AÃ]O\s+DADOS\s+ADICIONAIS)/i,
  )
  if (idxFimItens > 0) {
    itemsSection = itemsSection.substring(0, idxFimItens)
  }

  const rawItemLines = itemsSection
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  const parsedItens: ParsedDanfeItem[] = []
  let currentItem: ParsedDanfeItem | null = null

  // Helper para identificar linhas que são cabeçalhos da tabela e não itens
  function isHeaderLine(line: string): boolean {
    const u = line.toUpperCase()
    return (
      u.includes('CÓDIGO') ||
      u.includes('DESCRIÇÃO') ||
      u.includes('DADOS DO PRODUTO') ||
      u.includes('NCM/SH') ||
      u.includes('CST') ||
      u.includes('CFOP') ||
      u.includes('VALOR UNIT') ||
      u.includes('VALOR TOTAL') ||
      u.includes('BC ICMS')
    )
  }

  for (let i = 0; i < rawItemLines.length; i++) {
    const line = rawItemLines[i]
    if (isHeaderLine(line)) {
      continue
    }

    // Tenta casar com a regex padrão de 10 colunas (com desconto)
    let match = line.match(ITEM_REGEX)
    let hasDesconto = true

    if (!match) {
      // Tenta a de 9 colunas (sem desconto explícito)
      match = line.match(ITEM_REGEX_SEM_DESC)
      hasDesconto = false
    }

    if (match) {
      // Novo item encontrado!
      const codigo = match[1].trim()
      const descricao = match[2].trim()
      const ncm = match[3].trim()
      const cst = match[4].trim()
      const cfop = match[5].trim()
      const unidade = match[6].trim().toUpperCase()
      const quantidade = parseBrazilianNumber(match[7])
      const vUnit = parseBrazilianNumber(match[8])
      let vDesc = 0
      let vTotal = 0

      if (hasDesconto) {
        vDesc = parseBrazilianNumber(match[9])
        vTotal = parseBrazilianNumber(match[10])
      } else {
        vTotal = parseBrazilianNumber(match[9])
      }

      // Se vTotal for 0 mas tivermos quantidade e unitário, calcula
      if (vTotal === 0 && quantidade > 0 && vUnit > 0) {
        vTotal = Math.round((quantidade * vUnit - vDesc) * 100) / 100
      }

      currentItem = {
        _draftId:
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `pdf-item-${parsedItens.length + 1}-${Date.now()}`,
        codigo_produto: codigo,
        produto: descricao,
        ncm,
        cst,
        cfop,
        unidade,
        quantidade,
        preco_unitario: vUnit,
        preco_bruto: vUnit,
        desconto: vDesc,
        preco_total: vTotal,
        confianca: 'ALTA',
        source: 'texto_pdf',
        status: 'pendente_revisao',
        item_id: null,
        score: 100,
      }
      parsedItens.push(currentItem)
    } else if (currentItem) {
      // Linha de continuação da descrição anterior (ex: "50M-PROADEC" ou detalhamento do produto)
      // Condição: não pode ser um código numérico novo nem uma linha de seção fiscal
      const isNewSection =
        /^(?:DADOS\s+ADICIONAIS|C[AÁ]LCULO|TRANSPORTADOR|CONTINUA[CÇ][AÃ]O|INFORMA[CÇ][OÕ]ES|RESERVADO)/i.test(
          line,
        )
      const looksLikeCode = /^\d{5,}\s+/.test(line)

      if (!isNewSection && !looksLikeCode && line.length < 150) {
        // Anexa ao item anterior
        currentItem.produto = `${currentItem.produto} ${line}`.trim()
      }
    }
  }

  if (parsedItens.length === 0) {
    return {
      sucesso: false,
      motivo_falha: 'Nenhum item reconhecido pela regex de tabela de DANFE no texto do PDF.',
      valor: valorNotaLido,
      itens: [],
      camada_utilizada: 'camada_1_texto_pdf',
      confianca: 'ALTA',
      soma_bateu: false,
      diferenca_soma: valorProdutosLido,
    }
  }

  // 3. Validação matemática obrigatória:
  // soma dos V_TOTAL dos itens deve ser igual ao VALOR TOTAL DOS PRODUTOS com tolerância de R$ 0,05
  const somaItens =
    Math.round(parsedItens.reduce((acc, it) => acc + (it.preco_total || 0), 0) * 100) / 100

  // Se valorProdutosLido for 0, mas tivermos valor da nota e não tivermos frete/outros, tenta valorNotaLido
  const valorReferencia = valorProdutosLido > 0 ? valorProdutosLido : valorNotaLido
  const diferenca = Math.abs(Math.round((somaItens - valorReferencia) * 100) / 100)
  const somaBateu = valorReferencia > 0 ? diferenca <= 0.05 : false

  totais = {
    base_calculo_icms: baseCalculoIcmsLido || 0,
    valor_icms: valorIcmsLido || 0,
    base_calculo_st: baseCalculoStLido || 0,
    valor_st: valorStLido || 0,
    valor_produtos: valorProdutosLido || somaItens,
    valor_frete: valorFreteLido || 0,
    valor_seguro: valorSeguroLido || 0,
    valor_desconto: valorDescontoLido || 0,
    valor_outras_despesas: valorOutrasDespesasLido || 0,
    valor_ipi: valorIpiLido || 0,
    valor_total_nota: valorNotaLido || somaItens,
  }

  if (!somaBateu) {
    return {
      sucesso: false,
      motivo_falha: `Soma dos itens (${somaItens.toFixed(2)}) não confere com valor dos produtos (${valorReferencia.toFixed(2)}). Diferença: R$ ${diferenca.toFixed(2)}.`,
      numero_nota: numeroNota,
      chave_acesso: chaveAcesso,
      cnpj_emitente: cnpjEmitente,
      fornecedor,
      data_emissao: dataEmissao,
      totais,
      valor: valorNotaLido || somaItens,
      itens: parsedItens,
      camada_utilizada: 'camada_1_texto_pdf',
      confianca: 'ALTA',
      soma_bateu: false,
      diferenca_soma: diferenca,
    }
  }

  // SOMA BATEU! Itens validados deterministicamente com ALTA confiança
  return {
    sucesso: true,
    numero_nota: numeroNota,
    chave_acesso: chaveAcesso,
    cnpj_emitente: cnpjEmitente,
    fornecedor,
    data_emissao: dataEmissao,
    totais,
    valor: valorNotaLido || somaItens,
    itens: parsedItens,
    camada_utilizada: 'camada_1_texto_pdf',
    confianca: 'ALTA',
    soma_bateu: true,
    diferenca_soma: diferenca,
  }
}
