import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    const payload = await req.json()

    // Helper: extrair apenas dígitos
    const cleanDigits = (str: string) => (str || '').replace(/\D/g, '')

    // Helper: normalizar número brasileiro para o formato 55 + DDD (2) + 9 dígitos = 13 dígitos
    const normalizePhoneNumber = (raw: string): string => {
      if (!raw) return ''
      let p = cleanDigits(raw.split('@')[0])
      if (!p) return ''

      // Se for um LID do WhatsApp (ex: 13 a 15 dígitos sem código de país coerente ou sufixo @lid)
      // Um número válido de telefone brasileiro tem 10 ou 11 dígitos sem DDI, ou 12/13 com DDI 55.
      // Se o número começa com 55 e tem 12 dígitos, acrescenta 9 no nono dígito:
      if (p.startsWith('55')) {
        if (p.length === 12) {
          p = p.substring(0, 4) + '9' + p.substring(4)
        }
      } else {
        if (p.length === 10) {
          p = '55' + p.substring(0, 2) + '9' + p.substring(2)
        } else if (p.length === 11) {
          p = '55' + p
        }
      }
      return p
    }

    // Identificar se uma string é claramente um LID do WhatsApp
    const isLidIdentifier = (val: string): boolean => {
      if (!val) return false
      const str = String(val).trim()
      if (str.includes('@lid')) return true
      const digits = cleanDigits(str)
      // LIDs são sequências numéricas de 13 a 16 dígitos que NÃO começam com prefixos telefônicos válidos esperados (ex: não é 55...)
      // Ou se começa com 55 mas tem 14+ dígitos
      if (digits.length >= 13 && !digits.startsWith('55')) return true
      if (digits.length > 13) return true
      return false
    }

    // Verificar se um número é um telefone plausível (E.164 brasileiro tem 12 ou 13 dígitos começando com 55, ou internacional com 10-13)
    const isValidPhone = (p: string): boolean => {
      const digits = cleanDigits(p)
      if (!digits) return false
      if (isLidIdentifier(p)) return false
      // No Brasil: 55 + DDD (2 dígitos) + 8 ou 9 dígitos = 12 ou 13 dígitos
      if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
        return true
      }
      // Outros países: 10 a 13 dígitos sem ser LID
      if (digits.length >= 10 && digits.length <= 13) {
        return true
      }
      return false
    }

    // Tentativa de resolver número real a partir de múltiplos campos possíveis do payload
    const candidatePhoneFields = [
      payload.phone,
      payload.from,
      payload.sender,
      payload.chatId,
      payload.remoteJid,
      payload.wa_chatId,
      payload.participantJid,
      payload.participant,
      payload.author,
      payload.user,
      payload.to,
      payload.recipient,
      payload.chat?.id,
      payload.chat?.phone,
      payload.contact?.phone,
      payload.contact?.id,
    ]

    let resolvedPhone = ''
    let isLidEncountered = false

    for (const cand of candidatePhoneFields) {
      if (!cand) continue
      const strCand = String(cand).trim()
      if (isLidIdentifier(strCand)) {
        isLidEncountered = true
        continue
      }
      const normalized = normalizePhoneNumber(strCand)
      if (isValidPhone(normalized)) {
        resolvedPhone = normalized
        break
      }
    }

    // Se nenhum campo forneceu telefone válido mas havia campos informados
    let phone = resolvedPhone
    const rawPrimaryPhone = payload.phone || payload.from || payload.sender || ''
    if (!phone) {
      // Se não encontrou telefone válido e foi um LID não resolvível
      const rawNormalized = normalizePhoneNumber(rawPrimaryPhone)
      if (isValidPhone(rawNormalized)) {
        phone = rawNormalized
      } else {
        // Telefone não resolvível (ex: LID puro)
        phone = rawNormalized // manter para rastreio em logs ou busca
      }
    }

    const isPhoneValid = isValidPhone(phone)

    const rawContent =
      payload.text?.message ||
      payload.message ||
      payload.body ||
      (typeof payload.text === 'string' ? payload.text : '') ||
      payload.caption ||
      payload.image?.caption ||
      payload.video?.caption ||
      payload.document?.caption ||
      payload.document?.fileName ||
      payload.fileName ||
      ''
    let messageText =
      typeof rawContent === 'string' ? rawContent.trim() : String(rawContent || '').trim()

    // Blindar inbound/mensagens sem texto (áudio, figurinha, imagem sem legenda, anexo sem nome)
    if (!messageText) {
      if (payload.sticker || payload.isSticker) {
        messageText = '[figurinha]'
      } else if (payload.audio || payload.voice || payload.isAudio) {
        messageText = '[áudio]'
      } else if (payload.image || payload.photo) {
        messageText = '[imagem]'
      } else if (payload.video) {
        messageText = '[vídeo]'
      } else if (payload.document) {
        messageText = '[documento]'
      } else if (payload.location) {
        messageText = '[localização]'
      } else if (payload.vcard || payload.contact) {
        messageText = '[contato]'
      } else if (!payload.fromMe) {
        // Para inbound de cliente sem nenhum dos tipos acima identificados
        messageText = '[mídia]'
      }
    }

    // Helper: extrair e validar nome de perfil real do WhatsApp
    const phoneDigits = cleanDigits(phone)

    // Lista de nomes de empresas ou genéricos que JAMAIS podem virar nome de lead novo
    const BLOCKED_LEAD_NAMES = [
      'bender haussform',
      'bender hausform',
      'bender',
      'haussform',
      'hausform',
      'gestao bender',
      'gestão bender',
      'cliente',
      'novo cliente',
      'sem nome',
      'null',
      'undefined',
    ]

    const isValidRealName = (name: any): boolean => {
      if (!name || typeof name !== 'string') return false
      const trimmed = name.trim()
      if (!trimmed) return false

      const lower = trimmed.toLowerCase()
      if (BLOCKED_LEAD_NAMES.includes(lower)) {
        return false
      }

      // Se for apenas dígitos/pontuação de telefone
      const onlyDigits = cleanDigits(trimmed)
      if (onlyDigits.length > 0 && /^[0-9+ \-()]+$/.test(trimmed)) {
        return false
      }
      // Se for estritamente igual ao número de telefone ou contiver apenas o telefone ou LID
      if (
        (phoneDigits && onlyDigits === phoneDigits) ||
        trimmed === phone ||
        trimmed === rawPrimaryPhone ||
        isLidIdentifier(trimmed)
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
      (payload.key && (payload.key.id || payload.key.messageId)) ||
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

    // Deduplicate webhooks (verificação prévia)
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

    // Lead Lookup por telefone (apenas se tivermos um telefone ou identificador válido)
    let lead: any = null
    if (phone) {
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .eq('telefone', phone)
        .order('criado_em', { ascending: false })
        .limit(1)

      if (leadsError) console.error('Erro ao buscar leads por telefone:', leadsError)
      if (leads && leads.length > 0) {
        lead = leads[0]
      }
    }

    const nowStr = new Date().toISOString()

    // Regra 1: fromMe NUNCA cria lead!
    // Se a mensagem for outbound (fromMe) e o lead não existir, gravamos como órfão (lead_id: null)
    if (payload.fromMe) {
      // Blindar contra mensagens fromMe sem texto (figurinha, áudio, imagem sem legenda)
      if (!messageText) {
        return new Response('Empty fromMe message ignored', { status: 200 })
      }

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

      // Sessão de WhatsApp (apenas se houver telefone válido)
      if (isPhoneValid && phone) {
        let { data: session } = await supabase
          .from('whatsapp_sessions')
          .select('id, step')
          .eq('phone', phone)
          .maybeSingle()

        if (!session) {
          await supabase.from('whatsapp_sessions').insert({
            phone,
            lead_id: lead?.id || null,
            step: 99,
            last_human_interaction_at: nowStr,
            updated_at: nowStr,
          })
        } else {
          await supabase
            .from('whatsapp_sessions')
            .update({
              step: 99,
              last_human_interaction_at: nowStr,
              updated_at: nowStr,
              ...(lead?.id ? { lead_id: lead.id } : {}),
            })
            .eq('id', session.id)
        }
      }

      // Operador real nas mensagens fromMe (nunca Bender Haussform)
      const candidateOperatorName =
        payload.userName ||
        payload.operatorName ||
        payload.agentName ||
        payload.authorName ||
        payload.sender?.name ||
        ''
      const fromMeSenderName = isValidRealName(candidateOperatorName)
        ? candidateOperatorName.trim()
        : 'Equipe'

      // Inserção atômica com on_conflict (ignora se external_id já existir)
      const { error: insertAnaErr } = await supabase.from('whatsapp_messages').upsert(
        {
          lead_id: lead?.id || null,
          phone: phone || 'unknown',
          sender_type: 'ana',
          sender_name: fromMeSenderName,
          content: messageText,
          external_id: msgExternalId,
          direction: 'outbound',
          created_at: extractedTimestamp,
        },
        msgExternalId ? { onConflict: 'external_id', ignoreDuplicates: true } : undefined,
      )

      if (insertAnaErr) console.error('Erro ao inserir mensagem da Ana/Equipe:', insertAnaErr)

      return new Response('Outbound logged (manual mode)', { status: 200 })
    }

    // Inbound (mensagens vindas do cliente):
    // Se o lead não existir, mas o telefone for válido e NÃO for LID, criar lead novo
    if (!lead && isPhoneValid && phone) {
      // Regra 3: Nunca usar nome da empresa ("Bender Haussform") ou nomes inválidos
      const initialLeadName =
        isValidRealName(senderName) && senderName !== 'Cliente' ? senderName : 'Cliente'

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

    // Sessão do WhatsApp para inbound (apenas se telefone for válido)
    let session: any = null
    if (isPhoneValid && phone) {
      const { data: existingSession } = await supabase
        .from('whatsapp_sessions')
        .select('*')
        .eq('phone', phone)
        .maybeSingle()

      session = existingSession

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
        const { error: normErr } = await supabase
          .from('whatsapp_sessions')
          .update({ step: 99, updated_at: nowStr, ...(lead?.id ? { lead_id: lead.id } : {}) })
          .eq('id', session.id)

        if (normErr) console.error('Erro ao normalizar sessão para modo manual:', normErr)
        session = { ...session, step: 99, updated_at: nowStr }
      }
    }

    // Inbound customer message — gravação atômica com onConflict em external_id
    const safeContent = messageText || '[mídia]'
    const { error: insertClientErr } = await supabase.from('whatsapp_messages').upsert(
      {
        lead_id: lead?.id || null,
        phone: phone || 'unknown',
        sender_type: 'cliente',
        sender_name: senderName,
        content: safeContent,
        external_id: msgExternalId,
        direction: 'inbound',
        created_at: extractedTimestamp,
      },
      msgExternalId ? { onConflict: 'external_id', ignoreDuplicates: true } : undefined,
    )

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

      // Reativação automática se o lead estava excluído
      if (lead.excluido === true) {
        updatePayload.excluido = false

        // Formatar data em português BR (DD/MM/AAAA às HH:mm)
        const dateObj = new Date(extractedTimestamp || nowStr)
        const dateStr = dateObj.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          timeZone: 'America/Sao_Paulo',
        })
        const timeStr = dateObj.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'America/Sao_Paulo',
        })
        const reactivateNote = `Reativado automaticamente: cliente entrou em contato via WhatsApp em ${dateStr} às ${timeStr}`

        // Registrar nota no lead respeitando o padrão existente de notas_pessoais (com prefixo de metadados se houver)
        const rawNotasPessoais = lead.notas_pessoais || ''
        const META_PREFIX = '___META_JSON___:'
        const metaIdx = rawNotasPessoais.indexOf(META_PREFIX)

        let cleanText = ''
        let metaObj: any = {}

        if (metaIdx === -1) {
          cleanText = rawNotasPessoais.trim()
        } else {
          cleanText = rawNotasPessoais.slice(0, metaIdx).trim()
          try {
            const parsed = JSON.parse(rawNotasPessoais.slice(metaIdx + META_PREFIX.length).trim())
            metaObj = parsed && typeof parsed === 'object' ? parsed : {}
          } catch {
            metaObj = {}
          }
        }

        // Limpar eventuais exclusões prévias das abas registradas no meta para que o lead reapareça normalmente
        if (Array.isArray(metaObj.exclusoes)) {
          delete metaObj.exclusoes
        }

        const updatedCleanText = cleanText
          ? `${cleanText}\n[${dateStr} ${timeStr}] ${reactivateNote}`
          : `[${dateStr} ${timeStr}] ${reactivateNote}`

        const hasMeta = Object.keys(metaObj).length > 0
        updatePayload.notas_pessoais = hasMeta
          ? `${updatedCleanText}\n\n${META_PREFIX}${JSON.stringify(metaObj)}`
          : updatedCleanText

        // Também registrar no campo notas se estiver vazio ou anexar para redundância visual
        const existingNotas = lead.notas ? lead.notas.trim() : ''
        updatePayload.notas = existingNotas
          ? `${existingNotas}\n[${dateStr} ${timeStr}] ${reactivateNote}`
          : `[${dateStr} ${timeStr}] ${reactivateNote}`
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
          (phoneDigits && onlyDigits === phoneDigits) ||
          trimmed === phone ||
          trimmed === rawPrimaryPhone ||
          isLidIdentifier(trimmed)
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
