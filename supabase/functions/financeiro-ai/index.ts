import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import OpenAI from 'npm:openai@4'
import pdf from 'npm:pdf-parse@1.1.1'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, x-supabase-client-platform, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { action, payload } = await req.json()
    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiKey) throw new Error('Chave da OpenAI não configurada.')
    const openai = new OpenAI({ apiKey: openaiKey })

    if (action === 'ocr_lista_materiais') {
      const { imageBase64, isPdf } = payload
      let pdfText = ''
      let isScannedPdf = false

      if (isPdf) {
        try {
          const base64Data = imageBase64.split(',')[1] || imageBase64
          const buffer = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0))
          const data = await pdf(buffer)
          pdfText = data.text.trim().substring(0, 15000)
          if (!pdfText || pdfText.length < 10) {
            isScannedPdf = true
          }
        } catch (e) {
          console.error('PDF Parse Error', e)
          throw new Error('Falha ao ler PDF. O arquivo pode estar protegido ou corrompido.')
        }
      }

      if (isScannedPdf) {
        throw new Error(
          'O PDF parece ser escaneado (sem texto legível). Por favor, tire um print/foto do documento e faça o upload como imagem (JPG/PNG).',
        )
      }

      const userContent: any[] = [
        {
          type: 'text',
          text: 'Extraia a lista de materiais deste documento. Retorne APENAS um JSON com a chave "itens", que é um array de objetos contendo "nome" (string), "quantidade" (número, caso não especificado usar 1), "unidade" (string: un, m, m2, etc) e "observacao" (string).',
        },
      ]

      if (isPdf && pdfText) {
        userContent.push({ type: 'text', text: `Conteúdo extraído do PDF:\n${pdfText}` })
      } else if (!isPdf) {
        userContent.push({ type: 'image_url', image_url: { url: imageBase64 } })
      }

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content:
              'Você é a Zenaide, assistente de PCP e Compras. Extraia itens da lista de materiais e retorne APENAS um objeto JSON válido sem formatações extras.',
          },
          {
            role: 'user',
            content: userContent,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0,
      })

      return new Response(response.choices[0].message.content, {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'ocr_compras') {
      const { imageBase64, isPdf } = payload
      let pdfText = ''
      let isScannedPdf = false

      if (isPdf) {
        try {
          const base64Data = imageBase64.split(',')[1] || imageBase64
          const buffer = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0))
          const data = await pdf(buffer)
          pdfText = data.text.trim().substring(0, 15000)
          if (!pdfText || pdfText.length < 10) {
            isScannedPdf = true
          }
        } catch (e) {
          console.error('PDF Parse Error', e)
          throw new Error('Falha ao ler PDF. O arquivo pode estar protegido ou corrompido.')
        }
      }

      if (isScannedPdf) {
        throw new Error(
          'O PDF parece ser escaneado (sem texto legível). Por favor, tire um print/foto da nota e faça o upload como imagem (JPG/PNG).',
        )
      }

      const userContent: any[] = [
        {
          type: 'text',
          text: 'Extraia os dados deste documento (Nota Fiscal, Romaneio ou Pedido).',
        },
      ]

      if (isPdf && pdfText) {
        userContent.push({ type: 'text', text: `Conteúdo extraído do PDF:\n${pdfText}` })
      } else if (!isPdf) {
        userContent.push({ type: 'image_url', image_url: { url: imageBase64 } })
      }

      const systemContent = `Você é a Zenaide Zelosa, mestre de estoque e compras da Bender Haussform. Extraia as informações e retorne APENAS um JSON com as chaves: "fornecedor", "cnpj_fornecedor", "valor", "data_emissao", "numero_nota", e "itens".

CAMPO "fornecedor" (CRÍTICO — LEIA COM ATENÇÃO):
- DEVE ser SEMPRE o EMITENTE da nota fiscal — a razão social/nome do VENDEDOR/FORNECEDOR que EMITIU a nota.
- NUNCA use o destinatário/comprador (Bender, Bender Haussform, Bender Móveis, etc.) como fornecedor. A Bender Haussform é a empresa COMPRADORA, nunca a fornecedora nesta rotina de compras.
- NUNCA invente ou preencha o fornecedor com nenhuma variação de "Bender".
- Se o documento mostrar a Bender como destinatária/compradora e não for possível identificar com segurança quem é o emitente/vendedor, retorne "fornecedor": null (ou string vazia "") em vez de preencher com a Bender.

EXEMPLOS DE LAYOUT (como distinguir EMITENTE de DESTINATÁRIO):

Exemplo 1 — Nota Fiscal Eletrônica (DANFE):
  O DANFE tem duas seções principais no cabeçalho:
  - "EMITENTE" ou "XNAME" → contém a razão social de QUEM EMITIU/vendeu → USE ESTE como "fornecedor"
  - "DESTINATÁRIO" ou "DEST" → contém a razão social de QUEM COMPROU → NUNCA use este como "fornecedor"
  Layout típico do DANFE:
    ┌──────────────────────────────────┐
    │ EMITENTE: Madeireira São José    │  ← usar como "fornecedor"
    │ CNPJ: 12.345.678/0001-90        │  ← usar como "cnpj_fornecedor"
    ├──────────────────────────────────┤
    │ DESTINATÁRIO: Bender Haussform  │  ← NÃO usar (é o comprador)
    │ CNPJ: 98.765.432/0001-10        │
    └──────────────────────────────────┘

Exemplo 2 — Texto plano / PDF flattenado:
  Quando o PDF é lido linearmente (texto corrido), a ordem geralmente é:
  1. Razão social do EMITENTE (no topo, antes dos dados do destinatário)
  2. CNPJ do emitente
  3. Razão social do DESTINATÁRIO (geralmente "Bender Haussform", "Bender Móveis" ou "BENDER HAUSSFORM")
  4. CNPJ do destinatário
  → Use SEMPRE o PRIMEIRO nome/cnpj que aparece (emitente), NUNCA o segundo (destinatário/Bender).
  Exemplo de texto extraído:
    "Ferragens Brasil Ltda
     CNPJ: 11.222.333/0001-44
     IE: 123.456.789
     ---
     DESTINATÁRIO
     Bender Haussform
     CNPJ: 98.765.432/0001-10"
  → fornecedor = "Ferragens Brasil Ltda" (PRIMEIRO nome, o emitente)

Exemplo 3 — Romaneio / Pedido de Compra:
  Em romaneios e pedidos, a empresa que VENDE/fornece os materiais é o fornecedor.
  A Bender Haussform aparece como compradora/cliente.
  → Use a empresa fornecedora, não a Bender.
  Exemplo:
    "Romaneio de Entrega
     Cliente: Bender Haussform
     Fornecedor: Distribuidora ABC"
  → fornecedor = "Distribuidora ABC"

Exemplo 4 — Nota com cabeçalho "NOTA FISCAL DE SAÍDA":
  "Saída" significa que o EMITENTE está vendendo para o DESTINATÁRIO.
  O EMITENTE é o fornecedor. O DESTINATÁRIO (geralmente Bender Haussform) é o comprador.
  → Use sempre o emitente.

CAMPO "cnpj_fornecedor": CNPJ do emitente/vendedor se houver, senão null.
CAMPO "valor": número float, valor total da nota.
CAMPO "data_emissao": string YYYY-MM-DD.
CAMPO "numero_nota": string, usar se for NF ou romaneio.
CAMPO "itens": array de objetos com "produto", "marca", "quantidade" (numero), "preco_unitario" (numero), "preco_total" (numero), "categoria" (string, DEVE SER exatamente uma das opções: Ferragens, Chapas, Acessórios, Fitas de borda, Sistemas de fixação, Serralheria, Estofaria, Portas de alumínio e vidro, Espelhos, Perfil puxador/puxador, Iluminação, Colas/Adesivos/Solventes, Insumos, Material elétrico, Uniformes e EPIs, móveis soltos, brocas/fresas/serras, Parafusos).
Dicas de classificação: EPI, Bota, Luva, Capacete, Óculos -> Uniformes e EPIs. Parafuso, Bucha, Pregos -> Parafusos. Broca, Serra, Fresa, Disco de corte -> brocas/fresas/serras. Cadeira, Mesa, Sofá -> móveis soltos. Solvente, Cola, Adesivo -> Colas/Adesivos/Solventes.`

      const messages: any[] = [
        { role: 'system', content: systemContent },
        { role: 'user', content: userContent },
      ]

      let response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages,
        response_format: { type: 'json_object' },
        temperature: 0,
      })

      let resultContent = response.choices[0].message.content || '{}'
      let parsedResult: any
      try {
        parsedResult = JSON.parse(resultContent)
      } catch {
        parsedResult = {}
      }

      // Regex abrangente para detectar qualquer variação de "Bender" no fornecedor
      const isInvalidBenderFornecedor = (name: unknown): boolean => {
        if (!name || typeof name !== 'string') return false
        return /\bbender\b/i.test(name.trim())
      }

      const MAX_RETRIES = 2
      let retryCount = 0
      while (isInvalidBenderFornecedor(parsedResult.fornecedor) && retryCount < MAX_RETRIES) {
        retryCount++
        const correctionMessages: any[] = [
          ...messages,
          { role: 'assistant', content: resultContent },
          {
            role: 'user',
            content:
              'ERRO CRÍTICO: O campo "fornecedor" foi preenchido com "' +
              String(parsedResult.fornecedor) +
              '", que é a empresa COMPRADORA (destinatário), NÃO o fornecedor. O fornecedor deve ser o EMITENTE da nota — a empresa que VENDEU/forneceu os materiais. NUNCA utilize nenhuma variação de Bender como fornecedor. Revise atentamente o documento: procure pelo campo "EMITENTE" ou pelo PRIMEIRO nome/cnpj que aparece no documento. Se não conseguir identificar o emitente com clareza, retorne null no campo fornecedor. Retorne APENAS o JSON corrigido.',
          },
        ]

        const correctionResponse = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: correctionMessages,
          response_format: { type: 'json_object' },
          temperature: 0,
        })

        resultContent = correctionResponse.choices[0].message.content || '{}'
        try {
          parsedResult = JSON.parse(resultContent)
        } catch {
          parsedResult = {}
        }
      }

      // Validação final estrita: NUNCA permitir que o fornecedor seja Bender
      if (isInvalidBenderFornecedor(parsedResult.fornecedor)) {
        return new Response(
          JSON.stringify({
            error:
              'Não foi possível identificar o emitente (fornecedor) da nota. Confira o documento ou insira os dados manualmente.',
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        )
      }

      return new Response(JSON.stringify(parsedResult), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'ocr') {
      const { imageBase64, isPdf } = payload
      let pdfText = ''
      let isScannedPdf = false

      if (isPdf) {
        try {
          const base64Data = imageBase64.split(',')[1] || imageBase64
          const buffer = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0))
          const data = await pdf(buffer)
          pdfText = data.text.trim().substring(0, 15000)
          if (!pdfText || pdfText.length < 10) {
            isScannedPdf = true
          }
        } catch (e) {
          console.error('PDF Parse Error', e)
          throw new Error('Falha ao ler PDF. O arquivo pode estar protegido ou corrompido.')
        }
      }

      if (isScannedPdf) {
        throw new Error(
          'O PDF parece ser escaneado (sem texto legível). Por favor, tire um print/foto do comprovante e faça o upload como imagem (JPG/PNG).',
        )
      }

      const userContent: any[] = [
        {
          type: 'text',
          text: 'Extraia os dados do comprovante em anexo (pode ser nota fiscal, fatura ou boleto), identifique bem o nome do cliente/fornecedor e as parcelas:',
        },
      ]

      if (isPdf && pdfText) {
        userContent.push({ type: 'text', text: `Conteúdo extraído do PDF:\n${pdfText}` })
      } else if (!isPdf) {
        userContent.push({ type: 'image_url', image_url: { url: imageBase64 } })
      }

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content:
              'Você é a Dona Edith, super assistente financeira, sábia e meticulosa. Extraia informações precisas deste comprovante (boleto, recibo, nota fiscal, fatura de cartão) e retorne APENAS um JSON com as chaves: "fornecedor" (nome preciso do cliente/emissor/credor/devedor), "valor" (número float, valor total bruto/líquido exato), "data_vencimento" (YYYY-MM-DD), "codigo_barras" (se houver, senão null), "categoria" (sugira uma categoria financeira), "meio_pagamento" (Boleto, Pix, Cartão, Transferência), "parcelas" (inteiro, quantidade de parcelas se houver, senão 1), "valor_parcela" (número float, se for parcelado, valor exato da parcela), "tipo" (retorne "despesa" ou "receita" com base no contexto), e "itens" (array opcional de objetos com "data" string YYYY-MM-DD, "descricao" string, "valor" numero float, "parcela_atual" inteiro (se for parcelado), "total_parcelas" inteiro). Preencha detalhadamente todas as despesas caso seja uma fatura de cartão de crédito).',
          },
          {
            role: 'user',
            content: userContent,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0,
      })

      return new Response(response.choices[0].message.content, {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'command' || action === 'chat') {
      const { text, currentDate, history, context } = payload

      const systemPrompt = `Você é Dona Edith, a experiente, sábia e acolhedora assistente financeira da Bender Haussform.
Data de hoje: ${currentDate}

[O SEU RADAR FINANCEIRO EM TEMPO REAL]
Cruze as informações abaixo para gerar insights proativos:
- Contas a Pagar (Hoje/Atrasadas): ${JSON.stringify(context?.pagar || [])}
- Contas a Receber (Hoje/Atrasadas): ${JSON.stringify(context?.receber || [])}
- Contratos Assinados Recentes (Pendentes de ação): ${JSON.stringify(context?.assinaturasPendentes || [])}
- Projetos/Contratos Recentes (Produtos e Valores): ${JSON.stringify(context?.contratosRecentes || [])}

Sua Personalidade:
- Sábia, acolhedora, educada e perspicaz. Fale como uma parceira de negócios experiente.
- NUNCA mencione que você está gerando códigos, JSON, ou jargões técnicos. Sua comunicação deve ser 100% natural e humana.
- Se o usuário concordar em lançar um pagamento ou recebimento, confirme amigavelmente que você fará isso, de forma clara e objetiva, colocando tudo em seu devido lugar (nome com nome, valor com valor).

INSTRUÇÃO ESTRITA PARA AÇÃO NO SISTEMA:
Para criar um ou mais lançamentos, você DEVE anexar um bloco JSON isolado no FINAL da sua mensagem. O usuário NÃO verá esse bloco, o sistema vai processá-lo silenciosamente.
O bloco DEVE estar exatamente no formato abaixo, isolado pelas tags \`\`\`json e \`\`\`:

\`\`\`json
{
  "acoes": [
    {
      "acao": "criar_pagamento",
      "dados": {
        "credor_devedor": "Nome exato da empresa ou do cliente conforme lido no contexto",
        "valor": 1500.00,
        "data_vencimento": "YYYY-MM-DD",
        "descricao": "Referência clara do lançamento (Ex: Parcela 2/10 referente ao Computador)",
        "categoria": "Venda de Projetos, Despesa Fixa, etc.",
        "meio_pagamento": "Boleto, Pix, Cartão, Transferência",
        "antecipado": false
      }
    }
  ]
}
\`\`\`
*(A ação pode ser também "criar_recebimento"). Se precisar criar vários (como desmembrar itens de uma fatura), adicione várias ações no array.*

REGRAS CONTRA DUPLICIDADE E INTERAÇÃO:
1. Se você for sugerir o lançamento de um contrato ou fatura, APENAS PERGUNTE (ex: "Temos um contrato novo de X. Quer que eu insira no financeiro?"). NÃO inclua o bloco JSON nessa mensagem.
2. Se for uma fatura de cartão de crédito detalhada que chegou pelo contexto, pergunte se o usuário prefere lançar o valor total ou desmembrar cada item individualmente.
3. Quando o usuário confirmar (ex: "Sim, por favor Edith", "Pode desmembrar"), AÍ SIM responda confirmando (ex: "Prontinho! Lançamentos realizados com sucesso.") e inclua o bloco JSON uma única vez.
4. O sistema já possui uma trava inteligente: se uma parcela recorrente já existe no banco (mesmo Fornecedor, Valor e Data), o sistema a ignora, evitando duplicidades.
5. Se você JÁ INCLUIU o bloco JSON para um lançamento no histórico da conversa, NUNCA gere o bloco novamente para a mesma transação.

Se a conversa não exigir a criação de um registro agora, converse naturalmente, alertando sobre pendências financeiras sem anexar nenhum bloco JSON.`

      const messages: any[] = [{ role: 'system', content: systemPrompt }]

      if (history && Array.isArray(history)) {
        messages.push(...history)
      }

      if (text) {
        messages.push({ role: 'user', content: text })
      } else {
        messages.push({
          role: 'user',
          content: 'Faça um resumo geral do meu financeiro hoje, seja proativa sobre os contratos.',
        })
      }

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages,
        temperature: 0.3,
      })

      return new Response(JSON.stringify({ message: response.choices[0].message.content }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    throw new Error('Ação inválida')
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
