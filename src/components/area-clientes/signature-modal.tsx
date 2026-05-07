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
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Copy, Plus, Trash2, CheckCircle, Clock, Send, Users } from 'lucide-react'

const ROLES = [
  'Representante da Empresa',
  'Cliente',
  'Testemunha',
  'Analista',
  'Representante do Cliente',
  'Consultor(a)',
]

export function SignatureModal({ doc, clienteId, onClose }: any) {
  const [signatures, setSignatures] = useState<any[]>([])
  const [stagedSigners, setStagedSigners] = useState<any[]>([])
  const [clientData, setClientData] = useState<{ nome: string; email: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [isAdding, setIsAdding] = useState(false)

  const [newSig, setNewSig] = useState({ tipo: '', nome: '', email: '' })

  useEffect(() => {
    if (doc?.path || clienteId) loadSignatures()
    if (clienteId) {
      supabase
        .from('clientes')
        .select('nome, email')
        .eq('id', clienteId)
        .single()
        .then(({ data }) => {
          if (data) setClientData(data)
        })
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
      setSignatures(
        data.filter(
          (s) =>
            s.documento_id === doc?.path ||
            doc?.title?.includes(s.documento_nome) ||
            (s.documento_nome?.toLowerCase().includes('contrato') &&
              doc?.title?.toLowerCase().includes('contrato')),
        ),
      )
    }
    setLoading(false)
  }

  const handleRoleChange = (v: string) => {
    if (v === 'Representante da Empresa') {
      setNewSig({ tipo: v, nome: 'Daiana Gabriela Bender', email: 'projetos@benderhaussform.com' })
    } else if (v === 'Cliente' && clientData) {
      setNewSig({ tipo: v, nome: clientData.nome, email: clientData.email })
    } else {
      setNewSig({ tipo: v, nome: '', email: '' })
    }
  }

  const handleAddStaged = () => {
    if (!newSig.tipo || !newSig.nome || !newSig.email) {
      return toast.error('Preencha o papel, nome e e-mail')
    }
    setStagedSigners([...stagedSigners, newSig])
    setNewSig({ tipo: '', nome: '', email: '' })
    setIsAdding(false)
  }

  const handleRemoveStaged = (index: number) => {
    setStagedSigners(stagedSigners.filter((_, i) => i !== index))
  }

  const handleSendAll = async () => {
    if (stagedSigners.length === 0) return toast.error('Adicione signatários para enviar.')
    setSending(true)
    try {
      for (const sig of stagedSigners) {
        const code = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
        const { data, error } = await supabase
          .from('assinaturas')
          .insert({
            documento_id: doc.path || doc.title,
            documento_nome: doc.title,
            cliente_id: clienteId,
            signatario_nome: sig.nome,
            signatario_email: sig.email,
            signatario_tipo: sig.tipo,
            codigo_confirmacao: code,
            status: 'pendente',
            expira_em: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          })
          .select()
          .single()

        if (error) throw error

        if (data) {
          await supabase.functions.invoke('send-signature-email', {
            body: {
              to: sig.email,
              nome: sig.nome,
              link: `${window.location.origin}/assinatura/${data.id}`,
              codigo: code,
              documento_nome: doc.title,
            },
          })

          await supabase.from('timeline_eventos').insert({
            cliente_id: clienteId,
            usuario_nome: 'Sistema',
            acao: `Enviado pedido de assinatura para ${sig.nome} (${sig.tipo})`,
          })
        }
      }
      setStagedSigners([])
      toast.success('Pedidos de assinatura enviados com sucesso!')
      loadSignatures()
    } catch (e: any) {
      toast.error('Erro ao enviar assinaturas: ' + e.message)
    } finally {
      setSending(false)
    }
  }

  const handleRemoveExisting = async (id: string) => {
    const { error } = await supabase.from('assinaturas').delete().eq('id', id)
    if (!error) {
      toast.success('Assinatura removida do documento')
      loadSignatures()
    }
  }

  return (
    <Dialog open={!!doc} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Assinaturas</DialogTitle>
          <DialogDescription>Documento: {doc?.title}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Sessão de Envio de Novas Assinaturas */}
          <div className="space-y-3 bg-muted/30 p-4 rounded-lg border border-border">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> Preparar Envio
              </h3>
              {!isAdding && (
                <Button size="sm" variant="outline" onClick={() => setIsAdding(true)}>
                  <Plus className="w-4 h-4 mr-2" /> Adicionar Signatário
                </Button>
              )}
            </div>

            {isAdding && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-background p-3 rounded border">
                <div className="space-y-2">
                  <Label>Papel / Função</Label>
                  <Select value={newSig.tipo} onValueChange={handleRoleChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Nome Completo</Label>
                  <Input
                    value={newSig.nome}
                    onChange={(e) => setNewSig({ ...newSig, nome: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input
                    type="email"
                    value={newSig.email}
                    onChange={(e) => setNewSig({ ...newSig, email: e.target.value })}
                  />
                </div>
                <div className="md:col-span-3 flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)}>
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={handleAddStaged}>
                    Confirmar na Lista
                  </Button>
                </div>
              </div>
            )}

            {stagedSigners.length > 0 && (
              <div className="space-y-2 mt-4">
                <Label className="text-xs text-muted-foreground">Signatários na Fila:</Label>
                {stagedSigners.map((sig, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-background p-2 rounded border text-sm"
                  >
                    <div>
                      <span className="font-semibold">{sig.tipo}</span> — {sig.nome} ({sig.email})
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveStaged(i)}
                      className="text-destructive h-8 w-8"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button className="w-full mt-2" onClick={handleSendAll} disabled={sending}>
                  {sending ? (
                    'Enviando e-mails...'
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" /> Disparar E-mails de Assinatura
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Lista de Assinaturas Existentes */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Status das Assinaturas</h3>
            {loading ? (
              <div className="text-center py-4 text-sm text-muted-foreground">Carregando...</div>
            ) : signatures.length === 0 ? (
              <div className="text-center py-6 bg-muted/20 border border-dashed rounded-lg text-muted-foreground text-sm">
                Nenhum signatário registrado.
              </div>
            ) : (
              signatures.map((sig) => (
                <div
                  key={sig.id}
                  className="flex items-center justify-between p-3 bg-card border rounded-lg"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{sig.signatario_nome}</span>
                      <span className="text-[10px] uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">
                        {sig.signatario_tipo}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      <span className="text-muted-foreground flex items-center gap-1 mt-1">
                        <Send className="w-3 h-3" /> E-mail de solicitação enviado
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      title="Copiar Link"
                      onClick={() => {
                        navigator.clipboard.writeText(
                          `${window.location.origin}/assinatura/${sig.id}`,
                        )
                        toast.success('Link copiado!')
                      }}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive h-8 w-8 hover:bg-destructive/10"
                      onClick={() => handleRemoveExisting(sig.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
