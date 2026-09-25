import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

/**
 * PARTE 2 — Edge Function 'conecta-sync-event' (Backend puro e pós-processamento assíncrono)
 *
 * Dispara evento de fase para o endpoint do Bender Conecta APÓS a mudança já ter acontecido.
 *
 * Regras:
 * - Somente leads de origem 'Corretor'
 * - Mapa de Fases (Gestor ↔ Conecta):
 *     Novo Contato        <-> Recebido
 *     Consultoria Inicial <-> Visita agendada
 *     Projeto             <-> Projeto
 *     Negociação          <-> Orçamento Enviado
 *     Vendido             <-> Fechado
 *     Perdido             <-> Perdido (evento de perdido)
 * - Exclusão / Arquivamento NUNCA mexe no Conecta.
 * - Endpoint configurado via secret: CONECTA_WEBHOOK_URL
 * - Se o endpoint não existir ou estiver fora do ar: falha graciosa, retry com log estruturado,
 *   retornando status 200/ok para NUNCA travar a chamada ou a interface do Gestor.
 */

interface SyncEventPayload {
  lead_id: string
  status_gestor: string
  previous_status?: string
  origem?: string
  origem_pessoa?: string
  conecta_lead_id?: string
  nome?: string
  telefone?: string
}

// Mapeamento normalizado: Gestor -> Conecta
const GESTOR_TO_CONECTA_MAP: Record<string, { faseConecta: string; tipoEvento: string }> = {
  'novo contato': { faseConecta: 'Recebido', tipoEvento: 'fase_alterada' },
  novo: { faseConecta: 'Recebido', tipoEvento: 'fase_alterada' },
  'novo lead': { faseConecta: 'Recebido', tipoEvento: 'fase_alterada' },
  despachados: { faseConecta: 'Recebido', tipoEvento: 'fase_alterada' },
  'consultoria inicial': { faseConecta: 'Visita agendada', tipoEvento: 'fase_alterada' },
  projeto: { faseConecta: 'Projeto', tipoEvento: 'fase_alterada' },
  apresentação: { faseConecta: 'Projeto', tipoEvento: 'fase_alterada' },
  apresentacao: { faseConecta: 'Projeto', tipoEvento: 'fase_alterada' },
  negociação: { faseConecta: 'Orçamento Enviado', tipoEvento: 'fase_alterada' },
  negociacao: { faseConecta: 'Orçamento Enviado', tipoEvento: 'fase_alterada' },
  vendido: { faseConecta: 'Fechado', tipoEvento: 'fase_alterada' },
  fechado: { faseConecta: 'Fechado', tipoEvento: 'fase_alterada' },
  perdido: { faseConecta: 'Perdido', tipoEvento: 'lead_perdido' },
}

const META_PREFIX = '___META_JSON___:'

function parseLeadMetadados(raw?: unknown): { notas: string; meta: Record<string, any> } {
  if (raw === null || raw === undefined) return { notas: '', meta: {} }
  let text = ''
  if (typeof raw === 'string') text = raw
  else if (typeof raw === 'object') return { notas: '', meta: (raw as any) || {} }
  else text = String(raw)

  if (!text) return { notas: '', meta: {} }
  const idx = text.indexOf(META_PREFIX)
  if (idx === -1) return { notas: text, meta: {} }

  const cleanNotas = text.slice(0, idx).trimEnd()
  const jsonStr = text.slice(idx + META_PREFIX.length).trim()
  try {
    const meta = JSON.parse(jsonStr)
    return { notas: cleanNotas, meta: meta && typeof meta === 'object' ? meta : {} }
  } catch {
    return { notas: cleanNotas || text, meta: {} }
  }
}

async function dispatchWithRetry(
  url: string,
  payload: any,
  apiKey: string,
  maxRetries = 2,
): Promise<{ success: boolean; status?: number; responseBody?: string; error?: string }> {
  let attempt = 0
  let lastError = ''
  let lastStatus: number | undefined
  let lastResponseBody = ''

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'BenderGestor-ConectaSync/1.0',
  }
  if (apiKey) {
    headers['x-api-key'] = apiKey
  }

  while (attempt <= maxRetries) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 7000)

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      lastStatus = response.status
      try {
        lastResponseBody = await response.text()
      } catch {
        lastResponseBody = ''
      }

      if (response.ok) {
        return { success: true, status: response.status, responseBody: lastResponseBody }
      }

      lastError = `HTTP ${response.status}: ${response.statusText}${lastResponseBody ? ` - ${lastResponseBody}` : ''}`
    } catch (err: any) {
      lastError = err?.message || String(err)
    }

    attempt++
    if (attempt <= maxRetries) {
      // Pequeno backoff
      await new Promise((resolve) => setTimeout(resolve, 500 * attempt))
    }
  }

  return { success: false, status: lastStatus, responseBody: lastResponseBody, error: lastError }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Falha silenciosa e graciosa sempre: qualquer erro não quebra a requisição do cliente
  try {
    let payload: SyncEventPayload | null = null
    try {
      payload = await req.json()
    } catch {
      return new Response(
        JSON.stringify({ success: false, ignored: true, reason: 'Payload JSON inválido' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (!payload || !payload.lead_id) {
      return new Response(
        JSON.stringify({ success: false, ignored: true, reason: 'lead_id ausente' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const CANONICAL_CONECTA_PHASES_URL =
      'https://zffpmffxoafyatamabku.supabase.co/functions/v1/gestor-fases-webhook'
    const CANONICAL_CONNECTA_API_KEY =
      'sk_conecta_8f3d61b47e2a9c0e5d1a4f82637b90ce82b14457dd5e4fba668702319efc2da5'

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    // A URL do endpoint de fases do Conecta pode vir de CONECTA_PHASES_URL, CONECTA_WEBHOOK_URL ou fallback canônico
    const envWebhookUrl = (
      Deno.env.get('CONECTA_PHASES_URL') ??
      Deno.env.get('CONECTA_WEBHOOK_URL') ??
      ''
    ).trim()
    const conectaWebhookUrl = envWebhookUrl || CANONICAL_CONECTA_PHASES_URL

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Buscar dados atualizados do lead
    const { data: lead, error: leadErr } = await supabase
      .from('leads')
      .select(
        'id, nome, telefone, email, origem, origem_pessoa, status, categoria, notas_pessoais, excluido, arquivado_comercial',
      )
      .eq('id', payload.lead_id)
      .maybeSingle()

    if (leadErr || !lead) {
      console.warn(`[conecta-sync-event] Lead ${payload.lead_id} não encontrado ou erro:`, leadErr)
      return new Response(
        JSON.stringify({ success: false, ignored: true, reason: 'Lead não encontrado' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Extrair conecta_lead_id do campo PRÓPRIO dos metadados
    const { meta } = parseLeadMetadados(lead.notas_pessoais)
    const conectaLeadId = meta?.conecta_lead_id || payload.conecta_lead_id || null

    // Regra 1: Elegibilidade de espelhamento = origem 'Bender Conecta' OU 'Corretor' OU metadado conecta_lead_id presente
    const leadOrigem = (lead.origem || payload.origem || '').trim().toLowerCase()
    const isElegivel =
      leadOrigem === 'bender conecta' || leadOrigem === 'corretor' || Boolean(conectaLeadId)

    if (!isElegivel) {
      return new Response(
        JSON.stringify({
          success: true,
          ignored: true,
          reason: `Origem '${leadOrigem}' sem vínculo com Conecta/Corretor. Disparo ignorado silenciosamente.`,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Regra 2: Exclusão / Arquivamento não mexe no Conecta
    if (lead.excluido || lead.arquivado_comercial) {
      return new Response(
        JSON.stringify({
          success: true,
          ignored: true,
          reason: 'Lead excluído ou arquivado. Nenhum evento enviado ao Conecta.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Mapeamento de fase
    const statusAtual = (payload.status_gestor || lead.status || '').trim()
    const statusNormalizado = statusAtual.toLowerCase()
    const mapping = GESTOR_TO_CONECTA_MAP[statusNormalizado]

    if (!mapping) {
      return new Response(
        JSON.stringify({
          success: true,
          ignored: true,
          reason: `Status '${statusAtual}' não possui mapeamento correspondente para o Conecta.`,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const eventData = {
      evento: mapping.tipoEvento,
      gestor_lead_id: lead.id,
      conecta_lead_id: conectaLeadId,
      fase_gestor: statusAtual,
      fase_conecta: mapping.faseConecta,
      corretor_nome: lead.origem_pessoa || null,
      cliente_nome: lead.nome,
      cliente_telefone: lead.telefone,
      cliente_email: lead.email,
      timestamp: new Date().toISOString(),
    }

    // Verificar se o secret CONECTA_PHASES_URL (ou CONECTA_WEBHOOK_URL) está configurado
    if (!conectaWebhookUrl) {
      console.log(
        `[conecta-sync-event] [INFO] Secret CONECTA_PHASES_URL / CONECTA_WEBHOOK_URL ainda não configurado. Evento registrado localmente com sucesso (falha graciosa):`,
        JSON.stringify(eventData),
      )
      return new Response(
        JSON.stringify({
          success: true,
          delivered: false,
          reason: 'Secret CONECTA_PHASES_URL não configurado. Evento simulado com sucesso.',
          event: eventData,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Chave de API compartilhada com Bender Conecta
    const conectaApiKey =
      (Deno.env.get('CONNECTA_API_KEY') ?? '').trim() || CANONICAL_CONNECTA_API_KEY

    // Contrato exato entregue pelo Bender Conecta:
    // POST para CONECTA_PHASES_URL
    // Headers: Content-Type: application/json, x-api-key: CONNECTA_API_KEY
    // Body: { "conecta_lead_id": "<uuid>", "fase_conecta": "Visita agendada" }
    // Caso conecta_lead_id não exista no lead, não temos como sincronizar a fase dele no Conecta
    if (!conectaLeadId) {
      console.warn(
        `[conecta-sync-event] Lead ${lead.id} (${lead.nome}) não possui conecta_lead_id nos metadados. Sincronização cancelada graciosa.`,
      )
      return new Response(
        JSON.stringify({
          success: true,
          delivered: false,
          ignored: true,
          reason: 'Lead não possui conecta_lead_id registrado nos metadados.',
          event: eventData,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Payload exato conforme o contrato do Bender Conecta
    const webhookPayload = {
      conecta_lead_id: conectaLeadId,
      fase_conecta: mapping.faseConecta,
    }

    // Disparo HTTP para o endpoint com retry e timeout
    console.log(
      `[conecta-sync-event] Enviando fase para Conecta (${conectaWebhookUrl}) com chave x-api-key:`,
      webhookPayload,
    )
    const dispatchResult = await dispatchWithRetry(
      conectaWebhookUrl,
      webhookPayload,
      conectaApiKey,
      2,
    )

    if (!dispatchResult.success) {
      console.warn(
        `[conecta-sync-event] [FALHA GRACIOSA] Conecta endpoint retornou erro ou falhou: ${dispatchResult.error}.`,
      )
      return new Response(
        JSON.stringify({
          success: true,
          delivered: false,
          warning: 'Falha ao contatar endpoint de fases do Conecta (falha graciosa tolerada)',
          error_details: dispatchResult.error,
          status_code: dispatchResult.status,
          response_body: dispatchResult.responseBody,
          sent_payload: webhookPayload,
          event: eventData,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    console.log(
      `[conecta-sync-event] Fase sincronizada com sucesso no Conecta! Status: ${dispatchResult.status}`,
    )
    return new Response(
      JSON.stringify({
        success: true,
        delivered: true,
        status_code: dispatchResult.status,
        response_body: dispatchResult.responseBody,
        sent_payload: webhookPayload,
        event: eventData,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err: any) {
    // Falha silenciosa total para NUNCA estourar a UI do Gestor
    console.error('[conecta-sync-event] Erro capturado no handler pós-processamento:', err)
    return new Response(
      JSON.stringify({
        success: true,
        delivered: false,
        error_silenced: true,
        message: err?.message || String(err),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
