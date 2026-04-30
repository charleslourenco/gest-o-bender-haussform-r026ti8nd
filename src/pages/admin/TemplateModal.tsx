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
        style: { background: '#4A7FA7', color: '#F6FAFD' },
      })
    }
    if (!template && !file) {
      return toast.error('Arquivo obrigatório.', {
        style: { background: '#4A7FA7', color: '#F6FAFD' },
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
        style: { background: '#1A3D63', color: '#F6FAFD' },
      })
      onSuccess()
    } catch (err: any) {
      toast.error(err.message, { style: { background: '#4A7FA7', color: '#F6FAFD' } })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-bender-offwhite sm:max-w-2xl border-bender-steel">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-bender-navy">
            {template ? 'Editar Template' : 'Adicionar Template'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label className="text-bender-navy font-semibold">Nome do Template *</Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              maxLength={100}
              className="bg-bender-pale border-bender-steel text-bender-navy mt-1"
            />
          </div>
          <div>
            <Label className="text-bender-navy font-semibold">Tipo *</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger className="bg-bender-pale border-bender-steel text-bender-navy mt-1">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent className="bg-bender-offwhite border-bender-steel">
                {TIPOS.map((t) => (
                  <SelectItem key={t} value={t} className="text-bender-navy focus:bg-bender-pale">
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-bender-navy font-semibold">
              Arquivo .docx {template ? '(Opcional para manter o atual)' : '*'}
            </Label>
            <Input
              type="file"
              accept=".docx"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="bg-bender-pale border-bender-steel text-bender-navy mt-1"
            />
          </div>
          <div className="bg-bender-pale p-4 rounded-lg border border-bender-steel text-sm">
            <h4 className="font-bold text-bender-navy mb-2">Placeholders Disponíveis</h4>
            <div className="grid grid-cols-2 gap-4 text-bender-navy">
              <div>
                <strong>Cliente:</strong>
                <br />
                {`{{CLI_NOME}}, {{CLI_CPF}}, {{CLI_EMAIL}}, {{CLI_ENDERECO_OBRA}}`}
              </div>
              <div>
                <strong>Bender:</strong>
                <br />
                {`{{REPRESENTANTE_BENDER_NOME}}, {{CONSULTOR_NOME}}, {{ANALISTA_NOME}}`}
              </div>
              <div>
                <strong>Financeiro:</strong>
                <br />
                {`{{TABELA_PRODUTOS_SERVICOS}}, {{TOTAL_PRODUTOS}}, {{VALOR_PARCELA}}`}
              </div>
              <div>
                <strong>Datas:</strong>
                <br />
                {`{{DATA_CONTRATO_EXTENSO}}, {{DATA_MEDIDA_FINA}}, {{DATA_ENTREGA_ESTIMADA}}`}
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <Button
            onClick={onClose}
            className="bg-bender-steel text-bender-offwhite hover:bg-bender-steel/90"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="bg-bender-denim text-bender-offwhite hover:bg-bender-denim/90"
          >
            {loading ? 'Salvando...' : 'Salvar Template'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
