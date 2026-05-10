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
        .eq('nome', template_nome)
        .single()

      if (tplError || !template) throw new Error('Template não encontrado no banco de dados')

      const { data: form } = await supabase
        .from('formulario_comercial')
        .select('*, cliente:clientes(*)')
        .eq('cliente_id', cliente_id)
        .single()

      if (!form) throw new Error('Formulário não encontrado para este cliente')

      const cli = Array.isArray(form.cliente) ? form.cliente[0] : form.cliente || {}
      const datas = form.datas || {}
      const pagamentosArr = Array.isArray(form.pagamentos)
        ? form.pagamentos
        : [form.pagamentos || {}]
      const pagData = pagamentosArr[0] || {}
      const produtos = form.produtos_servicos || []

      const subtotal = produtos.reduce(
        (acc: number, p: any) =>
          acc + Number(p.valor_unitario || 0) * Number(p.qtd || p.quantidade || 1),
        0,
      )
      const desconto = Number(form.desconto || 0)
      const total = Math.max(0, subtotal - desconto)

      let blocoProdutos = ''
      if (produtos.length === 0) {
        blocoProdutos = '(Nenhum produto cadastrado)'
      } else {
        const linhas = produtos.map((p: any, i: number) => {
          const nome = p.nome || p.descricao || p.nome_produto || `Item ${i + 1}`
          const qtd = Number(p.qtd || p.quantidade || 1)
          const vu = Number(p.valor_unitario || p.valor || 0)
          return `${i + 1}. ${nome} — Qtd: ${qtd} × ${formatCurrency(vu)} = ${formatCurrency(qtd * vu)}`
        })
        blocoProdutos = `${linhas.join('\n')}\n\nSubtotal: ${formatCurrency(subtotal)}\nDesconto: ${formatCurrency(desconto)}\nTotal: ${formatCurrency(total)}`
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
        '[CLIENTE_CPF_CNPJ]': form.cpf || cli.cpf || '',
        '[CLIENTE_PROFISSAO]': form.profissao || cli.profissao || '',
        '[CLIENTE_ESTADO_CIVIL]': form.estado_civil || '',
        '[CLI_EMAIL]': cli.email || '',
        '[CLIENTE_TELEFONE]': cli.telefone || '',
        '[CLIENTE_CEP]': form.cep || cli.cep || '',
        '[CLIENTE_RUA]': form.rua || cli.endereco_obra || '',
        '[CLIENTE_NUMERO]': form.numero || cli.numero || '',
        '[CLIENTE_COMPLEMENTO]': form.complemento || cli.complemento || '',
        '[CLIENTE_BAIRRO]': form.bairro || cli.bairro || '',
        '[CLIENTE_CIDADE]': form.municipio || cli.cidade || '',
        '[CLIENTE_ESTADO]': form.estado || cli.estado || '',
        '[OBRA_CEP]': form.obra_cep || '',
        '[OBRA_RUA]': form.obra_rua || '',
        '[OBRA_NUMERO]': form.obra_numero || '',
        '[OBRA_COMPLEMENTO]': form.obra_complemento || '',
        '[OBRA_BAIRRO]': form.obra_bairro || '',
        '[OBRA_CIDADE]': form.obra_municipio || '',
        '[OBRA_ESTADO]': form.obra_estado || '',
        '[OBRA_ENDERECO_COMPLETO]': `${form.obra_rua || ''}, ${form.obra_numero || ''} - ${form.obra_bairro || ''}, ${form.obra_municipio || ''}`,
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
        '[DESCRICAO_ALTERACAO]': dados_extras?.descricao_alteracao || '____________________',
        '[DESCRICAO_OCORRENCIA]': dados_extras?.descricao_ocorrencia || '____________________',
        '[REPRESENTANTE_NOME]': dados_extras?.representante_nome || '____________________',
        '[REPRESENTANTE_CPF]': dados_extras?.representante_cpf || '____________________',
      }

      let conteudoFinal = template.conteudo
      for (const [key, value] of Object.entries(placeholders)) {
        conteudoFinal = conteudoFinal.split(key).join(value)
      }

      const cidadeForFooter = form.municipio || cli.cidade || 'Balneário Piçarras'
      const pdfBytes = await generatePdfFromText(conteudoFinal, cidadeForFooter, logoBytes)

      const safeNome = template_nome.replace(/[^a-zA-Z0-9]/g, '_')
      const fileName = `${safeNome}_${Date.now()}.pdf`
      const filePath = `contratos/${cliente_id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('bender_clientes')
        .upload(filePath, pdfBytes, { contentType: 'application/pdf', upsert: true })

      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)

      const { data: docRecord, error: docError } = await supabase
        .from('documentos_cliente')
        .insert({
          cliente_id,
          tipo: template_nome,
          template_nome: `${template_nome}.pdf`,
          status: 'gerado',
          arquivo_url: filePath,
          conteudo_preenchido: conteudoFinal,
        })
        .select()
        .single()

      if (docError) throw new Error(`Error saving record: ${docError.message}`)

      return new Response(JSON.stringify({ success: true, documento: docRecord }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } else if (action === 'atualizar_pdf') {
      if (!documento_id || !conteudo_editado)
        throw new Error('documento_id e conteudo_editado são obrigatórios')

      const { data: doc } = await supabase
        .from('documentos_cliente')
        .select('*')
        .eq('id', documento_id)
        .single()

      if (!doc) throw new Error('Documento não encontrado')

      await supabase
        .from('documentos_cliente')
        .update({ conteudo_preenchido: conteudo_editado })
        .eq('id', documento_id)

      const pdfBytes = await generatePdfFromText(conteudo_editado, 'Balneário Piçarras', logoBytes)

      const { error: uploadError } = await supabase.storage
        .from('bender_clientes')
        .upload(doc.arquivo_url, pdfBytes, { contentType: 'application/pdf', upsert: true })

      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    throw new Error('Ação inválida')
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function generatePdfFromText(text: string, cidade: string, logoBytes: Uint8Array | null) {
  const emojiMap: Record<string, string> = {
    '🎨': '[Estilo]',
    '👤': '[Cliente]',
    '📐': '[Analista]',
    '🔨': '[Montador]',
    '✦': '-',
    '🧑‍💻': '[Projeto]',
    '⚙️': '[Fabricação]',
    '🚚': '[Entrega]',
    '👷': '[Montagem]',
    '☑️': '[X]',
    '✖️': '[ ]',
    '⚠️': '[Atenção]',
    '📦': '[Logística]',
    '🔹': '-',
    '🏗️': '[Acompanhamento]',
    '🎭': '[Ambientação]',
    '🤝': '[Termo]',
    '🛡️': '[Garantia]',
    '📣': '[Comunicados]',
    '📄': '[Documento]',
    '📒': '[Caderno]',
  }
  let safeText = text
  for (const [emoji, replacement] of Object.entries(emojiMap)) {
    safeText = safeText.split(emoji).join(replacement)
  }
  safeText = safeText.replace(/[^\x20-\x7E\xA0-\xFF\n]/g, '') // Keep basic ascii + latin1, strip complex emojis

  const pdfDoc = await PDFDocument.create()
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  let page = pdfDoc.addPage([595.28, 841.89]) // A4
  const margin = 60
  const maxWidth = 595.28 - margin * 2
  let currentY = 841.89 - margin

  if (logoBytes) {
    try {
      const image = await pdfDoc.embedPng(logoBytes)
      const scale = 150 / image.width
      const imgDims = { width: image.width * scale, height: image.height * scale }
      page.drawImage(image, {
        x: (595.28 - imgDims.width) / 2,
        y: currentY - imgDims.height,
        width: imgDims.width,
        height: imgDims.height,
      })
      currentY -= imgDims.height + 40
    } catch (e) {
      console.warn('Failed to embed logo', e)
      page.drawText('BENDER HAUSSFORM', { x: margin, y: currentY, size: 14, font: fontBold })
      currentY -= 40
    }
  } else {
    page.drawText('BENDER HAUSSFORM', { x: margin, y: currentY, size: 14, font: fontBold })
    currentY -= 40
  }

  const checkPageBreak = (needed: number) => {
    if (currentY - needed < margin) {
      page = pdfDoc.addPage([595.28, 841.89])
      currentY = 841.89 - margin
    }
  }

  const wrapText = (textStr: string, font: any, size: number) => {
    const words = textStr.split(' ')
    let lines = []
    let currentLine = ''
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word
      const width = font.widthOfTextAtSize(testLine, size)
      if (width > maxWidth) {
        lines.push(currentLine)
        currentLine = word
      } else {
        currentLine = testLine
      }
    }
    if (currentLine) lines.push(currentLine)
    return lines
  }

  const lines = safeText.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim()
    if (!rawLine) {
      currentY -= 8
      continue
    }

    const isClauseTitle = rawLine.toUpperCase() === rawLine && rawLine.startsWith('CLÁUSULA')
    const isSubtitle = /^[0-9]+\.[0-9]+/.test(rawLine)

    let font = fontRegular
    let size = 10

    if (isClauseTitle) {
      font = fontBold
      size = 12
      currentY -= 12
    } else if (isSubtitle) {
      font = fontBold
      size = 10
    }

    const wrappedLines = wrapText(rawLine, font, size)

    for (const wl of wrappedLines) {
      checkPageBreak(size + 4)
      page.drawText(wl, { x: margin, y: currentY, size, font, color: rgb(0, 0, 0) })
      currentY -= size + 4
    }

    if (isClauseTitle) {
      currentY -= 12
    } else {
      currentY -= 8
    }
  }

  const pages = pdfDoc.getPages()
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i]
    const footerY = 30
    p.drawText(`Bender Haussform — ${cidade}/SC`, {
      x: margin,
      y: footerY,
      size: 8,
      font: fontRegular,
    })
    p.drawText(`Página ${i + 1} de ${pages.length}`, {
      x: 595.28 - margin - 50,
      y: footerY,
      size: 8,
      font: fontRegular,
    })
  }

  return await pdfDoc.save()
}
