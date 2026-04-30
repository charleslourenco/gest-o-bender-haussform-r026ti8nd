import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const DOC_TIPOS = [
  'Contrato',
  'Termo de Vistoria',
  'Representação',
  'Recusa',
  'Alteração',
  'Não Conformidade',
  'Garantia',
]

export function DocumentosTab() {
  const [docs, setDocs] = useState<any[]>([])
  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [configModalOpen, setConfigModalOpen] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState<any>(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const [{ data: dData }, { data: tData }] = await Promise.all([
      supabase.from('documentos_obrigatorios').select('*'),
      supabase.from('templates').select('id, nome, tipo'),
    ])

    const mergedDocs = DOC_TIPOS.map((tipo) => {
      const existing = dData?.find((d) => d.tipo === tipo)
      return existing || { id: null, tipo, template_id: null, status: true }
    })

    setDocs(mergedDocs)
    setTemplates(tData || [])
    setLoading(false)
  }

  const handleSaveConfig = async () => {
    if (!selectedDoc) return
    const finalTemplateId = selectedTemplateId === 'none' ? null : selectedTemplateId

    if (selectedDoc.id) {
      await supabase
        .from('documentos_obrigatorios')
        .update({ template_id: finalTemplateId })
        .eq('id', selectedDoc.id)
    } else {
      await supabase
        .from('documentos_obrigatorios')
        .insert({ tipo: selectedDoc.tipo, template_id: finalTemplateId, status: true })
    }
    toast.success('Configuração salva!', { style: { background: '#1A3D63', color: '#F6FAFD' } })
    setConfigModalOpen(false)
    fetchData()
  }

  const allConfigured = docs.every((d) => d.template_id)

  return (
    <div className="space-y-6">
      {allConfigured && !loading && (
        <div className="bg-bender-denim text-bender-offwhite p-4 rounded-lg flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 text-bender-pale" />
          <span className="font-semibold">
            Todos os documentos obrigatórios estão configurados!
          </span>
        </div>
      )}

      <div className="bg-bender-offwhite rounded-lg border border-bender-steel overflow-hidden">
        <table className="w-full">
          <thead className="bg-bender-denim text-bender-offwhite">
            <tr>
              <th className="p-4 text-left font-bold border-b border-bender-steel">Status</th>
              <th className="p-4 text-left font-bold border-b border-bender-steel">Documento</th>
              <th className="p-4 text-left font-bold border-b border-bender-steel">
                Template Vinculado
              </th>
              <th className="p-4 text-right font-bold border-b border-bender-steel">Ação</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((d, idx) => {
              const t = templates.find((temp) => temp.id === d.template_id)
              return (
                <tr
                  key={d.tipo}
                  className={`border-b border-bender-steel ${
                    idx % 2 === 0 ? 'bg-bender-offwhite' : 'bg-bender-pale'
                  }`}
                >
                  <td className="p-4">
                    <Checkbox
                      checked={d.template_id != null}
                      className="border-bender-steel data-[state=checked]:bg-bender-denim data-[state=checked]:text-bender-offwhite"
                    />
                  </td>
                  <td className="p-4 font-medium text-bender-navy flex items-center gap-2">
                    {d.tipo}
                    {!d.status && (
                      <Badge variant="secondary" className="bg-bender-steel text-bender-offwhite">
                        Inativo
                      </Badge>
                    )}
                  </td>
                  <td className="p-4 text-bender-navy">
                    {t ? t.nome : <span className="text-bender-steel italic">Não configurado</span>}
                  </td>
                  <td className="p-4 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedDoc(d)
                        setSelectedTemplateId(d.template_id || 'none')
                        setConfigModalOpen(true)
                      }}
                      className="border-bender-steel text-bender-navy hover:bg-bender-pale"
                    >
                      Configurar
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {configModalOpen && selectedDoc && (
        <Dialog open onOpenChange={setConfigModalOpen}>
          <DialogContent className="bg-bender-offwhite border-bender-steel">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-bender-navy">
                Configurar {selectedDoc.tipo}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <p className="text-sm text-bender-navy mb-4">
                Selecione o template que será utilizado como padrão para este documento.
              </p>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger className="bg-bender-pale border-bender-steel text-bender-navy">
                  <SelectValue placeholder="Selecione um template..." />
                </SelectTrigger>
                <SelectContent className="bg-bender-offwhite border-bender-steel">
                  <SelectItem value="none" className="text-bender-navy focus:bg-bender-pale">
                    Nenhum
                  </SelectItem>
                  {templates
                    .filter((t) => t.tipo === selectedDoc.tipo)
                    .map((t) => (
                      <SelectItem
                        key={t.id}
                        value={t.id}
                        className="text-bender-navy focus:bg-bender-pale"
                      >
                        {t.nome}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <Button
                onClick={() => setConfigModalOpen(false)}
                className="bg-bender-steel text-bender-offwhite hover:bg-bender-steel/90"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveConfig}
                className="bg-bender-denim text-bender-offwhite hover:bg-bender-denim/90"
              >
                Salvar Configuração
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
