import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1'

export interface StampMetadata {
  nome: string | null
  cpf: string | null
  email: string | null
  ip: string | null
  data: string | null
}

export function formatBrTimestamp(dateStr: string | null): string {
  if (!dateStr) return '—'
  try {
    const date = new Date(dateStr)
    return date.toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return dateStr
  }
}

export type SignatureData = Uint8Array | null

export function buildSignatureFromSources(
  assinaturaBase64: string | null,
  assinaturaImagem: string | null,
): SignatureData {
  for (const source of [assinaturaBase64, assinaturaImagem]) {
    if (!source) continue
    try {
      const base64Data = source.includes(',') ? (source.split(',')[1] ?? source) : source
      const binary = atob(base64Data)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      return bytes
    } catch {
      continue
    }
  }
  return null
}

export async function stampPdfWithSignature(
  pdfBytes: Uint8Array,
  meta: StampMetadata,
  signature: SignatureData,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes)
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontSize = 7
  const lineHeight = fontSize + 3

  const lines = [
    `Assinado eletronicamente por: ${meta.nome ?? '—'}`,
    `CPF: ${meta.cpf ?? '—'}`,
    `E-mail: ${meta.email ?? '—'}`,
    `IP: ${meta.ip ?? '—'}`,
    `Data: ${formatBrTimestamp(meta.data)}`,
  ]

  let image: Awaited<ReturnType<typeof pdfDoc.embedPng>> | null = null
  if (signature) {
    try {
      image = await pdfDoc.embedPng(signature)
    } catch {
      try {
        image = await pdfDoc.embedJpg(signature)
      } catch {
        image = null
      }
    }
  }

  for (const page of pdfDoc.getPages()) {
    const { width } = page.getSize()
    const boxWidth = 260
    const imgH = image ? 40 : 0
    const boxHeight = lines.length * lineHeight + imgH + 12
    const x = width - boxWidth - 15
    const y = 15

    page.drawRectangle({
      x,
      y,
      width: boxWidth,
      height: boxHeight,
      color: rgb(0.96, 0.96, 0.96),
      opacity: 0.85,
      borderColor: rgb(0.7, 0.7, 0.7),
      borderWidth: 0.5,
    })

    if (image) {
      const imgW = 80
      const scaledH = (image.height / image.width) * imgW
      page.drawImage(image, {
        x: x + 10,
        y: y + boxHeight - scaledH - 8,
        width: imgW,
        height: scaledH,
      })
    }

    const textY = image ? y + boxHeight - imgH - 12 : y + boxHeight - 12
    lines.forEach((line, i) => {
      page.drawText(line, {
        x: x + 10,
        y: textY - i * lineHeight,
        size: fontSize,
        font,
        color: rgb(0.15, 0.15, 0.15),
      })
    })
  }

  return new Uint8Array(await pdfDoc.save())
}
