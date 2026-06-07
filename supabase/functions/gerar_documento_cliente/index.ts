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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let payloadReq: any = {}
  let supabaseClient: any = null

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        'Erro de configuração: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados nas variáveis de ambiente.',
      )
    }

    supabaseClient = createClient(supabaseUrl, supabaseKey)

    payloadReq = await req.json()
    const { action, cliente_id, template_nome, documento_id } = payloadReq

    if (action === 'pre_gerar') {
      return new Response(
        JSON.stringify({
          success: true,
          conteudo_preenchido:
            '<p>Este documento será gerado via PDFMonkey no momento de salvar.</p>',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (action === 'salvar_novo_async' || action === 'atualizar_pdf_async') {
      if (!documento_id) {
        throw new Error('ID do documento não fornecido.')
      }

      const { data: docInfo, error: docError } = await supabaseClient
        .from('documentos_cliente')
        .select('projeto_id')
        .eq('id', documento_id)
        .single()

      if (docError && !docInfo) {
        throw new Error('Documento não encontrado na base de dados.')
      }

      const formulario_comercial_id = docInfo?.projeto_id

      if (!cliente_id) {
        throw new Error('Falta a referência do cliente (cliente_id) no documento.')
      }

      let form: any = {}

      if (formulario_comercial_id) {
        const { data: formData } = await supabaseClient
          .from('formulario_comercial')
          .select('*, cliente:clientes(*)')
          .eq('id', formulario_comercial_id)
          .single()

        if (formData) {
          form = formData
        }
      }

      if (!form.cliente) {
        const { data: clientData } = await supabaseClient
          .from('clientes')
          .select('*')
          .eq('id', cliente_id)
          .single()
        if (clientData) {
          form.cliente = clientData
        }
      }

      const { data: template } = await supabaseClient
        .from('templates')
        .select('*')
        .eq('nome', template_nome)
        .single()

      if (!template?.external_template_id) {
        throw new Error(
          `Template "${template_nome}" não possui um PDFMonkey Template ID configurado.`,
        )
      }

      const clienteNome = form.nome_cliente || form.cliente?.nome || 'Cliente não informado'
      const cpf = form.cpf || form.cliente?.cpf || 'Não informado'
      const data_nascimento = form.data_nascimento || form.cliente?.data_nascimento || null
      const email = form.cliente?.email || 'Não informado'
      const telefone = form.cliente?.telefone || 'Não informado'
      const profissao = form.profissao || 'Não informado'
      const estado_civil = form.estado_civil || 'Não informado'
      const end_cep = form.cep || form.cliente?.cep || 'Não informado'
      const end_rua = form.rua || form.cliente?.endereco_obra || 'Não informado'
      const end_numero = form.numero || form.cliente?.numero || 'S/N'
      const end_bairro = form.bairro || form.cliente?.bairro || 'Não informado'
      const end_complemento = form.complemento || form.cliente?.complemento || ''
      const end_cidade = form.municipio || form.cliente?.cidade || 'Não informado'
      const end_estado = form.estado || form.cliente?.estado || 'Não informado'

      const obra_cep = form.obra_cep || 'Não informado'
      const obra_rua = form.obra_rua || 'Não informado'
      const obra_numero = form.obra_numero || 'S/N'
      const obra_bairro = form.obra_bairro || 'Não informado'
      const obra_complemento = form.obra_complemento || ''
      const obra_cidade = form.obra_municipio || 'Não informado'
      const obra_estado = form.obra_estado || 'Não informado'

      const datas = (form.datas as any) || {}
      const data_acesso_movel = datas.medida || null
      const data_assinatura_contrato = new Date().toISOString().split('T')[0]
      const data_venda = datas.data_venda || data_assinatura_contrato
      const data_prevista_entrega = form.data_prevista_entrega || null

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

      const formatCurrency = (val: number) => {
        if (!val && val !== 0) return 'R$ 0,00'
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
      }
      const formatDate = (dateStr: string | null) => {
        if (!dateStr) return 'Não informado'
        const parts = dateStr.split('T')[0].split('-')
        if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`
        return dateStr
      }

      let vendedorNome = 'Não informado'
      if (form.user_id) {
        const { data: user } = await supabaseClient
          .from('users')
          .select('nome')
          .eq('id', form.user_id)
          .single()
        if (user && user.nome) vendedorNome = user.nome
      }

      const placeholders: any = {
        CLIENTE_NOME: clienteNome,
        CLIENTE_CPF_CNPJ: cpf,
        CLIENTE_DATA_NASCIMENTO: formatDate(data_nascimento),
        CLIENTE_PROFISSAO: profissao,
        CLIENTE_ESTADO_CIVIL: estado_civil,
        CLIENTE_TELEFONE: telefone,
        CLIENTE_EMAIL: email,
        CLIENTE_CEP: end_cep,
        CLIENTE_RUA: end_rua,
        CLIENTE_NUMERO: end_numero,
        CLIENTE_BAIRRO: end_bairro,
        CLIENTE_COMPLEMENTO: end_complemento,
        CLIENTE_CIDADE: end_cidade,
        CLIENTE_ESTADO: end_estado,
        OBRA_CEP: obra_cep,
        OBRA_RUA: obra_rua,
        OBRA_NUMERO: obra_numero,
        OBRA_BAIRRO: obra_bairro,
        OBRA_COMPLEMENTO: obra_complemento,
        OBRA_CIDADE: obra_cidade,
        OBRA_ESTADO: obra_estado,
        DATA_ACESSO_MOVEL: formatDate(data_acesso_movel),
        DATA_ASSINATURA_CONTRATO: formatDate(data_assinatura_contrato),
        DATA_VENDA: formatDate(data_venda),
        DATA_PREVISTA_ENTREGA: formatDate(data_prevista_entrega),
        VALOR_TOTAL: formatCurrency(valorTotal),
        DESCONTO: formatCurrency(Number(form.desconto) || 0),
        FORMA_PAGAMENTO: forma_pagamento,
        METODO_PAGAMENTO: form.metodo_pagamento || 'Não informado',
        VENDEDOR_NOME: vendedorNome,
        NUMERO_PROJETO: form.id.substring(0, 8).toUpperCase(),
        EMPRESA_NOME: 'Bender Haussform',
        EMPRESA_CNPJ: '00.000.000/0001-00',
        EMPRESA_ENDERECO: 'Balneário Piçarras - SC',
        EMPRESA_TELEFONE: '(00) 0000-0000',
        EMPRESA_EMAIL: 'projetos@benderhaussform.com',
        produtos: produtos.map((p: any) => ({
          nome: p.nome || p.nome_produto || 'Produto sem nome',
          descricao: p.descricao || 'Sem descrição',
          valor: formatCurrency(p.valor_unitario || 0),
          qtd: p.qtd || p.quantidade || 1,
        })),
        parcelas: parcelas.map((p: any, i: number) => ({
          numero: i + 1,
          data: formatDate(p.data),
          valor: formatCurrency(p.valor),
          meio: p.meio || 'Não informado',
        })),
        pagamentos: pagamentos,
        is_assinado: false,
        assinaturas: [],
      }

      const pdfMonkeyApiKey = Deno.env.get('PDFMONKEY_API_KEY')
      if (!pdfMonkeyApiKey) throw new Error('PDFMONKEY_API_KEY secret is missing')

      const pdfBytes = await generatePdfMonkeyDocument(
        template.external_template_id,
        placeholders,
        pdfMonkeyApiKey,
      )

      const fileName = `contratos/${cliente_id}/${template_nome}_${Date.now()}.pdf`

      const { error: uploadError } = await supabaseClient.storage
        .from('bender_clientes')
        .upload(fileName, pdfBytes, {
          contentType: 'application/pdf',
          upsert: true,
        })

      if (uploadError) throw uploadError

      const { error: updateError } = await supabaseClient
        .from('documentos_cliente')
        .update({
          status: 'concluido',
          arquivo_url: fileName,
          conteudo_preenchido: 'PDF Gerado via PDFMonkey',
        })
        .eq('id', documento_id)

      if (updateError) throw updateError

      return new Response(JSON.stringify({ success: true, url: fileName }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: false, error: 'Ação inválida' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error(error)

    if (supabaseClient) {
      if (payloadReq?.documento_id) {
        await supabaseClient
          .from('documentos_cliente')
          .update({
            status: 'erro_geracao',
            conteudo_preenchido: `Erro na geração: ${error.message}`,
          })
          .eq('id', payloadReq.documento_id)
          .catch(() => {})
      }

      await supabaseClient
        .from('logs_ia')
        .insert({
          acao: 'gerar_documento_cliente_error',
          detalhes: { error: error.message },
        })
        .catch(() => {})
    }

    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
