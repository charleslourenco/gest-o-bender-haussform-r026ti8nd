import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import OpenAI from 'npm:openai@4'
import pdf from 'npm:pdf-parse@1.1.1'
import * as XLSX from 'npm:xlsx@0.18.5'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { fileData, fileType, fileName } = await req.json()
    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiKey) throw new Error('Chave da OpenAI não configurada.')
    const openai = new OpenAI({ apiKey: openaiKey })

    let extractedText = ''
    let isImage = false
    let isDocument = false
    let imageBase64Content = ''

    const base64Data = fileData.split(',')[1] || fileData
    const buffer = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0))

    if (fileType === 'application/pdf') {
      try {
        const data = await pdf(buffer)
        extractedText = data.text.trim().substring(0, 15000)
        isDocument = true
      } catch (e) {
        throw new Error('Falha ao extrair texto do PDF.')
      }
    } else if (
      fileType === 'text/csv' ||
      fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      fileType === 'application/vnd.ms-excel' ||
      fileName?.endsWith('.csv') ||
      fileName?.endsWith('.xlsx')
    ) {
      try {
        const workbook = XLSX.read(buffer, { type: 'array' })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        extractedText = XLSX.utils.sheet_to_csv(worksheet).substring(0, 15000)
        isDocument = true
      } catch (e) {
        throw new Error('Falha ao extrair dados da planilha.')
      }
    } else if (fileType.startsWith('image/')) {
      isImage = true
      imageBase64Content = fileData.includes(',') ? fileData : `data:${fileType};base64,${fileData}`
    } else {
      throw new Error('Tipo de arquivo não suportado.')
    }

    const systemPrompt = `Você é um assistente especializado em extrair dados de orçamentos e listas de materiais de marcenaria.
Seu objetivo é retornar APENAS um objeto JSON com as seguintes chaves:
- "cliente": string (nome do cliente, null se não encontrado)
- "ambiente": string (Cozinha, Sala, Quarto, Banheiro, Varanda, Outro, ou null se não encontrar)
- "descricao": string (Descrição geral do documento, null se não encontrado)
- "itens": array de objetos contendo:
  - "nome_item": string
  - "quantidade": number (assuma 1 se não especificado)
  - "custo_unitario": number (valor monetário, float, usar 0 se não especificado ou se for lista de materiais)
- "confianca": number (0 a 100, indicando sua confiança na extração dos dados legíveis)
Retorne APENAS um JSON válido, sem markdown. Se não conseguir extrair com boa confiança, retorne os dados que conseguiu e confianca baixa (< 70).`

    const userContent: any[] = []

    if (isDocument) {
      if (!extractedText || extractedText.length < 5) {
        throw new Error('O documento parece estar vazio ou não tem texto extraível.')
      }
      userContent.push({
        type: 'text',
        text: `Extraia os dados deste documento:\n${extractedText}`,
      })
    } else if (isImage) {
      userContent.push({ type: 'text', text: 'Extraia os dados da imagem em anexo.' })
      userContent.push({ type: 'image_url', image_url: { url: imageBase64Content } })
    }

    let result = null
    let retries = 3
    let delay = 2000

    while (retries > 0) {
      try {
        const response = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent },
          ],
          response_format: { type: 'json_object' },
          temperature: 0,
        })
        result = JSON.parse(response.choices[0].message.content || '{}')
        break
      } catch (err: any) {
        if (err.status === 503 && retries > 1) {
          retries--
          await new Promise((res) => setTimeout(res, delay))
          delay *= 2
        } else {
          throw err
        }
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
