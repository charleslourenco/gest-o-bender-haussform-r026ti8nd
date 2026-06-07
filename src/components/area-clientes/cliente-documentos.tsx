import { useState, useEffect, useRef } from 'react'
import { FileText, Download, Upload, Plus, Eye, PenTool, Trash2 } from 'lucide-react'
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
import { SignatureModal } from './signature-modal'
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
  const [signatureDoc, setSignatureDoc] = useState<any>(null)

  const [uploadTipo, setUploadTipo] = useState('upload_manual')

  const fileInputRef = useRef<HTMLInputElement>(null)

  const [now, setNow] = useState(Date.now())
  const [localStartTimes, setLocalStartTimes] = useState<Record<string, number>>({})

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10000)
    return () => clearInterval(timer)
  }, [])

  const loadDocs = async () => {
    try {
      const { data: docsData, error: docsError } = await supabase
        .from('documentos_cliente')
        .select('*, clientes(nome)')
        .eq('cliente_id', dossie.cliente_id)
        .order('criado_em', { ascending: false })

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    toast.info('Fazendo upload...', { id: 'upload-doc' })
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) throw new Error('Usuário não autenticado.')

      const filePath = `contratos/${dossie.cliente_id}/${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`
      const { error: uploadError } = await supabase.storage
        .from('bender_clientes')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      await supabase.from('documentos_cliente').insert({
        cliente_id: dossie.cliente_id,
        tipo: uploadTipo === 'lista_materiais' ? 'Lista de Materiais' : 'upload_manual',
        template_nome: file.name,
        status: 'enviado',
        arquivo_url: filePath,
      })

      if (uploadTipo === 'lista_materiais') {
        await supabase.from('listas_materiais').insert({
          cliente_id: dossie.cliente_id,
          arquivo_url: filePath,
          status: 'pendente',
        })
      }

      const userName = session.user?.user_metadata?.nome || session.user?.email || 'Sistema'
      await supabase.from('timeline_eventos').insert({
        cliente_id: dossie.cliente_id,
        usuario_nome: userName,
        acao: `Arquivo ${file.name} enviado (${uploadTipo === 'lista_materiais' ? 'Lista de Materiais' : 'Manual'})`,
      })

      toast.success('Arquivo enviado com sucesso!')
      loadDocs()
    } catch (err: any) {
      toast.error('Erro no upload: ' + err.message)
    } finally {
      toast.dismiss('upload-doc')
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
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
      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />

      <div className="flex flex-wrap gap-4 items-center mb-6">
        <DropdownMenu
          onOpenChange={(open) => {
            if (open) loadTemplates()
          }}
        >
          <DropdownMenuTrigger asChild>
            <Button
              variant="default"
              className="font-bold bg-dark-denim hover:bg-dark-denim/90 text-white shadow"
              disabled={generating}
            >
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
              className="font-bold border-2 border-steel-blue text-midnight-navy hover:bg-steel-blue hover:text-white"
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
      </div>

      <div className="bg-off-white border-2 border-steel-blue rounded-lg p-6">
        <h3 className="font-bold text-lg mb-4 text-midnight-navy">Documentos Gerados</h3>
        {docs.length === 0 ? (
          <p className="text-steel-blue italic text-sm">
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

              return (
                <div
                  key={doc.id}
                  className="flex flex-col md:flex-row md:items-center justify-between bg-white p-4 rounded-lg border shadow-sm gap-4 hover:border-steel-blue transition-colors"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <FileText className="w-6 h-6 text-steel-blue shrink-0" />
                    <div className="min-w-0">
                      <p className="font-bold text-midnight-navy truncate">
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

                    {doc.status !== 'processando' && doc.arquivo_url && !allAssinados && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleDownloadFile(
                            doc.arquivo_url,
                            `Rascunho_${doc.template_nome || 'Documento'}.pdf`,
                          )
                        }
                        className="hover:bg-slate-100"
                      >
                        <Download className="w-4 h-4 mr-1" /> PDF (Rascunho)
                      </Button>
                    )}

                    {doc.status !== 'processando' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSignatureDoc(doc)}
                        className="hover:bg-slate-100"
                      >
                        <PenTool className="w-4 h-4 mr-1" /> Gerenciar Assinaturas
                      </Button>
                    )}

                    {doc.status !== 'processando' && allAssinados && doc.arquivo_assinado_url && (
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

      {signatureDoc && (
        <SignatureModal
          doc={{
            ...signatureDoc,
            title: signatureDoc.template_nome || signatureDoc.tipo,
            path: signatureDoc.arquivo_url,
          }}
          clienteId={dossie.cliente_id}
          onClose={() => {
            setSignatureDoc(null)
            loadDocs()
            if (onReload) onReload()
          }}
        />
      )}
    </div>
  )
}
