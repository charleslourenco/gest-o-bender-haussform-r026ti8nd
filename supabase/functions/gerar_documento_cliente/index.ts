import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

function formatCurrency(val: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
}

function formatDateStr(dateStr: string) {
  if (!dateStr) return ''
  const parts = dateStr.split('-')
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`
  return dateStr
}

async function convertHtmlToPdf(html: string): Promise<Uint8Array> {
  // Utilizing a standard public API for high-fidelity HTML-to-PDF conversion
  // This bypasses local CPU timeouts and allows full CSS/Table rendering for 22+ pages
  const response = await fetch('https://api.html2pdf.app/v1/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ html }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Falha ao converter HTML para PDF: Status ${response.status} - ${errorText}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  return new Uint8Array(arrayBuffer)
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
      const pagamentosArr = Array.isArray(safeForm.pagamentos)
        ? safeForm.pagamentos
        : [safeForm.pagamentos || {}]
      const pagData = pagamentosArr[0] || {}
      const produtos = safeForm.produtos_servicos || []

      const valorTotal = Number(safeForm.valor_total || 0)
      const desconto = Number(safeForm.desconto || 0)
      const metodoPagamento = safeForm.metodo_pagamento || pagData.meio || 'Não informado'

      // Gerador dinâmico de tabelas de produtos
      let tabelaProdutos =
        '<table><thead><tr><th>Produto/Serviço</th><th>Descrição</th><th>Qtd</th><th>V. Unit.</th><th>Total</th></tr></thead><tbody>'
      if (produtos.length === 0) {
        tabelaProdutos +=
          '<tr><td colspan="5" style="text-align: center;">Nenhum produto cadastrado</td></tr>'
      } else {
        produtos.forEach((p: any) => {
          const nome = p.nome || p.nome_produto || 'Item'
          const desc = p.descricao || '-'
          const qtd = Number(p.qtd || p.quantidade || 1)
          const vu = Number(p.valor_unitario || p.valor || 0)
          const vt = Number(p.valor_total || qtd * vu)
          tabelaProdutos += `<tr><td>${nome}</td><td>${desc}</td><td>${qtd}</td><td>${formatCurrency(vu)}</td><td>${formatCurrency(vt)}</td></tr>`
        })
      }
      tabelaProdutos += '</tbody></table>'

      // Gerador dinâmico de tabelas de pagamentos
      let tabelaPagamentos =
        '<table><thead><tr><th>Parcela</th><th>Vencimento</th><th>Valor</th><th>Meio de Pagamento</th></tr></thead><tbody>'
      const parcelas = safeForm.parcelas || pagData.parcelas || []

      if (pagData.forma === 'A_VISTA' || parcelas.length === 0) {
        tabelaPagamentos += `<tr><td>Única</td><td>${formatDateStr(safeForm.data_pagamento || safeForm.criado_em)}</td><td>${formatCurrency(valorTotal)}</td><td>${metodoPagamento}</td></tr>`
      } else {
        parcelas.forEach((p: any, index: number) => {
          tabelaPagamentos += `<tr><td>${index + 1}/${parcelas.length}</td><td>${formatDateStr(p.data || p.vencimento)}</td><td>${formatCurrency(p.valor || valorTotal / parcelas.length)}</td><td>${p.meio || metodoPagamento}</td></tr>`
        })
      }
      tabelaPagamentos += '</tbody></table>'

      // Direct Substitution Template Engine (Regex-based replace all)
      const placeholders: Record<string, string> = {
        '{{nome_cliente}}': cli.nome || '',
        '{{cpf}}': safeForm.cpf || cli.cpf || '',
        '{{email}}': cli.email || '',
        '{{telefone}}': cli.telefone || '',
        '{{endereco_obra}}': safeForm.obra_rua
          ? `${safeForm.obra_rua}, ${safeForm.obra_numero} - ${safeForm.obra_bairro}, ${safeForm.obra_municipio} - ${safeForm.obra_estado}`
          : cli.endereco_obra || '',
        '{{valor_total}}': formatCurrency(valorTotal),
        '{{desconto}}': formatCurrency(desconto),
        '{{metodo_pagamento}}': metodoPagamento,
        '{{data_prevista_entrega}}': formatDateStr(safeForm.data_prevista_entrega || ''),
        '{{data_contrato}}': new Date().toLocaleDateString('pt-BR'),
        '{{tabela_produtos}}': tabelaProdutos,
        '{{tabela_pagamentos}}': tabelaPagamentos,
      }

      let conteudoFinal = template.conteudo
      for (const [key, value] of Object.entries(placeholders)) {
        const safeValue = typeof value === 'string' ? value : ''
        // Usar split/join é a forma mais segura e rápida de fazer global replace de strings sem se preocupar com escape de regex
        conteudoFinal = conteudoFinal.split(key).join(safeValue)
      }

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
    } else if (action === 'atualizar_pdf') {
      if (!documento_id || !conteudo_editado)
        throw new Error('documento_id e conteudo_editado são obrigatórios')

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

      const pdfBytes = await convertHtmlToPdf(conteudo_editado)

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
