import { createClient } from 'npm:@supabase/supabase-js@2'
import JSZip from 'npm:jszip@3'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const templates = [
  'Contrato.docx',
  'Termo de Alteracao.docx',
  'Termo de Conclusao e Vistoria.docx',
  'Termo de Garantia.docx',
  'Termo de N Conformidade.docx',
  'Termo de Recusa.docx',
  'Termo de Representacao.docx',
] as const

type TemplateName = (typeof templates)[number]

interface RequestBody {
  dossierId: string
  templateData: Record<string, unknown>
}

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BUCKET = 'documents'

const templatesFolder = 'templates/'

async function processTemplates(
  dossierId: string,
  templateData: Record<string, unknown>,
): Promise<void> {
  const promises = templates.map(async (filename: TemplateName) => {
    const templatePath = `${templatesFolder}${filename}`
    const outputPath = `dossiers/${dossierId}/${filename}`

    const { data: templateBlob, error: downloadError } = await supabase.storage
      .from(BUCKET)
      .download(templatePath)

    if (downloadError || !templateBlob) {
      throw new Error(
        `Failed to download ${filename}: ${downloadError?.message ?? 'Unknown error'}`,
      )
    }

    const arrayBuffer = await templateBlob.arrayBuffer()
    const zip = await JSZip.loadAsync(arrayBuffer)

    const replacePromises: Promise<void>[] = []
    zip.forEach((relPath, zipEntry) => {
      if (relPath.endsWith('.xml') && !zipEntry.dir) {
        replacePromises.push(
          zipEntry.async('string').then((xml) => {
            const replacer = (match: string, key: string) => {
              return templateData[key]?.toString() ?? ''
            }
            const newXml = xml.replace(/\{\{(\w+)\}\}/g, replacer)
            zip.file(relPath, newXml)
          }),
        )
      }
    })

    await Promise.all(replacePromises)

    const newArrayBuffer = await zip.generateAsync({ type: 'arraybuffer' })
    const newBlob = new Blob([newArrayBuffer])

    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(outputPath, newBlob, {
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      upsert: true,
    })

    if (uploadError) {
      throw new Error(`Failed to upload ${filename}: ${uploadError.message}`)
    }
  })

  await Promise.all(promises)
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  const auth = req.headers.get('Authorization')
  const expectedAuth = `Bearer ${SERVICE_ROLE_KEY}`
  if (!auth || auth !== expectedAuth) {
    return new Response('Unauthorized', { status: 401, headers: corsHeaders })
  }

  let body: RequestBody
  try {
    body = await req.json()
  } catch {
    return new Response('Invalid JSON', { status: 400, headers: corsHeaders })
  }

  const { dossierId, templateData } = body
  if (!dossierId || typeof dossierId !== 'string') {
    return new Response('Missing or invalid dossierId', { status: 400, headers: corsHeaders })
  }

  try {
    await processTemplates(dossierId, templateData)
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error(error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
