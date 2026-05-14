import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FileSignature, Send, Clock, CheckCircle2, Copy } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'

interface Props {
  entityId: string
  entityType: 'clt' | 'pj'
  nome: string
  email: string
  cpf: string
}

export function AssinaturasAba({ entityId, entityType, nome, email, cpf }: Props) {
  const [assinaturas, setAssinaturas] = useState<any[]>([])
  const [docs, setDocs] = useState<any[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const [selectedDoc, setSelectedDoc] = useState('')
  const [sigName, setSigName] = useState(nome || '')
  const [sigEmail, setSigEmail] = useState(email || '')
  const [sigCpf, setSigCpf] = useState(cpf || '')

  const field = entityType === 'clt' ? 'clt_id' : 'pj_id'

  const fetchData = async () => {
    const { data: sigs } = await supabase
      .from('assinaturas')
      .select('*')
      .eq(field, entityId)
      .order('criado_em', { ascending: false })
    if (sigs) setAssinaturas(sigs)

    const { data: d } = await supabase.from('documentos_equipe').select('*').eq(field, entityId)
    if (d) setDocs(d)
  }

  useEffect(() => {
    fetchData()
    setSigName(nome || '')
    setSigEmail(email || '')
    setSigCpf(cpf || '')
  }, [entityId, entityType, nome, email, cpf])

  const handleSolicitar = async () => {
    if (!selectedDoc || !sigName || !sigEmail) {
      toast({ title: 'Preencha os campos obrigatórios', variant: 'destructive' })
      return
    }

    setLoading(true)
    const doc = docs.find((d) => d.id === selectedDoc)

    const codigo_confirmacao = Math.floor(1000 + Math.random() * 9000).toString()
    const expiraEm = new Date()
    expiraEm.setDate(expiraEm.getDate() + 7)

    const { data: envelope, error: envErr } = await supabase
      .from('envelopes_assinatura')
      .insert({
        documento_id: doc.arquivo_url,
        [field]: entityId,
        nome_documento: doc.nome,
      })
      .select()
      .single()

    if (envErr) {
      toast({
        title: 'Erro ao criar envelope',
        description: envErr.message,
        variant: 'destructive',
      })
      setLoading(false)
      return
    }

    const { data: sig, error: sigErr } = await supabase
      .from('assinaturas')
      .insert({
        documento_id: doc.arquivo_url,
        documento_nome: doc.nome,
        [field]: entityId,
        signatario_tipo: entityType === 'clt' ? 'Colaborador CLT' : 'Parceiro PJ',
        signatario_nome: sigName,
        signatario_cpf: sigCpf,
        signatario_email: sigEmail,
        codigo_confirmacao,
        expira_em: expiraEm.toISOString(),
        status: 'pendente',
      })
      .select()
      .single()

    if (sigErr) {
      toast({
        title: 'Erro ao criar assinatura',
        description: sigErr.message,
        variant: 'destructive',
      })
      setLoading(false)
      return
    }

    const link = `${window.location.origin}/assinatura/${sig.id}`
    await supabase.functions.invoke('send-signature-email', {
      body: {
        to: sigEmail,
        nome: sigName,
        link,
        codigo: codigo_confirmacao,
        documento_nome: doc.nome,
      },
    })

    toast({ title: 'Solicitação enviada com sucesso!' })
    setIsOpen(false)
    fetchData()
    setLoading(false)
  }

  const copyLink = (id: string) => {
    const link = `${window.location.origin}/assinatura/${id}`
    navigator.clipboard.writeText(link)
    toast({ title: 'Link copiado para a área de transferência' })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-muted/30 p-4 rounded-lg border border-border">
        <div>
          <h3 className="font-semibold text-sm">Assinaturas Digitais</h3>
          <p className="text-xs text-muted-foreground">
            Solicite a assinatura de contratos e termos
          </p>
        </div>
        <Button onClick={() => setIsOpen(true)}>
          <FileSignature className="w-4 h-4 mr-2" /> Nova Solicitação
        </Button>
      </div>

      <div className="space-y-4">
        {assinaturas.length === 0 && (
          <div className="text-sm text-center text-muted-foreground p-8 border rounded-lg border-dashed">
            Nenhuma solicitação de assinatura enviada.
          </div>
        )}
        {assinaturas.map((a) => (
          <div
            key={a.id}
            className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border rounded-lg gap-4"
          >
            <div>
              <div className="font-medium text-sm flex items-center gap-2">
                {a.documento_nome}
                {a.status === 'assinado' ? (
                  <span className="flex items-center text-xs text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Assinado
                  </span>
                ) : (
                  <span className="flex items-center text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                    <Clock className="w-3 h-3 mr-1" /> Pendente
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Signatário: {a.signatario_nome} ({a.signatario_email})
              </div>
              {a.status === 'assinado' && a.data_assinatura && (
                <div className="text-xs text-muted-foreground mt-1">
                  Em: {new Date(a.data_assinatura).toLocaleString('pt-BR')}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {a.status === 'pendente' && (
                <Button variant="outline" size="sm" onClick={() => copyLink(a.id)}>
                  <Copy className="w-4 h-4 mr-2" /> Copiar Link
                </Button>
              )}
              {a.assinatura_imagem && a.status === 'assinado' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    toast({ title: 'Assinatura registrada no sistema' })
                  }}
                >
                  Ver Registro
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="right" className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Solicitar Assinatura</SheetTitle>
            <SheetDescription>
              Selecione um documento da pasta e confirme os dados do signatário.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-6">
            <div className="space-y-2">
              <Label>Documento a Assinar</Label>
              <Select value={selectedDoc} onValueChange={setSelectedDoc}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o documento..." />
                </SelectTrigger>
                <SelectContent>
                  {docs.length === 0 && (
                    <SelectItem value="none" disabled>
                      Nenhum documento na pasta
                    </SelectItem>
                  )}
                  {docs.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nome do Signatário</Label>
              <Input value={sigName} onChange={(e) => setSigName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>E-mail do Signatário</Label>
              <Input value={sigEmail} onChange={(e) => setSigEmail(e.target.value)} type="email" />
            </div>
            <div className="space-y-2">
              <Label>CPF/CNPJ do Signatário</Label>
              <Input value={sigCpf} onChange={(e) => setSigCpf(e.target.value)} />
            </div>
            <Button className="w-full mt-4" onClick={handleSolicitar} disabled={loading}>
              {loading ? (
                'Enviando...'
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" /> Enviar Solicitação por E-mail
                </>
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
