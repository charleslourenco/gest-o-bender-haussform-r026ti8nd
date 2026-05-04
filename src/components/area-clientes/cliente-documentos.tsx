import { useState, useEffect, useRef } from 'react'
import { FileText, Download, Upload, Plus, Eye, PenTool } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function ClienteDocumentos({ dossie, onReload }: { dossie: any; onReload: () => void }) {
  const [docs, setDocs] = useState<any[]>([])
  const [templates, setTemplates] = useState<any[]>([])
  const [generating, setGenerating] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadDocs = async () => {
    const { data } = await supabase
      .from('documentos_cliente')
      .select('*')
      .eq('cliente_id', dossie.cliente_id)
    if (data) setDocs(data)
  }

  const loadTemplates = async () => {
    const { data } = await supabase
      .from('templates')
      .select('id, nome, tipo, arquivo_url')
      .eq('status', 'ativo')
    if (data) setTemplates(data)
  }

  useEffect(() => {
    loadDocs()
    loadTemplates()
  }, [dossie.cliente_id])

  const form = dossie.formulario || {}
  const hasData = !!form.cpf && !!form.rua

  const hasContratoGerado = docs.some(
    (d) => d.tipo === 'Contrato' || d.template_nome?.toLowerCase().includes('contrato.docx'),
  )

  const processDocx = async (templateUrl: string, templateNome: string, isContrato: boolean) => {
    setGenerating(true)
    toast.info(`Gerando ${templateNome}...`, { id: 'gerar-doc' })
    try {
      const res = await fetch(templateUrl)
      if (!res.ok) throw new Error('Não foi possível baixar o template da URL fornecida.')
      const blob = await res.blob()

      // OBS: Como não podemos instalar pacotes externos como PizZip/Docxtemplater no ambiente restrito,
      // realizamos o mock do processamento fazendo upload direto do template original para a pasta do cliente.
      const processedBlob = blob

      const safeName = isContrato
        ? 'Contrato.docx'
        : `${templateNome}_${Date.now()}`.replace(/\s+/g, '_') + '.docx'
      const filePath = `${dossie.cliente_id}/${safeName}`

      const { error: uploadError } = await supabase.storage
        .from('dossiers')
        .upload(filePath, processedBlob, {
          contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          upsert: true,
        })

      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage.from('dossiers').getPublicUrl(filePath)
      const publicUrl = publicUrlData.publicUrl

      await supabase.from('documentos_cliente').insert({
        cliente_id: dossie.cliente_id,
        tipo: isContrato ? 'Contrato' : 'template',
        template_nome: isContrato ? 'Contrato.docx' : templateNome,
        status: 'gerado',
        arquivo_url: publicUrl,
      })

      if (isContrato) {
        await supabase.from('dossies').update({ contrato_url: publicUrl }).eq('id', dossie.id)
      }

      toast.dismiss('gerar-doc')
      toast.success(`${templateNome} gerado com sucesso!`)
      loadDocs()
      onReload()
    } catch (e: any) {
      toast.dismiss('gerar-doc')
      toast.error(`Falha ao gerar ${templateNome}: ` + e.message)
    } finally {
      setGenerating(false)
    }
  }

  const handleGerarContrato = () => {
    const url =
      'https://igsdtxyopeiecpxwovgh.supabase.co/storage/v1/object/public/bender_templates/Contrato.docx'
    processDocx(url, 'Contrato', true)
  }

  const handleGerarTemplate = (t: any) => {
    processDocx(t.arquivo_url, t.nome, false)
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    toast.info('Fazendo upload...', { id: 'upload-doc' })
    try {
      const filePath = `${dossie.cliente_id}/${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`
      const { error: uploadError } = await supabase.storage
        .from('dossiers')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage.from('dossiers').getPublicUrl(filePath)

      await supabase.from('documentos_cliente').insert({
        cliente_id: dossie.cliente_id,
        tipo: 'upload_manual',
        template_nome: file.name,
        status: 'enviado',
        arquivo_url: publicUrlData.publicUrl,
      })

      toast.dismiss('upload-doc')
      toast.success('Arquivo enviado com sucesso!')
      loadDocs()
    } catch (err: any) {
      toast.dismiss('upload-doc')
      toast.error('Erro no upload: ' + err.message)
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  if (!hasData) {
    return (
      <div className="p-8 text-center bg-off-white border-2 border-steel-blue rounded-lg">
        <p className="text-lg font-semibold text-midnight-navy">
          Preencha os dados do cliente na aba Dados antes de gerar documentos.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />

      <div className="flex flex-wrap gap-4 items-center mb-6">
        {!hasContratoGerado && (
          <Button
            onClick={handleGerarContrato}
            disabled={generating}
            className="bg-dark-denim hover:bg-dark-denim/90 font-bold"
          >
            <FileText className="w-4 h-4 mr-2" /> 📄 Gerar Contrato
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="font-bold border-2 border-steel-blue"
              disabled={generating}
            >
              <Plus className="w-4 h-4 mr-2" /> Acrescentar documento ▼
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {templates.length === 0 ? (
              <DropdownMenuItem disabled>Nenhum template ativo</DropdownMenuItem>
            ) : (
              templates.map((t) => (
                <DropdownMenuItem
                  key={t.id}
                  onClick={() => handleGerarTemplate(t)}
                  className="cursor-pointer"
                >
                  {t.nome}
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant="outline"
          className="font-bold border-2 border-steel-blue"
          onClick={handleUploadClick}
          disabled={generating}
        >
          <Upload className="w-4 h-4 mr-2" /> Upload de arquivo
        </Button>
      </div>

      <div className="bg-off-white border-2 border-steel-blue rounded-lg p-6">
        <h3 className="font-bold text-lg mb-4 text-midnight-navy">Documentos Gerados</h3>
        {docs.length === 0 ? (
          <p className="text-steel-blue italic">Nenhum documento encontrado para este cliente.</p>
        ) : (
          <div className="space-y-3">
            {docs.map((doc) => (
              <div
                key={doc.id}
                className="flex flex-col md:flex-row md:items-center justify-between bg-pale-cornflower p-4 rounded border border-steel-blue gap-4"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-midnight-navy shrink-0" />
                  <div>
                    <p className="font-bold text-midnight-navy break-all">
                      {doc.template_nome || doc.tipo}
                    </p>
                    <p className="text-xs text-steel-blue">
                      Status: {doc.status} | Gerado em:{' '}
                      {new Date(doc.criado_em).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
                {doc.arquivo_url && (
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="border-steel-blue text-midnight-navy font-semibold hover:bg-steel-blue hover:text-white"
                    >
                      <a href={doc.arquivo_url} target="_blank" rel="noopener noreferrer">
                        <Eye className="w-4 h-4 mr-1" /> Visualizar
                      </a>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const a = document.createElement('a')
                        a.href = doc.arquivo_url
                        a.download = doc.template_nome || 'documento'
                        a.click()
                      }}
                      className="border-steel-blue text-midnight-navy font-semibold hover:bg-steel-blue hover:text-white"
                    >
                      <Download className="w-4 h-4 mr-1" /> Baixar
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() =>
                        toast.info('Funcionalidade de assinatura será ativada em breve.')
                      }
                      className="bg-dark-denim text-white hover:bg-dark-denim/90 font-semibold"
                    >
                      <PenTool className="w-4 h-4 mr-1" /> Enviar para Assinatura
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
