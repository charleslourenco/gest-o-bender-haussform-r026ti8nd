import { supabase } from '@/lib/supabase/client'

export interface GerarDocumentoParams {
  template_nome: string
  cliente_id: string
  projeto_id: string
  dados_formulario: any
}

export const gerarDocumentoCliente = async (params: GerarDocumentoParams) => {
  const { data, error } = await supabase.functions.invoke('gerar_documento_cliente', {
    body: params,
  })

  return { data, error }
}
