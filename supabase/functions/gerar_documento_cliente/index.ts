import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
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

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const body = await req.json()
    const { dossierId, templateData } = body

    const sourceBucket = 'bender_templates'
    const destBucket = 'dossiers'
    const files = [
      'Contrato.docx',
      'Termo de Alteracao.docx',
      'Termo de Conclusao e Vistoria.docx',
      'Termo de Garantia.docx',
      'Termo de N Conformidade.docx',
      'Termo de Recusa.docx',
      'Termo de Representacao.docx',
    ]

    const cleanPlaceholders = (xmlContent: string): string => {
      let content = xmlContent

      content = content.replace(/\{\{(.*?)\}\}/gs, (match: string, inner: string) => {
        let cleanedInner = inner
          .replace(/<[^>]*>/g, '')
          .replace(/<\/[^>]*>/g, '')
          .replace(/&lt;[^&gt;]*&gt;/g, '')
          .replace(/&[^;]+;/g, (entity: string) => {
            if (entity.match(/^&(?:lt|gt|amp|#x?)/i)) return ''
            return entity
          })
          .trim()
        return `{{${cleanedInner}}}`
      })

      if (templateData) {
        for (const [key, value] of Object.entries(templateData)) {
          const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
          content = content.replace(regex, String(value))
        }
      }

      return content
    }

    const processTemplate = async (fileName: string) => {
      const { data, error: downloadError } = await supabase.storage
        .from(sourceBucket)
        .download(fileName)

      if (downloadError) {
        console.warn(`File ${fileName} not found, skipping...`)
        return
      }

      const buffer = await data!.arrayBuffer()
      const zip = await JSZip.loadAsync(buffer)

      for (const relPath in zip.files) {
        const entry = zip.files[relPath]
        if (entry.dir || !relPath.match(/\.xml$/i)) continue

        let content = await entry.async('text')
        content = cleanPlaceholders(content)
        zip.file(relPath, content)
      }

      const processedBuffer = await zip.generateAsync({ type: 'uint8array' })

      const destPath = dossierId ? `${dossierId}/${fileName}` : fileName

      const { error: uploadError } = await supabase.storage
        .from(destBucket)
        .upload(destPath, processedBuffer, {
          contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          upsert: true,
        })
      if (uploadError) throw uploadError
    }

    for (const fileName of files) {
      await processTemplate(fileName)
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: (error as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
