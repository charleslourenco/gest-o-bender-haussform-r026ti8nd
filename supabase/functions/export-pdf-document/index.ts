import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { PDFDocument, StandardFonts } from 'npm:pdf-lib@1.17.1'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { title, subtitle, columns, rows, totals } = await req.json()

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
