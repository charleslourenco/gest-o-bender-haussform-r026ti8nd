import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

/**
 * @deprecated Esta função foi substituída por `gerar_documento_cliente`, que agora
 * centraliza a geração de contratos/documentos via PDFMonkey e Storage.
 *
 * O stub existe apenas para que o ciclo de deploy da plataforma consiga ler os
 * arquivos da função legada sem falhar — ela não é mais invocada por nenhuma
 * parte do frontend. Retorna 410 Gone para qualquer chamada residual.
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve((req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  return new Response(
    JSON.stringify({
      success: false,
      deprecated: true,
      error:
        'A função gerar-dossie foi descontinuada. Utilize gerar_documento_cliente para gerar documentos.',
    }),
    {
      status: 410,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  )
})
