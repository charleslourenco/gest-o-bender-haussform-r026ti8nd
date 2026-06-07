import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  // Trata preflight request do CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Sem cabeçalho de autorização')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    })

    // Valida o token e resgata o usuário
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData.user) {
      throw new Error('Usuário não autorizado')
    }

    const { action, modulo } = await req.json()

    // Resgata o nível de acesso do usuário no módulo específico
    const { data: permData, error: permError } = await supabase
      .from('matriz_permissoes')
      .select('nivel_acesso')
      .eq('usuario_id', userData.user.id)
      .eq('modulo', modulo)
      .single()

    if (permError || !permData) {
      return new Response(JSON.stringify({ allowed: false, reason: 'Permissão negada' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    const level = permData.nivel_acesso
    let allowed = false

    // Lógica simples de RBAC (Role Based Access Control)
    if (level === 'Admin') {
      allowed = true
    } else if (level === 'Editor' && ['read', 'write', 'update'].includes(action)) {
      allowed = true
    } else if (level === 'Leitor' && action === 'read') {
      allowed = true
    }

    return new Response(JSON.stringify({ allowed, level }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
