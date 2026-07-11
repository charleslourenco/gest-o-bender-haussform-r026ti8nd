import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Trash2, Download, Upload, PenTool, FileSignature } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { EquipeSignatureModal } from './equipe-signature-modal'

interface Props {
  entityId: string
  entityType: 'clt' | 'pj'
  entityNome?: string
  entityEmail?: string
  entityCpf?: string
}

export function DocumentosAba({ entityId, entityType, entityNome, entityEmail, entityCpf }: Props) {
  const [docs, setDocs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [signatureDoc, setSignatureDoc] = useState<any | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const field = entityType === 'clt' ? 'clt_id' : 'pj_id'

  const fetchDocs = async () => {
    const { data: docsData } = await supabase
      .from('documentos_equipe')
      .select('*')
      .eq(field, entityId)
      .order('criado_em', { ascending: false })
    if (!docsData) {
      setDocs([])
      return
    }

    const docIds = docsData.map((d) => d.id)
    const [sigsRes, envsRes] = await Promise.all([
      supabase.from('assinaturas').select('*').in('documento_id', docIds).eq(field, entityId),
      supabase
        .from('envelopes_assinatura')
        .select('*')
        .in('documento_id', docIds)
        .eq(field, entityId),
    ])

    const docsWithSigs = docsData.map((doc) => ({
      ...doc,
      assinaturas: sigsRes.data?.filter((s) => s.documento_id === doc.id) || [],
      envelope: envsRes.data?.find((e) => e.documento_id === doc.id) || null,
    }))
    setDocs(docsWithSigs)
  }

  useEffect(() => {
    fetchDocs()
  }, [entityId, entityType])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const invalidExtensions = ['.gdoc', '.gsheet', '.glink', '.gslides', '.gdraw']
    const isInvalidGoogleFile = invalidExtensions.some((ext) =>
      file.name.toLowerCase().endsWith(ext),
    )

    if (isInvalidGoogleFile) {
      toast({
        title: 'Formato inválido',
        description:
          'Atalhos do Google Drive não são suportados. Por favor, baixe o arquivo como PDF primeiro.',
        variant: 'destructive',
      })
      if (fileRef.current) fileRef.current.value = ''
      return
    }

    setLoading(true)
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const filename = `${entityId}/${Date.now()}_${safeName}`

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    const finalType = isPdf ? 'application/pdf' : file.type || 'application/octet-stream'

    const { error: upErr } = await supabase.storage
      .from('documentos_equipe')
      .upload(filename, file, { contentType: finalType, upsert: true })

    if (upErr) {
      toast({ title: 'Erro ao enviar arquivo', description: upErr.message, variant: 'destructive' })
      setLoading(false)
      if (fileRef.current) fileRef.current.value = ''
      return
    }

    const insertData: any = {
      nome: file.name,
      arquivo_url: filename,
      tipo: finalType,
    }
    insertData[field] = entityId

    await supabase.from('documentos_equipe').insert(insertData)

    toast({ title: 'Arquivo enviado com sucesso!' })
    fetchDocs()
    setLoading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleDownload = (path: string) => {
    const { data } = supabase.storage.from('documentos_equipe').getPublicUrl(path)
    if (data?.publicUrl) window.open(data.publicUrl, '_blank')
  }

  const handleDownloadSigned = (doc: any) => {
    if (!doc.arquivo_assinado_url) return
    let url = doc.arquivo_assinado_url
    if (!url.startsWith('http')) {
      const { data } = supabase.storage.from('documentos_equipe').getPublicUrl(url)
      url = data?.publicUrl || url
    }
    window.open(url, '_blank')
  }

  const handleRemove = async (id: string, path: string) => {
    if (!confirm('Deseja realmente remover este arquivo?')) return
    await supabase.storage.from('documentos_equipe').remove([path])
    await supabase.from('documentos_equipe').delete().eq('id', id)
    fetchDocs()
  }

  return (
    <div className="space-y-4 py-4">
      <div className="flex justify-between items-center bg-muted/30 p-4 rounded-lg border border-border">
        <div>
          <h3 className="font-semibold text-sm">Arquivos da Pasta</h3>
          <p className="text-xs text-muted-foreground">Envie CNH, CTPS, Contratos e Comprovantes</p>
        </div>
        <Button onClick={() => fileRef.current?.click()} variant="default" disabled={loading}>
          <Upload className="w-4 h-4 mr-2" /> {loading ? 'Enviando...' : 'Enviar Arquivo'}
        </Button>
        <input
          type="file"
          className="hidden"
          ref={fileRef}
          accept=".pdf,application/pdf,image/*,.doc,.docx"
          onChange={handleUpload}
        />
      </div>

      <div className="space-y-2">
        {docs.length === 0 && (
          <div className="text-sm text-center text-muted-foreground p-8 border rounded-lg border-dashed">
            Nenhum documento anexado ainda.
          </div>
        )}
        {docs.map((d) => {
          const pendentes = d.assinaturas?.filter((a: any) => a.status === 'pendente').length || 0
          const hasAssinaturas = d.assinaturas?.length > 0
          const allAssinados = hasAssinaturas && pendentes === 0
          const isConcluido = d.envelope?.status === 'concluido'

          return (
            <div
              key={d.id}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors gap-3"
            >
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium truncate block">{d.nome}</span>
                {hasAssinaturas && (
                  <span
                    className={`text-xs mt-1 inline-block px-2 py-0.5 rounded-full ${
                      allAssinados ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {allAssinados
                      ? '✓ Todas assinaturas concluídas'
                      : `${pendentes} de ${d.assinaturas.length} pendente(s)`}
                  </span>
                )}
              </div>

              <div className="flex gap-2 shrink-0 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownload(d.arquivo_url)}
                  title="Baixar Arquivo"
                >
                  <Download className="w-4 h-4 mr-1" /> Baixar
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSignatureDoc(d)}
                  title="Gerenciar Assinaturas"
                >
                  <PenTool className="w-4 h-4 mr-1" /> Gerenciar Assinaturas
                </Button>

                {isConcluido && d.arquivo_assinado_url && (
                  <Button
                    size="sm"
                    onClick={() => handleDownloadSigned(d)}
                    className="bg-green-600 hover:bg-green-700 text-white font-medium"
                    title="Baixar PDF Assinado"
                  >
                    <FileSignature className="w-4 h-4 mr-1" /> 📥 PDF Assinado
                  </Button>
                )}

                <Button
                  size="icon"
                  variant="destructive"
                  onClick={() => handleRemove(d.id, d.arquivo_url)}
                  title="Excluir Arquivo"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {signatureDoc && (
        <EquipeSignatureModal
          doc={signatureDoc}
          entityId={entityId}
          entityType={entityType}
          entityNome={entityNome}
          entityEmail={entityEmail}
          entityCpf={entityCpf}
          onClose={() => {
            setSignatureDoc(null)
            fetchDocs()
          }}
        />
      )}
    </div>
  )
}
