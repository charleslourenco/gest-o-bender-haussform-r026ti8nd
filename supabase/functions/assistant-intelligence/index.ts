import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import OpenAI from 'npm:openai@4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, x-supabase-client-platform, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Header Authorization não encontrado.')
    }

    const { character, moduleName, contextData, userMessage, chatHistory } = await req.json()

    if (!character || !moduleName) {
      throw new Error('Parâmetros character e moduleName são obrigatórios.')
    }

    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiKey) {
      throw new Error('OPENAI_API_KEY não configurada no servidor.')
    }

    const openai = new OpenAI({ apiKey: openaiKey })

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    })

    let extraContext = ''
    if (character === 'Dona Edith') {
      const today = new Date().toISOString().split('T')[0]
      const { data: pagar } = await supabase
        .from('contas_pagar')
        .select('fornecedor, valor, data_vencimento')
        .eq('status_pagamento', 'aguardando')
        .lte('data_vencimento', today)

      const { data: receber } = await supabase
        .from('contas_receber')
        .select('valor, data_vencimento, cliente_id, cliente:clientes(nome)')
        .eq('status_pagamento', 'aguardando')
        .lte('data_vencimento', today)

      const { data: assinaturas } = await supabase
        .from('assinaturas')
        .select('documento_nome, signatario_nome, data_assinatura')
        .eq('status', 'assinado')
        .order('data_assinatura', { ascending: false })
        .limit(3)

      extraContext = `
[DADOS FINANCEIROS EM TEMPO REAL]
Hoje é ${new Date().toLocaleDateString('pt-BR')}.
Contas a Pagar hoje ou atrasadas: ${JSON.stringify(pagar || [])}
Contas a Receber hoje ou atrasadas: ${JSON.stringify(receber || [])}
Contratos recém-assinados (últimos 3): ${JSON.stringify(assinaturas || [])}

Dica: Se o usuário perguntar sobre as tarefas de hoje ou pendências, leia esses dados. Avise se tem boletos para pagar/receber hoje, e se tem contratos novos assinados (sugira lançar no contas a receber).
`
    }

    const systemPrompt = `Você é ${character}, assistente virtual especialista do módulo "${moduleName}" de um Sistema de Gestão para fábrica de móveis de alto padrão (Bender Haussform).
Sua personalidade é amigável, proativa, acolhedora e age como uma pessoa da equipe falando com o usuário do sistema.
Responda de forma direta, concisa e natural, sem jargões complexos.
Contexto atual da tela (rota): ${JSON.stringify(contextData)}
${extraContext}`

    const messages: any[] = [{ role: 'system', content: systemPrompt }]

    if (chatHistory && Array.isArray(chatHistory)) {
      messages.push(...chatHistory.map((m: any) => ({ role: m.role, content: m.content })))
    }

    if (userMessage) {
      messages.push({ role: 'user', content: userMessage })
    } else if (!chatHistory || chatHistory.length === 0) {
      messages.push({
        role: 'user',
        content:
          'Diga um breve "Olá", apresente-se com uma dica sobre o que posso fazer aqui e pergunte se preciso de ajuda.',
      })
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages,
      temperature: 0.7,
      max_tokens: 250,
    })

    const message = completion.choices[0].message.content

    return new Response(JSON.stringify({ message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('Erro no assistant-intelligence:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
