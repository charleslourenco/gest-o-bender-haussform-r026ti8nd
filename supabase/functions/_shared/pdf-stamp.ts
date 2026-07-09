import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage } from 'npm:pdf-lib@1'

export interface StampMetadata {
  nome?: string | null
  cpf?: string | null
  ip?: string | null
  data?: string | null
  email?: string | null
}

export interface StampSignature {
  base64?: string | null
  mimeType?: string | null
}

const DEFAULT_FONT = StandardFonts.Helvetica
const DEFAULT_FONT_BOLD = StandardFonts.HelveticaBold

function stripDataUri(dataUri: string): { data: string; mime: string } {
  const trimmed = dataUri.trim()
  const match = trimmed.match(/^data:([a-zA-Z0-9/+.-]+);base64,(.*)$/)
  if (match) {
    return { data: match[2], mime: match[1] }
  }
  return { data: trimmed, mime: 'image/png' }
}

function decodeBase64(b64: string): Uint8Array {
  const clean = b64.replace(/\s/g, '')
  const binary = atob(clean)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

async function embedSignatureImage(
  pdfDoc: PDFDocument,
  signature: StampSignature | null | undefined,
): Promise<{ embed: any; width: number; height: number } | null> {
  if (!signature || !signature.base64) return null
  try {
    const { data, mime } = stripDataUri(signature.base64)
    const bytes = decodeBase64(data)
    let embed: any
    if (mime.includes('png')) {
      embed = await pdfDoc.embedPng(bytes)
    } else if (mime.includes('jpeg') || mime.includes('jpg')) {
      embed = await pdfDoc.embedJpg(bytes)
    } else {
      // Try PNG first, then JPG
      try {
        embed = await pdfDoc.embedPng(bytes)
      } catch {
        embed = await pdfDoc.embedJpg(bytes)
      }
    }
    const maxWidth = 200
    const maxHeight = 80
    const scale = Math.min(maxWidth / embed.width, maxHeight / embed.height, 1)
    return {
      embed,
      width: embed.width * scale,
      height: embed.height * scale,
    }
  } catch (err) {
    console.error('pdf-stamp: failed to embed signature image', err)
    return null
  }
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return new Date().toLocaleString('pt-BR')
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  } catch {
    return dateStr
  }
}

function drawStampBlock(
  page: PDFPage,
  font: PDFFont,
  fontBold: PDFFont,
  meta: StampMetadata,
  signatureImg: { embed: any; width: number; height: number } | null,
  startX: number,
  startY: number,
): number {
  const lineGap = 14
  const padding = 12
  let cursorY = startY
  const labelColor = rgb(0.38, 0.38, 0.38)
  const valueColor = rgb(0.12, 0.12, 0.12)
  const accentColor = rgb(0.06, 0.34, 0.62)

  page.drawRectangle({
    x: startX,
    y: startY - 4,
    width: 320,
    height: 4,
    color: accentColor,
  })

  cursorY -= padding
  page.drawText('Documento assinado eletronicamente', {
    x: startX,
    y: cursorY,
    size: 9,
    font: fontBold,
    color: accentColor,
  })
  cursorY -= lineGap

  if (signatureImg) {
    try {
      page.drawImage(signatureImg.embed, {
        x: startX,
        y: cursorY - signatureImg.height + 10,
        width: signatureImg.width,
        height: signatureImg.height,
      })
      cursorY -= signatureImg.height + 6
    } catch (err) {
      console.error('pdf-stamp: failed to draw signature image', err)
    }
  }

  const rows: Array<[string, string]> = []
  if (meta.nome) rows.push(['Nome:', meta.nome])
  if (meta.cpf) rows.push(['CPF:', meta.cpf])
  if (meta.email) rows.push(['E-mail:', meta.email])
  if (meta.ip) rows.push(['IP:', meta.ip])
  rows.push(['Data:', formatDate(meta.data)])

  for (const [label, value] of rows) {
    page.drawText(label, {
      x: startX,
      y: cursorY,
      size: 8,
      font: fontBold,
      color: labelColor,
    })
    const labelWidth = fontBold.widthOfTextAtSize(label, 8) + 4
    const truncated = value.length > 48 ? value.slice(0, 45) + '...' : value
    page.drawText(truncated, {
      x: startX + labelWidth,
      y: cursorY,
      size: 8,
      font,
      color: valueColor,
    })
    cursorY -= lineGap
  }

  cursorY -= 2
  page.drawText('Assinatura válida nos termos da Lei nº 14.063/2020.', {
    x: startX,
    y: cursorY,
    size: 7,
    font,
    color: labelColor,
  })

  return cursorY
}

export async function stampPdfWithSignature(
  pdfBytes: Uint8Array,
  meta: StampMetadata,
  signature: StampSignature | null | undefined,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true })
  const font = await pdfDoc.embedFont(DEFAULT_FONT)
  const fontBold = await pdfDoc.embedFont(DEFAULT_FONT_BOLD)
  const signatureImg = await embedSignatureImage(pdfDoc, signature)

  const pages = pdfDoc.getPages()
  const lastPage = pages[pages.length - 1]
  const { width } = lastPage.getSize()

  const stampWidth = 320
  const startX = Math.max(width - stampWidth - 36, 36)
  const startY = 120

  drawStampBlock(lastPage, font, fontBold, meta, signatureImg, startX, startY)

  return await pdfDoc.save({ useObjectStreams: true })
}

export function buildSignatureFromSources(
  base64FromAssinantes?: string | null,
  imagemFromAssinaturas?: string | null,
): StampSignature | null {
  if (base64FromAssinantes && base64FromAssinantes.trim().length > 0) {
    return { base64: base64FromAssinantes, mimeType: 'image/png' }
  }
  if (imagemFromAssinaturas && imagemFromAssinaturas.trim().length > 0) {
    return { base64: imagemFromAssinaturas, mimeType: 'image/png' }
  }
  return null
}
