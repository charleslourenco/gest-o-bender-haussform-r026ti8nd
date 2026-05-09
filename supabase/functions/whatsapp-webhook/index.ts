import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import OpenAI from 'npm:openai@4'

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    const payload = await req.json()

    // Ignorar mensagens enviadas pelo próprio bot ou de grupos
    if (payload.fromMe || payload.isGroup) {
      return new Response('Ignored', { status: 200 })
    }

    const rawPhone = payload.phone || payload.from || payload.sender || ''
    if (!rawPhone) return new Response('No phone', { status: 200 })

    // 1. Extrair o número removendo tudo após o @
    let phone = rawPhone.split('@')[0].replace(/\D/g, '')

    // 2, 3 e 4. Normalizar para 13 dígitos inserindo o 9 após o DDD se faltar
    if (phone.startsWith('55') && phone.length === 12) {
      phone = phone.substring(0, 4) + '9' + phone.substring(4)
    } else if (!phone.startsWith('55')) {
      if (phone.length === 10) {
        phone = '55' + phone.substring(0, 2) + '9' + phone.substring(2)
      } else if (phone.length === 11) {
        phone = '55' + phone
      }
    }

    const messageText = payload.text?.message || payload.message || payload.body || ''
    const senderName = payload.senderName || payload.contactName || 'Cliente'

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Buscar ou criar o Lead
    // Utilizando limit(1) ao invés de maybeSingle() para evitar erros caso existam contatos duplicados (o que impedia a resposta em novos DDDs/números)
    let { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .eq('telefone', phone)
      .order('criado_em', { ascending: false })
      .limit(1)

    if (leadsError) {
      console.error('Erro ao buscar leads:', leadsError)
    }

    let lead = leads && leads.length > 0 ? leads[0] : null
    const nowStr = new Date().toISOString()

    if (!lead) {
      const { data: newLead, error } = await supabase
        .from('leads')
        .insert({
          nome: senderName,
          telefone: phone,
          email: `${phone}@whatsapp.com`, // Email fake pois o campo é obrigatório
          origem: 'WhatsApp',
          status: 'Novo Lead',
          notas: `[Iniciado atendimento via WhatsApp com Catarina]\n[Cliente]: ${messageText}`,
          atualizado_em: nowStr,
        })
        .select('*')
        .single()

      if (error) throw error
      lead = newLead
    } else {
      const newNotes = (lead.notas ? lead.notas + '\n' : '') + `[Cliente]: ${messageText}`
      await supabase
        .from('leads')
        .update({
          notas: newNotes,
          atualizado_em: nowStr,
        })
        .eq('id', lead.id)
      lead.notas = newNotes
    }

    // Buscar ou criar a sessão do fluxo
    let { data: session } = await supabase
      .from('whatsapp_sessions')
      .select('*')
      .eq('phone', phone)
      .maybeSingle()

    if (!session) {
      const { data: newSession } = await supabase
        .from('whatsapp_sessions')
        .insert({
          phone,
          lead_id: lead.id,
          step: 0,
        })
        .select('*')
        .single()
      session = newSession
    }

    // Comando oculto para o cliente poder resetar a sessão de testes que ficou presa
    if (messageText.trim().toUpperCase() === 'RESETAR') {
      if (session) await supabase.from('whatsapp_sessions').update({ step: 0 }).eq('id', session.id)
      if (lead)
        await supabase
          .from('leads')
          .update({ status: 'Novo Lead', notas: '[Sessão reiniciada pelo usuário]' })
          .eq('id', lead.id)

      const zapiInstance = Deno.env.get('ZAPI_INSTANCE_ID')
      const zapiToken = Deno.env.get('ZAPI_TOKEN')
      if (zapiInstance && zapiToken) {
        await fetch(`https://api.z-api.io/instances/${zapiInstance}/token/${zapiToken}/send-text`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Client-Token':
              Deno.env.get('ZAPI_CLIENT_TOKEN') || 'Fcd7b503ddede4e319ddc7e79f96948daS',
          },
          body: JSON.stringify({
            phone,
            message: 'Sessão reiniciada. A Catarina está pronta para conversar novamente.',
          }),
        }).catch(() => {})
      }
      return new Response('Reset OK', { status: 200 })
    }

    // Se já finalizou (99), ignora (foi pro transbordo/humano)
    if (session.step === 99 || lead.status !== 'Novo Lead') {
      return new Response('Handed over', { status: 200 })
    }

    // Preparar mensagens para a OpenAI
    const systemPrompt = `Você é a Catarina, consultora virtual da fábrica de móveis de alto padrão Bender Haussform.
Sua personalidade é "Elegância Acolhedora" - educada, empática, sofisticada, mas acessível.

Nossa fábrica e loja ficam localizadas em **Balneário Piçarras - SC**.
Nossos principais serviços são:
1. Projeto e fabricação própria de móveis sob medida.
2. Fabricação de projetos de arquitetos, designers de interiores e projetistas.
3. Fornecimento de móveis soltos (cadeiras, sofás, camas, etc.) compatibilizados com a estética do projeto sob medida.
4. Serviço de Acompanhamento de Obras.

Seu objetivo é fazer uma triagem inicial do cliente de forma conversacional.
Você precisa descobrir as seguintes informações (faça UMA pergunta por vez, flua com a conversa, sem pressa para encerrar):
1. O ambiente que deseja transformar.
2. Como conheceu a Bender (Instagram, indicação, etc.).
3. Em qual cidade ou bairro fica o imóvel.
4. Status do imóvel (planta, reforma, pronto).
5. Ideia de investimento estimado.

Regras de Ouro:
- NA SUA PRIMEIRA MENSAGEM, você DEVE se apresentar de forma agradável informando seu nome, cargo e de onde somos, por exemplo: "Olá! Sou a Catarina, Consultora Virtual da Bender Haussform, de Balneário Piçarras - SC."
- Trate o cliente pelo nome se souber (nome atual fornecido pelo WhatsApp: ${senderName}).
- Seja natural, não pareça um formulário robótico. Reaja ao que o cliente diz.
- Atendemos exclusivamente o litoral de SC e regiões próximas a Balneário Piçarras. Se o cliente for de uma cidade fora da nossa área de cobertura, informe educadamente que atendemos apenas nestas regiões específicas, MAS NÃO ENCERRE o atendimento bruscamente (não dê transbordo imediato por causa disso).
- Se o cliente perguntar sobre nossos serviços, liste os nossos 4 pilares descritos acima.
- NÃO ENCERRE O ATENDIMENTO CEDO DEMAIS. Só marque transbordo = true QUANDO:
  a) O cliente pedir explicitamente para falar com um consultor/humano/especialista; OU
  b) O assunto for assistência técnica/reparo; OU
  c) Você já tiver finalizado a coleta de TODAS as informações principais (os 5 pontos de triagem) e for a hora de repassar ao consultor.
- Ao marcar transbordo = true, SEMPRE envie uma última mensagem avisando o cliente que um de nossos especialistas vai assumir a conversa em breve.
- Retorne SEMPRE um JSON válido com a seguinte estrutura:
{
  "resposta": "Sua resposta aqui. Pode usar ||| para quebrar em múltiplas mensagens",
  "transbordo": boolean,
  "dados_extraidos": {
    "ambiente": "string com o que descobriu AGORA (ou null)",
    "origem": "string com o que descobriu AGORA (ou null)",
    "localizacao": "string com o que descobriu AGORA (ou null)",
    "status_imovel": "string com o que descobriu AGORA (ou null)",
    "investimento": "string com o que descobriu AGORA (ou null)"
  }
}
IMPORTANTE: Em 'dados_extraidos', só preencha os campos com informações que o cliente acabou de fornecer nesta última mensagem. Para informações antigas ou ainda não fornecidas, use null.`

    const messages: any[] = [{ role: 'system', content: systemPrompt }]

    if (lead.notas) {
      const lines = lead.notas.split('\n')
      for (const line of lines) {
        if (line.startsWith('[Cliente]: ')) {
          messages.push({ role: 'user', content: line.substring(11).trim() })
        } else if (line.startsWith('[Catarina]: ')) {
          messages.push({ role: 'assistant', content: line.substring(12).trim() })
        }
      }
    }

    const openaiKey = Deno.env.get('OPENAI_API_KEY')

    try {
      if (!openaiKey) {
        throw new Error('OPENAI_API_KEY não configurada nas variáveis de ambiente.')
      }

      const openai = new OpenAI({ apiKey: openaiKey })

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages,
        response_format: { type: 'json_object' },
        temperature: 0.7,
      })

      const resultText = completion.choices[0].message.content
      if (!resultText) throw new Error('Sem resposta da IA')

      const result = JSON.parse(resultText)
      const responseText = result.resposta || ''
      const isTransbordo = result.transbordo === true
      const dados = result.dados_extraidos || {}

      await processResponse(supabase, lead, session, phone, responseText, isTransbordo, dados)

      return new Response('OK', { status: 200 })
    } catch (apiError: any) {
      console.error('Erro na API da OpenAI ou processamento de IA:', apiError)

      const isConfigError = apiError.message?.includes('OPENAI_API_KEY')

      // Envia uma mensagem amigável sem dar transbordo automático em caso de erro de configuração,
      // para não travar a sessão em "Aguardando Atendimento" por acidente.
      const fallbackResponse = isConfigError
        ? `Desculpe, meu sistema está temporariamente indisponível. Por favor, tente enviar sua mensagem novamente em instantes.`
        : `Tive uma falha técnica de conexão. Você pode tentar novamente ou aguardar nosso consultor.`

      await processResponse(supabase, lead, session, phone, fallbackResponse, !isConfigError, {})
      return new Response('OK', { status: 200 })
    }
  } catch (e: any) {
    console.error('Erro geral no webhook:', e)
    return new Response('Error', { status: 500 })
  }
})

async function processResponse(
  supabase: any,
  lead: any,
  session: any,
  phone: string,
  responseText: string,
  isTransbordo: boolean,
  dados: any,
) {
  let extraNotes = ''
  if (dados.ambiente && dados.ambiente !== 'null')
    extraNotes += `\n[Novo Dado - Ambiente]: ${dados.ambiente}`
  if (dados.origem && dados.origem !== 'null')
    extraNotes += `\n[Novo Dado - Origem]: ${dados.origem}`
  if (dados.localizacao && dados.localizacao !== 'null')
    extraNotes += `\n[Novo Dado - Localização]: ${dados.localizacao}`
  if (dados.status_imovel && dados.status_imovel !== 'null')
    extraNotes += `\n[Novo Dado - Status do Imóvel]: ${dados.status_imovel}`
  if (dados.investimento && dados.investimento !== 'null')
    extraNotes += `\n[Novo Dado - Investimento]: ${dados.investimento}`

  const readableText = responseText.replace(/\|\|\|/g, ' ')
  const finalNotes = (lead.notas || '') + extraNotes + `\n[Catarina]: ${readableText}`

  let nextStep = session.step
  let nextStatus = lead.status

  if (isTransbordo) {
    nextStep = 99
    // Mantém nextStatus como o status atual ('Novo Lead') para não sumir do Kanban na coluna inicial.
  } else if (session.step === 0) {
    nextStep = 1 // Sai do 0 para indicar que já iniciou
  }

  await supabase
    .from('leads')
    .update({
      notas: finalNotes,
      status: nextStatus,
      origem:
        dados.origem && dados.origem !== 'null'
          ? `WhatsApp - ${String(dados.origem).substring(0, 50)}`
          : lead.origem,
    })
    .eq('id', lead.id)

  if (nextStep !== session.step) {
    await supabase
      .from('whatsapp_sessions')
      .update({ step: nextStep, updated_at: new Date().toISOString() })
      .eq('id', session.id)
  }

  // Envia mensagem pelo Z-API
  const zapiInstance = Deno.env.get('ZAPI_INSTANCE_ID')
  const zapiToken = Deno.env.get('ZAPI_TOKEN')

  if (zapiInstance && zapiToken && responseText) {
    const zapiUrl = `https://api.z-api.io/instances/${zapiInstance}/token/${zapiToken}/send-text`

    try {
      const messages = responseText
        .split('|||')
        .map((m: string) => m.trim())
        .filter(Boolean)

      for (const msg of messages) {
        const payload = {
          phone,
          message: msg,
        }

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Client-Token': Deno.env.get('ZAPI_CLIENT_TOKEN') || 'Fcd7b503ddede4e319ddc7e79f96948daS',
        }

        const zapiRes = await fetch(zapiUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        })

        if (!zapiRes.ok) {
          console.error('Erro na resposta do Z-API:', zapiRes.status, 'Payload:', payload)
        }

        // Small delay between messages to simulate human typing and guarantee order
        if (messages.length > 1) {
          await new Promise((resolve) => setTimeout(resolve, 1500))
        }
      }
    } catch (e) {
      console.error('Falha de rede ao chamar Z-API:', e)
    }
  }
}
