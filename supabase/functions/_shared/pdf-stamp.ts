import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1'

export interface StampMetadata {
  nome: string | null
  cpf: string | null
  email: string | null
  ip: string | null
  data: string | null
}

export function buildSignatureFromSources(
  base64Source: string | null,
  imageBase64: string | null,
): Uint8Array | null {
  const sources = [base64Source, imageBase64]
  for (const source of sources) {
    if (!source) continue
    try {
      const cleaned = source.replace(/^data:image\/[\w+]+;base64,/, '')
      const binary = atob(cleaned)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
      }
      return bytes
    } catch (err) {
      console.error('buildSignature: decode error', err)
    }
  }
  return null
}

export async function stampPdfWithSignature(
  pdfBytes: Uint8Array,
  meta: StampMetadata,
  signature: Uint8Array | null,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes)
  const pages = pdfDoc.getPages()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const lastPage = pages[pages.length - 1]
  const { width: pageWidth, height: pageHeight } = lastPage.getSize()

  if (signature && signature.length > 0) {
    try {
      let image
      try {
        image = await pdfDoc.embedPng(signature)
      } catch {
        image = await pdfDoc.embedJpg(signature)
      }
      const imgWidth = 160
      const imgHeight = (image.height / image.width) * imgWidth
      lastPage.drawImage(image, {
        x: pageWidth - imgWidth - 40,
        y: 40,
        width: imgWidth,
        height: imgHeight,
      })
    } catch (err) {
      console.error('stampPdf: embed signature image error', err)
    }
  }

  const lines: Array<[string, string | null]> = [
    ['Assinado por', meta.nome],
    ['CPF', meta.cpf],
    ['Email', meta.email],
    ['IP', meta.ip],
    ['Data', meta.data],
  ]

  let yText = pageHeight - 20
  for (const [label, value] of lines) {
    if (!value) continue
    try {
      const text = `${label}: ${value}`
      lastPage.drawText(text, {
        x: 40,
        y: yText,
        size: 7,
        font,
        color: rgb(0.4, 0.4, 0.4),
      })
      yText -= 10
    } catch (err) {
      console.error('stampPdf: draw text error', err)
    }
  }

  return new Uint8Array(await pdfDoc.save())
}
