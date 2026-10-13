import { supabase } from '@/lib/supabase/client'
import { convertPdfToImages, extractTextFromPdf } from '@/lib/pdf-to-images'
import { parseNFeXml } from '@/lib/nfe-xml-parser'
import { parseDanfeText, type ParsedDanfeResult } from './danfe-pdf-parser'
import {
  prepareInvoiceForOcr,
  isXmlInvoiceFile,
  type PrepareInvoiceForOcrResult,
} from './notas-fiscais-storage'

export type CamadaExtracao =
  | 'camada_1_texto_pdf'
  | 'camada_2_ia_alta_resolucao'
  | 'camada_3_manual'
  | 'xml_sefaz'

export interface ProcessInvoiceOcrOptions {
  /** Callback para notificar progresso e feedback ao usuário */
  onProgress?: (message: string) => void
  /** Forçar uso de IA (pular camada 1) se o usuário desejar */
  forceIA?: boolean
  /** Id da nota fiscal no banco para vincular ao log se já existir */
  notaId?: string
}

export interface ProcessInvoiceOcrResult {
  data: any
  isXml: boolean
  camadaResolvida: CamadaExtracao
  confianca: 'ALTA' | 'MEDIA' | 'BAIXA'
  somaBateu: boolean
  precisaDigitacaoManual: boolean
  mensagemStatus: string
}

/**
 * Registra a execução da extração na tabela `logs_ia` para auditoria e métricas de taxa de acerto.
 */
async function registrarLogExtracao(params: {
  camada: CamadaExtracao
  confianca: 'ALTA' | 'MEDIA' | 'BAIXA'
  somaBateu: boolean
  numeroNota?: string
  fornecedor?: string
  totalNota?: number
  totalItens?: number
  qtdItens?: number
  diferenca?: number
  detalhesExtras?: Record<string, any>
  notaId?: string
}): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    await supabase.from('logs_ia' as any).insert({
      acao: 'nota_ocr_extracao',
      user_id: user?.id || null,
      detalhes: {
        camada_utilizada: params.camada,
        confianca: params.confianca,
        soma_bateu: params.somaBateu,
        numero_nota: params.numeroNota,
        fornecedor: params.fornecedor,
        total_nota: params.totalNota,
        total_itens: params.totalItens,
        qtd_itens: params.qtdItens,
        diferenca_soma: params.diferenca,
        nota_id: params.notaId,
        timestamp: new Date().toISOString(),
        ...params.detalhesExtras,
      },
    })
  } catch (err) {
    console.warn('[compras-ocr-pipeline] Falha ao registrar log em logs_ia:', err)
  }
}

/**
 * Invoca a Edge Function `financeiro-ai` (rota ocr_compras) com payload estruturado e prompt refinado
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
 * Valida matematicamente se a soma dos itens lidos confere com o valor dos produtos/total da nota.
 */
function validarSomaItens(
  itens: any[],
  totalReferencia: number,
  tolerancia = 0.05,
): { bateu: boolean; somaItens: number; diferenca: number } {
  if (!itens || itens.length === 0) {
    return { bateu: false, somaItens: 0, diferenca: totalReferencia }
  }

  const somaItens =
    Math.round(
      itens.reduce((acc, it) => {
        const pt =
          it.preco_total !== undefined
            ? Number(it.preco_total)
            : Number(it.quantidade || 1) * Number(it.preco_unitario || 0)
        return acc + (isNaN(pt) ? 0 : pt)
      }, 0) * 100,
    ) / 100

  if (!totalReferencia || totalReferencia <= 0) {
    return { bateu: true, somaItens, diferenca: 0 }
  }

  const diferenca = Math.abs(Math.round((somaItens - totalReferencia) * 100) / 100)
  return {
    bateu: diferenca <= tolerancia,
    somaItens,
    diferenca,
  }
}

/**
 * Constrói o payload para envio à IA a partir do resultado de preparação
 */
function buildAiPayload(
  prepared: PrepareInvoiceForOcrResult,
  reforco = false,
  extraPrompt?: string,
): Record<string, any> {
  const basePayload: Record<string, any> = {
    reforco,
    passada: reforco ? 2 : 1,
    focoItens: true,
    prompt_instrucoes:
      extraPrompt ||
      'Copiar as descrições dos produtos exatamente como impressas no documento, letra por letra; retornar null nos campos ilegíveis; nunca repetir valores de outra linha; se não conseguir ler a tabela com nitidez, retornar itens vazio [] e leitura_itens_falhou: true.',
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
 * PIPELINE DE EXTRAÇÃO DE NOTAS FISCAIS EM 3 CAMADAS
 *
 * CAMADA 1 — PARSER DE DANFE SEM IA (padrão para PDF eletrônico vetorial)
 * 1. Extrai o texto do PDF com pdf.js preservando a ordem das linhas.
 * 2. Se > 200 caracteres e contém "DANFE" ou "DADOS DO PRODUTO", trata como eletrônica.
 * 3. Extrai cabeçalho e itens por regex precisa com código e NCM.
 * 4. Validação matemática: Soma(V_TOTAL) == VALOR DOS PRODUTOS (tol. R$ 0,05). Se bater: SUCESSO.
 *
 * CAMADA 2 — IA COM IMAGEM EM ALTA RESOLUÇÃO (fallback)
 * Só quando a camada 1 falhar, ou PDF for escaneado/sem texto ou imagem/foto.
 * Renderiza em 300 DPI (~2500px). Valida a soma; tenta uma vez em resolução maior.
 *
 * CAMADA 3 — LANÇAMENTO MANUAL (fallback final)
 * Se a IA também falhar na leitura ou soma, retorna cabeçalho preenchido e itens vazios
 * com mensagem "Não foi possível ler os itens com segurança" para digitação na revisão sem travar.
 */
export async function processInvoiceWithAutoReforco(
  file: File,
  options: ProcessInvoiceOcrOptions = {},
): Promise<ProcessInvoiceOcrResult> {
  const isXml = isXmlInvoiceFile(file)
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')

  // CASO ESPECIAL: XML da NF-e SEFAZ (Direto e 100% determinístico)
  if (isXml) {
    options.onProgress?.('Lendo dados estruturados da SEFAZ com precisão direta...')
    const xmlContent = await file.text()
    const extractedData = parseNFeXml(xmlContent)

    await registrarLogExtracao({
      camada: 'xml_sefaz',
      confianca: 'ALTA',
      somaBateu: true,
      numeroNota: extractedData?.numero_nota,
      fornecedor: extractedData?.fornecedor,
      totalNota: extractedData?.valor,
      qtdItens: extractedData?.itens?.length || 0,
      notaId: options.notaId,
    })

    return {
      data: extractedData,
      isXml: true,
      camadaResolvida: 'xml_sefaz',
      confianca: 'ALTA',
      somaBateu: true,
      precisaDigitacaoManual: false,
      mensagemStatus: 'Dados estruturados lidos diretamente do XML da SEFAZ.',
    }
  }

  // =========================================================================
  // CAMADA 1 — PARSER DE DANFE SEM IA (PDF eletrônico com camada de texto)
  // =========================================================================
  if (isPdf && !options.forceIA) {
    try {
      options.onProgress?.('Camada 1: Extraindo camada vetorial de texto do PDF da DANFE...')
      const pdfText = await extractTextFromPdf(file, 10)

      if (pdfText && pdfText.length >= 200) {
        options.onProgress?.('Camada 1: Processando itens e cabeçalho por regex determinística...')
        const danfeParsed: ParsedDanfeResult | null = parseDanfeText(pdfText)

        if (danfeParsed && danfeParsed.sucesso && danfeParsed.itens.length > 0) {
          options.onProgress?.(
            `Camada 1 aprovada! ${danfeParsed.itens.length} itens extraídos sem IA. Soma conferida com exatidão.`,
          )

          const formattedData = {
            fornecedor: danfeParsed.fornecedor || 'Desconhecido',
            numero_nota: danfeParsed.numero_nota || '',
            chave_acesso: danfeParsed.chave_acesso,
            cnpj_emitente: danfeParsed.cnpj_emitente,
            data_emissao: danfeParsed.data_emissao,
            valor: danfeParsed.valor,
            valor_total: danfeParsed.valor,
            totais: danfeParsed.totais,
            itens: danfeParsed.itens,
            fonte_extracao: 'texto_pdf',
          }

          await registrarLogExtracao({
            camada: 'camada_1_texto_pdf',
            confianca: 'ALTA',
            somaBateu: true,
            numeroNota: danfeParsed.numero_nota,
            fornecedor: danfeParsed.fornecedor,
            totalNota: danfeParsed.valor,
            qtdItens: danfeParsed.itens.length,
            diferenca: danfeParsed.diferenca_soma,
            notaId: options.notaId,
          })

          return {
            data: formattedData,
            isXml: false,
            camadaResolvida: 'camada_1_texto_pdf',
            confianca: 'ALTA',
            somaBateu: true,
            precisaDigitacaoManual: false,
            mensagemStatus: `Camada 1 (Parser PDF sem IA): ${danfeParsed.itens.length} itens lidos com descrições fiéis e soma perfeita.`,
          }
        } else {
          console.info(
            '[processInvoiceWithAutoReforco] Camada 1 não validou ou PDF sem tabela padrão:',
            danfeParsed?.motivo_falha || 'Texto não compatível com regex',
          )
        }
      }
    } catch (camada1Err) {
      console.warn(
        '[processInvoiceWithAutoReforco] Camada 1 falhou. Indo para Camada 2:',
        camada1Err,
      )
    }
  }

  // =========================================================================
  // CAMADA 2 — IA COM IMAGEM EM ALTA RESOLUÇÃO (fallback para fotos/escaneados)
  // =========================================================================
  options.onProgress?.(
    'Camada 2: Renderizando documento em alta resolução (300 DPI / 2500px) para IA...',
  )

  let cabecalhoDetectado: any = null

  try {
    // 1ª tentativa da Camada 2: 2500px (~300 DPI)
    const preparedPass1 = await prepareInvoiceForOcr(file, convertPdfToImages, {
      maxPages: 6,
      maxDimension: 2500,
      quality: 0.9,
    })

    options.onProgress?.('Camada 2: Lendo produtos via IA com instrução estrita de transcrição...')
    const payloadPass1 = buildAiPayload(preparedPass1, false)
    const resultPass1 = await invokeOcrCompras(payloadPass1)

    cabecalhoDetectado = {
      fornecedor: resultPass1?.fornecedor || 'Desconhecido',
      numero_nota: resultPass1?.numero_nota || '',
      data_emissao: resultPass1?.data_emissao || null,
      valor: resultPass1?.valor || 0,
      valor_total: resultPass1?.valor || 0,
      totais: resultPass1?.totais,
    }

    const itensPass1 = Array.isArray(resultPass1?.itens) ? resultPass1.itens : []
    const refValor = Number(resultPass1?.totais?.valor_produtos) || Number(resultPass1?.valor) || 0
    const validacaoPass1 = validarSomaItens(itensPass1, refValor, 0.05)

    if (itensPass1.length > 0 && validacaoPass1.bateu) {
      // Normaliza itens com metadados da Camada 2
      const itensComCamada = itensPass1.map((it: any) => ({
        ...it,
        source: 'ia',
        confianca: 'ALTA',
        codigo_produto: it.codigo_produto || it.codigo,
        ncm: it.ncm,
      }))

      await registrarLogExtracao({
        camada: 'camada_2_ia_alta_resolucao',
        confianca: 'ALTA',
        somaBateu: true,
        numeroNota: resultPass1?.numero_nota,
        fornecedor: resultPass1?.fornecedor,
        totalNota: resultPass1?.valor,
        qtdItens: itensComCamada.length,
        diferenca: validacaoPass1.diferenca,
        notaId: options.notaId,
      })

      return {
        data: {
          ...resultPass1,
          itens: itensComCamada,
        },
        isXml: false,
        camadaResolvida: 'camada_2_ia_alta_resolucao',
        confianca: 'ALTA',
        somaBateu: true,
        precisaDigitacaoManual: false,
        mensagemStatus: `Camada 2 (IA Alta Resolução): ${itensComCamada.length} itens lidos e validados matematicamente.`,
      }
    }

    // Se falhou a validação ou não achou itens, tenta uma segunda vez com resolução reforçada (2800px)
    options.onProgress?.(
      'Camada 2 (Auto-reforço): Reexaminando páginas com super-resolução e foco em tabela...',
    )
    const preparedPass2 = await prepareInvoiceForOcr(file, convertPdfToImages, {
      maxPages: 6,
      maxDimension: 2800,
      quality: 0.95,
    })

    const payloadPass2 = buildAiPayload(
      preparedPass2,
      true,
      'ATENÇÃO: A leitura anterior falhou na soma dos itens. Isole com o máximo de precisão a tabela DADOS DO PRODUTO/SERVIÇO. Transcreva exatamente as descrições, quantidades e valores impressos. Se estiver ilegível, retorne itens: [] com leitura_itens_falhou: true.',
    )
    const resultPass2 = await invokeOcrCompras(payloadPass2)

    const itensPass2 = Array.isArray(resultPass2?.itens) ? resultPass2.itens : []
    const refValor2 =
      Number(resultPass2?.totais?.valor_produtos) || Number(resultPass2?.valor) || refValor
    const validacaoPass2 = validarSomaItens(itensPass2, refValor2, 0.05)

    if (itensPass2.length > 0 && validacaoPass2.bateu) {
      const itensComCamada = itensPass2.map((it: any) => ({
        ...it,
        source: 'ia',
        confianca: 'ALTA',
        codigo_produto: it.codigo_produto || it.codigo,
        ncm: it.ncm,
      }))

      await registrarLogExtracao({
        camada: 'camada_2_ia_alta_resolucao',
        confianca: 'ALTA',
        somaBateu: true,
        numeroNota: resultPass2?.numero_nota || cabecalhoDetectado?.numero_nota,
        fornecedor: resultPass2?.fornecedor || cabecalhoDetectado?.fornecedor,
        totalNota: resultPass2?.valor || cabecalhoDetectado?.valor,
        qtdItens: itensComCamada.length,
        diferenca: validacaoPass2.diferenca,
        notaId: options.notaId,
      })

      return {
        data: {
          ...resultPass1,
          ...resultPass2,
          fornecedor: resultPass2?.fornecedor || cabecalhoDetectado?.fornecedor,
          numero_nota: resultPass2?.numero_nota || cabecalhoDetectado?.numero_nota,
          valor: resultPass2?.valor || cabecalhoDetectado?.valor,
          itens: itensComCamada,
        },
        isXml: false,
        camadaResolvida: 'camada_2_ia_alta_resolucao',
        confianca: 'ALTA',
        somaBateu: true,
        precisaDigitacaoManual: false,
        mensagemStatus: `Camada 2 (IA Reforçada): ${itensComCamada.length} itens recuperados com soma validada.`,
      }
    }
  } catch (iaErr) {
    console.warn('[processInvoiceWithAutoReforco] Camada 2 falhou por erro de comunicação:', iaErr)
  }

  // =========================================================================
  // CAMADA 3 — LANÇAMENTO MANUAL (fallback seguro quando leitura é insegura)
  // =========================================================================
  options.onProgress?.(
    'Não foi possível ler os itens com segurança. Liberando para preenchimento manual...',
  )

  const manualData = {
    fornecedor: cabecalhoDetectado?.fornecedor || 'Desconhecido',
    numero_nota: cabecalhoDetectado?.numero_nota || '',
    data_emissao: cabecalhoDetectado?.data_emissao || null,
    valor: cabecalhoDetectado?.valor || 0,
    valor_total: cabecalhoDetectado?.valor_total || 0,
    totais: cabecalhoDetectado?.totais,
    itens: [],
    leitura_insegura: true,
    motivo_manual: 'Não foi possível ler os itens com segurança',
  }

  await registrarLogExtracao({
    camada: 'camada_3_manual',
    confianca: 'BAIXA',
    somaBateu: false,
    numeroNota: cabecalhoDetectado?.numero_nota,
    fornecedor: cabecalhoDetectado?.fornecedor,
    totalNota: cabecalhoDetectado?.valor,
    qtdItens: 0,
    diferenca: cabecalhoDetectado?.valor || 0,
    notaId: options.notaId,
  })

  return {
    data: manualData,
    isXml: false,
    camadaResolvida: 'camada_3_manual',
    confianca: 'BAIXA',
    somaBateu: false,
    precisaDigitacaoManual: true,
    mensagemStatus:
      'Não foi possível ler os itens com segurança. O cabeçalho foi preservado para digitação manual dos itens.',
  }
}
