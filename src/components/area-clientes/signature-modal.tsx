import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  Loader2,
  Trash2,
  Mail,
  Link as LinkIcon,
  Plus,
  FileText,
  CheckCircle,
  RefreshCw,
} from 'lucide-react'
import { reprocessEnvelopeDocuments } from '@/services/reprocess-documents'

interface SignatureModalProps {
  docs: any[]
  clienteId: string
  clienteNome?: string
  clienteEmail?: string
  onClose: () => void
}

export function SignatureModal({
  docs,
  clienteId,
  clienteNome,
  clienteEmail,
  onClose,
}: SignatureModalProps) {
  const isEnvelope = docs.length > 1
  const [signatures, setSignatures] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [envelope, setEnvelope] = useState<any>(null)
  const [assinantesList, setAssinantesList] = useState<any[]>([])
  const [form, setForm] = useState({
    nome: clienteNome || '',
    email: clienteEmail || '',
    cpf: '',
    tipo: 'Cliente',
    telefone: '',
  })
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [finalizing, setFinalizing] = useState(false)

  const roles = [
    'Cliente',
    'Daiana (Company Representative)',
    'Testemunha 1',
    'Testemunha 2',
    'Consultor',
    'Analista',
  ]

  const docIds = docs.map((d) => d.path || d.arquivo_url || d.id)

  const loadSignatures = async () => {
    try {
      if (isEnvelope) {
        const { data: existingDocs } = await supabase
          .from('documentos_cliente')
          .select('envelope_id')
          .in(
            'id',
            docs.map((d) => d.id),
          )

        const envelopeIds = [
          ...new Set((existingDocs || []).map((d) => d.envelope_id).filter(Boolean)),
        ]
        if (envelopeIds.length > 0) {
          const { data: env } = await supabase
            .from('envelopes_assinatura')
            .select('*')
            .eq('id', envelopeIds[0])
            .single()
          if (env) setEnvelope(env)
        }

        const { data: sigs } = await supabase
          .from('assinaturas')
          .select('*')
          .in('documento_id', docIds)
          .order('criado_em', { ascending: true })
        setSignatures(sigs || [])

        const envIdForAssinantes = envelopeIds[0] || envelope?.id
        if (envIdForAssinantes) {
          const { data: assinantesData } = await supabase
            .from('assinantes')
            .select('*')
            .eq('envelope_id', envIdForAssinantes)
          setAssinantesList(assinantesData || [])
        }
      } else {
        const { data: existingDocs } = await supabase
          .from('documentos_cliente')
          .select('envelope_id')
          .in(
            'id',
            docs.map((d) => d.id),
          )

        const envelopeIds = [
          ...new Set((existingDocs || []).map((d) => d.envelope_id).filter(Boolean)),
        ]
        if (envelopeIds.length > 0) {
          const { data: env } = await supabase
            .from('envelopes_assinatura')
            .select('*')
            .eq('id', envelopeIds[0])
            .single()
          if (env) setEnvelope(env)

          const { data: assinantesData } = await supabase
            .from('assinantes')
            .select('*')
            .eq('envelope_id', envelopeIds[0])
          setAssinantesList(assinantesData || [])
        } else {
          setAssinantesList([])
        }

        const { data, error } = await supabase
          .from('assinaturas')
          .select('*')
          .eq('documento_id', docIds[0])
          .order('criado_em', { ascending: true })
        if (error) throw error
        setSignatures(data || [])
      }
    } catch (e: any) {
      toast.error('Erro ao carregar assinaturas: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSignatures()
  }, [])

  const groupedSignatures = useMemo(() => {
    if (!isEnvelope) return signatures.map((s) => ({ ...s, _ids: [s.id], _docCount: 1 }))
    const groups: Record<string, any> = {}
    for (const sig of signatures) {
      const key = sig.signatario_email
      if (!groups[key]) {
        groups[key] = { ...sig, _ids: [sig.id], _docCount: 1 }
      } else {
        groups[key]._ids.push(sig.id)
        groups[key]._docCount++
      }
    }
    return Object.values(groups)
  }, [signatures, isEnvelope])

  const allAssinantesSigned =
    assinantesList.length > 0 && assinantesList.every((a) => a.status === 'assinado')
  const allSigned =
    !!envelope &&
    signatures.length > 0 &&
    signatures.every((s) => s.status === 'assinado') &&
    (assinantesList.length === 0 || allAssinantesSigned)

  const handleFinalizeEnvelope = async () => {
    if (!envelope) return

    const { data: latestAssinantes } = await supabase
      .from('assinantes')
      .select('id, status')
      .eq('envelope_id', envelope.id)

    const totalAssinantes = latestAssinantes?.length ?? 0
    const signedAssinantes = (latestAssinantes ?? []).filter((a) => a.status === 'assinado').length

    if (totalAssinantes === 0 || signedAssinantes < totalAssinantes) {
      toast.error(
        `Apenas ${signedAssinantes} de ${totalAssinantes} signatários assinaram. Aguarde todas as assinaturas.`,
      )
      return
    }

    setFinalizing(true)
    try {
      const { error } = await supabase
        .from('envelopes_assinatura')
        .update({ status: 'concluido', concluido_em: new Date().toISOString() })
        .eq('id', envelope.id)
      if (error) throw error
      toast.success('Envelope finalizado! Gerando PDFs assinados...')
      setEnvelope({ ...envelope, status: 'concluido' })
    } catch (e: any) {
      toast.error('Erro ao finalizar envelope: ' + e.message)
    } finally {
      setFinalizing(false)
    }
  }

  const handleAddSignature = async () => {
    if (!form.nome || !form.email) {
      toast.error('Nome e E-mail são obrigatórios')
      return
    }

    try {
      const code = Math.floor(1000 + Math.random() * 9000).toString()
      const expiraEm = new Date()
      expiraEm.setDate(expiraEm.getDate() + 7)

      if (isEnvelope) {
        let envId = envelope?.id

        if (!envId) {
          const { data: newEnv, error: envError } = await supabase
            .from('envelopes_assinatura')
            .insert({
              documento_id: docIds[0],
              cliente_id: clienteId,
              nome_documento: `Envelope com ${docs.length} documento(s)`,
              status: 'aguardando',
              signatario_nome: form.nome,
              signatario_email: form.email,
              codigo_verificacao: code,
            })
            .select()
            .single()
          if (envError) throw envError
          envId = newEnv.id
          setEnvelope(newEnv)

          const { error: linkError } = await supabase
            .from('documentos_cliente')
            .update({ envelope_id: envId })
            .in(
              'id',
              docs.map((d) => d.id),
            )
          if (linkError) throw linkError
        }

        // Verifica se o signatário já existe para evitar duplicidades
        const existingAssinante = assinantesList.find(
          (a) => a.email?.toLowerCase() === form.email.trim().toLowerCase(),
        )
        if (existingAssinante) {
          toast.error('Este e-mail já foi adicionado como signatário neste envelope.')
          return
        }

        for (const doc of docs) {
          const docId = doc.arquivo_url || doc.path || doc.id
          // Evita inserir assinatura duplicada para o mesmo documento e email
          const { data: existingSig } = await supabase
            .from('assinaturas')
            .select('id')
            .eq('documento_id', docId)
            .ilike('signatario_email', form.email.trim())
            .maybeSingle()

          if (!existingSig) {
            await supabase.from('assinaturas').insert({
              documento_id: docId,
              documento_nome: doc.template_nome || doc.tipo || 'Documento',
              cliente_id: clienteId,
              signatario_nome: form.nome,
              signatario_email: form.email.trim(),
              signatario_telefone: form.telefone || null,
              signatario_tipo: form.tipo,
              signatario_cpf: form.cpf || null,
              codigo_confirmacao: code,
              expira_em: expiraEm.toISOString(),
              status: 'pendente',
            })
          }
        }

        const { data: authData } = await supabase.auth.getUser()
        const userName = authData.user?.user_metadata?.nome || authData.user?.email || 'Sistema'
        const tokenAcesso = crypto.randomUUID()
        await supabase.from('assinantes').insert({
          envelope_id: envId,
          nome_completo: form.nome,
          email: form.email.trim(),
          cpf: form.cpf || null,
          papel: form.tipo,
          tipo_assinatura: 'link',
          status: 'pendente',
          codigo_verificacao: code,
          codigo_expira_em: expiraEm.toISOString(),
          token_acesso: tokenAcesso,
        })

        await supabase.from('timeline_eventos').insert({
          cliente_id: clienteId,
          usuario_nome: userName,
          acao: `Envelope de assinatura criado com ${docs.length} documento(s) para ${form.nome}`,
        })
      } else {
        const doc = docs[0]
        const docId = doc.path || doc.arquivo_url

        const existingSig = signatures.find(
          (s) => s.signatario_email?.toLowerCase() === form.email.trim().toLowerCase(),
        )
        if (existingSig) {
          toast.error('Este e-mail já foi adicionado como signatário neste documento.')
          return
        }

        let envId = envelope?.id
        if (!envId) {
          const { data: newEnv, error: envError } = await supabase
            .from('envelopes_assinatura')
            .insert({
              documento_id: docId,
              cliente_id: clienteId,
              nome_documento: doc.title || doc.template_nome || doc.tipo,
              status: 'aguardando',
              signatario_nome: form.nome,
              signatario_email: form.email.trim(),
              codigo_verificacao: code,
            })
            .select()
            .single()
          if (envError) throw envError
          envId = newEnv.id
          setEnvelope(newEnv)

          await supabase
            .from('documentos_cliente')
            .update({ envelope_id: newEnv.id })
            .eq('id', doc.id)
        }

        const { error } = await supabase.from('assinaturas').insert({
          documento_id: docId,
          documento_nome: doc.title || doc.template_nome || doc.tipo,
          cliente_id: clienteId,
          signatario_nome: form.nome,
          signatario_email: form.email.trim(),
          signatario_telefone: form.telefone || null,
          signatario_tipo: form.tipo,
          signatario_cpf: form.cpf || null,
          codigo_confirmacao: code,
          expira_em: expiraEm.toISOString(),
          status: 'pendente',
        })
        if (error) throw error

        const tokenAcesso = crypto.randomUUID()
        await supabase.from('assinantes').insert({
          envelope_id: envId,
          nome_completo: form.nome,
          email: form.email.trim(),
          cpf: form.cpf || null,
          papel: form.tipo,
          tipo_assinatura: 'link',
          status: 'pendente',
          codigo_verificacao: code,
          codigo_expira_em: expiraEm.toISOString(),
          token_acesso: tokenAcesso,
        })

        const { data: authData } = await supabase.auth.getUser()
        const userName = authData.user?.user_metadata?.nome || authData.user?.email || 'Sistema'
        await supabase.from('timeline_eventos').insert({
          cliente_id: clienteId,
          usuario_nome: userName,
          acao: `Envelope de assinatura criado para ${form.nome}`,
        })
      }

      toast.success('Signatário adicionado com sucesso!')
      setForm({ nome: '', email: '', cpf: '', tipo: 'Cliente', telefone: '' })
      loadSignatures()
    } catch (e: any) {
      toast.error('Erro ao adicionar: ' + e.message)
    }
  }

  const handleDelete = async (sig: any) => {
    if (!confirm('Remover este signatário?')) return
    try {
      const { error } = await supabase.from('assinaturas').delete().in('id', sig._ids)
      if (error) throw error
      toast.success('Removido')
      loadSignatures()
    } catch (e: any) {
      toast.error('Erro ao remover: ' + e.message)
    }
  }

  const handleSendEmail = async (sig: any) => {
    setSendingId(sig._ids[0])
    try {
      let link: string
      let body: any

      if (envelope) {
        const assinanteRecord = assinantesList.find((a) => a.email === sig.signatario_email)
        const tokenParam = assinanteRecord?.token_acesso
          ? `?token=${assinanteRecord.token_acesso}`
          : ''
        link = `${window.location.origin}/assinar-envelope/${envelope.id}${tokenParam}`
        body = {
          to: sig.signatario_email,
          nome: sig.signatario_nome,
          link,
          codigo: sig.codigo_confirmacao,
          documento_nome: isEnvelope
            ? `Envelope com ${docs.length} documento(s)`
            : sig.documento_nome,
          envelope_id: envelope.id,
        }
      } else {
        link = `${window.location.origin}/assinatura/${sig.id}`
        body = {
          to: sig.signatario_email,
          nome: sig.signatario_nome,
          link,
          codigo: sig.codigo_confirmacao,
          documento_nome: sig.documento_nome,
        }
      }

      const { data, error } = await supabase.functions.invoke('send-signature-email', {
        body,
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      toast.success('E-mail enviado!')
    } catch (e: any) {
      toast.error('Erro ao enviar: ' + e.message)
    } finally {
      setSendingId(null)
    }
  }

  const copyLink = (sig: any) => {
    let link: string
    if (envelope) {
      const assinanteRecord = assinantesList.find((a) => a.email === sig.signatario_email)
      const tokenParam = assinanteRecord?.token_acesso
        ? `?token=${assinanteRecord.token_acesso}`
        : ''
      link = `${window.location.origin}/assinar-envelope/${envelope.id}${tokenParam}`
    } else {
      link = `${window.location.origin}/assinatura/${sig.id}`
    }
    navigator.clipboard.writeText(link)
    toast.success('Link copiado!')
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEnvelope
              ? `Gerenciar Assinaturas — Envelope (${docs.length} documentos)`
              : 'Gerenciar Assinaturas'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {isEnvelope && assinantesList.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm font-medium text-blue-700">
                Progresso de Assinaturas:{' '}
                {assinantesList.filter((a) => a.status === 'assinado').length} de{' '}
                {assinantesList.length} signatário(s)
              </p>
            </div>
          )}

          {isEnvelope && (
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-semibold text-sm mb-2">Documentos no Envelope</h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {docs.map((doc, i) => (
                  <div
                    key={doc.id || i}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <FileText className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{doc.template_nome || doc.tipo || doc.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-muted p-4 rounded-lg space-y-3">
            <h4 className="font-semibold text-sm">Adicionar Signatário</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                placeholder="Nome completo"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
              />
              <Input
                placeholder="E-mail"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <Input
                placeholder="CPF (opcional)"
                value={form.cpf}
                onChange={(e) => setForm({ ...form, cpf: e.target.value })}
              />
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Papel" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Telefone (opcional)"
                value={form.telefone}
                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
              />
            </div>
            <Button onClick={handleAddSignature} className="w-full">
              <Plus className="w-4 h-4 mr-2" /> Adicionar à lista
            </Button>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-3">
              {isEnvelope ? 'Signatários do Envelope' : 'Signatários do Documento'}
            </h4>
            {loading ? (
              <div className="flex justify-center p-4">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : groupedSignatures.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center p-4">
                Nenhum signatário adicionado ainda.
              </p>
            ) : (
              <div className="space-y-3">
                {groupedSignatures.map((sig) => (
                  <div
                    key={sig._ids[0]}
                    className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 border rounded-md gap-3 bg-card/50"
                  >
                    <div>
                      <p className="font-medium text-sm">{sig.signatario_nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {sig.signatario_email} • {sig.signatario_tipo}
                        {isEnvelope && sig._docCount > 1 && ` • ${sig._docCount} documentos`}
                      </p>
                      <div className="mt-1">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            sig.status === 'assinado'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {sig.status === 'assinado' ? 'Assinado' : 'Pendente'}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {sig.status !== 'assinado' && (
                        <>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => copyLink(sig)}
                            title="Copiar Link"
                          >
                            <LinkIcon className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => handleSendEmail(sig)}
                            disabled={sendingId === sig._ids[0]}
                            title="Enviar E-mail"
                          >
                            {sendingId === sig._ids[0] ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Mail className="w-4 h-4" />
                            )}
                          </Button>
                        </>
                      )}
                      <Button
                        size="icon"
                        variant="destructive"
                        onClick={() => handleDelete(sig)}
                        title="Remover"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {allSigned && envelope?.status !== 'concluido' && (
            <Button
              onClick={handleFinalizeEnvelope}
              disabled={finalizing}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold"
            >
              {finalizing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Finalizar Envelope e Gerar PDFs Assinados
            </Button>
          )}

          {envelope?.status === 'concluido' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
              <CheckCircle className="w-5 h-5 text-green-600 mx-auto mb-1" />
              <p className="text-sm font-medium text-green-700">
                Envelope finalizado. Os PDFs assinados estão sendo gerados.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={async () => {
                  try {
                    setFinalizing(true)
                    await reprocessEnvelopeDocuments(envelope.id)
                    toast.success('Reprocessamento iniciado!')
                  } catch (e: any) {
                    toast.error('Erro ao reprocessar: ' + e.message)
                  } finally {
                    setFinalizing(false)
                  }
                }}
                disabled={finalizing}
              >
                {finalizing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Reprocessar Documentos
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
