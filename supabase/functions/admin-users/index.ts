import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, x-supabase-client-platform, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Sem cabeçalho de autorização')

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Authenticate caller
    const {
      data: { user: caller },
      error: callerError,
    } = await supabase.auth.getUser()
    if (callerError || !caller) throw new Error('Não autorizado')

    // Check caller permissions in Matriz
    const { data: perm, error: permError } = await supabaseAdmin
      .from('matriz_permissoes')
      .select('nivel_acesso')
      .eq('usuario_id', caller.id)
      .eq('modulo', 'Usuários')
      .single()

    if (permError || !perm || !['Admin', 'Editor'].includes(perm.nivel_acesso)) {
      throw new Error('Permissão negada')
    }

    const body = await req.json()
    const { action, userId, userData, permissionsData } = body

    if (action === 'create') {
      const { data: newAuthUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: userData.email,
        password: userData.senha || 'ChangeMe@2026', // Initial generic password
        email_confirm: true,
        user_metadata: { nome: userData.nome },
      })

      if (createError) throw createError

      // The trigger on_auth_user_created fires. We can just update it with additional fields safely.
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({
          nome: userData.nome,
          telefone: userData.telefone,
          funcao: userData.funcao,
          status: userData.status,
          foto_perfil: userData.foto_perfil,
        })
        .eq('id', newAuthUser.user.id)

      if (updateError) throw updateError

      return new Response(JSON.stringify({ user: newAuthUser.user }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'update') {
      if (!userId) throw new Error('ID do usuário não fornecido')

      if (userData.senha) {
        const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          password: userData.senha,
        })
        if (authUpdateError) throw authUpdateError
      }

      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({
          nome: userData.nome,
          telefone: userData.telefone,
          funcao: userData.funcao,
          status: userData.status,
          foto_perfil: userData.foto_perfil,
        })
        .eq('id', userId)

      if (updateError) throw updateError

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'delete') {
      if (!userId) throw new Error('ID do usuário não fornecido')
      if (userId === caller.id) throw new Error('Você não pode deletar a si mesmo')

      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
      if (deleteError) throw deleteError

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'update_permissions') {
      if (!userId || !permissionsData) throw new Error('Dados inválidos')

      await supabaseAdmin.from('matriz_permissoes').delete().eq('usuario_id', userId)

      const inserts = permissionsData.map((p: any) => ({
        usuario_id: userId,
        modulo: p.modulo,
        nivel_acesso: p.nivel_acesso,
      }))

      const { error: insertError } = await supabaseAdmin.from('matriz_permissoes').insert(inserts)
      if (insertError) throw insertError

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    throw new Error('Ação inválida')
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
