import { supabase } from '@/lib/supabase/client'

export const gerarDocumentoCliente = async (params: any) => {
  // Pre-processamento: Garantir que se houver conteúdo editado, ele não vá com tags vazias que quebram o layout
  if (params.conteudo_editado) {
    params.conteudo_editado = params.conteudo_editado.replace(/<p><br><\/p>/g, '').trim()
    params.conteudo_editado = params.conteudo_editado.replace(/_{2,}CELL_{2,}/gi, '')
    params.conteudo_editado = params.conteudo_editado.replace(/______CELL_____/gi, '')
  }

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
