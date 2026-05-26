import { supabase } from '@/lib/supabase/client'

export const uploadFileToStorage = async (file: File) => {
  const fileExt = file.name.split('.').pop()
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
  const filePath = `${fileName}`

  const { error } = await supabase.storage.from('orcamentos-uploads').upload(filePath, file)
  if (error) throw error

  const { data: publicUrlData } = supabase.storage.from('orcamentos-uploads').getPublicUrl(filePath)
  return publicUrlData.publicUrl
}

export const processarListaMateriaisOcr = async (fileData: string, isPdf: boolean) => {
  const { data, error } = await supabase.functions.invoke('financeiro-ai', {
    body: { action: 'ocr_lista_materiais', payload: { imageBase64: fileData, isPdf } },
  })

  if (error) throw error
  if (data?.error) throw new Error(data.error)

  return data
}

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = (error) => reject(error)
  })
}
