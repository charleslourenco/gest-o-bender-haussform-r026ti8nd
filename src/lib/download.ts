import { supabase } from '@/lib/supabase/client'

interface DownloadResult {
  success: boolean
  error?: string
}

const parseStorageUrl = (url: string): { bucket: string; path: string } | null => {
  const match = url.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+?)(?:\?|$)/)
  if (!match) return null
  return { bucket: match[1], path: decodeURIComponent(match[2]) }
}

const triggerBlobDownload = (data: Blob, filename: string) => {
  const objectUrl = URL.createObjectURL(data)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1500)
}

export const downloadFromStorage = async (
  filePath: string,
  filename: string,
  defaultBucket = 'documentos_equipe',
): Promise<DownloadResult> => {
  try {
    if (!filePath) return { success: false, error: 'Caminho do arquivo inválido.' }

    let bucket = defaultBucket
    let path = filePath

    if (filePath.startsWith('http')) {
      const parsed = parseStorageUrl(filePath)
      if (parsed) {
        bucket = parsed.bucket
        path = parsed.path
      } else {
        return { success: false, error: 'URL externa não suportada para download direto.' }
      }
    }

    const { data, error } = await supabase.storage.from(bucket).download(path)
    if (error) throw error
    if (!data) return { success: false, error: 'Arquivo não encontrado.' }

    triggerBlobDownload(data, filename)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e?.message || 'Falha ao baixar o arquivo.' }
  }
}
