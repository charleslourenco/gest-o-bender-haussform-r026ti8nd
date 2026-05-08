import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import OpenAI from 'npm:openai'

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
    let { data: lead } = await supabase
      .from('leads')
      .select('*')
      .eq('telefone', phone)
      .maybeSingle()
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

    // Se já finalizou (99), ignora (foi pro transbordo/humano)
    if (session.step === 99 || lead.status !== 'Novo Lead') {
      return new Response('Handed over', { status: 200 })
    }

    // Preparar mensagens para a OpenAI
    const systemPrompt = `Você é a Catarina, consultora virtual da fábrica de móveis de alto padrão Bender Haussform.
Sua personalidade é "Elegância Acolhedora" - educada, empática, sofisticada, mas acessível.

Seu objetivo é fazer uma triagem inicial do cliente de forma conversacional, coletando os seguintes dados (faça as perguntas aos poucos, flua com a conversa):
1. O ambiente que deseja transformar.
2. Como conheceu a Bender (Instagram, indicação, etc.).
3. Em qual cidade ou bairro fica o imóvel.
4. Status do imóvel (planta, reforma, pronto).
5. Ideia de investimento estimado.

Regras de Ouro:
- Trate o cliente pelo nome se souber (nome atual fornecido pelo WhatsApp: ${senderName}).
- Seja natural, não pareça um formulário robótico. Reaja ao que o cliente diz (ex: se ele fala que foi indicação, fique feliz).
- Atendemos principalmente o litoral de SC. Se for muito fora de SC, você pode avisar com elegância que nossa área de atuação padrão é o litoral catarinense, mas passe para o especialista mesmo assim.
- Se o cliente falar sobre assistência técnica, conserto, defeito ou reparo, acione a equipe técnica imediatamente (marque transbordo = true).
- Quando coletar todas as informações principais ou se o cliente quiser pular direto para falar com o especialista, diga que vai conectá-lo a um consultor e marque transbordo = true.
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
      const fallbackResponse = `Olá! Sou a Catarina. No momento, meu sistema de inteligência está sendo atualizado. Um consultor entrará em contato com você em breve!`
      await processResponse(supabase, lead, session, phone, fallbackResponse, true, {})
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
    nextStatus = 'Aguardando Atendimento'
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
