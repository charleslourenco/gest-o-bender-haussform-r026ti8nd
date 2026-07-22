import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1'

export interface StampMetadata {
  nome: string | null
  cpf: string | null
  email: string | null
  ip: string | null
  data: string | null
}

export type SignatureData = Uint8Array | null

export interface SignatureEntry {
  signature: SignatureData
  meta: StampMetadata
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

function buildTextLines(meta: StampMetadata): string[] {
  return [
    `Assinado eletronicamente por: ${meta.nome ?? '—'}`,
    `CPF/CNPJ: ${meta.cpf ?? '—'}`,
    `E-mail: ${meta.email ?? '—'}`,
    `IP: ${meta.ip ?? '—'}`,
    `Data: ${formatBrTimestamp(meta.data)}`,
  ]
}

async function embedSignatureImage(
  pdfDoc: PDFDocument,
  signature: SignatureData,
): Promise<Awaited<ReturnType<typeof pdfDoc.embedPng>> | null> {
  if (!signature) return null
  try {
    return await pdfDoc.embedPng(signature)
  } catch {
    try {
      return await pdfDoc.embedJpg(signature)
    } catch {
      return null
    }
  }
}

export async function stampPdfWithSignatures(
  pdfBytes: Uint8Array,
  entries: SignatureEntry[],
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes)
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontSize = 7
  const lineHeight = fontSize + 3

  const pages = pdfDoc.getPages()
  const lastPage = pages[pages.length - 1]
  const { width } = lastPage.getSize()

  if (entries.length === 0) {
    return new Uint8Array(await pdfDoc.save())
  }

  const images = await Promise.all(
    entries.map((entry) => embedSignatureImage(pdfDoc, entry.signature)),
  )

  const boxWidth = 260
  const gap = 10
  const cols = Math.min(2, Math.max(1, entries.length))

  const boxHeights = entries.map((entry, i) => {
    const lines = buildTextLines(entry.meta)
    const imgH = images[i] ? 40 : 0
    return lines.length * lineHeight + imgH + 12
  })

  const totalColsWidth = cols * boxWidth + (cols - 1) * gap
  const startX = Math.max(15, (width - totalColsWidth) / 2)

  let currentY = 15
  for (let rowStart = 0; rowStart < entries.length; rowStart += cols) {
    const rowIndices: number[] = []
    for (let c = 0; c < cols && rowStart + c < entries.length; c++) {
      rowIndices.push(rowStart + c)
    }
    const maxBoxHeight = Math.max(...rowIndices.map((i) => boxHeights[i]))

    for (let c = 0; c < rowIndices.length; c++) {
      const i = rowIndices[c]
      const entry = entries[i]
      const image = images[i]
      const x = startX + c * (boxWidth + gap)
      const y = currentY
      const boxHeight = boxHeights[i]
      const lines = buildTextLines(entry.meta)
      const imgH = image ? 40 : 0

      lastPage.drawRectangle({
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
        lastPage.drawImage(image, {
          x: x + 10,
          y: y + boxHeight - scaledH - 8,
          width: imgW,
          height: scaledH,
        })
      }

      const textY = image ? y + boxHeight - imgH - 12 : y + boxHeight - 12
      lines.forEach((line, li) => {
        lastPage.drawText(line, {
          x: x + 10,
          y: textY - li * lineHeight,
          size: fontSize,
          font,
          color: rgb(0.15, 0.15, 0.15),
        })
      })
    }

    currentY += maxBoxHeight + gap
  }

  return new Uint8Array(await pdfDoc.save())
}

export async function stampPdfWithSignature(
  pdfBytes: Uint8Array,
  meta: StampMetadata,
  signature: SignatureData,
): Promise<Uint8Array> {
  return stampPdfWithSignatures(pdfBytes, [{ signature, meta }])
}
