import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Trash2, Download, Upload } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Props {
  entityId: string
  entityType: 'clt' | 'pj'
}

export function DocumentosAba({ entityId, entityType }: Props) {
  const [docs, setDocs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const fetchDocs = async () => {
    const field = entityType === 'clt' ? 'clt_id' : 'pj_id'
    const { data } = await supabase
      .from('documentos_equipe')
      .select('*')
      .eq(field, entityId)
      .order('criado_em', { ascending: false })
    if (data) setDocs(data)
  }

  useEffect(() => {
    fetchDocs()
  }, [entityId, entityType])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    const filename = `${entityId}/${Date.now()}_${file.name}`
    const { error: upErr } = await supabase.storage.from('documentos_equipe').upload(filename, file)

    if (upErr) {
      toast({ title: 'Erro ao enviar arquivo', description: upErr.message, variant: 'destructive' })
      setLoading(false)
      return
    }

    const field = entityType === 'clt' ? 'clt_id' : 'pj_id'
    await supabase.from('documentos_equipe').insert({
      [field]: entityId,
      nome: file.name,
      arquivo_url: filename,
      tipo: file.type,
    })

    toast({ title: 'Arquivo enviado com sucesso!' })
    fetchDocs()
    setLoading(false)
  }

  const handleDownload = (path: string) => {
    const { data } = supabase.storage.from('documentos_equipe').getPublicUrl(path)
    if (data?.publicUrl) window.open(data.publicUrl, '_blank')
  }

  const handleRemove = async (id: string, path: string) => {
    if (!confirm('Deseja realmente remover este arquivo?')) return
    await supabase.storage.from('documentos_equipe').remove([path])
    await supabase.from('documentos_equipe').delete().eq('id', id)
    fetchDocs()
  }

  return (
    <div className="space-y-4 py-4">
      <div className="flex justify-between items-center bg-muted/30 p-4 rounded-lg border border-border">
        <div>
          <h3 className="font-semibold text-sm">Arquivos da Pasta</h3>
          <p className="text-xs text-muted-foreground">Envie CNH, CTPS, Contratos e Comprovantes</p>
        </div>
        <Button onClick={() => fileRef.current?.click()} variant="default" disabled={loading}>
          <Upload className="w-4 h-4 mr-2" /> {loading ? 'Enviando...' : 'Enviar Arquivo'}
        </Button>
        <input type="file" className="hidden" ref={fileRef} onChange={handleUpload} />
      </div>

      <div className="space-y-2">
        {docs.length === 0 && (
          <div className="text-sm text-center text-muted-foreground p-8 border rounded-lg border-dashed">
            Nenhum documento anexado ainda.
          </div>
        )}
        {docs.map((d) => (
          <div
            key={d.id}
            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
          >
            <span className="text-sm font-medium truncate flex-1">{d.nome}</span>
            <div className="flex gap-2 shrink-0">
              <Button
                size="icon"
                variant="secondary"
                onClick={() => handleDownload(d.arquivo_url)}
                title="Baixar Arquivo"
              >
                <Download className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="destructive"
                onClick={() => handleRemove(d.id, d.arquivo_url)}
                title="Excluir Arquivo"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
