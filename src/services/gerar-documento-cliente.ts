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

  if (!clienteId) throw new Error('clienteId não fornecido')
  if (!templateUrl) throw new Error('templateUrl não fornecido')
  if (!dados) throw new Error('dados não fornecidos')

  // 1. Validação de Sessão Obrigatória
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError) {
    throw new Error('Erro ao obter sessão: ' + sessionError.message)
  }

  if (!session) {
    throw new Error('Usuário não autenticado. Faça login novamente.')
  }

  console.log('Sessão ativa:', session.user.id)

  // 2. Download do Template
  let arrayBuffer: ArrayBuffer
  try {
    const response = await fetch(templateUrl)
    if (!response.ok) {
      throw new Error(`Falha no download: Status ${response.status}`)
    }
    arrayBuffer = await response.arrayBuffer()
  } catch (error: any) {
    throw new Error('Erro ao baixar o template: ' + error.message)
  }

  let zip: PizZip
  try {
    zip = new PizZip(arrayBuffer)
  } catch (error: any) {
    throw new Error('O arquivo baixado não é um template DOCX válido: ' + error.message)
  }

  // 3. Diagnóstico - Inspecionar XML Real
  try {
    const xmlContent = zip.files['word/document.xml'].asText()
    const matches = xmlContent.match(/\[([A-Z_]+)\]/g)
    console.log('PLACEHOLDERS ENCONTRADOS NO XML:', matches)

    const matchesDuplos = xmlContent.match(/\{\{([A-Z_]+)\}\}/g)
    console.log('PLACEHOLDERS ANTIGOS {{}} NO XML:', matchesDuplos)
  } catch (err) {
    console.warn('Não foi possível inspecionar o XML', err)
  }

  // 4. Instanciar Docxtemplater com os Delimitadores Corretos
  let doc: Docxtemplater
  try {
    doc = new Docxtemplater(zip, {
      delimiters: { start: '[', end: ']' },
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: () => '',
    })
  } catch (error: any) {
    throw new Error('Erro ao configurar o gerador de documentos: ' + error.message)
  }

  // 5. Renderizar Documento
  try {
    doc.render(dados)
  } catch (error: any) {
    throw new Error('Erro ao injetar dados no documento: ' + error.message)
  }

  const blob = doc.getZip().generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })

  // 6. Upload com Contexto Autenticado para o bucket dossiers
  const nomeArquivo = `${session.user.id}/${clienteId}/Contrato_${Date.now()}.docx`

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('dossiers')
    .upload(nomeArquivo, blob, {
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      upsert: true,
    })

  if (uploadError) {
    console.error('Erro no upload:', uploadError)
    throw new Error('Erro no upload: ' + uploadError.message)
  }

  console.log('Upload realizado:', uploadData)

  // 7. Registro Consistente no Banco (padrão async/await)
  const { data: docData, error: docError } = await supabase.from('documentos_gerados').insert({
    cliente_id: clienteId,
    user_id: session.user.id,
    nome: nomeDocumento,
    path: nomeArquivo,
    tipo: tipoDocumento,
    criado_em: new Date().toISOString(),
  })

  if (docError) {
    console.error('Erro ao registrar documento:', docError)
    throw new Error('Erro ao registrar documento: ' + docError.message)
  }

  console.log('Documento registrado com sucesso:', docData)

  return { success: true, uploadData, docData, publicUrl: nomeArquivo }
}
