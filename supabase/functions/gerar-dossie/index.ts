import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, x-supabase-client-platform, apikey, content-type',
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
    const data_assinatura_contrato = new Date().toISOString().split('T')[0] // current date
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

    // BLOCO 6 - PRODUTOS
    let bloco_produtos = produtos
      .map(
        (p: any) =>
          `${p.nome || p.nome_produto} - Qtd: ${p.qtd} - Valor: ${formatCurrency(p.valor_unitario)}`,
      )
      .join('\n')

    // BLOCO 7 - PARCELAS
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
      // BLOCO 1
      '{{CLIENTE_NOME}}': clienteNome,
      '{{CLIENTE_CPF_CNPJ}}': cpf,
      '{{CLIENTE_PROFISSAO}}': profissao,
      '{{CLIENTE_ESTADO_CIVIL}}': estado_civil,
      '{{CLIENTE_TELEFONE}}': telefone,
      '{{CLIENTE_EMAIL}}': email,

      // BLOCO 2
      '{{CLIENTE_CEP}}': end_cep,
      '{{CLIENTE_RUA}}': end_rua,
      '{{CLIENTE_NUMERO}}': end_numero,
      '{{CLIENTE_COMPLEMENTO}}': end_complemento,
      '{{CLIENTE_CIDADE}}': end_cidade,
      '{{CLIENTE_ESTADO}}': end_estado,

      // BLOCO 3
      '{{OBRA_CEP}}': obra_cep,
      '{{OBRA_RUA}}': obra_rua,
      '{{OBRA_NUMERO}}': obra_numero,
      '{{OBRA_COMPLEMENTO}}': obra_complemento,
      '{{OBRA_CIDADE}}': obra_cidade,
      '{{OBRA_ESTADO}}': obra_estado,

      // BLOCO 4
      '{{DATA_ACESSO_MOVEL}}': formatDate(data_acesso_movel),
      '{{DATA_ASSINATURA_CONTRATO}}': formatDate(data_assinatura_contrato),

      // BLOCO 5
      '{{TESTEMUNHA_01_NOME}}': '',
      '{{TESTEMUNHA_01_CPF}}': '',
      '{{TESTEMUNHA_02_NOME}}': '',
      '{{TESTEMUNHA_02_CPF}}': '',
      '{{ASSINANTE_NOME}}': clienteNome,
      '{{ASSINANTE_CPF}}': cpf,

      // BLOCO 6
      '{{BLOCO_PRODUTOS_SERVICOS}}': bloco_produtos,
      // PRODUTOS LINHA 1-12
      ...Array.from({ length: 12 }).reduce((acc: any, _, i) => {
        const p = produtos[i] || {}
        acc[`{{PRODUTO_LINHA_${i + 1}_NOME}}`] = p.nome || p.nome_produto || ''
        acc[`{{PRODUTO_LINHA_${i + 1}_DESCRICAO}}`] = p.descricao || ''
        acc[`{{PRODUTO_LINHA_${i + 1}_VALOR}}`] = p.valor_unitario
          ? formatCurrency(p.valor_unitario)
          : ''
        return acc
      }, {}),

      // BLOCO 7
      '{{FORMA_PAGAMENTO}}': forma_pagamento,
      '{{BLOCO_PARCELAS}}': bloco_parcelas,
      // PARCELAS 1-12
      ...Array.from({ length: 12 }).reduce((acc: any, _, i) => {
        const p = parcelas[i] || {}
        acc[`{{PARCELA_${i + 1}_NUMERO}}`] = p.id ? `${i + 1}` : ''
        acc[`{{PARCELA_${i + 1}_VALOR}}`] = p.valor ? formatCurrency(p.valor) : ''
        acc[`{{PARCELA_${i + 1}_DATA_VENCIMENTO}}`] = p.data ? formatDate(p.data) : ''
        return acc
      }, {}),

      // BLOCO 8 (Fixos para a empresa)
      '{{EMPRESA_NOME}}': 'Minha Empresa de Móveis',
      '{{EMPRESA_CNPJ}}': '00.000.000/0001-00',
      '{{EMPRESA_ENDERECO}}': 'Rua Exemplo, 123',
      '{{EMPRESA_TELEFONE}}': '(00) 0000-0000',
      '{{EMPRESA_EMAIL}}': 'contato@empresa.com',

      // BLOCO 9
      '{{VENDEDOR_NOME}}': vendedorNomeEtapa,
      '{{VENDEDOR_CPF}}': vendedorCpf,
      '{{VENDEDOR_EMAIL}}': vendedorEmail,
      '{{VENDEDOR_TELEFONE}}': vendedorTelefone,

      // BLOCO 10
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
            .from('templates')
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

          const fileName = `${template.nome}_preenchido.pdf`.replace(/\s+/g, '_')
          const filePath = `${cliente_id}/documentos/${fileName}`

          console.log(`Salvando documento ${filePath}...`)
          const { error: uploadError } = await supabase.storage
            .from('clientes')
            .upload(filePath, fileText, { contentType: 'application/pdf', upsert: true })

          if (uploadError) {
            throw new Error(`Nao consegui salvar o documento: ${uploadError.message}`)
          }

          const { data: publicUrlData } = supabase.storage.from('clientes').getPublicUrl(filePath)
          if (template.tipo === 'contrato') urlsDocumentos.contrato_url = publicUrlData.publicUrl
          if (template.tipo === 'termo_conclusao')
            urlsDocumentos.termo_conclusao_url = publicUrlData.publicUrl
          if (template.tipo === 'termo_garantia')
            urlsDocumentos.termo_garantia_url = publicUrlData.publicUrl

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
      const produtosParaInserir = produtos.map((p: any) => ({
        formulario_comercial_id,
        cliente_id,
        nome_produto: p.nome || p.nome_produto || 'Produto',
        qtd: p.quantidade || p.qtd || 1,
        descricao: p.descricao || '',
        valor_unitario: p.valor_unitario || 0,
        valor_total: p.valor_total || p.valor_unitario * (p.qtd || 1),
        status_analise: 'iniciar',
      }))

      const { error: prodError } = await supabase
        .from('produtos_servicos_projeto')
        .insert(produtosParaInserir)

      if (prodError) throw new Error(`Erro ao inserir produtos: ${prodError.message}`)
      produtosInseridos += produtosParaInserir.length
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
