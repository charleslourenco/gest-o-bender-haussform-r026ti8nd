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
import { Loader2, Trash2, Mail, Link as LinkIcon, Plus } from 'lucide-react'

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
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    nome: '',
    email: '',
    tipo: 'Cliente',
    telefone: '',
  })
  const [sending, setSending] = useState(false)

  const roles = [
    'Cliente',
    'Daiana (Company Representative)',
    'Testemunha 1',
    'Testemunha 2',
    'Consultor',
    'Analista',
  ]

  const loadSignatures = async () => {
    try {
      const { data, error } = await supabase
        .from('assinaturas')
        .select('*')
        .eq('documento_id', doc.path || doc.arquivo_url)
        .order('criado_em', { ascending: true })

      if (error) throw error
      setSignatures(data || [])
    } catch (e: any) {
      toast.error('Erro ao carregar assinaturas: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSignatures()
  }, [])

  const handleAddSignature = async () => {
    if (!form.nome || !form.email) {
      toast.error('Nome e E-mail são obrigatórios')
      return
    }

    try {
      const code = Math.floor(1000 + Math.random() * 9000).toString()
      const expiraEm = new Date()
      expiraEm.setDate(expiraEm.getDate() + 7)

      const docId = doc.path || doc.arquivo_url

      const { error } = await supabase.from('assinaturas').insert({
        documento_id: docId,
        documento_nome: doc.title || doc.template_nome,
        cliente_id: clienteId,
        signatario_nome: form.nome,
        signatario_email: form.email,
        signatario_telefone: form.telefone,
        signatario_tipo: form.tipo,
        codigo_confirmacao: code,
        expira_em: expiraEm.toISOString(),
        status: 'pendente',
      })

      if (error) throw error

      toast.success('Signatário adicionado com sucesso!')
      setForm({ nome: '', email: '', tipo: 'Cliente', telefone: '' })
      loadSignatures()
    } catch (e: any) {
      toast.error('Erro ao adicionar: ' + e.message)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Remover este signatário?')) return
    try {
      const { error } = await supabase.from('assinaturas').delete().eq('id', id)
      if (error) throw error
      toast.success('Removido')
      loadSignatures()
    } catch (e: any) {
      toast.error('Erro ao remover: ' + e.message)
    }
  }

  const handleSendEmail = async (sig: any) => {
    setSending(true)
    try {
      const link = `${window.location.origin}/assinatura/${sig.id}`
      const { data, error } = await supabase.functions.invoke('send-signature-email', {
        body: {
          to: sig.signatario_email,
          nome: sig.signatario_nome,
          link,
          codigo: sig.codigo_confirmacao,
          documento_nome: sig.documento_nome,
        },
      })

      if (error) throw error
      if (data?.error) throw new Error(data.error)

      toast.success('E-mail enviado!')
    } catch (e: any) {
      toast.error('Erro ao enviar: ' + e.message)
    } finally {
      setSending(false)
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
          <DialogTitle>Gerenciar Assinaturas</DialogTitle>
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
                            disabled={sending}
                            title="Enviar E-mail"
                          >
                            <Mail className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      <Button
                        size="icon"
                        variant="destructive"
                        onClick={() => handleDelete(sig.id)}
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
