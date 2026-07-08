import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const COMPLETED_STATUSES = ['assinado', 'concluído', 'concluido', 'signed', 'completed']

function isCompletedStatus(status: string | null | undefined): boolean {
  return COMPLETED_STATUSES.includes((status || '').toLowerCase())
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

  try {
    const { documento_id, cliente_id, manual, envelope_id: bodyEnvelopeId } = await req.json()

    if (!documento_id) {
      throw new Error('documento_id é obrigatório (deve ser o arquivo_url do documento)')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch the documentos_cliente record early so we can resolve envelope_id
    const { data: docCliente } = await supabase
      .from('documentos_cliente')
      .select('*')
      .eq('arquivo_url', documento_id)
      .maybeSingle()

    const envelopeId = bodyEnvelopeId || docCliente?.envelope_id

    // ---- Idempotency: skip if document is already fully finalized ----
    if (docCliente && isCompletedStatus(docCliente.status) && docCliente.arquivo_assinado_url) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Document already finalized — skipping duplicate processing',
          idempotent: true,
          url: docCliente.arquivo_assinado_url,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // ---- Signature reconciliation ----
    // Primary source: assinantes table linked by envelope_id
    let assinantes: any[] = []
    if (envelopeId) {
      const { data: assinantesData, error: assinantesError } = await supabase
        .from('assinantes')
        .select('*')
        .eq('envelope_id', envelopeId)
      if (assinantesError) throw assinantesError
      assinantes = assinantesData || []
    }

    // Legacy/fallback source: assinaturas table linked by documento_id
    const { data: assinaturas, error: sigError } = await supabase
      .from('assinaturas')
      .select('*')
      .eq('documento_id', documento_id)
    if (sigError) throw sigError

    const assinaturasList = assinaturas || []

    // Determine if fully signed (case-insensitive)
    let fullySigned = false
    let pendingCount = 0

    if (assinantes.length > 0) {
      pendingCount = assinantes.filter((a) => !isCompletedStatus(a.status)).length
      fullySigned = pendingCount === 0
    } else if (assinaturasList.length > 0) {
      pendingCount = assinaturasList.filter((a) => !isCompletedStatus(a.status)).length
      fullySigned = pendingCount === 0
    }

    if (!fullySigned) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Aguardando conclusão de todos os assinantes',
          pending: pendingCount,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    let finalFilePath = documento_id
    let uploadBucket = 'bender_clientes'

    let nomeCliente = 'Cliente'

    if (docCliente && docCliente.template_id) {
      const { data: template } = await supabase
        .from('templates')
        .select('*')
        .eq('id', docCliente.template_id)
        .single()

      if (template?.external_template_id) {
        let form: any = null
        if (docCliente.projeto_id) {
          const { data: formData } = await supabase
            .from('formulario_comercial')
            .select('*, cliente:clientes(*)')
            .eq('id', docCliente.projeto_id)
            .single()
          if (formData) form = formData
        }

        if (!form && docCliente.cliente_id) {
          const { data: formData } = await supabase
            .from('formulario_comercial')
            .select('*, cliente:clientes(*)')
            .eq('cliente_id', docCliente.cliente_id)
            .order('atualizado_em', { ascending: false })
            .limit(1)
            .single()
          if (formData) form = formData
        }

        if (form) {
          const formatCurrency = (val: number) => {
            if (!val && val !== 0) return 'R$ 0,00'
            return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
              val,
            )
          }
          const formatDate = (dateStr: string) => {
            if (!dateStr) return ''
            const [y, m, d] = dateStr.split('-')
            return `${d}/${m}/${y}`
          }

          let produtos = []
          if (form.id) {
            const { data: projProdutos } = await supabase
              .from('produtos_servicos_projeto')
              .select('*')
              .eq('formulario_comercial_id', form.id)
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
          const pagamentos = (form.pagamentos as any) || {}
          const parcelas = form.parcelas || pagamentos.parcelado || []

          const dataExtensoFormatter = new Intl.DateTimeFormat('pt-BR', {
            dateStyle: 'long',
            timeZone: 'America/Sao_Paulo',
          })

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
            return str.replace(/^, /, '').trim()
          }

          const signersForPayload = assinantes.length > 0 ? assinantes : assinaturasList

          const placeholders: any = {
            NOME_CLIENTE: form.cliente?.nome || '',
            CLIENTE_NOME: form.cliente?.nome || '',
            CLIENTE_CPF_CNPJ: form.cliente?.cpf || form.cpf || '',
            CPF_CLIENTE: form.cliente?.cpf || form.cpf || '',
            CLI_NOME: form.cliente?.nome || '',
            CLI_CPF_CNPJ: form.cliente?.cpf || form.cpf || '',
            CLI_NOME_COMPLETO: form.cliente?.nome || '',
            CLI_CPF: form.cliente?.cpf || form.cpf || '',
            CLI_ENDERECO_COMPLETO: buildAddress(
              form.cliente?.rua || form.rua || '',
              form.cliente?.numero || form.numero || '',
              form.cliente?.complemento || form.complemento || '',
              form.cliente?.bairro || form.bairro || '',
              form.cliente?.cidade || form.municipio || '',
              form.cliente?.estado || form.estado || '',
              form.cliente?.cep || form.cep || '',
            ),
            CLI_PROFISSAO: form.cliente?.profissao || form.profissao || '',
            CLI_ESTADO_CIVIL: form.estado_civil || '',
            CLI_EMAIL: form.cliente?.email || '',
            CLI_TELEFONE: form.cliente?.telefone || '',
            CLI_ENDERECO_OBRA: buildAddress(
              form.obra_rua || '',
              form.obra_numero || '',
              form.obra_complemento || '',
              form.obra_bairro || '',
              form.obra_municipio || '',
              form.obra_estado || '',
              form.obra_cep || '',
            ),
            OBRA_CEP: form.obra_cep || '',
            OBRA_RUA: form.obra_rua || '',
            OBRA_NUMERO: form.obra_numero || '',
            OBRA_COMPLEMENTO: form.obra_complemento || '',
            OBRA_CIDADE: form.obra_municipio || '',
            OBRA_ESTADO: form.obra_estado || '',
            SUBTOTAL_PRODUTOS: formatCurrency(subtotalProdutos),
            SUBTOTAL_PRODUTOS_MOEDA: formatCurrency(subtotalProdutos),
            VALOR_DESCONTO: formatCurrency(descontoProdutos),
            VALOR_DESCONTO_MOEDA: formatCurrency(descontoProdutos),
            DESCONTO_PRODUTOS: formatCurrency(descontoProdutos),
            DESCONTO: formatCurrency(descontoProdutos),
            TOTAL_GERAL: formatCurrency(valorTotal),
            TOTAL_GERAL_MOEDA: formatCurrency(valorTotal),
            TOTAL_PRODUTOS: formatCurrency(valorTotal),
            VALOR_TOTAL: formatCurrency(valorTotal),
            VALOR_TOTAL_MOEDA: formatCurrency(valorTotal),
            VALOR_TOTAL_CONTRATO: formatCurrency(valorTotal),
            METODO_PAGAMENTO: form.metodo_pagamento || pagamentos.forma || '',
            NUMERO_PARCELAS: parcelas.length || 1,
            VALOR_PARCELA:
              parcelas.length > 0
                ? formatCurrency(Number(parcelas[0].valor || parcelas[0].valor_parcela) || 0)
                : formatCurrency(valorTotal),
            FORMA_PAGAMENTO: pagamentos.forma === 'A_VISTA' ? 'À Vista' : 'Parcelado',
            CLAUSULA_PAGAMENTO_NARRATIVA:
              pagamentos.narrativa || form.especificacoes || 'Não informado',
            DATA_PREVISTA_ENTREGA_IMOVEL: formatDate(form.data_prevista_entrega || ''),
            DATA_ENTREGA: formatDate(form.data_prevista_entrega || ''),
            DATA_CONTRATO_EXTENSO: dataExtensoFormatter.format(new Date()),
            DATA_ACESSO_MOVEL: formatDate((form.datas as any)?.medida || ''),
            DATA_ASSINATURA_CONTRATO: formatDate(new Date().toISOString().split('T')[0]),
            DATA_VENDA: formatDate(
              (form.datas as any)?.data_venda || new Date().toISOString().split('T')[0],
            ),
            NUMERO_PROJETO: form.id.substring(0, 8).toUpperCase(),
            produtos: produtos.map((p: any) => {
              const quantidade = Number(p.qtd || p.quantidade) || 1
              const valorUnitario = Number(p.valor_unitario) || 0
              const vTotal = Number(p.valor_total) || valorUnitario * quantidade
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
              }
            }),
            parcelas: parcelas.map((p: any, i: number) => ({
              numero: i + 1,
              data: formatDate(p.data),
              valor: Number(p.valor || p.valor_parcela) || 0,
              valor_moeda: formatCurrency(Number(p.valor || p.valor_parcela) || 0),
              meio: p.meio || form.metodo_pagamento || 'Não informado',
            })),
            is_assinado: true,
            assinaturas: signersForPayload.map((sig: any) => {
              let dataFormatada = 'N/A'
              const rawDate = sig.assinado_em || sig.data_assinatura
              if (rawDate) {
                const d = new Date(rawDate)
                const pad = (n: number) => n.toString().padStart(2, '0')
                dataFormatada = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
              }
              const signerName =
                sig.nome_completo || sig.signatario_nome || sig.nome || 'Signatário'
              const signerCpf = sig.cpf || sig.signatario_cpf || 'N/A'
              const signerEmail = sig.email || sig.signatario_email || 'N/A'
              const signerTipo = sig.papel || sig.signatario_tipo || 'signatario'
              return {
                nome: signerName,
                signatario_nome: signerName,
                tipo: signerTipo,
                cpf: signerCpf,
                signatario_cpf: signerCpf,
                email: signerEmail,
                data: dataFormatada,
                data_assinatura: dataFormatada,
                ip: sig.ip_address || sig.ip_assinatura || 'N/A',
                codigo: sig.codigo_verificacao || sig.codigo_confirmacao,
                codigo_confirmacao: sig.codigo_verificacao || sig.codigo_confirmacao,
                assinatura_imagem: sig.assinatura_base64 || sig.assinatura_imagem,
              }
            }),
          }

          const pdfMonkeyApiKey = Deno.env.get('PDFMONKEY_API_KEY')
          if (!pdfMonkeyApiKey) throw new Error('PDFMONKEY_API_KEY secret is missing')

          try {
            const pdfBytes = await generatePdfMonkeyDocument(
              template.external_template_id,
              placeholders,
              pdfMonkeyApiKey,
            )

            nomeCliente = form.cliente?.nome || 'Cliente'
            const safeNome = nomeCliente
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/[^a-zA-Z0-9]/g, '_')
            const fileName = `${docCliente?.tipo || 'Documento'}_Assinado_${safeNome}.pdf`

            finalFilePath = `contratos/${cliente_id || docCliente.cliente_id}/${fileName}`

            const { error: uploadError } = await supabase.storage
              .from(uploadBucket)
              .upload(finalFilePath, pdfBytes, { contentType: 'application/pdf', upsert: true })

            if (uploadError) throw uploadError

            await supabase
              .from('documentos_cliente')
              .update({
                arquivo_assinado_url: finalFilePath,
                status: 'Assinado',
                atualizado_em: new Date().toISOString(),
              })
              .eq('id', docCliente.id)
          } catch (e: any) {
            await supabase.from('logs_ia').insert({
              acao: 'finalize_signature_pdfmonkey_error',
              detalhes: { error: e.message, documento_id },
            })
            throw e
          }
        } else {
          // No form found: mark as signed using original arquivo_url
          if (docCliente) {
            finalFilePath = docCliente.arquivo_url || documento_id
            await supabase
              .from('documentos_cliente')
              .update({
                status: 'Assinado',
                arquivo_assinado_url: finalFilePath,
                atualizado_em: new Date().toISOString(),
              })
              .eq('id', docCliente.id)
          }
        }
      } else {
        // Template without external_template_id: mark as signed
        if (docCliente) {
          finalFilePath = docCliente.arquivo_url || documento_id
          await supabase
            .from('documentos_cliente')
            .update({
              status: 'Assinado',
              arquivo_assinado_url: finalFilePath,
              atualizado_em: new Date().toISOString(),
            })
            .eq('id', docCliente.id)
        }
      }
    } else {
      // Manual/uploaded documents: mark as signed using the original arquivo_url
      if (docCliente) {
        finalFilePath = docCliente.arquivo_url || documento_id
        await supabase
          .from('documentos_cliente')
          .update({
            status: 'Assinado',
            arquivo_assinado_url: finalFilePath,
            atualizado_em: new Date().toISOString(),
          })
          .eq('id', docCliente.id)
      }
    }

    // Check envelope completion
    if (envelopeId) {
      const { data: envDocs } = await supabase
        .from('documentos_cliente')
        .select('id, status, arquivo_assinado_url')
        .eq('envelope_id', envelopeId)

      const allDone =
        envDocs &&
        envDocs.length > 0 &&
        envDocs.every((d: any) => isCompletedStatus(d.status) || !!d.arquivo_assinado_url)

      if (allDone) {
        await supabase
          .from('envelopes_assinatura')
          .update({ status: 'concluido', concluido_em: new Date().toISOString() })
          .eq('id', envelopeId)

        // Mark all assinantes as completed if not already
        await supabase
          .from('assinantes')
          .update({ status: 'Assinado' })
          .eq('envelope_id', envelopeId)
          .neq('status', 'Assinado')
      }
    }

    if (docCliente?.cliente_id) {
      try {
        await supabase.from('timeline_eventos').insert({
          cliente_id: docCliente.cliente_id,
          usuario_nome: manual ? 'Usuário (Ação Manual)' : 'Sistema (Automático)',
          acao: `${manual ? 'Reprocessamento de PDF solicitado' : 'Finalização automática'} do documento assinado: ${docCliente?.template_nome || docCliente?.tipo || documento_id}`,
        })
      } catch (_logErr) {}
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (RESEND_API_KEY) {
      const { data: fileData, error: downloadError } = await supabase.storage
        .from(uploadBucket)
        .download(finalFilePath)
      let attachments: any[] = []

      if (!downloadError && fileData) {
        const arrayBuffer = await fileData.arrayBuffer()
        const uint8Array = new Uint8Array(arrayBuffer)
        let binaryString = ''
        for (let i = 0; i < uint8Array.length; i++) {
          binaryString += String.fromCharCode(uint8Array[i])
        }
        const base64Content = btoa(binaryString)

        const fileNameParts = finalFilePath.split('/')
        const name = fileNameParts[fileNameParts.length - 1]

        attachments.push({ filename: name, content: base64Content })
      }

      const { data: urlData } = await supabase.storage
        .from(uploadBucket)
        .createSignedUrl(finalFilePath, 315360000)
      const signedUrl = urlData?.signedUrl || ''

      const signersForEmail = assinantes.length > 0 ? assinantes : assinaturasList
      for (const sig of signersForEmail) {
        const email = sig.email || sig.signatario_email
        const nome = sig.nome_completo || sig.signatario_nome || 'Signatário'
        if (email) {
          try {
            await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: 'Bender Haussform <projetos@benderhaussform.com>',
                to: [email],
                subject: `Documento Assinado Finalizado: ${docCliente?.template_nome || docCliente?.tipo || 'Documento'}`,
                html: `
                  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
                    <h2 style="color: #333;">Olá, ${nome}</h2>
                    <p style="color: #555; line-height: 1.5;">O processo de assinatura do documento <strong>${docCliente?.template_nome || docCliente?.tipo || 'Documento'}</strong> foi concluído com sucesso. O documento final está anexado a este e-mail.</p>
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="${signedUrl}" style="background-color: #000; color: #fff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Baixar Documento Final</a>
                    </div>
                  </div>
                `,
                attachments: attachments.length > 0 ? attachments : undefined,
              }),
            })
          } catch (_emailErr) {}
        }
      }
    }

    return new Response(JSON.stringify({ success: true, url: finalFilePath }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message, success: false }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
