import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, x-supabase-client-platform, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to, nome, link, codigo, documento_nome, envelope_id } = await req.json()

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not configured')
    }

    const isEnvelope = !!envelope_id
    const subject = isEnvelope
      ? `Documentos para Assinatura: ${documento_nome || 'Envelope'}`
      : `Assinatura Pendente: ${documento_nome}`

    const introText = isEnvelope
      ? `Você foi convidado para assinar um conjunto de documentos de forma digital e segura. Acesse o link único abaixo para visualizar e assinar todos os documentos em sequência.`
      : `Você foi convidado para assinar o documento <strong>${documento_nome}</strong> de forma digital e segura.`

    const ctaText = isEnvelope
      ? 'Acessar Documentos para Assinar'
      : 'Acessar Documento para Assinar'

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
        <h2 style="color: #333;">Olá, ${nome}</h2>
        <p style="color: #555; line-height: 1.5;">${introText}</p>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
          <p style="margin: 0; color: #666; font-size: 14px;">Seu código de verificação é:</p>
          <p style="margin: 10px 0 0; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #000;">${codigo}</p>
          <p style="margin: 15px 0 0; color: #555; font-size: 13px;"><strong>Instrução:</strong> Copie este código de 4 dígitos e cole no campo indicado na tela de assinatura.</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${link}" style="background-color: #000; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">${ctaText}</a>
        </div>
        <p style="font-size: 12px; color: #999; text-align: center; margin-top: 40px;">Bender Haussform</p>
      </div>
    `

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'projetos@benderhaussform.com',
        to: [to],
        subject,
        text: `Olá, ${nome}. ${isEnvelope ? 'Você recebeu um conjunto de documentos para assinar.' : `Você foi convidado para assinar o documento ${documento_nome}.`} Seu código de verificação é: ${codigo}. Acesse o link para assinar: ${link}`,
        html,
      }),
    })

    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`Resend API Error: ${errorText}`)
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
