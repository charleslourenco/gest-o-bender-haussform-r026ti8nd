import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Loader2, Upload } from 'lucide-react'

export function TemplateModal({ isOpen, onClose, template, onSuccess }: any) {
  const { toast } = useToast()
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [externalTemplateId, setExternalTemplateId] = useState('')
  const [status, setStatus] = useState('ativo')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setNome(template?.nome || '')
      setTipo(template?.tipo || '')
      setDescricao(template?.descricao || '')
      setExternalTemplateId(template?.external_template_id || '')
      setStatus(template?.status || 'ativo')
    }
  }, [isOpen, template])

  const isFormValid = nome && tipo && externalTemplateId

  const handleSave = async () => {
    if (!isFormValid)
      return toast({
        title: 'Preencha os campos obrigatórios',
        variant: 'destructive',
      })
    setSaving(true)
    try {
      const payload = {
        nome,
        tipo,
        descricao,
        external_template_id: externalTemplateId,
        arquivo_url: 'pdfmonkey',
        status,
      }
      if (template) {
        const { error } = await supabase.from('templates').update(payload).eq('id', template.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('templates').insert(payload)
        if (error) throw error
      }
      toast({ title: 'Salvo com sucesso', className: 'bg-dark-denim text-off-white border-none' })
      onSuccess()
      onClose()
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-off-white border-steel-blue/20">
        <DialogHeader>
          <DialogTitle className="text-midnight-navy">
            {template ? 'Editar Template' : 'Novo Template'}
          </DialogTitle>
          <DialogDescription className="text-midnight-navy/70">
            Preencha os dados e informe o ID do Template no PDFMonkey.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label className="text-midnight-navy font-semibold">Nome *</Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="bg-pale-cornflower border-steel-blue/40"
            />
          </div>
          <div className="grid gap-2">
            <Label className="text-midnight-navy font-semibold">Tipo *</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger className="bg-pale-cornflower border-steel-blue/40">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contrato">Contrato</SelectItem>
                <SelectItem value="termo_conclusao">Termo de Conclusão</SelectItem>
                <SelectItem value="termo_garantia">Termo de Garantia</SelectItem>
                <SelectItem value="proposta">Proposta Comercial</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label className="text-midnight-navy font-semibold">Descrição</Label>
            <Input
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="bg-pale-cornflower border-steel-blue/40"
            />
          </div>
          <div className="grid gap-2">
            <Label className="text-midnight-navy font-semibold">PDFMonkey Template ID *</Label>
            <Input
              value={externalTemplateId}
              onChange={(e) => setExternalTemplateId(e.target.value)}
              placeholder="ex: 12345678-1234-1234-1234-123456789012"
              className="bg-pale-cornflower border-steel-blue/40"
            />
          </div>
          <div className="grid gap-2">
            <Label className="text-midnight-navy font-semibold">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="bg-pale-cornflower border-steel-blue/40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="border-steel-blue/50 text-midnight-navy hover:bg-pale-cornflower"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !isFormValid}
            className="bg-dark-denim text-off-white hover:bg-dark-denim/90 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
