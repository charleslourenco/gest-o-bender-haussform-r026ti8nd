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

    // Extract Webhook Timestamp
    let extractedTimestamp = new Date().toISOString()
    if (payload.timestamp) {
      const ts =
        typeof payload.timestamp === 'number' ? payload.timestamp : parseInt(payload.timestamp, 10)
      if (!isNaN(ts)) {
        extractedTimestamp = new Date(ts > 10000000000 ? ts : ts * 1000).toISOString()
      }
    } else if (payload.moment) {
      const ts = typeof payload.moment === 'number' ? payload.moment : parseInt(payload.moment, 10)
      if (!isNaN(ts)) {
        extractedTimestamp = new Date(ts > 10000000000 ? ts : ts * 1000).toISOString()
      }
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    if (payload.isGroup) {
      return new Response('Ignored', { status: 200 })
    }

    // Check if message already exists to avoid duplicate webhook processing
    const { data: existingMsg, error: existingMsgErr } = await supabase
      .from('whatsapp_messages')
      .select('id')
      .eq('external_id', msgExternalId)
      .maybeSingle()

    if (existingMsgErr) console.error('Erro ao verificar mensagem duplicada:', existingMsgErr)

    if (existingMsg) {
      return new Response('Duplicate message ignored', { status: 200 })
    }

    // 1. Lead Lookup / Creation
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
          kanban_ativo: false,
        })
        .select('*')
        .single()

      if (error) {
        console.error('Erro ao criar novo lead:', error)
      } else {
        lead = newLead
      }
    }

    // 2. Process Human Sent (fromMe)
    if (payload.fromMe) {
      if (lead) {
        const { error: sessionUpdateErr } = await supabase
          .from('whatsapp_sessions')
          .update({
            step: 99,
            last_human_interaction_at: nowStr,
          })
          .eq('phone', phone)

        if (sessionUpdateErr) console.error('Erro ao atualizar sessão (fromMe):', sessionUpdateErr)

        let newStatus = lead.status
        if (lead.status === 'Novo Lead') {
          newStatus = 'Aguardando Consultor'
        }

        const { error: leadUpdateErr } = await supabase
          .from('leads')
          .update({
            status: newStatus,
            atualizado_em: nowStr,
          })
          .eq('id', lead.id)

        if (leadUpdateErr) console.error('Erro ao atualizar lead (fromMe):', leadUpdateErr)
      }

      const { error: insertAnaErr } = await supabase.from('whatsapp_messages').insert({
        lead_id: lead?.id || null,
        phone,
        sender_type: 'ana',
        sender_name: 'Ana',
        content: messageText,
        external_id: msgExternalId,
        direction: 'outbound',
        created_at: extractedTimestamp,
      })

      if (insertAnaErr) console.error('Erro ao inserir mensagem da Ana:', insertAnaErr)

      return new Response('Ignored fromMe', { status: 200 })
    }

    // 3. Process Customer Sent (!fromMe)
    const { error: insertClientErr } = await supabase.from('whatsapp_messages').insert({
      lead_id: lead?.id || null,
      phone,
      sender_type: 'cliente',
      sender_name: senderName,
      content: messageText,
      external_id: msgExternalId,
      direction: 'inbound',
      created_at: extractedTimestamp,
    })

    if (insertClientErr) console.error('Erro ao inserir mensagem do Cliente:', insertClientErr)

    // Session Management
    let { data: session, error: sessionErr } = await supabase
      .from('whatsapp_sessions')
      .select('*')
      .eq('phone', phone)
      .maybeSingle()

    if (sessionErr) console.error('Erro ao buscar sessão:', sessionErr)

    if (!session && lead) {
      const { data: newSession, error: newSessErr } = await supabase
        .from('whatsapp_sessions')
        .insert({
          phone,
          lead_id: lead.id,
          step: 0,
        })
        .select('*')
        .single()

      if (newSessErr) {
        console.error('Erro ao criar sessão:', newSessErr)
      } else {
        session = newSession
      }
    }

    if (!lead || !session) {
      return new Response('Failsafe sem lead ou session', { status: 200 })
    }

    // Reset Flow
    if (messageText.trim().toUpperCase() === 'RESETAR') {
      await supabase.from('whatsapp_sessions').update({ step: 0 }).eq('id', session.id)
      await supabase.from('leads').update({ status: 'Novo Lead' }).eq('id', lead.id)

      const botMsg = 'Sessão reiniciada. A Catarina está pronta para conversar novamente.'

      const { error: insertCatarinaResetErr } = await supabase.from('whatsapp_messages').insert({
        lead_id: lead.id,
        phone,
        sender_type: 'catarina',
        sender_name: 'Catarina',
        content: botMsg,
        direction: 'outbound',
        created_at: new Date().toISOString(),
      })

      if (insertCatarinaResetErr)
        console.error('Erro ao inserir mensagem da Catarina (Reset):', insertCatarinaResetErr)

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

    // Human Managed Flow
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
          (m: any) =>
            (m.sender_type === 'assistant' || m.sender_type === 'catarina') && m.created_at,
        )
        if (lastStandbyMsg) {
          lastStandbyTime = new Date(lastStandbyMsg.created_at).getTime()
        }
        const lastAnaMsg = recentMsgs.find(
          (m: any) => (m.sender_type === 'user' || m.sender_type === 'ana') && m.created_at,
        )
        if (lastAnaMsg) {
          lastAnaTime = Math.max(lastAnaTime, new Date(lastAnaMsg.created_at).getTime())
        }
        alreadySentInThisBlock = lastStandbyTime > lastAnaTime
      }

      if (diffMins >= 60 && lastAnaTime <= lastCustomerMsgAt.getTime()) {
        if (!alreadySentInThisBlock) {
          const botMsg = `Por favor, aguarde o retorno da Ana. Ela responderá em breve.`

          const { error: insertCatarinaStandbyErr } = await supabase
            .from('whatsapp_messages')
            .insert({
              lead_id: lead.id,
              phone,
              sender_type: 'catarina',
              sender_name: 'Catarina',
              content: botMsg,
              direction: 'outbound',
              created_at: new Date().toISOString(),
            })

          if (insertCatarinaStandbyErr)
            console.error(
              'Erro ao inserir mensagem da Catarina (Espera):',
              insertCatarinaStandbyErr,
            )

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

    // AI Flow
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
    "categoria": "Comercial | Já é Cliente | Fornecedor | Assistência | Currículo | Arquiteto Externo | Parceiro | Equipe | Outros Assuntos (Tente adivinhar qual é com base no assunto. Se incerto, use 'Comercial')"
  }
}
IMPORTANTE: Em 'dados_extraidos', só preencha os campos com informações que o cliente acabou de fornecer nesta última mensagem (com exceção de 'categoria', que você pode inferir do contexto). Para informações antigas ou ainda não fornecidas, use null.

Notas da administração sobre o Lead (Leve em consideração para o contexto):
${lead.notas || 'Nenhuma nota adicional'}`

    const messages: any[] = [{ role: 'system', content: systemPrompt }]

    if (pastMsgs) {
      for (const m of pastMsgs) {
        if (m.sender_type === 'lead' || m.sender_type === 'cliente') {
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
  const readableText = responseText.replace(/\|\|\|/g, ' ')

  const { error: insertCatarinaErr } = await supabase.from('whatsapp_messages').insert({
    lead_id: lead.id,
    phone,
    sender_type: 'catarina',
    sender_name: 'Catarina',
    content: readableText,
    direction: 'outbound',
    created_at: new Date().toISOString(),
  })

  if (insertCatarinaErr)
    console.error('Erro ao inserir mensagem da Catarina (Resposta):', insertCatarinaErr)

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
    'Já é Cliente',
    'Fornecedor',
    'Assistência',
    'Currículo',
    'Arquiteto Externo',
    'Parceiro',
    'Equipe',
    'Outros Assuntos',
  ]
  const catSugerida =
    dados.categoria && validCategorias.includes(dados.categoria) ? dados.categoria : lead.categoria

  const updatePayload: any = {
    status: nextStatus,
    atualizado_em: new Date().toISOString(),
  }

  if (catSugerida && catSugerida !== lead.categoria) {
    updatePayload.categoria = catSugerida
  }

  if (dados.origem && dados.origem !== 'null') {
    updatePayload.origem = `WhatsApp - ${String(dados.origem).substring(0, 50)}`
  }

  const { error: updateLeadErr } = await supabase
    .from('leads')
    .update(updatePayload)
    .eq('id', lead.id)

  if (updateLeadErr) console.error('Erro ao atualizar status/categoria do lead:', updateLeadErr)

  if (nextStep !== session.step) {
    const { error: updateSessionErr } = await supabase
      .from('whatsapp_sessions')
      .update({ step: nextStep, updated_at: new Date().toISOString() })
      .eq('id', session.id)

    if (updateSessionErr) console.error('Erro ao atualizar step da sessão:', updateSessionErr)
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
