import { useState } from 'react'
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
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2, Send } from 'lucide-react'

interface EnvelopeSignatureModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedDocs: any[]
  clienteId: string
  clienteNome: string
  clienteEmail: string
  onSuccess: () => void
}

export function EnvelopeSignatureModal({
  open,
  onOpenChange,
  selectedDocs,
  clienteId,
  clienteNome,
  clienteEmail,
  onSuccess,
}: EnvelopeSignatureModalProps) {
  const [nome, setNome] = useState(clienteNome || '')
  const [email, setEmail] = useState(clienteEmail || '')
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    if (!nome || !email) {
      toast.error('Nome e E-mail são obrigatórios')
      return
    }
    if (selectedDocs.length === 0) {
      toast.error('Selecione ao menos um documento')
      return
    }

    setSending(true)
    try {
      const codigo = Math.floor(1000 + Math.random() * 9000).toString()
      const expiraEm = new Date()
      expiraEm.setDate(expiraEm.getDate() + 7)
      const firstDoc = selectedDocs[0]
      const primeiroArquivoUrl = firstDoc.arquivo_url || firstDoc.id

      const { data: envelope, error: envError } = await supabase
        .from('envelopes_assinatura')
        .insert({
          documento_id: primeiroArquivoUrl,
          cliente_id: clienteId,
          nome_documento: `Envelope com ${selectedDocs.length} documento(s)`,
          status: 'aguardando',
          signatario_nome: nome,
          signatario_email: email,
          codigo_verificacao: codigo,
        })
        .select()
        .single()

      if (envError) throw envError

      const docIds = selectedDocs.map((d) => d.id)
      const { error: linkError } = await supabase
        .from('documentos_cliente')
        .update({ envelope_id: envelope.id })
        .in('id', docIds)

      if (linkError) throw linkError

      for (const doc of selectedDocs) {
        const docId = doc.arquivo_url || doc.id
        await supabase.from('assinaturas').insert({
          documento_id: docId,
          documento_nome: doc.template_nome || doc.tipo || 'Documento',
          cliente_id: clienteId,
          signatario_nome: nome,
          signatario_email: email,
          signatario_tipo: 'Cliente',
          codigo_confirmacao: codigo,
          expira_em: expiraEm.toISOString(),
          status: 'pendente',
        })
      }

      const link = `${window.location.origin}/assinar-envelope/${envelope.id}`
      const { error: emailError } = await supabase.functions.invoke('send-signature-email', {
        body: {
          to: email,
          nome,
          link,
          codigo,
          documento_nome: `Envelope com ${selectedDocs.length} documento(s)`,
          envelope_id: envelope.id,
        },
      })

      if (emailError) throw emailError

      const { data: authData } = await supabase.auth.getUser()
      const userName = authData.user?.user_metadata?.nome || authData.user?.email || 'Sistema'
      await supabase.from('timeline_eventos').insert({
        cliente_id: clienteId,
        usuario_nome: userName,
        acao: `Envelope de assinatura em lote criado com ${selectedDocs.length} documento(s) para ${nome}`,
      })

      toast.success('Envelope enviado para assinatura com sucesso!')
      onSuccess()
      onOpenChange(false)
    } catch (e: any) {
      toast.error('Erro ao criar envelope: ' + e.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assinatura em Lote</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            {selectedDocs.length} documento(s) selecionado(s). O cliente receberá um único e-mail
            com um link para assinar todos em sequência.
          </p>
          <div className="space-y-2">
            <Label>Nome do Signatário</Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome completo"
            />
          </div>
          <div className="space-y-2">
            <Label>E-mail</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={sending}>
            {sending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Enviar para Assinatura
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
