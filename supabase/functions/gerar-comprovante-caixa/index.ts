import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, x-supabase-client-platform, apikey, content-type',
}

function maskCpf(value: string): string {
  const digits = (value || '').replace(/\D/g, '').slice(0, 11)
  if (digits.length !== 11) return value || ''
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`
}

function formatDateBR(date: Date) {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { caixa_id, signature_base64, recebedor_nome, recebedor_cpf } = await req.json()

    if (!caixa_id || !signature_base64) {
      throw new Error('caixa_id e signature_base64 são obrigatórios')
    }
    if (!recebedor_nome || !recebedor_cpf) {
      throw new Error('recebedor_nome e recebedor_cpf são obrigatórios')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: caixa, error: caixaError } = await supabase
      .from('estoque_caixas')
      .select(
        '*, cliente:clientes(nome), projeto:formulario_comercial(id), itens:estoque_caixas_itens(*, item:estoque_itens(nome, unidade))',
      )
      .eq('id', caixa_id)
      .single()

    if (caixaError || !caixa) {
      throw new Error('Caixa não encontrada')
    }

    const pdfDoc = await PDFDocument.create()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    let page = pdfDoc.addPage([595.28, 841.89])
    const { width } = page.getSize()
    const margin = 50
    let y = 841.89 - margin

    const drawOnPage = (drawFn: (p: typeof page, yPos: number) => number) => {
      y = drawFn(page, y)
    }

    drawOnPage((p, yPos) => {
      p.drawText('COMPROVANTE DE RECEBIMENTO', {
        x: margin,
        y: yPos,
        size: 18,
        font: fontBold,
        color: rgb(0.1, 0.25, 0.45),
      })
      yPos -= 10
      p.drawLine({
        start: { x: margin, y: yPos - 4 },
        end: { x: width - margin, y: yPos - 4 },
        thickness: 1.5,
        color: rgb(0.1, 0.25, 0.45),
      })
      return yPos - 30
    })

    const clienteNome = (caixa.cliente as any)?.nome || 'Não informado'
    const projetoId = (caixa.projeto as any)?.id
      ? String((caixa.projeto as any).id)
          .substring(0, 8)
          .toUpperCase()
      : 'N/A'
    const dataRecebimento = formatDateBR(new Date())
    const nomeRecebedor = recebedor_nome
    const cpfRecebedor = maskCpf(recebedor_cpf)

    const infoLines = [
      { label: 'Caixa:', value: caixa.nome || 'N/A' },
      { label: 'Cliente:', value: clienteNome },
      { label: 'Projeto:', value: projetoId },
      { label: 'Data/Hora:', value: dataRecebimento },
    ]

    drawOnPage((p, yPos) => {
      for (const line of infoLines) {
        p.drawText(line.label, {
          x: margin,
          y: yPos,
          size: 11,
          font: fontBold,
          color: rgb(0.3, 0.3, 0.3),
        })
        p.drawText(line.value, {
          x: margin + 100,
          y: yPos,
          size: 11,
          font,
          color: rgb(0.1, 0.1, 0.1),
        })
        yPos -= 22
      }
      return yPos - 10
    })

    drawOnPage((p, yPos) => {
      p.drawText('ITENS ENTREGUES', {
        x: margin,
        y: yPos,
        size: 13,
        font: fontBold,
        color: rgb(0.1, 0.25, 0.45),
      })
      yPos -= 12
      p.drawLine({
        start: { x: margin, y: yPos },
        end: { x: width - margin, y: yPos },
        thickness: 0.8,
        color: rgb(0.6, 0.6, 0.6),
      })
      return yPos - 18
    })

    const colItem = margin
    const colQtd = width - margin - 120
    const colUn = width - margin - 50

    drawOnPage((p, yPos) => {
      p.drawText('Item', { x: colItem, y: yPos, size: 10, font: fontBold })
      p.drawText('Qtd', { x: colQtd, y: yPos, size: 10, font: fontBold })
      p.drawText('Un', { x: colUn, y: yPos, size: 10, font: fontBold })
      yPos -= 14
      p.drawLine({
        start: { x: margin, y: yPos },
        end: { x: width - margin, y: yPos },
        thickness: 0.4,
        color: rgb(0.8, 0.8, 0.8),
      })
      return yPos - 18
    })

    const itens = caixa.itens || []
    for (const item of itens) {
      if (y < 150) {
        page = pdfDoc.addPage([595.28, 841.89])
        y = 841.89 - margin
      }
      const nome = item.item?.nome || 'Item removido'
      const qtd = String(item.quantidade ?? 0)
      const un = item.item?.unidade || 'un'
      const truncatedName = nome.length > 60 ? nome.substring(0, 57) + '...' : nome
      page.drawText(truncatedName, { x: colItem, y, size: 10, font })
      page.drawText(qtd, { x: colQtd, y, size: 10, font })
      page.drawText(un, { x: colUn, y, size: 10, font })
      y -= 16
    }

    y -= 20
    if (y < 280) {
      page = pdfDoc.addPage([595.28, 841.89])
      y = 841.89 - margin
    }

    page.drawText('DADOS DO RECEBEDOR', {
      x: margin,
      y,
      size: 13,
      font: fontBold,
      color: rgb(0.1, 0.25, 0.45),
    })
    y -= 12
    page.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 0.8,
      color: rgb(0.6, 0.6, 0.6),
    })
    y -= 22

    page.drawText('Nome:', { x: margin, y, size: 11, font: fontBold, color: rgb(0.3, 0.3, 0.3) })
    page.drawText(nomeRecebedor, { x: margin + 80, y, size: 11, font, color: rgb(0.1, 0.1, 0.1) })
    y -= 20
    page.drawText('CPF:', { x: margin, y, size: 11, font: fontBold, color: rgb(0.3, 0.3, 0.3) })
    page.drawText(cpfRecebedor, { x: margin + 80, y, size: 11, font, color: rgb(0.1, 0.1, 0.1) })
    y -= 30

    if (y < 200) {
      page = pdfDoc.addPage([595.28, 841.89])
      y = 841.89 - margin
    }

    page.drawText('ASSINATURA DO RECEBEDOR', {
      x: margin,
      y,
      size: 12,
      font: fontBold,
      color: rgb(0.1, 0.25, 0.45),
    })
    y -= 12
    page.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 0.8,
      color: rgb(0.6, 0.6, 0.6),
    })
    y -= 20

    let sigBase64 = signature_base64
    if (sigBase64.includes(',')) {
      sigBase64 = sigBase64.split(',')[1]
    }
    const sigBinary = atob(sigBase64)
    const sigBytes = new Uint8Array(sigBinary.length)
    for (let i = 0; i < sigBinary.length; i++) {
      sigBytes[i] = sigBinary.charCodeAt(i)
    }

    let sigImage
    try {
      sigImage = await pdfDoc.embedPng(sigBytes)
    } catch {
      sigImage = await pdfDoc.embedJpg(sigBytes)
    }

    const sigMaxWidth = 280
    const sigMaxHeight = 110
    const sigScale = Math.min(sigMaxWidth / sigImage.width, sigMaxHeight / sigImage.height)
    const sigW = sigImage.width * sigScale
    const sigH = sigImage.height * sigScale

    page.drawImage(sigImage, { x: margin, y: y - sigH, width: sigW, height: sigH })
    y = y - sigH - 10
    page.drawLine({
      start: { x: margin, y },
      end: { x: margin + 280, y },
      thickness: 0.5,
      color: rgb(0.5, 0.5, 0.5),
    })
    y -= 14
    page.drawText(`Recebido em: ${dataRecebimento}`, {
      x: margin,
      y,
      size: 9,
      font,
      color: rgb(0.4, 0.4, 0.4),
    })

    const pdfBytes = await pdfDoc.save()

    const filePath = `comprovantes/${caixa_id}.pdf`
    const { error: uploadError } = await supabase.storage
      .from('comprovantes-caixas')
      .upload(filePath, pdfBytes, { contentType: 'application/pdf', upsert: true })

    if (uploadError) throw uploadError

    const { data: urlData } = supabase.storage.from('comprovantes-caixas').getPublicUrl(filePath)

    const { error: updateError } = await supabase
      .from('estoque_caixas')
      .update({
        comprovante_url: filePath,
        assinado_em: new Date().toISOString(),
        status: 'entregue',
        recebedor_nome: nomeRecebedor,
        recebedor_cpf: recebedor_cpf,
      })
      .eq('id', caixa_id)

    if (updateError) throw updateError

    return new Response(JSON.stringify({ success: true, url: urlData.publicUrl, path: filePath }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
