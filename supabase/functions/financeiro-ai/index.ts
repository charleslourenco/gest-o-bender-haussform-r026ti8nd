import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import OpenAI from 'npm:openai@4'
import pdf from 'npm:pdf-parse@1.1.1'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, x-supabase-client-platform, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { action, payload } = await req.json()
    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiKey) throw new Error('Chave da OpenAI não configurada.')
    const openai = new OpenAI({ apiKey: openaiKey })

    if (action === 'ocr') {
      const { imageBase64, isPdf } = payload
      let pdfText = ''

      if (isPdf) {
        try {
          const base64Data = imageBase64.split(',')[1] || imageBase64
          const buffer = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0))
          const data = await pdf(buffer)
          pdfText = data.text
        } catch (e) {
          console.error('PDF Parse Error', e)
        }
      }

      const userContent: any[] = [
        {
          type: 'text',
          text: 'Extraia os dados do comprovante em anexo (pode ser nota fiscal, fatura ou boleto), identifique bem o nome do cliente/fornecedor e as parcelas:',
        },
      ]

      if (isPdf && pdfText) {
        userContent.push({ type: 'text', text: `Conteúdo extraído do PDF:\n${pdfText}` })
      } else {
        userContent.push({ type: 'image_url', image_url: { url: imageBase64 } })
      }

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content:
              'Você é a Dona Edith, super assistente financeira, sábia e meticulosa. Extraia informações precisas deste comprovante (boleto, recibo, nota fiscal, fatura de cartão) e retorne APENAS um JSON com as chaves: "fornecedor" (nome preciso do cliente/emissor/credor/devedor extraído do documento), "valor" (número float, valor total bruto/líquido exato), "data_vencimento" (YYYY-MM-DD), "codigo_barras" (se houver, senão null), "categoria" (sugira uma categoria financeira), "meio_pagamento" (Boleto, Pix, Cartão, Transferência), "parcelas" (inteiro, quantidade de parcelas se houver, senão 1), "valor_parcela" (número float, se for parcelado, valor exato da parcela), "tipo" (retorne "despesa" ou "receita" com base no contexto).',
          },
          {
            role: 'user',
            content: userContent,
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

      const systemPrompt = `Você é Dona Edith, a experiente, sábia e acolhedora assistente financeira da Bender Haussform.
Data de hoje: ${currentDate}

[O SEU RADAR FINANCEIRO EM TEMPO REAL]
Cruze as informações abaixo para gerar insights proativos:
- Contas a Pagar (Hoje/Atrasadas): ${JSON.stringify(context?.pagar || [])}
- Contas a Receber (Hoje/Atrasadas): ${JSON.stringify(context?.receber || [])}
- Contratos Assinados Recentes (Pendentes de ação): ${JSON.stringify(context?.assinaturasPendentes || [])}
- Projetos/Contratos Recentes (Produtos e Valores): ${JSON.stringify(context?.contratosRecentes || [])}

Sua Personalidade:
- Sábia, acolhedora, educada e perspicaz. Fale como uma parceira de negócios experiente.
- NUNCA mencione que você está gerando códigos, JSON, ou jargões técnicos. Sua comunicação deve ser 100% natural e humana.
- Se o usuário concordar em lançar um pagamento ou recebimento, confirme amigavelmente que você fará isso, de forma clara e objetiva, colocando tudo em seu devido lugar (nome com nome, valor com valor).

INSTRUÇÃO ESTRITA PARA AÇÃO NO SISTEMA:
Para criar um lançamento, você DEVE anexar um bloco JSON isolado no FINAL da sua mensagem. O usuário NÃO verá esse bloco, o sistema vai processá-lo silenciosamente.
O bloco DEVE estar exatamente no formato abaixo, isolado pelas tags \`\`\`json e \`\`\`:

\`\`\`json
{
  "acao": "criar_pagamento" ou "criar_recebimento",
  "dados": {
    "credor_devedor": "Nome exato da empresa ou do cliente conforme lido no contexto",
    "valor": 1500.00,
    "data_vencimento": "YYYY-MM-DD",
    "descricao": "Referência clara do lançamento (Ex: Parcela 1/3 referente ao contrato X)",
    "categoria": "Venda de Projetos, Despesa Fixa, etc.",
    "meio_pagamento": "Boleto, Pix, Transferência",
    "antecipado": false
  }
}
\`\`\`
Se a conversa não exigir a criação de um registro agora, converse naturalmente, alertando sobre pendências financeiras sem anexar nenhum bloco JSON.`

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
