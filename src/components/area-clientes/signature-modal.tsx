import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
import { Copy, Plus, Trash2, CheckCircle, Clock } from 'lucide-react'

export function SignatureModal({
  doc,
  clienteId,
  onClose,
}: {
  doc: any
  clienteId: string
  onClose: () => void
}) {
  const [assinaturas, setAssinaturas] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [isAdding, setIsAdding] = useState(false)

  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [cpf, setCpf] = useState('')
  const [telefone, setTelefone] = useState('')
  const [tipo, setTipo] = useState('Cliente')

  const fetchAssinaturas = async () => {
    if (!doc) return
    setLoading(true)
    const docId = doc.path || doc.id || doc.title
    const { data, error } = await supabase
      .from('assinaturas')
      .select('*')
      .eq('documento_id', docId)
      .order('criado_em', { ascending: false })

    if (data) {
      setAssinaturas(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (doc) {
      fetchAssinaturas()
    } else {
      setAssinaturas([])
      setIsAdding(false)
    }
  }, [doc])

  const handleAdd = async () => {
    if (!nome) {
      toast.error('Preencha o nome do signatário')
      return
    }

    const docId = doc.path || doc.id || doc.title
    const codigo_confirmacao = Math.floor(100000 + Math.random() * 900000).toString()
    const expira_em = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    const { error } = await supabase.from('assinaturas').insert({
      documento_id: docId,
      documento_nome: doc.title,
      cliente_id: clienteId,
      signatario_nome: nome,
      signatario_email: email || null,
      signatario_cpf: cpf || null,
      signatario_telefone: telefone || null,
      signatario_tipo: tipo,
      codigo_confirmacao,
      status: 'pendente',
      expira_em,
    })

    if (error) {
      toast.error('Erro ao adicionar signatário: ' + error.message)
    } else {
      toast.success('Signatário adicionado com sucesso!')
      setIsAdding(false)
      setNome('')
      setEmail('')
      setCpf('')
      setTelefone('')
      setTipo('Cliente')
      fetchAssinaturas()
    }
  }

  const handleRemove = async (id: string) => {
    const { error } = await supabase.from('assinaturas').delete().eq('id', id)
    if (error) {
      toast.error('Erro ao remover signatário')
    } else {
      toast.success('Signatário removido')
      fetchAssinaturas()
    }
  }

  const copyLink = (id: string, codigo: string) => {
    const link = `${window.location.origin}/assinatura/${id}`
    navigator.clipboard.writeText(
      `Link para assinatura do documento:\n${link}\n\nCódigo de Confirmação: ${codigo}`,
    )
    toast.success('Link e código copiados para a área de transferência!')
  }

  return (
    <Dialog open={!!doc} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Gerenciar Assinaturas - {doc?.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-2">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold">Signatários ({assinaturas.length})</h3>
            <Button variant="outline" size="sm" onClick={() => setIsAdding(!isAdding)}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar
            </Button>
          </div>

          {isAdding && (
            <div className="bg-muted/50 p-4 rounded-lg border space-y-4 animate-in fade-in zoom-in duration-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome Completo</Label>
                  <Input
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Nome do signatário"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={tipo} onValueChange={setTipo}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cliente">Cliente</SelectItem>
                      <SelectItem value="Representante Legal">Representante Legal</SelectItem>
                      <SelectItem value="Testemunha 1">Testemunha 1</SelectItem>
                      <SelectItem value="Testemunha 2">Testemunha 2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>E-mail (opcional)</Label>
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                    type="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label>CPF (opcional)</Label>
                  <Input
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    placeholder="000.000.000-00"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setIsAdding(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAdd}>Salvar Signatário</Button>
              </div>
            </div>
          )}

          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Carregando signatários...
              </p>
            ) : assinaturas.length === 0 && !isAdding ? (
              <div className="text-center py-8 bg-muted/30 rounded-md border border-dashed text-muted-foreground">
                Nenhum signatário adicionado para este documento.
              </div>
            ) : (
              assinaturas.map((ass) => (
                <div
                  key={ass.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-card shadow-sm hover:shadow-md transition-shadow"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{ass.signatario_nome}</span>
                      <span className="text-[10px] uppercase font-bold tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-sm">
                        {ass.signatario_tipo}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                      {ass.signatario_email && <span>{ass.signatario_email}</span>}
                      {ass.signatario_email && <span>•</span>}
                      {ass.status === 'assinado' ? (
                        <span className="flex items-center text-emerald-600 font-medium">
                          <CheckCircle className="w-3.5 h-3.5 mr-1" /> Assinado em{' '}
                          {new Date(ass.data_assinatura).toLocaleDateString('pt-BR')}
                        </span>
                      ) : (
                        <span className="flex items-center text-amber-600 font-medium">
                          <Clock className="w-3.5 h-3.5 mr-1" /> Aguardando Assinatura
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {ass.status !== 'assinado' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyLink(ass.id, ass.codigo_confirmacao)}
                        className="h-8 text-xs"
                      >
                        <Copy className="w-3.5 h-3.5 mr-2" />
                        Link
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemove(ass.id)}
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
