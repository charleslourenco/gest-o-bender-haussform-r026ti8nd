export function isPdfDocument(
  filename: string | null | undefined,
  mimeType?: string | null,
): boolean {
  if (!filename) return false
  if (mimeType === 'application/pdf') return true
  return filename.toLowerCase().endsWith('.pdf')
}

export function getDocumentBucket(source: string): string {
  return source === 'equipe' ? 'documentos_equipe' : 'bender_clientes'
}
