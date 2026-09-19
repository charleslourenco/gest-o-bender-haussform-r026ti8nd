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
        .select('projeto_id, cliente_id')
        .eq('id', documento_id)
        .single()

      if (docError || !docInfo) {
        throw new Error('Documento não encontrado na base de dados.')
      }

      const formulario_comercial_id = docInfo.projeto_id
      const effectiveClienteId = cliente_id || docInfo.cliente_id

      if (!formulario_comercial_id) {
        throw new Error(
          'Este documento não possui um projeto (formulario_comercial_id) vinculado. Vincule o documento à venda atual antes de gerar o PDF.',
        )
      }

      if (!effectiveClienteId) {
        throw new Error('Falta a referência do cliente (cliente_id) no documento.')
      }

      const { data: formData, error: formError } = await supabaseClient
        .from('formulario_comercial')
        .select('*, cliente:clientes(*)')
        .eq('id', formulario_comercial_id)
        .single()

      if (formError || !formData) {
        throw new Error(
          'Formulário comercial da venda atual não encontrado. Não é permitido utilizar formulários antigos.',
        )
      }

      const form: any = formData

      // Ensure projeto_id is always synced to the current sale's formulario_comercial_id
      await supabaseClient
        .from('documentos_cliente')
        .update({ projeto_id: formulario_comercial_id, cliente_id: effectiveClienteId })
        .eq('id', documento_id)

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
        .eq('status', 'ativo')
        .single()

      if (!template?.external_template_id) {
        throw new Error(
          `Template "${template_nome}" não possui um PDFMonkey Template ID configurado.`,
        )
      }

      const clienteNome = form.nome_cliente || form.cliente?.nome || 'Cliente não informado'
      const cpf = form.cpf || form.cliente?.cpf || 'Não informado'
      const tipo_pessoa =
        (form as any).tipo_pessoa ||
        (form.cliente as any)?.tipo_pessoa ||
        (cpf.replace(/\D/g, '').length === 14 ? 'PJ' : 'PF')
      const nome_fantasia =
        (form as any).nome_fantasia || (form.cliente as any)?.nome_fantasia || ''
      const inscricao_estadual =
        (form as any).inscricao_estadual || (form.cliente as any)?.inscricao_estadual || ''
      const data_abertura =
        (form as any).data_abertura || (form.cliente as any)?.data_abertura || null
      const data_nascimento = form.data_nascimento || form.cliente?.data_nascimento || null
      const email = form.cliente?.email || 'Não informado'
      const telefone = form.cliente?.telefone || 'Não informado'
      const profissao = tipo_pessoa === 'PJ' ? '' : form.profissao || 'Não informado'
      const estado_civil = tipo_pessoa === 'PJ' ? '' : form.estado_civil || 'Não informado'
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

      let produtos = []
      if (form.id) {
        // Garantir que todos os itens, incluindo terceirizados, sejam puxados
        const { data: projProdutos } = await supabaseClient
          .from('produtos_servicos_projeto')
          .select('*')
          .eq('formulario_comercial_id', form.id)
          .order('criado_em', { ascending: true })

        if (projProdutos && projProdutos.length > 0) {
          produtos = projProdutos
        }
      }

      if (!produtos || produtos.length === 0) {
        produtos = (form.produtos_servicos as any[]) || []
      }
      if (!produtos || produtos.length === 0) {
        produtos = (form.itens as any[]) || []
      }
      if (!produtos || produtos.length === 0) {
        produtos = (form.ambientes as any[]) || []
      }

      if (!produtos || produtos.length === 0) {
        throw new Error('Nenhum produto ou serviço encontrado para gerar o documento.')
      }

      const subtotalProdutos = Array.isArray(produtos)
        ? produtos.reduce(
            (acc: number, p: any) =>
              acc +
              (Number(p.valor_total) ||
                (Number(p.valor_unitario) || 0) * (Number(p.qtd) || Number(p.quantidade) || 1)),
            0,
          )
        : 0
      const descontoProdutos = Number(form.desconto) || 0
      const valorTotal = subtotalProdutos - descontoProdutos

      // =========================================================================
      // CÁLCULO DOS MÓDULOS E DO ACOMPANHAMENTO CONTRATADO
      // Regras:
      // - tem_modulo_1/2/3 calculados pelo tipo gravado (fallback: is_outsourced → módulo 2;
      //   'acompanhamento' no nome/descrição → módulo 3; resto → módulo 1)
      // - acompanhamento_tipo na raiz com o(s) nome(s) do(s) plano(s) contratado(s) no formato
      //   'Bender Essencial' / 'Bender Forma' / 'Bender Hauss' (separados por vírgula se mais de um)
      // =========================================================================
      let temModulo1 = false
      let temModulo2 = false
      let temModulo3 = false
      const planosAcompanhamentoSet = new Set<string>()

      for (const item of produtos) {
        const itemTipo = (item.tipo || '').trim()
        const nomeLower = (item.nome || item.nome_produto || '').toLowerCase()
        const descLower = (item.descricao || '').toLowerCase()
        const isOut = Boolean(item.is_outsourced)

        if (itemTipo === 'Sob medida') {
          temModulo1 = true
        } else if (itemTipo === 'Móveis soltos') {
          temModulo2 = true
        } else if (itemTipo === 'Acompanhamento Bender Essencial') {
          temModulo3 = true
          planosAcompanhamentoSet.add('Bender Essencial')
        } else if (itemTipo === 'Acompanhamento Bender Forma') {
          temModulo3 = true
          planosAcompanhamentoSet.add('Bender Forma')
        } else if (itemTipo === 'Acompanhamento Bender Hauss') {
          temModulo3 = true
          planosAcompanhamentoSet.add('Bender Hauss')
        } else {
          // Fallback quando `tipo` não estiver gravado:
          // is_outsourced → módulo 2; 'acompanhamento' no nome/descrição → módulo 3; resto → módulo 1
          if (nomeLower.includes('acompanhamento') || descLower.includes('acompanhamento')) {
            temModulo3 = true
            if (nomeLower.includes('essencial') || descLower.includes('essencial')) {
              planosAcompanhamentoSet.add('Bender Essencial')
            } else if (nomeLower.includes('forma') || descLower.includes('forma')) {
              planosAcompanhamentoSet.add('Bender Forma')
            } else if (nomeLower.includes('hauss') || descLower.includes('hauss')) {
              planosAcompanhamentoSet.add('Bender Hauss')
            }
          } else if (isOut) {
            temModulo2 = true
          } else {
            temModulo1 = true
          }
        }
      }

      // Ordenação padronizada dos planos caso haja múltiplos
      const ordemPlanos = ['Bender Essencial', 'Bender Forma', 'Bender Hauss']
      const planosOrdenados = ordemPlanos.filter((p) => planosAcompanhamentoSet.has(p))
      // Inclui outros planos caso não estejam na lista padrão
      planosAcompanhamentoSet.forEach((p) => {
        if (!planosOrdenados.includes(p)) planosOrdenados.push(p)
      })
      const acompanhamentoTipoStr = planosOrdenados.join(', ')

      const pagamentos = (form.pagamentos as any) || {}
      const forma_pagamento = pagamentos.forma === 'A_VISTA' ? 'À Vista' : 'Parcelado'
      const parcelas = form.parcelas || pagamentos.parcelado || []
      const clausula_pagamento = pagamentos.narrativa || form.especificacoes || 'Não informado'

      const formatCurrency = (val: number) => {
        if (!val && val !== 0) return 'R$ 0,00'
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
      }
      const formatNumber = (val: number) => {
        if (!val && val !== 0) return '0,00'
        return new Intl.NumberFormat('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(val)
      }
      const formatDate = (dateStr: string | null) => {
        if (!dateStr) return 'Não informado'
        const parts = dateStr.split('T')[0].split('-')
        if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`
        return dateStr
      }

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

      let vendedorNome = 'Não informado'
      if (form.user_id) {
        const { data: user } = await supabaseClient
          .from('users')
          .select('nome')
          .eq('id', form.user_id)
          .single()
        if (user && user.nome) vendedorNome = user.nome
      }

      // Dados da empresa: busca na tabela `empresa` (primeiro registro).
      // Mantém fallback hardcoded se a tabela não existir ou estiver vazia.
      let empresaCnpj = '00.000.000/0001-00'
      let empresaTelefone = '(00) 0000-0000'
      try {
        const { data: empresaData, error: empresaError } = await supabaseClient
          .from('empresa')
          .select('cnpj, telefone')
          .limit(1)
          .maybeSingle()

        if (empresaError) {
          console.warn(
            'Aviso: não foi possível ler a tabela empresa (mantendo fallback). Detalhe:',
            empresaError.message,
          )
        } else if (empresaData) {
          if (empresaData.cnpj) empresaCnpj = empresaData.cnpj
          if (empresaData.telefone) empresaTelefone = empresaData.telefone
        } else {
          console.warn(
            'Aviso: tabela empresa está vazia — mantendo valores de fallback para CNPJ/telefone.',
          )
        }
      } catch (empresaEx: any) {
        console.warn(
          'Aviso: erro ao consultar tabela empresa (mantendo fallback). Detalhe:',
          empresaEx?.message || empresaEx,
        )
      }

      // Assinaturas vinculadas ao cliente, para popular o placeholder do PDFMonkey.
      // Mantém [] se não houver dados ou se a leitura falhar (não quebra o payload).
      let assinaturasPayload: any[] = []
      try {
        const { data: assinaturasData } = await supabaseClient
          .from('assinaturas')
          .select(
            'signatario_nome, signatario_cpf, signatario_email, signatario_tipo, status, data_assinatura',
          )
          .eq('cliente_id', effectiveClienteId)
        if (assinaturasData && assinaturasData.length > 0) {
          assinaturasPayload = assinaturasData.map((a: any) => ({
            nome: a.signatario_nome || '',
            cpf: a.signatario_cpf || '',
            email: a.signatario_email || '',
            tipo: a.signatario_tipo || '',
            status: a.status || '',
            data: a.data_assinatura || '',
          }))
        }
      } catch (assinaturasEx: any) {
        console.warn(
          'Aviso: não foi possível popular assinaturas (mantendo []).',
          assinaturasEx?.message || assinaturasEx,
        )
      }

      const placeholders: any = {
        NOME_CLIENTE: clienteNome,
        CLIENTE_NOME: clienteNome,
        CLIENTE_CPF_CNPJ: cpf,
        CPF_CLIENTE: cpf,
        TIPO_PESSOA: tipo_pessoa,
        NOME_FANTASIA: nome_fantasia || 'Não informado',
        INSCRICAO_ESTADUAL: inscricao_estadual || 'Não informado',
        DATA_ABERTURA: formatDate(data_abertura),
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
        CLI_NOME: clienteNome,
        CLI_NOME_COMPLETO: clienteNome,
        CLI_CPF_CNPJ: cpf,
        CLI_CPF: cpf,
        CLI_ENDERECO_COMPLETO: buildAddress(
          end_rua,
          end_numero,
          end_complemento,
          end_bairro,
          end_cidade,
          end_estado,
          end_cep,
        ),
        CLI_PROFISSAO: profissao,
        CLI_ESTADO_CIVIL: estado_civil,
        CLI_EMAIL: email,
        CLI_TELEFONE: telefone,
        CLI_ENDERECO_OBRA: buildAddress(
          obra_rua,
          obra_numero,
          obra_complemento,
          obra_bairro,
          obra_cidade,
          obra_estado,
          obra_cep,
        ),
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
        DATA_ENTREGA: formatDate(data_prevista_entrega),
        SUBTOTAL_PRODUTOS: formatCurrency(subtotalProdutos),
        SUBTOTAL_PRODUTOS_MOEDA: formatCurrency(subtotalProdutos),
        VALOR_DESCONTO: formatCurrency(descontoProdutos),
        VALOR_DESCONTO_MOEDA: formatCurrency(descontoProdutos),
        TOTAL_GERAL: formatCurrency(valorTotal),
        TOTAL_GERAL_MOEDA: formatCurrency(valorTotal),
        TOTAL_PRODUTOS: formatCurrency(valorTotal),
        VALOR_TOTAL: formatCurrency(valorTotal),
        VALOR_TOTAL_MOEDA: formatCurrency(valorTotal),
        VALOR_TOTAL_CONTRATO: formatCurrency(valorTotal),
        DESCONTO: formatCurrency(descontoProdutos),
        DESCONTO_PRODUTOS: formatCurrency(descontoProdutos),
        DESCONTO_MOEDA: formatCurrency(descontoProdutos),
        total_geral: formatCurrency(subtotalProdutos),
        valor_desconto: formatCurrency(descontoProdutos),
        valor_final: formatCurrency(valorTotal),
        FORMA_PAGAMENTO: forma_pagamento,
        NUMERO_PARCELAS: parcelas.length || 1,
        VALOR_PARCELA:
          parcelas.length > 0
            ? formatCurrency(Number(parcelas[0].valor || parcelas[0].valor_parcela) || 0)
            : formatCurrency(valorTotal),
        CLAUSULA_PAGAMENTO_NARRATIVA: clausula_pagamento,
        METODO_PAGAMENTO: form.metodo_pagamento || pagamentos.forma || 'Não informado',
        VENDEDOR_NOME: vendedorNome,
        NUMERO_PROJETO: form.id.substring(0, 8).toUpperCase(),
        EMPRESA_NOME: 'Bender Haussform',
        EMPRESA_CNPJ: empresaCnpj,
        EMPRESA_ENDERECO: 'Balneário Piçarras - SC',
        EMPRESA_TELEFONE: empresaTelefone,
        EMPRESA_EMAIL: 'projetos@benderhaussform.com',
        // Flags booleanas de módulos na raiz:
        tem_modulo_1: temModulo1,
        tem_modulo_2: temModulo2,
        tem_modulo_3: temModulo3,
        // Nomes dos planos de acompanhamento contratados (ex: 'Bender Essencial' ou 'Bender Essencial, Bender Forma')
        acompanhamento_tipo: acompanhamentoTipoStr,
        produtos: produtos.map((p: any) => {
          const quantidade = Number(p.qtd || p.quantidade) || 1
          const valorUnitario = Number(p.valor_unitario) || 0
          const vTotal = Number(p.valor_total) || valorUnitario * quantidade
          const solicitarCompra = Boolean(
            p.is_outsourced || p.solicitar_compra || p.tipo === 'Móveis soltos',
          )
          // OBS: Conforme a regra do usuário, o tipo escolhido NÃO aparece no PDF (tabela exibe só nome/descrição/quantidade/valores).
          return {
            environment: p.ambiente || p.nome_produto || p.nome || '',
            description: p.descricao || p.nome_produto || p.nome || '',
            quantity: quantidade,
            unit_value: formatCurrency(valorUnitario),
            total_value: formatCurrency(vTotal),
            ambiente: p.ambiente || p.nome_produto || p.nome || '',
            descricao: p.descricao || p.nome_produto || p.nome || '',
            quantidade: String(quantidade),
            valor_unitario: formatCurrency(valorUnitario),
            valor_total: formatCurrency(vTotal),
            solicitar_compra: solicitarCompra,
          }
        }),
        parcelas: parcelas.map((p: any, i: number) => ({
          numero: i + 1,
          data: formatDate(p.data),
          valor: Number(p.valor || p.valor_parcela) || 0,
          valor_moeda: formatCurrency(Number(p.valor || p.valor_parcela) || 0),
          meio: p.meio || form.metodo_pagamento || 'Não informado',
        })),
        pagamentos: pagamentos,
        is_assinado: false,
        assinaturas: assinaturasPayload,
      }

      const pdfMonkeyApiKey = Deno.env.get('PDFMONKEY_API_KEY')
      if (!pdfMonkeyApiKey) throw new Error('PDFMONKEY_API_KEY secret is missing')

      console.log('Payload enviado para o PDFMonkey:', JSON.stringify(placeholders, null, 2))

      const pdfBytes = await generatePdfMonkeyDocument(
        template.external_template_id,
        placeholders,
        pdfMonkeyApiKey,
      )

      const safeTemplateNome = (template_nome || 'documento')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]/g, '_')
      const fileName = `contratos/${effectiveClienteId}/${safeTemplateNome}_${formulario_comercial_id}_${Date.now()}.pdf`

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
      try {
        if (payloadReq?.documento_id) {
          await supabaseClient
            .from('documentos_cliente')
            .update({
              status: 'erro_geracao',
              conteudo_preenchido: `Erro na geração: ${error.message}`,
            })
            .eq('id', payloadReq.documento_id)
        }

        await supabaseClient.from('logs_ia').insert({
          acao: 'gerar_documento_cliente_error',
          detalhes: { error: error.message },
        })
      } catch (e) {
        console.error(e)
      }
    }

    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
