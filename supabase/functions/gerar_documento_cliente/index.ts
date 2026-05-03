import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import JSZip from 'https://esm.sh/jszip@3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body: any = await req.json()
    console.log('Input body:', JSON.stringify(body))

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey =
      Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Step 1: Download template
    console.log('Step 1: Downloading template from dossiers/templates/contrato.docx')
    const BUCKET = 'dossiers'
    const TEMPLATE_PATH = 'templates/contrato.docx'
    const { data: templateBlob, error: downloadError } = await supabase.storage
      .from(BUCKET)
      .download(TEMPLATE_PATH)

    if (downloadError || !templateBlob) {
      console.error('Download error:', downloadError)
      return new Response(JSON.stringify({ error: 'Failed to download template' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    console.log('Template downloaded successfully')

    const templateBuffer = await templateBlob.arrayBuffer()

    // Step 2: Load and modify ZIP
    console.log('Step 2: Loading and modifying JSZip')
    const zip = await JSZip.loadAsync(templateBuffer)

    const replacements: Record<string, string> = body.replacements || {
      '{{Cliente}}': body.cliente || '',
      '{{Valor}}': body.valor || '',
      '{{Vendedor}}': body.vendedor || '',
      '{{Data}}': body.data || new Date().toLocaleDateString('pt-BR'),
    }
    console.log('Replacements:', JSON.stringify(replacements))

    const documentXmlPath = 'word/document.xml'
    const documentXmlFile = zip.file(documentXmlPath)
    if (!documentXmlFile) {
      console.error('document.xml not found in template')
      return new Response(JSON.stringify({ error: 'Invalid template: missing document.xml' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let documentXml = await documentXmlFile.async('string')
    for (const [placeholder, value] of Object.entries(replacements)) {
      const escaped = placeholder.replace(/[.*+?^${}()|[\\]/g, '\\$&')
      documentXml = documentXml.replace(new RegExp(escaped, 'g'), value)
    }
    zip.file(documentXmlPath, documentXml)

    console.log('JSZip modification completed')

    // Step 3: Generate new buffer
    console.log('Step 3: Generating DOCX buffer')
    const generatedBuffer = await zip.generateAsync({ type: 'uint8array' })

    // Step 4: Upload
    console.log('Step 4: Uploading generated DOCX')
    const uploadPath = `contratos/${body.codigo_confirmacao}.docx`
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(uploadPath, generatedBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: true,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return new Response(JSON.stringify({ error: 'Failed to upload DOCX' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    console.log('DOCX uploaded successfully to', uploadPath)

    // Step 5: Insert to DB
    console.log('Step 5: Inserting into assinaturas table')
    const expiraEm = body.expira_em || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    const statusDefault = body.status || 'pendente'
    const insertData = {
      documento_id: body.documento_id,
      documento_nome: body.documento_nome,
      cliente_id: body.cliente_id,
      signatario_tipo: body.signatario_tipo,
      signatario_nome: body.signatario_nome,
      signatario_email: body.signatario_email,
      codigo_confirmacao: body.codigo_confirmacao,
      status: statusDefault,
      expira_em: expiraEm,
    }
    console.log('Insert data:', JSON.stringify(insertData))

    const { data: inserted, error: insertError } = await supabase
      .from('assinaturas')
      .insert(insertData)
      .select()
      .single()

    if (insertError || !inserted) {
      console.error('Insert error:', insertError)
      return new Response(JSON.stringify({ error: 'Failed to create assinatura record' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    console.log('Assinatura record created successfully')

    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET).getPublicUrl(uploadPath)

    return new Response(
      JSON.stringify({
        success: true,
        file_url: publicUrl,
        assinatura: inserted,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
