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
    const { cliente_id, projeto_id } = body

    if (
      !cliente_id ||
      typeof cliente_id !== 'string' ||
      !projeto_id ||
      typeof projeto_id !== 'string'
    ) {
      return new Response(
        JSON.stringify({
          mensagem: 'Parâmetros inválidos. cliente_id e projeto_id são obrigatórios.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const { data: form } = await supabaseClient
      .from('formulario_comercial')
      .select('*')
      .eq('id', projeto_id)
      .single()
    const { data: cliente } = await supabaseClient
      .from('clientes')
      .select('*')
      .eq('id', cliente_id)
      .single()
    const { data: vendedor } = form?.usuario_id
      ? await supabaseClient.from('users').select('*').eq('id', form.usuario_id).single()
      : { data: null }

    const dados_formulario = form || {}
    const val = (v: any) => (v === null || v === undefined || v === '' ? undefined : String(v))

    const docData: Record<string, any> = {
      CLIENTE_NOME: val(cliente?.nome || dados_formulario.nome),
      CLIENTE_CPF_CNPJ: val(cliente?.cpf || dados_formulario.cpf),
      CLIENTE_TELEFONE: val(cliente?.telefone || dados_formulario.telefone),
      CLIENTE_EMAIL: val(cliente?.email || dados_formulario.email),
      CLIENTE_PROFISSAO: val(cliente?.profissao || dados_formulario.profissao),
      CLIENTE_ESTADO_CIVIL: val(dados_formulario.estado_civil),
      CLIENTE_CEP: val(cliente?.cep || dados_formulario.cep),
      CLIENTE_RUA: val(cliente?.endereco_obra || dados_formulario.rua),
      CLIENTE_NUMERO: val(cliente?.numero || dados_formulario.numero),
      CLIENTE_COMPLEMENTO: val(cliente?.complemento || dados_formulario.complemento),
      CLIENTE_BAIRRO: val(cliente?.bairro || dados_formulario.bairro),
      CLIENTE_CIDADE: val(cliente?.cidade || dados_formulario.municipio),
      CLIENTE_ESTADO: val(cliente?.estado || dados_formulario.estado),
      OBRA_CEP: val(dados_formulario.obra_cep),
      OBRA_RUA: val(dados_formulario.obra_rua),
      OBRA_NUMERO: val(dados_formulario.obra_numero),
      OBRA_COMPLEMENTO: val(dados_formulario.obra_complemento),
      OBRA_BAIRRO: val(dados_formulario.obra_bairro),
      OBRA_CIDADE: val(dados_formulario.obra_municipio),
      OBRA_ESTADO: val(dados_formulario.obra_estado),
      DATA_ACESSO_MOVEL: val(dados_formulario.datas?.acesso_movel),
      DATA_ASSINATURA_CONTRATO: val(
        dados_formulario.datas?.assinatura_contrato || new Date().toLocaleDateString('pt-BR'),
      ),
      TESTEMUNHA_01_NOME: undefined,
      TESTEMUNHA_01_CPF: undefined,
      TESTEMUNHA_02_NOME: undefined,
      TESTEMUNHA_02_CPF: undefined,
      ASSINANTE_NOME: val(cliente?.nome),
      ASSINANTE_CPF: val(cliente?.cpf),
      FORMA_PAGAMENTO: val(dados_formulario.pagamentos?.forma),
      METODO_PAGAMENTO: val(dados_formulario.pagamentos?.a_vista?.meio || 'Diversos'),
      DATA_PAGAMENTO: val(dados_formulario.pagamentos?.a_vista?.data),
      EMPRESA_NOME: 'Bender Haussform',
      EMPRESA_CNPJ: '00.000.000/0001-00',
      EMPRESA_ENDERECO: 'Endereço da Empresa',
      EMPRESA_TELEFONE: 'Telefone da Empresa',
      EMPRESA_EMAIL: 'contato@benderhaussform.com.br',
      VENDEDOR_NOME: val(vendedor?.nome),
      VENDEDOR_CPF: undefined,
      VENDEDOR_EMAIL: val(vendedor?.email),
      VENDEDOR_TELEFONE: val(vendedor?.telefone),
      NUMERO_PROJETO: val(projeto_id?.substring(0, 8).toUpperCase()),
      VALOR_TOTAL: val(
        dados_formulario.produtos_servicos?.reduce?.(
          (acc: any, p: any) => acc + (Number(p.valor_total) || 0),
          0,
        ) - Number(dados_formulario.desconto || 0),
      ),
      DATA_VENDA: val(dados_formulario.datas?.data_venda || dados_formulario.criado_em),
    }

    const produtos = Array.isArray(dados_formulario.produtos_servicos)
      ? dados_formulario.produtos_servicos
      : []
    const blocoProdutos = produtos
      .map(
        (p: any, i: number) =>
          `${i + 1}. ${p.nome || p.nome_produto || ''} - Qtd: ${p.qtd || p.quantidade || 1} - R$ ${p.valor_total || p.valor || p.valor_unitario || 0}`,
      )
      .join('\n')

    const pagamentos = Array.isArray(dados_formulario.pagamentos?.parcelado)
      ? dados_formulario.pagamentos.parcelado
      : []
    const blocoParcelas = pagamentos
      .map((p: any, i: number) => `Parcela ${i + 1}: R$ ${p.valor || 0} - Venc: ${p.data || ''}`)
      .join('\n')

    const formatCurrency = (n: any) =>
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(n) || 0)
    const blocoParcelasTextFormatado = pagamentos
      .map(
        (p: any, i: number) =>
          `${i + 1}ª parcela de ${formatCurrency(p.valor)} com vencimento para ${p.data ? p.data.split('-').reverse().join('/') : ''}`,
      )
      .join(', ')

    const customPayload = dados_formulario.placeholders_customizados || {}
    for (const [key, value] of Object.entries(customPayload)) {
      docData[key] = val(value)
    }

    const templateNames = [
      'Contrato',
      'Termo de Alteração',
      'Termo de Conclusão e Vistoria',
      'Termo de Garantia',
      'Termo de Não Conformidade',
      'Termo de Recusa',
      'Termo de Representação',
    ]

    const { data: templates } = await supabaseAdmin
      .from('templates')
      .select('*')
      .in('nome', templateNames)

    let templatesToProcess = templates || []
    if (templatesToProcess.length === 0) {
      const { data: allActive } = await supabaseAdmin.from('templates').select('*')
      templatesToProcess = (allActive || []).filter(
        (t) =>
          templateNames.includes(t.nome) || t.nome.includes('Termo') || t.nome.includes('Contrato'),
      )
    }

    const resultados = await Promise.allSettled(
      templatesToProcess.map(async (template) => {
        try {
          let arrayBuffer: ArrayBuffer
          const res = await fetch(template.arquivo_url)
          if (!res.ok) throw new Error('Download falhou')
          arrayBuffer = await res.arrayBuffer()

          const zip = new PizZip(arrayBuffer)
          const xmlContent = zip.file('word/document.xml')?.asText() || ''
          const cleanText = xmlContent.replace(/<[^>]+>/g, '')
          const matches = cleanText.match(/\{\{([a-zA-Z0-9_]+)\}\}/g) || []
          const placeholdersFound = new Set<string>()
          matches.forEach((m) => placeholdersFound.add(m.replace(/[{}]/g, '')))

          const hasBlocoProdutos = placeholdersFound.has('BLOCO_PRODUTOS_SERVICOS')
          const hasBlocoParcelas = placeholdersFound.has('BLOCO_PARCELAS')
          const hasBlocoParcelasText = placeholdersFound.has('BLOCO_PARCELAS_TEXTO')

          const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            delimiters: { start: '{{', end: '}}' },
            nullGetter: function (part: any) {
              if (!part.module) {
                return '{{' + part.value + '}}'
              }
              return ''
            },
          })

          const templateData = { ...docData }

          if (hasBlocoProdutos) {
            templateData['BLOCO_PRODUTOS_SERVICOS'] = val(blocoProdutos)
            for (let i = 1; i <= 12; i++) {
              templateData[`PRODUTO_LINHA_${i}_NOME`] = ''
              templateData[`PRODUTO_LINHA_${i}_DESCRICAO`] = ''
              templateData[`PRODUTO_LINHA_${i}_VALOR`] = ''
            }
          } else {
            templateData['BLOCO_PRODUTOS_SERVICOS'] = ''
            for (let i = 1; i <= 12; i++) {
              const p = produtos[i - 1]
              templateData[`PRODUTO_LINHA_${i}_NOME`] = p
                ? val(p.nome || p.nome_produto)
                : undefined
              templateData[`PRODUTO_LINHA_${i}_DESCRICAO`] = p ? val(p.descricao) : undefined
              templateData[`PRODUTO_LINHA_${i}_VALOR`] = p
                ? val(p.valor_total || p.valor || p.valor_unitario)
                : undefined
            }
          }

          if (hasBlocoParcelasText) {
            templateData['BLOCO_PARCELAS_TEXTO'] = val(blocoParcelasTextFormatado)
            templateData['BLOCO_PARCELAS'] = ''
            for (let i = 1; i <= 12; i++) {
              templateData[`PARCELA_${i}_NUMERO`] = ''
              templateData[`PARCELA_${i}_VALOR`] = ''
              templateData[`PARCELA_${i}_DATA_VENCIMENTO`] = ''
            }
          } else if (hasBlocoParcelas) {
            templateData['BLOCO_PARCELAS'] = val(blocoParcelas)
            templateData['BLOCO_PARCELAS_TEXTO'] = ''
            for (let i = 1; i <= 12; i++) {
              templateData[`PARCELA_${i}_NUMERO`] = ''
              templateData[`PARCELA_${i}_VALOR`] = ''
              templateData[`PARCELA_${i}_DATA_VENCIMENTO`] = ''
            }
          } else {
            templateData['BLOCO_PARCELAS'] = ''
            templateData['BLOCO_PARCELAS_TEXTO'] = ''
            for (let i = 1; i <= 12; i++) {
              const p = pagamentos[i - 1]
              templateData[`PARCELA_${i}_NUMERO`] = p ? val(i + 1) : undefined
              templateData[`PARCELA_${i}_VALOR`] = p ? val(p.valor) : undefined
              templateData[`PARCELA_${i}_DATA_VENCIMENTO`] = p ? val(p.data) : undefined
            }
          }

          doc.render(templateData)

          const buf = doc.getZip().generate({
            type: 'uint8array',
            compression: 'DEFLATE',
          })

          const safeTemplateName = template.nome.replace(/[^a-z0-9A-Z]/gi, '_')
          const fileName = `${safeTemplateName}.pdf`
          const filePath = `${cliente_id}/${projeto_id}/${fileName}`

          const { error: uploadError } = await supabaseAdmin.storage
            .from('dossiers')
            .upload(filePath, buf, {
              contentType: 'application/pdf',
              upsert: true,
            })

          if (uploadError) throw new Error('Erro no upload: ' + uploadError.message)

          const { data: publicUrlData } = supabaseAdmin.storage
            .from('dossiers')
            .getPublicUrl(filePath)
          const arquivo_url = publicUrlData.publicUrl

          await supabaseAdmin.from('documentos_cliente').insert({
            cliente_id,
            projeto_id,
            template_id: template.id,
            template_nome: template.nome,
            tipo: template.tipo || template.nome,
            arquivo_url,
            status: 'gerado',
          })

          return { template: template.nome, url: arquivo_url, sucesso: true }
        } catch (err: any) {
          console.error(`Erro no template ${template.nome}:`, err)

          await supabaseAdmin.from('documentos_cliente').insert({
            cliente_id,
            projeto_id,
            template_id: template.id,
            template_nome: template.nome,
            tipo: template.tipo || template.nome,
            status: 'erro_geracao',
          })

          return { template: template.nome, sucesso: false, erro: err.message }
        }
      }),
    )

    const sucessos = resultados
      .filter((r) => r.status === 'fulfilled' && (r as any).value.sucesso)
      .map((r: any) => r.value)
    const erros = resultados
      .filter((r) => r.status === 'fulfilled' && !(r as any).value.sucesso)
      .map((r: any) => r.value)

    return new Response(
      JSON.stringify({
        sucesso: true,
        mensagem:
          erros.length > 0
            ? `Dossiê gerado com sucesso para ${sucessos.length} templates. Erros em: ${erros.map((e: any) => e.template).join(', ')}`
            : 'Dossiê gerado com sucesso!',
        gerados: sucessos,
        erros: erros,
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
