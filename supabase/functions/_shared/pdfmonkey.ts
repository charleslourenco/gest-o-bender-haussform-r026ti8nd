export const generatePdfMonkeyDocument = async (
  templateId: string,
  payload: any,
  apiKey: string,
): Promise<ArrayBuffer> => {
  const response = await fetch('https://api.pdfmonkey.io/api/v1/documents', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      document: {
        document_template_id: templateId,
        payload: payload,
        status: 'pending',
      },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`PDFMonkey error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  const documentId = data.document.id

  let downloadUrl = null
  // Poll until the document generation is success or failure
  for (let i = 0; i < 15; i++) {
    await new Promise((resolve) => setTimeout(resolve, 2000))
    const checkResponse = await fetch(`https://api.pdfmonkey.io/api/v1/documents/${documentId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    if (!checkResponse.ok) continue

    const checkData = await checkResponse.json()
    if (checkData.document.status === 'success') {
      downloadUrl = checkData.document.download_url
      break
    } else if (checkData.document.status === 'failure') {
      throw new Error(`PDFMonkey document generation failed.`)
    }
  }

  if (!downloadUrl) {
    throw new Error(`PDFMonkey document generation timed out.`)
  }

  const pdfResponse = await fetch(downloadUrl)
  if (!pdfResponse.ok) {
    throw new Error(`Failed to download PDF from PDFMonkey.`)
  }

  return await pdfResponse.arrayBuffer()
}
