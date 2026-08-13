import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import {
  stampPdfWithSignatures,
  buildSignatureFromSources,
  type StampMetadata,
  type SignatureData,
  type SignatureEntry,
} from '../_shared/pdf-stamp.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, x-supabase-client-platform, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE_KEY =
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY') ?? ''
const STORAGE_BUCKET = 'bender_clientes'
const STORAGE_BUCKET_EQUIPE = 'documentos_equipe'

interface FinalizePayload {
  documento_id?: string
  cliente_id?: string
  envelope_id?: string
  manual?: boolean
  force?: boolean
}

interface AssinanteRow {
  id: string
  assinatura_base64: string | null
  nome_completo: string
  cpf: string | null
  email: string | null
  ip_address: string | null
  assinado_em: string | null
}

interface AssinaturaRow {
  id: string
  assinatura_imagem: string | null
  signatario_nome: string
  signatario_cpf: string | null
  signatario_email: string | null
  ip_assinatura: string | null
  data_assinatura: string | null
}

interface BaseDocumentRow {
  id: string
  arquivo_url: string | null
  arquivo_assinado_url: string | null
  envelope_id: string | null
  template_nome?: string | null
  nome?: string | null
  status?: string
  cliente_id?: string | null
  is_digital?: boolean | null
}

interface FoundDocument {
  source: 'cliente' | 'equipe'
  data: BaseDocumentRow
  bucket: string
}

interface ProcessResult {
  success: boolean
  url: string | null
  error?: string
  idempotent?: boolean
  document_id?: string
}

function getPathFromUrl(url: string | null, bucket: string = STORAGE_BUCKET): string | null {
  if (!url) return null

  if (!url.startsWith('http')) {
    const prefix = `${bucket}/`
    return url.startsWith(prefix) ? url.slice(prefix.length) : url
  }

  try {
    const u = new URL(url)
    const objectMatch = u.pathname.match(
      new RegExp(`/storage/v1/object/(?:public|sign)/${bucket}/(.+)$`),
    )
    if (objectMatch) return decodeURIComponent(objectMatch[1])

    const renderMatch = u.pathname.match(new RegExp(`/storage/v1/render/${bucket}/(.+)$`))
    if (renderMatch) return decodeURIComponent(renderMatch[1])

    const bucketIdx = u.pathname.indexOf(`/${bucket}/`)
    if (bucketIdx !== -1) {
      return decodeURIComponent(u.pathname.slice(bucketIdx + `/${bucket}/`.length))
    }

    return null
  } catch {
    const parts = url.split(`/${bucket}/`)
    return parts.length > 1 ? parts[parts.length - 1] : null
  }
}

async function downloadPdf(
  supabase: any,
  bucket: string,
  path: string,
): Promise<Uint8Array | null> {
  const { data, error } = await supabase.storage.from(bucket).download(path)
  if (error || !data) {
    console.error('finalize: download error', error)
    return null
  }
  const buf = await data.arrayBuffer()
  return new Uint8Array(buf)
}

async function uploadSignedPdf(
  supabase: any,
  bucket: string,
  path: string,
  bytes: Uint8Array,
): Promise<string | null> {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, bytes, { contentType: 'application/pdf', upsert: true })
  if (error) {
    console.error('finalize: upload error', error)
    return null
  }
  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path)
  return pub?.publicUrl ?? null
}

async function findDocument(
  supabase: any,
  payload: FinalizePayload,
): Promise<FoundDocument | null> {
  if (!payload.documento_id) return null

  const { data: byUrl, error: errUrl } = await supabase
    .from('documentos_cliente')
    .select('*')
    .eq('arquivo_url', payload.documento_id)
    .limit(1)
    .maybeSingle()
  if (errUrl) console.error('finalize: find cliente by arquivo_url error', errUrl)
  if (byUrl) return { source: 'cliente', data: byUrl as BaseDocumentRow, bucket: STORAGE_BUCKET }

  const { data: byId, error: errId } = await supabase
    .from('documentos_cliente')
    .select('*')
    .eq('id', payload.documento_id)
    .limit(1)
    .maybeSingle()
  if (errId) console.error('finalize: find cliente by id error', errId)
  if (byId) return { source: 'cliente', data: byId as BaseDocumentRow, bucket: STORAGE_BUCKET }

  const { data: equipeById, error: errEquipeId } = await supabase
    .from('documentos_equipe')
    .select('*')
    .eq('id', payload.documento_id)
    .limit(1)
    .maybeSingle()
  if (errEquipeId) console.error('finalize: find equipe by id error', errEquipeId)
  if (equipeById)
    return { source: 'equipe', data: equipeById as BaseDocumentRow, bucket: STORAGE_BUCKET_EQUIPE }

  const { data: equipeByUrl, error: errEquipeUrl } = await supabase
    .from('documentos_equipe')
    .select('*')
    .eq('arquivo_url', payload.documento_id)
    .limit(1)
    .maybeSingle()
  if (errEquipeUrl) console.error('finalize: find equipe by arquivo_url error', errEquipeUrl)
  if (equipeByUrl)
    return { source: 'equipe', data: equipeByUrl as BaseDocumentRow, bucket: STORAGE_BUCKET_EQUIPE }

  return null
}

async function findDocumentsByEnvelope(
  supabase: any,
  envelopeId: string,
): Promise<FoundDocument[]> {
  const results: FoundDocument[] = []

  const { data: clienteDocs, error: clienteErr } = await supabase
    .from('documentos_cliente')
    .select('*')
    .eq('envelope_id', envelopeId)

  if (clienteErr) console.error('finalize: find cliente docs by envelope error', clienteErr)
  if (clienteDocs) {
    for (const doc of clienteDocs) {
      results.push({ source: 'cliente', data: doc as BaseDocumentRow, bucket: STORAGE_BUCKET })
    }
  }

  const { data: equipeDocs, error: equipeErr } = await supabase
    .from('documentos_equipe')
    .select('*')
    .eq('envelope_id', envelopeId)

  if (equipeErr) console.error('finalize: find equipe docs by envelope error', equipeErr)
  if (equipeDocs) {
    for (const doc of equipeDocs) {
      results.push({
        source: 'equipe',
        data: doc as BaseDocumentRow,
        bucket: STORAGE_BUCKET_EQUIPE,
      })
    }
  }

  return results
}

async function gatherSignatures(
  supabase: any,
  documento: BaseDocumentRow,
  payload: FinalizePayload,
): Promise<SignatureEntry[]> {
  const envelopeId = documento.envelope_id ?? payload.envelope_id
  const entries: SignatureEntry[] = []
  const seenIds = new Set<string>()

  if (envelopeId) {
    const { data: assinantesData } = await supabase
      .from('assinantes')
      .select('id, assinatura_base64, nome_completo, cpf, email, ip_address, assinado_em')
      .eq('envelope_id', envelopeId)
      .eq('status', 'assinado')
      .order('assinado_em', { ascending: true })
    for (const a of (assinantesData ?? []) as AssinanteRow[]) {
      if (seenIds.has(a.id)) continue
      seenIds.add(a.id)
      const signature = buildSignatureFromSources(a.assinatura_base64, null)
      entries.push({
        signature,
        meta: {
          nome: a.nome_completo,
          cpf: a.cpf,
          email: a.email,
          ip: a.ip_address,
          data: a.assinado_em,
        },
      })
    }
  }

  const documentoIdentifiers: string[] = []
  if (documento.arquivo_url) documentoIdentifiers.push(documento.arquivo_url)
  if (documento.id && !documentoIdentifiers.includes(documento.id)) {
    documentoIdentifiers.push(documento.id)
  }

  if (documentoIdentifiers.length > 0) {
    const { data: assinaturasData } = await supabase
      .from('assinaturas')
      .select(
        'id, assinatura_imagem, signatario_nome, signatario_cpf, signatario_email, ip_assinatura, data_assinatura',
      )
      .in('documento_id', documentoIdentifiers)
      .eq('status', 'assinado')
      .order('data_assinatura', { ascending: true })
    for (const a of (assinaturasData ?? []) as AssinaturaRow[]) {
      if (seenIds.has(a.id)) continue
      seenIds.add(a.id)
      const signature = buildSignatureFromSources(null, a.assinatura_imagem)
      entries.push({
        signature,
        meta: {
          nome: a.signatario_nome,
          cpf: a.signatario_cpf,
          email: a.signatario_email,
          ip: a.ip_assinatura,
          data: a.data_assinatura,
        },
      })
    }
  }

  return entries
}

async function maybeCompleteEnvelope(supabase: any, envelopeId: string): Promise<void> {
  const { data: assinantes, error: assinantesErr } = await supabase
    .from('assinantes')
    .select('id, status')
    .eq('envelope_id', envelopeId)

  if (assinantesErr) {
    console.error('finalize: check assinantes for completion error', assinantesErr)
    return
  }

  const totalAssinantes = assinantes?.length ?? 0
  const signedAssinantes = (assinantes ?? []).filter((a: any) => a.status === 'assinado').length

  if (totalAssinantes === 0 || signedAssinantes < totalAssinantes) {
    return
  }

  const { data: clienteDocs, error: clienteErr } = await supabase
    .from('documentos_cliente')
    .select('arquivo_assinado_url')
    .eq('envelope_id', envelopeId)

  if (clienteErr) console.error('finalize: check cliente envelope error', clienteErr)

  const { data: equipeDocs, error: equipeErr } = await supabase
    .from('documentos_equipe')
    .select('arquivo_assinado_url')
    .eq('envelope_id', envelopeId)

  if (equipeErr) console.error('finalize: check equipe envelope error', equipeErr)

  const allDocs = [...(clienteDocs || []), ...(equipeDocs || [])]
  if (allDocs.length === 0) return

  const allProcessed = allDocs.every(
    (d: any) => d.arquivo_assinado_url && d.arquivo_assinado_url !== '',
  )
  if (!allProcessed) return

  const { error: envError } = await supabase
    .from('envelopes_assinatura')
    .update({ status: 'concluido', concluido_em: new Date().toISOString() })
    .eq('id', envelopeId)

  if (envError) {
    console.error('finalize: complete envelope error', envError)
  }

  // Dispara notificação por e-mail com os documentos assinados concluídos
  try {
    const { data: assinantes } = await supabase
      .from('assinantes')
      .select('nome_completo, email, token_acesso')
      .eq('envelope_id', envelopeId)

    const { data: envData } = await supabase
      .from('envelopes_assinatura')
      .select('nome_documento')
      .eq('id', envelopeId)
      .single()

    const docName = envData?.nome_documento || 'Documentos'

    for (const a of assinantes || []) {
      if (!a.email) continue
      const tokenParam = a.token_acesso ? `?token=${a.token_acesso}` : ''
      const link = `${SUPABASE_URL.replace('.supabase.co', '.supabase.co')}/assinar-envelope/${envelopeId}${tokenParam}`

      await supabase.functions.invoke('send-signature-email', {
        body: {
          type: 'completion',
          to: a.email,
          nome: a.nome_completo,
          link,
          documento_nome: docName,
          envelope_id: envelopeId,
        },
      })
    }
  } catch (e) {
    console.error('finalize: send completion email error', e)
  }
}

async function processDocument(
  supabase: any,
  found: FoundDocument,
  payload: FinalizePayload,
): Promise<{ success: boolean; url: string | null; error?: string; idempotent?: boolean }> {
  const documento = found.data
  const bucket = found.bucket

  if (payload.force) {
    // Force reprocessing: bypass idempotency to re-stamp with corrected signatures
  } else if (documento.arquivo_assinado_url) {
    return { success: true, url: documento.arquivo_assinado_url, idempotent: true }
  }

  const sourcePath = getPathFromUrl(
    payload.force
      ? documento.arquivo_url
      : (documento.arquivo_assinado_url ?? documento.arquivo_url),
    bucket,
  )
  if (!sourcePath) {
    return { success: false, url: null, error: 'No source PDF path available' }
  }

  const pdfBytes = await downloadPdf(supabase, bucket, sourcePath)
  if (!pdfBytes) {
    return { success: false, url: null, error: 'Failed to download source PDF' }
  }

  const entries = await gatherSignatures(supabase, documento, payload)

  let stampedBytes: Uint8Array
  try {
    stampedBytes = await stampPdfWithSignatures(pdfBytes, entries)
  } catch (err) {
    console.error('finalize: stamp error', err)
    return { success: false, url: null, error: 'Failed to stamp PDF' }
  }

  const signedPath = sourcePath.replace(/\.pdf$/i, '') + '-assinado.pdf'
  const publicUrl = await uploadSignedPdf(supabase, bucket, signedPath, stampedBytes)
  if (!publicUrl) {
    return { success: false, url: null, error: 'Failed to upload signed PDF' }
  }

  if (found.source === 'cliente') {
    const { error: updateError } = await supabase
      .from('documentos_cliente')
      .update({
        arquivo_assinado_url: publicUrl,
        status: 'Assinado',
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', documento.id)

    if (updateError) {
      console.error('finalize: update documentos_cliente error', updateError)
    }
  } else {
    const { error: updateError } = await supabase
      .from('documentos_equipe')
      .update({ arquivo_assinado_url: publicUrl })
      .eq('id', documento.id)

    if (updateError) {
      console.error('finalize: update documentos_equipe error', updateError)
    }
  }

  return { success: true, url: publicUrl }
}

export async function finalizeDocument(payload: FinalizePayload): Promise<{
  success: boolean
  url: string | null
  error?: string
  idempotent?: boolean
  results?: ProcessResult[]
}> {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return { success: false, url: null, error: 'Missing Supabase credentials' }
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  if (payload.envelope_id && !payload.documento_id) {
    const docs = await findDocumentsByEnvelope(supabase, payload.envelope_id)
    if (docs.length === 0) {
      return { success: false, url: null, error: 'No documents found for envelope' }
    }

    const results: ProcessResult[] = []
    for (const found of docs) {
      const result = await processDocument(supabase, found, payload)
      results.push({ ...result, document_id: found.data.id })
    }

    const allSuccess = results.every((r) => r.success)
    const firstUrl = results.find((r) => r.url)?.url ?? null

    await maybeCompleteEnvelope(supabase, payload.envelope_id)

    return {
      success: allSuccess,
      url: firstUrl,
      results,
      ...(allSuccess ? {} : { error: 'Some documents failed to process' }),
    }
  }

  const found = await findDocument(supabase, payload)
  if (!found) {
    return { success: false, url: null, error: 'Document not found' }
  }

  const result = await processDocument(supabase, found, payload)

  if (found.data.envelope_id) {
    await maybeCompleteEnvelope(supabase, found.data.envelope_id)
  }

  return result
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body: FinalizePayload = await req.json().catch(() => ({}))
    const result = await finalizeDocument(body)

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 500,
      headers: {
        'Content-Type': 'application/json',
        Connection: 'keep-alive',
        ...corsHeaders,
      },
    })
  } catch (err) {
    console.error('finalize: unexpected error', err)
    return new Response(JSON.stringify({ success: false, url: null, error: 'Unexpected error' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        Connection: 'keep-alive',
        ...corsHeaders,
      },
    })
  }
})
