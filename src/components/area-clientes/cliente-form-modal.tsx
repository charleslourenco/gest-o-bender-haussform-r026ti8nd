import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { maskCpfCnpj, sanitizeCpfCnpj, detectTipoPessoa, isValidCpfCnpj } from '@/lib/cpf-cnpj'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Loader2, UserPlus } from 'lucide-react'

interface ClienteFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
}

export function ClienteFormModal({ open, onOpenChange, onSaved }: ClienteFormModalProps) {
  const { user } = useAuth()
  const [nome, setNome] = useState('')
  const [documento, setDocumento] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      setNome('')
      setDocumento('')
      setEmail('')
      setTelefone('')
      setErrors({})
    }
  }, [open])

  const tipoPessoa = detectTipoPessoa(documento)

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!nome.trim()) errs.nome = 'Nome é obrigatório'
    if (!documento.trim()) {
      errs.documento = 'Documento é obrigatório'
    } else if (!isValidCpfCnpj(documento)) {
      errs.documento = 'CPF ou CNPJ inválido'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSaving(true)

    const sanitizedDoc = sanitizeCpfCnpj(documento)
    const detectedTipo = tipoPessoa || (sanitizedDoc.length === 14 ? 'PJ' : 'PF')

    const payload = {
      nome: nome.trim(),
      cpf: sanitizedDoc,
      tipo_pessoa: detectedTipo,
      email: email.trim() || '',
      telefone: telefone.trim() || '',
      status: 'Ativo',
      usuario_id: user?.id || null,
    }

    const { data: newClient, error } = await supabase
      .from('clientes')
      .insert(payload)
      .select()
      .single()

    if (error) {
      setSaving(false)
      toast.error('Erro ao cadastrar cliente: ' + error.message)
      return
    }

    if (newClient) {
      await supabase.from('dossies').insert({
        cliente_id: newClient.id,
        user_id: user?.id || null,
        status: 'em_documentacao',
      })
    }

    setSaving(false)
    toast.success('Cliente cadastrado com sucesso!')
    onOpenChange(false)
    onSaved?.()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Novo Cliente
          </DialogTitle>
          <DialogDescription>
            Cadastre um cliente individual (PF) ou empresa (PJ).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="cli-nome">Nome Completo / Razão Social</Label>
            <Input
              id="cli-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Digite o nome ou razão social"
            />
            {errors.nome && <p className="text-xs text-destructive">{errors.nome}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="cli-doc" className="flex items-center gap-2">
              CPF / CNPJ
              {tipoPessoa && (
                <span className="text-xs text-muted-foreground font-normal">
                  ({tipoPessoa === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'})
                </span>
              )}
            </Label>
            <Input
              id="cli-doc"
              value={documento}
              onChange={(e) => setDocumento(maskCpfCnpj(e.target.value))}
              placeholder="000.000.000-00 ou 00.000.000/0000-00"
              inputMode="numeric"
            />
            {errors.documento && <p className="text-xs text-destructive">{errors.documento}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="cli-email">Email</Label>
            <Input
              id="cli-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cli-tel">Telefone</Label>
            <Input
              id="cli-tel"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="(00) 00000-0000"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
