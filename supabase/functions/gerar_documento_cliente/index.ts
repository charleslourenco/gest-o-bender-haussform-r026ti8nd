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
  }
  for (const [char, replacement] of Object.entries(unicodeMap)) {
    safeHtml = safeHtml.split(char).join(replacement)
  }
  safeHtml = safeHtml.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '')
  safeHtml = safeHtml.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')

  // Convert tables to ||| format
  safeHtml = safeHtml.replace(/<tr[^>]*>/gi, '\n')
  safeHtml = safeHtml.replace(/<\/tr>/gi, '')
  safeHtml = safeHtml.replace(/<th[^>]*>/gi, '')
  safeHtml = safeHtml.replace(/<\/th>/gi, ' ||| ')
  safeHtml = safeHtml.replace(/<td[^>]*>/gi, '')
  safeHtml = safeHtml.replace(/<\/td>/gi, ' ||| ')

  // Newlines for blocks
  safeHtml = safeHtml.replace(/<\/(p|div|h1|h2|h3|h4|h5|h6|li)>/gi, '\n')
  safeHtml = safeHtml.replace(/<(br|hr)\s*\/?>/gi, '\n')

  // Strip remaining tags
  const text = safeHtml
    .replace(/<[^>]+>/g, '')
    .replace(/\n\s*\n/g, '\n')
    .trim()

  const checkPageBreak = (needed: number) => {
    if (currentY - needed < margin) {
      page = pdfDoc.addPage([pageWidth, pageHeight])
      currentY = pageHeight - margin
    }
  }

  const wrapText = (textStr: string, font: any, size: number) => {
    const words = textStr.split(' ')
    let lines = []
    let currentLine = ''
    for (const word of words) {
      if (!word) continue
      const testLine = currentLine ? `${currentLine} ${word}` : word
      const width = font.widthOfTextAtSize(testLine, size)
      if (width > maxWidth) {
        if (currentLine) lines.push(currentLine)
        if (font.widthOfTextAtSize(word, size) > maxWidth) {
          let brokenWord = ''
          for (const char of word) {
            if (font.widthOfTextAtSize(brokenWord + char + '-', size) > maxWidth) {
              lines.push(brokenWord + '-')
              brokenWord = char
            } else {
              brokenWord += char
            }
          }
          currentLine = brokenWord
        } else {
          currentLine = word
        }
      } else {
        currentLine = testLine
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

    if (rawLine.includes(' ||| ')) {
      const cells = rawLine.split(' ||| ').filter((c) => c.trim() !== '')
      if (cells.length === 0) continue

      const colWidth = maxWidth / cells.length
      const rowHeight = 20
      checkPageBreak(rowHeight)

      let currentX = margin
      for (let c = 0; c < cells.length; c++) {
        const cellText = cells[c].trim()
        const cellFont = i === 0 || rawLine.toUpperCase() === rawLine ? fontBold : fontRegular
        page.drawRectangle({
          x: currentX,
          y: currentY - 14,
          width: colWidth,
          height: rowHeight,
          borderColor: rgb(0, 0, 0),
          borderWidth: 0.5,
          color: rgb(1, 1, 1),
        })

        let displayTxt = cellText
        if (cellFont.widthOfTextAtSize(displayTxt, 10) > colWidth - 4) {
          let truncated = ''
          for (const char of cellText) {
            if (cellFont.widthOfTextAtSize(truncated + char + '...', 10) > colWidth - 4) break
            truncated += char
          }
          displayTxt = truncated + '...'
        }
        const dtW = cellFont.widthOfTextAtSize(displayTxt, 10)
        page.drawText(displayTxt, {
          x: currentX + (colWidth - dtW) / 2,
          y: currentY - 10,
          size: 10,
          font: cellFont,
          color: rgb(0, 0, 0),
        })
        currentX += colWidth
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

      const width = font.widthOfTextAtSize(wl, size)
      let x = margin

      if (align === 'center') {
        x = margin + Math.max(0, (maxWidth - width) / 2)
        page.drawText(wl, { x, y: currentY, size, font, color: rgb(0, 0, 0) })
      } else if (align === 'justify' && j < wrappedLines.length - 1 && width > maxWidth * 0.7) {
        const words = wl.split(' ')
        if (words.length > 1) {
          const textWidth = font.widthOfTextAtSize(wl.replace(/\s+/g, ''), size)
          const spaceWidth = (maxWidth - textWidth) / (words.length - 1)
          if (spaceWidth < font.widthOfTextAtSize(' ', size) * 3) {
            let cx = margin
            for (const word of words) {
              page.drawText(word, { x: cx, y: currentY, size, font, color: rgb(0, 0, 0) })
              cx += font.widthOfTextAtSize(word, size) + spaceWidth
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
    const tw = fontRegular.widthOfTextAtSize(pageText, 8)
    p.drawText(pageText, { x: pageWidth - margin - tw, y: footerY, size: 8, font: fontRegular })
  }

  return await pdfDoc.save()
}

async function convertHtmlToPdf(html: string): Promise<Uint8Array> {
  const apiKey = Deno.env.get('HTML2PDF_API_KEY') || Deno.env.get('PDF_API_KEY') || ''

  try {
    const response = await fetch('https://api.html2pdf.app/v1/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({ html, apiKey }),
    })

    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer()
      return new Uint8Array(arrayBuffer)
    } else {
      console.error(`API HTML2PDF falhou: ${response.status} - ${await response.text()}`)
    }
  } catch (err) {
    console.error('Erro na requisição HTML2PDF:', err)
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
        .from('document_templates')
        .select('conteudo')
        .ilike('nome', template_nome.trim())
        .limit(1)
        .maybeSingle()

      if (tplError)
        throw new Error(`Erro ao buscar template '${template_nome}': ${tplError.message}`)
      if (!template)
        throw new Error(`Template '${template_nome}' não encontrado no banco de dados.`)

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

      let conteudoFinal = template.conteudo
      for (const [key, value] of Object.entries(placeholders)) {
        const safeValue = typeof value === 'string' ? value : ''
        conteudoFinal = conteudoFinal.split(key).join(safeValue)
      }

      if (action === 'pre_gerar') {
        return new Response(JSON.stringify({ success: true, conteudo_preenchido: conteudoFinal }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Legacy fallback for gerar_novo
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
    } else if (action === 'salvar_novo' || action === 'atualizar_pdf') {
      if (!conteudo_editado) throw new Error('conteudo_editado é obrigatório')

      const pdfBytes = await convertHtmlToPdf(conteudo_editado)

      if (action === 'salvar_novo') {
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
            conteudo_preenchido: conteudo_editado,
          })
          .select()
          .single()

        if (docError) throw new Error(`Erro ao salvar registro do documento: ${docError.message}`)

        return new Response(JSON.stringify({ success: true, documento: docRecord }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      } else {
        if (!documento_id) throw new Error('documento_id é obrigatório para atualizar')

        const { data: doc, error: docError } = await supabase
          .from('documentos_cliente')
          .select('*')
          .eq('id', documento_id)
          .maybeSingle()

        if (docError) throw new Error(`Erro ao buscar documento: ${docError.message}`)
        if (!doc) throw new Error('Documento não encontrado')

        await supabase
          .from('documentos_cliente')
          .update({ conteudo_preenchido: conteudo_editado })
          .eq('id', documento_id)

        const { error: uploadError } = await supabase.storage
          .from('bender_clientes')
          .upload(doc.arquivo_url, pdfBytes, { contentType: 'application/pdf', upsert: true })

        if (uploadError)
          throw new Error(`Falha no upload do arquivo atualizado: ${uploadError.message}`)

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
