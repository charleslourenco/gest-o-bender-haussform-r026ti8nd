import { useState, useEffect } from 'react'
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
import { Loader2, Trash2, Mail, Link as LinkIcon, Plus, CheckCircle } from 'lucide-react'

interface EquipeSignatureModalProps {
  doc: any
  entityId: string
  entityType: 'clt' | 'pj'
  entityNome?: string
  entityEmail?: string
  entityCpf?: string
  onClose: () => void
}

const ROLES = ['Colaborador', 'Representante', 'Testemunha']

export function EquipeSignatureModal({
  doc,
  entityId,
  entityType,
  entityNome,
  entityEmail,
  entityCpf,
  onClose,
}: EquipeSignatureModalProps) {
  const entityField = entityType === 'clt' ? 'clt_id' : 'pj_id'
  const docId = doc.id

  const [signatures, setSignatures] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [envelope, setEnvelope] = useState<any>(null)
  const [assinantesList, setAssinantesList] = useState<any[]>([])
  const [form, setForm] = useState({
    nome: entityNome || '',
    email: entityEmail || '',
    cpf: entityCpf || '',
    tipo: entityType === 'clt' ? 'Colaborador' : 'Representante',
    telefone: '',
  })
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [finalizing, setFinalizing] = useState(false)

  const loadSignatures = async () => {
    try {
      const { data: env } = await supabase
        .from('envelopes_assinatura')
        .select('*')
        .eq('documento_id', docId)
        .eq(entityField, entityId)
        .order('criado_em', { ascending: false })
        .limit(1)
        .maybeSingle()

      setEnvelope(env || null)

      if (env) {
        const { data: assinantesData } = await supabase
          .from('assinantes')
          .select('*')
          .eq('envelope_id', env.id)
        setAssinantesList(assinantesData || [])
      } else {
        setAssinantesList([])
      }

      const { data: sigs } = await supabase
        .from('assinaturas')
        .select('*')
        .eq('documento_id', docId)
        .eq(entityField, entityId)
        .order('criado_em', { ascending: true })
      setSignatures(sigs || [])
    } catch (e: any) {
      toast.error('Erro ao carregar assinaturas: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSignatures()
  }, [])

  const allSigned = signatures.length > 0 && signatures.every((s) => s.status === 'assinado')

  const handleFinalizeEnvelope = async () => {
    if (!envelope) return
    setFinalizing(true)
    try {
      const { data, error } = await supabase.functions.invoke('finalize-signature-document', {
        body: { documento_id: docId, manual: true },
      })
      if (error) throw new Error(error.message || 'Falha ao gerar PDF')
      if (data && !data.success && !data.idempotent) {
        throw new Error(data.error || 'Erro no processamento')
      }

      const { error: envError } = await supabase
        .from('envelopes_assinatura')
        .update({ status: 'concluido', concluido_em: new Date().toISOString() })
        .eq('id', envelope.id)
      if (envError) throw envError

      toast.success('Envelope finalizado! PDF assinado gerado com sucesso.')
      setEnvelope({ ...envelope, status: 'concluido' })
      loadSignatures()
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

      let envId = envelope?.id

      if (!envId) {
        const envInsert: any = {
          documento_id: docId,
          nome_documento: doc.nome || 'Documento',
          status: 'aguardando',
          signatario_nome: form.nome,
          signatario_email: form.email,
          codigo_verificacao: code,
        }
        envInsert[entityField] = entityId

        const { data: newEnv, error: envError } = await supabase
          .from('envelopes_assinatura')
          .insert(envInsert)
          .select()
          .single()
        if (envError) throw envError
        envId = newEnv.id
        setEnvelope(newEnv)

        await supabase.from('documentos_equipe').update({ envelope_id: envId }).eq('id', docId)
      }

      const sigInsert: any = {
        documento_id: docId,
        documento_nome: doc.nome || 'Documento',
        signatario_nome: form.nome,
        signatario_email: form.email,
        signatario_telefone: form.telefone || null,
        signatario_tipo: form.tipo,
        signatario_cpf: form.cpf || null,
        codigo_confirmacao: code,
        expira_em: expiraEm.toISOString(),
        status: 'pendente',
      }
      sigInsert[entityField] = entityId

      const { error: sigError } = await supabase.from('assinaturas').insert(sigInsert)
      if (sigError) throw sigError

      const tokenAcesso = crypto.randomUUID()
      const assinanteInsert: any = {
        envelope_id: envId,
        nome_completo: form.nome,
        email: form.email,
        cpf: form.cpf || null,
        papel: form.tipo,
        tipo_assinatura: 'link',
        status: 'pendente',
        codigo_verificacao: code,
        codigo_expira_em: expiraEm.toISOString(),
        token_acesso: tokenAcesso,
      }
      await supabase.from('assinantes').insert(assinanteInsert)

      toast.success('Signatário adicionado com sucesso!')
      setForm({ nome: '', email: '', cpf: '', tipo: ROLES[0], telefone: '' })
      loadSignatures()
    } catch (e: any) {
      toast.error('Erro ao adicionar: ' + e.message)
    }
  }

  const handleDelete = async (sig: any) => {
    if (!confirm('Remover este signatário?')) return
    try {
      const { error } = await supabase.from('assinaturas').delete().eq('id', sig.id)
      if (error) throw error
      toast.success('Removido')
      loadSignatures()
    } catch (e: any) {
      toast.error('Erro ao remover: ' + e.message)
    }
  }

  const handleSendEmail = async (sig: any) => {
    setSendingId(sig.id)
    try {
      const link = `${window.location.origin}/assinatura/${sig.id}`
      const body = {
        to: sig.signatario_email,
        nome: sig.signatario_nome,
        link,
        codigo: sig.codigo_confirmacao,
        documento_nome: sig.documento_nome,
      }

      const { data, error } = await supabase.functions.invoke('send-signature-email', { body })
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
    const link = `${window.location.origin}/assinatura/${sig.id}`
    navigator.clipboard.writeText(link)
    toast.success('Link copiado!')
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Assinaturas — {doc.nome}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
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
                  {ROLES.map((r) => (
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
            <h4 className="font-semibold text-sm mb-3">Signatários do Documento</h4>
            {loading ? (
              <div className="flex justify-center p-4">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : signatures.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center p-4">
                Nenhum signatário adicionado ainda.
              </p>
            ) : (
              <div className="space-y-3">
                {signatures.map((sig) => (
                  <div
                    key={sig.id}
                    className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 border rounded-md gap-3 bg-card/50"
                  >
                    <div>
                      <p className="font-medium text-sm">{sig.signatario_nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {sig.signatario_email} • {sig.signatario_tipo}
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
                            disabled={sendingId === sig.id}
                            title="Enviar E-mail"
                          >
                            {sendingId === sig.id ? (
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
              Finalizar e Gerar PDF Assinado
            </Button>
          )}

          {envelope?.status === 'concluido' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
              <CheckCircle className="w-5 h-5 text-green-600 mx-auto mb-1" />
              <p className="text-sm font-medium text-green-700">
                Envelope finalizado. O PDF assinado está disponível para download na lista de
                documentos.
              </p>
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
