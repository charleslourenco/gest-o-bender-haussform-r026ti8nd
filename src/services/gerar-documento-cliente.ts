import { supabase } from '@/lib/supabase/client'
import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'

export interface GerarDocumentoPayload {
  clienteId: string
  templateUrl: string
  dados: Record<string, any>
  nomeDocumento?: string
  tipoDocumento?: string
}

export const gerarDocumentoCliente = async (payload: GerarDocumentoPayload) => {
  const {
    clienteId,
    templateUrl,
    dados,
    nomeDocumento = 'Contrato.docx',
    tipoDocumento = 'contrato',
  } = payload

  // 1. Buscar sessão
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) throw new Error('Usuário não autenticado')

  // 2. Buscar dados adicionais para enriquecer o template
  const { data: formulario } = await supabase
    .from('formulario_comercial')
    .select('*')
    .eq('cliente_id', clienteId)
    .maybeSingle()

  const { data: cliente } = await supabase
    .from('clientes')
    .select('*')
    .eq('id', clienteId)
    .maybeSingle()

  const dadosParaTemplate = {
    ...formulario,
    ...cliente,
    ...dados,
  }

  // 3. Baixar template
  const response = await fetch(templateUrl)
  if (!response.ok) throw new Error(`Falha no download: Status ${response.status}`)
  const arrayBuffer = await response.arrayBuffer()

  // Diagnóstico - Inspecionar XML Real antes de processar
  try {
    const tempZip = new PizZip(arrayBuffer)
    const xmlContent = tempZip.files['word/document.xml']?.asText()
    if (xmlContent) {
      console.log('XML BRUTO:', xmlContent.substring(0, 3000))
      const matches = xmlContent.match(/\[([A-Z_]+)\]/g)
      console.log('PLACEHOLDERS ENCONTRADOS NO XML:', matches)
      const matchesDuplos = xmlContent.match(/\{\{([A-Z_]+)\}\}/g)
      console.log('PLACEHOLDERS ANTIGOS {{}} NO XML:', matchesDuplos)
    }
  } catch (err) {
    console.warn('Não foi possível inspecionar o XML', err)
  }

  // 4. Processar template — SÍNCRONO, sem await
  const zip = new PizZip(arrayBuffer)
  const doc = new Docxtemplater(zip, {
    delimiters: { start: '[', end: ']' },
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => '',
  })

  // 5. Render — SÍNCRONO, sem await
  doc.render(dadosParaTemplate)

  // 6. Gerar blob — SÍNCRONO, sem await
  const blob = doc.getZip().generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })

  // 7. Upload
  const nomeArquivo = `${session.user.id}/${clienteId}/Contrato_${Date.now()}.docx`
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('dossiers')
    .upload(nomeArquivo, blob, { upsert: true })

  if (uploadError) throw new Error(uploadError.message)

  console.log('Contrato gerado com sucesso!')

  // 8. Registro Consistente no Banco
  const { data: docData, error: docError } = await supabase
    .from('documentos_gerados')
    .insert({
      cliente_id: clienteId,
      user_id: session.user.id,
      nome: nomeDocumento,
      path: nomeArquivo,
      tipo: tipoDocumento,
      criado_em: new Date().toISOString(),
    })
    .select()
    .single()

  if (docError) {
    throw new Error('Erro ao registrar documento: ' + docError.message)
  }

  return { success: true, uploadData, docData, publicUrl: nomeArquivo }
}
