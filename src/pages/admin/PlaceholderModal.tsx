import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface PlaceholderModalProps {
  placeholder?: any
  onClose: () => void
  onSuccess: () => void
}

const ORIGENS = [
  'Formulário Comercial - Seção 1',
  'Formulário Comercial - Seção 2',
  'Formulário Comercial - Seção 3',
  'Formulário Comercial - Seção 4',
  'Link de Assinatura',
  'Sistema (Automático)',
  'Configuração',
]

export function PlaceholderModal({ placeholder, onClose, onSuccess }: PlaceholderModalProps) {
  const { user } = useAuth()
  const isEditing = !!placeholder

  const [formData, setFormData] = useState({
    placeholder: '',
    descricao: '',
    origem: '',
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (placeholder) {
      setFormData({
        placeholder: placeholder.placeholder || '',
        descricao: placeholder.descricao || '',
        origem: placeholder.origem || '',
      })
    }
  }, [placeholder])

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.placeholder) {
      newErrors.placeholder = 'Placeholder é obrigatório.'
    } else if (!/^\{\{[A-Z0-9_]+\}\}$/.test(formData.placeholder)) {
      newErrors.placeholder =
        'Formato inválido. Use {{NOME_DO_CAMPO}} (apenas letras maiúsculas, números e underline).'
    }
    if (!formData.descricao) {
      newErrors.descricao = 'Descrição é obrigatória.'
    } else if (formData.descricao.length > 500) {
      newErrors.descricao = 'Descrição deve ter no máximo 500 caracteres.'
    }
    if (!formData.origem) {
      newErrors.origem = 'Origem é obrigatória.'
    } else if (!ORIGENS.includes(formData.origem)) {
      newErrors.origem = 'Origem inválida.'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validate() || !user) return
    setLoading(true)

    try {
      if (!isEditing) {
        const { data: existing } = await supabase
          .from('placeholders')
          .select('id')
          .eq('placeholder', formData.placeholder)
          .eq('user_id', user.id)
          .maybeSingle()

        if (existing) {
          setErrors({ placeholder: 'Este placeholder já existe.' })
          setLoading(false)
          return
        }
      }

      if (isEditing) {
        const { error } = await supabase
          .from('placeholders')
          .update({
            descricao: formData.descricao,
            origem: formData.origem,
          })
          .eq('id', placeholder.id)
        if (error) throw error
        toast.success('Placeholder atualizado com sucesso!')
      } else {
        const { error } = await supabase.from('placeholders').insert({
          placeholder: formData.placeholder,
          descricao: formData.descricao,
          origem: formData.origem,
          user_id: user.id,
        })
        if (error) throw error
        toast.success('Placeholder adicionado com sucesso!')
      }
      onSuccess()
    } catch (err: any) {
      toast.error('Erro ao salvar placeholder.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-midnight-navy text-off-white w-full max-w-lg rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-white/10 flex justify-between items-center">
          <h2 className="text-xl font-semibold">
            {isEditing ? 'Editar Placeholder' : 'Adicionar Placeholder'}
          </h2>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <div className="space-y-2">
            <Label htmlFor="placeholder" className="text-white/90">
              Placeholder <span className="text-red-400">*</span>
            </Label>
            <Input
              id="placeholder"
              placeholder="{{CLIENTE_NOME}}"
              value={formData.placeholder}
              onChange={(e) =>
                setFormData({ ...formData, placeholder: e.target.value.toUpperCase() })
              }
              disabled={isEditing}
              className="bg-white/5 border-white/20 text-white placeholder:text-white/30 font-mono disabled:opacity-50"
            />
            {errors.placeholder && <p className="text-red-400 text-xs">{errors.placeholder}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="origem" className="text-white/90">
              Origem <span className="text-red-400">*</span>
            </Label>
            <Select
              value={formData.origem}
              onValueChange={(val) => setFormData({ ...formData, origem: val })}
            >
              <SelectTrigger className="bg-white/5 border-white/20 text-white">
                <SelectValue placeholder="Selecione a origem..." />
              </SelectTrigger>
              <SelectContent className="bg-midnight-navy border-white/20 text-white">
                {ORIGENS.map((origem) => (
                  <SelectItem
                    key={origem}
                    value={origem}
                    className="hover:bg-white/10 focus:bg-white/10 cursor-pointer"
                  >
                    {origem}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.origem && <p className="text-red-400 text-xs">{errors.origem}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao" className="text-white/90">
              Descrição <span className="text-red-400">*</span>
            </Label>
            <Textarea
              id="descricao"
              placeholder="Ex: Nome completo do cliente"
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              className="bg-white/5 border-white/20 text-white placeholder:text-white/30 resize-none h-24"
            />
            {errors.descricao && <p className="text-red-400 text-xs">{errors.descricao}</p>}
          </div>
        </div>

        <div className="p-4 border-t border-white/10 flex justify-end gap-2 bg-white/5">
          <Button variant="ghost" onClick={onClose} className="text-white hover:bg-white/10">
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="bg-steel-blue text-off-white hover:bg-steel-blue/90"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Salvar
          </Button>
        </div>
      </div>
    </div>
  )
}
