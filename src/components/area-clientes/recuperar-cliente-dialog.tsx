import { useState, useEffect, useMemo } from 'react'
import {
  Loader2,
  FolderSearch,
  FileWarning,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Eye,
} from 'lucide-react'
import { openStorageFileInNewTab } from '@/lib/file-viewer'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { maskCpfCnpj, sanitizeCpfCnpj, detectTipoPessoa } from '@/lib/cpf-cnpj'
import { toast } from 'sonner'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  scanOrphanFolders,
  recoverOrphanFolder,
  formatBytes,
  type OrphanFolder,
  type StorageFile,
  type RecoverResult,
} from '@/services/cliente-recuperacao'

interface RecuperarClienteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onRecovered: (clientId: string) => void
}

type Step = 'scan' | 'detail' | 'target' | 'progress' | 'result'

export function RecuperarClienteDialog({
  open,
  onOpenChange,
  onRecovered,
}: RecuperarClienteDialogProps) {
  const { user } = useAuth()
  const [step, setStep] = useState<Step>('scan')
  const [loading, setLoading] = useState(false)
  const [orphans, setOrphans] = useState<OrphanFolder[]>([])
  const [selected, setSelected] = useState<OrphanFolder | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [mode, setMode] = useState<'recreate' | 'existing'>('recreate')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [cpf, setCpf] = useState('')
  const [existingSearch, setExistingSearch] = useState('')
  const [existingClients, setExistingClients] = useState<
    { id: string; nome: string; email: string }[]
  >([])
  const [selectedExistingId, setSelectedExistingId] = useState<string | null>(null)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressMsg, setProgressMsg] = useState('')
  const [result, setResult] = useState<RecoverResult | null>(null)

  useEffect(() => {
    if (open) {
      resetAll()
      runScan()
    }
  }, [open])

  const resetAll = () => {
    setStep('scan')
    setOrphans([])
    setSelected(null)
    setError(null)
    setMode('recreate')
    setNome('')
    setEmail('')
    setTelefone('')
    setCpf('')
    setExistingSearch('')
    setSelectedExistingId(null)
    setProgress(0)
    setProgressMsg('')
    setResult(null)
    setConfirmOpen(false)
  }

  const runScan = async () => {
    setLoading(true)
    setError(null)
    try {
      const found = await scanOrphanFolders()
      setOrphans(found)
      setStep('scan')
    } catch (e: any) {
      setError(e?.message || 'Não foi possível acessar o armazenamento.')
    } finally {
      setLoading(false)
    }
  }

  const loadExistingClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nome, email')
        .ilike('status', 'Ativo')
        .eq('excluido' as any, false)
        .order('nome')
      if (error) throw error
      setExistingClients(data || [])
    } catch (e: any) {
      toast.error('Erro ao carregar clientes: ' + e.message)
    }
  }

  const filteredClients = useMemo(() => {
    const q = existingSearch.toLowerCase().trim()
    if (!q) return existingClients.slice(0, 50)
    return existingClients
      .filter((c) => c.nome?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q))
      .slice(0, 50)
  }, [existingClients, existingSearch])

  const handleSelectOrphan = (o: OrphanFolder) => {
    setSelected(o)
    setStep('detail')
  }

  const handlePreviewFile = async (file: StorageFile) => {
    const result = await openStorageFileInNewTab(file.path, { bucket: 'bender_clientes' })
    if (!result.success) {
      toast.error(result.error || 'Não foi possível visualizar o arquivo.')
    }
  }

  const goToTarget = async () => {
    setStep('target')
    await loadExistingClients()
  }

  const canConfirmRecreate = nome.trim().length > 0
  const canConfirmExisting = !!selectedExistingId

  const handleConfirm = () => setConfirmOpen(true)

  const executeRecovery = async (targetClientId: string) => {
    if (!selected || !user) return
    setConfirmOpen(false)
    setStep('progress')
    setProgress(0)
    setProgressMsg('Iniciando...')
    const userName = (user as any)?.user_metadata?.nome || user.email || 'Sistema'
    try {
      const res = await recoverOrphanFolder(
        {
          orphanId: selected.id,
          files: selected.files,
          targetClientId,
          userId: user.id,
          userName,
        },
        (pct, msg) => {
          setProgress(pct)
          setProgressMsg(msg)
        },
      )
      setResult(res)
      setStep('result')
      if (res.moved.length > 0) {
        toast.success('Documentos recuperados com sucesso')
      } else if (res.skipped.length > 0) {
        toast.warning('Nenhum arquivo novo foi movido (duplicatas).')
      } else {
        toast.error('Nenhum arquivo pôde ser recuperado.')
      }
    } catch (e: any) {
      setError(e?.message || 'Falha na recuperação.')
      setStep('result')
      toast.error('Falha na recuperação: ' + (e?.message || 'erro desconhecido'))
    }
  }

  const handleExecute = async () => {
    if (!selected || !user) return
    let targetClientId = ''
    if (mode === 'existing') {
      targetClientId = selectedExistingId!
    } else {
      const sanitizedDoc = sanitizeCpfCnpj(cpf)
      const detectedTipo = detectTipoPessoa(cpf) || (sanitizedDoc.length === 14 ? 'PJ' : 'PF')
      const { data: newClient, error: insErr } = await supabase
        .from('clientes')
        .insert({
          nome: nome.trim(),
          email: email.trim() || '',
          telefone: telefone.trim() || '',
          cpf: sanitizedDoc || null,
          tipo_pessoa: detectedTipo,
          status: 'Ativo',
          usuario_id: user.id,
        })
        .select('id')
        .single()
      if (insErr || !newClient) {
        toast.error('Erro ao criar cliente: ' + (insErr?.message || ''))
        return
      }
      targetClientId = newClient.id
      await supabase.from('dossies').insert({
        cliente_id: targetClientId,
        user_id: user.id,
        status: 'em_documentacao',
      })
    }
    await executeRecovery(targetClientId)
  }

  const handleFinish = () => {
    if (result && result.moved.length > 0 && (mode === 'existing' ? selectedExistingId : true)) {
      // navigate to client folder
      onRecovered(getTargetId())
    } else {
      onOpenChange(false)
    }
  }

  const getTargetId = (): string => {
    return mode === 'existing' ? selectedExistingId! : ''
  }

  const tipoPessoa = detectTipoPessoa(cpf)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FolderSearch className="w-5 h-5 text-primary" />
            Recuperar Cliente
          </DialogTitle>
          <DialogDescription>
            Identifique pastas órfãs no armazenamento e reassocie os arquivos a um cliente.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 pr-2">
          <div className="space-y-4 pb-2">
            {error && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {step === 'scan' && (
              <div className="space-y-3">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
                    <p className="text-sm text-muted-foreground">Escaneando armazenamento...</p>
                  </div>
                ) : orphans.length === 0 && !error ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <CheckCircle2 className="w-10 h-10 text-green-500 mb-3" />
                    <p className="text-sm font-medium">Nenhuma pasta órfã encontrada.</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Todos os arquivos do bucket estão associados a clientes existentes.
                    </p>
                  </div>
                ) : (
                  orphans.map((o) => (
                    <button
                      key={o.id}
                      onClick={() => handleSelectOrphan(o)}
                      className="w-full flex items-center justify-between gap-4 rounded-lg border border-border bg-card p-4 text-left hover:border-primary/50 hover:bg-muted/40 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="font-mono text-sm font-semibold truncate">{o.id}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {o.fileCount} arquivo(s) · {formatBytes(o.totalSize)}
                        </p>
                      </div>
                      <Badge variant="secondary">Órfã</Badge>
                    </button>
                  ))
                )}
              </div>
            )}

            {step === 'detail' && selected && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setStep('scan')}>
                    <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
                  </Button>
                  <div className="font-mono text-sm font-semibold truncate">{selected.id}</div>
                  <Badge variant="secondary">
                    {selected.fileCount} · {formatBytes(selected.totalSize)}
                  </Badge>
                </div>
                <div className="rounded-lg border border-border divide-y divide-border max-h-[40vh] overflow-auto">
                  {selected.files.map((f) => (
                    <div
                      key={f.path}
                      className="flex items-center justify-between gap-3 p-2.5 text-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{f.name}</p>
                        <p className="text-xs text-muted-foreground truncate font-mono">{f.path}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-medium">{formatBytes(f.size)}</p>
                        {f.updated_at && (
                          <p className="text-xs text-muted-foreground">
                            {new Date(f.updated_at).toLocaleDateString('pt-BR')}
                          </p>
                        )}
                      </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-primary"
                            onClick={() => handlePreviewFile(f)}
                            title="Visualizar arquivo"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="bg-card text-card-foreground border border-border">
                          Visualizar
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  ))}
                </div>
                <Button onClick={goToTarget} className="w-full">
                  Associar a um cliente
                </Button>
              </div>
            )}

            {step === 'target' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setStep('detail')}>
                    <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant={mode === 'recreate' ? 'default' : 'outline'}
                    onClick={() => setMode('recreate')}
                    className="flex-1"
                  >
                    Criar novo cliente
                  </Button>
                  <Button
                    variant={mode === 'existing' ? 'default' : 'outline'}
                    onClick={() => setMode('existing')}
                    className="flex-1"
                  >
                    Selecionar existente
                  </Button>
                </div>

                {mode === 'recreate' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5 md:col-span-2">
                      <Label>Nome *</Label>
                      <Input
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        placeholder="Nome do cliente"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="email@exemplo.com"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Telefone</Label>
                      <Input
                        value={telefone}
                        onChange={(e) => setTelefone(e.target.value)}
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <Label>
                        CPF / CNPJ{' '}
                        {tipoPessoa && (
                          <span className="text-xs text-muted-foreground font-normal">
                            ({tipoPessoa === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'})
                          </span>
                        )}
                      </Label>
                      <Input
                        value={cpf}
                        onChange={(e) => setCpf(maskCpfCnpj(e.target.value))}
                        placeholder="000.000.000-00"
                        inputMode="numeric"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Button
                        onClick={handleConfirm}
                        disabled={!canConfirmRecreate}
                        className="w-full"
                      >
                        Confirmar Recuperação
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Input
                      placeholder="Buscar cliente por nome ou email..."
                      value={existingSearch}
                      onChange={(e) => setExistingSearch(e.target.value)}
                    />
                    <div className="rounded-lg border border-border max-h-[35vh] overflow-auto divide-y divide-border">
                      {filteredClients.length === 0 ? (
                        <p className="p-4 text-sm text-muted-foreground text-center">
                          Nenhum cliente encontrado.
                        </p>
                      ) : (
                        filteredClients.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => setSelectedExistingId(c.id)}
                            className={`w-full flex items-center justify-between gap-3 p-3 text-left text-sm transition-colors ${
                              selectedExistingId === c.id
                                ? 'bg-primary/10 border-l-4 border-primary'
                                : 'hover:bg-muted/40'
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="font-medium truncate">{c.nome}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {c.email || '-'}
                              </p>
                            </div>
                            {selectedExistingId === c.id && (
                              <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                            )}
                          </button>
                        ))
                      )}
                    </div>
                    <Button
                      onClick={handleConfirm}
                      disabled={!canConfirmExisting}
                      className="w-full"
                    >
                      Confirmar Recuperação
                    </Button>
                  </div>
                )}
              </div>
            )}

            {step === 'progress' && (
              <div className="py-8 space-y-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <span className="text-sm font-medium">Recuperando documentos...</span>
                </div>
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground">{progressMsg}</p>
              </div>
            )}

            {step === 'result' && result && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  {result.errors.length === 0 ? (
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                  ) : (
                    <FileWarning className="w-6 h-6 text-amber-500" />
                  )}
                  <h3 className="font-semibold">Resumo da recuperação</h3>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-2xl font-bold text-green-600">{result.moved.length}</p>
                    <p className="text-xs text-muted-foreground">Movidos</p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-2xl font-bold text-amber-600">{result.skipped.length}</p>
                    <p className="text-xs text-muted-foreground">Ignorados</p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-2xl font-bold text-destructive">{result.errors.length}</p>
                    <p className="text-xs text-muted-foreground">Erros</p>
                  </div>
                </div>
                {result.skipped.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    <p className="font-medium">Arquivos ignorados (duplicatas):</p>
                    <ul className="list-disc pl-5 mt-1">
                      {result.skipped.slice(0, 10).map((f) => (
                        <li key={f.path}>{f.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {result.errors.length > 0 && (
                  <div className="text-xs text-destructive">
                    <p className="font-medium">Erros:</p>
                    <ul className="list-disc pl-5 mt-1 max-h-32 overflow-auto">
                      {result.errors.map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <Button onClick={handleFinish} className="w-full">
                  {result.moved.length > 0 ? 'Ir para a pasta do cliente' : 'Fechar'}
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Recuperação</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Serão movidos <strong>{selected?.files.length || 0} arquivo(s)</strong> da pasta
                  órfã <code className="text-xs">{selected?.id}</code> para o cliente{' '}
                  <strong>
                    {mode === 'existing'
                      ? existingClients.find((c) => c.id === selectedExistingId)?.nome ||
                        'selecionado'
                      : nome || 'novo cliente'}
                  </strong>
                  .
                </p>
                <p className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3 text-amber-800 dark:text-amber-200">
                  Esta operação moverá os arquivos para a pasta do novo cliente e criará registros
                  de documentos. A ação não pode ser desfeita automaticamente.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleExecute()
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}
