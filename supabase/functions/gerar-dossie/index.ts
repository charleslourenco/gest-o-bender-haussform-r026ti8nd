import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function generatePdfMonkeyDocument(templateId: string, payload: any, apiKey: string) {
  const reqBody = {
    document: {
      document_template_id: templateId,
      payload: payload,
      status: 'pending',
    },
  }

  const res = await fetch('https://api.pdfmonkey.io/api/v1/documents', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(reqBody),
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`PDFMonkey API error: ${res.status} - ${errorText}`)
  }

  const data = await res.json()
  const docId = data.document.id

  let downloadUrl = null
  for (let i = 0; i < 15; i++) {
    await new Promise((resolve) => setTimeout(resolve, 2000))
    const checkRes = await fetch(`https://api.pdfmonkey.io/api/v1/documents/${docId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })
    if (!checkRes.ok) continue
    const checkData = await checkRes.json()
    if (checkData.document.status === 'success') {
      downloadUrl = checkData.document.download_url
      break
    } else if (checkData.document.status === 'failure') {
      throw new Error(`PDFMonkey generation failed for document ${docId}`)
    }
  }

  if (!downloadUrl) {
    throw new Error('Timeout waiting for PDFMonkey document generation')
  }

  const pdfRes = await fetch(downloadUrl)
  if (!pdfRes.ok) {
    throw new Error('Failed to download generated PDF from PDFMonkey')
  }

  return await pdfRes.arrayBuffer()
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

    const supabaseAdmin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')

    const { data: form, error: formError } = await supabase
      .from('formulario_comercial')
      .select('*, cliente:clientes(*)')
      .eq('id', formulario_comercial_id)
      .single()

    if (formError || !form) throw new Error('Formulário comercial não encontrado.')

    let vendedorNome = ''
    if (form.user_id || form.usuario_id) {
      const uid = form.user_id || form.usuario_id
      const { data: user } = await supabase.from('users').select('*').eq('id', uid).single()
      if (user) vendedorNome = user.nome || ''
    }

    const vendedorNomeEtapa = (form.dados_etapa_1 as any)?.vendedor_nome || vendedorNome

    const { data: templates, error: tempError } = await supabase
      .from('templates')
      .select('*')
      .in('tipo', ['contrato', 'termo_conclusao', 'termo_garantia'])

    if (tempError) throw new Error(`Erro ao buscar templates: ${tempError.message}`)
    if (!templates || templates.length === 0) {
      throw new Error('Nenhum template encontrado.')
    }

    const formatCurrency = (val: number) =>
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
    const formatDate = (dateStr: string) => {
      if (!dateStr) return ''
      const [y, m, d] = dateStr.split('-')
      return `${d}/${m}/${y}`
    }

    const datas = (form.datas as any) || {}
    const produtos = (form.produtos_servicos as any[]) || []
    const valorTotal = Array.isArray(produtos)
      ? produtos.reduce(
          (acc: number, p: any) => acc + (Number(p.valor_unitario) || 0) * (Number(p.qtd) || 1),
          0,
        ) - (Number(form.desconto) || 0)
      : 0
    const pagamentos = (form.pagamentos as any) || {}
    const parcelas = form.parcelas || pagamentos.parcelado || []

    const buildAddress = (
      rua: string,
      num: string,
      comp: string,
      bairro: string,
      cidade: string,
      estado: string,
      cep: string,
    ) => {
      let str = ''
      if (rua) str += rua
      if (num) str += `, ${num}`
      if (comp) str += ` - ${comp}`
      if (bairro) str += `, ${bairro}`
      if (cidade) str += `, ${cidade}`
      if (estado) str += ` - ${estado}`
      if (cep) str += `, ${cep}`
      return str.replace(/^, /, '').trim() || 'Não informado'
    }

    const placeholders: any = {
      CLIENTE_NOME: form.cliente?.nome || '',
      CLIENTE_CPF_CNPJ: form.cliente?.cpf || form.cpf || '',
      CLIENTE_PROFISSAO: form.profissao || '',
      CLIENTE_ESTADO_CIVIL: form.estado_civil || '',
      CLIENTE_TELEFONE: form.cliente?.telefone || '',
      CLIENTE_EMAIL: form.cliente?.email || '',
      CLIENTE_CEP: form.cep || form.cliente?.cep || '',
      CLIENTE_RUA: form.rua || form.cliente?.endereco_obra || '',
      CLIENTE_NUMERO: form.numero || form.cliente?.numero || '',
      CLIENTE_COMPLEMENTO: form.complemento || form.cliente?.complemento || '',
      CLIENTE_CIDADE: form.municipio || form.cliente?.cidade || '',
      CLIENTE_ESTADO: form.estado || form.cliente?.estado || '',
      CLI_NOME: form.cliente?.nome || '',
      CLI_NOME_COMPLETO: form.cliente?.nome || '',
      CLI_CPF_CNPJ: form.cliente?.cpf || form.cpf || '',
      CLI_CPF: form.cliente?.cpf || form.cpf || '',
      CLI_ENDERECO_COMPLETO: buildAddress(
        form.rua || form.cliente?.endereco_obra,
        form.numero || form.cliente?.numero,
        form.complemento || form.cliente?.complemento,
        form.bairro || form.cliente?.bairro,
        form.municipio || form.cliente?.cidade,
        form.estado || form.cliente?.estado,
        form.cep || form.cliente?.cep,
      ),
      CLI_PROFISSAO: form.profissao || form.cliente?.profissao || '',
      CLI_ESTADO_CIVIL: form.estado_civil || '',
      CLI_EMAIL: form.cliente?.email || '',
      CLI_TELEFONE: form.cliente?.telefone || '',
      CLI_ENDERECO_OBRA: buildAddress(
        form.obra_rua,
        form.obra_numero,
        form.obra_complemento,
        form.obra_bairro,
        form.obra_municipio,
        form.obra_estado,
        form.obra_cep,
      ),
      OBRA_CEP: form.obra_cep || '',
      OBRA_RUA: form.obra_rua || '',
      OBRA_NUMERO: form.obra_numero || '',
      OBRA_COMPLEMENTO: form.obra_complemento || '',
      OBRA_CIDADE: form.obra_municipio || '',
      OBRA_ESTADO: form.obra_estado || '',
      DATA_ACESSO_MOVEL: formatDate(datas.medida || ''),
      DATA_ASSINATURA_CONTRATO: formatDate(new Date().toISOString().split('T')[0]),
      DATA_VENDA: formatDate(datas.data_venda || new Date().toISOString().split('T')[0]),
      VALOR_TOTAL: formatCurrency(valorTotal),
      FORMA_PAGAMENTO: pagamentos.forma === 'A_VISTA' ? 'À Vista' : 'Parcelado',
      CLAUSULA_PAGAMENTO_NARRATIVA: pagamentos.narrativa || form.especificacoes || 'Não informado',
      VENDEDOR_NOME: vendedorNomeEtapa,
      NUMERO_PROJETO: form.id.substring(0, 8).toUpperCase(),
      EMPRESA_NOME: 'Bender Haussform',
      EMPRESA_CNPJ: '00.000.000/0001-00',
      EMPRESA_ENDERECO: 'Balneário Piçarras - SC',
      EMPRESA_TELEFONE: '(00) 0000-0000',
      EMPRESA_EMAIL: 'projetos@benderhaussform.com',
      produtos: produtos.map((p: any) => ({
        descricao: p.nome || p.nome_produto || p.descricao || 'Produto sem descrição',
        valor: formatCurrency(
          p.valor_total || p.valor_unitario * (p.qtd || p.quantidade || 1) || 0,
        ),
        qtd: p.qtd || p.quantidade || 1,
      })),
      parcelas: parcelas.map((p: any, i: number) => ({
        numero: i + 1,
        data: formatDate(p.data),
        valor: formatCurrency(p.valor || p.valor_parcela || 0),
        meio: p.meio || form.metodo_pagamento || 'Não informado',
      })),
      is_assinado: false,
      assinaturas: [],
    }

    const urlsDocumentos: Record<string, string> = {
      contrato_url: '',
      termo_conclusao_url: '',
      termo_garantia_url: '',
    }
    let documentos_preenchidos = []

    const pdfMonkeyApiKey = Deno.env.get('PDFMONKEY_API_KEY')
    if (!pdfMonkeyApiKey) throw new Error('PDFMONKEY_API_KEY secret is missing')

    for (const template of templates) {
      if (!template.external_template_id) continue

      try {
        const pdfBytes = await generatePdfMonkeyDocument(
          template.external_template_id,
          placeholders,
          pdfMonkeyApiKey,
        )
        const fileName = `${template.nome}_preenchido.pdf`.replace(/\s+/g, '_')
        const filePath = `contratos/${cliente_id}/${fileName}`

        const { error: uploadError } = await supabaseAdmin.storage
          .from('bender_clientes')
          .upload(filePath, pdfBytes, { contentType: 'application/pdf', upsert: true })

        if (uploadError) throw uploadError

        const { data: publicUrlData } = await supabaseAdmin.storage
          .from('bender_clientes')
          .createSignedUrl(filePath, 315360000)

        if (template.tipo === 'contrato')
          urlsDocumentos.contrato_url = publicUrlData?.signedUrl || ''
        if (template.tipo === 'termo_conclusao')
          urlsDocumentos.termo_conclusao_url = publicUrlData?.signedUrl || ''
        if (template.tipo === 'termo_garantia')
          urlsDocumentos.termo_garantia_url = publicUrlData?.signedUrl || ''

        documentos_preenchidos.push(template.tipo)
      } catch (err: any) {
        console.error(`Erro ao processar template ${template.nome}:`, err)
        await supabaseAdmin.from('logs_ia').insert({
          acao: 'gerar_dossie_pdfmonkey_error',
          detalhes: { template: template.nome, error: err.message },
        })
      }
    }

    let parcelasInseridas = 0
    if (pagamentos.forma === 'A_VISTA') {
      const p = pagamentos.a_vista || {}
      if (p.data && valorTotal > 0) {
        await supabase.from('contas_receber').insert({
          user_id,
          cliente_id,
          formulario_comercial_id,
          numero_parcela: '1/1',
          data_vencimento: p.data,
          valor: valorTotal,
          status_pagamento: 'aguardando',
        })
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
        await supabase.from('contas_receber').insert(parcelasParaInserir)
        parcelasInseridas += parcelasParaInserir.length
      }
    }

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
        }))
      if (produtosParaInserir.length > 0) {
        await supabase.from('produtos_servicos_projeto').insert(produtosParaInserir)
        produtosInseridos += produtosParaInserir.length
      }
    }

    const { data: existingDossie } = await supabase
      .from('dossies')
      .select('id')
      .eq('formulario_comercial_id', formulario_comercial_id)
      .maybeSingle()
    if (existingDossie) {
      await supabase
        .from('dossies')
        .update({
          contrato_url: urlsDocumentos.contrato_url || existingDossie.contrato_url,
          termo_conclusao_url:
            urlsDocumentos.termo_conclusao_url || existingDossie.termo_conclusao_url,
          termo_garantia_url:
            urlsDocumentos.termo_garantia_url || existingDossie.termo_garantia_url,
        })
        .eq('id', existingDossie.id)
    } else {
      await supabase.from('dossies').insert({
        user_id,
        cliente_id,
        formulario_comercial_id,
        status: 'em_documentacao',
        contrato_url: urlsDocumentos.contrato_url || null,
        termo_conclusao_url: urlsDocumentos.termo_conclusao_url || null,
        termo_garantia_url: urlsDocumentos.termo_garantia_url || null,
      })
    }

    await supabase.from('timeline_eventos').insert([
      { cliente_id, usuario_nome: 'Sistema', acao: 'Dossiê criado e cliente cadastrado' },
      { cliente_id, usuario_nome: 'Sistema', acao: 'Contrato gerado' },
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
