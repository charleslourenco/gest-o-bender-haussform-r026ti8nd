import { supabase } from '@/lib/supabase/client'

export const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = (error) => reject(error)
  })

export const processarOrcamentoOcr = async (
  fileData: string,
  fileType: string,
  fileName: string,
) => {
  const { data, error } = await supabase.functions.invoke('processar-orcamento-ocr', {
    body: { fileData, fileType, fileName },
  })

  if (error) throw error
  if (data?.error) throw new Error(data.error)

  return data
}

export const processarListaMateriaisOcr = async (fileBase64: string, isPdf: boolean) => {
  const { data, error } = await supabase.functions.invoke('financeiro-ai', {
    body: { action: 'ocr_lista_materiais', payload: { imageBase64: fileBase64, isPdf } },
  })

  if (error) throw error
  if (data?.error) throw new Error(data.error)

  if (typeof data === 'string') {
    try {
      return JSON.parse(data)
    } catch (e) {
      return data
    }
  }
  return data
}

export const uploadOcrFile = async (file: File) => {
  const ext = file.name.split('.').pop()
  const path = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`

  const { error } = await supabase.storage.from('orcamentos-uploads').upload(path, file)
  if (error) throw error

  const { data: urlData } = supabase.storage.from('orcamentos-uploads').getPublicUrl(path)
  return urlData.publicUrl
}
