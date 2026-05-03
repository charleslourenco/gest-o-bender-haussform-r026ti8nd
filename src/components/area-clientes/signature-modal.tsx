import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
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
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Copy, Plus, Trash2, CheckCircle, Clock, PenTool } from 'lucide-react'

export function SignatureModal({
  doc,
  clienteId,
  onClose,
}: {
  doc: any
  clienteId: string
  onClose: () => void
}) {
  const [signatures, setSignatures] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [assinandoId, setAssinandoId] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [validating, setValidating] = useState(false)

  const [newSig, setNewSig] = useState({
    nome: '',
    email: '',
    tipo: 'Cliente',
  })

  useEffect(() => {
    if (doc?.path || clienteId) {
      loadSignatures()
    }
  }, [doc, clienteId])

  const loadSignatures = async () => {
    if (!clienteId) return
    setLoading(true)
    const { data } = await supabase
      .from('assinaturas')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('criado_em', { ascending: true })

    if (data) {
      const filtered = data.filter(
        (s) =>
          s.documento_id === doc?.path ||
          doc?.title?.includes(s.documento_nome) ||
          (s.documento_nome?.toLowerCase().includes('contrato') &&
            doc?.title?.toLowerCase().includes('contrato')),
      )
      setSignatures(filtered)
    }
    setLoading(false)
  }

  const handleAdd = async () => {
    if (!newSig.nome) return toast.error('Nome é obrigatório')

    const codigo_confirmacao = Math.floor(100000 + Math.random() * 900000).toString()
    const expira_em = new Date()
    expira_em.setDate(expira_em.getDate() + 30)

    const { error } = await supabase.from('assinaturas').insert({
      documento_id: doc.path || doc.title,
      documento_nome: doc.title,
      cliente_id: clienteId,
      signatario_nome: newSig.nome,
      signatario_email: newSig.email,
      signatario_tipo: newSig.tipo,
      codigo_confirmacao,
      status: 'pendente',
      expira_em: expira_em.toISOString(),
    })

    if (error) {
      toast.error('Erro ao adicionar assinante')
    } else {
      toast.success('Assinante adicionado com sucesso!')
      setIsAdding(false)
      setNewSig({ nome: '', email: '', tipo: 'Cliente' })
      loadSignatures()
    }
  }

  const handleValidateCode = async (sig: any) => {
    if (code.length !== 6) return toast.error('O código deve ter 6 dígitos')
    setValidating(true)
    try {
      if (code !== sig.codigo_confirmacao) {
        throw new Error('Código inválido. Tente novamente.')
      }

      let ip = '0.0.0.0'
      try {
        const res = await fetch('https://api.ipify.org?format=json')
        const data = await res.json()
        ip = data.ip
      } catch (e) {
        console.warn('Could not fetch IP')
      }

      const { error } = await supabase
        .from('assinaturas')
        .update({
          status: 'assinado',
          data_assinatura: new Date().toISOString(),
          ip_assinatura: ip,
        })
        .eq('id', sig.id)

      if (error) throw error

      await supabase.from('timeline_eventos').insert({
        cliente_id: clienteId,
        usuario_nome: sig.signatario_nome,
        acao: `Assinatura Realizada no documento ${sig.documento_nome}`,
      })

      toast.success('Assinatura validada com sucesso!')
      setAssinandoId(null)
      setCode('')
      loadSignatures()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setValidating(false)
    }
  }

  const handleRemove = async (id: string) => {
    const { error } = await supabase.from('assinaturas').delete().eq('id', id)
    if (!error) {
      toast.success('Assinante removido')
      loadSignatures()
    }
  }

  const handleCopyLink = (id: string) => {
    const url = `${window.location.origin}/assinatura/${id}`
    navigator.clipboard.writeText(url)
    toast.success('Link de assinatura copiado!')
  }

  return (
    <Dialog open={!!doc} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Assinaturas</DialogTitle>
          <DialogDescription>Documento: {doc?.title}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Assinantes</h3>
            {!isAdding && (
              <Button size="sm" onClick={() => setIsAdding(true)}>
                <Plus className="w-4 h-4 mr-2" /> Adicionar
              </Button>
            )}
          </div>

          {isAdding && (
            <div className="bg-muted/50 p-4 rounded-lg space-y-4 border">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={newSig.tipo}
                    onValueChange={(v) => setNewSig({ ...newSig, tipo: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cliente">Cliente</SelectItem>
                      <SelectItem value="Testemunha">Testemunha</SelectItem>
                      <SelectItem value="Representante">Representante</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Nome Completo</Label>
                  <Input
                    value={newSig.nome}
                    onChange={(e) => setNewSig({ ...newSig, nome: e.target.value })}
                    placeholder="João Silva"
                  />
                </div>
                <div className="space-y-2">
                  <Label>E-mail (Opcional)</Label>
                  <Input
                    value={newSig.email}
                    onChange={(e) => setNewSig({ ...newSig, email: e.target.value })}
                    placeholder="joao@email.com"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsAdding(false)}>
                  Cancelar
                </Button>
                <Button size="sm" onClick={handleAdd}>
                  Salvar
                </Button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-4 text-sm text-muted-foreground">Carregando...</div>
          ) : signatures.length === 0 ? (
            <div className="text-center py-8 bg-muted/20 border border-dashed rounded-lg text-muted-foreground text-sm">
              Nenhum assinante encontrado. O cliente não está pendente de assinatura neste
              documento.
            </div>
          ) : (
            <div className="space-y-3">
              {signatures.map((sig) => (
                <div key={sig.id} className="flex flex-col p-4 bg-card border rounded-lg gap-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{sig.signatario_nome}</span>
                        <span className="text-[10px] uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">
                          {sig.signatario_tipo}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1.5 flex flex-col gap-1">
                        <span>
                          Código de Validação:{' '}
                          <strong className="text-foreground text-sm font-mono tracking-widest">
                            {sig.codigo_confirmacao}
                          </strong>
                        </span>
                        {sig.signatario_email && <span>E-mail: {sig.signatario_email}</span>}
                      </div>
                      <div className="flex items-center gap-1 mt-2">
                        {sig.status === 'assinado' ? (
                          <span className="text-xs text-green-600 flex items-center gap-1.5 font-medium bg-green-50 px-2 py-1 rounded-md w-fit border border-green-200">
                            <CheckCircle className="w-3.5 h-3.5" /> Assinado em{' '}
                            {new Date(sig.data_assinatura).toLocaleString('pt-BR')}
                          </span>
                        ) : (
                          <span className="text-xs text-amber-600 flex items-center gap-1.5 font-medium bg-amber-50 px-2 py-1 rounded-md w-fit border border-amber-200">
                            <Clock className="w-3.5 h-3.5" /> Pendente
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {sig.status !== 'assinado' && (
                        <Button size="sm" variant="default" onClick={() => setAssinandoId(sig.id)}>
                          <PenTool className="w-4 h-4 mr-2" /> Assinar Agora
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyLink(sig.id)}
                        title="Copiar Link de Assinatura"
                      >
                        <Copy className="w-4 h-4 mr-2" /> Copiar Link
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => handleRemove(sig.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {assinandoId === sig.id && sig.status !== 'assinado' && (
                    <div className="mt-2 p-4 bg-muted/30 rounded-lg border border-border flex flex-col items-center gap-3 animate-fade-in">
                      <div className="text-center space-y-1">
                        <Label className="text-sm font-semibold">
                          Digite o código de 6 dígitos
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          O código foi gerado acima ou enviado por e-mail
                        </p>
                      </div>
                      <div className="flex justify-center py-2">
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
                      <div className="flex justify-end gap-2 mt-2 w-full max-w-xs">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setAssinandoId(null)
                            setCode('')
                          }}
                          className="w-full"
                        >
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleValidateCode(sig)}
                          disabled={code.length !== 6 || validating}
                          className="w-full"
                        >
                          {validating ? 'Validando...' : 'Confirmar'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
