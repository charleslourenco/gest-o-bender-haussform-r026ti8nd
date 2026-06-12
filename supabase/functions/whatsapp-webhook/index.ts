import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import OpenAI from 'npm:openai@4'

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    const payload = await req.json()

    const rawPhone = payload.phone || payload.from || payload.sender || ''
    if (!rawPhone) return new Response('No phone', { status: 200 })

    let phone = rawPhone.split('@')[0].replace(/\D/g, '')

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
    const msgExternalId =
      payload.messageId ||
      payload.id ||
      `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    if (payload.isGroup) {
      return new Response('Ignored', { status: 200 })
    }

    // Check if message already exists to avoid duplicate webhook processing
    const { data: existingMsg } = await supabase
      .from('whatsapp_messages')
      .select('id')
      .eq('external_id', msgExternalId)
      .maybeSingle()

    if (existingMsg) {
      return new Response('Duplicate message ignored', { status: 200 })
    }

    if (payload.fromMe) {
      let { data: leads } = await supabase
        .from('leads')
        .select('*')
        .eq('telefone', phone)
        .order('criado_em', { ascending: false })
        .limit(1)
      let currentLead = leads && leads.length > 0 ? leads[0] : null

      if (currentLead) {
        await supabase
          .from('whatsapp_sessions')
          .update({
            step: 99,
            last_human_interaction_at: new Date().toISOString(),
          })
          .eq('phone', phone)

        let newStatus = currentLead.status
        if (currentLead.status === 'Novo Lead') {
          newStatus = 'Aguardando Consultor'
        }

        await supabase
          .from('leads')
          .update({
            status: newStatus,
            atualizado_em: new Date().toISOString(),
          })
          .eq('id', currentLead.id)

        await supabase.from('whatsapp_messages').insert({
          lead_id: currentLead.id,
          phone,
          sender_type: 'user',
          sender_name: 'Ana',
          content: messageText,
          external_id: msgExternalId,
          direction: 'outbound',
        })
      }
      return new Response('Ignored fromMe', { status: 200 })
    }

    let { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .eq('telefone', phone)
      .order('criado_em', { ascending: false })
      .limit(1)

    if (leadsError) console.error('Erro ao buscar leads:', leadsError)

    let lead = leads && leads.length > 0 ? leads[0] : null
    const nowStr = new Date().toISOString()

    if (!lead) {
      const { data: newLead, error } = await supabase
        .from('leads')
        .insert({
          nome: senderName,
          telefone: phone,
          email: `${phone}@whatsapp.com`,
          origem: 'WhatsApp',
          status: 'Novo Lead',
          notas: '',
          atualizado_em: nowStr,
        })
        .select('*')
        .single()

      if (error) throw error
      lead = newLead
    }

    await supabase.from('whatsapp_messages').insert({
      lead_id: lead.id,
      phone,
      sender_type: 'lead',
      sender_name: senderName,
      content: messageText,
      external_id: msgExternalId,
      direction: 'inbound',
    })

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

    if (messageText.trim().toUpperCase() === 'RESETAR') {
      if (session) await supabase.from('whatsapp_sessions').update({ step: 0 }).eq('id', session.id)
      if (lead) await supabase.from('leads').update({ status: 'Novo Lead' }).eq('id', lead.id)

      const botMsg = 'Sessão reiniciada. A Catarina está pronta para conversar novamente.'
      await supabase.from('whatsapp_messages').insert({
        lead_id: lead.id,
        phone,
        sender_type: 'assistant',
        sender_name: 'Catarina',
        content: botMsg,
        direction: 'outbound',
      })

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
          body: JSON.stringify({ phone, message: botMsg }),
        }).catch(() => {})
      }
      return new Response('Reset OK', { status: 200 })
    }

    const isHumanManaged =
      session.step === 99 || lead.status !== 'Novo Lead' || lead.consultor_id !== null

    if (isHumanManaged) {
      const now = new Date()
      const lastCustomerMsgAt = session.updated_at
        ? new Date(session.updated_at)
        : new Date(session.created_at)
      const diffMins = (now.getTime() - lastCustomerMsgAt.getTime()) / 60000

      const lastHumanAt = session.last_human_interaction_at
        ? new Date(session.last_human_interaction_at)
        : new Date(0)

      const { data: recentMsgs } = await supabase
        .from('whatsapp_messages')
        .select('created_at, sender_type')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: false })
        .limit(20)

      let alreadySentInThisBlock = false
      let lastAnaTime = lastHumanAt.getTime()
      let lastStandbyTime = 0

      if (recentMsgs) {
        const lastStandbyMsg = recentMsgs.find(
          (m: any) => m.sender_type === 'assistant' && m.created_at,
        )
        if (lastStandbyMsg) {
          lastStandbyTime = new Date(lastStandbyMsg.created_at).getTime()
        }
        const lastAnaMsg = recentMsgs.find((m: any) => m.sender_type === 'user' && m.created_at)
        if (lastAnaMsg) {
          lastAnaTime = Math.max(lastAnaTime, new Date(lastAnaMsg.created_at).getTime())
        }
        alreadySentInThisBlock = lastStandbyTime > lastAnaTime
      }

      if (diffMins >= 60 && lastAnaTime <= lastCustomerMsgAt.getTime()) {
        if (!alreadySentInThisBlock) {
          const botMsg = `Por favor, aguarde o retorno da Ana. Ela responderá em breve.`

          await supabase.from('whatsapp_messages').insert({
            lead_id: lead.id,
            phone,
            sender_type: 'assistant',
            sender_name: 'Catarina',
            content: botMsg,
            direction: 'outbound',
          })

          const zapiInstance = Deno.env.get('ZAPI_INSTANCE_ID')
          const zapiToken = Deno.env.get('ZAPI_TOKEN')
          if (zapiInstance && zapiToken) {
            await fetch(
              `https://api.z-api.io/instances/${zapiInstance}/token/${zapiToken}/send-text`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Client-Token':
                    Deno.env.get('ZAPI_CLIENT_TOKEN') || 'Fcd7b503ddede4e319ddc7e79f96948daS',
                },
                body: JSON.stringify({ phone, message: botMsg }),
              },
            ).catch(() => {})
          }

          const { data: cli } = await supabase
            .from('clientes')
            .select('id')
            .eq('lead_id', lead.id)
            .maybeSingle()
          if (cli) {
            await supabase.from('timeline_eventos').insert({
              cliente_id: cli.id,
              usuario_nome: 'Catarina',
              acao: 'Mensagem de espera enviada pela Catarina (Atraso Humano)',
              icone: '⏳',
            })
          }
        }
      }

      await supabase
        .from('whatsapp_sessions')
        .update({
          updated_at: nowStr,
        })
        .eq('id', session.id)

      await supabase
        .from('leads')
        .update({
          atualizado_em: nowStr,
        })
        .eq('id', lead.id)

      return new Response('Handed over', { status: 200 })
    }

    await supabase
      .from('whatsapp_sessions')
      .update({
        updated_at: nowStr,
      })
      .eq('id', session.id)

    const { data: pastMsgs } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: true })
      .limit(100)

    const systemPrompt = `Você é a Catarina, SDR (Sales Development Representative) e consultora virtual da fábrica de móveis de alto padrão Bender Haussform.
Sua personalidade é "Elegância Acolhedora" - educada, empática, sofisticada, mas acessível. Você atua como parceira da Ana, nossa especialista comercial.

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
- VERIFIQUE O HISTÓRICO: O histórico da conversa está nas mensagens anteriores. Se você já falou com o cliente antes, NÃO se apresente novamente e retome o assunto de forma natural (ex: "Dando sequência ao que falávamos...").
- PRIMEIRA MENSAGEM: Se não houver histórico de conversas, apresente-se amigavelmente. Ex: "Olá! Sou a Catarina, Consultora Virtual da Bender Haussform, de Balneário Piçarras - SC."
- TRANSIÇÃO PARA A ANA: Quando for realizar o transbordo, SEMPRE diga que vai repassar a conversa para a **Ana**. (Ex: "Vou repassar suas informações para a Ana, nossa especialista...").
- Trate o cliente pelo nome se souber (nome atual fornecido pelo WhatsApp: ${senderName}).
- Seja natural, não pareça um formulário robótico. Reaja ao que o cliente diz.
- Atendemos exclusivamente o litoral de SC e regiões próximas a Balneário Piçarras. Se o cliente for de uma cidade fora da área, informe educadamente, MAS NÃO ENCERRE o atendimento bruscamente.
- NÃO ENCERRE O ATENDIMENTO CEDO DEMAIS. Só marque transbordo = true QUANDO:
  a) O cliente pedir explicitamente para falar com um consultor/humano/Ana; OU
  b) O assunto for assistência técnica/reparo; OU
  c) Você já tiver finalizado a coleta de TODAS as informações principais (os 5 pontos de triagem) e for a hora de repassar para a Ana.
- Ao marcar transbordo = true, SEMPRE envie uma última mensagem avisando o cliente que a **Ana** vai assumir a conversa em breve.
- Retorne SEMPRE um JSON válido com a seguinte estrutura:
{
  "resposta": "Sua resposta aqui. Pode usar ||| para quebrar em múltiplas mensagens",
  "transbordo": boolean,
  "dados_extraidos": {
    "ambiente": "string (ou null)",
    "origem": "string (ou null)",
    "localizacao": "string (ou null)",
    "status_imovel": "string (ou null)",
    "investimento": "string (ou null)",
    "categoria": "Comercial | Corretor(a) | Já é cliente | Fornecedor | Assistência | Currículos | Arquiteto Externo | Outros Assuntos (Tente adivinhar qual é com base no assunto. Se incerto, use 'Comercial')"
  }
}
IMPORTANTE: Em 'dados_extraidos', só preencha os campos com informações que o cliente acabou de fornecer nesta última mensagem (com exceção de 'categoria', que você pode inferir do contexto). Para informações antigas ou ainda não fornecidas, use null.

Notas da administração sobre o Lead (Leve em consideração para o contexto):
${lead.notas || 'Nenhuma nota adicional'}`

    const messages: any[] = [{ role: 'system', content: systemPrompt }]

    if (pastMsgs) {
      for (const m of pastMsgs) {
        if (m.sender_type === 'lead') {
          messages.push({ role: 'user', content: m.content })
        } else {
          messages.push({ role: 'assistant', content: m.content })
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

      const fallbackResponse = isConfigError
        ? `Desculpe, meu sistema está temporariamente indisponível. Por favor, tente enviar sua mensagem novamente em instantes.`
        : `Tive uma falha técnica de conexão. Você pode tentar novamente ou aguardar a Ana falar com você.`

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

  const currentNotes = lead.notas ? lead.notas.trim() : ''
  const addedNotes = extraNotes.trim()
  let finalNotes = currentNotes
  if (addedNotes) {
    finalNotes = currentNotes ? `${currentNotes}\n${addedNotes}` : addedNotes
  }

  await supabase.from('whatsapp_messages').insert({
    lead_id: lead.id,
    phone,
    sender_type: 'assistant',
    sender_name: 'Catarina',
    content: readableText,
    direction: 'outbound',
  })

  let nextStep = session.step
  let nextStatus = lead.status

  if (isTransbordo) {
    nextStep = 99
    nextStatus = 'Aguardando Consultor'
  } else if (session.step === 0) {
    nextStep = 1
  }

  const validCategorias = [
    'Comercial',
    'Outros Assuntos',
    'Parceiro',
    'Equipe',
    'Corretor(a)',
    'Já é cliente',
    'Fornecedor',
    'Assistência',
    'Currículos',
    'Arquiteto Externo',
  ]
  const catSugerida =
    dados.categoria && validCategorias.includes(dados.categoria) ? dados.categoria : lead.categoria

  const updatePayload: any = {
    notas: finalNotes,
    status: nextStatus,
    atualizado_em: new Date().toISOString(),
  }

  if (catSugerida && catSugerida !== lead.categoria) {
    updatePayload.categoria = catSugerida
  }

  if (dados.origem && dados.origem !== 'null') {
    updatePayload.origem = `WhatsApp - ${String(dados.origem).substring(0, 50)}`
  }

  await supabase.from('leads').update(updatePayload).eq('id', lead.id)

  if (nextStep !== session.step) {
    await supabase
      .from('whatsapp_sessions')
      .update({ step: nextStep, updated_at: new Date().toISOString() })
      .eq('id', session.id)
  }

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

        if (messages.length > 1) {
          await new Promise((resolve) => setTimeout(resolve, 1500))
        }
      }
    } catch (e) {
      console.error('Falha de rede ao chamar Z-API:', e)
    }
  }
}
