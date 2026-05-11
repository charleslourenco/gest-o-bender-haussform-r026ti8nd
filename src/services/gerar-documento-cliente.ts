import { supabase } from '@/lib/supabase/client'

export const gerarDocumentoCliente = async (params: any) => {
  const { data, error } = await supabase.functions.invoke('gerar_documento_cliente', {
    body: params,
  })

  console.log('ERRO DETALHADO:', JSON.stringify(data), JSON.stringify(error))

  if (error) throw error

  if (data && data.success === false) {
    throw new Error(data.error || 'Falha ao gerar documento')
  }

  return data
}
