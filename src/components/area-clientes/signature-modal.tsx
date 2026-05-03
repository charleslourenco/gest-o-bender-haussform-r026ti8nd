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
import { Copy, CheckCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export function SignatureModal({
  doc,
  clienteId,
  onClose,
}: {
  doc: any
  clienteId: string
  onClose: () => void
}) {
  const [signers, setSigners] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [tipo, setTipo] = useState('Cliente')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [cpf, setCpf] = useState('')

  const loadSigners = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('assinaturas')
      .select('*')
      .eq('documento_id', doc.path)
      .order('criado_em', { ascending: true })
    setSigners(data || [])
    setLoading(false)
  }

  useEffect(() => {
    if (doc) loadSigners()
  }, [doc])

  const handleAddSigner = async () => {
    if (!nome) {
      toast.error('O nome é obrigatório')
      return
    }

    const codigo = Math.floor(100000 + Math.random() * 900000).toString()
    const expira = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    const { error } = await supabase.from('assinaturas').insert({
      documento_id: doc.path,
      documento_nome: doc.title,
      cliente_id: clienteId,
      signatario_tipo: tipo,
      signatario_nome: nome,
      signatario_email: email || null,
      signatario_cpf: cpf || null,
      codigo_confirmacao: codigo,
      status: 'pendente',
      expira_em: expira,
    })

    if (error) {
      toast.error('Erro ao adicionar signatário')
      return
    }
    toast.success('Signatário adicionado com sucesso')
    setNome('')
    setEmail('')
    setCpf('')
    setTipo('Cliente')
    loadSigners()
  }

  const copyLink = (id: string, codigo: string) => {
    const link = `${window.location.origin}/assinatura/${id}`
    const text = `Acesse o link para assinar o documento: ${link}\nSeu código de confirmação é: ${codigo}`
    navigator.clipboard.writeText(text)
    toast.success('Link e código copiados para a área de transferência!')
  }

  return (
    <Dialog open={!!doc} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Assinaturas: {doc?.title}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          <div className="space-y-4">
            <h3 className="font-semibold text-sm border-b pb-2">Adicionar Signatário</h3>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Tipo</Label>
                <Select value={tipo} onValueChange={setTipo}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cliente">Cliente</SelectItem>
                    <SelectItem value="Representante">Representante</SelectItem>
                    <SelectItem value="Testemunha">Testemunha</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Nome Completo *</Label>
                <Input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: João da Silva"
                />
              </div>
              <div className="space-y-1">
                <Label>E-mail</Label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Opcional"
                  type="email"
                />
              </div>
              <div className="space-y-1">
                <Label>CPF</Label>
                <Input
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  placeholder="Opcional"
                />
              </div>
              <Button onClick={handleAddSigner} className="w-full mt-2">
                Adicionar
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-sm border-b pb-2">Signatários Atuais</h3>
            {loading ? (
              <div className="text-sm text-muted-foreground">Carregando...</div>
            ) : signers.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                Nenhum signatário adicionado ainda.
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                {signers.map((s) => (
                  <div key={s.id} className="p-3 border rounded-md space-y-2 bg-muted/30">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium text-sm flex items-center gap-2">
                          {s.signatario_nome}
                          <Badge
                            variant={s.status === 'assinado' ? 'default' : 'secondary'}
                            className="text-[10px] px-1 py-0 h-4"
                          >
                            {s.status === 'assinado' ? 'Assinado' : 'Pendente'}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {s.signatario_tipo} {s.signatario_cpf ? `• CPF: ${s.signatario_cpf}` : ''}
                        </div>
                      </div>
                    </div>
                    {s.status === 'pendente' && (
                      <div className="pt-2 border-t flex items-center justify-between">
                        <div className="text-xs">
                          Código:{' '}
                          <strong className="text-primary tracking-widest">
                            {s.codigo_confirmacao}
                          </strong>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => copyLink(s.id, s.codigo_confirmacao)}
                        >
                          <Copy className="w-3 h-3 mr-1" /> Copiar Link
                        </Button>
                      </div>
                    )}
                    {s.status === 'assinado' && s.data_assinatura && (
                      <div className="pt-2 border-t text-xs text-muted-foreground flex items-center">
                        <CheckCircle className="w-3 h-3 mr-1 text-green-500" />
                        Assinado em: {new Date(s.data_assinatura).toLocaleString('pt-BR')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
