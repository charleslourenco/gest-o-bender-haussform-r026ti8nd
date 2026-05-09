import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { PDFDocument, StandardFonts } from 'https://esm.sh/pdf-lib@1.17.1'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      throw new Error('Only POST requests are allowed')
    }

    const body = await req.json()
    const { cliente, valor, vendedor, data } = body

    if (!cliente || !valor || !vendedor || !data) {
      throw new Error('Missing required fields: cliente, valor, vendedor, data')
    }

    // Gerar e salvar diretamente em formato PDF (Padronização da Geração)
    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([595.28, 841.89]) // A4 size
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    page.drawText('Contrato Bender Haussform', { x: 150, y: 780, size: 24, font: boldFont })
    page.drawText(`Cliente: ${cliente}`, { x: 50, y: 730, size: 12, font })
    page.drawText(`Valor: R$ ${valor}`, { x: 50, y: 710, size: 12, font })
    page.drawText(`Vendedor: ${vendedor}`, { x: 50, y: 690, size: 12, font })
    page.drawText(`Data: ${data}`, { x: 50, y: 670, size: 12, font })

    page.drawText('Assinatura do Cliente: _______________________', {
      x: 250,
      y: 600,
      size: 12,
      font,
    })
    page.drawText('Assinatura do Vendedor: _______________________', {
      x: 250,
      y: 550,
      size: 12,
      font,
    })

    const pdfBytes = await pdfDoc.save()

    // Sanitize filename
    const safeCliente = cliente.replace(/[^a-zA-Z0-9]/g, '_')
    const safeData = data.replace(/[^a-zA-Z0-9]/g, '_')
    const filename = `contrato-${safeCliente}-${safeData}.pdf`

    // Upload to storage bender_clientes (Alinhamento do Bucket)
    const { error: uploadError } = await supabase.storage
      .from('bender_clientes')
      .upload(filename, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`)
    }

    const { data: urlData } = supabase.storage.from('bender_clientes').getPublicUrl(filename)
    const publicUrl = urlData.publicUrl

    // Insert into timeline_eventos
    const { error: timelineError } = await supabase.from('timeline_eventos').insert({
      cliente_id: cliente.length === 36 ? cliente : null, // Try to handle uuid
      acao: `Contrato gerado e salvo: ${publicUrl}`,
      usuario_nome: vendedor,
    })

    if (timelineError) {
      console.warn(`Insert timeline_eventos failed: ${timelineError.message}`)
    }

    return new Response(JSON.stringify({ success: true, documento_url: publicUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    console.error(error)
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
