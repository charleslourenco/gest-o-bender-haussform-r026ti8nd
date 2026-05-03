import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import JSZip from 'https://esm.sh/jszip@3.10.1'

type CreateAssinaturaRequest = {
  cliente_id: string
  signatario_tipo: string
  signatario_nome: string
  signatario_email: string
  cliente: string
  valor: string
  vendedor: string
  data: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = (await req.json()) as CreateAssinaturaRequest

    // Basic validation
    const requiredFields = [
      'cliente_id',
      'signatario_tipo',
      'signatario_nome',
      'signatario_email',
      'cliente',
      'valor',
      'vendedor',
      'data',
    ]
    for (const field of requiredFields) {
      if (!body[field as keyof CreateAssinaturaRequest]) {
        throw new Error(`Missing required field: ${field}`)
      }
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    )

    // Download template
    const { data: templateData, error: downloadError } = await supabase.storage
      .from('bender_templates')
      .download('contrato.docx')

    if (downloadError || !templateData) {
      throw new Error('Failed to download template: ' + (downloadError?.message ?? 'Not found'))
    }

    // Process DOCX
    const zip = await JSZip.loadAsync(templateData)
    const docXmlFile = zip.file('word/document.xml')
    if (!docXmlFile) {
      throw new Error('document.xml not found in template')
    }

    let docXml = await docXmlFile.async('text')
    docXml = docXml
      .replace(/\{\{Cliente\}\}/g, body.cliente)
      .replace(/\{\{Valor\}\}/g, body.valor)
      .replace(/\{\{Vendedor\}\}/g, body.vendedor)
      .replace(/\{\{Data\}\}/g, body.data)

    zip.file('word/document.xml', docXml)

    const outputBuffer = await zip.generateAsync({ type: 'uint8array' })

    // Upload to storage
    const uuid = crypto.randomUUID()
    const documento_nome = 'Contrato Bender Haussform.docx'
    const documento_id = `contrato-bender-${uuid}.docx`

    const { error: uploadError } = await supabase.storage
      .from('dossiers')
      .upload(documento_id, outputBuffer)

    if (uploadError) {
      throw new Error('Upload failed: ' + uploadError.message)
    }

    // Generate confirmation code (6 digits)
    const codigo_confirmacao = Array.from({ length: 6 }, () => Math.floor(Math.random() * 10)).join(
      '',
    )

    // Expiration in 7 days
    const expira_em = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    // Insert into assinaturas
    const { data: assinaturaData, error: insertError } = await supabase
      .from('assinaturas')
      .insert({
        documento_id,
        documento_nome,
        cliente_id: body.cliente_id,
        signatario_tipo: body.signatario_tipo,
        signatario_nome: body.signatario_nome,
        signatario_email: body.signatario_email,
        codigo_confirmacao,
        status: 'pendente',
        expira_em,
      })
      .select('id')
      .single()

    if (insertError || !assinaturaData) {
      throw new Error('Failed to create assinatura: ' + (insertError?.message ?? 'Unknown error'))
    }

    return new Response(JSON.stringify({ success: true, assinatura_id: assinaturaData.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error(error)
    return new Response(JSON.stringify({ success: false, error: (error as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
