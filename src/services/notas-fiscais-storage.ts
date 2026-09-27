import { supabase } from '@/lib/supabase/client'

const BUCKET_NAME = 'notas-fiscais'
const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/jpg',
  'text/xml',
  'application/xml',
]
const MAX_FILE_SIZE = 25 * 1024 * 1024

export function isXmlInvoiceFile(file: File): boolean {
  if (!file) return false
  const name = (file.name || '').toLowerCase()
  return name.endsWith('.xml') || file.type === 'text/xml' || file.type === 'application/xml'
}

export function validateInvoiceFile(file: File): string | null {
  const isXml = isXmlInvoiceFile(file)
  const isAcceptedMime = ACCEPTED_MIME_TYPES.includes(file.type) || isXml

  if (!isAcceptedMime) {
    return 'Formato inválido. Apenas PDF, JPG, PNG e XML (.xml) são aceitos.'
  }
  if (file.size > MAX_FILE_SIZE) {
    return 'O arquivo deve ter no máximo 25MB.'
  }
  return null
}

export async function uploadInvoiceFile(
  file: File,
): Promise<{ path: string; error: string | null }> {
  const validationError = validateInvoiceFile(file)
  if (validationError) {
    return { path: '', error: validationError }
  }

  const ext = file.name.split('.').pop() || 'bin'
  const fileName = `${crypto.randomUUID()}_${file.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '')}`
  const filePath = `invoices/${fileName}`

  const contentType =
    file.type || (file.name.toLowerCase().endsWith('.xml') ? 'application/xml' : undefined)

  const { error } = await supabase.storage.from(BUCKET_NAME).upload(filePath, file, {
    cacheControl: '3600',
    upsert: false,
    contentType,
  })

  if (error) {
    return { path: '', error: error.message }
  }

  return { path: filePath, error: null }
}

function normalizeStoragePath(path: string): string {
  if (!path) return path
  let p = path.trim()
  // Strip full Supabase storage URLs (public or signed)
  p = p.replace(/^https?:\/\/[^/]+\/storage\/v1\/object\/(?:public|sign)\/notas-fiscais\//, '')
  // Strip query string (e.g. signed URL tokens)
  p = p.split('?')[0]
  // Strip leading slashes
  p = p.replace(/^\/+/, '')
  // Strip a possible bucket-name prefix
  p = p.replace(/^notas-fiscais\//, '')
  return p
}

export async function getInvoiceSignedUrl(
  path: string,
): Promise<{ url: string; error: string | null }> {
  if (!path) {
    return { url: '', error: 'Caminho do arquivo não informado.' }
  }

  const normalizedPath = normalizeStoragePath(path)
  if (!normalizedPath) {
    return { url: '', error: 'Caminho do arquivo inválido.' }
  }

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(normalizedPath, 3600)

  if (error) {
    return {
      url: '',
      error:
        error.message ||
        'Não foi possível gerar o link de acesso ao arquivo (permissão ou caminho inválido).',
    }
  }

  if (!data?.signedUrl) {
    return {
      url: '',
      error: 'Não foi possível gerar o link de acesso ao arquivo.',
    }
  }

  return { url: data.signedUrl, error: null }
}

export async function attachInvoiceFile(
  notaId: string,
  file: File,
): Promise<{ path: string; error: string | null }> {
  const { path, error } = await uploadInvoiceFile(file)
  if (error) {
    return { path: '', error }
  }

  const { error: dbError } = await supabase
    .from('notas_fiscais')
    .update({ arquivo_url: path })
    .eq('id', notaId)

  if (dbError) {
    return { path: '', error: dbError.message }
  }

  return { path, error: null }
}
