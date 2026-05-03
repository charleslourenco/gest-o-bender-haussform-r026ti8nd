import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } from 'npm:docx@8.5.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve({
  fetch: async (req: Request) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders })
    }

    try {
      const body = (await req.json()) as any

      // Validate required fields
      const requiredFields = [
        'cliente_id',
        'signatario_tipo',
        'signatario_nome',
        'signatario_email',
        'cliente',
        'valor',
        'vendedor',
      ]
      for (const field of requiredFields) {
        if (!body[field]) {
          throw new Error(`Missing required field: ${field}`)
        }
      }

      const data = {
        ...body,
        data: body.data || new Date().toLocaleDateString('pt-BR'),
      }

      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })

      const documento_id = crypto.randomUUID()
      const documento_nome = `Contrato Bender Haussform - ${data.cliente}.docx`
      const codigo_confirmacao = Math.floor(100000 + Math.random() * 900000)
        .toString()
        .padStart(6, '0')
      const expira_em = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

      // Generate DOCX document
      const doc = new Document({
        sections: [
          {
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                heading: HeadingLevel.HEADING_1,
                children: [
                  new TextRun({
                    text: 'CONTRATO BENDER HAUSSFORM',
                    bold: true,
                    size: 32,
                  }),
                ],
              }),
              new Paragraph({
                children: [new TextRun(`Cliente: ${data.cliente}`)],
              }),
              new Paragraph({
                children: [new TextRun(`Tipo de Signatário: ${data.signatario_tipo}`)],
              }),
              new Paragraph({
                children: [new TextRun(`Signatário: ${data.signatario_nome}`)],
              }),
              new Paragraph({
                children: [new TextRun(`Email: ${data.signatario_email}`)],
              }),
              new Paragraph({
                children: [new TextRun(`Valor: R$ ${data.valor}`)],
              }),
              new Paragraph({
                children: [new TextRun(`Vendedor: ${data.vendedor}`)],
              }),
              new Paragraph({
                children: [new TextRun(`Data: ${data.data}`)],
              }),
              new Paragraph({
                children: [
                  new TextRun(
                    'Assinatura do Cliente: ___________________________ Data: __________',
                  ),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun(
                    'Assinatura do Vendedor: ___________________________ Data: __________',
                  ),
                ],
              }),
            ],
          },
        ],
      })

      const blob = await Packer.toBlob(doc)
      const buffer = new Uint8Array(await blob.arrayBuffer())

      // Upload to Storage
      const filePath = `contratos/${documento_id}.docx`
      const { error: uploadError } = await supabase.storage
        .from('dossiers')
        .upload(filePath, buffer, {
          contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          upsert: true,
        })

      if (uploadError) throw uploadError

      // Insert into assinaturas table
      const { data: assinatura, error: insertError } = await supabase
        .from('assinaturas')
        .insert({
          documento_id,
          documento_nome,
          cliente_id: data.cliente_id,
          signatario_tipo: data.signatario_tipo,
          signatario_nome: data.signatario_nome,
          signatario_email: data.signatario_email,
          codigo_confirmacao,
          status: 'pendente',
          expira_em,
        })
        .select('id')
        .single()

      if (insertError) throw insertError

      return new Response(JSON.stringify({ success: true, assinatura_id: assinatura!.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } catch (error: any) {
      console.error('Error:', error)
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  },
})
