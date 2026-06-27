import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SignatureCanvas } from '@/components/area-clientes/signature-canvas'
import { CheckCircle, Package, Loader2, Download, AlertCircle, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { maskCpf, isValidCpf, sanitizeCpf } from '@/lib/cpf'

interface CaixaItem {
  id: string
  quantidade: number
  status: string
  item: { nome: string; unidade: string } | null
}

export default function RecebimentoCaixa() {
  const { id } = useParams()
  const [caixa, setCaixa] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [signature, setSignature] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [pdfUrl, setPdfUrl] = useState('')
  const [nome, setNome] = useState('')
  const [cpf, setCpf] = useState('')

  useEffect(() => {
    const load = async () => {
      if (!id) {
        setError('Link inválido.')
        setLoading(false)
        return
      }
      const { data, error: err } = await supabase
        .from('estoque_caixas')
        .select('*, itens:estoque_caixas_itens(*, item:estoque_itens(nome, unidade))')
        .eq('id', id)
        .single()

      if (err || !data) {
        setError('Caixa não encontrada ou link inválido.')
      } else {
        setCaixa(data)
        if (data.recebedor_nome) setNome(data.recebedor_nome)
        if (data.recebedor_cpf) setCpf(data.recebedor_cpf)
        if (data.comprovante_url) {
          const { data: urlData } = supabase.storage
            .from('comprovantes-caixas')
            .getPublicUrl(data.comprovante_url)
          if (urlData?.publicUrl) {
            setPdfUrl(urlData.publicUrl)
            setSuccess(true)
          }
        }
      }
      setLoading(false)
    }
    load()
  }, [id])

  const cpfValid = cpf.length === 0 ? false : isValidCpf(cpf)
  const nomeValid = nome.trim().length >= 3
  const canSubmit = !!signature && nomeValid && cpfValid && !submitting

  const handleSubmit = async () => {
    if (!nomeValid) {
      toast.error('Informe o nome completo do recebedor.')
      return
    }
    if (!cpfValid) {
      toast.error('Informe um CPF válido.')
      return
    }
    if (!signature) {
      toast.error('Por favor, desenhe sua assinatura no quadro.')
      return
    }
    setSubmitting(true)
    try {
      const { data, error: fnError } = await supabase.functions.invoke('gerar-comprovante-caixa', {
        body: {
          caixa_id: id,
          signature_base64: signature,
          recebedor_nome: nome.trim(),
          recebedor_cpf: sanitizeCpf(cpf),
        },
      })
      if (fnError) throw fnError
      if (data?.error) throw new Error(data.error)
      setPdfUrl(data.url)
      setSuccess(true)
      toast.success('Comprovante gerado com sucesso!')
    } catch (e: any) {
      toast.error('Erro ao gerar comprovante: ' + e.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error || !caixa) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h1 className="text-xl font-bold text-slate-800">Comprovante Indisponível</h1>
        <p className="text-slate-500 mt-2 text-center">{error}</p>
      </div>
    )
  }

  const itens: CaixaItem[] = caixa.itens || []

  return (
    <div className="min-h-screen bg-slate-50 py-6 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-600 mb-3">
            <Package className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Comprovante de Recebimento</h1>
          <p className="text-slate-500 text-sm mt-1">Bender Haussform</p>
        </div>

        <Card className="shadow-lg border-slate-200">
          <CardHeader className="border-b bg-slate-50/50">
            <div className="flex justify-between items-start gap-3">
              <div>
                <CardTitle className="text-lg text-slate-800">{caixa.nome}</CardTitle>
                <p className="text-sm text-slate-500 mt-1">
                  Status:{' '}
                  <Badge
                    variant={caixa.status === 'entregue' ? 'outline' : 'secondary'}
                    className={
                      caixa.status === 'entregue'
                        ? 'text-emerald-600 border-emerald-200 bg-emerald-50'
                        : 'bg-blue-100 text-blue-700'
                    }
                  >
                    {caixa.status?.toUpperCase()}
                  </Badge>
                </p>
              </div>
              {caixa.assinado_em && (
                <span className="text-xs text-slate-400">
                  Assinado em: {new Date(caixa.assinado_em).toLocaleString('pt-BR')}
                </span>
              )}
            </div>
          </CardHeader>

          <CardContent className="pt-6 space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Itens da Caixa</h3>
              {itens.length === 0 ? (
                <p className="text-sm text-slate-400 italic">Nenhum item nesta caixa.</p>
              ) : (
                <ul className="space-y-2">
                  {itens.map((item) => (
                    <li
                      key={item.id}
                      className="flex justify-between items-center p-3 rounded-lg bg-white border border-slate-200"
                    >
                      <span className="text-sm font-medium text-slate-700 truncate pr-2">
                        {item.item?.nome || 'Item removido'}
                      </span>
                      <Badge variant="outline" className="font-mono shrink-0">
                        {item.quantidade} {item.item?.unidade || 'un'}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {success ? (
              <div className="space-y-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6 flex flex-col items-center text-center space-y-2">
                  <CheckCircle className="w-12 h-12 text-emerald-500" />
                  <p className="font-bold text-lg text-emerald-700">Recebimento Confirmado!</p>
                  <p className="text-sm text-emerald-600">
                    Sua assinatura foi registrada e o comprovante em PDF foi gerado.
                  </p>
                  <p className="text-sm text-emerald-700 font-medium">
                    Recebido por: {caixa.recebedor_nome || nome} -{' '}
                    {caixa.recebedor_cpf ? maskCpf(caixa.recebedor_cpf) : cpf}
                  </p>
                </div>
                {pdfUrl && (
                  <a href={pdfUrl} download target="_blank" rel="noopener noreferrer">
                    <Button className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700">
                      <Download className="w-5 h-5 mr-2" /> Baixar Comprovante (PDF)
                    </Button>
                  </a>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-700">
                    Confirme o recebimento dos itens acima informando seus dados e assinando no
                    quadro. Sua assinatura possui validade jurídica.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="recebedor-nome">Nome Completo *</Label>
                    <Input
                      id="recebedor-nome"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="Digite o nome completo"
                      autoComplete="name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="recebedor-cpf">CPF *</Label>
                    <Input
                      id="recebedor-cpf"
                      value={cpf}
                      onChange={(e) => setCpf(maskCpf(e.target.value))}
                      placeholder="000.000.000-00"
                      inputMode="numeric"
                      autoComplete="off"
                      className={
                        cpf.length > 0 && !cpfValid
                          ? 'border-red-400 focus-visible:ring-red-400'
                          : ''
                      }
                    />
                    {cpf.length > 0 && !cpfValid && (
                      <p className="text-xs text-red-500">CPF inválido.</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-2 block">
                    Assinatura do Recebedor
                  </label>
                  <SignatureCanvas onDraw={(base64) => setSignature(base64)} />
                </div>
                <Button
                  className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700"
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Gerando Comprovante...
                    </>
                  ) : (
                    'Confirmar Recebimento'
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-400 mt-6">
          Bender Haussform • Sistema de Gestão
        </p>
      </div>
    </div>
  )
}
