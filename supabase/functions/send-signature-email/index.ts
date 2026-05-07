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
    const { to, nome, link, codigo, documento_nome } = await req.json()

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not configured')
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Bender Haussform <projetos@benderhaussform.com>',
        to: [to],
        subject: `Assinatura Pendente: ${documento_nome}`,
        text: `Olá, ${nome}. Você foi convidado para assinar o documento ${documento_nome}. Seu código de verificação é: ${codigo}. Acesse o link para assinar: ${link}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
            <h2 style="color: #333;">Olá, ${nome}</h2>
            <p style="color: #555; line-height: 1.5;">Você foi convidado para assinar o documento <strong>${documento_nome}</strong> de forma digital e segura.</p>
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
              <p style="margin: 0; color: #666; font-size: 14px;">Seu código de verificação é:</p>
              <p style="margin: 10px 0 0; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #000;">${codigo}</p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${link}" style="background-color: #000; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Acessar Documento para Assinar</a>
            </div>
            <p style="font-size: 12px; color: #999; text-align: center; margin-top: 40px;">Bender Haussform</p>
          </div>
        `,
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
