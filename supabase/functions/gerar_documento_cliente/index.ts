import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import JSZip from 'https://esm.sh/jszip'

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const input = await req.json()
    const {
      cliente_id,
      signatario_tipo,
      signatario_nome,
      signatario_cpf,
      signatario_email,
      signatario_telefone,
    } = input as any

    const documento_id = crypto.randomUUID()
    const codigo_confirmacao = Array.from({ length: 6 }, () => Math.floor(Math.random() * 10)).join(
      '',
    )
    const expira_em = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    const documento_nome = 'Contrato_Bender_Haussform.docx'

    const placeholders: Record<string, string> = {
      cliente_id,
      signatario_tipo,
      signatario_nome,
      signatario_cpf,
      signatario_email,
      signatario_telefone,
      codigo_confirmacao,
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Fetch template
    const { data: templateData, error: templateError } = await supabase.storage
      .from('documents')
      .download('templates/Bender_Haussform.docx')

    if (templateError || !templateData) {
      throw new Error('Template not found')
    }

    const arrayBuffer = await templateData.arrayBuffer()
    const zip = new JSZip()
    await zip.loadAsync(arrayBuffer)

    let xml = await zip.file('word/document.xml')!.async('string')

    // Advanced regex replacement for placeholders, even with extra spaces
    for (const [key, value] of Object.entries(placeholders)) {
      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(`{{\\s*${escapedKey}\\s*}}`, 'gi')
      xml = xml.replace(regex, value)
    }

    zip.file('word/document.xml', xml)

    const docBuffer = await zip.generateAsync({
      type: 'uint8array',
      compression: 'DEFLATE',
    })

    // Upload to storage
    const storagePath = `contratos/${cliente_id}/${documento_id}.docx`
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, docBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: true,
      })

    if (uploadError) throw uploadError

    // Insert into database
    const { data: inserted, error: insertError } = await supabase
      .from('assinaturas')
      .insert({
        documento_id,
        documento_nome,
        cliente_id,
        signatario_tipo,
        signatario_nome,
        signatario_cpf,
        signatario_email,
        signatario_telefone,
        codigo_confirmacao,
        status: 'pendente',
        expira_em,
      })
      .select()
      .single()

    if (insertError) throw insertError

    const {
      data: { publicUrl },
    } = supabase.storage.from('documents').getPublicUrl(storagePath)

    return new Response(
      JSON.stringify({ success: true, assinatura: inserted, documento_url: publicUrl }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error(error)
    return new Response(JSON.stringify({ success: false, error: (error as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
