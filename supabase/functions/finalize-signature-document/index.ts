import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { documento_id, cliente_id } = await req.json()

    if (!documento_id) {
      throw new Error('documento_id é obrigatório')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: assinaturas, error: sigError } = await supabase
      .from('assinaturas')
      .select('*')
      .eq('documento_id', documento_id)

    if (sigError) throw sigError

    const { data: docCliente } = await supabase
      .from('documentos_cliente')
      .select('*')
      .eq('arquivo_url', documento_id)
      .single()

    const mergedPdf = await PDFDocument.create()

    let addedOriginal = false
    try {
      const res = await fetch(documento_id)
      if (res.ok) {
        const originalPdfBytes = await res.arrayBuffer()
        try {
          const originalPdf = await PDFDocument.load(originalPdfBytes)
          const copiedPages = await mergedPdf.copyPages(originalPdf, originalPdf.getPageIndices())
          copiedPages.forEach((page) => mergedPdf.addPage(page))
          addedOriginal = true
        } catch (pdfErr) {
          console.error('Document is not a valid PDF, probably DOCX.')
        }
      }
    } catch (fetchErr) {
      console.error('Error fetching original document:', fetchErr)
    }

    if (!addedOriginal) {
      const page = mergedPdf.addPage([595.28, 841.89])
      const font = await mergedPdf.embedFont(StandardFonts.HelveticaBold)
      const normalFont = await mergedPdf.embedFont(StandardFonts.Helvetica)
      page.drawText('Documento Assinado', { x: 50, y: 800, size: 20, font })
      page.drawText(`Original: ${docCliente?.template_nome || 'Documento Word'}`, {
        x: 50,
        y: 770,
        size: 12,
        font: normalFont,
      })
      page.drawText('O documento original encontra-se anexado ao sistema em formato editável.', {
        x: 50,
        y: 750,
        size: 10,
        font: normalFont,
      })
      page.drawText('Este arquivo contém os certificados de assinatura com validade jurídica.', {
        x: 50,
        y: 735,
        size: 10,
        font: normalFont,
      })
    }

    let certPage = mergedPdf.addPage([595.28, 841.89])
    const font = await mergedPdf.embedFont(StandardFonts.Helvetica)
    const boldFont = await mergedPdf.embedFont(StandardFonts.HelveticaBold)

    certPage.drawText('MANIFESTO DE ASSINATURA ELETRÔNICA', {
      x: 50,
      y: 800,
      size: 16,
      font: boldFont,
    })
    certPage.drawText(`Data de Conclusão: ${new Date().toLocaleString('pt-BR')}`, {
      x: 50,
      y: 780,
      size: 10,
      font,
    })

    let y = 740
    for (const sig of assinaturas || []) {
      if (y < 200) {
        certPage = mergedPdf.addPage([595.28, 841.89])
        y = 800
      }

      certPage.drawText(`Signatário: ${sig.signatario_nome} (${sig.signatario_tipo})`, {
        x: 50,
        y,
        size: 12,
        font: boldFont,
      })
      y -= 20
      certPage.drawText(
        `CPF: ${sig.signatario_cpf || 'N/A'} | E-mail: ${sig.signatario_email || 'N/A'}`,
        { x: 50, y, size: 10, font },
      )
      y -= 15
      certPage.drawText(
        `Data da Assinatura: ${sig.data_assinatura ? new Date(sig.data_assinatura).toLocaleString('pt-BR') : 'N/A'}`,
        { x: 50, y, size: 10, font },
      )
      y -= 15
      certPage.drawText(`IP: ${sig.ip_assinatura || 'N/A'}`, { x: 50, y, size: 10, font })
      y -= 15
      certPage.drawText(`Código: ${sig.codigo_confirmacao}`, { x: 50, y, size: 10, font })
      y -= 20

      if (sig.assinatura_imagem && sig.assinatura_imagem.startsWith('data:image/png;base64,')) {
        try {
          const base64Data = sig.assinatura_imagem.replace('data:image/png;base64,', '')
          const binaryString = atob(base64Data)
          const len = binaryString.length
          const bytes = new Uint8Array(len)
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i)
          }
          const image = await mergedPdf.embedPng(bytes)
          const dims = image.scale(0.3)
          certPage.drawImage(image, {
            x: 50,
            y: y - dims.height,
            width: dims.width,
            height: dims.height,
          })
          y -= dims.height + 20
        } catch (e) {
          console.error('Error embedding image', e)
          certPage.drawText('[Imagem da Assinatura Indisponível]', {
            x: 50,
            y,
            size: 10,
            font: rgb(1, 0, 0),
          })
          y -= 20
        }
      } else {
        y -= 10
      }

      certPage.drawLine({
        start: { x: 50, y: y + 10 },
        end: { x: 545, y: y + 10 },
        thickness: 1,
        color: rgb(0.8, 0.8, 0.8),
      })
      y -= 10
    }

    const pdfBytes = await mergedPdf.save()
    const safeDocName = (docCliente?.template_nome || 'documento').replace(/[^a-zA-Z0-9]/g, '_')
    const fileName = `${safeDocName}_Assinado_${Date.now()}.pdf`
    const filePath = `assinados/${cliente_id || 'avulso'}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('dossiers')
      .upload(filePath, pdfBytes, { contentType: 'application/pdf', upsert: true })

    if (uploadError) throw uploadError

    const { data: publicUrlData } = supabase.storage.from('dossiers').getPublicUrl(filePath)
    const arquivo_assinado_url = publicUrlData.publicUrl

    await supabase
      .from('documentos_cliente')
      .update({
        arquivo_assinado_url,
        status: 'Assinado',
      })
      .eq('arquivo_url', documento_id)

    if (docCliente?.tipo === 'Contrato') {
      await supabase
        .from('dossies')
        .update({ contrato_url: arquivo_assinado_url })
        .eq('cliente_id', docCliente.cliente_id)
    }

    return new Response(JSON.stringify({ success: true, url: arquivo_assinado_url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('Finalize Signature Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
