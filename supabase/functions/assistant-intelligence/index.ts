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

    const { character, moduleName, contextData } = await req.json()

    if (!character || !moduleName) {
      throw new Error('Parâmetros character e moduleName são obrigatórios.')
    }

    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiKey) {
      throw new Error('OPENAI_API_KEY não configurada no servidor.')
    }

    const openai = new OpenAI({ apiKey: openaiKey })

    const systemPrompt = `Você é ${character}, assistente virtual especialista do módulo "${moduleName}" de um Sistema de Gestão para fábrica de móveis de alto padrão (Bender Haussform).
Sua resposta deve ser curta (no máximo 2 frases), amigável, e dar uma dica ou comentário pertinente ao que o usuário está vendo na tela.
Contexto atual da tela (rota): ${JSON.stringify(contextData)}
Não use jargão técnico complexo. Seja direto, proativo, acolhedor e aja como se fosse uma pessoa da equipe falando com o usuário do sistema.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: 'Diga algo relevante sobre a tela atual para me ajudar ou orientar.',
        },
      ],
      temperature: 0.7,
      max_tokens: 150,
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
