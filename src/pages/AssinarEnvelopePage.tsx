import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { FileText, CheckCircle, AlertCircle, ShieldCheck, PenTool, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { SignatureCanvas } from '@/components/area-clientes/signature-canvas'

export default function AssinarEnvelopePage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [envelope, setEnvelope] = useState<any>(null)
  const [docs, setDocs] = useState<any[]>([])
  const [assinaturas, setAssinaturas] = useState<any[]>([])
  const [assinantes, setAssinantes] = useState<any[]>([])
  const [assinante, setAssinante] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [code, setCode] = useState('')
  const [signatarioEmail, setSignatarioEmail] = useState('')
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

      const { data: envDocs } = await supabase
        .from('documentos_cliente')
        .select('*')
        .eq('envelope_id', id)
        .order('criado_em', { ascending: true })

      const { data: equipeDocs } = await supabase
        .from('documentos_equipe')
        .select('*')
        .eq('envelope_id', id)
        .order('criado_em', { ascending: true })

      const allDocs = [
        ...(envDocs || []).map((d) => ({ ...d, _source: 'cliente' })),
        ...(equipeDocs || []).map((d) => ({ ...d, _source: 'equipe' })),
      ]
      setDocs(allDocs)

      const docIds = allDocs.flatMap((d) => [d.arquivo_url, d.id].filter(Boolean))
      if (docIds.length > 0) {
        const { data: sigs } = await supabase
          .from('assinaturas')
          .select('*')
          .in('documento_id', docIds)
        setAssinaturas(sigs || [])
      }

      const { data: assinantesData } = await supabase
        .from('assinantes')
        .select('*')
        .eq('envelope_id', id)
      setAssinantes(assinantesData || [])

      if (token) {
        const { data: assinanteData } = await supabase
          .from('assinantes')
          .select('*')
          .eq('token_acesso', token)
          .eq('envelope_id', id)
          .single()

        if (assinanteData) {
          setAssinante(assinanteData)
          setSignatarioEmail(assinanteData.email || '')
          setFormData((prev) => ({
            ...prev,
            nome: assinanteData.nome_completo || '',
            cpf: assinanteData.cpf || '',
          }))
        }
      }

      setLoading(false)
    }
    load()
  }, [id, token])

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, '')
    if (v.length > 11) v = v.slice(0, 11)
    v = v.replace(/(\d{3})(\d)/, '$1.$2')
    v = v.replace(/(\d{3})(\d)/, '$1.$2')
    v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    setFormData({ ...formData, cpf: v })
  }

  const handleVisualizarDoc = async (doc: any) => {
    const filePath = doc.arquivo_url
    if (!filePath) {
      toast.error('Documento não disponível para visualização.')
      return
    }

    // Abre a aba imediatamente no clique (síncrono) para contornar bloqueadores de pop-up mobile
    const newWindow = window.open('about:blank', '_blank')

    try {
      let url: string | null = null

      if (filePath.startsWith('http')) {
        const match = filePath.match(
          /\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+?)(?:\?|$)/,
        )
        if (match) {
          const bucket = match[1]
          const path = decodeURIComponent(match[2])
          const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 3600)
          if (data?.signedUrl) url = data.signedUrl
        }
        if (!url) url = filePath
      } else {
        const bucket = doc._source === 'equipe' ? 'documentos_equipe' : 'bender_clientes'
        const { data } = await supabase.storage.from(bucket).createSignedUrl(filePath, 3600)
        if (data?.signedUrl) url = data.signedUrl
        if (!url) {
          const { data: pubData } = supabase.storage.from(bucket).getPublicUrl(filePath)
          if (pubData?.publicUrl) url = pubData.publicUrl
        }
      }

      if (url) {
        if (newWindow) {
          newWindow.location.href = url
        } else {
          window.location.href = url
        }
      } else {
        if (newWindow) newWindow.close()
        toast.error('Não foi possível gerar o link de visualização.')
      }
    } catch (e: any) {
      if (newWindow) newWindow.close()
      toast.error('Erro ao visualizar documento: ' + e.message)
    }
  }

  const handleVerifyCode = () => {
    if (assinante && assinante.codigo_verificacao === code) {
      setVerified(true)
      toast.success('Código verificado!')
      return
    }

    const sig = assinaturas.find(
      (a) =>
        a.signatario_email?.toLowerCase() === signatarioEmail.trim().toLowerCase() &&
        a.codigo_confirmacao === code,
    )
    if (sig) {
      setVerified(true)
      setFormData((prev) => ({ ...prev, nome: sig.signatario_nome || prev.nome }))
      toast.success('Código verificado!')
    } else {
      toast.error('E-mail ou código incorreto.')
    }
  }

  const myAssinaturas = verified
    ? assinaturas.filter(
        (s) => s.signatario_email?.toLowerCase() === signatarioEmail.trim().toLowerCase(),
      )
    : []

  const handleSignDoc = async (doc: any) => {
    const sig = assinaturas.find(
      (a) =>
        (a.documento_id === doc.arquivo_url || a.documento_id === doc.id) &&
        a.signatario_email?.toLowerCase() === signatarioEmail.trim().toLowerCase(),
    )
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

      if (assinante) {
        await supabase
          .from('assinantes')
          .update({
            status: 'assinado',
            assinado_em: new Date().toISOString(),
            assinatura_base64: formData.assinaturaBase64,
          })
          .eq('id', assinante.id)
      }

      const allDocIds = docs.flatMap((d) => [d.arquivo_url, d.id].filter(Boolean))
      const { data: updatedSigs } = await supabase
        .from('assinaturas')
        .select('*')
        .in('documento_id', allDocIds)
      setAssinaturas(updatedSigs || [])

      const { data: updatedAssinantes } = await supabase
        .from('assinantes')
        .select('*')
        .eq('envelope_id', id)
      setAssinantes(updatedAssinantes || [])

      const { data: updatedClienteDocs } = await supabase
        .from('documentos_cliente')
        .select('*')
        .eq('envelope_id', id)
        .order('criado_em', { ascending: true })

      const { data: updatedEquipeDocs } = await supabase
        .from('documentos_equipe')
        .select('*')
        .eq('envelope_id', id)
        .order('criado_em', { ascending: true })

      const updatedDocs = [
        ...(updatedClienteDocs || []).map((d) => ({ ...d, _source: 'cliente' })),
        ...(updatedEquipeDocs || []).map((d) => ({ ...d, _source: 'equipe' })),
      ]
      setDocs(updatedDocs)

      const myUpdatedSigs = (updatedSigs || []).filter(
        (s) => s.signatario_email?.toLowerCase() === signatarioEmail.trim().toLowerCase(),
      )
      const myAllSigned =
        myUpdatedSigs.length > 0 && myUpdatedSigs.every((s) => s.status === 'assinado')
      const allAssinantesSigned =
        (updatedAssinantes || []).length > 0 &&
        (updatedAssinantes || []).every((a) => a.status === 'assinado')
      const allAssinaturasSigned =
        (updatedSigs || []).length > 0 && (updatedSigs || []).every((s) => s.status === 'assinado')

      if (allAssinantesSigned && allAssinaturasSigned) {
        await supabase
          .from('envelopes_assinatura')
          .update({ status: 'concluido', concluido_em: new Date().toISOString() })
          .eq('id', id)
        setEnvelope({ ...envelope, status: 'concluido', concluido_em: new Date().toISOString() })

        // Invoca a finalização do envelope para estampar e enviar os e-mails com os PDFs finais
        supabase.functions.invoke('finalize-signature-document', {
          body: { envelope_id: id },
        })

        toast.success('Todos os documentos foram assinados! Processo concluído e e-mails enviados.')
      } else if (myAllSigned) {
        toast.success('Você assinou todos os seus documentos! Aguardando demais signatários.')
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
  const allSigned =
    assinantes.length > 0
      ? assinantes.every((a) => a.status === 'assinado') &&
        (assinaturas.length === 0 || assinaturas.every((s) => s.status === 'assinado'))
      : assinaturas.length > 0 && assinaturas.every((s) => s.status === 'assinado')
  const myAllSigned =
    myAssinaturas.length > 0 && myAssinaturas.every((s) => s.status === 'assinado')
  const isFormValid =
    formData.nome.trim() !== '' &&
    formData.cpf.length === 14 &&
    formData.dataNascimento !== '' &&
    formData.assinaturaBase64 !== ''

  const activeDoc =
    docs.find((doc) => {
      const sig = assinaturas.find(
        (a) =>
          (a.documento_id === doc.arquivo_url || a.documento_id === doc.id) &&
          a.signatario_email?.toLowerCase() === signatarioEmail.trim().toLowerCase(),
      )
      if (!sig) return false
      return sig.status !== 'assinado' && doc.status !== 'Assinado'
    }) || null

  const signerName =
    assinante?.nome_completo ||
    (verified ? myAssinaturas[0]?.signatario_nome : null) ||
    envelope.signatario_nome ||
    'Signatário'
  const signerCpf =
    assinante?.cpf || (verified ? myAssinaturas[0]?.signatario_cpf : null) || formData.cpf
  const signerRole =
    assinante?.papel || (verified ? myAssinaturas[0]?.signatario_tipo : null) || '—'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 py-12 bg-muted/20">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <ShieldCheck className="w-12 h-12 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground">Assinatura de Documentos</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {docs.length} documento(s) para assinar
          </p>
          {assinantes.length > 0 && (
            <p className="text-muted-foreground text-sm mt-1">
              Progresso: {assinantes.filter((a) => a.status === 'assinado').length} de{' '}
              {assinantes.length} signatário(s) assinaram
            </p>
          )}
        </div>

        <Card className="shadow-lg border-border mb-6">
          <CardHeader className="border-b bg-muted/10 pb-4">
            <CardTitle className="text-lg">Olá, {signerName}</CardTitle>
            <CardDescription>
              {isConcluido
                ? 'Todos os documentos foram assinados com sucesso.'
                : 'Verifique e assine cada documento abaixo.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {docs.map((doc, idx) => {
              const sig = assinaturas.find(
                (a) =>
                  (a.documento_id === doc.arquivo_url || a.documento_id === doc.id) &&
                  (!verified ||
                    a.signatario_email?.toLowerCase() === signatarioEmail.trim().toLowerCase()),
              )
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleVisualizarDoc(doc)}
                    className="shrink-0"
                  >
                    <Eye className="w-4 h-4 mr-1" /> Visualizar
                  </Button>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {(verified || assinante) && !isConcluido && !allSigned && (
          <Card className="shadow-lg border-border mb-6">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Nome: </span>
                  <span className="font-semibold">{signerName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">CPF: </span>
                  <span className="font-semibold">{signerCpf || '—'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Papel: </span>
                  <span className="font-semibold">{signerRole}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
                {assinante
                  ? `Digite o código de 4 dígitos enviado para ${signatarioEmail}`
                  : 'Digite seu e-mail e o código de 4 dígitos recebido'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!assinante && (
                <div className="space-y-2">
                  <Label>E-mail do Signatário</Label>
                  <Input
                    type="email"
                    value={signatarioEmail}
                    onChange={(e) => setSignatarioEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                  />
                </div>
              )}
              <div className="flex justify-center">
                <InputOTP maxLength={4} value={code} onChange={setCode} className="signature-otp">
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button
                className="w-full"
                onClick={handleVerifyCode}
                disabled={code.length !== 4 || (!assinante && !signatarioEmail.trim())}
              >
                Verificar Código
              </Button>
            </CardContent>
          </Card>
        ) : myAllSigned ? (
          <Card className="shadow-lg border-amber-500/30">
            <CardContent className="p-8 text-center">
              <CheckCircle className="w-12 h-12 text-amber-600 mx-auto mb-3" />
              <p className="font-bold text-lg">Assinaturas Concluídas!</p>
              <p className="text-sm text-muted-foreground mt-1">
                Você assinou todos os seus documentos. Aguardando a conclusão pelos demais
                signatários.
              </p>
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

              {activeDoc && (
                <div className="pt-4 border-t">
                  <Button
                    className="w-full"
                    onClick={() => handleSignDoc(activeDoc)}
                    disabled={!isFormValid || submitting}
                  >
                    <PenTool className="w-4 h-4 mr-1" /> Assinar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
