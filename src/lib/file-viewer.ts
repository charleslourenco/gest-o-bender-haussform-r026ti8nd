import { supabase } from '@/lib/supabase/client'

interface OpenFileResult {
  success: boolean
  error?: string
}

const NOTAS_FISCAIS_BUCKET = 'notas-fiscais'
const BLOB_REVOKE_DELAY_MS = 30000

const normalizeStoragePath = (path: string): string => {
  if (!path) return path
  let p = path.trim()
  p = p.replace(/^https?:\/\/[^/]+\/storage\/v1\/object\/(?:public|sign)\/notas-fiscais\//, '')
  p = p.split('?')[0]
  p = p.replace(/^\/+/, '')
  p = p.replace(/^notas-fiscais\//, '')
  return p
}

const parseStorageUrl = (url: string): { bucket: string; path: string } | null => {
  const match = url.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+?)(?:\?|$)/)
  if (!match) return null
  return { bucket: match[1], path: decodeURIComponent(match[2]) }
}

export const openStorageFileInNewTab = async (
  filePath: string,
  options: { bucket?: string; contentType?: string } = {},
): Promise<OpenFileResult> => {
  try {
    if (!filePath) {
      return { success: false, error: 'Caminho do arquivo não informado.' }
    }

    let bucket = options.bucket ?? NOTAS_FISCAIS_BUCKET
    let path = filePath

    if (filePath.startsWith('http')) {
      const parsed = parseStorageUrl(filePath)
      if (parsed) {
        bucket = parsed.bucket
        path = parsed.path
      } else {
        return {
          success: false,
          error: 'URL externa não suportada para visualização direta.',
        }
      }
    } else {
      const normalized = normalizeStoragePath(filePath)
      if (!normalized) {
        return { success: false, error: 'Caminho do arquivo inválido.' }
      }
      path = normalized
    }

    const { data, error } = await supabase.storage.from(bucket).download(path)
    if (error) throw error
    if (!data) {
      return { success: false, error: 'Arquivo não encontrado no armazenamento.' }
    }

    const blob =
      options.contentType && data.type !== options.contentType
        ? new Blob([data], { type: options.contentType })
        : data

    const blobUrl = URL.createObjectURL(blob)
    const newTab = window.open(blobUrl, '_blank', 'noopener,noreferrer')

    if (!newTab) {
      URL.revokeObjectURL(blobUrl)
      return {
        success: false,
        error: 'Não foi possível abrir a nova aba. Verifique o bloqueador de pop-ups do navegador.',
      }
    }

    setTimeout(() => URL.revokeObjectURL(blobUrl), BLOB_REVOKE_DELAY_MS)
    return { success: true }
  } catch (e: any) {
    return {
      success: false,
      error: e?.message || 'Falha ao carregar o arquivo para visualização.',
    }
  }
}
