import { useState } from 'react'
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
import { CheckCircle2, AlertCircle } from 'lucide-react'

const TIPOS = [
  'Contrato',
  'Termo de Vistoria',
  'Representação',
  'Recusa',
  'Alteração',
  'Não Conformidade',
  'Garantia',
]

export function TemplateModal({ template, onClose, onSuccess }: any) {
  const [nome, setNome] = useState(template?.nome || '')
  const [tipo, setTipo] = useState(template?.tipo || '')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    if (!nome || !tipo) {
      return toast.error('Preencha os campos obrigatórios.', {
        style: { background: '#B3CFE5', color: '#4A7FA7', border: 'none' },
        icon: <AlertCircle className="text-red-600 h-5 w-5" />,
      })
    }
    if (!template && !file) {
      return toast.error('Arquivo obrigatório.', {
        style: { background: '#B3CFE5', color: '#4A7FA7', border: 'none' },
        icon: <AlertCircle className="text-red-600 h-5 w-5" />,
      })
    }

    setLoading(true)
    try {
      let arquivo_url = template?.arquivo_url

      if (file) {
        if (!file.name.endsWith('.docx')) {
          throw new Error('Apenas arquivos .docx são permitidos.')
        }
        if (file.size > 10 * 1024 * 1024) {
          throw new Error('Arquivo maior que 10MB.')
        }

        const fileName = `template-${Date.now()}.docx`
        const { error: uploadError } = await supabase.storage
          .from('bender_templates')
          .upload(fileName, file)
        if (uploadError) throw new Error('Falha no upload.')

        const {
          data: { publicUrl },
        } = supabase.storage.from('bender_templates').getPublicUrl(fileName)
        arquivo_url = publicUrl
      }

      if (template) {
        await supabase.from('templates').update({ nome, tipo, arquivo_url }).eq('id', template.id)
      } else {
        await supabase.from('templates').insert({ nome, tipo, arquivo_url })
      }

      toast.success('Template salvo com sucesso!', {
        style: { background: '#B3CFE5', color: '#1A3D63', border: 'none' },
        icon: <CheckCircle2 className="text-green-600 h-5 w-5" />,
      })
      onSuccess()
    } catch (err: any) {
      toast.error(err.message, {
        style: { background: '#B3CFE5', color: '#4A7FA7', border: 'none' },
        icon: <AlertCircle className="text-red-600 h-5 w-5" />,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-bender-offwhite border-t-4 border-t-bender-denim border-x-0 border-b-0 sm:max-w-2xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-[24px] font-bold text-bender-navy">
            {template ? 'Editar Template' : 'Adicionar Template'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label className="text-bender-navy font-semibold text-[14px]">Nome do Template *</Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              maxLength={100}
              className="bg-bender-pale border-2 border-bender-steel text-bender-navy text-[16px] min-h-[44px] focus-visible:ring-0 focus-visible:border-[3px] focus-visible:border-bender-denim transition-all"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-bender-navy font-semibold text-[14px]">Tipo *</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger className="bg-bender-pale border-2 border-bender-steel text-bender-navy text-[16px] min-h-[44px] focus:ring-0 focus:border-[3px] focus:border-bender-denim transition-all font-medium">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent className="bg-bender-offwhite border-2 border-bender-steel shadow-xl">
                {TIPOS.map((t) => (
                  <SelectItem
                    key={t}
                    value={t}
                    className="text-bender-navy focus:bg-bender-pale/50 font-medium cursor-pointer text-base"
                  >
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-bender-navy font-semibold text-[14px]">
              Arquivo .docx {template ? '(Opcional para manter o atual)' : '*'}
            </Label>
            <Input
              type="file"
              accept=".docx"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="bg-bender-pale border-2 border-bender-steel text-bender-navy text-[16px] min-h-[44px] focus-visible:ring-0 focus-visible:border-[3px] focus-visible:border-bender-denim transition-all file:text-bender-navy file:font-semibold cursor-pointer"
            />
          </div>
          <div className="bg-bender-pale p-5 rounded-lg border-2 border-bender-steel/50 text-sm shadow-inner">
            <h4 className="font-bold text-bender-navy mb-4 text-base">Placeholders Disponíveis</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-bender-navy">
              <div className="bg-bender-offwhite/50 p-3 rounded-md border border-bender-steel/20">
                <strong className="block mb-1">Cliente:</strong>
                <code className="text-xs break-words block">{`{{CLI_NOME}}, {{CLI_CPF}}, {{CLI_EMAIL}}, {{CLI_ENDERECO_OBRA}}`}</code>
              </div>
              <div className="bg-bender-offwhite/50 p-3 rounded-md border border-bender-steel/20">
                <strong className="block mb-1">Bender:</strong>
                <code className="text-xs break-words block">{`{{REPRESENTANTE_BENDER_NOME}}, {{CONSULTOR_NOME}}, {{ANALISTA_NOME}}`}</code>
              </div>
              <div className="bg-bender-offwhite/50 p-3 rounded-md border border-bender-steel/20">
                <strong className="block mb-1">Financeiro:</strong>
                <code className="text-xs break-words block">{`{{TABELA_PRODUTOS_SERVICOS}}, {{TOTAL_PRODUTOS}}, {{VALOR_PARCELA}}`}</code>
              </div>
              <div className="bg-bender-offwhite/50 p-3 rounded-md border border-bender-steel/20">
                <strong className="block mb-1">Datas:</strong>
                <code className="text-xs break-words block">{`{{DATA_CONTRATO_EXTENSO}}, {{DATA_MEDIDA_FINA}}, {{DATA_ENTREGA_ESTIMADA}}`}</code>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
          <Button
            onClick={onClose}
            className="bg-bender-steel text-bender-offwhite hover:bg-bender-steel/90 min-h-[44px] px-6 py-3 rounded-lg text-base font-semibold w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="bg-bender-denim text-bender-offwhite hover:bg-bender-denim/90 min-h-[44px] px-6 py-3 rounded-lg text-base font-semibold w-full sm:w-auto"
          >
            {loading ? 'Salvando...' : 'Salvar Template'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
