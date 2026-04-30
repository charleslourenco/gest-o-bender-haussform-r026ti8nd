import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
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
    toast.success('Configuração salva!', {
      style: { background: '#B3CFE5', color: '#1A3D63', border: 'none' },
      icon: <CheckCircle2 className="text-green-600 h-5 w-5" />,
    })
    setConfigModalOpen(false)
    fetchData()
  }

  const allConfigured = docs.every((d) => d.template_id)

  return (
    <div className="bg-bender-offwhite p-6 space-y-6 rounded-b-lg">
      {allConfigured && !loading && (
        <div className="bg-bender-offwhite border-2 border-bender-steel/20 p-4 rounded-lg flex items-center gap-3 shadow-sm">
          <CheckCircle2 className="h-6 w-6 text-green-600" />
          <span className="font-semibold text-bender-navy text-base">
            Todos os documentos obrigatórios estão configurados!
          </span>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full bg-bender-pale rounded-lg" />
          <Skeleton className="h-12 w-full bg-bender-pale rounded-lg" />
          <Skeleton className="h-12 w-full bg-bender-pale rounded-lg" />
        </div>
      ) : (
        <>
          {/* Mobile View */}
          <div className="grid grid-cols-1 md:hidden gap-4">
            {docs.map((d) => {
              const t = templates.find((temp) => temp.id === d.template_id)
              return (
                <div
                  key={d.tipo}
                  className="bg-bender-offwhite border-2 border-bender-steel/20 p-4 rounded-lg flex flex-col gap-3 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={d.template_id != null}
                      className="h-6 w-6 rounded-md border-2 border-bender-steel data-[state=checked]:bg-bender-denim data-[state=checked]:border-bender-denim data-[state=checked]:text-bender-offwhite transition-all"
                    />
                    <span className="font-bold text-bender-navy text-base flex items-center gap-2">
                      {d.tipo}
                      {!d.status && (
                        <span className="bg-bender-steel text-bender-offwhite text-xs px-2 py-1 rounded-md font-semibold">
                          Inativo
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="text-bender-navy text-sm flex flex-col">
                    <span className="font-semibold mb-1">Template:</span>
                    {t ? (
                      <span className="font-medium">{t.nome}</span>
                    ) : (
                      <span className="text-bender-steel italic">Não configurado</span>
                    )}
                  </div>
                  <div className="mt-2 pt-4 border-t-2 border-bender-steel/20">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedDoc(d)
                        setSelectedTemplateId(d.template_id || 'none')
                        setConfigModalOpen(true)
                      }}
                      className="w-full border-2 border-bender-steel text-bender-navy hover:bg-bender-pale/50 min-h-[44px] text-base font-semibold"
                    >
                      Configurar
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Desktop View */}
          <div className="hidden md:block overflow-x-auto border-2 border-bender-steel/20 rounded-lg">
            <table className="w-full min-w-[800px]">
              <thead className="bg-bender-denim text-bender-offwhite">
                <tr>
                  <th className="p-4 text-left font-bold text-base w-20">Status</th>
                  <th className="p-4 text-left font-bold text-base">Documento</th>
                  <th className="p-4 text-left font-bold text-base">Template Vinculado</th>
                  <th className="p-4 text-right font-bold text-base">Ação</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((d) => {
                  const t = templates.find((temp) => temp.id === d.template_id)
                  return (
                    <tr
                      key={d.tipo}
                      className="border-b border-bender-steel/20 even:bg-bender-pale/30 odd:bg-bender-offwhite hover:bg-bender-pale/50 transition-colors"
                    >
                      <td className="p-4 text-center">
                        <Checkbox
                          checked={d.template_id != null}
                          className="h-6 w-6 rounded-md border-2 border-bender-steel data-[state=checked]:bg-bender-denim data-[state=checked]:border-bender-denim data-[state=checked]:text-bender-offwhite transition-all"
                        />
                      </td>
                      <td className="p-4 font-semibold text-bender-navy text-base">
                        <div className="flex items-center gap-2">
                          {d.tipo}
                          {!d.status && (
                            <span className="bg-bender-steel text-bender-offwhite text-xs px-2 py-1 rounded-md">
                              Inativo
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-bender-navy text-base font-medium">
                        {t ? (
                          t.nome
                        ) : (
                          <span className="text-bender-steel italic font-normal">
                            Não configurado
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSelectedDoc(d)
                            setSelectedTemplateId(d.template_id || 'none')
                            setConfigModalOpen(true)
                          }}
                          className="border-2 border-bender-steel text-bender-navy hover:bg-bender-pale/50 min-h-[44px] font-semibold text-base px-6"
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
        </>
      )}

      {configModalOpen && selectedDoc && (
        <Dialog open onOpenChange={setConfigModalOpen}>
          <DialogContent className="bg-bender-offwhite border-t-4 border-t-bender-denim border-x-0 border-b-0 sm:max-w-lg p-6 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-[24px] font-bold text-bender-navy">
                Configurar {selectedDoc.tipo}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <p className="text-base text-bender-navy font-medium mb-4">
                Selecione o template que será utilizado como padrão para este documento.
              </p>
              <div className="space-y-2">
                <span className="text-bender-navy font-semibold text-[14px]">Template</span>
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger className="bg-bender-pale border-2 border-bender-steel text-bender-navy text-[16px] min-h-[44px] focus:ring-0 focus:border-[3px] focus:border-bender-denim transition-all font-medium">
                    <SelectValue placeholder="Selecione um template..." />
                  </SelectTrigger>
                  <SelectContent className="bg-bender-offwhite border-2 border-bender-steel shadow-xl">
                    <SelectItem
                      value="none"
                      className="text-bender-navy focus:bg-bender-pale/50 font-medium cursor-pointer text-base"
                    >
                      Nenhum
                    </SelectItem>
                    {templates
                      .filter((t) => t.tipo === selectedDoc.tipo)
                      .map((t) => (
                        <SelectItem
                          key={t.id}
                          value={t.id}
                          className="text-bender-navy focus:bg-bender-pale/50 font-medium cursor-pointer text-base"
                        >
                          {t.nome}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
              <Button
                onClick={() => setConfigModalOpen(false)}
                className="bg-bender-steel text-bender-offwhite hover:bg-bender-steel/90 min-h-[44px] px-6 py-3 rounded-lg text-base font-semibold w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveConfig}
                className="bg-bender-denim text-bender-offwhite hover:bg-bender-denim/90 min-h-[44px] px-6 py-3 rounded-lg text-base font-semibold w-full sm:w-auto"
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
