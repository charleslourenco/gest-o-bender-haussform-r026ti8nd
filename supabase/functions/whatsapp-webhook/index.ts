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
        case 0: {
          const greeting = senderName !== 'Cliente' ? `Olá, ${senderName},` : `Olá,`
          responseText = `${greeting} eu sou a Catarina, consultora virtual da Bender. Tudo bem por aí?|||Antes de falarmos de medidas, me conta: qual é o ambiente que você mais quer transformar hoje?`
          nextStep = 1
          break
        }
        case 1: {
          const updatedNotes = (lead.notas || '') + `\n[Ambiente Desejado]: ${messageText}`
          await supabase.from('leads').update({ notas: updatedNotes }).eq('id', lead.id)
          lead.notas = updatedNotes

          responseText = `Pensar nesse espaço é sempre especial${senderName !== 'Cliente' ? ', ' + senderName : ''}.|||Me diz uma coisa, como você conheceu o nosso trabalho? Foi pelo Instagram, alguma indicação...?`
          nextStep = 2
          break
        }
        case 2: {
          const isIndication =
            lowerMessage.includes('indica') ||
            lowerMessage.includes('corretor') ||
            lowerMessage.includes('arquiteto') ||
            lowerMessage.includes('designer') ||
            lowerMessage.includes('engenheir')
          const updatedNotes =
            (lead.notas || '') +
            `\n[Origem do Contato]: ${messageText}` +
            (isIndication ? `\n[Possível Indicador]: Verificar detalhes no histórico.` : '')

          await supabase
            .from('leads')
            .update({
              origem: `WhatsApp - ${messageText.substring(0, 50)}`,
              notas: updatedNotes,
            })
            .eq('id', lead.id)

          lead.notas = updatedNotes

          let originReaction = 'Entendi! Ficamos felizes que tenha chegado até nós.'
          if (lowerMessage.includes('instagram') || lowerMessage.includes('insta')) {
            originReaction =
              'Ah, que bom ver você saindo do nosso Instagram para conversar com a gente!'
          } else if (isIndication) {
            originReaction =
              'Que alegria! Adoramos quando chegam por indicação, é o maior reconhecimento do nosso trabalho.'
          } else if (
            lowerMessage.includes('anúncio') ||
            lowerMessage.includes('google') ||
            lowerMessage.includes('facebook')
          ) {
            originReaction = 'Entendi! Que bom que o nosso trabalho chegou até você.'
          }

          responseText = `${originReaction}|||E me conta, em qual cidade ou bairro fica o imóvel que vamos mobiliar?`
          nextStep = 3
          break
        }
        case 3: {
          const updatedNotes = (lead.notas || '') + `\n[Localização do imóvel]: ${messageText}`
          await supabase.from('leads').update({ notas: updatedNotes }).eq('id', lead.id)

          lead.notas = updatedNotes

          let locReaction = 'Entendi, já atendemos projetos incríveis nessa região.'
          const cidades_principais = [
            'piçarras',
            'picarras',
            'penha',
            'barra velha',
            'balneário',
            'balneario',
          ]
          if (cidades_principais.some((c) => lowerMessage.includes(c))) {
            locReaction = 'Excelente escolha! A Bender assina muitos decorados por aí.'
          }

          responseText = `${locReaction}|||E como está o coração com esse projeto? O imóvel já está pronto para receber os móveis ou você ainda está na fase de planejamento e planta?`
          nextStep = 4
          break
        }
        case 4: {
          const updatedNotes = (lead.notas || '') + `\n[Status do imóvel]: ${messageText}`
          await supabase.from('leads').update({ notas: updatedNotes }).eq('id', lead.id)

          lead.notas = updatedNotes

          let statusReaction = 'Compreendo. Cada fase tem seu encanto.'
          if (lowerMessage.includes('planta') || lowerMessage.includes('planejamento')) {
            statusReaction =
              'A fase da planta é deliciosa! É o momento de planejar cada detalhe com calma para quando a chave chegar, tudo estar perfeito.'
          } else if (lowerMessage.includes('reforma')) {
            statusReaction =
              'Reformas sempre trazem novos ares, é lindo ver a transformação acontecer.'
          } else if (lowerMessage.includes('pronto')) {
            statusReaction =
              'Que emoção! Com o imóvel pronto, já dá para visualizar os ambientes ganhando vida.'
          }

          responseText = `${statusReaction}|||Para eu te ajudar melhor a desenhar isso, você já tem uma ideia de quanto pretende investir no projeto?`
          nextStep = 5
          break
        }
        case 5: {
          const updatedNotes = (lead.notas || '') + `\n[Investimento estimado]: ${messageText}`
          await supabase.from('leads').update({ notas: updatedNotes }).eq('id', lead.id)

          lead.notas = updatedNotes

          responseText = `A Bender equilibra muito bem projetos inteligentes com o alto padrão da Casa Cor. E como temos nossa própria fábrica e 15 anos de história, conseguimos ajustar o que você tem em mente.|||Vou te conectar com um dos nossos consultores especialistas para dar continuidade a esse sonho com você. Pode ser?`
          nextStep = 6
          break
        }
        case 6:
          responseText = `Combinado então! Logo a nossa equipe te chama aqui para continuarmos. Até breve! ✨`
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
