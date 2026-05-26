import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { PDFDocument, StandardFonts } from 'npm:pdf-lib@1.17.1'
import { corsHeaders } from '../_shared/cors.ts'

async function handleGenerateOrcamento(req: Request, body: any) {
  const { orcamento_id, format } = body

  const authHeader = req.headers.get('Authorization')
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader! } } },
  )

  const { data: orc, error: orcErr } = await supabase
    .from('orcamentos')
    .select(`*, cliente:clientes(nome, endereco_obra, rua, numero, bairro, cidade, estado, cep)`)
    .eq('id', orcamento_id)
    .single()

  if (orcErr || !orc) throw new Error('Orçamento não encontrado')

  const { data: itens, error: itensErr } = await supabase
    .from('itens_orcamento')
    .select(`quantidade, preco_venda, estoque_item:estoque_itens(nome, unidade)`)
    .eq('orcamento_id', orcamento_id)

  const itemsList = itens || []

  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  let page = pdfDoc.addPage([595.28, 841.89])
  let y = 800
  const margin = 40
  const pageWidth = 595.28

  let logoBytes: Uint8Array | null = null
  try {
    const { data: logoData } = await supabase.storage.from('bender_templates').download('logo.png')
    if (logoData) {
      logoBytes = new Uint8Array(await logoData.arrayBuffer())
    }
  } catch (e) {}

  if (logoBytes) {
    try {
      const image = await pdfDoc.embedPng(logoBytes)
      const scale = 100 / image.width
      page.drawImage(image, { x: margin, y: y - 30, width: 100, height: image.height * scale })
    } catch (e) {}
  }

  y -= 50

  page.drawText('ORÇAMENTO', { x: margin, y, size: 18, font: fontBold })
  y -= 15
  page.drawText(`ID: ${orcamento_id.substring(0, 8).toUpperCase()}`, {
    x: margin,
    y,
    size: 10,
    font,
  })
  page.drawText(`Data: ${new Date().toLocaleDateString('pt-BR')}`, {
    x: margin + 150,
    y,
    size: 10,
    font,
  })
  y -= 30

  const cliente = Array.isArray(orc.cliente) ? orc.cliente[0] : orc.cliente
  const clienteNome = cliente?.nome || 'Cliente não informado'
  const enderecoBruto = cliente
    ? `${cliente.rua || cliente.endereco_obra || ''}, ${cliente.numero || ''} - ${cliente.bairro || ''}, ${cliente.cidade || ''}/${cliente.estado || ''}`
    : ''
  const endereco = enderecoBruto.replace(/^[,\s]+|[,\s]+$/g, '').replace(/,\s*,/g, ',')

  page.drawText(`Cliente: ${clienteNome}`, { x: margin, y, size: 12, font: fontBold })
  y -= 15
  if (endereco && endereco !== '-') {
    page.drawText(`Endereço: ${endereco}`, { x: margin, y, size: 10, font })
    y -= 15
  }
  page.drawText(`Ambiente: ${orc.ambiente || 'Não especificado'}`, { x: margin, y, size: 10, font })
  y -= 30

  let subtotal = 0

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val)
  }

  if (format === 'detailed') {
    const cols = [
      { title: 'Item', x: margin, w: 200 },
      { title: 'Qtd', x: margin + 230, w: 50 },
      { title: 'Un', x: margin + 280, w: 40 },
      { title: 'P. Unit (R$)', x: margin + 330, w: 80 },
      { title: 'Total (R$)', x: margin + 430, w: 80 },
    ]

    cols.forEach((c) => page.drawText(c.title, { x: c.x, y, size: 10, font: fontBold }))
    y -= 10
    page.drawLine({ start: { x: margin, y }, end: { x: pageWidth - margin, y }, thickness: 1 })
    y -= 15

    for (const item of itemsList) {
      if (y < 100) {
        page = pdfDoc.addPage([595.28, 841.89])
        y = 800
      }
      const estoqueItem = Array.isArray(item.estoque_item)
        ? item.estoque_item[0]
        : item.estoque_item
      const nome = estoqueItem?.nome || 'Item sem nome'
      const qtd = Number(item.quantidade || 0)
      const un = estoqueItem?.unidade || 'un'
      const pUnit = Number(item.preco_venda || 0)
      const pTotal = qtd * pUnit
      subtotal += pTotal

      page.drawText(nome.substring(0, 45), { x: cols[0].x, y, size: 9, font })
      page.drawText(qtd.toString(), { x: cols[1].x, y, size: 9, font })
      page.drawText(un, { x: cols[2].x, y, size: 9, font })
      page.drawText(formatCurrency(pUnit), { x: cols[3].x, y, size: 9, font })
      page.drawText(formatCurrency(pTotal), { x: cols[4].x, y, size: 9, font })
      y -= 15
    }

    y -= 10
    page.drawLine({ start: { x: margin, y }, end: { x: pageWidth - margin, y }, thickness: 1 })
    y -= 20

    page.drawText(`Subtotal: R$ ${formatCurrency(subtotal)}`, {
      x: margin + 330,
      y,
      size: 11,
      font,
    })
    y -= 20
    const finalTotal = subtotal
    page.drawText(`TOTAL: R$ ${formatCurrency(finalTotal)}`, {
      x: margin + 330,
      y,
      size: 14,
      font: fontBold,
    })
    y -= 40

    if (orc.descricao) {
      page.drawText('Observações:', { x: margin, y, size: 11, font: fontBold })
      y -= 15
      page.drawText(orc.descricao.substring(0, 200), { x: margin, y, size: 10, font })
      y -= 30
    }
  } else {
    if (orc.descricao) {
      page.drawText('Descrição:', { x: margin, y, size: 12, font: fontBold })
      y -= 15
      page.drawText(orc.descricao.substring(0, 300), { x: margin, y, size: 11, font })
      y -= 40
    }

    for (const item of itemsList) {
      subtotal += Number(item.quantidade || 0) * Number(item.preco_venda || 0)
    }

    const finalTotal = subtotal
    page.drawText(`VALOR TOTAL: R$ ${formatCurrency(finalTotal)}`, {
      x: margin,
      y,
      size: 16,
      font: fontBold,
    })
    y -= 50
  }

  if (y < 100) {
    page = pdfDoc.addPage([595.28, 841.89])
    y = 800
  }

  y -= 50
  page.drawLine({ start: { x: margin, y }, end: { x: margin + 200, y }, thickness: 1 })
  y -= 15
  page.drawText('Assinatura do Consultor', { x: margin, y, size: 10, font })
  page.drawText(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, {
    x: margin,
    y: 30,
    size: 8,
    font,
  })

  const pdfBytes = await pdfDoc.save()
  const base64 = btoa(String.fromCharCode(...new Uint8Array(pdfBytes)))

  return new Response(JSON.stringify({ pdfBase64: base64 }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json()

    if (body.action === 'generate_orcamento') {
      return await handleGenerateOrcamento(req, body)
    }

    const { title, subtitle, columns, rows, totals } = body

    const pdfDoc = await PDFDocument.create()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    let page = pdfDoc.addPage([595.28, 841.89])
    let y = 800

    page.drawText(title || 'Documento', { x: 40, y, size: 18, font: fontBold })
    y -= 20
    if (subtitle) {
      page.drawText(subtitle, { x: 40, y, size: 11, font })
      y -= 30
    }

    const drawRow = (p: any, rowData: string[], yPos: number, isBold = false) => {
      let x = 40
      const w = columns.length === 3 ? [60, 100, 350] : [40, 120, 200, 80, 80]
      rowData.forEach((text, i) => {
        const t = String(text || '').substring(0, 50)
        p.drawText(t, { x, y: yPos, size: 9, font: isBold ? fontBold : font })
        x += w[i] || 60
      })
    }

    drawRow(page, columns, y, true)
    y -= 10
    page.drawLine({ start: { x: 40, y }, end: { x: 550, y }, thickness: 1 })
    y -= 15

    for (const row of rows) {
      if (y < 50) {
        page = pdfDoc.addPage([595.28, 841.89])
        y = 800
      }
      drawRow(page, row, y)
      y -= 15
    }

    y -= 10
    page.drawLine({ start: { x: 40, y }, end: { x: 550, y }, thickness: 1 })
    y -= 20

    if (totals) {
      for (const t of totals) {
        page.drawText(`${t.label}: ${t.value}`, { x: 300, y, size: 11, font: fontBold })
        y -= 15
      }
    }

    const pdfBytes = await pdfDoc.save()
    const base64 = btoa(String.fromCharCode(...new Uint8Array(pdfBytes)))

    return new Response(JSON.stringify({ pdfBase64: base64 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
