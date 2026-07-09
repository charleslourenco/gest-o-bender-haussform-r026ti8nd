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
const STORAGE_BUCKET = 'bender-clientes'

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
  try {
    const u = new URL(url)
    return u.pathname.split(`/${STORAGE_BUCKET}/`)[1] ?? null
  } catch {
    // Not a URL — assume it's already a path
    return url.startsWith(`/${STORAGE_BUCKET}/`) ? url.slice(`/${STORAGE_BUCKET}/`.length) : url
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
  let query = supabase.from('documentos_cliente').select('*')

  if (payload.envelope_id) {
    query = query.eq('envelope_id', payload.envelope_id)
  } else if (payload.documento_id) {
    query = query.eq('id', payload.documento_id)
  } else if (payload.cliente_id) {
    query = query
      .eq('cliente_id', payload.cliente_id)
      .order('criado_em', { ascending: false })
      .limit(1)
  } else {
    return null
  }

  const { data, error } = await query.limit(1).maybeSingle()
  if (error) {
    console.error('finalize: find document error', error)
    return null
  }
  return (data as DocumentoClienteRow) ?? null
}

async function gatherSignatures(
  supabase: any,
  documento: DocumentoClienteRow,
  payload: FinalizePayload,
): Promise<{ signature: ReturnType<typeof buildSignatureFromSources>; meta: StampMetadata }> {
  let assinante: AssinanteRow | null = null
  let assinatura: AssinaturaRow | null = null

  if (documento.envelope_id || payload.envelope_id) {
    const envelopeId = documento.envelope_id ?? payload.envelope_id
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

  if (documento.id) {
    const { data: assinaturaData } = await supabase
      .from('assinaturas')
      .select(
        'assinatura_imagem, signatario_nome, signatario_cpf, signatario_email, ip_assinatura, data_assinatura',
      )
      .or(`documento_id.eq.${documento.id}`)
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
    const { error: envError } = await supabase
      .from('envelopes_assinatura')
      .update({ status: 'concluido', concluido_em: new Date().toISOString() })
      .eq('id', documento.envelope_id)
    if (envError) {
      console.error('finalize: update envelope error', envError)
    }
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
      headers: { 'Content-Type': 'application/json', Connection: 'keep-alive', ...corsHeaders },
    })
  } catch (err) {
    console.error('finalize: unexpected error', err)
    return new Response(JSON.stringify({ success: false, url: null, error: 'Unexpected error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', Connection: 'keep-alive', ...corsHeaders },
    })
  }
})
