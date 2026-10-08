import { supabase } from '@/lib/supabase/client'
import { convertPdfToImages } from '@/lib/pdf-to-images'
import { parseNFeXml } from '@/lib/nfe-xml-parser'
import {
  prepareInvoiceForOcr,
  isXmlInvoiceFile,
  type PrepareInvoiceForOcrResult,
} from './notas-fiscais-storage'

export interface ProcessInvoiceOcrOptions {
  /** Callback para notificar progresso e feedback ao usuário */
  onProgress?: (message: string) => void
  /**
   * Forçar modo reforçado direto na 1ª chamada se desejado,
   * mas por padrão a função executa a 1ª passada (até 6 páginas @ 2200px)
   * e se vier `itens: []`, tenta a 2ª passada de auto-reforço.
   */
  forceReforco?: boolean
}

export interface ProcessInvoiceOcrResult {
  data: any
  isXml: boolean
  usedAutoReforco: boolean
  itensRecuperadosNoReforco: boolean
}

/**
 * Invoca a Edge Function `financeiro-ai` (rota ocr_compras) com payload estruturado
 */
async function invokeOcrCompras(payload: Record<string, any>): Promise<any> {
  const response = await supabase.functions.invoke('financeiro-ai', {
    body: {
      action: 'ocr_compras',
      payload,
    },
  })

  if (response.error) {
    throw new Error(response.error.message || 'Falha ao comunicar com a inteligência.')
  }

  let extractedData = response.data
  if (typeof extractedData === 'string') {
    if (extractedData === '[object Object]') {
      throw new Error('Falha ao interpretar dados do OCR (recebido object).')
    }
    try {
      extractedData = JSON.parse(extractedData)
    } catch {
      throw new Error('Falha ao interpretar dados do OCR.')
    }
  }

  return extractedData
}

/**
 * Constrói o payload para envio à IA a partir do resultado de preparação
 */
function buildAiPayload(
  prepared: PrepareInvoiceForOcrResult,
  reforco = false,
): Record<string, any> {
  const basePayload: Record<string, any> = {
    reforco,
    passada: reforco ? 2 : 1,
    focoItens: reforco,
  }

  if (prepared.isPdf) {
    if (prepared.images && prepared.images.length > 0) {
      return { ...basePayload, images: prepared.images, isPdf: true }
    }
    return { ...basePayload, imageBase64: prepared.imageBase64, isPdf: true }
  }

  return { ...basePayload, imageBase64: prepared.imageBase64, isPdf: false }
}

/**
 * Pipeline de leitura de notas fiscais com AUTO-REFORÇO NA LEITURA (R1):
 * 1. Processa XML deterministicamente (sem IA).
 * 2. Se for PDF ou imagem, executa a primeira passada com 6 páginas e 2200px.
 * 3. Se a IA retornar com `itens: []`, dispara AUTOMATICAMENTE uma segunda passada
 *    com estratégia agressiva de auto-reforço focada na grade/tabela de itens.
 * 4. Só substitui pelo resultado da segunda passada se ela encontrar itens;
 *    caso contrário, preserva o resultado da primeira passada (permitindo entrada manual/aviso).
 */
export async function processInvoiceWithAutoReforco(
  file: File,
  options: ProcessInvoiceOcrOptions = {},
): Promise<ProcessInvoiceOcrResult> {
  const isXml = isXmlInvoiceFile(file)

  if (isXml) {
    options.onProgress?.('Lendo dados estruturados da SEFAZ com precisão direta...')
    const xmlContent = await file.text()
    const extractedData = parseNFeXml(xmlContent)
    return {
      data: extractedData,
      isXml: true,
      usedAutoReforco: false,
      itensRecuperadosNoReforco: false,
    }
  }

  // 1ª PASSADA: Preparação padrão (até 6 páginas, 2200px, 0.85 qualidade)
  options.onProgress?.('Renderizando documento em alta resolução (até 6 páginas)...')
  const preparedPass1 = await prepareInvoiceForOcr(file, convertPdfToImages, {
    maxPages: 6,
    maxDimension: 2200,
    quality: 0.85,
  })

  options.onProgress?.('Lendo documento com IA da Zenaide...')
  const payloadPass1 = buildAiPayload(preparedPass1, options.forceReforco || false)
  const resultPass1 = await invokeOcrCompras(payloadPass1)

  const itensPass1 = Array.isArray(resultPass1?.itens) ? resultPass1.itens : []
  const hasItensPass1 = itensPass1.length > 0

  // Se já encontrou itens ou se não é documento PDF/imagem, retorna direto
  if (hasItensPass1) {
    return {
      data: resultPass1,
      isXml: false,
      usedAutoReforco: false,
      itensRecuperadosNoReforco: false,
    }
  }

  // Se veio sem itens: AUTO-REFORÇO AUTOMÁTICO (2ª passada)
  options.onProgress?.(
    'Nenhum item detectado na 1ª passada. Ativando Auto-Reforço: reescaneando páginas em 2200px com foco estrito na tabela de produtos...',
  )

  try {
    // 2ª PASSADA: Conversão agressiva dedicada (garante 6 páginas com qualidade total e teto 2200px)
    const preparedPass2 = await prepareInvoiceForOcr(file, convertPdfToImages, {
      maxPages: 6,
      maxDimension: 2200,
      quality: 0.9,
    })

    const payloadPass2 = buildAiPayload(preparedPass2, true)
    const resultPass2 = await invokeOcrCompras(payloadPass2)

    const itensPass2 = Array.isArray(resultPass2?.itens) ? resultPass2.itens : []
    const hasItensPass2 = itensPass2.length > 0

    if (hasItensPass2) {
      // Mescla com segurança: se a 2ª passada achou itens mas perdeu dados de cabeçalho
      // da 1ª (como fornecedor ou número), mescla o melhor dos dois mundos
      const mergedData = {
        ...resultPass1,
        ...resultPass2,
        fornecedor: resultPass2?.fornecedor || resultPass1?.fornecedor || 'Desconhecido',
        numero_nota: resultPass2?.numero_nota || resultPass1?.numero_nota,
        valor: resultPass2?.valor || resultPass1?.valor || 0,
        data_emissao: resultPass2?.data_emissao || resultPass1?.data_emissao,
        itens: resultPass2.itens,
        totais: resultPass2?.totais || resultPass1?.totais,
      }

      return {
        data: mergedData,
        isXml: false,
        usedAutoReforco: true,
        itensRecuperadosNoReforco: true,
      }
    }

    // A 2ª passada também não achou itens: mantém resultado da 1ª com segurança
    return {
      data: resultPass1,
      isXml: false,
      usedAutoReforco: true,
      itensRecuperadosNoReforco: false,
    }
  } catch (reforcoErr) {
    console.warn(
      '[processInvoiceWithAutoReforco] Segunda passada de auto-reforço falhou:',
      reforcoErr,
    )
    // Se a 2ª passada falhar por timeout ou erro, preserva o resultado da 1ª passada
    return {
      data: resultPass1,
      isXml: false,
      usedAutoReforco: true,
      itensRecuperadosNoReforco: false,
    }
  }
}
