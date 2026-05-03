export interface Env {
  bender_templates: R2Bucket
  dossiers: R2Bucket
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\\]]/g, '\\$&')
}

async function processDocx(
  templateBuffer: ArrayBuffer,
  replacements: Record<string, string>,
): Promise<ArrayBuffer> {
  let content = new TextDecoder('utf-8').decode(templateBuffer)
  for (const [key, value] of Object.entries(replacements)) {
    const placeholder = `{{${key}}}`
    const regex = new RegExp(escapeRegExp(placeholder), 'g')
    content = content.replace(regex, value)
  }
  return new TextEncoder().encode(content)
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }

    let body
    try {
      body = await request.json<{ replacements: Record<string, string> }>()
    } catch (e) {
      return new Response('Invalid JSON body', { status: 400 })
    }

    const { replacements } = body
    if (!replacements || typeof replacements !== 'object') {
      return new Response('Missing or invalid replacements', { status: 400 })
    }

    const dossierId = crypto.randomUUID()
    const templateNames: string[] = [
      '1.docx',
      '2.docx',
      '3.docx',
      '4.docx',
      '5.docx',
      '6.docx',
      '7.docx',
    ]

    try {
      await Promise.all(
        templateNames.map(async (name) => {
          const obj = await env.bender_templates.get(name)
          if (!obj || !obj.body) {
            throw new Error(`Template not found: ${name}`)
          }
          const templateBuffer = await obj.arrayBuffer()
          const processedBuffer = await processDocx(templateBuffer, replacements)
          await env.dossiers.put(`${dossierId}_${name}`, processedBuffer, {
            httpMetadata: {
              contentType:
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            },
          })
        }),
      )
      return Response.json({ success: true })
    } catch (error: any) {
      console.error('Error processing documents:', error)
      return Response.json({ success: false, error: error.message }, { status: 500 })
    }
  },
}
