import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

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

    const rawContent =
      payload.text?.message ||
      payload.message ||
      payload.body ||
      (typeof payload.text === 'string' ? payload.text : '') ||
      payload.caption ||
      payload.image?.caption ||
      payload.video?.caption ||
      payload.document?.caption ||
      ''
    const messageText =
      typeof rawContent === 'string' ? rawContent.trim() : String(rawContent || '').trim()

    // Helper: extrair e validar nome de perfil real do WhatsApp
    const cleanDigits = (str: string) => str.replace(/\D/g, '')
    const phoneDigits = cleanDigits(phone)

    const isValidRealName = (name: any): boolean => {
      if (!name || typeof name !== 'string') return false
      const trimmed = name.trim()
      if (!trimmed) return false
      // Se for apenas dígitos/pontuação de telefone
      const onlyDigits = cleanDigits(trimmed)
      if (onlyDigits.length > 0 && /^[0-9+ \-()]+$/.test(trimmed)) {
        return false
      }
      // Se for estritamente igual ao número de telefone ou contiver apenas o telefone
      if (
        phoneDigits &&
        (onlyDigits === phoneDigits || trimmed === phone || trimmed === rawPhone)
      ) {
        return false
      }
      return true
    }

    const candidateSenderName =
      payload.senderName || payload.contactName || payload.chatName || payload.pushName || ''
    const senderName = isValidRealName(candidateSenderName) ? candidateSenderName.trim() : 'Cliente'

    // Captura e deduplicação de external_id Z-API / PlugZapi
    const rawExternalId =
      payload.messageId ||
      payload.zaapId ||
      payload.id ||
      payload.external_id ||
      payload.wamid ||
      null
    const msgExternalId = rawExternalId ? String(rawExternalId).trim() : null

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

    // Deduplicate webhooks
    if (msgExternalId) {
      const { data: existingMsg, error: existingMsgErr } = await supabase
        .from('whatsapp_messages')
        .select('id')
        .eq('external_id', msgExternalId)
        .maybeSingle()

      if (existingMsgErr) console.error('Erro ao verificar mensagem duplicada:', existingMsgErr)
      if (existingMsg) {
        return new Response('Duplicate message ignored', { status: 200 })
      }
    }

    // Lead Lookup / Creation
    let { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .eq('telefone', phone)
      .order('criado_em', { ascending: false })
      .limit(1)

    if (leadsError) console.error('Erro ao buscar leads:', leadsError)

    let lead = leads && leads.length > 0 ? leads[0] : null
    const isNewContact = !lead
    const nowStr = new Date().toISOString()

    // Para novos leads, se o nome não for real/válido, salvar como 'Cliente' (e nunca telefone ou número)
    const initialLeadName =
      isValidRealName(senderName) && senderName !== 'Cliente' ? senderName : 'Cliente'

    if (isNewContact) {
      const { data: newLead, error } = await supabase
        .from('leads')
        .insert({
          nome: initialLeadName,
          telefone: phone,
          email: `${phone}@whatsapp.com`,
          origem: 'WhatsApp',
          status: 'Novo contato',
          notas: '',
          atualizado_em: nowStr,
          kanban_ativo: true,
        })
        .select('*')
        .single()

      if (error) {
        console.error('Erro ao criar novo lead:', error)
      } else {
        lead = newLead
      }
    }

    // Ensure a session exists and is flagged as human-managed (step 99)
    // so manual operators always have full context.
    let { data: session, error: sessionErr } = await supabase
      .from('whatsapp_sessions')
      .select('*')
      .eq('phone', phone)
      .maybeSingle()

    if (sessionErr) console.error('Erro ao buscar sessão:', sessionErr)

    if (!session) {
      const { data: newSession, error: newSessErr } = await supabase
        .from('whatsapp_sessions')
        .insert({
          phone,
          lead_id: lead?.id || null,
          step: 99,
        })
        .select('*')
        .single()

      if (newSessErr) {
        console.error('Erro ao criar sessão:', newSessErr)
      } else {
        session = newSession
      }
    } else if (session.step !== 99) {
      // Normalize existing sessions to human-managed (manual mode).
      const { error: normErr } = await supabase
        .from('whatsapp_sessions')
        .update({ step: 99, updated_at: nowStr })
        .eq('id', session.id)

      if (normErr) console.error('Erro ao normalizar sessão para modo manual:', normErr)
      session = { ...session, step: 99, updated_at: nowStr }
    }

    // Outbound message sent from the connected WhatsApp (fromMe).
    // Logged for history/context. No automated follow-up is performed.
    if (payload.fromMe) {
      if (lead) {
        const { error: leadUpdateErr } = await supabase
          .from('leads')
          .update({
            status_atendimento: 'em_atendimento',
            atualizado_em: nowStr,
          })
          .eq('id', lead.id)

        if (leadUpdateErr) console.error('Erro ao atualizar lead (fromMe):', leadUpdateErr)
      }

      if (session) {
        const { error: sessionUpdateErr } = await supabase
          .from('whatsapp_sessions')
          .update({
            step: 99,
            last_human_interaction_at: nowStr,
            updated_at: nowStr,
          })
          .eq('id', session.id)

        if (sessionUpdateErr) console.error('Erro ao atualizar sessão (fromMe):', sessionUpdateErr)
      }

      // Melhoria 5: Blindar contra mensagens fromMe sem texto (figurinha, áudio, imagem sem legenda)
      if (!messageText) {
        return new Response('Empty fromMe message ignored', { status: 200 })
      }

      // Melhoria 4: Operador real nas mensagens fromMe
      const candidateOperatorName =
        payload.userName ||
        payload.operatorName ||
        payload.agentName ||
        payload.senderName ||
        payload.authorName ||
        payload.sender?.name ||
        ''
      const fromMeSenderName = isValidRealName(candidateOperatorName)
        ? candidateOperatorName.trim()
        : 'Equipe'

      const { error: insertAnaErr } = await supabase.from('whatsapp_messages').insert({
        lead_id: lead?.id || null,
        phone,
        sender_type: 'ana',
        sender_name: fromMeSenderName,
        content: messageText,
        external_id: msgExternalId,
        direction: 'outbound',
        created_at: extractedTimestamp,
      })

      if (insertAnaErr) console.error('Erro ao inserir mensagem da Ana/Equipe:', insertAnaErr)

      return new Response('Outbound logged (manual mode)', { status: 200 })
    }

    // Inbound customer message — always record it for manual follow-up.
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

    // Update session/lead context so operators know there's a new pending message.
    if (session) {
      const { error: sessionTouchErr } = await supabase
        .from('whatsapp_sessions')
        .update({ updated_at: nowStr })
        .eq('id', session.id)

      if (sessionTouchErr) console.error('Erro ao atualizar sessão (inbound):', sessionTouchErr)
    }

    if (lead) {
      // Para contatos que JÁ EXISTEM no sistema, NUNCA alterar status, coluna ou pipeline.
      // Apenas atualizar atualizado_em e status_atendimento para indicação de resposta pendente.
      const updatePayload: any = {
        atualizado_em: nowStr,
        status_atendimento: 'aguardando_resposta',
      }

      // Melhoria 3: Auto-atualização do nome do lead
      // Quando a mensagem trouxer um nome de perfil real e o lead estiver com nome genérico ("Cliente")
      // ou com o telefone como nome, atualizar automaticamente.
      const isLeadNameGenericOrPhone = (nomeAtual: string | null | undefined): boolean => {
        if (!nomeAtual || !nomeAtual.trim()) return true
        const trimmed = nomeAtual.trim()
        const lower = trimmed.toLowerCase()
        if (lower === 'cliente' || lower === 'novo cliente' || lower === 'sem nome') {
          return true
        }
        // Se for puramente numérico ou formado por dígitos e símbolos de telefone
        const onlyDigits = cleanDigits(trimmed)
        if (onlyDigits.length > 0 && /^[0-9+ \-()]+$/.test(trimmed)) {
          return true
        }
        if (
          phoneDigits &&
          (onlyDigits === phoneDigits || trimmed === phone || trimmed === rawPhone)
        ) {
          return true
        }
        return false
      }

      if (
        isValidRealName(senderName) &&
        senderName !== 'Cliente' &&
        isLeadNameGenericOrPhone(lead.nome)
      ) {
        updatePayload.nome = senderName
      }

      const { error: leadUpdateErr } = await supabase
        .from('leads')
        .update(updatePayload)
        .eq('id', lead.id)

      if (leadUpdateErr) console.error('Erro ao atualizar lead (inbound):', leadUpdateErr)
    }

    return new Response('Inbound logged (manual mode)', { status: 200 })
  } catch (e: any) {
    console.error('Erro geral no webhook:', e)
    return new Response('Error', { status: 500 })
  }
})
