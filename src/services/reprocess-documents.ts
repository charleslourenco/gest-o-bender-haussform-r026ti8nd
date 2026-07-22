import { supabase } from '@/lib/supabase/client'

export async function reprocessMissingSignedDocuments() {
  const { data, error } = await supabase.rpc('reprocess_missing_signed_documents')
  if (error) throw error
  return data
}

export async function reprocessEnvelopeDocuments(envelopeId: string) {
  const { data, error } = await supabase.functions.invoke('finalize-signature-document', {
    body: { envelope_id: envelopeId, force: true },
  })
  if (error) throw error
  return data
}

export async function reprocessSingleDocument(documentoId: string, envelopeId?: string) {
  const { data, error } = await supabase.functions.invoke('finalize-signature-document', {
    body: { documento_id: documentoId, envelope_id: envelopeId, force: true },
  })
  if (error) throw error
  return data
}
