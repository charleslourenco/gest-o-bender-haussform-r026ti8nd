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

    const allAssinados = assinaturas?.every((sig) => sig.status === 'assinado')
    if (!allAssinados) {
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

    // 1. Corrigir o Caminho do Bucket (Busca inteligente)
    let originalPdfBytes: ArrayBuffer | null = null

    try {
      let bucketName = 'bender_clientes'
      let filePath = documento_id

      if (documento_id.startsWith('http')) {
        const match = documento_id.match(
          /\/storage\/v1\/object\/(?:public|sign)\/([^\/]+)\/(.+?)(?:\?|$)/,
        )
        if (match) {
          bucketName = match[1]
          filePath = decodeURIComponent(match[2])
        } else {
          // Fallback para URL externa
          const res = await fetch(documento_id)
          if (res.ok) originalPdfBytes = await res.arrayBuffer()
        }
      }

      if (!originalPdfBytes && filePath) {
        // Tenta baixar do bucket extraído
        const { data: fileData, error: fileError } = await supabase.storage
          .from(bucketName)
          .download(filePath)
        if (fileData && !fileError) {
          originalPdfBytes = await fileData.arrayBuffer()
        } else {
          // Fallbacks de compatibilidade com arquivos antigos
          const { data: benderData } = await supabase.storage
            .from('bender_clientes')
            .download(filePath)
          if (benderData) {
            originalPdfBytes = await benderData.arrayBuffer()
          } else {
            const { data: dossierData } = await supabase.storage.from('dossiers').download(filePath)
            if (dossierData) {
              originalPdfBytes = await dossierData.arrayBuffer()
            } else if (cliente_id) {
              const { data: contratoData } = await supabase.storage
                .from('bender_clientes')
                .download(`contratos/${cliente_id}/${filePath}`)
              if (contratoData) {
                originalPdfBytes = await contratoData.arrayBuffer()
              }
            }
          }
        }
      }

      if (originalPdfBytes) {
        // 2. Mesclagem Nativa: Tenta carregar o PDF Original
        const originalPdf = await PDFDocument.load(originalPdfBytes)
        // Garante a ordem: primeiro o corpo completo do contrato com todos os dados comerciais
        const copiedPages = await mergedPdf.copyPages(originalPdf, originalPdf.getPageIndices())
        copiedPages.forEach((page) => mergedPdf.addPage(page))
      } else {
        throw new Error('Não foi possível encontrar o arquivo original no storage')
      }
    } catch (fetchErr) {
      console.error('Error fetching or loading original document:', fetchErr)
      const page = mergedPdf.addPage([595.28, 841.89])
      const font = await mergedPdf.embedFont(StandardFonts.HelveticaBold)
      const normalFont = await mergedPdf.embedFont(StandardFonts.Helvetica)
      page.drawText('Documento Assinado', { x: 50, y: 800, size: 20, font })
      page.drawText(`Original: ${docCliente?.template_nome || documento_id}`, {
        x: 50,
        y: 770,
        size: 12,
        font: normalFont,
      })
      page.drawText('Não foi possível anexar o conteúdo original.', {
        x: 50,
        y: 750,
        size: 10,
        font: normalFont,
      })
    }

    // Criação do Manifesto (Adicionado APÓS as páginas originais, garantindo a ordem solicitada)
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

    // Busca nome do cliente para padronizar o nome do arquivo
    let nomeCliente = 'Cliente'
    if (cliente_id) {
      const { data: clienteData } = await supabase
        .from('clientes')
        .select('nome')
        .eq('id', cliente_id)
        .single()
      if (clienteData?.nome) {
        nomeCliente = clienteData.nome
      }
    }

    const safeNome = nomeCliente
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '_')

    let baseName = 'Contrato'
    if (
      docCliente &&
      docCliente.tipo !== 'Contrato' &&
      docCliente.template_nome &&
      !docCliente.template_nome.toLowerCase().includes('contrato')
    ) {
      baseName = docCliente.template_nome.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9]/g, '_')
    }

    const fileName = `${baseName}_Assinado_${safeNome}.pdf`
    const filePath = `assinados/${cliente_id || 'avulso'}/${fileName}`

    // 3. Alinhamento de Armazenamento (Salvando no bender_clientes)
    const { error: uploadError } = await supabase.storage
      .from('bender_clientes')
      .upload(filePath, pdfBytes, { contentType: 'application/pdf', upsert: true })

    if (uploadError) throw uploadError

    const { data: publicUrlData, error: signError } = await supabase.storage
      .from('bender_clientes')
      .createSignedUrl(filePath, 315360000)
    const arquivo_assinado_url = publicUrlData?.signedUrl || ''

    if (signError) {
      console.error('Sign URL error:', signError)
    }

    if (docCliente) {
      await supabase
        .from('documentos_cliente')
        .update({
          arquivo_assinado_url,
          status: 'Assinado',
        })
        .eq('id', docCliente.id)

      if (docCliente.tipo === 'Contrato') {
        await supabase
          .from('dossies')
          .update({ contrato_url: arquivo_assinado_url })
          .eq('cliente_id', cliente_id)
      }
    } else {
      await supabase
        .from('documentos_cliente')
        .update({
          arquivo_assinado_url,
          status: 'Assinado',
        })
        .eq('arquivo_url', documento_id)
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (RESEND_API_KEY) {
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
                subject: `Documento Assinado e Finalizado: ${sig.documento_nome}`,
                text: `Olá, ${sig.signatario_nome}. O documento ${sig.documento_nome} foi assinado por todos os envolvidos. Você pode baixar a via finalizada no link: ${arquivo_assinado_url}`,
                html: `
                  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
                    <h2 style="color: #333;">Olá, ${sig.signatario_nome}</h2>
                    <p style="color: #555; line-height: 1.5;">O processo de assinatura do documento <strong>${sig.documento_nome}</strong> foi concluído com sucesso por todos os signatários.</p>
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="${arquivo_assinado_url}" style="background-color: #000; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Baixar Documento Final</a>
                    </div>
                    <p style="font-size: 12px; color: #999; text-align: center; margin-top: 40px;">Bender Haussform</p>
                  </div>
                `,
              }),
            })
          } catch (emailErr) {
            console.error('Failed to send email to', sig.signatario_email, emailErr)
          }
        }
      }
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
