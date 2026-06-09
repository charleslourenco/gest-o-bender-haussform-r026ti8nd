import { useState, useEffect } from 'react'
import { FileText, Download, Trash2, Plus, ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export function DocsModeloModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const [modelos, setModelos] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [isAdding, setIsAdding] = useState(false)

  const [nome, setNome] = useState('')
  const [file, setFile] = useState<File | null>(null)

  const loadModelos = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('modelos_arquivos_estaticos')
        .select('*')
        .order('criado_em', { ascending: false })
      if (error) throw error
      setModelos(data || [])
    } catch (e: any) {
      toast.error('Erro ao carregar modelos: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      loadModelos()
      setIsAdding(false)
      setNome('')
      setFile(null)
    }
  }, [open])

  const handleAdd = async () => {
    if (!nome.trim() || !file) {
      toast.error('Preencha o nome e selecione um arquivo.')
      return
    }

    toast.loading('Fazendo upload...', { id: 'upload-modelo' })
    try {
      const fileExt = file.name.split('.').pop()
      const safeName = nome.replace(/[^a-zA-Z0-9]/g, '_')
      const fileName = `${safeName}_${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('modelos_globais')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { error: dbError } = await supabase.from('modelos_arquivos_estaticos').insert({
        nome,
        arquivo_url: fileName,
      })

      if (dbError) throw dbError

      toast.success('Modelo adicionado com sucesso!')
      setIsAdding(false)
      setNome('')
      setFile(null)
      loadModelos()
    } catch (e: any) {
      toast.error('Erro ao adicionar modelo: ' + e.message)
    } finally {
      toast.dismiss('upload-modelo')
    }
  }

  const handleDelete = async (id: string, fileName: string) => {
    if (!confirm('Tem certeza que deseja excluir este modelo?')) return

    toast.loading('Excluindo...', { id: 'del-modelo' })
    try {
      const { error: dbError } = await supabase
        .from('modelos_arquivos_estaticos')
        .delete()
        .eq('id', id)

      if (dbError) throw dbError

      await supabase.storage.from('modelos_globais').remove([fileName])

      toast.success('Modelo excluído com sucesso!')
      loadModelos()
    } catch (e: any) {
      toast.error('Erro ao excluir: ' + e.message)
    } finally {
      toast.dismiss('del-modelo')
    }
  }

  const handleDownload = async (fileName: string, originalName: string) => {
    try {
      const { data, error } = await supabase.storage.from('modelos_globais').download(fileName)
      if (error) throw error

      if (data) {
        const objectUrl = URL.createObjectURL(data)
        const a = document.createElement('a')
        a.href = objectUrl
        const ext = fileName.split('.').pop()
        a.download = `${originalName}.${ext}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
      }
    } catch (e: any) {
      toast.error('Não foi possível baixar o arquivo.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Modelos de Documentos</DialogTitle>
        </DialogHeader>

        {isAdding ? (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 mb-4">
              <Button variant="ghost" size="icon" onClick={() => setIsAdding(false)}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <h3 className="font-semibold text-midnight-navy">Adicionar Novo Modelo</h3>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome do Modelo</Label>
                <Input
                  id="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Contrato Padrão 2026"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="arquivo">Arquivo (.doc, .docx)</Label>
                <Input
                  id="arquivo"
                  type="file"
                  accept=".doc,.docx"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsAdding(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAdd}>Salvar Modelo</Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button
                onClick={() => setIsAdding(true)}
                className="bg-steel-blue hover:bg-steel-blue/90 text-white shadow"
              >
                <Plus className="w-4 h-4 mr-2" /> Adicionar Novo Modelo
              </Button>
            </div>

            {loading ? (
              <p className="text-center text-muted-foreground py-8 animate-pulse">
                Carregando modelos...
              </p>
            ) : modelos.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 italic">
                Nenhum modelo estático encontrado.
              </p>
            ) : (
              <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2">
                {modelos.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-4 bg-white shadow-sm border border-slate-200 rounded-lg hover:border-steel-blue transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-6 h-6 text-midnight-navy shrink-0" />
                      <span className="font-bold text-midnight-navy">{m.nome}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(m.arquivo_url, m.nome)}
                        title="Download"
                        className="hover:bg-slate-100"
                      >
                        <Download className="w-4 h-4 mr-1" /> Baixar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(m.id, m.arquivo_url)}
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
