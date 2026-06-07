export const generatePdfMonkeyDocument = async (
  templateId: string,
  payload: any,
  apiKey: string,
) => {
  const response = await fetch('https://api.pdfmonkey.io/api/v1/documents', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
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
    throw new Error(`PDFMonkey generation failed: ${response.statusText} - ${errorText}`)
  }

  const data = await response.json()
  const documentId = data.document.id

  // Poll for completion
  let status = data.document.status
  let downloadUrl = data.document.download_url

  for (let i = 0; i < 20; i++) {
    if (status === 'success' && downloadUrl) {
      break
    }
    if (status === 'failure') {
      throw new Error(`PDFMonkey generation failed with status 'failure'`)
    }

    await new Promise((resolve) => setTimeout(resolve, 3000))

    const pollResponse = await fetch(`https://api.pdfmonkey.io/api/v1/documents/${documentId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    if (!pollResponse.ok) {
      const errorText = await pollResponse.text()
      throw new Error(`PDFMonkey polling failed: ${pollResponse.statusText} - ${errorText}`)
    }

    const pollData = await pollResponse.json()
    status = pollData.document.status
    downloadUrl = pollData.document.download_url
  }

  if (status !== 'success' || !downloadUrl) {
    throw new Error(`PDFMonkey generation timed out`)
  }

  const pdfResponse = await fetch(downloadUrl)
  if (!pdfResponse.ok) {
    throw new Error(`Failed to download PDF from PDFMonkey`)
  }

  const pdfArrayBuffer = await pdfResponse.arrayBuffer()
  return pdfArrayBuffer
}
