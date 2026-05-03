import { useEffect, useState, useRef } from 'react'
import { ArrowLeft, Folder, Plus, FileText, Upload as UploadIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase/client'
import { Timeline } from './timeline'
import { DocumentRow } from './document-row'
import { SignatureModal } from './signature-modal'
import { toast } from 'sonner'

export function ClienteFolder({ formId, onBack }: { formId: string; onBack: () => void }) {
  const [form, setForm] = useState<any>(null)
  const [files, setFiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDocForSig, setSelectedDocForSig] = useState<any>(null)

  const [isAddTmplOpen, setIsAddTmplOpen] = useState(false)
  const [isAddManOpen, setIsAddManOpen] = useState(false)
  const [templates, setTemplates] = useState<any[]>([])
  const [manFile, setManFile] = useState<File | null>(null)
  const [manFileName, setManFileName] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    setLoading(true)
    try {
      const { data: formData } = await supabase
        .from('formulario_comercial')
        .select('*, cliente:clientes(*)')
        .eq('id', formId)
        .single()
      if (!formData) return

      let vendedor = formData.dados_etapa_1?.vendedor_nome || '-'
      if (formData.usuario_id || formData.user_id) {
        const { data: uData } = await supabase
          .from('users')
          .select('nome')
          .eq('id', formData.usuario_id || formData.user_id)
          .single()
        if (uData?.nome) vendedor = uData.nome
      }
      formData.vendedorNome = vendedor

      const dossierId = formData.cliente?.nome || formData.cliente_id || formId
      const { data: storageFiles } = await supabase.storage.from('dossiers').list(dossierId)
      if (storageFiles) {
        setFiles(
          storageFiles
            .filter((f) => f.name !== '.emptyFolderPlaceholder')
            .map((f) => ({
              id: f.id,
              title: f.name,
              actions: ['ler', 'baixar', 'enviar'],
              path: `${dossierId}/${f.name}`,
            })),
        )
      }
      setForm(formData)
      const { data: tmpls } = await supabase.from('templates').select('*')
      setTemplates(tmpls || [])
    } catch {
      /* intentionally ignored */
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [formId])

  const handleUseTmpl = async (tmpl: any) => {
    try {
      const { data: fData, error: dErr } = await supabase.storage
        .from('templates')
        .download(tmpl.arquivo_url)
      if (dErr) throw dErr
      const dId = form.cliente?.nome || form.cliente_id || formId
      const e = tmpl.arquivo_url.split('.').pop()
      const { error: uErr } = await supabase.storage
        .from('dossiers')
        .upload(`${dId}/${tmpl.nome}_Template.${e}`, fData, { upsert: true })
      if (uErr) throw uErr
      toast.success('Adicionado com sucesso!')
      setIsAddTmplOpen(false)
      load()
    } catch (e: any) {
      toast.error('Erro: ' + e.message)
    }
  }

  const handleManUpload = async () => {
    if (!manFile || !manFileName) return toast.error('Preencha os dados')
    try {
      const dId = form.cliente?.nome || form.cliente_id || formId
      const e = manFile.name.split('.').pop()
      const { error: uErr } = await supabase.storage
        .from('dossiers')
        .upload(`${dId}/${manFileName}.${e}`, manFile, { upsert: true })
      if (uErr) throw uErr
      toast.success('Enviado com sucesso!')
      setIsAddManOpen(false)
      setManFile(null)
      setManFileName('')
      load()
    } catch (e: any) {
      toast.error('Erro: ' + e.message)
    }
  }

  if (loading && !form) return <div className="p-8 text-center animate-pulse">Carregando...</div>
  if (!form) return <div className="p-8 text-center text-destructive">Não encontrado.</div>

  let prods =
    typeof form.produtos_servicos === 'string'
      ? JSON.parse(form.produtos_servicos || '[]')
      : form.produtos_servicos || []
  const valTot = Array.isArray(prods)
    ? prods.reduce(
        (a: number, p: any) =>
          a + Number(p.valor_unitario || 0) * Number(p.qtd || p.quantidade || 1),
        0,
      ) - (Number(form.desconto) || 0)
    : 0
  const contratos = files.filter((f) => f.title.toLowerCase().includes('contrato'))
  const outros = files.filter((f) => !f.title.toLowerCase().includes('contrato'))

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto w-full space-y-6 animate-fade-in">
      <div className="flex gap-4 border-b pb-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{form.cliente?.nome || '-'}</h1>
          <p className="text-muted-foreground text-sm">
            Vendedor: {form.vendedorNome} | Valor:{' '}
            {valTot > 0
              ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                  valTot,
                )
              : '-'}{' '}
            | Data: {form.criado_em ? new Date(form.criado_em).toLocaleDateString('pt-BR') : '-'}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card p-5 rounded-lg border shadow-sm">
            <div className="flex justify-between mb-4">
              <h2 className="text-lg font-semibold flex gap-2">
                <Folder className="w-5 h-5 text-primary" /> Arquivos
              </h2>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-2" /> Adicionar Documento
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsAddTmplOpen(true)}>
                    Usar Template da Fábrica
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsAddManOpen(true)}>
                    Upload Manual
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="space-y-3">
              {files.length === 0 ? (
                <div className="text-center py-8 bg-muted/30 rounded-md border-dashed">-</div>
              ) : (
                <>
                  {contratos.map((f) => (
                    <DocumentRow key={f.id} doc={f} onSign={setSelectedDocForSig} />
                  ))}
                  {contratos.length > 0 && outros.length > 0 && <div className="border-t my-2" />}
                  {outros.map((f) => (
                    <DocumentRow key={f.id} doc={f} onSign={setSelectedDocForSig} />
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
        <div>
          <Timeline clienteId={form.cliente?.id} />
        </div>
      </div>

      <SignatureModal
        doc={selectedDocForSig}
        clienteId={form.cliente?.id}
        onClose={() => setSelectedDocForSig(null)}
      />

      <Dialog open={isAddTmplOpen} onOpenChange={setIsAddTmplOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Usar Template</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2 mt-4">
            {templates
              .filter((t) => t.tipo !== 'contrato')
              .map((t) => (
                <Button
                  key={t.id}
                  variant="outline"
                  className="justify-start h-auto py-3"
                  onClick={() => handleUseTmpl(t)}
                >
                  <FileText className="w-4 h-4 mr-3" />{' '}
                  <div className="text-left">
                    <div className="font-medium">{t.nome}</div>
                    <div className="text-xs text-muted-foreground">{t.tipo}</div>
                  </div>
                </Button>
              ))}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={isAddManOpen} onOpenChange={setIsAddManOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Manual</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Nome do Documento (sem extensão)</Label>
              <Input value={manFileName} onChange={(e) => setManFileName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Arquivo</Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => fileRef.current?.click()}
                  className="w-full"
                >
                  <UploadIcon className="w-4 h-4 mr-2" /> {manFile ? manFile.name : 'Selecionar'}
                </Button>
                <input
                  type="file"
                  ref={fileRef}
                  className="hidden"
                  onChange={(e) => setManFile(e.target.files?.[0] || null)}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsAddManOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleManUpload}>Enviar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
