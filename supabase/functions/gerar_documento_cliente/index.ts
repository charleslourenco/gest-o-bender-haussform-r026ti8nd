import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, x-supabase-client-platform, apikey, content-type',
}

function formatCurrency(val: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
}

function formatDateStr(dateStr: string) {
  if (!dateStr) return ''
  const parts = dateStr.split('-')
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`
  return dateStr
}

function sanitizeHtmlForPdf(html: string): string {
  let clean = html || ''
  clean = clean.replace(/<p><br><\/p>/gi, '')
  clean = clean.replace(/<p>\s*<\/p>/gi, '')
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  // Removed the <style> stripping so CSS is preserved in PDF
  clean = clean.replace(
    /src="data:image\/[^;]+;base64,[^"]+"/gi,
    'src="" alt="[Imagem removida para otimização]"',
  )
  return clean
}

function wrapHtmlWithStyles(html: string): string {
  if (html.includes('<!-- WRAPPED_HTML -->')) {
    return html
  }

  let processedHtml = html
  // Extrai o body se for um HTML completo para evitar duplicação de tags html/body
  if (processedHtml.includes('<body')) {
    const match = processedHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i)
    if (match) processedHtml = match[1]
  }

  processedHtml = processedHtml.replace(/<table/g, '<table class="content-table"')

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  @page {
    size: A4;
    margin: 15mm 15mm 20mm 15mm;
  }
  body { 
    font-family: 'Helvetica', 'Arial', sans-serif; 
    font-size: 11pt; 
    line-height: 1.5; 
    color: #333; 
    margin: 0; 
    padding: 0; 
  }
  
  table.main-document-table { 
    width: 100%; 
    border-collapse: collapse; 
    border: none; 
  }
  table.main-document-table > thead > tr > th { 
    border: none; 
    padding-bottom: 20px; 
    font-weight: normal; 
    text-align: center;
  }
  table.main-document-table > tfoot > tr > td { 
    border: none; 
    padding-top: 20px; 
    text-align: center; 
    font-size: 9pt; 
    color: #666; 
  }
  table.main-document-table > tbody > tr > td { 
    border: none; 
    padding: 0; 
  }
  
  h2, h3, h4 { color: #000; margin-top: 1.5em; margin-bottom: 0.5em; }
  h2 { text-align: center; font-size: 14pt; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 2em; }
  h2.nova-secao { page-break-before: always; break-before: page; }
  h3 { text-align: left; font-size: 12pt; background-color: #f2f2f2; padding: 5px; }
  h4 { text-align: left; font-size: 11pt; }
  
  .content-table { width: 100%; border-collapse: collapse; margin-top: 1em; margin-bottom: 1em; }
  .content-table th, .content-table td { border: 1px solid #ddd; padding: 8px; text-align: left; vertical-align: top; }
  .content-table th { background-color: #f8f9fa; font-weight: bold; }
  
  .text-center { text-align: center; }
  .bold { font-weight: bold; }
  .page-break { page-break-before: always; break-before: page; }
  
  p { margin-bottom: 1em; text-align: justify; }
  ul, ol { margin-bottom: 1em; padding-left: 20px; }
  li { margin-bottom: 0.5em; text-align: justify; }

  .clausula, p, tr {
    page-break-inside: avoid;
    break-inside: avoid;
  }
</style>
</head>
<body>
<!-- WRAPPED_HTML -->
<table class="main-document-table">
  <thead>
    <tr>
      <th>
        <div style="text-align: center;">
          <img src="https://igsdtxyopeiecpxwovgh.supabase.co/storage/v1/object/public/bender_templates/logo.png" alt="Bender Haussform" style="max-height: 60px; object-fit: contain;" onerror="this.style.display='none'" />
        </div>
      </th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>
        ${processedHtml}
      </td>
    </tr>
  </tbody>
  <tfoot>
    <tr>
      <td>
        <div style="text-align: center; border-top: 1px solid #ddd; padding-top: 10px;">
          <strong>FORMA &middot; ESTILO &middot; VIDA</strong>
        </div>
      </td>
    </tr>
  </tfoot>
</table>
</body>
</html>`
}

async function generatePdfFromHtmlFallback(html: string): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const margin = 50
  const pageWidth = 595.28
  const pageHeight = 841.89
  const maxWidth = pageWidth - margin * 2

  let page = pdfDoc.addPage([pageWidth, pageHeight])
  let currentY = pageHeight - margin

  let safeHtml = html

  // Remover bloco de estilo e scripts para não imprimir como texto
  safeHtml = safeHtml.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
  safeHtml = safeHtml.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')

  const unicodeMap: Record<string, string> = {
    '“': '"',
    '”': '"',
    '‘': "'",
    '’': "'",
    '–': '-',
    '—': '-',
    '…': '...',
    º: 'o',
    ª: 'a',
    '°': 'o',
    '✅': '[X]',
    '❌': '[ ]',
    '⚠️': '!',
    '&nbsp;': ' ',
    '·': '.',
    '•': '.',
    '✓': '[X]',
    '✔': '[X]',
    '✗': '[ ]',
    '✘': '[ ]',
    '\u201C': '"',
    '\u201D': '"',
    '\u2018': "'",
    '\u2019': "'",
    '\u2013': '-',
    '\u2014': '-',
    '\u2026': '...',
  }
  for (const [char, replacement] of Object.entries(unicodeMap)) {
    safeHtml = safeHtml.split(char).join(replacement)
  }

  // Remove ANY character that is not ASCII or Latin-1 Supplement (to avoid pdf-lib WinAnsi crash)
  safeHtml = safeHtml.replace(/[^\x20-\x7E\xA0-\xFF\n\r\t<>]/g, '')

  // Convert tables to a safe separator format
  safeHtml = safeHtml.replace(/<tr[^>]*>/gi, '\n')
  safeHtml = safeHtml.replace(/<\/tr>/gi, '\n')
  safeHtml = safeHtml.replace(/<th[^>]*>/gi, '')
  safeHtml = safeHtml.replace(/<\/th>/gi, ' __CELL__ ')
  safeHtml = safeHtml.replace(/<td[^>]*>/gi, '')
  safeHtml = safeHtml.replace(/<\/td>/gi, ' __CELL__ ')

  // Preserve page breaks
  safeHtml = safeHtml.replace(
    /<[^>]*class="[^"]*page-break[^"]*"[^>]*>/gi,
    '\n---PAGE-BREAK---\n$&',
  )

  // Newlines for blocks
  safeHtml = safeHtml.replace(/<\/(p|div|h1|h2|h3|h4|h5|h6|li)>/gi, '\n')
  safeHtml = safeHtml.replace(/<(br|hr)\s*\/?>/gi, '\n')

  // Strip remaining tags
  const text = safeHtml
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\n\s*\n/g, '\n')
    .trim()

  const checkPageBreak = (needed: number) => {
    if (currentY - needed < margin) {
      page = pdfDoc.addPage([pageWidth, pageHeight])
      currentY = pageHeight - margin
    }
  }

  // Cache optimization for text widths
  const wordWidthCache = new Map<string, number>()
  const getWordWidth = (word: string, font: any, size: number) => {
    if (!word) return 0
    if (wordWidthCache.size > 20000) wordWidthCache.clear()
    const fontId = font === fontBold ? 'b' : 'r'
    const key = `${word}_${size}_${fontId}`
    if (wordWidthCache.has(key)) return wordWidthCache.get(key)!
    const w = font.widthOfTextAtSize(word, size)
    wordWidthCache.set(key, w)
    return w
  }

  const spaceWidthCache = new Map<string, number>()
  const getSpaceWidth = (font: any, size: number) => {
    const fontId = font === fontBold ? 'b' : 'r'
    const key = `${size}_${fontId}`
    if (spaceWidthCache.has(key)) return spaceWidthCache.get(key)!
    const w = font.widthOfTextAtSize(' ', size)
    spaceWidthCache.set(key, w)
    return w
  }

  const getLineTextWidth = (line: string, font: any, size: number) => {
    if (!line) return 0
    if (wordWidthCache.size > 20000) wordWidthCache.clear()
    const fontId = font === fontBold ? 'b' : 'r'
    const key = `L_${line}_${size}_${fontId}`
    if (wordWidthCache.has(key)) return wordWidthCache.get(key)!
    const w = font.widthOfTextAtSize(line, size)
    wordWidthCache.set(key, w)
    return w
  }

  const wrapText = (textStr: string, font: any, size: number) => {
    const words = textStr.split(' ')
    const lines = []
    let currentLine = ''
    let currentLineWidth = 0
    const spaceW = getSpaceWidth(font, size)

    for (const word of words) {
      if (!word) continue
      const wordW = getWordWidth(word, font, size)

      if (currentLine === '') {
        if (wordW > maxWidth) {
          let brokenWord = ''
          let bwWidth = 0
          for (const char of word) {
            const charW = getWordWidth(char, font, size)
            if (bwWidth + charW + getWordWidth('-', font, size) > maxWidth) {
              lines.push(brokenWord + '-')
              brokenWord = char
              bwWidth = charW
            } else {
              brokenWord += char
              bwWidth += charW
            }
          }
          currentLine = brokenWord
          currentLineWidth = bwWidth
        } else {
          currentLine = word
          currentLineWidth = wordW
        }
      } else {
        if (currentLineWidth + spaceW + wordW > maxWidth) {
          lines.push(currentLine)
          currentLine = word
          currentLineWidth = wordW
        } else {
          currentLine += ' ' + word
          currentLineWidth += spaceW + wordW
        }
      }
    }
    if (currentLine) lines.push(currentLine)
    return lines
  }

  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim()
    if (!rawLine) {
      currentY -= 15
      checkPageBreak(0)
      continue
    }

    if (rawLine === '---PAGE-BREAK---') {
      page = pdfDoc.addPage([pageWidth, pageHeight])
      currentY = pageHeight - margin
      continue
    }

    if (rawLine.includes(' __CELL__ ')) {
      const cleanLine = rawLine.replace(/ __CELL__ \s*$/, '')
      const cells = cleanLine.split(' __CELL__ ').map((c) => c.trim())
      if (cells.length === 0 || (cells.length === 1 && cells[0] === '')) continue

      let cellWidths: number[] = []
      if (cells.length === 4) {
        cellWidths = [maxWidth * 0.45, maxWidth * 0.15, maxWidth * 0.2, maxWidth * 0.2]
      } else if (cells.length === 5) {
        cellWidths = [
          maxWidth * 0.35,
          maxWidth * 0.25,
          maxWidth * 0.1,
          maxWidth * 0.15,
          maxWidth * 0.15,
        ]
      } else {
        const cw = maxWidth / cells.length
        cellWidths = Array(cells.length).fill(cw)
      }

      // Calculate wrapped lines for each cell to determine row height
      const cellFont = i === 0 || rawLine.toUpperCase() === rawLine ? fontBold : fontRegular
      const cellsLines = cells.map((cellText, c) => {
        const widthLimit = cellWidths[c] - 8
        const words = cellText.split(' ')
        let lines = []
        let curLine = ''
        for (const word of words) {
          if (!word) continue
          const testLine = curLine ? curLine + ' ' + word : word
          if (getLineTextWidth(testLine, cellFont, 10) <= widthLimit) {
            curLine = testLine
          } else {
            if (curLine) lines.push(curLine)
            curLine = word
          }
        }
        if (curLine) lines.push(curLine)
        if (lines.length === 0) lines.push('')
        return lines
      })

      const maxLines = Math.max(...cellsLines.map((l) => l.length))
      const rowHeight = Math.max(20, maxLines * 12 + 8)

      checkPageBreak(rowHeight)

      let currentX = margin
      for (let c = 0; c < Math.min(cells.length, cellWidths.length); c++) {
        page.drawRectangle({
          x: currentX,
          y: currentY - rowHeight + 6,
          width: cellWidths[c],
          height: rowHeight,
          borderColor: rgb(0, 0, 0),
          borderWidth: 0.5,
          color: rgb(1, 1, 1),
        })

        const linesToDraw = cellsLines[c]
        let textY = currentY - 10
        for (const line of linesToDraw) {
          const dtW = getLineTextWidth(line, cellFont, 10)
          page.drawText(line, {
            x: currentX + 4,
            y: textY,
            size: 10,
            font: cellFont,
            color: rgb(0, 0, 0),
          })
          textY -= 12
        }

        currentX += cellWidths[c]
      }
      currentY -= rowHeight
      continue
    }

    const isMainTitle =
      i === 0 ||
      rawLine.toUpperCase().includes('CONTRATO UNIFICADO') ||
      rawLine.toUpperCase().includes('TERMO')
    const isBold = rawLine.toUpperCase() === rawLine && rawLine.length > 5

    let font = fontRegular
    let size = 10
    let align = 'justify'

    if (isMainTitle) {
      font = fontBold
      size = 14
      align = 'center'
      currentY -= 10
    } else if (isBold) {
      font = fontBold
      size = 12
      align = 'left'
      currentY -= 5
    }

    const wrappedLines = wrapText(rawLine, font, size)
    const lineHeight = size * 1.5

    for (let j = 0; j < wrappedLines.length; j++) {
      const wl = wrappedLines[j]
      checkPageBreak(lineHeight)

      const width = getLineTextWidth(wl, font, size)
      let x = margin

      if (align === 'center') {
        x = margin + Math.max(0, (maxWidth - width) / 2)
        page.drawText(wl, { x, y: currentY, size, font, color: rgb(0, 0, 0) })
      } else if (align === 'justify' && j < wrappedLines.length - 1 && width > maxWidth * 0.7) {
        const words = wl.split(' ')
        if (words.length > 1) {
          const textWidth = getLineTextWidth(wl.replace(/\s+/g, ''), font, size)
          const spaceWidth = (maxWidth - textWidth) / (words.length - 1)
          if (spaceWidth < getSpaceWidth(font, size) * 3) {
            let cx = margin
            for (const word of words) {
              page.drawText(word, { x: cx, y: currentY, size, font, color: rgb(0, 0, 0) })
              cx += getWordWidth(word, font, size) + spaceWidth
            }
          } else {
            page.drawText(wl, { x, y: currentY, size, font, color: rgb(0, 0, 0) })
          }
        } else {
          page.drawText(wl, { x, y: currentY, size, font, color: rgb(0, 0, 0) })
        }
      } else {
        page.drawText(wl, { x, y: currentY, size, font, color: rgb(0, 0, 0) })
      }

      currentY -= lineHeight
    }
  }

  const pages = pdfDoc.getPages()
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i]
    const footerY = margin / 2
    const pageText = `Página ${i + 1} de ${pages.length}`
    const tw = getLineTextWidth(pageText, fontRegular, 8)
    p.drawText(pageText, { x: pageWidth - margin - tw, y: footerY, size: 8, font: fontRegular })
  }

  return await pdfDoc.save()
}

async function convertHtmlToPdf(html: string): Promise<Uint8Array> {
  const apiKey = Deno.env.get('HTML2PDF_API_KEY') || Deno.env.get('PDF_API_KEY') || ''

  try {
    const controller = new AbortController()
    // 25s timeout for the external API, to allow fallback processing if it gets stuck
    const timeoutId = setTimeout(() => controller.abort(), 25000)

    const response = await fetch('https://api.html2pdf.app/v1/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({ html, apiKey }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer()
      return new Uint8Array(arrayBuffer)
    } else {
      console.error(`API HTML2PDF falhou: ${response.status} - ${await response.text()}`)
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.error('API HTML2PDF timeout após 25 segundos.')
    } else {
      console.error('Erro na requisição HTML2PDF:', err)
    }
  }

  console.log('Usando fallback avançado do pdf-lib para gerar documento longo')
  return await generatePdfFromHtmlFallback(html)
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Unauthorized')

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const body = await req.json()
    const { action, cliente_id, template_nome, documento_id, conteudo_editado } = body

    if (action === 'pre_gerar' || action === 'gerar_novo') {
      if (!cliente_id || !template_nome)
        throw new Error('cliente_id e template_nome são obrigatórios')

      const { data: template, error: tplError } = await supabase
        .from('templates')
        .select('arquivo_url, nome')
        .ilike('nome', template_nome.trim())
        .limit(1)
        .maybeSingle()

      if (tplError)
        throw new Error(`Erro ao buscar template '${template_nome}': ${tplError.message}`)
      if (!template || !template.arquivo_url)
        throw new Error(
          `Template '${template_nome}' não encontrado ou sem arquivo_url no banco de dados.`,
        )

      const { data: fileData, error: fileError } = await supabase.storage
        .from('bender_templates')
        .download(template.arquivo_url)
      if (fileError || !fileData)
        throw new Error(`Erro ao baixar arquivo do template: ${fileError?.message}`)
      const conteudo = await fileData.text()

      const { data: form, error: formError } = await supabase
        .from('formulario_comercial')
        .select('*, cliente:clientes(*)')
        .eq('cliente_id', cliente_id)
        .order('criado_em', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (formError) throw new Error(`Erro ao buscar formulário: ${formError.message}`)

      let cli: any = {}
      if (form) {
        cli = Array.isArray(form.cliente) ? form.cliente[0] : form.cliente || {}
      } else {
        const { data: cliData } = await supabase
          .from('clientes')
          .select('*')
          .eq('id', cliente_id)
          .maybeSingle()
        if (cliData) cli = cliData
      }

      const safeForm = form || {}
      const pagamentosArr = Array.isArray(safeForm.pagamentos)
        ? safeForm.pagamentos
        : [safeForm.pagamentos || {}]
      const pagData = pagamentosArr[0] || {}
      const produtos = safeForm.produtos_servicos || []

      const valorTotal = Number(safeForm.valor_total || 0)
      const desconto = Number(safeForm.desconto || 0)
      const metodoPagamento = safeForm.metodo_pagamento || pagData.meio || 'Não informado'

      let tabelaProdutos =
        '<table style="width: 100%; border-collapse: collapse;"><thead><tr><th style="border: 1px solid #ccc; padding: 4px;">Produto/Serviço</th><th style="border: 1px solid #ccc; padding: 4px;">Descrição</th><th style="border: 1px solid #ccc; padding: 4px;">Qtd</th><th style="border: 1px solid #ccc; padding: 4px;">V. Unit.</th><th style="border: 1px solid #ccc; padding: 4px;">Total</th></tr></thead><tbody>'
      if (produtos.length === 0) {
        tabelaProdutos +=
          '<tr><td colspan="5" style="border: 1px solid #ccc; padding: 4px; text-align: center;">Nenhum produto cadastrado</td></tr>'
      } else {
        produtos.forEach((p: any) => {
          const nome = p.nome || p.nome_produto || 'Item'
          const desc = p.descricao || '-'
          const qtd = Number(p.qtd || p.quantidade || 1)
          const vu = Number(p.valor_unitario || p.valor || 0)
          const vt = Number(p.valor_total || qtd * vu)
          tabelaProdutos += `<tr><td style="border: 1px solid #ccc; padding: 4px;">${nome}</td><td style="border: 1px solid #ccc; padding: 4px;">${desc}</td><td style="border: 1px solid #ccc; padding: 4px;">${qtd}</td><td style="border: 1px solid #ccc; padding: 4px;">${formatCurrency(vu)}</td><td style="border: 1px solid #ccc; padding: 4px;">${formatCurrency(vt)}</td></tr>`
        })
      }
      tabelaProdutos += '</tbody></table>'

      let tabelaPagamentos =
        '<table style="width: 100%; border-collapse: collapse;"><thead><tr><th style="border: 1px solid #ccc; padding: 4px;">Parcela</th><th style="border: 1px solid #ccc; padding: 4px;">Vencimento</th><th style="border: 1px solid #ccc; padding: 4px;">Valor</th><th style="border: 1px solid #ccc; padding: 4px;">Meio de Pagamento</th></tr></thead><tbody>'
      const parcelas = safeForm.parcelas || pagData.parcelas || []

      if (pagData.forma === 'A_VISTA' || parcelas.length === 0) {
        tabelaPagamentos += `<tr><td style="border: 1px solid #ccc; padding: 4px;">Única</td><td style="border: 1px solid #ccc; padding: 4px;">${formatDateStr(safeForm.data_pagamento || safeForm.criado_em)}</td><td style="border: 1px solid #ccc; padding: 4px;">${formatCurrency(valorTotal)}</td><td style="border: 1px solid #ccc; padding: 4px;">${metodoPagamento}</td></tr>`
      } else {
        parcelas.forEach((p: any, index: number) => {
          tabelaPagamentos += `<tr><td style="border: 1px solid #ccc; padding: 4px;">${index + 1}/${parcelas.length}</td><td style="border: 1px solid #ccc; padding: 4px;">${formatDateStr(p.data || p.vencimento)}</td><td style="border: 1px solid #ccc; padding: 4px;">${formatCurrency(p.valor || valorTotal / parcelas.length)}</td><td style="border: 1px solid #ccc; padding: 4px;">${p.meio || metodoPagamento}</td></tr>`
        })
      }
      tabelaPagamentos += '</tbody></table>'

      const placeholders: Record<string, string> = {
        '{{nome_cliente}}': cli.nome || '',
        '{{CLI_NOME_COMPLETO}}': cli.nome || '',
        '{{cpf}}': safeForm.cpf || cli.cpf || '',
        '{{CLI_CPF}}': safeForm.cpf || cli.cpf || '',
        '{{email}}': cli.email || '',
        '{{telefone}}': cli.telefone || '',
        '{{endereco_obra}}': safeForm.obra_rua
          ? `${safeForm.obra_rua}, ${safeForm.obra_numero} - ${safeForm.obra_bairro}, ${safeForm.obra_municipio} - ${safeForm.obra_estado}`
          : cli.endereco_obra || '',
        '{{CLI_ENDERECO_OBRA}}': safeForm.obra_rua
          ? `${safeForm.obra_rua}, ${safeForm.obra_numero} - ${safeForm.obra_bairro}, ${safeForm.obra_municipio} - ${safeForm.obra_estado}`
          : cli.endereco_obra || '',
        '{{valor_total}}': formatCurrency(valorTotal),
        '{{desconto}}': formatCurrency(desconto),
        '{{metodo_pagamento}}': metodoPagamento,
        '{{data_prevista_entrega}}': formatDateStr(safeForm.data_prevista_entrega || ''),
        '{{data_contrato}}': new Date().toLocaleDateString('pt-BR'),
        '{{tabela_produtos}}': tabelaProdutos,
        '{{tabela_pagamentos}}': tabelaPagamentos,
        '{{TABELA_PRODUTOS_SERVICOS}}': tabelaProdutos,
        '{{SUBTOTAL_PRODUTOS}}': formatCurrency(valorTotal + desconto),
        '{{DESCONTO_PRODUTOS}}': formatCurrency(desconto),
        '{{TOTAL_PRODUTOS}}': formatCurrency(valorTotal),
        '{{FORMA_PAGAMENTO}}': pagData.forma === 'A_VISTA' ? 'À Vista' : 'Parcelado',
        '{{METODO_PAGAMENTO}}': metodoPagamento,
        '{{NUMERO_PARCELAS}}': parcelas.length > 0 ? parcelas.length.toString() : '1',
        '{{VALOR_PARCELA}}':
          parcelas.length > 0
            ? formatCurrency(parcelas[0].valor || valorTotal / parcelas.length)
            : formatCurrency(valorTotal),
        '{{CLI_ENDERECO_COMPLETO}}': cli.rua
          ? `${cli.rua}, ${cli.numero} - ${cli.bairro}, ${cli.cidade} - ${cli.estado}`
          : '',
        '{{CLI_PROFISSAO}}': cli.profissao || '',
        '{{CLI_ESTADO_CIVIL}}': cli.estado_civil || '',
        '{{CLI_EMAIL}}': cli.email || '',
        '{{CLI_TELEFONE}}': cli.telefone || '',
        '{{CLAUSULA_PAGAMENTO_NARRATIVA}}': `O valor total do contrato será pago em ${parcelas.length > 0 ? parcelas.length : 1} parcela(s).`,
        '{{DATA_PREVISTA_ENTREGA_IMOVEL}}': formatDateStr(safeForm.data_prevista_entrega || ''),
        '{{DATA_CONTRATO_EXTENSO}}': new Date().toLocaleDateString('pt-BR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        '{{CLI_NOME}}': cli.nome || '',
        '{{CLI_CPF_CNPJ}}': cli.cpf || '',
      }

      let conteudoFinal = conteudo
      for (const [key, value] of Object.entries(placeholders)) {
        const safeValue = typeof value === 'string' ? value : ''
        conteudoFinal = conteudoFinal.split(key).join(safeValue)
      }

      if (action === 'pre_gerar') {
        // Se já tiver uma tag de formatação wrapper, retorna. Senão, tenta extrair só o body para o editor.
        if (conteudoFinal.includes('<!-- WRAPPED_HTML -->')) {
          const bodyMatch = conteudoFinal.match(
            /<tbody>\s*<tr>\s*<td>([\s\S]*?)<\/td>\s*<\/tr>\s*<\/tbody>/i,
          )
          if (bodyMatch) conteudoFinal = bodyMatch[1]
        } else if (conteudoFinal.includes('<body')) {
          const bodyMatch = conteudoFinal.match(/<body[^>]*>([\s\S]*)<\/body>/i)
          if (bodyMatch) conteudoFinal = bodyMatch[1]
        }
        return new Response(JSON.stringify({ success: true, conteudo_preenchido: conteudoFinal }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      conteudoFinal = sanitizeHtmlForPdf(conteudoFinal)
      const pdfBytes = await convertHtmlToPdf(conteudoFinal)
      const safeNome = template_nome.trim().replace(/[^a-zA-Z0-9]/g, '_')
      const fileName = `${safeNome}_${Date.now()}.pdf`
      const filePath = `contratos/${cliente_id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('bender_clientes')
        .upload(filePath, pdfBytes, { contentType: 'application/pdf', upsert: true })

      if (uploadError)
        throw new Error(`Falha no upload do arquivo para o storage: ${uploadError.message}`)

      const { data: docRecord, error: docError } = await supabase
        .from('documentos_cliente')
        .insert({
          cliente_id,
          tipo: template_nome.trim(),
          template_nome: `${template_nome.trim()}.pdf`,
          status: 'gerado',
          arquivo_url: filePath,
          conteudo_preenchido: conteudoFinal,
        })
        .select()
        .single()

      if (docError) throw new Error(`Erro ao salvar registro do documento: ${docError.message}`)

      return new Response(JSON.stringify({ success: true, documento: docRecord }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } else if (
      action === 'salvar_novo' ||
      action === 'atualizar_pdf' ||
      action === 'salvar_novo_async' ||
      action === 'atualizar_pdf_async'
    ) {
      const processPdfAsync = async () => {
        try {
          let conteudo_html = conteudo_editado
          let docRecord: any = null
          let currentClienteId = cliente_id

          if (action === 'salvar_novo_async' || action === 'atualizar_pdf_async') {
            if (!documento_id)
              throw new Error('documento_id é obrigatório para atualização assíncrona')
            const { data: doc, error: docError } = await supabase
              .from('documentos_cliente')
              .select('*')
              .eq('id', documento_id)
              .single()

            if (docError || !doc) throw new Error(`Documento não encontrado: ${docError?.message}`)
            conteudo_html = doc.conteudo_preenchido
            docRecord = doc
            currentClienteId = doc.cliente_id
          }

          if (!conteudo_html) throw new Error('Conteúdo HTML do documento está vazio')

          // Limpeza vital para estabilizar o processo de geração e envelopamento de estilos
          conteudo_html = sanitizeHtmlForPdf(conteudo_html)
          conteudo_html = wrapHtmlWithStyles(conteudo_html)

          // Timeout watchdog embutido na promessa para forçar a saída se o processo travar
          const timeoutPromise = new Promise<Uint8Array>((_, reject) => {
            setTimeout(() => reject(new Error('TIMEOUT_GERACAO_PDF')), 40000)
          })

          // Otimização: Renderizando o PDF (processo protegido por watchdog)
          const pdfBytes = await Promise.race([convertHtmlToPdf(conteudo_html), timeoutPromise])

          if (action === 'salvar_novo' || action === 'salvar_novo_async') {
            const nomeBase = template_nome ? template_nome : docRecord?.tipo || 'Documento'
            const safeNome = nomeBase.trim().replace(/[^a-zA-Z0-9]/g, '_')
            const fileName = `${safeNome}_${Date.now()}.pdf`
            const filePath = `contratos/${currentClienteId}/${fileName}`

            const { error: uploadError } = await supabase.storage
              .from('bender_clientes')
              .upload(filePath, pdfBytes, { contentType: 'application/pdf', upsert: true })

            if (uploadError) throw new Error(`Falha no upload do arquivo: ${uploadError.message}`)

            if (action === 'salvar_novo_async') {
              await supabase
                .from('documentos_cliente')
                .update({
                  status: 'gerado',
                  arquivo_url: filePath,
                })
                .eq('id', documento_id)
            } else {
              await supabase.from('documentos_cliente').insert({
                cliente_id: currentClienteId,
                tipo: nomeBase.trim(),
                template_nome: `${nomeBase.trim()}.pdf`,
                status: 'gerado',
                arquivo_url: filePath,
                conteudo_preenchido: conteudo_html,
              })
            }
          } else {
            // atualizar_pdf ou atualizar_pdf_async
            if (!documento_id) throw new Error('documento_id é obrigatório para atualizar')

            if (!docRecord) {
              const { data: doc, error: docError } = await supabase
                .from('documentos_cliente')
                .select('*')
                .eq('id', documento_id)
                .single()
              if (docError || !doc)
                throw new Error(`Erro ao buscar documento: ${docError?.message}`)
              docRecord = doc
            }

            const { error: uploadError } = await supabase.storage
              .from('bender_clientes')
              .upload(docRecord.arquivo_url, pdfBytes, {
                contentType: 'application/pdf',
                upsert: true,
              })

            if (uploadError)
              throw new Error(`Falha no upload do arquivo atualizado: ${uploadError.message}`)

            await supabase
              .from('documentos_cliente')
              .update({
                status: 'gerado',
                conteudo_preenchido: conteudo_html,
              })
              .eq('id', documento_id)
          }
        } catch (err: any) {
          console.error('Erro no processamento assíncrono de PDF:', err)
          if (
            documento_id &&
            (action === 'salvar_novo_async' || action === 'atualizar_pdf_async')
          ) {
            await supabase
              .from('documentos_cliente')
              .update({ status: 'erro_geracao' })
              .eq('id', documento_id)
          }
        }
      }

      if (action === 'salvar_novo_async' || action === 'atualizar_pdf_async') {
        // Tenta executar em background se suportado
        if (
          typeof (globalThis as any).EdgeRuntime !== 'undefined' &&
          typeof (globalThis as any).EdgeRuntime.waitUntil === 'function'
        ) {
          ;(globalThis as any).EdgeRuntime.waitUntil(processPdfAsync())
        } else {
          processPdfAsync().catch(console.error)
        }
        return new Response(
          JSON.stringify({ success: true, message: 'Processamento em segundo plano iniciado.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      } else {
        await processPdfAsync()
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    throw new Error('Ação inválida')
  } catch (error: any) {
    console.error('Erro na função gerar_documento_cliente:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Erro desconhecido',
        stack: error.stack,
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
