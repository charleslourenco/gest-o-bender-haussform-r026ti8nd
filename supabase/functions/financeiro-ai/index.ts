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
              'Você é a Edith, assistente financeira. Extraia informações do boleto ou nota fiscal e retorne APENAS um JSON exato com as chaves: "fornecedor" (nome do emissor), "valor" (número float), "data_vencimento" (YYYY-MM-DD), "codigo_barras" (se houver, senão null), "categoria" (sugira uma categoria apropriada), "meio_pagamento" (geralmente "Boleto").',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Extraia os dados deste documento:' },
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

    if (action === 'chat') {
      const { text, currentDate, history, context } = payload
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Você é Dona Edith, assistente financeira educada e super proativa da Bender Haussform.
Data de hoje: ${currentDate}.

Abaixo está o contexto do banco de dados (o que vence hoje e quais contratos estão assinados aguardando faturamento):
${JSON.stringify(context)}

Seu objetivo:
1. Dar um resumo claro sobre as contas a pagar e receber do dia atual (que não estejam pagas ainda).
2. Se houver assinaturas pendentes (contratos com status 'assinado'), avise o usuário proativamente e sugira adicioná-las no Contas a Receber.
3. Se o usuário quiser registrar um novo pagamento ou recebimento (ou concordar em lançar um contrato), inclua no final da sua resposta um bloco JSON com o comando para a interface realizar a inserção. 
O JSON deve ser formatado exatamente assim:
\`\`\`json
{
  "acao": "criar_pagamento" | "criar_recebimento",
  "dados": {
    "credor_devedor": "Nome da pessoa, cliente ou empresa",
    "valor": 150.00,
    "data_vencimento": "YYYY-MM-DD",
    "descricao": "Referência do lançamento",
    "categoria": "Categoria sugerida",
    "meio_pagamento": "Pix",
    "antecipado": false
  }
}
\`\`\`

Apenas retorne o texto que o usuário vai ler e o bloco JSON se houver uma ação. Não precisa de JSON se for só uma resposta verbal.`,
          },
          ...(history || []),
          { role: 'user', content: text || 'Resumo diário por favor.' },
        ],
        temperature: 0.2,
      })

      return new Response(JSON.stringify({ message: response.choices[0].message.content }), {
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
