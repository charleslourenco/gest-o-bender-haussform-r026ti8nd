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

    if (character === 'Seu Otto') {
      const { data: todos } = await supabase
        .from('produtos_servicos_projeto')
        .select('id, nome_produto, codigo_rastreio, status_analise, clientes(nome)')
        .order('atualizado_em', { ascending: false })
        .limit(30)

      const summary = (todos || []).reduce((acc: any, curr: any) => {
        if (!acc[curr.status_analise]) acc[curr.status_analise] = []
        acc[curr.status_analise].push({
          nome: curr.nome_produto,
          codigo: curr.codigo_rastreio,
          cliente: curr.clientes?.nome,
        })
        return acc
      }, {})

      extraContext = `
[DADOS DE PRODUÇÃO EM TEMPO REAL]
Hoje é ${new Date().toLocaleDateString('pt-BR')}.
Resumo dos 30 cards mais recentes no Kanban de Análise Técnica por Coluna: ${JSON.stringify(summary)}

[DIRETRIZES DE ORIENTAÇÃO PARA O KANBAN DE ANÁLISE TÉCNICA]
Você DEVE orientar o usuário sobre as atividades necessárias dependendo das movimentações e etapas dos projetos no Kanban.
- Iniciar: "Um contrato foi liberado para o PCP os cards ja estao na primeira coluna e precisam de um usuario responsavel."
- Medida fina: "Seu projeto esta avancando, nao esqueca de subir as fotos da medida fina na pasta do cliente no módulo clientes!!!"
- Reunião de análise: "Chegamos em um momento importante para o sucesso do projeto, a reuniao de análise é onde o Consultor o Analista e o cliente definem tudo sobre o projeto. Use o assistente (Dossiê) para gravar a reuniao ou outro aplicativo, transforme a ata em documento, suba na pasta do cliente e solicite assinatura de todos os envolvidos."
- Caderno técnico: "Aqui o trabalho deve ser meticuloso! o caderno técnico é o que garante o sucesso do projeto e a satisfacao do cliente. depois de concluí-lo suba ele na pasta do cliente e solicite a assinatura."
- Alteração de projeto: "Caso aja alteracao de projeto informe que precisa ser preenchido o termo de alteracao de projeto e solicitada a assinatura do cliente."
- Lista de materiais: "Uma das pecas chave para o sucesso de toda a operacao: aqui precisamos verificar exatamente tudo que vai ser usado no projeto com exatidão e respeito a economia de materiais e recursos. Especial atencao a itens que precisam ser feitos fora da fabrica como serralheria, estofados, portas de aluminio e vidros etc."
- Concluído / Aguardando plano de corte: "Dê um caloroso parabens, dizendo que somos uma verdadeira equipe e o talento do usuario fez a diferenca."

Dica: Aja como o experiente gerente de produção Seu Otto. Fale de forma proativa sobre organizar as demandas do Kanban e alertando sobre prazos e atividades críticas de acordo com a etapa que o projeto está. Não seja repetitivo ou mecânico; interaja livremente explicando as tarefas no sistema com essa dinâmica, baseando-se no resumo do Kanban atual.
Mencione nomes de clientes e códigos (como JCS-SAL01) de forma natural para orientar o usuário.
`
    }

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
