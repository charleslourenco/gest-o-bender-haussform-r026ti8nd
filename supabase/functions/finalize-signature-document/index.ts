import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, x-supabase-client-platform, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { documento_id, cliente_id } = await req.json()

    if (!documento_id) {
      throw new Error('documento_id é obrigatório (deve ser o arquivo_url do documento)')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: assinaturas, error: sigError } = await supabase
      .from('assinaturas')
      .select('*')
      .eq('documento_id', documento_id)

    if (sigError) throw sigError

    const pendentesCount = assinaturas?.filter((sig) => sig.status === 'pendente').length || 0
    if (pendentesCount > 0 || !assinaturas?.length) {
      return new Response(
        JSON.stringify({ success: false, message: 'Aguardando demais assinaturas' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const { data: docCliente } = await supabase
      .from('documentos_cliente')
      .select('*')
      .eq('arquivo_url', documento_id)
      .single()

    const mergedPdf = await PDFDocument.create()
    const filePath = documento_id

    const { data: fileData, error: fileError } = await supabase.storage
      .from('bender_clientes')
      .download(filePath)

    if (fileError || !fileData) {
      throw new Error(`Erro ao baixar documento original: ${fileError?.message}`)
    }

    const originalPdfBytes = await fileData.arrayBuffer()
    const originalPdf = await PDFDocument.load(originalPdfBytes)
    const copiedPages = await mergedPdf.copyPages(originalPdf, originalPdf.getPageIndices())
    copiedPages.forEach((page) => mergedPdf.addPage(page))

    let certPage = mergedPdf.addPage([595.28, 841.89])
    const font = await mergedPdf.embedFont(StandardFonts.Helvetica)
    const boldFont = await mergedPdf.embedFont(StandardFonts.HelveticaBold)

    certPage.drawText('MANIFESTO DE ASSINATURA ELETRÔNICA', {
      x: 85,
      y: 760,
      size: 15,
      font: boldFont,
    })
    certPage.drawText(`Data de Conclusão: ${new Date().toLocaleString('pt-BR')}`, {
      x: 85,
      y: 740,
      size: 10,
      font,
    })

    let y = 700
    for (const sig of assinaturas || []) {
      if (y < 250) {
        certPage = mergedPdf.addPage([595.28, 841.89])
        y = 760
      }

      certPage.drawText(`Signatário: ${sig.signatario_nome} (${sig.signatario_tipo})`, {
        x: 85,
        y,
        size: 10,
        font: boldFont,
      })
      y -= 15
      certPage.drawText(
        `CPF/CNPJ: ${sig.signatario_cpf || 'N/A'} | E-mail: ${sig.signatario_email || 'N/A'}`,
        { x: 85, y, size: 10, font },
      )
      y -= 15
      certPage.drawText(
        `Data da Assinatura: ${sig.data_assinatura ? new Date(sig.data_assinatura).toLocaleString('pt-BR') : 'N/A'}`,
        { x: 85, y, size: 10, font },
      )
      y -= 15
      certPage.drawText(
        `IP: ${sig.ip_assinatura || 'N/A'} | Código de Confirmação: ${sig.codigo_confirmacao}`,
        { x: 85, y, size: 10, font },
      )

      if (sig.assinatura_imagem && sig.assinatura_imagem.startsWith('data:image/png;base64,')) {
        try {
          const base64Data = sig.assinatura_imagem.split(',')[1]
          const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0))
          const image = await mergedPdf.embedPng(imageBytes)
          certPage.drawImage(image, { x: 350, y: y - 10, width: 120, height: 60 })
        } catch (e) {
          console.error('Falha ao embutir imagem da assinatura', e)
        }
      }

      y -= 25

      certPage.drawLine({
        start: { x: 85, y: y + 10 },
        end: { x: 510, y: y + 10 },
        thickness: 0.5,
        color: rgb(0.5, 0.5, 0.5),
      })
      y -= 15
    }

    const pdfBytes = await mergedPdf.save()

    let nomeCliente = 'Cliente'
    if (cliente_id) {
      const { data: clienteData } = await supabase
        .from('clientes')
        .select('nome')
        .eq('id', cliente_id)
        .single()
      if (clienteData?.nome) nomeCliente = clienteData.nome
    }

    const safeNome = nomeCliente
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '_')
    const fileName = `${docCliente?.tipo || 'Documento'}_Assinado_${safeNome}.pdf`
    const finalFilePath = `contratos/${cliente_id}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('bender_clientes')
      .upload(finalFilePath, pdfBytes, { contentType: 'application/pdf', upsert: true })

    if (uploadError) throw uploadError

    if (docCliente) {
      await supabase
        .from('documentos_cliente')
        .update({
          arquivo_assinado_url: finalFilePath,
          status: 'Assinado',
        })
        .eq('id', docCliente.id)
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (RESEND_API_KEY) {
      const { data: urlData } = await supabase.storage
        .from('bender_clientes')
        .createSignedUrl(finalFilePath, 315360000)
      const signedUrl = urlData?.signedUrl || ''

      for (const sig of assinaturas || []) {
        if (sig.signatario_email) {
          try {
            await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: 'Bender Haussform <projetos@benderhaussform.com>',
                to: [sig.signatario_email],
                subject: `Documento Assinado Finalizado: ${sig.documento_nome}`,
                html: `
                  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
                    <h2 style="color: #333;">Olá, ${sig.signatario_nome}</h2>
                    <p style="color: #555; line-height: 1.5;">O processo de assinatura do documento <strong>${sig.documento_nome}</strong> foi concluído com sucesso.</p>
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="${signedUrl}" style="background-color: #000; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Baixar Documento Final</a>
                    </div>
                  </div>
                `,
              }),
            })
          } catch (emailErr) {}
        }
      }
    }

    return new Response(JSON.stringify({ success: true, url: finalFilePath }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
