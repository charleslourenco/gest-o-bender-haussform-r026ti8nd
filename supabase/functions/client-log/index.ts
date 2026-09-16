import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json()
    const { message, stack, componentStack, route, source, extra, user_id } = payload || {}

    // Formatar log estruturado nos logs de Edge Function
    console.error(`[CLIENT-ERROR-BOUNDARY] [${route || source || 'unknown'}]`, {
      message,
      stack,
      componentStack,
      route,
      source,
      user_id,
      extra,
      timestamp: new Date().toISOString(),
    })

    // Tentar persistir na tabela logs_ia caso exista com service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey)
        await supabase.from('logs_ia').insert({
          user_id: user_id || null,
          acao: 'client_error_boundary',
          detalhes: {
            message,
            stack,
            componentStack,
            route,
            source,
            extra,
            user_agent: req.headers.get('user-agent'),
            timestamp: new Date().toISOString(),
          },
        })
      } catch (dbErr) {
        console.warn('[CLIENT-ERROR-BOUNDARY] Falha ao gravar em logs_ia:', dbErr)
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('[CLIENT-ERROR-BOUNDARY] Erro ao processar log:', err)
    return new Response(JSON.stringify({ success: false, error: err?.message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
