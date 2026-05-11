import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1'

const corsHeaders = {
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
    const { action, cliente_id, template_nome, documento_id, conteudo_editado, dados_extras } = body

    let logoBytes: Uint8Array | null = null
    try {
      const { data: logoData } = await supabase.storage
        .from('bender_templates')
        .download('logo.png')
      if (logoData) {
        logoBytes = new Uint8Array(await logoData.arrayBuffer())
      }
    } catch (e) {
      console.warn('Logo not found', e)
    }

    if (action === 'gerar_novo') {
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
      const datas = safeForm.datas || {}
      const pagamentosArr = Array.isArray(safeForm.pagamentos)
        ? safeForm.pagamentos
        : [safeForm.pagamentos || {}]
      const pagData = pagamentosArr[0] || {}
      const produtos = safeForm.produtos_servicos || []

      const subtotal = produtos.reduce(
        (acc: number, p: any) =>
          acc + Number(p.valor_unitario || 0) * Number(p.qtd || p.quantidade || 1),
        0,
      )
      const desconto = Number(safeForm.desconto || 0)
      const total = Math.max(0, subtotal - desconto)

      let blocoProdutos = ''
      if (produtos.length === 0) {
        blocoProdutos = '______________'
      } else {
        blocoProdutos = 'PRODUTO E SERVIÇO ||| QTD ||| V. UNIT. ||| TOTAL\n'
        produtos.forEach((p: any) => {
          const nome = p.nome || p.descricao || p.nome_produto || 'Item'
          const qtd = Number(p.qtd || p.quantidade || 1)
          const vu = Number(p.valor_unitario || p.valor || 0)
          blocoProdutos += `${nome} ||| ${qtd} ||| ${formatCurrency(vu)} ||| ${formatCurrency(qtd * vu)}\n`
        })
        blocoProdutos += `Subtotal ||| ||| ||| ${formatCurrency(subtotal)}\n`
        blocoProdutos += `Desconto ||| ||| ||| ${formatCurrency(desconto)}\n`
        blocoProdutos += `TOTAL ||| ||| ||| ${formatCurrency(total)}`
      }

      const formaPagamento = pagData.forma || 'À vista'
      const metodoPagamento = pagData.meio || ''
      const dataVenda = datas.data_venda || ''
      let blocoParcelasText = ''

      if (formaPagamento === 'À vista') {
        blocoParcelasText = `O pagamento será realizado à vista no valor de ${formatCurrency(total)} a ser pago no dia ${formatDateStr(dataVenda)} por meio de ${metodoPagamento}.`
      } else {
        const parcelas = pagData.parcelas || []
        const numParcelas = parcelas.length
        if (numParcelas > 0) {
          const descricoesParcelas = parcelas
            .map((p: any, index: number) => {
              const numOrdem = index + 1
              const valParcela = Number(p.valor || total / numParcelas || 0)
              const dataVenc = p.data || p.vencimento || ''
              return `a ${numOrdem}ª parcela no valor de ${formatCurrency(valParcela)} com vencimento em ${formatDateStr(dataVenc)}`
            })
            .join('; ')
          blocoParcelasText = `O pagamento será realizado em ${numParcelas} parcelas por meio de ${metodoPagamento}, sendo: ${descricoesParcelas}.`
        }
      }

      const mesExtenso = [
        'janeiro',
        'fevereiro',
        'março',
        'abril',
        'maio',
        'junho',
        'julho',
        'agosto',
        'setembro',
        'outubro',
        'novembro',
        'dezembro',
      ]
      const hoje = new Date()
      const dataContratoExtenso = `${hoje.getDate()} de ${mesExtenso[hoje.getMonth()]} de ${hoje.getFullYear()}`

      const placeholders: Record<string, string> = {
        '[CLIENTE_NOME]': cli.nome || '',
        '[CLIENTE_CPF_CNPJ]': safeForm.cpf || cli.cpf || '',
        '[CLIENTE_PROFISSAO]': safeForm.profissao || cli.profissao || '',
        '[CLIENTE_ESTADO_CIVIL]': safeForm.estado_civil || '',
        '[CLI_EMAIL]': cli.email || '',
        '[CLIENTE_TELEFONE]': cli.telefone || '',
        '[CLIENTE_CEP]': safeForm.cep || cli.cep || '',
        '[CLIENTE_RUA]': safeForm.rua || cli.endereco_obra || '',
        '[CLIENTE_NUMERO]': safeForm.numero || cli.numero || '',
        '[CLIENTE_COMPLEMENTO]': safeForm.complemento || cli.complemento || '',
        '[CLIENTE_BAIRRO]': safeForm.bairro || cli.bairro || '',
        '[CLIENTE_CIDADE]': safeForm.municipio || cli.cidade || '',
        '[CLIENTE_ESTADO]': safeForm.estado || cli.estado || '',
        '[OBRA_CEP]': safeForm.obra_cep || '',
        '[OBRA_RUA]': safeForm.obra_rua || '',
        '[OBRA_NUMERO]': safeForm.obra_numero || '',
        '[OBRA_COMPLEMENTO]': safeForm.obra_complemento || '',
        '[OBRA_BAIRRO]': safeForm.obra_bairro || '',
        '[OBRA_CIDADE]': safeForm.obra_municipio || '',
        '[OBRA_ESTADO]': safeForm.obra_estado || '',
        '[OBRA_ENDERECO_COMPLETO]': `${safeForm.obra_rua || ''}, ${safeForm.obra_numero || ''} - ${safeForm.obra_bairro || ''}, ${safeForm.obra_municipio || ''}`,
        '[METODO_PAGAMENTO]': metodoPagamento || '',
        '[DATA_PAGAMENTO]': formatDateStr(dataVenda) || '',
        '[DATA_PREVISTA_ENTREGA_IMOVEL]': formatDateStr(datas.data_acesso_imovel || '') || '',
        '[DATA_CONTRATO_EXTENSO]': dataContratoExtenso || '',
        '[BLOCO_PRODUTOS_SERVICOS]': blocoProdutos || '',
        '[BLOCO_PARCELAS_TEXTO]': blocoParcelasText || '',
        '[DATA_INICIO_GARANTIA]': formatDateStr(new Date().toISOString().split('T')[0]),
        '[DATA_SOLICITACAO]': formatDateStr(new Date().toISOString().split('T')[0]),
        '[DATA_VISTORIA]': formatDateStr(new Date().toISOString().split('T')[0]),
        '[DATA_OCORRENCIA]': formatDateStr(new Date().toISOString().split('T')[0]),
        '[DESCRICAO_ALTERACAO]': dados_extras?.descricao_alteracao || '',
        '[DESCRICAO_OCORRENCIA]': dados_extras?.descricao_ocorrencia || '',
        '[REPRESENTANTE_NOME]': dados_extras?.representante_nome || '',
        '[REPRESENTANTE_CPF]': dados_extras?.representante_cpf || '',
      }

      let conteudoFinal = template.conteudo
      for (const [key, value] of Object.entries(placeholders)) {
        const replacement = value || '_______________'
        conteudoFinal = conteudoFinal.split(key).join(replacement)
      }

      const cidadeForFooter = safeForm.municipio || cli.cidade || 'Balneário Piçarras'
      const pdfBytes = await generatePdfFromText(conteudoFinal, cidadeForFooter, logoBytes)

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
    } else if (action === 'atualizar_pdf') {
      if (!documento_id || !conteudo_editado)
        throw new Error('documento_id e conteudo_editado são obrigatórios')

      const { data: doc, error: docError } = await supabase
        .from('documentos_cliente')
        .select('*, clientes(cidade)')
        .eq('id', documento_id)
        .maybeSingle()

      if (docError) throw new Error(`Erro ao buscar documento: ${docError.message}`)
      if (!doc) throw new Error('Documento não encontrado')

      await supabase
        .from('documentos_cliente')
        .update({ conteudo_preenchido: conteudo_editado })
        .eq('id', documento_id)

      const cidadeForFooter = doc.clientes?.cidade || 'Balneário Piçarras'
      const pdfBytes = await generatePdfFromText(conteudo_editado, cidadeForFooter, logoBytes)

      const { error: uploadError } = await supabase.storage
        .from('bender_clientes')
        .upload(doc.arquivo_url, pdfBytes, { contentType: 'application/pdf', upsert: true })

      if (uploadError)
        throw new Error(`Falha no upload do arquivo atualizado: ${uploadError.message}`)

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
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

async function generatePdfFromText(text: string, cidade: string, logoBytes: Uint8Array | null) {
  const emojiMap: Record<string, string> = {
    '🎨': '[Estilo]',
    '👤': '[Cliente]',
    '📐': '[Analista]',
    '🔨': '[Montador]',
    '✦': '•',
    '🧑‍💻': '[Projeto]',
    '⚙️': '[Fabricação]',
    '🚚': '[Entrega]',
    '👷': '[Montagem]',
    '☑️': '[X]',
    '✖️': '[ ]',
    '⚠️': '[Atenção]',
    '📦': '[Logística]',
    '🔹': '•',
    '🏗️': '[Acompanhamento]',
    '🎭': '[Ambientação]',
    '🤝': '[Termo]',
    '🛡️': '[Garantia]',
    '📣': '[Comunicados]',
    '📄': '[Documento]',
    '📒': '[Caderno]',
    '✅': '[X]',
    '❌': '[ ]',
  }
  let safeText = text
  for (const [emoji, replacement] of Object.entries(emojiMap)) {
    safeText = safeText.split(emoji).join(replacement)
  }

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
    '\u201C': '"',
    '\u201D': '"',
    '\u2018': "'",
    '\u2019': "'",
    '\u2013': '-',
    '\u2014': '-',
    '\u2026': '...',
  }
  for (const [char, replacement] of Object.entries(unicodeMap)) {
    safeText = safeText.split(char).join(replacement)
  }

  safeText = safeText.replace(/[^\x20-\x7E\xA0-\xFF\n\r\t]/g, '')

  const pdfDoc = await PDFDocument.create()
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const margin = 85 // 3cm
  const pageWidth = 595.28
  const pageHeight = 841.89
  const maxWidth = pageWidth - margin * 2

  let page = pdfDoc.addPage([pageWidth, pageHeight])
  let currentY = pageHeight - margin
  let isFirstPage = true

  const drawHeader = async (p: any, isFirst: boolean) => {
    if (isFirst && logoBytes) {
      try {
        const image = await pdfDoc.embedPng(logoBytes)
        const scale = 120 / image.width
        const imgDims = { width: image.width * scale, height: image.height * scale }
        p.drawImage(image, {
          x: (pageWidth - imgDims.width) / 2,
          y: pageHeight - margin + 20,
          width: imgDims.width,
          height: imgDims.height,
        })
        return imgDims.height + 10
      } catch (e) {
        console.warn('Failed to embed logo', e)
      }
    }
    return 0
  }

  const checkPageBreak = (needed: number) => {
    if (currentY - needed < margin) {
      page = pdfDoc.addPage([pageWidth, pageHeight])
      currentY = pageHeight - margin
      isFirstPage = false
    }
  }

  let logoOffset = await drawHeader(page, true)
  if (logoOffset > 0) {
    currentY -= logoOffset
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

        // If a single word is larger than maxWidth, break it
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

  const drawJustifiedLine = (
    p: any,
    text: string,
    y: number,
    font: any,
    size: number,
    color: any,
  ) => {
    const words = text.split(' ')
    if (words.length <= 1) {
      p.drawText(text, { x: margin, y, size, font, color })
      return
    }
    const textWidth = font.widthOfTextAtSize(text.replace(/\s+/g, ''), size)
    const spaceWidth = (maxWidth - textWidth) / (words.length - 1)

    if (spaceWidth > font.widthOfTextAtSize(' ', size) * 3) {
      p.drawText(text, { x: margin, y, size, font, color })
      return
    }

    let currentX = margin
    for (const word of words) {
      p.drawText(word, { x: currentX, y, size, font, color })
      currentX += font.widthOfTextAtSize(word, size) + spaceWidth
    }
  }

  const rawLines = safeText.split('\n')
  for (let i = 0; i < rawLines.length; i++) {
    const rawLine = rawLines[i].trim()
    if (!rawLine) {
      currentY -= 10 * 1.5
      continue
    }

    if (rawLine.includes(' ||| ')) {
      const cells = rawLine.split(' ||| ')
      const cellWidths = [maxWidth * 0.45, maxWidth * 0.15, maxWidth * 0.2, maxWidth * 0.2]
      const rowHeight = 20
      checkPageBreak(rowHeight)

      let currentX = margin
      for (let c = 0; c < Math.min(cells.length, 4); c++) {
        const text = cells[c].trim()
        const cellFont =
          i === 0 || text.toUpperCase() === 'TOTAL' || rawLine.startsWith('PRODUTO')
            ? fontBold
            : fontRegular
        page.drawRectangle({
          x: currentX,
          y: currentY - 14,
          width: cellWidths[c],
          height: rowHeight,
          borderColor: rgb(0, 0, 0),
          borderWidth: 0.5,
          color: rgb(1, 1, 1),
        })
        const textW = cellFont.widthOfTextAtSize(text, 10)

        let displayTxt = text
        if (textW > cellWidths[c] - 4) {
          let truncated = ''
          for (const char of text) {
            if (cellFont.widthOfTextAtSize(truncated + char + '...', 10) > cellWidths[c] - 4) break
            truncated += char
          }
          displayTxt = truncated + '...'
        }
        const dtW = cellFont.widthOfTextAtSize(displayTxt, 10)
        page.drawText(displayTxt, {
          x: currentX + (cellWidths[c] - dtW) / 2,
          y: currentY - 10,
          size: 10,
          font: cellFont,
          color: rgb(0, 0, 0),
        })
        currentX += cellWidths[c]
      }
      currentY -= rowHeight
      continue
    }

    const isMainTitle =
      i === 0 ||
      rawLine.startsWith('CONTRATO UNIFICADO') ||
      rawLine.startsWith('TERMO DE ') ||
      rawLine.startsWith('PROPOSTA')
    const isClauseTitle = rawLine.toUpperCase() === rawLine && rawLine.startsWith('CLÁUSULA')
    const isSubtitle = /^[0-9]+\.[0-9]+/.test(rawLine)

    let font = fontRegular
    let size = 10
    let align = 'justify'

    if (isMainTitle) {
      font = fontBold
      size = 15
      align = 'center'
      currentY -= 15
    } else if (isClauseTitle) {
      font = fontBold
      size = 13
      align = 'left'
      currentY -= 15
    } else if (isSubtitle) {
      font = fontBold
      size = 10
      align = 'left'
    } else if (
      rawLine.startsWith('[X]') ||
      rawLine.startsWith('[ ]') ||
      rawLine.startsWith('[Atenção]')
    ) {
      align = 'left'
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
        drawJustifiedLine(page, wl, currentY, font, size, rgb(0, 0, 0))
      } else {
        page.drawText(wl, { x, y: currentY, size, font, color: rgb(0, 0, 0) })
      }

      currentY -= lineHeight
    }

    if (isClauseTitle || isMainTitle) {
      currentY -= 12
    }
  }

  const pages = pdfDoc.getPages()
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i]
    const footerY = margin - 20
    p.drawText(`Bender Haussform — ${cidade}/SC`, {
      x: margin,
      y: footerY,
      size: 8,
      font: fontRegular,
    })
    const pageText = `Página ${i + 1} de ${pages.length}`
    const tw = fontRegular.widthOfTextAtSize(pageText, 8)
    p.drawText(pageText, { x: pageWidth - margin - tw, y: footerY, size: 8, font: fontRegular })
  }

  return await pdfDoc.save()
}
