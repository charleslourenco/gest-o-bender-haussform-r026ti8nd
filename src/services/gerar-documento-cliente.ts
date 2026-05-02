import { supabase } from '@/lib/supabase/client'

export interface GerarDocumentoParams {
  cliente_id: string
  projeto_id: string
  dados_formulario?: any
  template_nome?: string
}

export const gerarDocumentoCliente = async (params: GerarDocumentoParams) => {
  const { data, error } = await supabase.functions.invoke('gerar_documento_cliente', {
    body: params,
  })

  return { data, error }
}
