/**
 * Parser determinístico para arquivos XML de Nota Fiscal Eletrônica (NF-e).
 *
 * Processa o XML padrão SEFAZ (tag infNFe/NFe/nfeProc) sem uso de IA:
 * - Emitente: Razão Social (xNome), Fantasia (xFant), CNPJ
 * - Identificação: Número da nota (nNF), Série (serie), Data de emissão (dhEmi/dEmi)
 * - Itens: descrição (xProd), quantidade (qCom), valor unitário (vUnCom), valor total (vProd), NCM, unidade
 * - Totais: Valor total da NF (vNF), Valor total dos produtos (vProd)
 * - Classificação heurística de categoria alinhada com as categorias do estoque
 * - Proteções de negócio: NUNCA aceitar "Bender" como fornecedor
 */

import { maskCnpj } from '@/lib/cnpj'

export interface NFeItemParsed {
  produto: string
  marca?: string
  quantidade: number
  preco_unitario: number
  preco_total: number
  categoria: string
  unidade?: string
  codigo_produto?: string
  ncm?: string
}

export interface NFeParsedData {
  fornecedor: string
  cnpj_fornecedor: string | null
  valor: number
  data_emissao: string
  numero_nota: string
  itens: NFeItemParsed[]
  chave_acesso?: string
  natureza_operacao?: string
}

export const CATEGORIAS_VALIDAS = [
  'Ferragens',
  'Chapas',
  'Acessórios',
  'Fitas de borda',
  'Sistemas de fixação',
  'Serralheria',
  'Estofaria',
  'Portas de alumínio e vidro',
  'Espelhos',
  'Perfil puxador/puxador',
  'Iluminação',
  'Colas/Adesivos/Solventes',
  'Insumos',
  'Material elétrico',
  'Uniformes e EPIs',
  'móveis soltos',
  'brocas/fresas/serras',
  'Parafusos',
] as const

/**
 * Heurística de categorização rápida com base na descrição do produto da NF-e
 */
export function classificarCategoriaItem(descricao: string): string {
  const text = (descricao || '').toLowerCase()

  if (
    /\b(epi|bota|luva|capacete|oculos|óculos|mascara|máscara|avental|protetor|abafador)\b/i.test(
      text,
    )
  ) {
    return 'Uniformes e EPIs'
  }
  if (/\b(parafuso|bucha|prego|chumbador|arruela|porca)\b/i.test(text)) {
    return 'Parafusos'
  }
  if (/\b(broca|serra|fresa|disco de corte|lixa|esmeril|rebolo)\b/i.test(text)) {
    return 'brocas/fresas/serras'
  }
  if (/\b(fita de borda|fita borda|fita pvc)\b/i.test(text)) {
    return 'Fitas de borda'
  }
  if (/\b(chapa|mdf|mdp|compensado|madeir|painel|compensad|formica|fórmica)\b/i.test(text)) {
    return 'Chapas'
  }
  if (/\b(puxador|perfil puxador|perfil gola)\b/i.test(text)) {
    return 'Perfil puxador/puxador'
  }
  if (/\b(espelho|cristal espelho)\b/i.test(text)) {
    return 'Espelhos'
  }
  if (/\b(cola|adesivo|solvente|thinner|silicone|selante|pur|hotmelt|contato)\b/i.test(text)) {
    return 'Colas/Adesivos/Solventes'
  }
  if (
    /\b(led|fita led|spot|fonte|luminaria|luminária|driver|perfil de led|lampada|lâmpada)\b/i.test(
      text,
    )
  ) {
    return 'Iluminação'
  }
  if (
    /\b(porta de vidro|porta de aluminio|vidro temperado|vidro canelado|esquadria)\b/i.test(text)
  ) {
    return 'Portas de alumínio e vidro'
  }
  if (/\b(tecido|espuma|couro|veludo|linho|estofad)\b/i.test(text)) {
    return 'Estofaria'
  }
  if (/\b(metal|tubo|ferro|aco|aço|serralher|cantoneira|solda)\b/i.test(text)) {
    return 'Serralheria'
  }
  if (
    /\b(dobradica|dobradiça|corredica|corrediça|amortecedor|pistao|pistão|articulador|fechadura|trilho)\b/i.test(
      text,
    )
  ) {
    return 'Ferragens'
  }
  if (/\b(cadeira|mesa|sofa|sofá|poltrona|banqueta|puff|banco)\b/i.test(text)) {
    return 'móveis soltos'
  }
  if (/\b(fio|cabo|tomada|interruptor|conector|disjuntor|canaleta)\b/i.test(text)) {
    return 'Material elétrico'
  }
  if (/\b(minifix|cavilha|suporte invisivel|suporte|fixador|conector de montagem)\b/i.test(text)) {
    return 'Sistemas de fixação'
  }
  if (/\b(aramado|lixeira|porta tempero|divisor|organizador|cabideiro)\b/i.test(text)) {
    return 'Acessórios'
  }

  return 'Insumos'
}

/**
 * Verifica se um nome contém referência proibida a "Bender" como fornecedor.
 */
export function isInvalidBenderFornecedor(name: unknown): boolean {
  if (!name || typeof name !== 'string') return false
  return /\bbender\b/i.test(name.trim())
}

/**
 * Função utilitária para pegar texto de um nó XML considerando namespaces.
 */
function getElementText(parent: Element | Document, tagName: string): string {
  // Tenta query direta (com ou sem namespace)
  const el =
    parent.getElementsByTagName(tagName)[0] || parent.getElementsByTagNameNS('*', tagName)[0]
  return el?.textContent?.trim() || ''
}

/**
 * Função utilitária para pegar array de elementos filhos considerando namespaces.
 */
function getElements(parent: Element | Document, tagName: string): Element[] {
  const list = parent.getElementsByTagName(tagName)
  if (list && list.length > 0) return Array.from(list)
  const nsList = parent.getElementsByTagNameNS('*', tagName)
  return nsList ? Array.from(nsList) : []
}

/**
 * Analisa o conteúdo XML de uma NF-e e retorna os dados estruturados idênticos ao fluxo OCR.
 * Lança erro com mensagem amigável caso não seja um XML válido de NF-e.
 */
export function parseNFeXml(xmlString: string): NFeParsedData {
  if (!xmlString || typeof xmlString !== 'string' || !xmlString.trim()) {
    throw new Error('Arquivo XML vazio.')
  }

  const parser = new DOMParser()
  const xmlDoc = parser.parseFromString(xmlString, 'application/xml')

  // Verifica erro de sintaxe do parser XML do navegador
  const parserError = xmlDoc.getElementsByTagName('parsererror')[0]
  if (parserError) {
    throw new Error('O arquivo selecionado não contém um XML válido ou está corrompido.')
  }

  // Identificação do nó infNFe (padrão de NF-e da SEFAZ)
  const infNFe =
    xmlDoc.getElementsByTagName('infNFe')[0] || xmlDoc.getElementsByTagNameNS('*', 'infNFe')[0]

  if (!infNFe) {
    // Pode ser um XML que tem apenas NFe ou nfeProc mas sem infNFe legível
    const hasNFeTag =
      xmlDoc.getElementsByTagName('NFe')[0] ||
      xmlDoc.getElementsByTagNameNS('*', 'NFe')[0] ||
      xmlDoc.getElementsByTagName('nfeProc')[0] ||
      xmlDoc.getElementsByTagNameNS('*', 'nfeProc')[0]

    if (!hasNFeTag) {
      throw new Error(
        'Arquivo XML não reconhecido como Nota Fiscal Eletrônica (NF-e). Certifique-se de que é um XML de NF-e (tags infNFe/NFe).',
      )
    }
    throw new Error('XML de NF-e incompleto: tag <infNFe> não encontrada.')
  }

  // 1. Chave de acesso (atributo Id de infNFe, ex: NFe352309...)
  const rawId = infNFe.getAttribute('Id') || ''
  const chaveAcesso = rawId.replace(/^NFe/i, '').trim()

  // 2. Identificação da nota (ide)
  const ideEl =
    infNFe.getElementsByTagName('ide')[0] || infNFe.getElementsByTagNameNS('*', 'ide')[0]

  let numeroNota = ''
  let dataEmissao = ''
  let naturezaOperacao = ''

  if (ideEl) {
    numeroNota = getElementText(ideEl, 'nNF')
    naturezaOperacao = getElementText(ideEl, 'natOp')

    // Data de emissão: pode ser dhEmi (ISO com hora) ou dEmi (apenas YYYY-MM-DD)
    const dhEmi = getElementText(ideEl, 'dhEmi')
    const dEmi = getElementText(ideEl, 'dEmi')
    const rawDate = dhEmi || dEmi
    if (rawDate) {
      // Extrai YYYY-MM-DD
      const match = rawDate.match(/^(\d{4}-\d{2}-\d{2})/)
      dataEmissao = match ? match[1] : rawDate.substring(0, 10)
    }
  }

  if (!dataEmissao) {
    dataEmissao = new Date().toISOString().split('T')[0]
  }

  // 3. Emitente (emit) — FORNECEDOR OBRIGATÓRIO
  const emitEl =
    infNFe.getElementsByTagName('emit')[0] || infNFe.getElementsByTagNameNS('*', 'emit')[0]

  if (!emitEl) {
    throw new Error('XML de NF-e inválido: dados do emitente (<emit>) não encontrados.')
  }

  const xNome = getElementText(emitEl, 'xNome')
  const xFant = getElementText(emitEl, 'xFant')
  const cnpjEmit = getElementText(emitEl, 'CNPJ')
  const cpfEmit = getElementText(emitEl, 'CPF')

  const fornecedorNome = (xNome || xFant || '').trim()
  const rawCnpj = (cnpjEmit || cpfEmit || '').replace(/\D/g, '')
  const cnpjFormatado = rawCnpj.length === 14 ? maskCnpj(rawCnpj) : rawCnpj || null

  // Proteção central contra Bender como fornecedor
  if (isInvalidBenderFornecedor(fornecedorNome)) {
    throw new Error(
      'Não foi possível identificar o emitente (fornecedor) da nota fiscal. O nome lido apontou para a empresa compradora (Bender). Verifique o arquivo XML.',
    )
  }

  if (!fornecedorNome) {
    throw new Error('Não foi possível identificar a Razão Social do emitente no XML da NF-e.')
  }

  // 4. Totais (total -> ICMSTot)
  let valorTotalNota = 0
  let valorTotalProdutos = 0
  const totalEl =
    infNFe.getElementsByTagName('total')[0] || infNFe.getElementsByTagNameNS('*', 'total')[0]

  if (totalEl) {
    const icmsTot =
      totalEl.getElementsByTagName('ICMSTot')[0] ||
      totalEl.getElementsByTagNameNS('*', 'ICMSTot')[0]

    if (icmsTot) {
      const vNF = parseFloat(getElementText(icmsTot, 'vNF') || '0')
      const vProd = parseFloat(getElementText(icmsTot, 'vProd') || '0')
      valorTotalNota = !isNaN(vNF) ? vNF : 0
      valorTotalProdutos = !isNaN(vProd) ? vProd : 0
    }
  }

  // 5. Itens (det)
  const detList = getElements(infNFe, 'det')
  const itens: NFeItemParsed[] = []

  for (const det of detList) {
    const prodEl = det.getElementsByTagName('prod')[0] || det.getElementsByTagNameNS('*', 'prod')[0]

    if (!prodEl) continue

    const xProd = getElementText(prodEl, 'xProd')
    const cProd = getElementText(prodEl, 'cProd')
    const ncm = getElementText(prodEl, 'NCM')
    const uCom = getElementText(prodEl, 'uCom')
    const qComStr = getElementText(prodEl, 'qCom')
    const vUnComStr = getElementText(prodEl, 'vUnCom')
    const vProdStr = getElementText(prodEl, 'vProd')

    const quantidade = parseFloat(qComStr.replace(',', '.')) || 1
    const precoUnitario = parseFloat(vUnComStr.replace(',', '.')) || 0
    let precoTotal = parseFloat(vProdStr.replace(',', '.')) || 0

    if (precoTotal === 0 && quantidade > 0 && precoUnitario > 0) {
      precoTotal = Math.round(quantidade * precoUnitario * 100) / 100
    }

    if (xProd) {
      itens.push({
        produto: xProd,
        quantidade,
        preco_unitario: precoUnitario,
        preco_total: precoTotal,
        categoria: classificarCategoriaItem(xProd),
        unidade: uCom || 'un',
        codigo_produto: cProd || undefined,
        ncm: ncm || undefined,
      })
    }
  }

  // Se o valor total da nota não foi obtido do cabeçalho ICMSTot, calcula da soma dos itens
  if (valorTotalNota <= 0) {
    if (valorTotalProdutos > 0) {
      valorTotalNota = valorTotalProdutos
    } else {
      valorTotalNota = itens.reduce((acc, curr) => acc + curr.preco_total, 0)
    }
  }

  return {
    fornecedor: fornecedorNome,
    cnpj_fornecedor: cnpjFormatado,
    valor: valorTotalNota,
    data_emissao: dataEmissao,
    numero_nota: numeroNota || (chaveAcesso ? chaveAcesso.substring(25, 34) : `NF-${Date.now()}`),
    itens,
    chave_acesso: chaveAcesso || undefined,
    natureza_operacao: naturezaOperacao || undefined,
  }
}
