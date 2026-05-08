import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

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

    const lowerMessage = messageText.toLowerCase()
    const isAssistance =
      lowerMessage.includes('assistência') ||
      lowerMessage.includes('assistencia') ||
      lowerMessage.includes('conserto') ||
      lowerMessage.includes('defeito') ||
      lowerMessage.includes('reparo') ||
      lowerMessage.includes('problema')

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Buscar ou criar o Lead
    let { data: lead } = await supabase
      .from('leads')
      .select('*')
      .eq('telefone', phone)
      .maybeSingle()
    let isNewLead = false
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
      isNewLead = true
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

    let responseText = ''
    let nextStep = session.step
    let nextStatus = lead.status

    if (isAssistance) {
      responseText =
        'Pode deixar. Vou acionar a nossa equipe técnica agora mesmo para falar com você.|||Só um momento, por favor.'
      nextStep = 99 // Transbordo (Fim do fluxo)
      nextStatus = 'Aguardando Atendimento'
    } else {
      switch (session.step) {
        case 0:
          responseText = `Oi${senderName !== 'Cliente' ? ' ' + senderName : ''}! Que bom ter você por aqui 😊|||Me conta, como você chegou até a Bender?`
          nextStep = 1
          break
        case 1:
          await supabase
            .from('leads')
            .update({ origem: `WhatsApp - ${messageText.substring(0, 50)}` })
            .eq('id', lead.id)
          responseText = `Ah, que legal!|||E você já conversou com algum dos nossos consultores antes, ou é a primeira vez?`
          nextStep = 2
          break
        case 2:
          if (
            lowerMessage.includes('sim') ||
            lowerMessage.includes('já') ||
            lowerMessage.includes('ja')
          ) {
            responseText = `Entendi!|||Vou avisar a equipe para que o consultor que já te conhece retome o contato. Só um minutinho, tá?`
            nextStep = 99
            nextStatus = 'Aguardando Atendimento'
          } else {
            responseText = `Ah, perfeito! Aqui nós desenhamos projetos sob medida e temos nossa própria marcenaria, além de curadoria de móveis incríveis.|||Me diz uma coisa: em qual cidade ou bairro fica o imóvel que você quer mobiliar?`
            nextStep = 3
          }
          break
        case 3:
          await supabase
            .from('leads')
            .update({
              notas: (lead.notas || '') + `\nLocalização do imóvel: ${messageText}`,
            })
            .eq('id', lead.id)
          responseText = `Legal! E como está o imóvel agora?|||Já está pronto, ainda na planta, em reforma...?`
          nextStep = 4
          break
        case 4:
          await supabase
            .from('leads')
            .update({
              notas: (lead.notas || '') + `\nStatus do imóvel: ${messageText}`,
            })
            .eq('id', lead.id)
          responseText = `Entendi.|||Para a gente pensar em um projeto que faça sentido para você, qual seria mais ou menos o investimento que você tem em mente?`
          nextStep = 5
          break
        case 5:
          await supabase
            .from('leads')
            .update({
              notas: (lead.notas || '') + `\nTeto de investimento: ${messageText}`,
            })
            .eq('id', lead.id)
          responseText = `Maravilha! Nós atendemos desde projetos para investimento até nível Casa Cor, temos bastante flexibilidade.|||Vou pedir para um dos nossos consultores te chamar. Assim vocês podem conversar melhor e até marcar um café aqui no nosso showroom. Pode ser?`
          nextStep = 6
          break
        case 6:
          responseText = `Combinado então! Logo alguém da nossa equipe te chama aqui. Até mais! ✨`
          nextStep = 99
          nextStatus = 'Aguardando Atendimento'
          break
        case 99:
          // Caso já esteja em transbordo, não responde nada automaticamente
          return new Response('OK', { status: 200 })
      }
    }

    if (nextStep !== session.step || nextStatus !== lead.status) {
      await supabase
        .from('whatsapp_sessions')
        .update({
          step: nextStep,
          updated_at: new Date().toISOString(),
        })
        .eq('id', session.id)

      if (nextStatus !== lead.status) {
        await supabase.from('leads').update({ status: nextStatus }).eq('id', lead.id)
      }

      // Salva a resposta da Catarina nas notas
      if (responseText) {
        const readableText = responseText.replace(/\|\|\|/g, '\n')
        const finalNotes =
          (lead.notas ? lead.notas + '\n' : '') +
          (nextStep > session.step && nextStep !== 99 && session.step !== 0 ? `\n` : '') +
          `[Catarina]: ${readableText}`

        await supabase.from('leads').update({ notas: finalNotes }).eq('id', lead.id)

        // Envia mensagem pelo Z-API
        const zapiInstance = Deno.env.get('ZAPI_INSTANCE_ID')
        const zapiToken = Deno.env.get('ZAPI_TOKEN')

        if (zapiInstance && zapiToken) {
          let cleanPhone = phone // Já normalizado no início do arquivo

          const zapiUrl = `https://api.z-api.io/instances/${zapiInstance}/token/${zapiToken}/send-text`

          try {
            const messages = responseText
              .split('|||')
              .map((m) => m.trim())
              .filter(Boolean)

            for (const msg of messages) {
              const payload = {
                phone: cleanPhone,
                message: msg,
              }

              const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                'Client-Token':
                  Deno.env.get('ZAPI_CLIENT_TOKEN') || 'Fcd7b503ddede4e319ddc7e79f96948daS',
              }

              const zapiRes = await fetch(zapiUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
              })

              const contentType = zapiRes.headers.get('content-type') || ''
              const isJson = contentType.includes('application/json')
              const zapiData = isJson
                ? await zapiRes.json().catch(() => null)
                : await zapiRes.text()

              if (!zapiRes.ok || (isJson && zapiData && zapiData.error)) {
                console.error(
                  'Erro na resposta do Z-API:',
                  zapiRes.status,
                  zapiData,
                  'Payload enviado:',
                  payload,
                )
                await supabase
                  .from('leads')
                  .update({
                    notas:
                      finalNotes +
                      `\n[Erro do Sistema]: Falha ao enviar WhatsApp para ${cleanPhone}. Z-API retornou: ${JSON.stringify(zapiData || 'Erro desconhecido')}`,
                  })
                  .eq('id', lead.id)
              } else {
                console.log('Mensagem enviada com sucesso para', cleanPhone)
              }

              // Small delay between messages to simulate human typing and guarantee order
              if (messages.length > 1) {
                await new Promise((resolve) => setTimeout(resolve, 1500))
              }
            }
          } catch (e) {
            const error = e as Error
            console.error('Falha de rede ao chamar Z-API:', error)
            await supabase
              .from('leads')
              .update({
                notas:
                  finalNotes +
                  `\n[Erro do Sistema]: Falha de rede ao chamar Z-API. Detalhes: ${error.message}`,
              })
              .eq('id', lead.id)
          }
        } else {
          console.error(
            'Credenciais Z-API (ZAPI_INSTANCE_ID ou ZAPI_TOKEN) não configuradas nas variáveis de ambiente.',
          )
          await supabase
            .from('leads')
            .update({
              notas: finalNotes + `\n[Erro do Sistema]: Credenciais Z-API não configuradas.`,
            })
            .eq('id', lead.id)
        }
      }
    }

    return new Response('OK', { status: 200 })
  } catch (e: any) {
    console.error(e)
    return new Response('Error', { status: 500 })
  }
})
