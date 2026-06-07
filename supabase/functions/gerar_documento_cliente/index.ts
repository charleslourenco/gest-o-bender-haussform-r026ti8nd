import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { generatePdfMonkeyDocument } from '../_shared/pdfmonkey.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  try {
    const payloadReq = await req.json()
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
      const { data: docInfo } = await supabaseClient
        .from('documentos_cliente')
        .select('projeto_id')
        .eq('id', documento_id)
        .single()
      const formulario_comercial_id = docInfo?.projeto_id

      if (!formulario_comercial_id || !cliente_id) {
        throw new Error('Faltam referências de projeto ou cliente no documento.')
      }

      const { data: form } = await supabaseClient
        .from('formulario_comercial')
        .select('*, cliente:clientes(*)')
        .eq('id', formulario_comercial_id)
        .single()

      if (!form) throw new Error('Formulário não encontrado')

      const { data: template } = await supabaseClient
        .from('templates')
        .select('*')
        .eq('nome', template_nome)
        .single()

      if (!template?.external_template_id) {
        throw new Error(
          `Template ${template_nome} não possui um PDFMonkey Template ID configurado.`,
        )
      }

      const clienteNome = form.nome_cliente || form.cliente?.nome || ''
      const cpf = form.cpf || form.cliente?.cpf || ''
      const data_nascimento = form.data_nascimento || form.cliente?.data_nascimento || ''
      const email = form.cliente?.email || ''
      const telefone = form.cliente?.telefone || ''
      const profissao = form.profissao || ''
      const estado_civil = form.estado_civil || ''
      const end_cep = form.cep || form.cliente?.cep || ''
      const end_rua = form.rua || form.cliente?.endereco_obra || ''
      const end_numero = form.numero || form.cliente?.numero || ''
      const end_bairro = form.bairro || form.cliente?.bairro || ''
      const end_complemento = form.complemento || form.cliente?.complemento || ''
      const end_cidade = form.municipio || form.cliente?.cidade || ''
      const end_estado = form.estado || form.cliente?.estado || ''

      const obra_cep = form.obra_cep || ''
      const obra_rua = form.obra_rua || ''
      const obra_numero = form.obra_numero || ''
      const obra_bairro = form.obra_bairro || ''
      const obra_complemento = form.obra_complemento || ''
      const obra_cidade = form.obra_municipio || ''
      const obra_estado = form.obra_estado || ''

      const datas = (form.datas as any) || {}
      const data_acesso_movel = datas.medida || ''
      const data_assinatura_contrato = new Date().toISOString().split('T')[0]
      const data_venda = datas.data_venda || data_assinatura_contrato
      const data_prevista_entrega = form.data_prevista_entrega || ''

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
        const parts = dateStr.split('T')[0].split('-')
        if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`
        return dateStr
      }

      let vendedorNome = ''
      if (form.user_id) {
        const { data: user } = await supabaseClient
          .from('users')
          .select('nome')
          .eq('id', form.user_id)
          .single()
        if (user) vendedorNome = user.nome
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
        METODO_PAGAMENTO: form.metodo_pagamento || '',
        VENDEDOR_NOME: vendedorNome,
        NUMERO_PROJETO: form.id.substring(0, 8).toUpperCase(),
        EMPRESA_NOME: 'Bender Haussform',
        EMPRESA_CNPJ: '00.000.000/0001-00',
        EMPRESA_ENDERECO: 'Balneário Piçarras - SC',
        EMPRESA_TELEFONE: '(00) 0000-0000',
        EMPRESA_EMAIL: 'projetos@benderhaussform.com',
        produtos: produtos.map((p: any) => ({
          nome: p.nome || p.nome_produto,
          descricao: p.descricao || '',
          valor: formatCurrency(p.valor_unitario || 0),
          qtd: p.qtd || p.quantidade || 1,
        })),
        parcelas: parcelas.map((p: any, i: number) => ({
          numero: i + 1,
          data: formatDate(p.data),
          valor: formatCurrency(p.valor),
          meio: p.meio,
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
      headers: corsHeaders,
    })
  } catch (error: any) {
    console.error(error)
    await supabaseClient.from('logs_ia').insert({
      acao: 'gerar_documento_cliente_error',
      detalhes: { error: error.message },
    })
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: corsHeaders,
    })
  }
})
