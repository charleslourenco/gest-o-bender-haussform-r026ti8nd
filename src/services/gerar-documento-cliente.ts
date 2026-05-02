import { supabase } from '@/lib/supabase/client'

export const gerarDocumentoCliente = async (payload: any) => {
  const { data, error } = await supabase.functions.invoke('gerar_documento_cliente', {
    body: payload,
  })

  if (error) throw error

  return data
}
