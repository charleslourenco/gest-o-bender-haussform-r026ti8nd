import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'https://esm.sh/docx'

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

    // Generate DOCX
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: 'Contrato Bender Haussform',
                  bold: true,
                  size: 32,
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              children: [new TextRun(`Cliente: ${cliente}`)],
            }),
            new Paragraph({
              children: [new TextRun(`Valor: R$ ${valor}`)],
            }),
            new Paragraph({
              children: [new TextRun(`Vendedor: ${vendedor}`)],
            }),
            new Paragraph({
              children: [new TextRun(`Data: ${data}`)],
            }),
            new Paragraph({
              children: [new TextRun('Assinatura do Cliente: _______________________')],
              alignment: AlignmentType.RIGHT,
            }),
            new Paragraph({
              children: [new TextRun('Assinatura do Vendedor: _______________________')],
              alignment: AlignmentType.RIGHT,
            }),
          ],
        },
      ],
    })

    const docBuffer = await Packer.toBuffer(doc)

    // Sanitize filename
    const safeCliente = cliente.replace(/[^a-zA-Z0-9]/g, '_')
    const safeData = data.replace(/[^a-zA-Z0-9]/g, '_')
    const filename = `contrato-${safeCliente}-${safeData}.docx`

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('bender_clientes')
      .upload(filename, docBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: true,
      })

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`)
    }

    const { data: urlData } = supabase.storage.from('bender_clientes').getPublicUrl(filename)
    const publicUrl = urlData.publicUrl

    // Insert into assinaturas
    const { error: assError } = await supabase.from('assinaturas').insert({
      cliente,
      documento_url: publicUrl,
      valor: typeof valor === 'string' ? parseFloat(valor.replace(',', '.')) : valor,
      vendedor,
      data: new Date(data),
      status: 'pendente',
    })

    if (assError) {
      throw new Error(`Insert assinaturas failed: ${assError.message}`)
    }

    // Insert into timeline_eventos
    const { error: timelineError } = await supabase.from('timeline_eventos').insert({
      cliente_id: cliente,
      acao: `Contrato gerado e salvo: ${publicUrl}`,
      usuario_nome: vendedor,
    })

    if (timelineError) {
      throw new Error(`Insert timeline_eventos failed: ${timelineError.message}`)
    }

    return new Response(JSON.stringify({ success: true, documento_url: publicUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error(error)
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
