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
    const { id, signature_base64 } = await req.json()

    if (!id) {
      throw new Error('id é obrigatório')
    }
    if (!signature_base64) {
      throw new Error('signature_base64 é obrigatório')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: item, error: itemError } = await supabase
      .from('estoque_itens_cliente')
      .select('*')
      .eq('id', id)
      .single()

    if (itemError || !item) {
      throw new Error('Item não encontrado')
    }

    const { data: empresa } = await supabase
      .from('empresa')
      .select('nome, logo_url')
      .limit(1)
      .single()

    const pdfDoc = await PDFDocument.create()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const page = pdfDoc.addPage([595.28, 841.89])
    const { width } = page.getSize()
    const margin = 50
    let y = 841.89 - margin

    // Logo (optional)
    let logoImage: any = null
    if (empresa?.logo_url) {
      try {
        const logoUrl = empresa.logo_url.startsWith('http')
          ? empresa.logo_url
          : `${supabaseUrl}/storage/v1/object/public/${empresa.logo_url}`
        const logoResp = await fetch(logoUrl)
        if (logoResp.ok) {
          const logoBytes = new Uint8Array(await logoResp.arrayBuffer())
          try {
            logoImage = await pdfDoc.embedPng(logoBytes)
          } catch {
            try {
              logoImage = await pdfDoc.embedJpg(logoBytes)
            } catch {
              logoImage = null
            }
          }
        }
      } catch {
        logoImage = null
      }
    }

    if (logoImage) {
      const logoMaxH = 60
      const logoMaxW = 180
      const scale = Math.min(logoMaxW / logoImage.width, logoMaxH / logoImage.height)
      page.drawImage(logoImage, {
        x: margin,
        y: y - logoImage.height * scale,
        width: logoImage.width * scale,
        height: logoImage.height * scale,
      })
      y -= logoImage.height * scale + 10
    } else if (empresa?.nome) {
      page.drawText(empresa.nome, {
        x: margin,
        y,
        size: 16,
        font: fontBold,
        color: rgb(0.1, 0.25, 0.45),
      })
      y -= 26
    }

    // Title
    page.drawText('COMPROVANTE DE ENTREGA DE ITEM', {
      x: margin,
      y,
      size: 18,
      font: fontBold,
      color: rgb(0.1, 0.25, 0.45),
    })
    y -= 10
    page.drawLine({
      start: { x: margin, y: y - 4 },
      end: { x: width - margin, y: y - 4 },
      thickness: 1.5,
      color: rgb(0.1, 0.25, 0.45),
    })
    y -= 34

    // Item Data
    page.drawText('DADOS DO ITEM', {
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

    const recebidoEm = item.recebido_em ? formatDateBR(new Date(item.recebido_em)) : '-'
    const entregueEm = item.entregue_em
      ? formatDateBR(new Date(item.entregue_em))
      : formatDateBR(new Date())
    const nomeRecebedor = item.recebedor_nome || '-'
    const cpfRecebedor = maskCpf(item.recebedor_cpf || '')

    const itemLines = [
      { label: 'Cliente:', value: item.cliente_nome || '-' },
      { label: 'Produto:', value: item.produto || '-' },
      { label: 'Recebido em:', value: recebidoEm },
    ]

    for (const line of itemLines) {
      page.drawText(line.label, {
        x: margin,
        y,
        size: 11,
        font: fontBold,
        color: rgb(0.3, 0.3, 0.3),
      })
      page.drawText(line.value, {
        x: margin + 120,
        y,
        size: 11,
        font,
        color: rgb(0.1, 0.1, 0.1),
      })
      y -= 22
    }
    y -= 10

    // Delivery Data
    page.drawText('DADOS DA ENTREGA', {
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

    const deliveryLines = [
      { label: 'Data de Entrega:', value: entregueEm },
      { label: 'Nome do Recebedor:', value: nomeRecebedor },
      { label: 'CPF do Recebedor:', value: cpfRecebedor },
    ]

    for (const line of deliveryLines) {
      page.drawText(line.label, {
        x: margin,
        y,
        size: 11,
        font: fontBold,
        color: rgb(0.3, 0.3, 0.3),
      })
      page.drawText(line.value, {
        x: margin + 150,
        y,
        size: 11,
        font,
        color: rgb(0.1, 0.1, 0.1),
      })
      y -= 22
    }
    y -= 20

    // Signature
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

    const sigMaxWidth = 300
    const sigMaxHeight = 120
    const sigScale = Math.min(sigMaxWidth / sigImage.width, sigMaxHeight / sigImage.height)
    const sigW = sigImage.width * sigScale
    const sigH = sigImage.height * sigScale

    page.drawImage(sigImage, { x: margin, y: y - sigH, width: sigW, height: sigH })
    y = y - sigH - 10
    page.drawLine({
      start: { x: margin, y },
      end: { x: margin + 300, y },
      thickness: 0.5,
      color: rgb(0.5, 0.5, 0.5),
    })
    y -= 16
    page.drawText(`Recebido em: ${entregueEm}`, {
      x: margin,
      y,
      size: 9,
      font,
      color: rgb(0.4, 0.4, 0.4),
    })

    const pdfBytes = await pdfDoc.save()

    const filePath = `comprovantes/${id}.pdf`
    const { error: uploadError } = await supabase.storage
      .from('comprovantes-itens-cliente')
      .upload(filePath, pdfBytes, { contentType: 'application/pdf', upsert: true })

    if (uploadError) throw uploadError

    const { data: urlData } = supabase.storage
      .from('comprovantes-itens-cliente')
      .getPublicUrl(filePath)

    const { error: updateError } = await supabase
      .from('estoque_itens_cliente')
      .update({ comprovante_url: filePath })
      .eq('id', id)

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
