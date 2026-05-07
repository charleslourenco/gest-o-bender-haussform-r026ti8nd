import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, CheckCircle, AlertCircle, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { SignatureCanvas } from '@/components/area-clientes/signature-canvas'

export default function AssinaturaPage() {
  const { id } = useParams()
  const [assinatura, setAssinatura] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [code, setCode] = useState('')
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    dataNascimento: '',
    assinaturaBase64: '',
  })

  useEffect(() => {
    const load = async () => {
      if (!id) return
      const { data, error: err } = await supabase
        .from('assinaturas')
        .select('*')
        .eq('id', id)
        .single()

      if (err || !data) {
        setError('Link de assinatura inválido ou não encontrado.')
      } else {
        setAssinatura(data)
        setFormData((prev) => ({ ...prev, nome: data.signatario_nome }))
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

  const handleOpenDocument = async () => {
    if (!assinatura?.documento_id) return

    if (assinatura.documento_id.startsWith('http')) {
      window.open(assinatura.documento_id, '_blank')
      return
    }

    const { data, error } = await supabase.storage
      .from('dossiers')
      .createSignedUrl(assinatura.documento_id, 3600)

    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank')
    } else {
      const pub = supabase.storage.from('dossiers').getPublicUrl(assinatura.documento_id)
      if (pub.data?.publicUrl) {
        window.open(pub.data.publicUrl, '_blank')
      } else {
        toast.error('Não foi possível abrir o documento.')
      }
    }
  }

  const handleSign = async () => {
    if (code !== assinatura.codigo_confirmacao) {
      toast.error('Código incorreto. Verifique o e-mail recebido.')
      return
    }

    setSubmitting(true)
    try {
      let ip = '0.0.0.0'
      try {
        const res = await fetch('https://api.ipify.org?format=json')
        const data = await res.json()
        ip = data.ip
      } catch (e) {
        console.warn('Could not fetch IP')
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
        .eq('id', assinatura.id)

      if (updateError) throw updateError

      await supabase.from('timeline_eventos').insert({
        cliente_id: assinatura.cliente_id,
        usuario_nome: formData.nome,
        acao: `Assinatura Realizada no documento ${assinatura.documento_nome} (Papel: ${assinatura.signatario_tipo})`,
      })

      // Update document status if all signatures are done
      const { data: allSigs } = await supabase
        .from('assinaturas')
        .select('status')
        .eq('documento_id', assinatura.documento_id)

      if (allSigs && allSigs.every((s) => s.status === 'assinado')) {
        await supabase
          .from('documentos_cliente')
          .update({ status: 'Assinado' })
          .eq('arquivo_url', assinatura.documento_id)
      }

      toast.success('Documento assinado com sucesso!')
      setAssinatura({
        ...assinatura,
        status: 'assinado',
        data_assinatura: new Date().toISOString(),
      })
    } catch (e: any) {
      toast.error('Erro ao assinar documento: ' + e.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20">Carregando...</div>
    )
  }

  if (error || !assinatura) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-muted/20">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <h1 className="text-xl font-bold text-foreground">Documento Indisponível</h1>
        <p className="text-muted-foreground mt-2">{error}</p>
      </div>
    )
  }

  const isAssinado = assinatura.status === 'assinado'
  const isFormValid =
    code.length === 4 &&
    formData.nome.trim() !== '' &&
    formData.cpf.length === 14 &&
    formData.dataNascimento !== '' &&
    formData.assinaturaBase64 !== ''

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 py-12 bg-muted/20">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <ShieldCheck className="w-12 h-12 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground">
            Portal de Assinatura Bender Haussform
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Assinatura eletrônica com validade legal.
          </p>
        </div>

        <Card className="shadow-lg border-border">
          <CardHeader className="border-b bg-muted/10 pb-4">
            <CardTitle className="text-lg">Olá, {assinatura.signatario_nome}</CardTitle>
            <CardDescription>
              Você foi solicitado a assinar o documento abaixo como{' '}
              <strong>{assinatura.signatario_tipo}</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="bg-background border rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 overflow-hidden">
                <FileText className="w-8 h-8 text-blue-500 shrink-0" />
                <div className="truncate">
                  <p className="text-sm font-semibold truncate" title={assinatura.documento_nome}>
                    {assinatura.documento_nome}
                  </p>
                  <p className="text-xs text-muted-foreground">Revisar Documento</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenDocument}
                className="w-full sm:w-auto"
              >
                Visualizar
              </Button>
            </div>

            {isAssinado ? (
              <div className="bg-green-500/10 text-green-700 p-6 rounded-lg flex flex-col items-center text-center space-y-2 border border-green-500/20">
                <CheckCircle className="w-10 h-10" />
                <div>
                  <p className="font-bold text-lg">Documento Assinado!</p>
                  <p className="text-sm opacity-90 mt-1">
                    Sua assinatura foi registrada com sucesso.
                  </p>
                  <p className="text-xs mt-3 opacity-75">
                    Data: {new Date(assinatura.data_assinatura).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label>Nome Completo</Label>
                    <Input
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      placeholder="Seu nome completo"
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
                        onChange={(e) =>
                          setFormData({ ...formData, dataNascimento: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Assinatura (Rabisco)</Label>
                  <SignatureCanvas
                    onDraw={(base64) => setFormData({ ...formData, assinaturaBase64: base64 })}
                  />
                </div>

                <div className="space-y-3 pt-4 border-t">
                  <div className="text-center space-y-1">
                    <Label className="text-sm">Código de Verificação (E-mail)</Label>
                    <p className="text-xs text-muted-foreground">
                      Digite os 4 dígitos enviados para {assinatura.signatario_email}
                    </p>
                  </div>
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
                </div>

                <Button
                  className="w-full h-12 text-lg mt-4"
                  onClick={handleSign}
                  disabled={!isFormValid || submitting}
                >
                  {submitting ? 'Validando...' : 'Confirmar Assinatura'}
                </Button>
                <p className="text-xs text-center text-muted-foreground leading-relaxed">
                  Ao confirmar, você concorda que esta assinatura eletrônica tem validade legal e
                  reconhece o conteúdo do documento visualizado acima.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
