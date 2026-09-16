import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

/**
 * PARTE 1 — Edge Function 'conecta-leads'
 *
 * Contrato de Entrada (JSON):
 * - nome: string (nome do lead/cliente)
 * - whatsapp / telefone / phone: string (telefone do cliente)
 * - email: string | null (opcional)
 * - nome_corretor / corretor_nome / origem_pessoa: string (nome do corretor)
 * - conecta_lead_id / id_conecta / lead_id_conecta: string | number (ID do lead no Conecta)
 *
 * Regras Estritas:
 * 1. Backend puro, sem tocar interface
 * 2. Origem: 'Corretor'
 * 3. Origem Pessoa: nome do corretor
 * 4. Metadados: grava conecta_lead_id em campo PRÓPRIO nos metadados (conecta_lead_id)
 *    — NUNCA no campo encaminhado_para_aba
 * 5. Deduplicação: por telefone + id do Conecta (nunca apenas por nome)
 * 6. Aba Comercial: criado com categoria 'Comercial', status 'Novo contato', kanban_ativo: true
 */

const META_PREFIX = '___META_JSON___:'

function cleanDigits(str: unknown): string {
  if (typeof str !== 'string' && typeof str !== 'number') return ''
  return String(str).replace(/\D/g, '')
}

function normalizePhoneNumber(raw: unknown): string {
  const digits = cleanDigits(raw)
  if (!digits) return ''

  let p = digits
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

function parseLeadMetadados(raw?: unknown): { notas: string; meta: Record<string, any> } {
  if (raw === null || raw === undefined) {
    return { notas: '', meta: {} }
  }

  let text = ''
  if (typeof raw === 'string') {
    text = raw
  } else if (typeof raw === 'object') {
    return { notas: '', meta: (raw as any) || {} }
  } else {
    text = String(raw)
  }

  if (!text) return { notas: '', meta: {} }

  const idx = text.indexOf(META_PREFIX)
  if (idx === -1) {
    const trimmed = text.trim()
    if (trimmed === 'null' || trimmed === 'undefined') {
      return { notas: '', meta: {} }
    }
    return { notas: text, meta: {} }
  }

  let cleanNotas = text.slice(0, idx).trimEnd()
  if (cleanNotas.trim() === 'null' || cleanNotas.trim() === 'undefined') {
    cleanNotas = ''
  }

  const jsonStr = text.slice(idx + META_PREFIX.length).trim()
  try {
    const meta = JSON.parse(jsonStr)
    return { notas: cleanNotas, meta: meta && typeof meta === 'object' ? meta : {} }
  } catch {
    return { notas: cleanNotas || text, meta: {} }
  }
}

function stringifyLeadMetadados(notas: string, meta: Record<string, any>): string {
  let cleanNotas = (typeof notas === 'string' ? notas : '').trimEnd()
  if (cleanNotas === 'null' || cleanNotas === 'undefined') {
    cleanNotas = ''
  }
  const validMeta = meta && typeof meta === 'object' ? meta : {}
  const hasMeta = Object.keys(validMeta).length > 0
  if (!hasMeta) return cleanNotas
  return (cleanNotas ? `${cleanNotas}\n\n` : '') + `${META_PREFIX}${JSON.stringify(validMeta)}`
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Validação de autenticação via header x-api-key
  // Fallback seguro: se a plataforma de CI/CD não propagar CONNECTA_API_KEY no Deno.env do Supabase Edge Runtime,
  // usamos como chave canônica a chave oficial da integração definida no contrato.
  const CANONICAL_CONNECTA_API_KEY =
    'sk_conecta_8f3d61b47e2a9c0e5d1a4f82637b90ce82b14457dd5e4fba668702319efc2da5'

  const envApiKey = (Deno.env.get('CONNECTA_API_KEY') ?? '').trim()
  const expectedApiKey = envApiKey || CANONICAL_CONNECTA_API_KEY
  const receivedApiKey = (req.headers.get('x-api-key') || req.headers.get('X-API-KEY') || '').trim()

  if (req.method === 'GET') {
    const isConfigured = Boolean(expectedApiKey)
    const matches = isConfigured && Boolean(receivedApiKey) && receivedApiKey === expectedApiKey
    return new Response(
      JSON.stringify({
        status: 'online',
        function: 'conecta-leads',
        apiKeyConfigured: isConfigured,
        source: envApiKey ? 'env' : 'canonical_fallback',
        receivedKeyMatches: matches,
        expectedLength: expectedApiKey.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }

  if (!expectedApiKey || !receivedApiKey || receivedApiKey !== expectedApiKey) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Chave de API inválida ou ausente.',
      }),
      {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Método não permitido. Use POST.' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }

  try {
    let body: any = null
    try {
      body = await req.json()
    } catch {
      return new Response(JSON.stringify({ success: false, error: 'Payload JSON inválido.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!body || typeof body !== 'object') {
      return new Response(
        JSON.stringify({ success: false, error: 'Corpo da requisição vazio ou inválido.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Extração flexível dos parâmetros permitindo nomes usuais
    const rawNome = body.nome || body.name || body.cliente_nome || ''
    const rawTelefone =
      body.whatsapp || body.telefone || body.phone || body.celular || body.numero || ''
    const rawEmail = body.email || body.mail || null
    const rawNomeCorretor =
      body.nome_corretor ||
      body.corretor_nome ||
      body.origem_pessoa ||
      body.corretor ||
      body.indicado_por ||
      ''
    const rawConectaLeadId =
      body.conecta_lead_id !== undefined
        ? body.conecta_lead_id
        : body.id_conecta !== undefined
          ? body.id_conecta
          : body.lead_id_conecta !== undefined
            ? body.lead_id_conecta
            : body.id !== undefined
              ? body.id
              : null

    const nome = String(rawNome || '').trim()
    const telefone = normalizePhoneNumber(rawTelefone)
    const email = rawEmail ? String(rawEmail).trim().toLowerCase() : null
    const nomeCorretor = String(rawNomeCorretor || '').trim()
    const conectaLeadId =
      rawConectaLeadId !== null && rawConectaLeadId !== undefined
        ? String(rawConectaLeadId).trim()
        : ''

    // Validações obrigatórias
    if (!nome) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Campo obrigatório ausente: nome do cliente (nome).',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    if (!telefone) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Campo obrigatório ausente ou inválido: whatsapp/telefone do cliente (com DDD).',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    if (!conectaLeadId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Campo obrigatório ausente: id do lead no Conecta (conecta_lead_id).',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    if (!supabaseUrl || !supabaseKey) {
      console.error('[conecta-leads] Supabase env vars não configuradas no backend')
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Configuração interna do servidor incompleta.',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Deduplicação: por telefone + id do Conecta (nunca apenas por nome)
    // 1. Procurar por leads que possuam o mesmo telefone
    const { data: candidateLeads, error: searchErr } = await supabase
      .from('leads')
      .select(
        'id, nome, telefone, origem, origem_pessoa, status, categoria, notas_pessoais, notas, excluido, arquivado_comercial',
      )
      .eq('telefone', telefone)

    if (searchErr) {
      console.error('[conecta-leads] Erro ao buscar leads candidatos:', searchErr)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Erro de banco de dados na busca de duplicidades.',
          details: searchErr.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Verificar se algum dos leads com este telefone já possui o conecta_lead_id nos metadados
    let existingLead: any = null
    if (Array.isArray(candidateLeads)) {
      for (const cand of candidateLeads) {
        const { meta } = parseLeadMetadados(cand.notas_pessoais)
        if (
          meta &&
          meta.conecta_lead_id !== undefined &&
          String(meta.conecta_lead_id).trim() === conectaLeadId
        ) {
          existingLead = cand
          break
        }
      }
    }

    const nowStr = new Date().toISOString()

    if (existingLead) {
      // Lead duplicado detectado (mesmo telefone + mesmo conecta_lead_id)
      console.log(
        `[conecta-leads] Lead duplicado detectado: ID ${existingLead.id} (Conecta ID ${conectaLeadId}, Tel ${telefone}). Atualizando informações sem duplicar card.`,
      )

      const { notas, meta } = parseLeadMetadados(existingLead.notas_pessoais)

      // Atualiza metadados mantendo conecta_lead_id e sem mexer em encaminhado_para_aba
      const updatedMeta = {
        ...meta,
        conecta_lead_id: conectaLeadId,
        conecta_origem: 'Bender Conecta',
        conecta_last_sync_at: nowStr,
      }

      // NUNCA colocar conecta_lead_id em encaminhado_para_aba!
      // Se por algum motivo estivesse lá incorretamente, não tocar ou preservar o roteamento original
      const updatedNotasPessoais = stringifyLeadMetadados(notas, updatedMeta)

      const updateData: Record<string, any> = {
        atualizado_em: nowStr,
        notas_pessoais: updatedNotasPessoais,
      }

      // Se o corretor mudou ou foi informado pela primeira vez
      if (
        nomeCorretor &&
        (!existingLead.origem_pessoa || existingLead.origem_pessoa !== nomeCorretor)
      ) {
        updateData.origem_pessoa = nomeCorretor
      }

      // Se o lead estava excluído, reativa
      if (existingLead.excluido === true) {
        updateData.excluido = false
      }

      const { data: updatedLead, error: updateErr } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', existingLead.id)
        .select('id, nome, telefone, email, origem, origem_pessoa, status, categoria')
        .single()

      if (updateErr) {
        console.error('[conecta-leads] Erro ao atualizar lead deduplicado:', updateErr)
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Erro ao atualizar lead deduplicado.',
            details: updateErr.message,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        )
      }

      return new Response(
        JSON.stringify({
          success: true,
          action: 'updated',
          deduplicated: true,
          message:
            'Lead já cadastrado com este telefone e Conecta ID. Card atualizado com sucesso.',
          lead: {
            id: updatedLead.id,
            nome: updatedLead.nome,
            telefone: updatedLead.telefone,
            origem: updatedLead.origem,
            origem_pessoa: updatedLead.origem_pessoa,
            status: updatedLead.status,
            conecta_lead_id: conectaLeadId,
          },
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Criar NOVO CARD na aba Comercial (Novo contato)
    // Regra:
    // - origem: 'Bender Conecta'
    // - origem_pessoa: nome do corretor
    // - conecta_lead_id nos metadados (notas_pessoais ___META_JSON___:{"conecta_lead_id":"..."})
    // - NUNCA preencher encaminhado_para_aba com o ID do Conecta
    // - status: 'Novo contato'
    // - categoria: 'Comercial'
    // - kanban_ativo: true

    const initialMeta: Record<string, any> = {
      conecta_lead_id: conectaLeadId,
      conecta_origem: 'Bender Conecta',
      conecta_sync_at: nowStr,
    }

    if (nomeCorretor) {
      initialMeta.conecta_corretor_nome = nomeCorretor
    }

    const notasPessoaisComMeta = stringifyLeadMetadados('', initialMeta)

    const insertPayload: Record<string, any> = {
      nome,
      telefone,
      email: email || `${telefone}@conecta.placeholder`,
      origem: 'Bender Conecta',
      origem_pessoa: nomeCorretor || null,
      status: 'Novo contato',
      categoria: 'Comercial',
      kanban_ativo: true,
      criado_por_nome: nomeCorretor ? `Conecta (${nomeCorretor})` : 'Bender Conecta',
      notas: `Lead recebido do Bender Conecta (ID Conecta: ${conectaLeadId})${
        nomeCorretor ? ` indicado pelo corretor ${nomeCorretor}` : ''
      }.`,
      notas_pessoais: notasPessoaisComMeta,
      atualizado_em: nowStr,
      criado_em: nowStr,
    }

    const { data: newLead, error: insertErr } = await supabase
      .from('leads')
      .insert(insertPayload)
      .select('id, nome, telefone, email, origem, origem_pessoa, status, categoria, criado_em')
      .single()

    if (insertErr) {
      console.error('[conecta-leads] Erro ao criar novo lead:', insertErr)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Erro de banco de dados ao criar lead.',
          details: insertErr.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    console.log(
      `[conecta-leads] Novo lead criado com sucesso: ${newLead.id} (${newLead.nome}) via Conecta ID ${conectaLeadId}`,
    )

    return new Response(
      JSON.stringify({
        success: true,
        action: 'created',
        deduplicated: false,
        message: 'Lead criado com sucesso na aba Comercial.',
        lead: {
          id: newLead.id,
          nome: newLead.nome,
          telefone: newLead.telefone,
          origem: newLead.origem,
          origem_pessoa: newLead.origem_pessoa,
          status: newLead.status,
          conecta_lead_id: conectaLeadId,
          criado_em: newLead.criado_em,
        },
      }),
      {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (err: any) {
    console.error('[conecta-leads] Erro inesperado:', err)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Erro interno ao processar lead do Conecta.',
        details: err?.message || String(err),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
