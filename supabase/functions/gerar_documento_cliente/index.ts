import JSZip from 'npm:jszip@3'
import { createClient } from 'npm:@supabase/supabase-js@2'

export default async function (request: Request): Promise<Response> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY')!

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  function replacePlaceholders(xml: string): string {
    return xml.replace(/\{\{[\s\S]*?\}\}/g, '')
  }

  const pathsToProcess = [
    'word/document.xml',
    'word/header1.xml',
    'word/header2.xml',
    'word/header3.xml',
    'word/footer1.xml',
    'word/footer2.xml',
    'word/footer3.xml',
  ]

  // List DOCX files in origin bucket
  const { data: filesData, error: listError } = await supabase.storage
    .from('bender_templates')
    .list('', {
      limit: 100,
    })

  if (listError) {
    console.error('List error:', listError)
    return new Response(JSON.stringify({ success: false, error: listError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const docxFiles = (filesData ?? []).filter(
    (file) => file.name.endsWith('.docx') && !file.name.includes('/'),
  )

  for (const file of docxFiles) {
    // Check if already exists in destination
    const { data: destData, error: destError } = await supabase.storage
      .from('dossiers')
      .download(file.name)

    if (!destError && destData) {
      console.log(`Skipped (already exists): ${file.name}`)
      continue
    }

    // Download original file
    const { data: originData, error: originError } = await supabase.storage
      .from('bender_templates')
      .download(file.name)

    if (originError || !originData) {
      console.error(`Download error for ${file.name}:`, originError)
      continue
    }

    const arrayBuffer = await originData.arrayBuffer()
    const zip = new JSZip()
    await zip.loadAsync(arrayBuffer)

    // Process placeholders in key XML files
    for (const relPath of pathsToProcess) {
      const zipFile = zip.file(relPath)
      if (zipFile) {
        const content = await zipFile.async('string')
        const newContent = replacePlaceholders(content)
        zip.file(relPath, newContent)
      }
    }

    // Generate new DOCX
    const newArrayBuffer = await zip.generateAsync({ type: 'arraybuffer' })

    // Upload to destination
    const { error: uploadError } = await supabase.storage
      .from('dossiers')
      .upload(file.name, new Uint8Array(newArrayBuffer), {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: true,
      })

    if (uploadError) {
      console.error(`Upload error for ${file.name}:`, uploadError)
    } else {
      console.log(`Successfully processed: ${file.name}`)
    }
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
