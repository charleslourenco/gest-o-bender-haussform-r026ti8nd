import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, x-supabase-client-platform, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const body = await req.json()
    const { orcamento_id, format } = body
    if (!orcamento_id) throw new Error('orcamento_id is required')

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey =
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: orc, error: orcErr } = await supabase
      .from('orcamentos_engenharia')
      .select(
        `*, cliente:clientes(nome, endereco_obra, rua, numero, bairro, cidade, estado, cep), ambientes:orcamentos_ambientes(*, itens:orcamentos_itens(*, estoque_item:estoque_itens(nome, unidade)))`,
      )
      .eq('id', orcamento_id)
      .single()

    if (orcErr || !orc) throw new Error('Orçamento não encontrado')

    const pdfDoc = await PDFDocument.create()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    let page = pdfDoc.addPage([595.28, 841.89])
    let y = 800
    const margin = 40
    const pageWidth = 595.28

    const checkPageBreak = (needed: number) => {
      if (y - needed < margin) {
        page = pdfDoc.addPage([595.28, 841.89])
        y = 800
      }
    }

    page.drawText(format === 'analytic' ? 'ORÇAMENTO ANALÍTICO' : 'ORÇAMENTO SINTÉTICO', {
      x: margin,
      y,
      size: 16,
      font: fontBold,
    })
    y -= 20
    page.drawText(`Projeto: ${orc.nome}`, { x: margin, y, size: 12, font: fontBold })
    y -= 15

    const clienteNome =
      orc.cliente_nome_manual ||
      (Array.isArray(orc.cliente) ? orc.cliente[0]?.nome : orc.cliente?.nome) ||
      'Não informado'
    page.drawText(
      `Cliente: ${clienteNome} - Data: ${new Date(orc.criado_em).toLocaleDateString('pt-BR')}`,
      { x: margin, y, size: 10, font },
    )
    y -= 30

    const formatCurrency = (val: number) =>
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

    let grandTotalCusto = 0
    let grandTotalVenda = 0
    const divNormalFallback = orc.markup_divisor_normal || 0.35

    if (orc.ambientes && orc.ambientes.length > 0) {
      for (const amb of orc.ambientes) {
        checkPageBreak(80)
        y -= 10
        page.drawText(`Ambiente: ${amb.nome}`, {
          x: margin,
          y,
          size: 12,
          font: fontBold,
          color: rgb(0.1, 0.3, 0.5),
        })
        y -= 20

        let ambCusto = 0
        let ambVenda = 0
        const itemsList = amb.itens || []

        if (format === 'analytic') {
          const cols = [
            { t: 'Item', x: margin, w: 200 },
            { t: 'Qtd', x: margin + 210 },
            { t: 'Un', x: margin + 250 },
            { t: 'Custo Un.', x: margin + 290 },
            { t: 'Total Custo', x: margin + 370 },
            { t: 'Preço Venda', x: margin + 450 },
          ]
          cols.forEach((c) => page.drawText(c.t, { x: c.x, y, size: 9, font: fontBold }))
          y -= 10
          page.drawLine({
            start: { x: margin, y },
            end: { x: pageWidth - margin, y },
            thickness: 0.5,
          })
          y -= 15

          for (const it of itemsList) {
            checkPageBreak(20)
            const cUnit = Number(it.custo_unitario || 0)
            const qtd = Number(it.quantidade || 0)
            const cTotal = cUnit * qtd
            const itMarkup = Number(it.markup) || divNormalFallback
            const vendaItm = cTotal / itMarkup
            ambCusto += cTotal
            ambVenda += vendaItm

            page.drawText(it.nome_item.substring(0, 40), { x: cols[0].x, y, size: 8, font })
            page.drawText(qtd.toString(), { x: cols[1].x, y, size: 8, font })
            page.drawText(it.unidade_medida || 'un', { x: cols[2].x, y, size: 8, font })
            page.drawText(formatCurrency(cUnit), { x: cols[3].x, y, size: 8, font })
            page.drawText(formatCurrency(cTotal), { x: cols[4].x, y, size: 8, font })
            page.drawText(formatCurrency(vendaItm), { x: cols[5].x, y, size: 8, font })
            y -= 12
          }
          y -= 5
          page.drawLine({
            start: { x: margin, y },
            end: { x: pageWidth - margin, y },
            thickness: 0.5,
          })
          y -= 15
        } else {
          for (const it of itemsList) {
            const cTotal = Number(it.custo_unitario || 0) * Number(it.quantidade || 0)
            const itMarkup = Number(it.markup) || divNormalFallback
            ambCusto += cTotal
            ambVenda += cTotal / itMarkup
          }
        }

        grandTotalCusto += ambCusto
        grandTotalVenda += ambVenda

        checkPageBreak(30)
        page.drawText(
          format === 'analytic'
            ? `Subtotal Ambiente: ${formatCurrency(ambVenda)}`
            : `Total Ambiente: ${formatCurrency(ambVenda)}`,
          { x: format === 'analytic' ? margin + 300 : margin, y, size: 10, font: fontBold },
        )
        y -= 25
      }
    }

    checkPageBreak(80)
    y -= 20
    page.drawLine({ start: { x: margin, y }, end: { x: pageWidth - margin, y }, thickness: 1 })
    y -= 20
    page.drawText(`RESUMO FINAL`, { x: margin, y, size: 12, font: fontBold })
    y -= 20
    if (format === 'analytic') {
      page.drawText(`Custo Total (Materiais): ${formatCurrency(grandTotalCusto)}`, {
        x: margin,
        y,
        size: 10,
        font,
      })
      y -= 15
    }
    page.drawText(`Valor Total de Venda: ${formatCurrency(grandTotalVenda)}`, {
      x: margin,
      y,
      size: 12,
      font: fontBold,
    })

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
