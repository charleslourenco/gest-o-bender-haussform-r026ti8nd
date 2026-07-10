import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import {
  stampPdfWithSignature,
  buildSignatureFromSources,
  type StampMetadata,
} from '../_shared/pdf-stamp.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE_KEY =
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY') ?? ''
const STORAGE_BUCKET = 'bender_clientes'

interface FinalizePayload {
  documento_id?: string
  cliente_id?: string
  envelope_id?: string
  manual?: boolean
}

interface AssinanteRow {
  assinatura_base64: string | null
  nome_completo: string
  cpf: string | null
  email: string | null
  ip_address: string | null
  assinado_em: string | null
}

interface AssinaturaRow {
  assinatura_imagem: string | null
  signatario_nome: string
  signatario_cpf: string | null
  signatario_email: string | null
  ip_assinatura: string | null
  data_assinatura: string | null
}

interface DocumentoClienteRow {
  id: string
  arquivo_url: string | null
  arquivo_assinado_url: string | null
  cliente_id: string | null
  envelope_id: string | null
  template_nome: string | null
  status: string
}

function getPathFromUrl(url: string | null): string | null {
  if (!url) return null

  // Already a relative path (no protocol) — normalize and return.
  if (!url.startsWith('http')) {
    const prefix = `${STORAGE_BUCKET}/`
    return url.startsWith(prefix) ? url.slice(prefix.length) : url
  }

  try {
    const u = new URL(url)

    // Format: /storage/v1/object/public|sign/<bucket>/<path>
    const objectMatch = u.pathname.match(
      new RegExp(`/storage/v1/object/(?:public|sign)/${STORAGE_BUCKET}/(.+)$`),
    )
    if (objectMatch) {
      return decodeURIComponent(objectMatch[1])
    }

    // Format: /storage/v1/render/<bucket>/<path>
    const renderMatch = u.pathname.match(new RegExp(`/storage/v1/render/${STORAGE_BUCKET}/(.+)$`))
    if (renderMatch) {
      return decodeURIComponent(renderMatch[1])
    }

    // Fallback: any occurrence of /<bucket>/<path>
    const bucketIdx = u.pathname.indexOf(`/${STORAGE_BUCKET}/`)
    if (bucketIdx !== -1) {
      return decodeURIComponent(u.pathname.slice(bucketIdx + `/${STORAGE_BUCKET}/`.length))
    }

    return null
  } catch {
    // Not a valid URL — try raw string split as last resort.
    const parts = url.split(`/${STORAGE_BUCKET}/`)
    return parts.length > 1 ? parts[parts.length - 1] : null
  }
}

async function downloadPdf(supabase: any, path: string): Promise<Uint8Array | null> {
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).download(path)
  if (error || !data) {
    console.error('finalize: download error', error)
    return null
  }
  const buf = await data.arrayBuffer()
  return new Uint8Array(buf)
}

async function uploadSignedPdf(
  supabase: any,
  path: string,
  bytes: Uint8Array,
): Promise<string | null> {
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, bytes, { contentType: 'application/pdf', upsert: true })
  if (error) {
    console.error('finalize: upload error', error)
    return null
  }
  const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)
  return pub?.publicUrl ?? null
}

async function findDocument(
  supabase: any,
  payload: FinalizePayload,
): Promise<DocumentoClienteRow | null> {
  if (payload.documento_id) {
    const { data: byUrl, error: errUrl } = await supabase
      .from('documentos_cliente')
      .select('*')
      .eq('arquivo_url', payload.documento_id)
      .limit(1)
      .maybeSingle()
    if (errUrl) console.error('finalize: find by arquivo_url error', errUrl)
    if (byUrl) return byUrl as DocumentoClienteRow

    const { data: byId, error: errId } = await supabase
      .from('documentos_cliente')
      .select('*')
      .eq('id', payload.documento_id)
      .limit(1)
      .maybeSingle()
    if (errId) console.error('finalize: find by id error', errId)
    if (byId) return byId as DocumentoClienteRow

    return null
  }

  if (payload.envelope_id) {
    const { data, error } = await supabase
      .from('documentos_cliente')
      .select('*')
      .eq('envelope_id', payload.envelope_id)
      .limit(1)
      .maybeSingle()
    if (error) console.error('finalize: find by envelope error', error)
    return (data as DocumentoClienteRow) ?? null
  }

  return null
}

async function gatherSignatures(
  supabase: any,
  documento: DocumentoClienteRow,
  payload: FinalizePayload,
): Promise<{
  signature: ReturnType<typeof buildSignatureFromSources>
  meta: StampMetadata
}> {
  let assinante: AssinanteRow | null = null
  let assinatura: AssinaturaRow | null = null

  const envelopeId = documento.envelope_id ?? payload.envelope_id

  if (envelopeId) {
    const { data: assinanteData } = await supabase
      .from('assinantes')
      .select('assinatura_base64, nome_completo, cpf, email, ip_address, assinado_em')
      .eq('envelope_id', envelopeId)
      .eq('status', 'assinado')
      .order('assinado_em', { ascending: false })
      .limit(1)
      .maybeSingle()
    assinante = (assinanteData as AssinanteRow) ?? null
  }

  const documentoIdentifiers: string[] = []
  if (documento.arquivo_url) {
    documentoIdentifiers.push(documento.arquivo_url)
  }
  if (documento.id && !documentoIdentifiers.includes(documento.id)) {
    documentoIdentifiers.push(documento.id)
  }

  if (documentoIdentifiers.length > 0) {
    const { data: assinaturaData } = await supabase
      .from('assinaturas')
      .select(
        'assinatura_imagem, signatario_nome, signatario_cpf, signatario_email, ip_assinatura, data_assinatura',
      )
      .in('documento_id', documentoIdentifiers)
      .order('data_assinatura', { ascending: false })
      .limit(1)
      .maybeSingle()
    assinatura = (assinaturaData as AssinaturaRow) ?? null
  }

  const signature = buildSignatureFromSources(
    assinante?.assinatura_base64 ?? null,
    assinatura?.assinatura_imagem ?? null,
  )

  const meta: StampMetadata = {
    nome: assinante?.nome_completo ?? assinatura?.signatario_nome ?? null,
    cpf: assinante?.cpf ?? assinatura?.signatario_cpf ?? null,
    email: assinante?.email ?? assinatura?.signatario_email ?? null,
    ip: assinante?.ip_address ?? assinatura?.ip_assinatura ?? null,
    data: assinante?.assinado_em ?? assinatura?.data_assinatura ?? null,
  }

  return { signature, meta }
}

async function maybeCompleteEnvelope(supabase: any, envelopeId: string): Promise<void> {
  const { data: envDocs, error } = await supabase
    .from('documentos_cliente')
    .select('arquivo_assinado_url')
    .eq('envelope_id', envelopeId)

  if (error || !envDocs) return

  const allProcessed = envDocs.every(
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
}

export async function finalizeDocument(
  payload: FinalizePayload,
): Promise<{ success: boolean; url: string | null; error?: string }> {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return { success: false, url: null, error: 'Missing Supabase credentials' }
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  const documento = await findDocument(supabase, payload)
  if (!documento) {
    return { success: false, url: null, error: 'Document not found' }
  }

  // Workflow separation: PDF Monkey documents linked to envelopes_assinatura
  // must not be overwritten by manual re-stamping requests — those are handled
  // exclusively by the envelope trigger flow.
  if (payload.manual && documento.envelope_id && documento.arquivo_assinado_url) {
    return { success: true, url: documento.arquivo_assinado_url }
  }

  if (!payload.manual && documento.arquivo_assinado_url) {
    return { success: true, url: documento.arquivo_assinado_url }
  }

  const sourcePath = getPathFromUrl(documento.arquivo_assinado_url ?? documento.arquivo_url)
  if (!sourcePath) {
    return { success: false, url: null, error: 'No source PDF path available' }
  }

  const pdfBytes = await downloadPdf(supabase, sourcePath)
  if (!pdfBytes) {
    return { success: false, url: null, error: 'Failed to download source PDF' }
  }

  const { signature, meta } = await gatherSignatures(supabase, documento, payload)

  let stampedBytes: Uint8Array
  try {
    stampedBytes = await stampPdfWithSignature(pdfBytes, meta, signature)
  } catch (err) {
    console.error('finalize: stamp error', err)
    return { success: false, url: null, error: 'Failed to stamp PDF' }
  }

  const signedPath = sourcePath.replace(/\.pdf$/i, '') + '-assinado.pdf'
  const publicUrl = await uploadSignedPdf(supabase, signedPath, stampedBytes)
  if (!publicUrl) {
    return { success: false, url: null, error: 'Failed to upload signed PDF' }
  }

  const { error: updateError } = await supabase
    .from('documentos_cliente')
    .update({
      arquivo_assinado_url: publicUrl,
      status: 'Assinado',
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', documento.id)

  if (updateError) {
    console.error('finalize: update document error', updateError)
  }

  if (documento.envelope_id) {
    await maybeCompleteEnvelope(supabase, documento.envelope_id)
  }

  return { success: true, url: publicUrl }
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
