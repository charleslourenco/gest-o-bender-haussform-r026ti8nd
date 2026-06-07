export async function generatePdfMonkeyDocument(
  templateId: string,
  payload: any,
  apiKey: string,
): Promise<ArrayBuffer> {
  const response = await fetch('https://api.pdfmonkey.io/api/v1/document_cards', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      document_card: {
        document_template_id: templateId,
        payload: payload,
      },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`PDFMonkey generation failed: ${response.status} ${errorText}`)
  }

  const data = await response.json()
  const documentCard = data.document_card

  let downloadUrl = documentCard.download_url

  if (!downloadUrl) {
    for (let i = 0; i < 15; i++) {
      await new Promise((resolve) => setTimeout(resolve, 2000))
      const statusRes = await fetch(
        `https://api.pdfmonkey.io/api/v1/document_cards/${documentCard.id}`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        },
      )
      if (statusRes.ok) {
        const statusData = await statusRes.json()
        if (statusData.document_card.download_url) {
          downloadUrl = statusData.document_card.download_url
          break
        } else if (statusData.document_card.status === 'failure') {
          throw new Error('PDFMonkey document generation failed (status: failure)')
        }
      }
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
