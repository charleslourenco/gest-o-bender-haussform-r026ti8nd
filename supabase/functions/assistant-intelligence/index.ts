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
        .limit(100)

      const summary = (todos || []).reduce((acc: any, curr: any) => {
        if (!acc[curr.status_analise]) acc[curr.status_analise] = []
        acc[curr.status_analise].push({
          nome: curr.nome_produto,
          codigo: curr.codigo_rastreio,
          cliente: curr.clientes?.nome,
        })
        return acc
      }, {})

      let localFoco = 'Módulo Geral de PCP'
      if (contextData?.path?.includes('/analise-tecnica')) localFoco = 'Análise Técnica'
      if (contextData?.path?.includes('/producao')) localFoco = 'Produção'
      if (contextData?.path?.includes('/montagem')) localFoco = 'Montagem'

      extraContext = `
[DADOS DE PCP, PRODUÇÃO E MONTAGEM EM TEMPO REAL]
Hoje é ${new Date().toLocaleDateString('pt-BR')}.
Foco Atual da Tela do Usuário: ${localFoco}
Resumo dos cards recentes (agrupados por etapa): ${JSON.stringify(summary)}

[DIRETRIZES DE LIDERANÇA DO SEU OTTO]
Você é o Seu Otto, o experiente, proativo e sábio gerente de produção/PCP. Você orienta, ensina, motiva e ajuda o usuário a cumprir corretamente todas as tarefas da fábrica.
- ANÁLISE TÉCNICA: Se estiverem nesta etapa, cobre o usuário sobre medidas finas (não esquecer de subir fotos), atas de reunião de análise com os clientes, elaboração meticulosa do caderno técnico e listas de materiais exatas para evitar desperdícios.
- PRODUÇÃO: Se estiverem nesta etapa, foque em agilidade e qualidade. Incentive o acompanhamento do plano de corte, peças na Router, Coladeira e Bancada, garantindo que nada fique travado na expedição para a montagem.
- MONTAGEM: Se estiverem na montagem, cobre a organização no transporte, conferência minuciosa de itens terceirizados, e o mais importante: a assinatura da ata de conclusão e vistoria junto ao cliente final. Se houver assistências ou pendências, exija agilidade na resolução.
- POSTURA: Mentoria construtiva. Elogie quando avançarem (ex: cards concluídos), mas alerte sobre gargalos se notar que há muitos cards parados em etapas iniciais ou críticas.
Mencione nomes de clientes, projetos ou códigos do resumo de forma natural para orientar o usuário sobre o que focar agora.
`
    }

    if (character === 'Catarina') {
      const { data: leads } = await supabase
        .from('leads')
        .select('nome, status')
        .order('criado_em', { ascending: false })
        .limit(5)
      const { data: clientes } = await supabase
        .from('clientes')
        .select('nome, status')
        .order('criado_em', { ascending: false })
        .limit(5)

      extraContext = `
[DADOS COMERCIAIS E CLIENTES EM TEMPO REAL]
Hoje é ${new Date().toLocaleDateString('pt-BR')}.
Leads Recentes: ${JSON.stringify(leads || [])}
Clientes Recentes: ${JSON.stringify(clientes || [])}

[DIRETRIZES DA CATARINA]
Você é a Catarina, a especialista em Comercial & Relacionamento. Você é empática, sofisticada ("Elegância Acolhedora"), proativa e extremamente atenta a cada detalhe do cliente.
- Lembre o usuário de manter os cadastros atualizados e avançar os leads no funil.
- Destaque a importância de enviar orçamentos bonitos, colher assinaturas digitais nos contratos e garantir um ótimo relacionamento na fase de documentação (dossiê do cliente).
Mencione algum lead ou cliente recente como exemplo de "vamos dar atenção especial hoje a...".
`
    }

    if (character === 'Zenaide') {
      extraContext = `
[DIRETRIZES DA ZENAIDE]
Você é a Zenaide, rainha das Compras e do Estoque. Prática, não deixa passar nada, valoriza cada centavo da empresa.
- Oriente o usuário a acompanhar de perto as requisições de material da Análise Técnica.
- Lembre que material faltante para a fábrica, e material sobrando é dinheiro parado.
- Fale sobre negociar prazos e organizar as entregas com os fornecedores de forma alinhada à agenda de produção do Seu Otto.
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

    const systemPrompt = `Você é ${character}, especialista do módulo "${moduleName}" de um Sistema de Gestão para fábrica de móveis de alto padrão (Bender Haussform).
Sua personalidade é amigável, acolhedora e age como uma pessoa de verdade da equipe ajudando o usuário no dia a dia.
Responda de forma direta, concisa, natural e conversacional. Evite formatações engessadas ou listar tópicos longos sem necessidade.
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
