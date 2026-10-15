import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Resultado do envio: ok=false quando a Z-API não aceitou a mensagem (erro 1.4)
type ZapiResult = { ok: boolean; messageId: string | null; error?: string }

async function sendZapiMessage(phone: string, text: string): Promise<ZapiResult> {
  const zapiInstance = Deno.env.get('ZAPI_INSTANCE_ID')
  const zapiToken = Deno.env.get('ZAPI_TOKEN')
  if (!zapiInstance || !zapiToken) {
    return { ok: false, messageId: null, error: 'Z-API não configurada' }
  }
  if (!text) return { ok: false, messageId: null, error: 'Mensagem vazia' }

  const zapiUrl = `https://api.z-api.io/instances/${zapiInstance}/token/${zapiToken}/send-text`
  try {
    const res = await fetch(zapiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Client-Token': Deno.env.get('ZAPI_CLIENT_TOKEN') || 'Fcd7b503ddede4e319ddc7e79f96948daS',
      },
      body: JSON.stringify({ phone, message: text }),
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok || data?.error) {
      console.error('Z-API error:', res.status, data)
      return {
        ok: false,
        messageId: null,
        error: `Z-API recusou o envio (HTTP ${res.status}${data?.error ? ': ' + data.error : ''})`,
      }
    }

    return { ok: true, messageId: data?.messageId || data?.zaapId || null }
  } catch (e) {
    console.error('Z-API network error:', e)
    return { ok: false, messageId: null, error: 'Falha de conexão com a Z-API' }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: userData, error: userError } = await userClient.auth.getUser()
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const user = userData.user
    const body = await req.json().catch(() => ({}))
    const { leadId, phone, message } = body

    if (!phone || !message) {
      return new Response(JSON.stringify({ error: 'phone and message are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const trimmedMessage = String(message).trim()
    if (!trimmedMessage) {
      return new Response(JSON.stringify({ error: 'empty message' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const senderName = user.user_metadata?.name || user.email || 'Usuário'
    const fallbackExternalId = `msg_manual_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

    // Send via Z-API first to capture messageId for webhook dedup
    const zapi = await sendZapiMessage(String(phone), trimmedMessage)

    // Se a Z-API não aceitou, NÃO grava a mensagem como enviada e devolve erro para a tela
    // mostrar a falha e manter o texto digitado (erro 1.4)
    if (!zapi.ok) {
      return new Response(
        JSON.stringify({ error: zapi.error || 'Falha ao enviar pelo WhatsApp' }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const externalId = zapi.messageId || fallbackExternalId

    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    const { data: inserted, error: insertErr } = await adminClient
      .from('whatsapp_messages')
      .insert({
        lead_id: leadId || null,
        phone: String(phone),
        sender_type: 'user',
        sender_name: senderName,
        content: trimmedMessage,
        external_id: externalId,
        direction: 'outbound',
        created_at: new Date().toISOString(),
      })
      .select('*')
      .single()

    if (insertErr) {
      console.error('Insert error:', insertErr)
      return new Response(JSON.stringify({ error: 'Failed to persist message' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true, message: inserted }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('send-whatsapp-message error:', e)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
