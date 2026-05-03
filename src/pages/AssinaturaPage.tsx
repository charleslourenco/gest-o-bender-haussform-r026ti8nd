import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, CheckCircle, AlertCircle, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'

export default function AssinaturaPage() {
  const { id } = useParams()
  const [assinatura, setAssinatura] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)

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
      }
      setLoading(false)
    }
    load()
  }, [id])

  const handleOpenDocument = async () => {
    if (!assinatura?.documento_id) return
    const { data } = supabase.storage.from('dossiers').getPublicUrl(assinatura.documento_id)
    if (data?.publicUrl) {
      window.open(data.publicUrl, '_blank')
    } else {
      toast.error('Não foi possível abrir o documento.')
    }
  }

  const handleSign = async () => {
    if (code.length !== 6) {
      toast.error('Digite o código de 6 dígitos.')
      return
    }

    if (code !== assinatura.codigo_confirmacao) {
      toast.error('Código incorreto. Verifique o código recebido e tente novamente.')
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
        })
        .eq('id', assinatura.id)

      if (updateError) throw updateError

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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-muted/20">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <ShieldCheck className="w-12 h-12 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground">Portal de Assinaturas</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Assinatura eletrônica segura e validada.
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
            <div className="bg-background border rounded-lg p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 overflow-hidden">
                <FileText className="w-8 h-8 text-blue-500 shrink-0" />
                <div className="truncate">
                  <p className="text-sm font-semibold truncate" title={assinatura.documento_nome}>
                    {assinatura.documento_nome}
                  </p>
                  <p className="text-xs text-muted-foreground">Documento PDF/DOCX</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleOpenDocument}>
                Visualizar
              </Button>
            </div>

            {isAssinado ? (
              <div className="bg-green-500/10 text-green-700 p-4 rounded-lg flex flex-col items-center text-center space-y-2 border border-green-500/20">
                <CheckCircle className="w-8 h-8" />
                <div>
                  <p className="font-bold">Documento Assinado!</p>
                  <p className="text-sm opacity-90">Sua assinatura foi registrada com sucesso.</p>
                  <p className="text-xs mt-2 opacity-75">
                    Data: {new Date(assinatura.data_assinatura).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2 text-center">
                  <label className="text-sm font-medium">Digite seu código de segurança</label>
                  <p className="text-xs text-muted-foreground">
                    O código de 6 dígitos que você recebeu junto com o link.
                  </p>
                  <div className="flex justify-center pt-2">
                    <InputOTP maxLength={6} value={code} onChange={setCode}>
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </div>

                <Button
                  className="w-full h-12 text-lg"
                  onClick={handleSign}
                  disabled={code.length !== 6 || submitting}
                >
                  {submitting ? 'Validando...' : 'Confirmar Assinatura'}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Ao confirmar, você concorda que esta assinatura eletrônica tem validade legal.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
