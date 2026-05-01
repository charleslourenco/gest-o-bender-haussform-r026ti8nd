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
      return toast.error('Preencha os campos obrigatórios.')
    }
    if (!template && !file) {
      return toast.error('Arquivo obrigatório.')
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

      toast.success('Template salvo com sucesso!')
      onSuccess()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl p-6 overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {template ? 'Editar Template' : 'Adicionar Template'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label className="text-foreground font-medium text-sm">Nome do Template *</Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              maxLength={100}
              className="bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-foreground font-medium text-sm">Tipo *</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {TIPOS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-foreground font-medium text-sm">
              Arquivo .docx {template ? '(Opcional para manter o atual)' : '*'}
            </Label>
            <Input
              type="file"
              accept=".docx"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="bg-background file:text-foreground file:font-medium cursor-pointer"
            />
          </div>
          <div className="bg-muted/50 p-5 rounded-lg border border-border text-sm">
            <h4 className="font-medium mb-4">Placeholders Disponíveis</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-foreground">
              <div className="bg-background p-3 rounded-md border">
                <strong className="block mb-1 text-xs">Cliente:</strong>
                <code className="text-xs text-muted-foreground break-words block">{`{{CLI_NOME}}, {{CLI_CPF}}, {{CLI_EMAIL}}, {{CLI_ENDERECO_OBRA}}`}</code>
              </div>
              <div className="bg-background p-3 rounded-md border">
                <strong className="block mb-1 text-xs">Bender:</strong>
                <code className="text-xs text-muted-foreground break-words block">{`{{REPRESENTANTE_BENDER_NOME}}, {{CONSULTOR_NOME}}, {{ANALISTA_NOME}}`}</code>
              </div>
              <div className="bg-background p-3 rounded-md border">
                <strong className="block mb-1 text-xs">Financeiro:</strong>
                <code className="text-xs text-muted-foreground break-words block">{`{{TABELA_PRODUTOS_SERVICOS}}, {{TOTAL_PRODUTOS}}, {{VALOR_PARCELA}}`}</code>
              </div>
              <div className="bg-background p-3 rounded-md border">
                <strong className="block mb-1 text-xs">Datas:</strong>
                <code className="text-xs text-muted-foreground break-words block">{`{{DATA_CONTRATO_EXTENSO}}, {{DATA_MEDIDA_FINA}}, {{DATA_ENTREGA_ESTIMADA}}`}</code>
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading} className="w-full sm:w-auto">
            {loading ? 'Salvando...' : 'Salvar Template'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
