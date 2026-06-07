import { supabase } from '@/lib/supabase/client'

export const gerarDocumentoCliente = async (params: any) => {
  // O pré-processamento, sanitização (remoção de markers CELL) e
  // conversão de tabelas legadas para CSS Flex/Grid são agora responsabilidade
  // da Edge Function, garantindo consistência, segurança e codificação UTF-8 globais.

  const { data, error } = await supabase.functions.invoke('gerar_documento_cliente', {
    body: params,
  })

  if (error) {
    console.error('ERRO DETALHADO DA EDGE FUNCTION:', error)
    throw error
  }

  if (data && data.success === false) {
    throw new Error(data.error || 'Falha ao gerar documento')
  }

  return data
}
