export async function generatePdfMonkeyDocument(templateId: string, payload: any, apiKey: string) {
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
    throw new Error(
      `Falha ao conectar com PDFMonkey (${res.status}): Verifique o template ID. ${errorText}`,
    )
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
