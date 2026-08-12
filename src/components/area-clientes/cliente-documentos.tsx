import { useState, useEffect, useRef } from 'react'
import { FileText, Download, Upload, Plus, Eye, PenTool, Trash2, Send } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { SignatureModal } from './signature-modal'
import { DocsModeloModal } from './docs-modelo-modal'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { Progress } from '@/components/ui/progress'
import { isPdfDocument } from '@/lib/signature-utils'

export function ClienteDocumentos({ dossie, onReload }: { dossie: any; onReload: () => void }) {
  const [docs, setDocs] = useState<any[]>([])
  const [showDocsModelo, setShowDocsModelo] = useState(false)
  const [templates, setTemplates] = useState<any[]>([])
  const [generating, setGenerating] = useState(false)
  const [signatureDocs, setSignatureDocs] = useState<any[]>([])
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)

  const [uploadTipo, setUploadTipo] = useState('upload_manual')
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set())

  const fileInputRef = useRef<HTMLInputElement>(null)

  const toggleDocSelection = (docId: string) => {
    setSelectedDocIds((prev) => {
      const next = new Set(prev)
      if (next.has(docId)) next.delete(docId)
      else next.add(docId)
      return next
    })
  }

  const selectableDocs = docs.filter(
    (d) =>
      d.status !== 'processando' &&
      d.status !== 'Assinado' &&
      d.status !== 'concluido' &&
      d.status !== 'erro_assinatura' &&
      !d.envelope_id,
  )
  const allSelected =
    selectableDocs.length > 0 && selectableDocs.every((d) => selectedDocIds.has(d.id))
  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedDocIds(new Set())
    } else {
      setSelectedDocIds(new Set(selectableDocs.map((d) => d.id)))
    }
  }

  const selectedDocs = docs.filter((d) => selectedDocIds.has(d.id))
  const canBatchSign = selectedDocs.length > 0

  const [now, setNow] = useState(Date.now())
  const [localStartTimes, setLocalStartTimes] = useState<Record<string, number>>({})

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10000)
    return () => clearInterval(timer)
  }, [])

  const loadDocs = async () => {
    try {
      const projetoId = dossie.formulario_comercial_id || null

      let docsQuery = supabase
        .from('documentos_cliente')
        .select('*, clientes(nome)')
        .eq('cliente_id', dossie.cliente_id)

      if (projetoId) {
        docsQuery = docsQuery.eq('projeto_id', projetoId)
      }

      const { data: docsData, error: docsError } = await docsQuery.order('criado_em', {
        ascending: false,
      })

      if (docsError) throw docsError

      if (docsData) {
        const { data: assinaturasData } = await supabase
          .from('assinaturas')
          .select('id, status, documento_id')
          .eq('cliente_id', dossie.cliente_id)

        const docsWithAssinaturas = docsData.map((doc) => ({
          ...doc,
          assinaturas: assinaturasData?.filter((a) => a.documento_id === doc.arquivo_url) || [],
        }))

        setDocs(docsWithAssinaturas)
      }
    } catch (e: any) {
      console.error('Error loading docs:', e)
      toast.error('Erro ao carregar lista de documentos.')
    }
  }

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('templates')
        .select('id, nome, tipo')
        .eq('status', 'ativo')

      if (error) throw error
      if (data) setTemplates(data)
    } catch (err: any) {
      console.error('Erro ao carregar templates:', err)
      toast.error('Erro ao carregar templates de documento: ' + err.message)
    }
  }

  useEffect(() => {
    loadDocs()
    loadTemplates()

    const channel = supabase
      .channel('documentos_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documentos_cliente',
          filter: `cliente_id=eq.${dossie.cliente_id}`,
        },
        () => {
          loadDocs()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [dossie.cliente_id])

  const form = dossie.formulario || {}

  const getSignedUrl = async (originalUrl: string) => {
    if (!originalUrl) return ''
    try {
      if (originalUrl.startsWith('http')) {
        const match = originalUrl.match(
          /\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+?)(?:\?|$)/,
        )
        if (match) {
          const bucket = match[1]
          const path = decodeURIComponent(match[2])
          const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600)
          if (!error && data?.signedUrl) return data.signedUrl
        }
      } else {
        const { data, error } = await supabase.storage
          .from('bender_clientes')
          .createSignedUrl(originalUrl, 3600)
        if (!error && data?.signedUrl) return data.signedUrl
      }
    } catch (e: any) {
      console.error('Error generating signed URL:', e)
    }
    return originalUrl
  }

  const handleDeleteDoc = async (docId: string, nome: string) => {
    if (!confirm('Deseja realmente remover este documento?')) return
    try {
      const { error } = await supabase.from('documentos_cliente').delete().eq('id', docId)
      if (error) throw error

      const { data: authData } = await supabase.auth.getUser()
      const userName = authData.user?.user_metadata?.nome || authData.user?.email || 'Sistema'
      await supabase.from('timeline_eventos').insert({
        cliente_id: dossie.cliente_id,
        usuario_nome: userName,
        acao: `Documento ${nome} removido`,
      })

      toast.success('Documento removido com sucesso!')
      loadDocs()
      onReload()
    } catch (e: any) {
      toast.error('Erro ao remover documento: ' + e.message)
    }
  }

  const handleGerarTemplate = async (template: any) => {
    setGenerating(true)
    toast.loading(`Gerando ${template.nome}...`, { id: 'gerar-doc' })
    try {
      const isContrato =
        template.tipo === 'contrato' || template.nome.toLowerCase().includes('contrato')
      const docName = isContrato ? 'Contrato Unificado de Soluções para Interiores' : template.nome

      const { data: newDoc, error: insertError } = await supabase
        .from('documentos_cliente')
        .insert({
          cliente_id: dossie.cliente_id,
          projeto_id: dossie.formulario_comercial_id,
          template_id: template.id,
          tipo: template.tipo || 'documento',
          template_nome: docName,
          status: 'processando',
          conteudo_preenchido: 'Aguardando geração PDFMonkey...',
        })
        .select()
        .single()

      if (insertError) throw insertError

      const body = {
        action: 'salvar_novo_async',
        documento_id: newDoc.id,
        cliente_id: dossie.cliente_id,
        template_nome: template.nome,
      }

      const { data, error } = await supabase.functions.invoke('gerar_documento_cliente', { body })

      if (error)
        throw new Error(error.message || 'Falha na comunicação com o servidor ao gerar documento')
      if (data && !data.success)
        throw new Error(data.error || 'Erro desconhecido retornado pelo servidor')

      const { data: authData } = await supabase.auth.getUser()
      const userName = authData.user?.user_metadata?.nome || authData.user?.email || 'Sistema'
      await supabase.from('timeline_eventos').insert({
        cliente_id: dossie.cliente_id,
        usuario_nome: userName,
        acao: `Geração do documento ${template.nome} iniciada`,
      })

      setLocalStartTimes((prev) => ({ ...prev, [newDoc.id]: Date.now() }))

      toast.success(
        'Geração iniciada com sucesso. O PDF será disponibilizado em breve na lista abaixo.',
        {
          id: 'gerar-doc',
          duration: 8000,
        },
      )
      loadDocs()
      onReload()
    } catch (e: any) {
      toast.error(`Falha ao gerar ${template.nome}: ${e.message}`, { id: 'gerar-doc' })
    } finally {
      setGenerating(false)
    }
  }

  const handleUploadClick = (tipo: string) => {
    setUploadTipo(tipo)
    fileInputRef.current?.click()
  }

  const [batchUploadInfo, setBatchUploadInfo] = useState<{
    current: number
    total: number
    fileName: string
  } | null>(null)

  const uploadSingleFile = async (
    file: File,
    session: any,
    onProgress: (p: number) => void,
  ): Promise<{ success: boolean; fileName: string; error?: string }> => {
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      const filePath = `${dossie.cliente_id}/${uniqueSuffix}_${safeName}`

      const { error: uploadError } = await supabase.storage
        .from('bender_clientes')
        .upload(filePath, file, {
          upsert: false,
        })

      if (uploadError) throw uploadError

      onProgress(100)

      const { error: insertError } = await supabase.from('documentos_cliente').insert({
        cliente_id: dossie.cliente_id,
        projeto_id: dossie.formulario_comercial_id || null,
        tipo: uploadTipo === 'lista_materiais' ? 'lista_materiais' : 'upload_manual',
        template_nome: file.name,
        status: uploadTipo === 'lista_materiais' ? 'Pendente' : 'Concluído',
        arquivo_url: filePath,
        usuario_id: session.user.id,
      })

      if (insertError) throw insertError

      const userName = session.user?.user_metadata?.nome || session.user?.email || 'Sistema'
      await supabase.from('timeline_eventos').insert({
        cliente_id: dossie.cliente_id,
        usuario_nome: userName,
        acao: `Arquivo ${file.name} enviado (${uploadTipo === 'lista_materiais' ? 'Lista de Materiais' : 'Manual'})`,
      })

      return { success: true, fileName: file.name }
    } catch (err: any) {
      return { success: false, fileName: file.name, error: err.message || 'Erro desconhecido' }
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files
    if (!fileList || fileList.length === 0) return

    const files = Array.from(fileList)

    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      toast.error('Usuário não autenticado.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setUploadProgress(0)
    setBatchUploadInfo({ current: 0, total: files.length, fileName: files[0]?.name || '' })

    const toastId = 'upload-doc'
    if (files.length === 1) {
      toast.info('Fazendo upload...', { id: toastId })
    } else {
      toast.info(`Iniciando upload de ${files.length} arquivos...`, { id: toastId })
    }

    let successCount = 0
    const failedFiles: string[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      setBatchUploadInfo({ current: i + 1, total: files.length, fileName: file.name })

      const baseProgress = (i / files.length) * 100
      setUploadProgress(baseProgress)

      const interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev === null) return null
          const cap = baseProgress + (100 / files.length) * 0.9
          if (prev >= cap) return prev
          return prev + (cap - prev) * 0.15
        })
      }, 400)

      const result = await uploadSingleFile(file, session, () => {})

      clearInterval(interval)

      if (result.success) {
        successCount++
      } else {
        failedFiles.push(result.fileName)
        toast.error(`Falha ao enviar "${result.fileName}": ${result.error}`, {
          id: `upload-fail-${i}`,
          duration: 6000,
        })
      }

      setUploadProgress(((i + 1) / files.length) * 100)
    }

    setBatchUploadInfo(null)

    if (successCount > 0 && failedFiles.length === 0) {
      toast.success(
        files.length === 1
          ? 'Arquivo enviado com sucesso!'
          : `${successCount} de ${files.length} arquivos enviados com sucesso!`,
        { id: toastId },
      )
    } else if (successCount > 0 && failedFiles.length > 0) {
      toast.warning(
        `${successCount} de ${files.length} arquivos enviados. ${failedFiles.length} falharam.`,
        { id: toastId, duration: 7000 },
      )
    } else {
      toast.error('Nenhum arquivo pôde ser enviado.', { id: toastId })
    }

    loadDocs()
    onReload()

    setTimeout(() => {
      setUploadProgress(null)
    }, 1200)

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleRetryProcessing = async (doc: any) => {
    toast.loading('Reiniciando geração do PDF...', { id: 'retry-doc' })
    try {
      await supabase
        .from('documentos_cliente')
        .update({ status: 'processando', atualizado_em: new Date().toISOString() })
        .eq('id', doc.id)

      const body = {
        action: 'atualizar_pdf_async',
        documento_id: doc.id,
        cliente_id: dossie.cliente_id,
        template_nome: doc.template_nome,
      }

      const { data, error } = await supabase.functions.invoke('gerar_documento_cliente', { body })

      if (error)
        throw new Error(
          error.message || 'Falha na comunicação com o servidor ao reprocessar documento',
        )
      if (data && !data.success)
        throw new Error(data.error || 'Erro desconhecido retornado pelo servidor')

      setLocalStartTimes((prev) => ({ ...prev, [doc.id]: Date.now() }))

      toast.success('Reprocessamento iniciado. Aguarde um instante.', { id: 'retry-doc' })
      loadDocs()
    } catch (e: any) {
      toast.error(`Falha: ${e.message}`, { id: 'retry-doc' })
    }
  }

  const handleRetrySignature = async (doc: any) => {
    toast.loading('Reestampando assinaturas no documento...', { id: 'retry-sig' })
    try {
      const body = {
        documento_id: doc.arquivo_url,
        cliente_id: dossie.cliente_id,
        envelope_id: doc.envelope_id,
        manual: true,
      }

      const { data, error } = await supabase.functions.invoke('finalize-signature-document', {
        body,
      })

      if (error) throw new Error(error.message || 'Falha ao reprocessar assinatura')
      if (data && !data.success && !data.idempotent)
        throw new Error(data.error || data.message || 'Erro no processamento')

      toast.success('Assinaturas reestampadas com sucesso!', { id: 'retry-sig' })
      loadDocs()
    } catch (e: any) {
      toast.error(`Falha: ${e.message}`, { id: 'retry-sig' })
    }
  }

  const handlePreviewFile = async (url: string) => {
    try {
      const signedUrl = await getSignedUrl(url)
      if (signedUrl) {
        window.open(signedUrl, '_blank')
      } else {
        toast.error('Não foi possível gerar o link de visualização.')
      }
    } catch (e: any) {
      console.error('Erro ao visualizar arquivo:', e)
      toast.error('Não foi possível visualizar o arquivo.')
    }
  }

  const isPreviewable = (url: string | null) => {
    if (!url) return false
    const lowerUrl = url.toLowerCase()
    const match = lowerUrl.match(/\.([a-z0-9]+)(?:\?|$)/)
    if (!match) return true // assumed PDF
    const ext = match[1]
    return ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)
  }

  const handleDownloadFile = async (url: string, filename: string) => {
    try {
      let bucket = 'bender_clientes'
      let path = url

      if (url.startsWith('http')) {
        const match = url.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+?)(?:\?|$)/)
        if (match) {
          bucket = match[1]
          path = decodeURIComponent(match[2])
        }
      }

      const { data, error } = await supabase.storage.from(bucket).download(path)
      if (error) throw error

      if (data) {
        const objectUrl = URL.createObjectURL(data)
        const a = document.createElement('a')
        a.href = objectUrl
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
      }
    } catch (e: any) {
      console.error('Erro ao baixar arquivo:', e)
      toast.error('Não foi possível baixar o arquivo.')
    }
  }

  return (
    <div className="space-y-6">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileChange}
        multiple
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.mp4,.skp,.promob,.dwg,.dxf,.rvt"
      />

      {uploadProgress !== null && (
        <div className="bg-card p-4 rounded-lg border border-border shadow-sm mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold text-foreground">
              {batchUploadInfo
                ? batchUploadInfo.total > 1
                  ? `Enviando ${batchUploadInfo.current} de ${batchUploadInfo.total} arquivos...`
                  : 'Enviando arquivo...'
                : 'Enviando arquivo...'}
            </span>
            <span className="text-sm font-bold text-primary">{Math.round(uploadProgress)}%</span>
          </div>
          <Progress value={uploadProgress} className="h-2" />
          {batchUploadInfo && batchUploadInfo.total > 1 && (
            <p
              className="text-xs text-muted-foreground mt-1 truncate"
              title={batchUploadInfo.fileName}
            >
              Arquivo atual: {batchUploadInfo.fileName}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-4 items-center mb-6">
        <DropdownMenu
          onOpenChange={(open) => {
            if (open) loadTemplates()
          }}
        >
          <DropdownMenuTrigger asChild>
            <Button variant="default" className="font-bold shadow" disabled={generating}>
              <Plus className="w-4 h-4 mr-2" /> Gerar Novo Documento ▼
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
                  className="cursor-pointer font-medium"
                >
                  {t.nome.toUpperCase()}
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="font-bold border-border text-foreground hover:bg-primary hover:text-primary-foreground"
              disabled={generating}
            >
              <Upload className="w-4 h-4 mr-2" /> Upload Documento ▼
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem
              onClick={() => handleUploadClick('lista_materiais')}
              className="cursor-pointer font-medium text-amber-700"
            >
              📋 Lista de Materiais por projeto
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleUploadClick('upload_manual')}
              className="cursor-pointer"
            >
              📄 Documento Genérico
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="outline"
          className="font-bold border-border text-foreground hover:bg-primary hover:text-primary-foreground"
          onClick={() => setShowDocsModelo(true)}
        >
          <FileText className="w-4 h-4 mr-2" /> Docs Modelo
        </Button>

        <Button
          variant="default"
          className="font-bold shadow bg-green-600 hover:bg-green-700 text-white"
          disabled={!canBatchSign}
          onClick={() => {
            const nonPdf = selectedDocs.filter((d) => !isPdfDocument(d.arquivo_url))
            if (nonPdf.length > 0) {
              toast.error(
                `${nonPdf.length} documento(s) não estão em formato PDF e não podem ser assinados. Remova-os da seleção ou converta para PDF.`,
              )
              return
            }
            setSignatureDocs(selectedDocs)
          }}
        >
          <Send className="w-4 h-4 mr-2" /> Enviar Selecionados ({selectedDocs.length})
        </Button>
      </div>

      <DocsModeloModal open={showDocsModelo} onOpenChange={setShowDocsModelo} />

      <div className="bg-muted/30 border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg text-foreground">Documentos Gerados</h3>
          {docs.length > 0 && selectableDocs.length > 0 && (
            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} />
              Selecionar Todos
            </label>
          )}
        </div>
        {docs.length === 0 ? (
          <p className="text-muted-foreground italic text-sm">
            Nenhum documento encontrado para este cliente. Utilize o botão acima para gerar um novo
            documento a partir de um template.
          </p>
        ) : (
          <div className="space-y-3">
            {docs.map((doc) => {
              const pendentes =
                doc.assinaturas?.filter((a: any) => a.status === 'pendente').length || 0
              const hasAssinaturas = doc.assinaturas?.length > 0
              const allAssinados = hasAssinaturas && pendentes === 0

              const timeRef = doc.atualizado_em || doc.criado_em

              const elapsedLocal = localStartTimes[doc.id] ? now - localStartTimes[doc.id] : null
              const elapsedServer = timeRef ? now - new Date(timeRef).getTime() : 0

              const isStuck =
                doc.status === 'processando' &&
                (elapsedLocal !== null
                  ? elapsedLocal > 120000
                  : elapsedServer > 180000 && elapsedServer < 86400000)

              const urlToPreview = doc.arquivo_assinado_url || doc.arquivo_url

              return (
                <div
                  key={doc.id}
                  className="flex flex-col md:flex-row md:items-center justify-between bg-card p-4 rounded-lg border border-border shadow-sm gap-4 hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <Checkbox
                      checked={selectedDocIds.has(doc.id)}
                      onCheckedChange={() => toggleDocSelection(doc.id)}
                      disabled={
                        doc.status === 'processando' ||
                        doc.status === 'Assinado' ||
                        doc.status === 'concluido' ||
                        doc.status === 'erro_assinatura' ||
                        !!doc.envelope_id
                      }
                      className="shrink-0"
                    />
                    <FileText className="w-6 h-6 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="font-bold text-foreground truncate">
                        📄 {doc.template_nome || doc.tipo} - {doc.clientes?.nome || 'Cliente'} -{' '}
                        {new Date(doc.criado_em).toLocaleDateString('pt-BR')}
                      </p>
                      <p className="text-xs font-medium mt-1">
                        Status:{' '}
                        {doc.status === 'processando' ? (
                          isStuck ? (
                            <span className="text-red-600 font-semibold">
                              ⚠️ Processamento demorado
                            </span>
                          ) : (
                            <span className="text-amber-600 animate-pulse">
                              ⏳ Processando PDF (segundo plano)...
                            </span>
                          )
                        ) : doc.status === 'erro_geracao' ? (
                          <span className="text-red-600">❌ Erro ao gerar PDF.</span>
                        ) : doc.status === 'erro_assinatura' ? (
                          <span className="text-red-600">❌ Erro ao estampar assinaturas.</span>
                        ) : (
                          <span className="text-muted-foreground">{doc.status}</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 shrink-0 items-center">
                    {doc.status === 'processando' && !isStuck && (
                      <span className="text-sm text-amber-600 font-semibold mr-2 animate-pulse">
                        Aguarde...
                      </span>
                    )}

                    {doc.status === 'processando' && isStuck && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRetryProcessing(doc)}
                        className="text-amber-700 border-amber-200 hover:bg-amber-50 mr-2"
                      >
                        Forçar Recomeço
                      </Button>
                    )}

                    {doc.status === 'erro_geracao' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRetryProcessing(doc)}
                        className="text-red-600 border-red-200 hover:bg-red-50 mr-2"
                      >
                        Tentar Novamente
                      </Button>
                    )}

                    {doc.status === 'erro_assinatura' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRetrySignature(doc)}
                        className="text-red-600 border-red-200 hover:bg-red-50 mr-2"
                      >
                        Reestampar Assinaturas
                      </Button>
                    )}

                    {doc.status !== 'processando' &&
                      urlToPreview &&
                      isPreviewable(urlToPreview) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePreviewFile(urlToPreview)}
                          className="hover:bg-accent hover:text-accent-foreground"
                        >
                          <Eye className="w-4 h-4 mr-1" /> Visualizar
                        </Button>
                      )}

                    {doc.status !== 'processando' && doc.arquivo_url && !allAssinados && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const isManual =
                            doc.tipo === 'upload_manual' || doc.tipo === 'lista_materiais'
                          const name = doc.template_nome || 'Documento'
                          handleDownloadFile(
                            doc.arquivo_url,
                            isManual ? name : `Rascunho_${name}.pdf`,
                          )
                        }}
                        className="hover:bg-accent hover:text-accent-foreground"
                      >
                        <Download className="w-4 h-4 mr-1" />{' '}
                        {doc.tipo === 'upload_manual' || doc.tipo === 'lista_materiais'
                          ? 'Download'
                          : 'PDF (Rascunho)'}
                      </Button>
                    )}

                    {doc.status !== 'processando' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (
                            !isPdfDocument(doc.arquivo_url) &&
                            doc.tipo !== 'upload_manual' &&
                            doc.tipo !== 'lista_materiais'
                          ) {
                            toast.error(
                              'Apenas documentos PDF podem ser assinados. Converta o arquivo para PDF.',
                            )
                            return
                          }
                          if (
                            (doc.tipo === 'upload_manual' || doc.tipo === 'lista_materiais') &&
                            !isPdfDocument(doc.arquivo_url)
                          ) {
                            toast.error(
                              'Apenas documentos PDF podem ser assinados. Converta o arquivo para PDF e envie novamente.',
                            )
                            return
                          }
                          setSignatureDocs([
                            { ...doc, title: doc.template_nome || doc.tipo, path: doc.arquivo_url },
                          ])
                        }}
                        className="hover:bg-accent hover:text-accent-foreground"
                      >
                        <PenTool className="w-4 h-4 mr-1" /> Gerenciar Assinaturas
                      </Button>
                    )}

                    {doc.status !== 'processando' && doc.arquivo_assinado_url && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() =>
                          handleDownloadFile(
                            doc.arquivo_assinado_url,
                            `Assinado_${doc.template_nome || 'Documento'}.pdf`,
                          )
                        }
                        className="bg-green-600 hover:bg-green-700 shadow text-white font-medium"
                      >
                        <Download className="w-4 h-4 mr-1" /> 📥 PDF Assinado
                      </Button>
                    )}

                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteDoc(doc.id, doc.template_nome || doc.tipo)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {signatureDocs.length > 0 && (
        <SignatureModal
          docs={signatureDocs}
          clienteId={dossie.cliente_id}
          clienteNome={dossie.cliente?.nome || form.nome_cliente || ''}
          clienteEmail={dossie.cliente?.email || form.email || ''}
          onClose={() => {
            setSignatureDocs([])
            setSelectedDocIds(new Set())
            loadDocs()
            if (onReload) onReload()
          }}
        />
      )}
    </div>
  )
}
