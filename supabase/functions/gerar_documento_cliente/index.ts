import { Document, Packer, Paragraph, TextRun } from 'https://esm.sh/docx@8.5.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

interface Env {
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
}

interface RequestBody {
  cliente_id: string
  cliente: string
  valor: string
  vendedor: string
  data?: string
  signatario_tipo: string
  signatario_nome: string
  signatario_cpf: string
  signatario_email: string
  signatario_telefone: string
}

async function generateDocx(
  cliente: string,
  valor: string,
  vendedor: string,
  dataStr: string,
): Promise<ArrayBuffer> {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: 'CONTRATO BENDER HAUSSFORM',
                bold: true,
                size: 32,
              }),
            ],
          }),
          new Paragraph({
            children: [new TextRun(`Cliente: ${cliente}`)],
          }),
          new Paragraph({
            children: [new TextRun(`Valor: R$ ${valor}`)],
          }),
          new Paragraph({
            children: [new TextRun(`Vendedor: ${vendedor}`)],
          }),
          new Paragraph({
            children: [new TextRun(`Data: ${dataStr}`)],
          }),
          new Paragraph({
            children: [new TextRun('Assinatura do Cliente: ______________________________')],
            spacing: { after: 400 },
          }),
          new Paragraph({
            children: [new TextRun('Assinatura do Vendedor: ______________________________')],
          }),
        ],
      },
    ],
  })

  const blob = await Packer.toBlob(doc)
  return await blob.arrayBuffer()
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 })
      }

      const body: RequestBody = await request.json()

      const {
        cliente_id,
        cliente,
        valor,
        vendedor,
        data: payloadData,
        signatario_tipo,
        signatario_nome,
        signatario_cpf,
        signatario_email,
        signatario_telefone,
      } = body

      if (
        !cliente_id ||
        !cliente ||
        !valor ||
        !vendedor ||
        !signatario_tipo ||
        !signatario_nome ||
        !signatario_cpf ||
        !signatario_email ||
        !signatario_telefone
      ) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      const dataStr = payloadData || new Date().toLocaleDateString('pt-BR')
      const documento_id = crypto.randomUUID()
      const documento_nome = 'Contrato Bender Haussform'
      const codigo_confirmacao = Math.floor(100000 + Math.random() * 900000).toString()
      const status = 'assinado'
      const expira_em = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

      const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

      // Generate DOCX
      const docBuffer = await generateDocx(cliente, valor, vendedor, dataStr)

      // Insert assinatura
      const { error: assError } = await supabase.from('assinaturas').insert({
        documento_id,
        documento_nome,
        cliente_id,
        signatario_tipo,
        signatario_nome,
        signatario_cpf,
        signatario_email,
        signatario_telefone,
        codigo_confirmacao,
        status,
        expira_em,
      })

      if (assError) {
        console.error('Assinatura insert error:', assError)
        return new Response(JSON.stringify({ error: 'Failed to register signature' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      // Insert timeline event
      const { error: timeError } = await supabase.from('timeline_eventos').insert({
        cliente_id,
        usuario_nome: signatario_nome,
        acao: 'Contrato assinado eletronicamente',
        icone: '✍️',
      })

      if (timeError) {
        console.error('Timeline insert error:', timeError)
      }

      // Return DOCX
      const sanitizedCliente = cliente.replace(/[^a-zA-Z0-9]/g, '_')
      const headers = new Headers({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="Contrato_Bender_Haussform_${sanitizedCliente}.docx"`,
      })

      return new Response(docBuffer, { headers })
    } catch (error) {
      console.error('Worker error:', error)
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  },
}
