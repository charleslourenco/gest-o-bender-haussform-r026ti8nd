import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, x-supabase-client-platform, apikey, content-type',
}

async function generatePdfFromText(text: string, cidade: string, logoBytes: Uint8Array | null) {
  let safeText = text

  // Remove any template artifacts
  safeText = safeText.replace(/_{2,}CELL_{2,}/gi, '')

  // Remove style and scripts before stripping tags
  safeText = safeText.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
  safeText = safeText.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')

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
    '🎨': '',
    '👤': '',
    '📐': '',
    '🔨': '',
    '✦': '-',
    '🧑‍💻': '',
    '⚙️': '',
    '🚚': '',
    '👷': '',
    '☑️': '[X]',
    '✖️': '[ ]',
    '⚠️': '!',
    '📦': '',
    '🔹': '-',
    '🏗️': '',
    '🎭': '',
    '🤝': '',
    '🛡️': '',
    '📣': '',
    '📄': '',
    '📒': '',
    '✅': '[X]',
    '❌': '[ ]',
    '·': '.',
    '•': '.',
    '✓': '[X]',
    '✔': '[X]',
    '✗': '[ ]',
    '✘': '[ ]',
  }
  for (const [char, replacement] of Object.entries(unicodeMap)) {
    safeText = safeText.split(char).join(replacement)
  }

  // Remove ANY character that is not ASCII or Latin-1 Supplement (to avoid pdf-lib WinAnsi crash)
  safeText = safeText.replace(/[^\x20-\x7E\xA0-\xFF\n\r\t<>]/g, '')

  // Convert tables to __CELL__ format
  safeText = safeText.replace(/<tr[^>]*>/gi, '\n')
  safeText = safeText.replace(/<\/tr>/gi, '\n')
  safeText = safeText.replace(/<th[^>]*>/gi, '')
  safeText = safeText.replace(/<\/th>/gi, ' __CELL__ ')
  safeText = safeText.replace(/<td[^>]*>/gi, '')
  safeText = safeText.replace(/<\/td>/gi, ' __CELL__ ')

  // Preserve page breaks
  safeText = safeText.replace(
    /<[^>]*class="[^"]*page-break[^"]*"[^>]*>/gi,
    '\n---PAGE-BREAK---\n$&',
  )

  // Newlines for blocks
  safeText = safeText.replace(/<\/(p|div|h1|h2|h3|h4|h5|h6|li)>/gi, '\n')
  safeText = safeText.replace(/<(br|hr)\s*\/?>/gi, '\n')

  // Strip remaining tags
  safeText = safeText
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\n\s*\n/g, '\n')
    .trim()

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

  const wordWidthCache = new Map<string, number>()
  const getWordW = (w: string, f: any, s: number) => {
    const k = `${w}_${s}_${f === fontBold ? 'b' : 'r'}`
    if (wordWidthCache.has(k)) return wordWidthCache.get(k)!
    const wd = f.widthOfTextAtSize(w, s)
    wordWidthCache.set(k, wd)
    return wd
  }
  const spaceW = (f: any, s: number) => getWordW(' ', f, s)

  const wrapText = (textStr: string, font: any, size: number) => {
    const words = textStr.split(' ')
    const lines = []
    let currentLine = ''
    let curWidth = 0
    const sw = spaceW(font, size)

    for (const word of words) {
      if (!word) continue
      const ww = getWordW(word, font, size)

      if (!currentLine) {
        if (ww > maxWidth) {
          let brokenWord = ''
          let bwW = 0
          for (const char of word) {
            const cw = getWordW(char, font, size)
            if (bwW + cw + getWordW('-', font, size) > maxWidth) {
              lines.push(brokenWord + '-')
              brokenWord = char
              bwW = cw
            } else {
              brokenWord += char
              bwW += cw
            }
          }
          currentLine = brokenWord
          curWidth = bwW
        } else {
          currentLine = word
          curWidth = ww
        }
      } else {
        if (curWidth + sw + ww > maxWidth) {
          lines.push(currentLine)
          currentLine = word
          curWidth = ww
        } else {
          currentLine += ' ' + word
          curWidth += sw + ww
        }
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
    const textWidth = getWordW(text.replace(/\s+/g, ''), font, size)
    const spaceWidth = (maxWidth - textWidth) / (words.length - 1)

    if (spaceWidth > spaceW(font, size) * 3) {
      p.drawText(text, { x: margin, y, size, font, color })
      return
    }

    let currentX = margin
    for (const word of words) {
      p.drawText(word, { x: currentX, y, size, font, color })
      currentX += getWordW(word, font, size) + spaceWidth
    }
  }

  const rawLines = safeText.split('\n')
  for (let i = 0; i < rawLines.length; i++) {
    const rawLine = rawLines[i].trim()
    if (!rawLine) {
      currentY -= 10 * 1.5
      continue
    }

    if (rawLine === '---PAGE-BREAK---') {
      page = pdfDoc.addPage([pageWidth, pageHeight])
      currentY = pageHeight - margin
      isFirstPage = false
      continue
    }

    if (rawLine.includes(' __CELL__ ')) {
      const cleanLine = rawLine.replace(/ __CELL__ \s*$/, '')
      const cells = cleanLine.split(' __CELL__ ')
      if (cells.length === 0 || (cells.length === 1 && cells[0].trim() === '')) continue

      let cellWidths: number[] = []
      if (cells.length === 4) {
        cellWidths = [maxWidth * 0.45, maxWidth * 0.15, maxWidth * 0.2, maxWidth * 0.2]
      } else {
        const cw = maxWidth / cells.length
        cellWidths = Array(cells.length).fill(cw)
      }

      const cellFont =
        i === 0 || rawLine.toUpperCase().includes('TOTAL') || rawLine.startsWith('PRODUTO')
          ? fontBold
          : fontRegular

      const cellsLines = cells.map((cellText, c) => {
        const widthLimit = cellWidths[c] - 8
        const words = cellText.trim().split(' ')
        let lines = []
        let curLine = ''
        for (const word of words) {
          if (!word) continue
          const testLine = curLine ? curLine + ' ' + word : word
          if (getWordW(testLine, cellFont, 10) <= widthLimit) {
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

      const width = getWordW(wl, font, size)
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Header Authorization não encontrado.')
    }

    const { formulario_comercial_id, cliente_id, user_id } = await req.json()

    if (!formulario_comercial_id || !cliente_id || !user_id) {
      throw new Error('Os campos formulario_comercial_id, cliente_id e user_id são obrigatórios.')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    })

    console.log('1. Validando dados e buscando formulario...')
    const { data: form, error: formError } = await supabase
      .from('formulario_comercial')
      .select(
        '*, cliente:clientes(nome, cpf, email, telefone, bairro, cidade, estado, cep, numero, complemento, endereco_obra)',
      )
      .eq('id', formulario_comercial_id)
      .single()

    if (formError || !form) {
      throw new Error('Formulário comercial não encontrado.')
    }

    let vendedorNome = ''
    let vendedorEmail = ''
    let vendedorTelefone = ''
    let vendedorCpf = ''

    if (form.user_id || form.usuario_id) {
      const uid = form.user_id || form.usuario_id
      const { data: user } = await supabase.from('users').select('*').eq('id', uid).single()
      if (user) {
        vendedorNome = user.nome || ''
        vendedorEmail = user.email || ''
        vendedorTelefone = user.telefone || ''
      }
    }

    const vendedorNomeEtapa = (form.dados_etapa_1 as any)?.vendedor_nome || vendedorNome

    console.log('2. Buscando templates...')
    const { data: templates, error: tempError } = await supabase
      .from('templates')
      .select('*')
      .in('tipo', ['contrato', 'termo_conclusao', 'termo_garantia'])

    if (tempError) throw new Error(`Erro ao buscar templates: ${tempError.message}`)
    if (!templates || templates.length === 0) {
      throw new Error(
        'Nenhum template encontrado. Suba os templates na aba Administrativo > Templates.',
      )
    }

    const clienteNome = form.cliente?.nome || ''
    const cpf = form.cliente?.cpf || form.cpf || ''
    const email = form.cliente?.email || ''
    const telefone = form.cliente?.telefone || ''
    const profissao = form.profissao || ''
    const estado_civil = form.estado_civil || ''
    const end_cep = form.cep || form.cliente?.cep || ''
    const end_rua = form.rua || form.cliente?.endereco_obra || ''
    const end_numero = form.numero || form.cliente?.numero || ''
    const end_complemento = form.complemento || form.cliente?.complemento || ''
    const end_cidade = form.municipio || form.cliente?.cidade || ''
    const end_estado = form.estado || form.cliente?.estado || ''

    const obra_cep = form.obra_cep || ''
    const obra_rua = form.obra_rua || ''
    const obra_numero = form.obra_numero || ''
    const obra_complemento = form.obra_complemento || ''
    const obra_cidade = form.obra_municipio || ''
    const obra_estado = form.obra_estado || ''

    const datas = (form.datas as any) || {}
    const data_acesso_movel = datas.medida || ''
    const data_assinatura_contrato = new Date().toISOString().split('T')[0]
    const data_venda = datas.data_venda || data_assinatura_contrato

    const produtos = (form.produtos_servicos as any[]) || []
    const valorTotal = Array.isArray(produtos)
      ? produtos.reduce(
          (acc: number, p: any) => acc + (Number(p.valor_unitario) || 0) * (Number(p.qtd) || 1),
          0,
        ) - (Number(form.desconto) || 0)
      : 0

    const pagamentos = (form.pagamentos as any) || {}
    const forma_pagamento = pagamentos.forma === 'A_VISTA' ? 'À Vista' : 'Parcelado'
    const parcelas = pagamentos.parcelado || []

    const formatCurrency = (val: number) =>
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
    const formatDate = (dateStr: string) => {
      if (!dateStr) return ''
      const [y, m, d] = dateStr.split('-')
      return `${d}/${m}/${y}`
    }

    let bloco_produtos = produtos
      .map(
        (p: any) =>
          `${p.nome || p.nome_produto} - Qtd: ${p.qtd} - Valor: ${formatCurrency(p.valor_unitario)}`,
      )
      .join('\n')

    let bloco_parcelas = ''
    if (pagamentos.forma === 'A_VISTA') {
      const p_vista = pagamentos.a_vista || {}
      bloco_parcelas = `Data: ${formatDate(p_vista.data)} - Meio: ${p_vista.meio} - Valor: ${formatCurrency(valorTotal)}`
    } else {
      bloco_parcelas = parcelas
        .map(
          (p: any, i: number) =>
            `Parcela ${i + 1}: ${formatDate(p.data)} - ${formatCurrency(p.valor)} - ${p.meio}`,
        )
        .join('\n')
    }

    const placeholders: Record<string, string> = {
      '{{CLIENTE_NOME}}': clienteNome,
      '{{CLIENTE_CPF_CNPJ}}': cpf,
      '{{CLIENTE_PROFISSAO}}': profissao,
      '{{CLIENTE_ESTADO_CIVIL}}': estado_civil,
      '{{CLIENTE_TELEFONE}}': telefone,
      '{{CLIENTE_EMAIL}}': email,
      '{{CLIENTE_CEP}}': end_cep,
      '{{CLIENTE_RUA}}': end_rua,
      '{{CLIENTE_NUMERO}}': end_numero,
      '{{CLIENTE_COMPLEMENTO}}': end_complemento,
      '{{CLIENTE_CIDADE}}': end_cidade,
      '{{CLIENTE_ESTADO}}': end_estado,
      '{{OBRA_CEP}}': obra_cep,
      '{{OBRA_RUA}}': obra_rua,
      '{{OBRA_NUMERO}}': obra_numero,
      '{{OBRA_COMPLEMENTO}}': obra_complemento,
      '{{OBRA_CIDADE}}': obra_cidade,
      '{{OBRA_ESTADO}}': obra_estado,
      '{{DATA_ACESSO_MOVEL}}': formatDate(data_acesso_movel),
      '{{DATA_ASSINATURA_CONTRATO}}': formatDate(data_assinatura_contrato),
      '{{TESTEMUNHA_01_NOME}}': '',
      '{{TESTEMUNHA_01_CPF}}': '',
      '{{TESTEMUNHA_02_NOME}}': '',
      '{{TESTEMUNHA_02_CPF}}': '',
      '{{ASSINANTE_NOME}}': clienteNome,
      '{{ASSINANTE_CPF}}': cpf,
      '{{BLOCO_PRODUTOS_SERVICOS}}': bloco_produtos,
      ...Array.from({ length: 12 }).reduce((acc: any, _, i) => {
        const p = produtos[i] || {}
        acc[`{{PRODUTO_LINHA_${i + 1}_NOME}}`] = p.nome || p.nome_produto || ''
        acc[`{{PRODUTO_LINHA_${i + 1}_DESCRICAO}}`] = p.descricao || ''
        acc[`{{PRODUTO_LINHA_${i + 1}_VALOR}}`] = p.valor_unitario
          ? formatCurrency(p.valor_unitario)
          : ''
        return acc
      }, {}),
      '{{FORMA_PAGAMENTO}}': forma_pagamento,
      '{{BLOCO_PARCELAS}}': bloco_parcelas,
      ...Array.from({ length: 12 }).reduce((acc: any, _, i) => {
        const p = parcelas[i] || {}
        acc[`{{PARCELA_${i + 1}_NUMERO}}`] = p.id ? `${i + 1}` : ''
        acc[`{{PARCELA_${i + 1}_VALOR}}`] = p.valor ? formatCurrency(p.valor) : ''
        acc[`{{PARCELA_${i + 1}_DATA_VENCIMENTO}}`] = p.data ? formatDate(p.data) : ''
        return acc
      }, {}),
      '{{EMPRESA_NOME}}': 'Bender Haussform',
      '{{EMPRESA_CNPJ}}': '00.000.000/0001-00',
      '{{EMPRESA_ENDERECO}}': 'Balneário Piçarras - SC',
      '{{EMPRESA_TELEFONE}}': '(00) 0000-0000',
      '{{EMPRESA_EMAIL}}': 'projetos@benderhaussform.com',
      '{{VENDEDOR_NOME}}': vendedorNomeEtapa,
      '{{VENDEDOR_CPF}}': vendedorCpf,
      '{{VENDEDOR_EMAIL}}': vendedorEmail,
      '{{VENDEDOR_TELEFONE}}': vendedorTelefone,
      '{{NUMERO_PROJETO}}': formulario_comercial_id.substring(0, 8).toUpperCase(),
      '{{VALOR_TOTAL}}': formatCurrency(valorTotal),
      '{{DATA_VENDA}}': formatDate(data_venda),
    }

    const urlsDocumentos: Record<string, string> = {
      contrato_url: '',
      termo_conclusao_url: '',
      termo_garantia_url: '',
    }

    let documentos_preenchidos = []

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

    console.log('3. Processando Templates e salvando em storage...')
    for (const template of templates) {
      if (!template.arquivo_url) continue

      let fileText = ''
      try {
        console.log(`Baixando template ${template.nome}...`)
        if (template.arquivo_url.startsWith('http')) {
          const res = await fetch(template.arquivo_url)
          if (!res.ok) throw new Error(`Status ${res.status}`)
          fileText = await res.text()
        } else {
          const { data: fileData, error: downloadError } = await supabase.storage
            .from('bender_templates')
            .download(template.arquivo_url)
          if (downloadError) throw downloadError
          if (fileData) {
            fileText = await fileData.text()
          }
        }

        if (fileText) {
          console.log(`Preenchendo placeholders para ${template.nome}...`)
          for (const [key, value] of Object.entries(placeholders)) {
            if (value) {
              const regex = new RegExp(key, 'g')
              fileText = fileText.replace(regex, value)
            }
          }

          const cidadeForFooter = end_cidade || 'Balneário Piçarras'
          const pdfBytes = await generatePdfFromText(fileText, cidadeForFooter, logoBytes)

          const fileName = `${template.nome}_preenchido.pdf`.replace(/\s+/g, '_')
          const filePath = `contratos/${cliente_id}/${fileName}`

          console.log(`Salvando documento ${filePath}...`)
          const { error: uploadError } = await supabase.storage
            .from('bender_clientes')
            .upload(filePath, pdfBytes, { contentType: 'application/pdf', upsert: true })

          if (uploadError) {
            throw new Error(`Nao consegui salvar o documento: ${uploadError.message}`)
          }

          const { data: publicUrlData, error: signError } = await supabase.storage
            .from('bender_clientes')
            .createSignedUrl(filePath, 315360000)
          if (signError) console.error('Sign URL error:', signError)
          if (template.tipo === 'contrato')
            urlsDocumentos.contrato_url = publicUrlData?.signedUrl || ''
          if (template.tipo === 'termo_conclusao')
            urlsDocumentos.termo_conclusao_url = publicUrlData?.signedUrl || ''
          if (template.tipo === 'termo_garantia')
            urlsDocumentos.termo_garantia_url = publicUrlData?.signedUrl || ''

          documentos_preenchidos.push(template.tipo)
        }
      } catch (downloadError: any) {
        console.error(`Erro ao processar template ${template.nome}:`, downloadError)
        throw new Error(
          `Nao consegui baixar o template [${template.nome}]: ${downloadError.message}`,
        )
      }
    }

    console.log('4. Criando registros financeiros...')
    let parcelasInseridas = 0
    if (pagamentos.forma === 'A_VISTA') {
      const p = pagamentos.a_vista || {}
      if (p.data && valorTotal > 0) {
        const { error: pagError } = await supabase.from('contas_receber').insert({
          user_id,
          cliente_id,
          formulario_comercial_id,
          numero_parcela: '1/1',
          data_vencimento: p.data,
          valor: valorTotal,
          status_pagamento: 'aguardando',
        })
        if (pagError) throw new Error(`Erro ao inserir contas a receber: ${pagError.message}`)
        parcelasInseridas++
      }
    } else if (parcelas.length > 0) {
      const parcelasParaInserir = parcelas.map((pag: any, index: number) => ({
        user_id,
        cliente_id,
        formulario_comercial_id,
        numero_parcela: `${index + 1}/${parcelas.length}`,
        data_vencimento: pag.data || new Date().toISOString().split('T')[0],
        valor: pag.valor || 0,
        status_pagamento: 'aguardando',
      }))

      if (parcelasParaInserir.length > 0) {
        const { error: pagError } = await supabase
          .from('contas_receber')
          .insert(parcelasParaInserir)
        if (pagError) throw new Error(`Erro ao inserir contas a receber: ${pagError.message}`)
        parcelasInseridas += parcelasParaInserir.length
      }
    }

    console.log('5. Criando cards na Analise Tecnica...')
    let produtosInseridos = 0
    if (produtos.length > 0) {
      const { data: existingCards } = await supabase
        .from('produtos_servicos_projeto')
        .select('nome_produto')
        .eq('formulario_comercial_id', formulario_comercial_id)

      const existingNames = existingCards?.map((c) => c.nome_produto) || []

      const produtosParaInserir = produtos
        .filter((p: any) => !existingNames.includes(p.nome || p.nome_produto || 'Produto'))
        .map((p: any) => ({
          formulario_comercial_id,
          cliente_id,
          nome_produto: p.nome || p.nome_produto || 'Produto',
          qtd: p.quantidade || p.qtd || 1,
          descricao: p.descricao || '',
          valor_unitario: p.valor_unitario || 0,
          valor_total: p.valor_total || p.valor_unitario * (p.qtd || 1),
          status_analise: 'iniciar',
          codigo_rastreio: null, // Sistema gerará via trigger automaticamente
        }))

      if (produtosParaInserir.length > 0) {
        const { error: prodError } = await supabase
          .from('produtos_servicos_projeto')
          .insert(produtosParaInserir)

        if (prodError) throw new Error(`Erro ao inserir produtos: ${prodError.message}`)
        produtosInseridos += produtosParaInserir.length
      }
    }

    console.log('6. Atualizando dossie...')
    const { data: existingDossie } = await supabase
      .from('dossies')
      .select('id')
      .eq('formulario_comercial_id', formulario_comercial_id)
      .maybeSingle()

    if (existingDossie) {
      const { error: dossieError } = await supabase
        .from('dossies')
        .update({
          contrato_url: urlsDocumentos.contrato_url || existingDossie.contrato_url,
          termo_conclusao_url:
            urlsDocumentos.termo_conclusao_url || existingDossie.termo_conclusao_url,
          termo_garantia_url:
            urlsDocumentos.termo_garantia_url || existingDossie.termo_garantia_url,
        })
        .eq('id', existingDossie.id)
      if (dossieError) throw new Error(`Erro ao atualizar dossiê: ${dossieError.message}`)
    } else {
      const { error: dossieError } = await supabase.from('dossies').insert({
        user_id,
        cliente_id,
        formulario_comercial_id,
        status: 'em_documentacao',
        contrato_url: urlsDocumentos.contrato_url || null,
        termo_conclusao_url: urlsDocumentos.termo_conclusao_url || null,
        termo_garantia_url: urlsDocumentos.termo_garantia_url || null,
      })
      if (dossieError) throw new Error(`Erro ao criar dossiê: ${dossieError.message}`)
    }

    await supabase.from('timeline_eventos').insert([
      {
        cliente_id,
        usuario_nome: 'Sistema',
        acao: 'Dossiê criado e cliente cadastrado',
      },
      {
        cliente_id,
        usuario_nome: 'Sistema',
        acao: 'Contrato gerado',
      },
    ])

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Dossiê gerado com sucesso!',
        data: {
          pasta_criada: `/clientes/${cliente_id}/documentos`,
          documentos_preenchidos,
          registros_criados: {
            produtos_servicos_projeto: produtosInseridos,
            contas_receber: parcelasInseridas,
            dossies: 1,
          },
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error: any) {
    console.error('Erro na geração de dossiê:', error)
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
