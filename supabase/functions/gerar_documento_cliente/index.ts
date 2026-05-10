import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      throw new Error('Only POST requests are allowed')
    }

    const body = await req.json()
    const { cliente_id, formulario_comercial_id, cliente, valor, vendedor, data } = body

    let formInfo = null
    if (formulario_comercial_id || cliente_id) {
      const query = supabase.from('formulario_comercial').select('*, cliente:clientes(*)')
      if (formulario_comercial_id) query.eq('id', formulario_comercial_id)
      else query.eq('cliente_id', cliente_id)

      const { data: fd } = await query.single()
      formInfo = fd
    }

    // PDF Generation
    const pdfDoc = await PDFDocument.create()
    let page = pdfDoc.addPage([595.28, 841.89]) // A4 size
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    const drawText = (
      text: string,
      x: number,
      y: number,
      size: number,
      isBold: boolean = false,
    ) => {
      page.drawText(text, { x, y, size, font: isBold ? boldFont : font, color: rgb(0, 0, 0) })
    }

    let currentY = 800
    const margin = 50
    const lineHeight = 15

    const checkPageBreak = (spaceNeeded: number) => {
      if (currentY - spaceNeeded < 50) {
        page = pdfDoc.addPage([595.28, 841.89])
        currentY = 800
      }
    }

    // 1. Header
    drawText('CONTRATO DE COMPRA E VENDA - BENDER HAUSSFORM', margin, currentY, 14, true)
    currentY -= 30

    // 2. Client Data
    const cliNome = formInfo?.cliente?.nome || cliente || 'Não informado'
    const cliCpf = formInfo?.cpf || formInfo?.cliente?.cpf || 'Não informado'
    const cliEnd = `${formInfo?.rua || ''}, ${formInfo?.numero || ''} - ${formInfo?.bairro || ''}, ${formInfo?.municipio || ''}/${formInfo?.estado || ''}`

    checkPageBreak(100)
    drawText('1. DADOS DO CLIENTE', margin, currentY, 12, true)
    currentY -= lineHeight
    drawText(`Nome: ${cliNome}`, margin, currentY, 10)
    currentY -= lineHeight
    drawText(`CPF/CNPJ: ${cliCpf}`, margin, currentY, 10)
    currentY -= lineHeight
    drawText(`Endereço: ${cliEnd}`, margin, currentY, 10)
    currentY -= lineHeight
    drawText(`E-mail: ${formInfo?.cliente?.email || ''}`, margin, currentY, 10)
    currentY -= lineHeight
    drawText(`Telefone: ${formInfo?.cliente?.telefone || ''}`, margin, currentY, 10)
    currentY -= 20

    // 3. Products
    checkPageBreak(50)
    drawText('2. AMBIENTES E PRODUTOS CONTRATADOS', margin, currentY, 12, true)
    currentY -= lineHeight

    const produtos = Array.isArray(formInfo?.produtos_servicos) ? formInfo.produtos_servicos : []
    let subtotal = 0

    if (produtos.length === 0) {
      drawText('(Nenhum produto cadastrado)', margin, currentY, 10)
      currentY -= lineHeight
    } else {
      for (const p of produtos) {
        checkPageBreak(30)
        const pNome = p.nome || p.descricao || p.nome_produto || 'Item'
        const pQtd = Number(p.qtd || p.quantidade || 1)
        const pValorUnit = Number(p.valor_unitario || p.valor || 0)
        const pValorTotal = pQtd * pValorUnit
        subtotal += pValorTotal

        drawText(`- ${pNome} (Qtd: ${pQtd})`, margin, currentY, 10, true)
        currentY -= lineHeight
        drawText(
          `  Valor Unitário: R$ ${pValorUnit.toFixed(2)} | Total: R$ ${pValorTotal.toFixed(2)}`,
          margin,
          currentY,
          10,
        )
        currentY -= lineHeight
      }
    }
    currentY -= 10

    const desconto = Number(formInfo?.desconto || 0)
    const totalFinal = Math.max(0, subtotal - desconto)

    checkPageBreak(50)
    drawText(`Subtotal: R$ ${subtotal.toFixed(2)}`, margin, currentY, 10)
    currentY -= lineHeight
    drawText(`Desconto: R$ ${desconto.toFixed(2)}`, margin, currentY, 10)
    currentY -= lineHeight
    drawText(`VALOR TOTAL CONTRATADO: R$ ${totalFinal.toFixed(2)}`, margin, currentY, 12, true)
    currentY -= 20

    // 4. Payment
    checkPageBreak(100)
    drawText('3. CONDIÇÕES DE PAGAMENTO', margin, currentY, 12, true)
    currentY -= lineHeight

    const pagamentos = formInfo?.pagamentos || {}
    const forma = Array.isArray(pagamentos)
      ? pagamentos[0]?.forma || 'À vista'
      : pagamentos.forma || 'À vista'

    drawText(`Forma de Pagamento: ${forma}`, margin, currentY, 10)
    currentY -= lineHeight

    const parcelas = Array.isArray(pagamentos)
      ? pagamentos[0]?.parcelas || []
      : pagamentos.parcelado || pagamentos.parcelas || []
    if (parcelas.length > 0) {
      for (let i = 0; i < parcelas.length; i++) {
        checkPageBreak(20)
        const parc = parcelas[i]
        const valParc = Number(parc.valor || 0).toFixed(2)
        const dataParc = parc.data || parc.vencimento || 'A definir'
        drawText(
          `  Parcela ${i + 1}: R$ ${valParc} - Vencimento: ${dataParc}`,
          margin,
          currentY,
          10,
        )
        currentY -= lineHeight
      }
    } else {
      drawText(`  Pagamento à vista no valor de R$ ${totalFinal.toFixed(2)}`, margin, currentY, 10)
      currentY -= lineHeight
    }
    currentY -= 20

    // 5. Clauses
    checkPageBreak(150)
    drawText('4. CLÁUSULAS CONTRATUAIS', margin, currentY, 12, true)
    currentY -= lineHeight
    const clausulas = [
      'Cláusula 1 - Do Objeto: O presente contrato tem por objeto a fabricação, entrega e montagem dos móveis sob medida descritos no item 2.',
      'Cláusula 2 - Do Prazo: O prazo de entrega e montagem será de 45 dias úteis a contar da assinatura do projeto executivo.',
      'Cláusula 3 - Da Garantia: Os móveis possuem garantia de 5 anos contra defeitos de fabricação, não cobrindo mau uso.',
      'Cláusula 4 - Da Rescisão: Em caso de rescisão por parte do contratante após o início da fabricação, haverá multa de 30% sobre o valor total.',
      'Cláusula 5 - Do Foro: Fica eleito o foro da comarca de Balneário Piçarras - SC para dirimir quaisquer dúvidas.',
    ]

    for (const cl of clausulas) {
      checkPageBreak(40)
      drawText(cl, margin, currentY, 10)
      currentY -= lineHeight * 2
    }

    currentY -= 30
    checkPageBreak(100)

    // 6. Signatures
    drawText('_________________________________________________', margin, currentY, 10)
    currentY -= lineHeight
    drawText(`CONTRATANTE: ${cliNome}`, margin, currentY, 10, true)
    currentY -= 40

    drawText('_________________________________________________', margin, currentY, 10)
    currentY -= lineHeight
    drawText(`CONTRATADA: Bender Haussform (CNPJ: 00.000.000/0001-00)`, margin, currentY, 10, true)
    currentY -= lineHeight
    drawText(`Representante: ${vendedor || 'Sistema'}`, margin, currentY, 10)

    const pdfBytes = await pdfDoc.save()

    // Sanitize filename
    const safeCliente = cliNome.replace(/[^a-zA-Z0-9]/g, '_')
    const safeData = (data || new Date().toISOString().split('T')[0]).replace(/[^a-zA-Z0-9]/g, '_')
    const filename = `contrato-${safeCliente}-${safeData}-${Date.now()}.pdf`

    // Upload to storage bender_clientes
    const { error: uploadError } = await supabase.storage
      .from('bender_clientes')
      .upload(filename, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`)
    }

    const { data: urlData, error: signError } = await supabase.storage
      .from('bender_clientes')
      .createSignedUrl(filename, 315360000)
    const publicUrl = urlData?.signedUrl || ''

    if (signError) {
      console.error('Sign URL error:', signError)
    }

    // Insert into timeline_eventos if not already there recently
    if (cliente_id) {
      await supabase.from('timeline_eventos').insert({
        cliente_id: cliente_id,
        acao: `Contrato em PDF gerado: ${filename}`,
        usuario_nome: vendedor || 'Sistema',
      })
    }

    return new Response(JSON.stringify({ success: true, documento_url: publicUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    console.error(error)
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
