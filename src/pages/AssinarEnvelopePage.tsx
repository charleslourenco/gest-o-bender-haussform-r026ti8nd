import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { FileText, CheckCircle, AlertCircle, ShieldCheck, PenTool } from 'lucide-react'
import { toast } from 'sonner'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { SignatureCanvas } from '@/components/area-clientes/signature-canvas'

export default function AssinarEnvelopePage() {
  const { id } = useParams()
  const [envelope, setEnvelope] = useState<any>(null)
  const [docs, setDocs] = useState<any[]>([])
  const [assinaturas, setAssinaturas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [code, setCode] = useState('')
  const [verified, setVerified] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    dataNascimento: '',
    assinaturaBase64: '',
  })

  useEffect(() => {
    const load = async () => {
      if (!id) return
      const { data: env, error: err } = await supabase
        .from('envelopes_assinatura')
        .select('*')
        .eq('id', id)
        .single()

      if (err || !env) {
        setError('Envelope inválido ou não encontrado.')
        setLoading(false)
        return
      }

      setEnvelope(env)
      setFormData((prev) => ({ ...prev, nome: env.signatario_nome || '' }))

      const { data: envDocs } = await supabase
        .from('documentos_cliente')
        .select('*')
        .eq('envelope_id', id)
        .order('criado_em', { ascending: true })

      setDocs(envDocs || [])

      const docIds = (envDocs || []).map((d) => d.arquivo_url).filter(Boolean)
      if (docIds.length > 0) {
        const { data: sigs } = await supabase
          .from('assinaturas')
          .select('*')
          .in('documento_id', docIds)
          .eq('signatario_email', env.signatario_email || '')
        setAssinaturas(sigs || [])
      }
      setLoading(false)
    }
    load()
  }, [id])

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, '')
    if (v.length > 11) v = v.slice(0, 11)
    v = v.replace(/(\d{3})(\d)/, '$1.$2')
    v = v.replace(/(\d{3})(\d)/, '$1.$2')
    v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    setFormData({ ...formData, cpf: v })
  }

  const handleVerifyCode = () => {
    if (code === envelope?.codigo_verificacao) {
      setVerified(true)
      toast.success('Código verificado!')
    } else {
      toast.error('Código incorreto.')
    }
  }

  const handleSignDoc = async (doc: any) => {
    const sig = assinaturas.find((a) => a.documento_id === doc.arquivo_url)
    if (!sig) {
      toast.error('Registro de assinatura não encontrado para este documento.')
      return
    }
    if (
      !formData.cpf ||
      formData.cpf.length < 14 ||
      !formData.dataNascimento ||
      !formData.assinaturaBase64
    ) {
      toast.error('Preencha CPF, data de nascimento e desenhe sua assinatura.')
      return
    }

    setSubmitting(true)
    try {
      let ip = '0.0.0.0'
      try {
        const res = await fetch('https://api.ipify.org?format=json')
        const data = await res.json()
        ip = data.ip
      } catch {
        /* noop */
      }

      const { error: updateError } = await supabase
        .from('assinaturas')
        .update({
          status: 'assinado',
          data_assinatura: new Date().toISOString(),
          ip_assinatura: ip,
          signatario_nome: formData.nome,
          signatario_cpf: formData.cpf,
          signatario_data_nascimento: formData.dataNascimento,
          assinatura_imagem: formData.assinaturaBase64,
        })
        .eq('id', sig.id)

      if (updateError) throw updateError

      const { data: updatedSigs } = await supabase
        .from('assinaturas')
        .select('*')
        .in('documento_id', docs.map((d) => d.arquivo_url).filter(Boolean))
        .eq('signatario_email', envelope.signatario_email || '')
      setAssinaturas(updatedSigs || [])

      const { data: updatedDocs } = await supabase
        .from('documentos_cliente')
        .select('*')
        .eq('envelope_id', id)
        .order('criado_em', { ascending: true })
      setDocs(updatedDocs || [])

      const allSigned =
        updatedSigs && updatedSigs.length > 0 && updatedSigs.every((s) => s.status === 'assinado')
      if (allSigned) {
        await supabase
          .from('envelopes_assinatura')
          .update({ status: 'concluido', concluido_em: new Date().toISOString() })
          .eq('id', id)
        setEnvelope({ ...envelope, status: 'concluido', concluido_em: new Date().toISOString() })
        toast.success('Todos os documentos foram assinados! Processo concluído.')
      } else {
        toast.success('Documento assinado! Continue com o próximo.')
      }
    } catch (e: any) {
      toast.error('Erro ao assinar: ' + e.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20">Carregando...</div>
    )
  }

  if (error || !envelope) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-muted/20">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <h1 className="text-xl font-bold text-foreground">Envelope Indisponível</h1>
        <p className="text-muted-foreground mt-2">{error}</p>
      </div>
    )
  }

  const isConcluido = envelope.status === 'concluido'
  const allSigned = assinaturas.length > 0 && assinaturas.every((s) => s.status === 'assinado')
  const isFormValid =
    formData.nome.trim() !== '' &&
    formData.cpf.length === 14 &&
    formData.dataNascimento !== '' &&
    formData.assinaturaBase64 !== ''

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 py-12 bg-muted/20">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <ShieldCheck className="w-12 h-12 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground">Assinatura de Documentos</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {docs.length} documento(s) para assinar
          </p>
        </div>

        <Card className="shadow-lg border-border mb-6">
          <CardHeader className="border-b bg-muted/10 pb-4">
            <CardTitle className="text-lg">Olá, {envelope.signatario_nome}</CardTitle>
            <CardDescription>
              {isConcluido
                ? 'Todos os documentos foram assinados com sucesso.'
                : 'Verifique e assine cada documento abaixo.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {docs.map((doc, idx) => {
              const sig = assinaturas.find((a) => a.documento_id === doc.arquivo_url)
              const signed = sig?.status === 'assinado' || doc.status === 'Assinado'
              return (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-background gap-4"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    {signed ? (
                      <CheckCircle className="w-6 h-6 text-green-600 shrink-0" />
                    ) : (
                      <FileText className="w-6 h-6 text-primary shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">
                        {idx + 1}. {doc.template_nome || doc.tipo}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {signed ? 'Assinado' : 'Pendente'}
                        {sig?.data_assinatura &&
                          ` em ${new Date(sig.data_assinatura).toLocaleString('pt-BR')}`}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {isConcluido || allSigned ? (
          <Card className="shadow-lg border-green-500/30">
            <CardContent className="p-8 text-center">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <p className="font-bold text-lg">Processo Concluído!</p>
              <p className="text-sm text-muted-foreground mt-1">
                Todos os documentos do envelope foram assinados com sucesso.
              </p>
            </CardContent>
          </Card>
        ) : !verified ? (
          <Card className="shadow-lg border-border">
            <CardHeader>
              <CardTitle className="text-base">Verificação</CardTitle>
              <CardDescription>
                Digite o código de 4 dígitos enviado para {envelope.signatario_email}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center">
                <InputOTP maxLength={4} value={code} onChange={setCode}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button className="w-full" onClick={handleVerifyCode} disabled={code.length !== 4}>
                Verificar Código
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-lg border-border">
            <CardHeader>
              <CardTitle className="text-base">Seus Dados e Assinatura</CardTitle>
              <CardDescription>Preencha uma vez. Use o botão em cada documento.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label>Nome Completo</Label>
                  <Input
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>CPF</Label>
                    <Input
                      value={formData.cpf}
                      onChange={handleCpfChange}
                      placeholder="000.000.000-00"
                      maxLength={14}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Data de Nascimento</Label>
                    <Input
                      type="date"
                      value={formData.dataNascimento}
                      onChange={(e) => setFormData({ ...formData, dataNascimento: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Assinatura</Label>
                <SignatureCanvas
                  onDraw={(base64) => setFormData({ ...formData, assinaturaBase64: base64 })}
                />
              </div>

              <div className="space-y-2 pt-4 border-t">
                <Label className="text-sm">Assinar Documentos</Label>
                {docs.map((doc, idx) => {
                  const sig = assinaturas.find((a) => a.documento_id === doc.arquivo_url)
                  const signed = sig?.status === 'assinado' || doc.status === 'Assinado'
                  return (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between gap-2 p-2 border rounded"
                    >
                      <span className="text-sm font-medium truncate">
                        {idx + 1}. {doc.template_nome || doc.tipo}
                      </span>
                      {signed ? (
                        <span className="text-xs text-green-600 font-semibold flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" /> Assinado
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleSignDoc(doc)}
                          disabled={!isFormValid || submitting}
                        >
                          <PenTool className="w-4 h-4 mr-1" /> Assinar
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
