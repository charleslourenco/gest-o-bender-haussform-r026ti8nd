import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const TIPOS = [
  { value: 'contrato', label: 'Contrato' },
  { value: 'termo_conclusao', label: 'Termo de Conclusão' },
  { value: 'termo_garantia', label: 'Termo de Garantia' },
]

export function TemplateModal({ template, onClose, onSuccess }: any) {
  const [nome, setNome] = useState(template?.nome || '')
  const [tipo, setTipo] = useState(template?.tipo || '')
  const [descricao, setDescricao] = useState(template?.descricao || '')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSave = async () => {
    const newErrors: Record<string, string> = {}
    if (!nome.trim()) newErrors.nome = 'Nome é obrigatório.'
    else if (nome.length > 100) newErrors.nome = 'Nome deve ter no máximo 100 caracteres.'

    if (!tipo) newErrors.tipo = 'Tipo é obrigatório.'

    if (!template && !file) newErrors.file = 'Arquivo é obrigatório.'
    if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase()
      if (ext !== 'pdf' && ext !== 'docx' && ext !== 'doc') {
        newErrors.file = 'Apenas arquivos PDF e Word (.pdf, .docx, .doc) são permitidos.'
      }
      if (file.size > 10 * 1024 * 1024) {
        newErrors.file = 'Arquivo deve ter no máximo 10MB.'
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setErrors({})
    setLoading(true)
    try {
      let arquivo_url = template?.arquivo_url

      if (!template && file) {
        const ext = file.name.split('.').pop()
        const safeNome = nome.replace(/[^a-z0-9]/gi, '_').toLowerCase()
        const fileName = `${tipo}_${safeNome}_${Date.now()}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('templates')
          .upload(fileName, file)

        if (uploadError) throw new Error('Falha no upload do arquivo.')
        arquivo_url = fileName
      }

      if (template) {
        const { error } = await supabase
          .from('templates')
          .update({ nome, tipo, descricao })
          .eq('id', template.id)
        if (error) throw error
        toast.success('Template atualizado com sucesso!')
      } else {
        const { error } = await supabase
          .from('templates')
          .insert({ nome, tipo, descricao, arquivo_url })
        if (error) throw error
        toast.success('Template salvo com sucesso!')
      }

      onSuccess()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar template.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg p-6 bg-midnight-navy text-off-white border-steel-blue">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-off-white">
            {template ? 'Editar Template' : 'Adicionar Template'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-1">
            <Label className="text-off-white font-medium text-sm">Nome *</Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              maxLength={100}
              placeholder="Ex: Contrato Padrão"
              className={cn(
                'bg-dark-denim border-steel-blue text-off-white placeholder:text-off-white/40',
                errors.nome && 'border-red-500',
              )}
            />
            {errors.nome && <p className="text-red-400 text-xs mt-1">{errors.nome}</p>}
          </div>

          <div className="space-y-1">
            <Label className="text-off-white font-medium text-sm">Tipo *</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger
                className={cn(
                  'bg-dark-denim border-steel-blue text-off-white',
                  errors.tipo && 'border-red-500',
                )}
              >
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent className="bg-dark-denim border-steel-blue text-off-white">
                {TIPOS.map((t) => (
                  <SelectItem
                    key={t.value}
                    value={t.value}
                    className="focus:bg-steel-blue focus:text-off-white"
                  >
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.tipo && <p className="text-red-400 text-xs mt-1">{errors.tipo}</p>}
          </div>

          <div className="space-y-1">
            <Label className="text-off-white font-medium text-sm">Descrição (Opcional)</Label>
            <Textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Contrato padrão de prestação de serviços"
              className="bg-dark-denim border-steel-blue text-off-white placeholder:text-off-white/40 resize-none"
              rows={3}
            />
          </div>

          {!template && (
            <div className="space-y-1">
              <Label className="text-off-white font-medium text-sm">Arquivo (.pdf, .docx) *</Label>
              <Input
                type="file"
                accept=".pdf,.docx,.doc"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className={cn(
                  'bg-dark-denim border-steel-blue text-off-white file:text-off-white file:font-medium cursor-pointer',
                  errors.file && 'border-red-500',
                )}
              />
              {errors.file && <p className="text-red-400 text-xs mt-1">{errors.file}</p>}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-steel-blue/30">
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full sm:w-auto bg-transparent border-steel-blue text-off-white hover:bg-steel-blue/20 hover:text-off-white"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="w-full sm:w-auto bg-steel-blue text-off-white hover:bg-steel-blue/90"
          >
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
