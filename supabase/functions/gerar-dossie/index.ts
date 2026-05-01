import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

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
      return new Response(
        JSON.stringify({
          error: 'Os campos formulario_comercial_id, cliente_id e user_id são obrigatórios.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    })

    // 1. Busque formulario_comercial
    const { data: form, error: formError } = await supabase
      .from('formulario_comercial')
      .select('*, cliente:clientes(nome, cpf)')
      .eq('id', formulario_comercial_id)
      .single()

    if (formError || !form) {
      throw new Error('Formulário comercial não encontrado.')
    }

    let vendedorNome = ''
    if (form.usuario_id) {
      const { data: user } = await supabase
        .from('users')
        .select('nome')
        .eq('id', form.usuario_id)
        .single()
      if (user) vendedorNome = user.nome
    }

    // 2. Para cada linha em produtos_servicos, crie um registro em produtos_servicos_projeto
    const produtos = (form.produtos_servicos as any[]) || []
    if (Array.isArray(produtos) && produtos.length > 0) {
      const produtosParaInserir = produtos.map((p: any) => ({
        formulario_comercial_id,
        cliente_id,
        nome_produto: p.nome || p.nome_produto || 'Produto',
        qtd: p.quantidade || p.qtd || 1,
        descricao: p.descricao || '',
        valor_unitario: p.valor_unitario || 0,
        valor_total: p.valor_total || 0,
        status_analise: 'iniciar',
      }))

      const { error: prodError } = await supabase
        .from('produtos_servicos_projeto')
        .insert(produtosParaInserir)

      if (prodError) throw new Error(`Erro ao inserir produtos: ${prodError.message}`)
    }

    // 3. Para cada parcela em pagamentos, crie um registro em contas_receber
    const pagamentos = (form.pagamentos as any[]) || []
    if (Array.isArray(pagamentos) && pagamentos.length > 0) {
      const parcelasParaInserir: any[] = []

      for (const pag of pagamentos) {
        if (pag.parcelas && Array.isArray(pag.parcelas)) {
          pag.parcelas.forEach((parcela: any) => {
            parcelasParaInserir.push({
              user_id,
              cliente_id,
              formulario_comercial_id,
              numero_parcela: parcela.numero_parcela || `${parcela.numero || 1}`,
              data_vencimento: parcela.data_vencimento || new Date().toISOString().split('T')[0],
              valor: parcela.valor || 0,
              status_pagamento: 'aguardando',
            })
          })
        } else if (pag.data_vencimento && pag.valor) {
          parcelasParaInserir.push({
            user_id,
            cliente_id,
            formulario_comercial_id,
            numero_parcela: pag.numero_parcela || '1/1',
            data_vencimento: pag.data_vencimento,
            valor: pag.valor,
            status_pagamento: 'aguardando',
          })
        }
      }

      if (parcelasParaInserir.length > 0) {
        const { error: pagError } = await supabase
          .from('contas_receber')
          .insert(parcelasParaInserir)
        if (pagError) throw new Error(`Erro ao inserir contas a receber: ${pagError.message}`)
      }
    }

    // 4 & 5. Busque templates
    const { data: templates, error: tempError } = await supabase
      .from('templates')
      .select('*')
      .in('tipo', ['contrato', 'termo_conclusao', 'termo_garantia'])

    if (tempError) throw new Error(`Erro ao buscar templates: ${tempError.message}`)

    const urlsDocumentos: Record<string, string> = {
      contrato_url: '',
      termo_conclusao_url: '',
      termo_garantia_url: '',
    }

    const clienteNome = form.cliente?.nome || ''
    const cpf = form.cliente?.cpf || form.cpf || ''
    const valorTotal = Array.isArray(produtos)
      ? produtos.reduce((acc: number, p: any) => acc + (Number(p.valor_total) || 0), 0)
      : 0
    const datas = (form.datas as any) || {}
    const dataVenda = datas.data_venda || new Date().toISOString().split('T')[0]
    const vendedor = vendedorNome
    const dataMedidaFina = datas.data_medida_fina || ''
    const dataEntregaInicio = datas.data_entrega_inicio || ''
    const dataEntregaFim = datas.data_entrega_fim || ''

    // 6. Para cada template
    if (templates && templates.length > 0) {
      for (const template of templates) {
        if (!template.arquivo_url) continue

        let fileText = ''
        try {
          if (template.arquivo_url.startsWith('http')) {
            const res = await fetch(template.arquivo_url)
            fileText = await res.text()
          } else {
            const { data: fileData } = await supabase.storage
              .from('templates')
              .download(template.arquivo_url)
            if (fileData) {
              fileText = await fileData.text()
            }
          }

          if (fileText) {
            fileText = fileText
              .replace(/{{CLIENTE_NOME}}/g, clienteNome)
              .replace(/{{CPF}}/g, cpf)
              .replace(/{{VALOR_TOTAL}}/g, valorTotal.toString())
              .replace(/{{DATA_VENDA}}/g, dataVenda)
              .replace(/{{VENDEDOR}}/g, vendedor)
              .replace(/{{DATA_MEDIDA_FINA}}/g, dataMedidaFina)
              .replace(/{{DATA_ENTREGA_INICIO}}/g, dataEntregaInicio)
              .replace(/{{DATA_ENTREGA_FIM}}/g, dataEntregaFim)

            const fileName = `${template.nome}_preenchido.pdf`.replace(/\s+/g, '_')
            const filePath = `${cliente_id}/documentos/${fileName}`

            const { error: uploadError } = await supabase.storage
              .from('clientes')
              .upload(filePath, fileText, { contentType: 'application/pdf', upsert: true })

            if (!uploadError) {
              const { data: publicUrlData } = supabase.storage
                .from('clientes')
                .getPublicUrl(filePath)
              if (template.tipo === 'contrato')
                urlsDocumentos.contrato_url = publicUrlData.publicUrl
              if (template.tipo === 'termo_conclusao')
                urlsDocumentos.termo_conclusao_url = publicUrlData.publicUrl
              if (template.tipo === 'termo_garantia')
                urlsDocumentos.termo_garantia_url = publicUrlData.publicUrl
            }
          }
        } catch (downloadError) {
          console.error(`Erro ao processar template ${template.nome}:`, downloadError)
        }
      }
    }

    // 7. Crie registro em dossiês
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

    return new Response(
      JSON.stringify({ data: { success: true, message: 'Dossiê gerado com sucesso' } }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error: any) {
    console.error('Erro na geração de dossiê:', error)
    return new Response(JSON.stringify({ error: `Falha ao gerar dossiê: ${error.message}` }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
