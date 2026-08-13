import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

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
    const payload = await req.json()
    const {
      type = 'invitation',
      to,
      nome,
      link,
      codigo,
      documento_nome,
      envelope_id,
      pdf_url,
    } = payload

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not configured')
    }

    const isEnvelope = !!envelope_id
    let documentoNomes: string[] = []

    if (isEnvelope) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

      if (supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey)
        const { data: envDocs } = await supabase
          .from('documentos_cliente')
          .select('template_nome, tipo')
          .eq('envelope_id', envelope_id)
          .order('criado_em', { ascending: true })

        documentoNomes = (envDocs || []).map((d: any) => d.template_nome || d.tipo || 'Documento')
      }
    }

    const isCompletion = type === 'completion'

    let subject = ''
    let introText = ''
    let ctaText = ''
    let ctaLink = link

    if (isCompletion) {
      subject = isEnvelope
        ? `Documentos Assinados e Concluídos${documentoNomes.length > 0 ? ` (${documentoNomes.length})` : ''}`
        : `Documento Assinado e Concluído: ${documento_nome}`

      introText = isEnvelope
        ? `Todos os signatários concluíram a assinatura do conjunto de documentos. O processo foi finalizado com sucesso e os documentos assinados estão prontos para visualização e download.`
        : `O processo de assinatura do documento <strong>${documento_nome}</strong> foi concluído com sucesso por todos os signatários.`

      ctaText = 'Visualizar / Baixar Documento Assinado'
      if (pdf_url) ctaLink = pdf_url
    } else {
      subject = isEnvelope
        ? `Documentos para Assinatura${documentoNomes.length > 0 ? ` (${documentoNomes.length})` : ''}`
        : `Assinatura Pendente: ${documento_nome}`

      introText = isEnvelope
        ? `Você foi convidado para assinar um conjunto de ${documentoNomes.length || ''} documentos de forma digital e segura. Acesse o link único abaixo para visualizar e assinar todos os documentos em sequência.`
        : `Você foi convidado para assinar o documento <strong>${documento_nome}</strong> de forma digital e segura.`

      ctaText = isEnvelope ? 'Acessar Documentos para Assinar' : 'Acessar Documento para Assinar'
    }

    const docsListHtml =
      documentoNomes.length > 0
        ? `
        <div class="card-box" style="background-color: #f1f5f9; padding: 16px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
          <p class="text-main" style="margin: 0 0 10px; color: #1e293b; font-size: 14px; font-weight: bold;">Documentos (${documentoNomes.length}):</p>
          <ul class="text-main" style="margin: 0; padding-left: 20px; color: #334155; font-size: 14px; line-height: 1.8;">
            ${documentoNomes.map((name, i) => `<li>${i + 1}. ${name}</li>`).join('')}
          </ul>
        </div>
      `
        : ''

    const verificationCodeBox =
      !isCompletion && codigo
        ? `
        <div class="card-box" style="background-color: #f8fafc; padding: 18px; border-radius: 8px; text-align: center; margin: 20px 0; border: 1px solid #cbd5e1;">
          <p class="text-muted" style="margin: 0; color: #475569; font-size: 14px;">Seu código de verificação é:</p>
          <p class="code-text" style="margin: 10px 0 0; font-size: 34px; font-weight: 800; letter-spacing: 6px; color: #0f172a;">${codigo}</p>
          <p class="text-muted" style="margin: 15px 0 0; color: #475569; font-size: 13px;"><strong>Instrução:</strong> Copie este código de 4 dígitos e cole no campo indicado na tela de assinatura.</p>
        </div>
      `
        : ''

    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="color-scheme" content="light dark">
        <meta name="supported-color-schemes" content="light dark">
        <style>
          :root {
            color-scheme: light dark;
            supported-color-schemes: light dark;
          }
          body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #f8fafc;
            color: #0f172a;
          }
          .email-container {
            max-width: 600px;
            margin: 20px auto;
            padding: 28px;
            background-color: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
          }
          .btn-primary {
            background-color: #2563eb !important;
            color: #ffffff !important;
            padding: 14px 28px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 700;
            font-size: 15px;
            display: inline-block;
            text-align: center;
            border: 1px solid #1d4ed8;
          }
          @media (prefers-color-scheme: dark) {
            body {
              background-color: #090d16 !important;
              color: #f8fafc !important;
            }
            .email-container {
              background-color: #1e293b !important;
              border-color: #334155 !important;
              color: #f8fafc !important;
            }
            .text-main {
              color: #f8fafc !important;
            }
            .text-muted {
              color: #cbd5e1 !important;
            }
            .card-box {
              background-color: #0f172a !important;
              border-color: #334155 !important;
            }
            .code-text {
              color: #38bdf8 !important;
            }
            .btn-primary {
              background-color: #2563eb !important;
              color: #ffffff !important;
              border-color: #3b82f6 !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <h2 class="text-main" style="color: #0f172a; margin-top: 0; font-size: 20px;">Olá, ${nome}</h2>
          <p class="text-main" style="color: #334155; line-height: 1.6; font-size: 15px;">${introText}</p>
          ${docsListHtml}
          ${verificationCodeBox}
          <div style="text-align: center; margin: 32px 0;">
            <a href="${ctaLink}" class="btn-primary" style="background-color: #2563eb; color: #ffffff !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; display: inline-block;">${ctaText}</a>
          </div>
          <p class="text-muted" style="font-size: 12px; color: #64748b; text-align: center; margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
            Bender Haussform • Assinatura Digital Segura
          </p>
        </div>
      </body>
      </html>
    `

    const textBody = isCompletion
      ? `Olá, ${nome}. O processo de assinatura foi concluído com sucesso. Acesse o documento assinado em: ${ctaLink}`
      : `Olá, ${nome}. Você foi convidado para assinar ${isEnvelope ? `${documentoNomes.length} documento(s)` : documento_nome}. Seu código de verificação é: ${codigo}. Acesse o link para assinar: ${link}`

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
        text: textBody,
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
