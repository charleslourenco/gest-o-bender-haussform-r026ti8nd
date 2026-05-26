import { supabase } from '@/lib/supabase/client'

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
