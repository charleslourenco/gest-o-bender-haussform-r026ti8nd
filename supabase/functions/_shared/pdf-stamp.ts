import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1'

const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89
const MARGIN = 50
const BLOCK_HEIGHT = 140
const BLOCK_SPACING = 20

function isPdfFile(filePath: string | null | undefined): boolean {
  if (!filePath) return false
  return filePath.toLowerCase().split('?')[0].endsWith('.pdf')
}

function formatTimestamp(dateStr: string | null | undefined): string {
  if (!dateStr) return 'N/A'
  const d = new Date(dateStr)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

async function stampPdfWithSignatures(
  supabaseClient: any,
  bucket: string,
  filePath: string,
  signers: any[],
): Promise<Uint8Array> {
  const { data: fileData, error: downloadError } = await supabaseClient.storage
    .from(bucket)
    .download(filePath)

  if (downloadError || !fileData) {
    throw new Error(`Failed to download original PDF: ${downloadError?.message || 'no data'}`)
  }

  const pdfDoc = await PDFDocument.load(await fileData.arrayBuffer(), { ignoreEncryption: true })
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  let y = PAGE_HEIGHT - 60

  const drawText = (text: string, x: number, yy: number, f: any, sz = 10) => {
    try {
      page.drawText(text, { x, y: yy, size: sz, font: f })
    } catch (_e) {
      // skip on encoding error
    }
  }

  drawText('Página de Assinaturas', MARGIN, y, fontBold, 18)
  y -= 10
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_WIDTH - MARGIN, y },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  })
  y -= 40

  for (const signer of signers) {
    if (y - BLOCK_HEIGHT < MARGIN) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
      y = PAGE_HEIGHT - 60
    }

    page.drawRectangle({
      x: MARGIN,
      y: y - BLOCK_HEIGHT,
      width: PAGE_WIDTH - 2 * MARGIN,
      height: BLOCK_HEIGHT,
      borderColor: rgb(0.7, 0.7, 0.7),
      borderWidth: 0.5,
    })

    if (signer.assinatura_base64) {
      try {
        const base64 = signer.assinatura_base64.replace(/^data:image\/\w+;base64,/, '')
        const imageBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
        let img
        try {
          img = await pdfDoc.embedPng(imageBytes)
        } catch (_pngErr) {
          img = await pdfDoc.embedJpg(imageBytes)
        }
        const imgWidth = 200
        const imgHeight = Math.min(90, img.height * (imgWidth / img.width))
        page.drawImage(img, {
          x: MARGIN + 10,
          y: y - imgHeight - 25,
          width: imgWidth,
          height: imgHeight,
        })
      } catch (_imgErr) {
        // skip image on error
      }
    }

    const textX = MARGIN + 230
    let textY = y - 25
    const drawInfoLine = (label: string, value: string | null | undefined, isBold = false) => {
      drawText(`${label}: ${value || 'N/A'}`, textX, textY, isBold ? fontBold : font)
      textY -= 18
    }

    drawInfoLine('Nome', signer.nome_completo || signer.signatario_nome, true)
    drawInfoLine('CPF', signer.cpf || signer.signatario_cpf)
    drawInfoLine('IP', signer.ip_address || signer.ip_assinatura)
    drawInfoLine('Data', formatTimestamp(signer.assinado_em || signer.data_assinatura))
    if (signer.codigo_verificacao || signer.codigo_confirmacao) {
      drawInfoLine('Código', signer.codigo_verificacao || signer.codigo_confirmacao)
    }

    y -= BLOCK_HEIGHT + BLOCK_SPACING
  }

  return await pdfDoc.save()
}

export async function stampAndSaveDocument(
  supabaseClient: any,
  docCliente: any,
  assinantes: any[],
  assinaturasList: any[],
  clienteId: string | null,
  bucket: string,
): Promise<string> {
  const originalPath = docCliente?.arquivo_url || ''
  if (!originalPath) throw new Error('Document has no arquivo_url to stamp')

  if (!isPdfFile(originalPath)) {
    await supabaseClient
      .from('documentos_cliente')
      .update({
        status: 'concluido',
        arquivo_assinado_url: originalPath,
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', docCliente.id)
    return originalPath
  }

  const signers = assinantes.length > 0 ? assinantes : assinaturasList
  if (signers.length === 0) throw new Error('No signers found for stamping')

  const stampedBytes = await stampPdfWithSignatures(supabaseClient, bucket, originalPath, signers)

  const safeNome = (docCliente.template_nome || docCliente.tipo || 'Documento')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '_')
  const stampedPath = `contratos/${clienteId || docCliente.cliente_id}/Assinado_${safeNome}.pdf`

  const { error: uploadError } = await supabaseClient.storage
    .from(bucket)
    .upload(stampedPath, stampedBytes, { contentType: 'application/pdf', upsert: true })

  if (uploadError) throw uploadError

  await supabaseClient
    .from('documentos_cliente')
    .update({
      arquivo_assinado_url: stampedPath,
      status: 'concluido',
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', docCliente.id)

  return stampedPath
}

export async function markSignatureError(
  supabaseClient: any,
  docCliente: any,
  errorMsg: string,
): Promise<void> {
  if (!docCliente) return
  try {
    await supabaseClient
      .from('documentos_cliente')
      .update({ status: 'erro_assinatura', atualizado_em: new Date().toISOString() })
      .eq('id', docCliente.id)

    await supabaseClient.from('logs_ia').insert({
      acao: 'finalize_signature_stamp_error',
      detalhes: { error: errorMsg, documento_id: docCliente.id },
    })
  } catch (_e) {
    // ignore secondary errors
  }
}
