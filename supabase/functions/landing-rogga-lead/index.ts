import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

/**
 * Edge Function 'landing-rogga-lead'
 *
 * Recebe o formulário da landing rogga.benderhaussform.com, cria o card na aba
 * Comercial do Sistema Bender (origem "Landing Rôgga") e avisa por e-mail via
 * Resend, com a mesma chave usada pelo send-signature-email.
 *
 * Entrada (JSON):
 * - nome_completo, email, whatsapp, empreendimento, objetivo (obrigatórios)
 * - utm: { source, medium, campaign, content, term } (opcional)
 * - pagina: URL de onde o lead foi enviado (opcional)
 * - ambiente: 'teste' | 'producao' (opcional). Em 'teste' só envia o e-mail,
 *   marcado [TESTE], sem gravar no CRM.
 * - site: campo honeypot. Preenchido = robô; responde ok sem fazer nada.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ORIGEM = 'Landing Rôgga'
const EMAIL_DESTINO = 'projetos@benderhaussform.com'
const EMAIL_REMETENTE = 'Bender Haussform <projetos@benderhaussform.com>'
const OBJETIVOS = ['Locação', 'Investimento', 'Para Morar']
const META_PREFIX = '___META_JSON___:'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function texto(value: unknown, max = 200): string {
  if (typeof value !== 'string') return ''
  return value.replace(/\s+/g, ' ').trim().slice(0, max)
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Mesma normalização do conecta-leads: 55 + DDD + número, com o 9 em celulares.
function normalizePhoneNumber(raw: unknown): string {
  const digits = typeof raw === 'string' || typeof raw === 'number' ? String(raw).replace(/\D/g, '') : ''
  if (!digits) return ''
  let p = digits
  const isCelularSem9 = (local8: string) => /^[6-9]/.test(local8)
  if (p.startsWith('55')) {
    if (p.length === 12 && isCelularSem9(p.substring(4))) {
      p = p.substring(0, 4) + '9' + p.substring(4)
    }
  } else if (p.length === 10) {
    p = isCelularSem9(p.substring(2)) ? '55' + p.substring(0, 2) + '9' + p.substring(2) : '55' + p
  } else if (p.length === 11) {
    p = '55' + p
  }
  return p.length >= 12 && p.length <= 13 ? p : ''
}

function formatPhone(p: string): string {
  const m = p.match(/^55(\d{2})(\d{4,5})(\d{4})$/)
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : p
}

function isStatusEncerrado(status: unknown) {
  const st = String(status || '').trim().toLowerCase()
  return st === 'vendido' || st.includes('perdido') || st === 'sdr: não é lead' || st === 'sdr: nao e lead'
}

const CATEGORIAS_COMERCIAIS = ['Comercial', 'Orçamento', 'Follow up', 'Já é Cliente']

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ success: false, error: 'Use POST.' }, 405)

  let body: any
  try {
    body = await req.json()
  } catch {
    return json({ success: false, error: 'JSON inválido.' }, 400)
  }
  if (!body || typeof body !== 'object') return json({ success: false, error: 'Corpo vazio.' }, 400)

  // Honeypot: humano não vê nem preenche este campo.
  if (texto(body.site)) return json({ success: true, action: 'ignored' })

  const nome = texto(body.nome_completo || body.nome, 120)
  const email = texto(body.email, 160).toLowerCase()
  const telefone = normalizePhoneNumber(body.whatsapp || body.telefone)
  const empreendimento = texto(body.empreendimento, 120)
  const objetivo = texto(body.objetivo, 40)
  const pagina = texto(body.pagina, 300)
  const ambiente = texto(body.ambiente, 20) === 'teste' ? 'teste' : 'producao'

  const utmRaw = body.utm && typeof body.utm === 'object' ? body.utm : {}
  const utm: Record<string, string> = {}
  for (const k of ['source', 'medium', 'campaign', 'content', 'term']) {
    const v = texto(utmRaw[k], 120)
    if (v) utm[k] = v
  }

  const errors: Record<string, string> = {}
  if (nome.length < 3) errors.nome_completo = 'Informe o nome completo.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Informe um e-mail válido.'
  if (!telefone) errors.whatsapp = 'Informe o WhatsApp com DDD.'
  if (empreendimento.length < 2) errors.empreendimento = 'Informe o empreendimento.'
  if (!OBJETIVOS.includes(objetivo)) errors.objetivo = 'Selecione o objetivo do imóvel.'
  if (Object.keys(errors).length) return json({ success: false, errors }, 400)

  const nowStr = new Date().toISOString()
  const dataBR = new Date(nowStr).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
  const utmLinha = Object.keys(utm).length
    ? Object.entries(utm).map(([k, v]) => `${k}=${v}`).join(' ')
    : ''

  let action: 'created' | 'linked_existing' | 'email_only' = 'email_only'
  let leadId: string | null = null
  let crmError: string | null = null

  if (ambiente === 'producao') {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    if (!supabaseUrl || !supabaseKey) {
      crmError = 'Supabase env vars não configuradas.'
    } else {
      const supabase = createClient(supabaseUrl, supabaseKey)
      try {
        const { data: candidatos, error: searchErr } = await supabase
          .from('leads')
          .select('id, status, categoria, notas, excluido, arquivado_comercial')
          .eq('telefone', telefone)
          .order('criado_em', { ascending: false })
        if (searchErr) throw searchErr

        // Cliente já em atendimento: anota o novo pedido no card ativo em vez de criar outro.
        const ativo = (candidatos || []).find(
          (c: any) =>
            c.excluido !== true &&
            c.arquivado_comercial !== true &&
            CATEGORIAS_COMERCIAIS.includes(String(c.categoria || 'Comercial').trim()) &&
            !isStatusEncerrado(c.status),
        )

        const linha = `[${dataBR}] Novo envio pela landing Rôgga: empreendimento ${empreendimento}, objetivo ${objetivo}${utmLinha ? ` (${utmLinha})` : ''}.`

        if (ativo) {
          const notasAtuais = String(ativo.notas || '').trim()
          const { error: updErr } = await supabase
            .from('leads')
            .update({ notas: notasAtuais ? `${notasAtuais}\n${linha}` : linha, atualizado_em: nowStr })
            .eq('id', ativo.id)
          if (updErr) throw updErr
          action = 'linked_existing'
          leadId = ativo.id
        } else {
          const meta = {
            landing_rogga: { empreendimento, objetivo, utm, pagina, recebido_em: nowStr },
          }
          const { data: novo, error: insErr } = await supabase
            .from('leads')
            .insert({
              nome,
              telefone,
              email,
              origem: ORIGEM,
              origem_pessoa: null,
              status: 'Novo contato',
              categoria: 'Comercial',
              kanban_ativo: true,
              criado_por_nome: ORIGEM,
              notas: `Lead recebido pela landing Rôgga (${dataBR}). Empreendimento: ${empreendimento}. Objetivo: ${objetivo}.${utmLinha ? ` Campanha: ${utmLinha}.` : ''}`,
              notas_pessoais: `${META_PREFIX}${JSON.stringify(meta)}`,
              criado_em: nowStr,
              atualizado_em: nowStr,
            })
            .select('id')
            .single()
          if (insErr) throw insErr
          action = 'created'
          leadId = novo.id
        }
      } catch (err: any) {
        console.error('[landing-rogga-lead] Erro no CRM:', err)
        crmError = err?.message || String(err)
      }
    }
  }

  // E-mail de aviso. Vai mesmo se o CRM falhar, para o lead nunca se perder.
  let emailError: string | null = null
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
  if (!RESEND_API_KEY) {
    emailError = 'RESEND_API_KEY não configurada.'
  } else {
    const prefixo = ambiente === 'teste' ? '[TESTE] ' : ''
    const subject = `${prefixo}Novo lead Rôgga: ${nome} · ${empreendimento}`
    const linhas: [string, string][] = [
      ['Nome', nome],
      ['WhatsApp', formatPhone(telefone)],
      ['E-mail', email],
      ['Empreendimento', empreendimento],
      ['Objetivo', objetivo],
      ['Recebido em', `${dataBR} (Brasília)`],
    ]
    if (utmLinha) linhas.push(['Campanha', utmLinha])
    if (pagina) linhas.push(['Página', pagina])
    const situacao =
      action === 'created'
        ? 'Card criado na aba Comercial do Sistema Bender como "Novo contato".'
        : action === 'linked_existing'
          ? 'Este telefone já tem um card ativo no Sistema Bender; o pedido foi anotado nele.'
          : ambiente === 'teste'
            ? 'Envio de teste: nada foi gravado no Sistema Bender.'
            : `Não foi possível gravar no Sistema Bender (${crmError}). Cadastre o lead à mão.`

    const rowsHtml = linhas
      .map(
        ([k, v]) =>
          `<tr><td style="padding:8px 12px;color:#4D5357;font-size:13px;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap">${k}</td><td style="padding:8px 12px;color:#27272A;font-size:15px">${escapeHtml(v)}</td></tr>`,
      )
      .join('')
    const waLink = `https://wa.me/${telefone}`
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px;background:#F2F3F3;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
<div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #DBDCDB;border-radius:8px;padding:28px">
<p style="margin:0 0 4px;color:#A5AAAB;font-size:12px;letter-spacing:.12em;text-transform:uppercase">${prefixo}Landing Rôgga × Bender</p>
<h1 style="margin:0 0 20px;color:#27272A;font-size:22px;font-weight:600">Novo lead: ${escapeHtml(nome)}</h1>
<table style="border-collapse:collapse;width:100%;background:#F2F3F3;border-radius:6px">${rowsHtml}</table>
<p style="margin:24px 0 0"><a href="${waLink}" style="display:inline-block;background:#27272A;color:#fff;text-decoration:none;padding:12px 20px;border-radius:6px;font-size:14px;font-weight:600">Chamar no WhatsApp</a></p>
<p style="margin:24px 0 0;color:#4D5357;font-size:13px;line-height:1.5">${escapeHtml(situacao)}</p>
</div></body></html>`
    const text = linhas.map(([k, v]) => `${k}: ${v}`).join('\n') + `\n\n${situacao}\nWhatsApp: ${waLink}`

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: EMAIL_REMETENTE,
          to: [EMAIL_DESTINO],
          reply_to: email,
          subject,
          text,
          html,
        }),
      })
      if (!res.ok) emailError = `Resend ${res.status}: ${await res.text()}`
    } catch (err: any) {
      emailError = err?.message || String(err)
    }
    if (emailError) console.error('[landing-rogga-lead] Erro no e-mail:', emailError)
  }

  if (crmError && emailError) {
    return json({ success: false, error: 'Não foi possível registrar o lead.', details: { crmError, emailError } }, 500)
  }

  return json({
    success: true,
    action,
    lead_id: leadId,
    email_sent: !emailError,
    crm_error: crmError,
    email_error: emailError,
  })
})
