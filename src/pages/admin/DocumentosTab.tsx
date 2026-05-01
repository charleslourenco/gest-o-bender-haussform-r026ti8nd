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
    toast.success('Configuração salva!')
    setConfigModalOpen(false)
    fetchData()
  }

  const allConfigured = docs.every((d) => d.template_id)

  return (
    <div className="bg-card border text-card-foreground p-6 space-y-6 rounded-lg shadow-sm">
      {allConfigured && !loading && (
        <div className="bg-green-50 border border-green-200 p-4 rounded-lg flex items-center gap-3 shadow-sm">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <span className="font-medium text-green-900 text-sm">
            Todos os documentos obrigatórios estão configurados!
          </span>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full bg-muted rounded-lg" />
          <Skeleton className="h-12 w-full bg-muted rounded-lg" />
          <Skeleton className="h-12 w-full bg-muted rounded-lg" />
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
                  className="bg-background border p-4 rounded-lg flex flex-col gap-3 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <Checkbox checked={d.template_id != null} />
                    <span className="font-medium text-foreground text-sm flex items-center gap-2">
                      {d.tipo}
                      {!d.status && (
                        <span className="bg-muted text-muted-foreground text-xs px-2 py-1 rounded-md">
                          Inativo
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="text-foreground text-sm flex flex-col">
                    <span className="font-medium mb-1 text-muted-foreground">Template:</span>
                    {t ? (
                      <span>{t.nome}</span>
                    ) : (
                      <span className="text-muted-foreground italic">Não configurado</span>
                    )}
                  </div>
                  <div className="mt-2 pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedDoc(d)
                        setSelectedTemplateId(d.template_id || 'none')
                        setConfigModalOpen(true)
                      }}
                      className="w-full"
                    >
                      Configurar
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Desktop View */}
          <div className="hidden md:block overflow-x-auto border rounded-lg bg-background">
            <table className="w-full min-w-[800px] text-sm">
              <thead className="bg-muted text-muted-foreground border-b">
                <tr>
                  <th className="p-4 text-left font-medium w-20">Status</th>
                  <th className="p-4 text-left font-medium">Documento</th>
                  <th className="p-4 text-left font-medium">Template Vinculado</th>
                  <th className="p-4 text-right font-medium">Ação</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((d) => {
                  const t = templates.find((temp) => temp.id === d.template_id)
                  return (
                    <tr
                      key={d.tipo}
                      className="border-b hover:bg-muted/50 transition-colors last:border-0"
                    >
                      <td className="p-4 text-center">
                        <Checkbox checked={d.template_id != null} />
                      </td>
                      <td className="p-4 font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          {d.tipo}
                          {!d.status && (
                            <span className="bg-muted text-muted-foreground text-xs px-2 py-1 rounded-md">
                              Inativo
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-foreground">
                        {t ? (
                          t.nome
                        ) : (
                          <span className="text-muted-foreground italic">Não configurado</span>
                        )}
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
          <DialogContent className="sm:max-w-lg p-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">
                Configurar {selectedDoc.tipo}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <p className="text-sm text-muted-foreground mb-4">
                Selecione o template que será utilizado como padrão para este documento.
              </p>
              <div className="space-y-2">
                <span className="text-foreground font-medium text-sm">Template</span>
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione um template..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {templates
                      .filter((t) => t.tipo === selectedDoc.tipo)
                      .map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.nome}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setConfigModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveConfig}>Salvar Configuração</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
