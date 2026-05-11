import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import OpenAI from 'npm:openai@4'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { action, payload } = await req.json()
    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiKey) throw new Error('Chave da OpenAI não configurada.')
    const openai = new OpenAI({ apiKey: openaiKey })

    if (action === 'ocr') {
      const { imageBase64 } = payload
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content:
              'Você é a Edith, assistente financeira. Extraia informações do boleto ou nota fiscal e retorne APENAS um JSON: "fornecedor" (nome do emissor), "valor" (número float), "data_vencimento" (YYYY-MM-DD), "codigo_barras" (se houver, senão null), "categoria" (sugira uma categoria).',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Extraia os dados:' },
              { type: 'image_url', image_url: { url: imageBase64 } },
            ],
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0,
      })

      return new Response(response.choices[0].message.content, {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'command') {
      const { text, currentDate } = payload
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Você é Edith, assistente financeira da Bender Haussform. Interprete o comando e retorne JSON.
Data de hoje: ${currentDate}
Formato esperado:
{
  "acao": "criar_pagamento" | "criar_recebimento",
  "dados": {
    "fornecedor": "Nome da pessoa ou empresa",
    "valor": 150.00,
    "data_vencimento": "YYYY-MM-DD",
    "descricao": "Breve descrição",
    "categoria": "Categoria sugerida"
  },
  "mensagem": "Sua fala simpática e prestativa confirmando o entendimento do lançamento."
}`,
          },
          { role: 'user', content: text },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      })

      return new Response(response.choices[0].message.content, {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    throw new Error('Ação inválida')
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
