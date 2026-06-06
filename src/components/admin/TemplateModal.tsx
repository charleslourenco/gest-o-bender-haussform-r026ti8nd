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
  const [arquivoUrl, setArquivoUrl] = useState('')
  const [status, setStatus] = useState('ativo')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setNome(template?.nome || '')
      setTipo(template?.tipo || '')
      setDescricao(template?.descricao || '')
      setArquivoUrl(template?.arquivo_url || '')
      setStatus(template?.status || 'ativo')
    }
  }, [isOpen, template])

  const isFormValid = nome && tipo && arquivoUrl

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const fileExt = file.name.split('.').pop()?.toLowerCase()
    if (!['html', 'txt', 'md'].includes(fileExt || '')) {
      toast({
        title: 'Formato inválido',
        description: 'Por favor, envie um arquivo .html, .txt ou .md',
        variant: 'destructive',
      })
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setUploading(true)
    try {
      const safeName = nome ? nome.toLowerCase().replace(/[^a-z0-9]/g, '_') : 'template'
      const fileName = `${safeName}_${Date.now()}.${fileExt}`
      const { error } = await supabase.storage
        .from('bender_templates')
        .upload(fileName, file, { upsert: true })
      if (error) throw error
      setArquivoUrl(fileName)
      toast({ title: 'Upload concluído', className: 'bg-dark-denim text-off-white border-none' })
    } catch (err: any) {
      toast({ title: 'Erro no upload', description: err.message, variant: 'destructive' })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSave = async () => {
    if (!isFormValid)
      return toast({
        title: 'Preencha os campos obrigatórios e envie um arquivo',
        variant: 'destructive',
      })
    setSaving(true)
    try {
      const payload = { nome, tipo, descricao, arquivo_url: arquivoUrl, status }
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
            Preencha os dados e anexe o modelo (ex: .txt).
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
            <Label className="text-midnight-navy font-semibold">Arquivo *</Label>
            <div className="flex gap-2 items-center">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFile}
                className="hidden"
                accept=".txt,.html,.md"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="border-steel-blue/50 text-midnight-navy hover:bg-pale-cornflower"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}{' '}
                Selecionar
              </Button>
              {arquivoUrl && (
                <span className="text-sm truncate max-w-[200px] font-medium text-emerald-600">
                  {arquivoUrl}
                </span>
              )}
            </div>
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
