import { createClient } from 'npm:@supabase/supabase-js@2'
import JSZip from 'npm:jszip@3'

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve({ port: 54321 }, async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405,
    })
  }

  try {
    const body = (await req.json()) as {
      template: string
      dossierId: string
      replacements: Record<string, string>
    }
    const { template, dossierId, replacements } = body

    if (!template || !dossierId || typeof replacements !== 'object') {
      throw new Error('Missing or invalid parameters: template, dossierId, replacements')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing environment variables: SUPABASE_URL, SERVICE_ROLE_KEY')
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Download template ZIP
    const { data: templateFile, error: downloadError } = await supabase.storage
      .from('bender_templates')
      .download(template)

    if (downloadError || !templateFile) {
      throw new Error(`Failed to download template: ${downloadError?.message || 'Unknown error'}`)
    }

    const templateBuffer = await templateFile.arrayBuffer()
    const zip = await JSZip.loadAsync(templateBuffer)

    // Process files
    const newFiles: Record<string, Uint8Array> = {}
    await Promise.all(
      Object.entries(zip.files).map(async ([fileName, file]) => {
        if (file.dir) return

        try {
          let content = await file.async('text')
          for (const [key, value] of Object.entries(replacements)) {
            const placeholder = `{{${key}}}`
            content = content.replaceAll(placeholder, value || '')
          }
          newFiles[fileName] = new TextEncoder().encode(content)
        } catch (e) {
          console.warn(`Non-text file ${fileName}, copying binary:`, e)
          newFiles[fileName] = await file.async('uint8array')
        }
      }),
    )

    // Create new ZIP
    const newZip = new JSZip()
    for (const [name, content] of Object.entries(newFiles)) {
      newZip.file(name, content)
    }

    const newZipBuffer = await newZip.generateAsync({ type: 'uint8array' })

    // Upload to dossiers bucket
    const outputPath = `${dossierId}/${template}`
    const { error: uploadError } = await supabase.storage
      .from('dossiers')
      .upload(outputPath, newZipBuffer, {
        upsert: true,
      })

    if (uploadError) {
      throw new Error(`Failed to upload: ${uploadError.message}`)
    }

    console.log(`Successfully generated and uploaded ${outputPath}`)

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Bender Haussform Error:', error)
    return new Response(JSON.stringify({ success: false, error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
