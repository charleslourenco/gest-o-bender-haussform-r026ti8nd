import { createClient } from 'npm:@supabase/supabase-js@2'
import JSZip from 'npm:jszip@3'

Deno.serve(async (req: Request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  let body
  try {
    body = await req.json()
  } catch {
    return new Response('Invalid JSON', { status: 400, headers: corsHeaders })
  }

  const { dossierId, templateData } = body as {
    dossierId: string
    templateData: Record<string, string>
  }

  if (!dossierId || typeof templateData !== 'object') {
    return new Response('Missing or invalid dossierId/templateData', {
      status: 400,
      headers: corsHeaders,
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseKey) {
    return new Response('Missing env vars', { status: 500, headers: corsHeaders })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  const files = [
    'Contrato.docx',
    'Termo de Alteracao.docx',
    'Termo de Conclusao e Vistoria.docx',
    'Termo de Garantia.docx',
    'Termo de N Conformidade.docx',
    'Termo de Recusa.docx',
    'Termo de Representacao.docx',
  ]

  const results: { file: string; success: boolean; error?: string }[] = []

  for (const file of files) {
    try {
      const { data: templateBuffer, error: downloadError } = await supabase.storage
        .from('bender_templates')
        .download(file)

      if (downloadError) throw downloadError
      if (!templateBuffer) throw new Error('Empty template buffer')

      const zip = await JSZip.loadAsync(templateBuffer)
      const docXmlFile = zip.file('word/document.xml')
      if (!docXmlFile) throw new Error('Missing word/document.xml')

      let docXml = await docXmlFile.async('string')

      for (const [key, value] of Object.entries(templateData)) {
        const placeholder = `{{${key}}}`
        const escapedPlaceholder = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        docXml = docXml.replace(new RegExp(escapedPlaceholder, 'g'), String(value))
      }

      zip.file('word/document.xml', docXml)
      const newZipData = await zip.generateAsync({ type: 'uint8array' })

      const { error: uploadError } = await supabase.storage
        .from('dossiers')
        .upload(`${dossierId}/${file}`, newZipData, {
          upsert: true,
          contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        })

      if (uploadError) throw uploadError

      results.push({ file, success: true })
    } catch (error) {
      console.error(`Error processing ${file}:`, error)
      results.push({ file, success: false, error: (error as Error).message })
    }
  }

  const overallSuccess = results.every((r) => r.success)

  return new Response(JSON.stringify({ success: overallSuccess, results }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: overallSuccess ? 200 : 400,
  })
})
