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
              'Você é a Edith, super assistente financeira. Extraia informações precisas deste comprovante (boleto, recibo, nota fiscal) e retorne APENAS um JSON com as chaves: "fornecedor" (nome do emissor/credor), "valor" (número float), "data_vencimento" (YYYY-MM-DD), "codigo_barras" (se houver, senão null), "categoria" (sugira uma categoria financeira), "meio_pagamento" (Boleto, Pix, Cartão, Transferência).',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Extraia os dados do comprovante em anexo:' },
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

    if (action === 'command' || action === 'chat') {
      const { text, currentDate, history, context } = payload

      const systemPrompt = `Você é Edith, a super assistente financeira proativa e atenta da Bender Haussform.
Data de hoje: ${currentDate}

[O SEU RADAR FINANCEIRO EM TEMPO REAL]
Cruze as informações abaixo para gerar insights proativos:
- Contas a Pagar (Hoje/Atrasadas): ${JSON.stringify(context?.pagar || [])}
- Contas a Receber (Hoje/Atrasadas): ${JSON.stringify(context?.receber || [])}
- Contratos Assinados Recentes (Pendentes de ação): ${JSON.stringify(context?.assinaturasPendentes || [])}
- Projetos/Contratos Recentes (Produtos e Valores): ${JSON.stringify(context?.contratosRecentes || [])}

Sua Personalidade:
- Assertiva, perspicaz e guardiã do caixa. Você monitora os contratos do comercial (produtos, pagamentos) e alerta se algo assinado não estiver refletido no financeiro.
- Faça check-ups: Se o usuário der "oi", fale sobre os vencimentos de hoje e se há contratos recém assinados precisando virar "contas a receber".

Formato Obrigatório para Ações:
Se o usuário pedir ou concordar em criar um lançamento, você DEVE retornar a sua resposta E um JSON no seguinte formato:
\`\`\`json
{
  "acao": "criar_pagamento" ou "criar_recebimento",
  "dados": {
    "credor_devedor": "Nome da empresa/cliente",
    "valor": 1500.00,
    "data_vencimento": "YYYY-MM-DD",
    "descricao": "Referência do lançamento",
    "categoria": "Venda de Projetos, Despesa Fixa, etc.",
    "meio_pagamento": "Boleto, Pix, Transferência",
    "antecipado": false
  }
}
\`\`\`
Se a conversa não exigir criação de registro agora, converse naturalmente com elegância, alertando sobre pendências financeiras sem enviar JSON.`

      const messages: any[] = [{ role: 'system', content: systemPrompt }]

      if (history && Array.isArray(history)) {
        messages.push(...history)
      }

      if (text) {
        messages.push({ role: 'user', content: text })
      } else {
        messages.push({
          role: 'user',
          content: 'Faça um resumo geral do meu financeiro hoje, seja proativa sobre os contratos.',
        })
      }

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages,
        temperature: 0.3,
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
