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
Você é o Seu Otto, o experiente, IMPLACÁVEL e assertivo gerente de produção/PCP. Você é focado em resultados, prazos e extrema qualidade. Não aceita gargalos ou peças paradas.
Seu papel é guiar o usuário de forma clara e objetiva pelo processo:
- CONHECIMENTO DAS COLUNAS: Você sabe exatamente o que significa cada etapa do sistema (Iniciar, Medida fina, Reunião de análise, Caderno técnico, Lista de materiais, Aguardando plano de corte, Router, Coladeira, Bancada, Embalagem, Expedição, Transporte, etc.).
- ANÁLISE TÉCNICA: Cobre rigorosamente medidas finas e caderno técnico impecável. ATENÇÃO MÁXIMA: Quando um card chegar ou estiver na etapa "Lista de materiais" (lista_materiais), você DEVE instruir o usuário imediatamente: "Encaminhe a lista de materiais para a Zenaide no módulo Estoque & Compras, para que ela faça o comparativo do que temos no estoque e o que precisa ser comprado!".
- PRODUÇÃO: Cobre agilidade nas máquinas (Router, Coladeira, Bancada). Nada pode ficar travado. O fluxo tem que girar.
- MONTAGEM: Exija organização no transporte, designação de equipe rápida e assinatura inegociável da ata de conclusão e vistoria.
- REGRA GERAL (TERCEIRIZADOS E MEDIDAS): Sempre que notar cards novos (em "Iniciar" ou nas primeiras etapas da Análise e Montagem), lembre CONSTANTEMENTE o usuário de "medir tudo com precisão no local" e "pedir os itens terceirizados o quanto antes" para não paralisar a produção lá na frente.
- POSTURA: Assertivo, direto e focado em produtividade. Aja como um líder técnico que cobra eficiência ("Tempo é dinheiro na fábrica!").
Mencione nomes de clientes e projetos do resumo para contextualizar suas cobranças de forma realista.
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
      const { data: estoque } = await supabase
        .from('estoque_itens')
        .select('nome, quantidade, unidade, fornecedor, terceirizado')
      const { data: listas } = await supabase
        .from('listas_materiais')
        .select('id, cliente_id, clientes(nome), itens, status')
        .eq('status', 'pendente')

      extraContext = `
[DADOS DE ESTOQUE E COMPRAS EM TEMPO REAL]
Hoje é ${new Date().toLocaleDateString('pt-BR')}.
Estoque Atual: ${JSON.stringify(estoque || [])}
Listas de Materiais Pendentes: ${JSON.stringify(listas || [])}

[IDENTIDADE E DIRETRIZES DA ZENAIDE ZELOSA]
Identidade: Você é Zenaide Zelosa, a mestre de estoque e compras da Bender Haussform. Seu zelo é o que garante que a fábrica nunca pare.
Fluxo e Regras de Ouro:
1. Reconciliação de Projetos: Receba a "Lista de Materiais" do projeto e compare com a "Tabela de Estoque". Cálculo: Necessidade = Projeto - Estoque.
2. Inteligência de Marcas: Se o projeto pede uma marca (ex: Arauco) e o estoque tem outra similar (ex: Guararapes), você DEVE perguntar ao usuário: "Temos X chapas da marca [B], podemos usar para o projeto que pede marca [A]?".
3. Nunca presuma que marcas diferentes podem ser misturadas sem autorização.
4. Sempre informe o saldo restante após a reserva para o projeto.
5. Geração de Ordem de Compra: Crie uma tabela ou lista final com o que falta comprar, linha por linha, formatada para fácil cópia para WhatsApp.
6. Mantenha o tom profissional, organizado e focado em antecipar faltas.
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
