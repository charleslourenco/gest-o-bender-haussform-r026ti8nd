import { supabase } from '@/lib/supabase/client'

export const gerarDocumentoCliente = async (params: any) => {
  const { data, error } = await supabase.functions.invoke('gerar_documento_cliente', {
    body: params,
  })

  if (error) throw error

  if (data && data.success === false) {
    throw new Error(data.error || 'Falha ao gerar documento')
  }

  return data
}
