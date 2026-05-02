import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import Docxtemplater from 'npm:docxtemplater@3'
import PizZip from 'npm:pizzip@3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ mensagem: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ mensagem: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const { template_nome, cliente_id, projeto_id, dados_formulario } = body

    if (
      !template_nome ||
      typeof template_nome !== 'string' ||
      !cliente_id ||
      typeof cliente_id !== 'string' ||
      !projeto_id ||
      typeof projeto_id !== 'string' ||
      !dados_formulario ||
      typeof dados_formulario !== 'object'
    ) {
      return new Response(
        JSON.stringify({
          mensagem:
            'Parâmetros inválidos. template_nome, cliente_id, projeto_id e dados_formulario são obrigatórios.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(cliente_id) || !uuidRegex.test(projeto_id)) {
      return new Response(
        JSON.stringify({ mensagem: 'cliente_id ou projeto_id não são UUIDs válidos.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const { data: template } = await supabaseAdmin
      .from('templates')
      .select('*')
      .eq('nome', template_nome)
      .single()

    if (!template) {
      await supabaseAdmin.from('documentos_cliente').insert({
        cliente_id,
        projeto_id,
        template_nome,
        tipo: 'desconhecido',
        status: 'erro_template_nao_encontrado',
      })
      return new Response(
        JSON.stringify({
          sucesso: true,
          mensagem: 'Documento não pôde ser gerado',
          motivo: 'template não encontrado',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    let arrayBuffer: ArrayBuffer
    try {
      const res = await fetch(template.arquivo_url)
      if (!res.ok) throw new Error('Download falhou')
      arrayBuffer = await res.arrayBuffer()
    } catch (e) {
      await supabaseAdmin.from('documentos_cliente').insert({
        cliente_id,
        projeto_id,
        template_id: template.id,
        template_nome,
        tipo: template.tipo,
        status: 'erro_download_template',
      })
      return new Response(
        JSON.stringify({
          sucesso: true,
          mensagem: 'Documento não pôde ser gerado',
          motivo: 'erro ao baixar template',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const zip = new PizZip(arrayBuffer)
    const missingPlaceholders = new Set<string>()

    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '{{', end: '}}' },
      nullGetter: function (part: any) {
        if (!part.module) {
          missingPlaceholders.add(part.value)
          return '{{' + part.value + '}}'
        }
        return ''
      },
    })

    const val = (v: any) => (v === null || v === undefined || v === '' ? undefined : String(v))

    const docData: Record<string, any> = {
      CLIENTE_NOME: val(dados_formulario.nome),
      CLIENTE_CPF_CNPJ: val(dados_formulario.cpf),
      CLIENTE_TELEFONE: val(dados_formulario.telefone),
      CLIENTE_EMAIL: val(dados_formulario.email),
      CLIENTE_PROFISSAO: val(dados_formulario.profissao),
      CLIENTE_ESTADO_CIVIL: val(dados_formulario.estado_civil),
      CLIENTE_CEP: val(dados_formulario.cep),
      CLIENTE_RUA: val(dados_formulario.rua),
      CLIENTE_NUMERO: val(dados_formulario.numero),
      CLIENTE_COMPLEMENTO: val(dados_formulario.complemento),
      CLIENTE_BAIRRO: val(dados_formulario.bairro),
      CLIENTE_CIDADE: val(dados_formulario.municipio),
      CLIENTE_ESTADO: val(dados_formulario.estado),
      OBRA_CEP: val(dados_formulario.obra_cep),
      OBRA_RUA: val(dados_formulario.obra_rua),
      OBRA_NUMERO: val(dados_formulario.obra_numero),
      OBRA_COMPLEMENTO: val(dados_formulario.obra_complemento),
      OBRA_BAIRRO: val(dados_formulario.obra_bairro),
      OBRA_CIDADE: val(dados_formulario.obra_municipio),
      OBRA_ESTADO: val(dados_formulario.obra_estado),
      DATA_ACESSO_MOVEL: val(dados_formulario.datas?.acesso_movel),
      DATA_ASSINATURA_CONTRATO: val(dados_formulario.datas?.assinatura_contrato),
      TESTEMUNHA_01_NOME: val(dados_formulario.testemunha_01_nome),
      TESTEMUNHA_01_CPF: val(dados_formulario.testemunha_01_cpf),
      TESTEMUNHA_02_NOME: val(dados_formulario.testemunha_02_nome),
      TESTEMUNHA_02_CPF: val(dados_formulario.testemunha_02_cpf),
      ASSINANTE_NOME: val(dados_formulario.assinante_nome),
      ASSINANTE_CPF: val(dados_formulario.assinante_cpf),
      FORMA_PAGAMENTO: val(dados_formulario.forma_pagamento),
      METODO_PAGAMENTO: val(dados_formulario.metodo_pagamento),
      DATA_PAGAMENTO: val(dados_formulario.data_pagamento),
      EMPRESA_NOME: val(dados_formulario.empresa_nome || 'Sua Empresa'),
      EMPRESA_CNPJ: val(dados_formulario.empresa_cnpj),
      EMPRESA_ENDERECO: val(dados_formulario.empresa_endereco),
      EMPRESA_TELEFONE: val(dados_formulario.empresa_telefone),
      EMPRESA_EMAIL: val(dados_formulario.empresa_email),
      VENDEDOR_NOME: val(dados_formulario.vendedor_nome),
      VENDEDOR_CPF: val(dados_formulario.vendedor_cpf),
      VENDEDOR_EMAIL: val(dados_formulario.vendedor_email),
      VENDEDOR_TELEFONE: val(dados_formulario.vendedor_telefone),
      NUMERO_PROJETO: val(dados_formulario.numero_projeto || projeto_id),
      VALOR_TOTAL: val(
        dados_formulario.valor_total || dados_formulario.desconto
          ? Number(dados_formulario.valor_total || 0) - Number(dados_formulario.desconto || 0)
          : undefined,
      ),
      DATA_VENDA: val(dados_formulario.data_venda || dados_formulario.criado_em),
    }

    const produtos = Array.isArray(dados_formulario.produtos_servicos)
      ? dados_formulario.produtos_servicos
      : []
    const blocoProdutos = produtos
      .map(
        (p: any, i: number) =>
          `${i + 1}. ${p.nome || p.nome_produto || ''} - Qtd: ${p.qtd || p.quantidade || 1} - R$ ${p.valor_total || p.valor || 0}`,
      )
      .join('\n')
    docData['BLOCO_PRODUTOS_SERVICOS'] = val(blocoProdutos)

    for (let i = 1; i <= 20; i++) {
      const p = produtos[i - 1]
      docData[`PRODUTO_LINHA_${i}_NOME`] = p ? val(p.nome || p.nome_produto) : undefined
      docData[`PRODUTO_LINHA_${i}_DESCRICAO`] = p ? val(p.descricao) : undefined
      docData[`PRODUTO_LINHA_${i}_VALOR`] = p ? val(p.valor_total || p.valor) : undefined
    }

    const pagamentos = Array.isArray(dados_formulario.pagamentos) ? dados_formulario.pagamentos : []
    const blocoParcelas = pagamentos
      .map(
        (p: any, i: number) =>
          `Parcela ${p.numero || i + 1}: R$ ${p.valor || 0} - Venc: ${p.data_vencimento || ''}`,
      )
      .join('\n')
    docData['BLOCO_PARCELAS'] = val(blocoParcelas)
    docData['BLOCO_PARCELAS_TEXTO'] = val(blocoParcelas)

    for (let i = 1; i <= 24; i++) {
      const p = pagamentos[i - 1]
      docData[`PARCELA_${i}_NUMERO`] = p ? val(p.numero) : undefined
      docData[`PARCELA_${i}_VALOR`] = p ? val(p.valor) : undefined
      docData[`PARCELA_${i}_DATA_VENCIMENTO`] = p ? val(p.data_vencimento) : undefined
    }

    try {
      doc.render(docData)
    } catch (error) {
      console.error('Render error:', error)
    }

    const buf = doc.getZip().generate({
      type: 'uint8array',
      compression: 'DEFLATE',
    })

    const now = new Date().toISOString().replace(/[:.]/g, '-')
    const safeTemplateName = template_nome.replace(/[^a-z0-9]/gi, '_')
    const fileName = `${safeTemplateName}_${now}.docx`
    const filePath = `${cliente_id}/${projeto_id}/${fileName}`

    const { error: uploadError } = await supabaseAdmin.storage
      .from('dossiers')
      .upload(filePath, buf, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: true,
      })

    if (uploadError) {
      await supabaseAdmin.from('documentos_cliente').insert({
        cliente_id,
        projeto_id,
        template_id: template.id,
        template_nome,
        tipo: template.tipo,
        status: 'erro_salvamento',
      })
      return new Response(
        JSON.stringify({
          sucesso: true,
          mensagem: 'Documento não pôde ser gerado',
          motivo: 'erro_salvamento',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const { data: publicUrlData } = supabaseAdmin.storage.from('dossiers').getPublicUrl(filePath)
    const arquivo_url = publicUrlData.publicUrl

    const { error: dbError } = await supabaseAdmin.from('documentos_cliente').insert({
      cliente_id,
      projeto_id,
      template_id: template.id,
      template_nome,
      tipo: template.tipo,
      arquivo_url,
      status: 'gerado',
    })

    if (dbError) {
      console.error('Error inserting into documentos_cliente:', dbError)
    }

    if (missingPlaceholders.size > 0) {
      const avisos = Array.from(missingPlaceholders).map(
        (p) => `Placeholder {{${p}}} não preenchido`,
      )
      return new Response(
        JSON.stringify({
          sucesso: true,
          arquivo_url,
          mensagem: 'Documento gerado com avisos',
          avisos,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    return new Response(
      JSON.stringify({
        sucesso: true,
        arquivo_url,
        mensagem: 'Documento gerado com sucesso',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(JSON.stringify({ mensagem: 'Erro interno no servidor' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
