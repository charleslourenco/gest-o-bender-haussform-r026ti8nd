import { supabase } from '@/lib/supabase/client'

const BUCKET_NAME = 'notas-fiscais'
const ACCEPTED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
const MAX_FILE_SIZE = 25 * 1024 * 1024

export function validateInvoiceFile(file: File): string | null {
  if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
    return 'Formato inválido. Apenas PDF, JPG e PNG são aceitos.'
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

  const { error } = await supabase.storage.from(BUCKET_NAME).upload(filePath, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  })

  if (error) {
    return { path: '', error: error.message }
  }

  return { path: filePath, error: null }
}

export async function getInvoiceSignedUrl(
  path: string,
): Promise<{ url: string; error: string | null }> {
  const { data, error } = await supabase.storage.from(BUCKET_NAME).createSignedUrl(path, 3600)

  if (error || !data?.signedUrl) {
    return { url: '', error: error?.message || 'Falha ao gerar URL de acesso.' }
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
