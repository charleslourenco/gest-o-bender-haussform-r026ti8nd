import { createClient } from 'npm:@supabase/supabase-js@2'
import JSZip from 'npm:jszip@3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      throw new Error('Only POST method allowed')
    }

    const body = (await req.json()) as {
      template_path: string
      dossier_path: string
      data: Record<string, any>
    }

    const { template_path, dossier_path, data } = body

    if (!template_path || !dossier_path || !data) {
      throw new Error('Missing required fields: template_path, dossier_path, data')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SERVICE_ROLE_KEY') ?? '',
    )

    // Download template ZIP
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('bender_templates')
      .download(template_path)

    if (downloadError || !fileData) {
      throw new Error(`Failed to download template: ${downloadError?.message || 'Unknown error'}`)
    }

    const buffer = fileData as Uint8Array
    const templateZip = await JSZip.loadAsync(buffer)

    // Create new ZIP
    const outputZip = new JSZip()

    // Process each file in the template
    for (const [fileName, file] of Object.entries(templateZip.files)) {
      if (!file.dir) {
        let content = await file.async('string')

        // Universal replacement loop
        for (const [key, value] of Object.entries(data)) {
          const placeholder = `{{${key}}}`
          const escapedPlaceholder = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          content = content.replace(new RegExp(escapedPlaceholder, 'g'), String(value ?? ''))
        }

        outputZip.file(fileName, content)
      }
    }

    // Generate output buffer
    const outputBuffer = await outputZip.generateAsync({ type: 'uint8array' })

    // Upload to dossiers bucket
    const { error: uploadError } = await supabase.storage
      .from('dossiers')
      .upload(dossier_path, outputBuffer, {
        contentType: 'application/zip',
        upsert: true,
      })

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`)
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Edge Function error:', error)
    return new Response(JSON.stringify({ success: false, error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
