import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { useNavigate } from 'react-router-dom'
import {
  Calendar,
  User,
  DollarSign,
  Trash2,
  Archive,
  AlertTriangle,
  RefreshCw,
  LogIn,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { arquivarAnaliseFormulario } from '@/services/arquivamento'
import {
  getBadgeProgramacaoSemana,
  getCurrentIsoWeek,
  matchWeek,
  getIsoWeeksForYear,
} from '@/lib/pcp-capacity'
import { runWithAuthRecovery, redirectToLogin } from '@/lib/supabase/auth-recovery'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

const PROJECT_COLUMNS = [
  { id: 'iniciar', title: 'INICIAR' },
  { id: 'em_andamento', title: 'EM ANDAMENTO' },
  { id: 'concluido', title: 'CONCLUÍDO' },
]

export function AnaliseProjetoKanbanBoard() {
  const { isAdmin } = useAuth()
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [dragOverCol, setDragOverCol] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [archivingId, setArchivingId] = useState<string | null>(null)
  const [somenteSemanaAtual, setSomenteSemanaAtual] = useState(false)
  const [filters, setFilters] = useState<{
    consultor?: string
    dateRange?: { from?: Date; to?: Date }
  }>({})
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSessionExpired, setIsSessionExpired] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)
  const { toast } = useToast()
  const navigate = useNavigate()
  const [users, setUsers] = useState<any[]>([])

  const loadProjects = async () => {
    setLoading(true)
    setErrorMessage(null)
    setIsSessionExpired(false)
    try {
      const usersRes = await runWithAuthRecovery<any[]>(() =>
        supabase.from('users').select('id, nome'),
      )
      if (usersRes.data) setUsers(usersRes.data)

      const result = await runWithAuthRecovery<any[]>(() =>
        supabase
          .from('formulario_comercial')
          .select(
            `
            id,
            criado_em,
            valor_total,
            data_prevista_entrega,
            status_analise_projeto,
            user_id,
            ambientes,
            produtos_servicos,
            arquivado_analise,
            clientes (nome),
            leads ( kanban_ativo, consultor:users!leads_consultor_id_fkey (nome) ),
            produtos_servicos_projeto ( nome_produto, is_outsourced, status_analise, semana_planejada_producao, semana_producao_inicio )
          `,
          )
          .eq('arquivado_analise' as any, false),
      )

      if (result.error) {
        console.error('Erro ao carregar projetos:', result.error)
        const msg = result.sessionExpired
          ? 'Sua sessão expirou ou é inválida. Por favor, faça login novamente.'
          : result.error?.message || 'Falha ao carregar os projetos da análise técnica.'

        setErrorMessage(msg)
        setIsSessionExpired(result.sessionExpired)

        toast({
          title: 'Erro ao carregar projetos',
          description: msg,
          variant: 'destructive',
        })
        setProjects([])
        return
      }

      const mapped = (result.data || []).map((p: any) => ({
        ...p,
        status_analise_projeto: p.status_analise_projeto || 'iniciar',
        arquivado_analise: p.arquivado_analise ?? false,
      }))

      setProjects(mapped)
    } catch (err: any) {
      console.error('Erro inesperado ao carregar projetos:', err)
      setErrorMessage(err?.message || 'Erro inesperado ao carregar projetos.')
      setProjects([])
    } finally {
      setLoading(false)
      setIsRetrying(false)
    }
  }

  useEffect(() => {
    let isMounted = true
    loadProjects()

    let sub: any = null
    try {
      const channelName = `formulario_changes_${Date.now()}`
      sub = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'formulario_comercial' },
          () => {
            if (isMounted) loadProjects()
          },
        )
        .subscribe((status, err) => {
          if (err || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.warn('Realtime formulario_changes channel status/error:', status, err)
          }
        })
    } catch (err) {
      console.warn('Falha ao inicializar canal Realtime formulario_changes:', err)
    }

    const handleSearch = (e: any) => setSearchQuery(e.detail?.toLowerCase() || '')
    const handleFilters = (e: any) => setFilters(e.detail || {})
    const handleWeekFilter = (e: any) => {
      if (e.detail && typeof e.detail === 'object' && 'somente_semana_atual' in e.detail) {
        setSomenteSemanaAtual(Boolean(e.detail.somente_semana_atual))
      }
    }
    const handleAuthRestored = () => {
      console.info('[AnaliseProjetoKanbanBoard] auth_session_restored detectado. Recarregando...')
      if (isMounted) loadProjects()
    }

    window.addEventListener('kanban_search_change', handleSearch)
    window.addEventListener('analise_detalhe_filters', handleFilters)
    window.addEventListener('toggle_filtro_semana_atual', handleWeekFilter)
    window.addEventListener('auth_session_restored', handleAuthRestored)

    return () => {
      isMounted = false
      if (sub) {
        try {
          supabase.removeChannel(sub)
        } catch (e) {
          console.warn('Erro ao remover canal Realtime formulario_changes:', e)
        }
      }
      window.removeEventListener('kanban_search_change', handleSearch)
      window.removeEventListener('analise_detalhe_filters', handleFilters)
      window.removeEventListener('toggle_filtro_semana_atual', handleWeekFilter)
      window.removeEventListener('auth_session_restored', handleAuthRestored)
    }
  }, [])

  const handleDrop = async (e: React.DragEvent, status: string) => {
    e.preventDefault()
    setDragOverCol(null)
    if (!draggingId) return

    const project = projects.find((p) => p.id === draggingId)
    if (!project || project.status_analise_projeto === status) return

    setProjects((prev) =>
      prev.map((p) => (p.id === draggingId ? { ...p, status_analise_projeto: status } : p)),
    )

    const { error } = await supabase
      .from('formulario_comercial')
      .update({ status_analise_projeto: status })
      .eq('id', draggingId)

    if (error) {
      toast({ description: 'Erro ao atualizar status do projeto.', variant: 'destructive' })
      loadProjects()
    }
  }

  const handleDeleteProject = async (id: string) => {
    const { error } = await supabase.from('formulario_comercial').delete().eq('id', id)
    if (error) {
      toast({
        title: 'Erro ao excluir projeto',
        description: error.message,
        variant: 'destructive',
      })
    } else {
      toast({ title: 'Projeto excluído com sucesso!' })
      setProjects((prev) => prev.filter((p) => p.id !== id))
    }
  }

  const handleArchiveProject = async (id: string) => {
    setArchivingId(id)
    try {
      await arquivarAnaliseFormulario(id)
      toast({ title: 'Projeto arquivado com sucesso!' })
      setProjects((prev) => prev.filter((p) => p.id !== id))
    } catch (err: any) {
      toast({
        title: 'Erro ao arquivar projeto',
        description: err.message || 'Erro interno.',
        variant: 'destructive',
      })
    } finally {
      setArchivingId(null)
    }
  }

  const getConsultantName = (project: any) => {
    let consultantName = 'Consultor não encontrado'
    if (project.leads && !Array.isArray(project.leads)) {
      consultantName =
        (project.leads as any).consultor?.nome ||
        (project.leads as any).users?.nome ||
        consultantName
    } else if (project.leads && Array.isArray(project.leads) && project.leads[0]) {
      consultantName =
        project.leads[0]?.consultor?.nome || project.leads[0]?.users?.nome || consultantName
    }

    if (!consultantName || consultantName === 'Consultor não encontrado') {
      consultantName =
        users.find((u) => u.id === project.user_id)?.nome || 'Consultor não encontrado'
    }

    return consultantName
  }

  const filteredProjects = projects.filter((p) => {
    if (somenteSemanaAtual) {
      const current = getCurrentIsoWeek()
      const currentWeekRange =
        getIsoWeeksForYear(current.year).find((w) => w.weekNumber === current.weekNumber) ||
        (current as any)
      const hasCardInWeek = p?.produtos_servicos_projeto?.some((it: any) =>
        matchWeek(it?.semana_planejada_producao, currentWeekRange, it?.semana_producao_inicio),
      )
      if (!hasCardInWeek) return false
    }

    if (filters.consultor) {
      const nome = getConsultantName(p).toLowerCase()
      if (!nome.includes(filters.consultor.toLowerCase())) return false
    }
    if (filters.dateRange?.from && p.criado_em) {
      const criado = new Date(p.criado_em)
      const from = new Date(filters.dateRange.from)
      from.setHours(0, 0, 0, 0)
      const to = new Date(filters.dateRange.to || filters.dateRange.from)
      to.setHours(23, 59, 59, 999)
      if (criado < from || criado > to) return false
    }

    if (!searchQuery) return true
    const clientName = p.clientes?.nome?.toLowerCase() || ''
    return clientName.includes(searchQuery)
  })

  const columnsData = PROJECT_COLUMNS.map((col) => ({
    ...col,
    items: filteredProjects.filter((p) => p.status_analise_projeto === col.id),
  }))

  const handleRetry = () => {
    setIsRetrying(true)
    loadProjects()
  }

  const handleGoToLogin = () => {
    redirectToLogin('/pcp/analise-tecnica')
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-muted-foreground gap-2">
        <RefreshCw className="h-5 w-5 animate-spin text-primary" />
        <span>Carregando projetos da análise técnica...</span>
      </div>
    )
  }

  if (errorMessage) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-background min-h-[360px]">
        <div className="max-w-md w-full p-6 bg-card border border-border rounded-xl shadow-sm flex flex-col items-center animate-in fade-in duration-200">
          <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-3">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base text-foreground mb-1">
            {isSessionExpired ? 'Sessão Expirada' : 'Erro ao Carregar Projetos'}
          </h3>
          <p className="text-xs text-muted-foreground mb-5">{errorMessage}</p>
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <Button onClick={handleRetry} disabled={isRetrying} size="sm" className="gap-2 text-xs">
              <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
              {isRetrying ? 'Tentando novamente...' : 'Tentar novamente'}
            </Button>
            {isSessionExpired && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleGoToLogin}
                className="gap-2 text-xs"
              >
                <LogIn className="w-3.5 h-3.5" />
                Fazer login novamente
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col h-full w-full bg-background">
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex gap-4 p-6 h-full w-max items-stretch">
          {columnsData.map((col) => (
            <div
              key={col.id}
              className={cn(
                'flex flex-col w-[340px] bg-muted/30 rounded-xl border border-border shrink-0 h-full',
                dragOverCol === col.id && 'bg-accent/50 border-primary/50',
              )}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOverCol(col.id)
              }}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              <div className="p-3 border-b border-border flex items-center justify-between bg-muted/50 rounded-t-xl">
                <h3 className="font-semibold text-sm text-foreground">{col.title}</h3>
                <span className="bg-card text-muted-foreground text-xs px-2 py-0.5 rounded-full font-medium shadow-sm border border-border">
                  {col.items.length}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-3 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-thumb]:rounded-full">
                {col.items.map((project) => {
                  const consultantName = getConsultantName(project)

                  const clientName = project.clientes?.nome || 'Cliente não encontrado'

                  const canArchive =
                    project.status_analise_projeto === 'concluido' &&
                    project.arquivado_analise === false

                  let productNames: { name: string; is_outsourced: boolean }[] = []
                  if (
                    project?.produtos_servicos_projeto &&
                    Array.isArray(project.produtos_servicos_projeto) &&
                    project.produtos_servicos_projeto.length > 0
                  ) {
                    productNames = project.produtos_servicos_projeto.map((p: any) => ({
                      name: p?.nome_produto,
                      is_outsourced: p?.is_outsourced === true,
                    }))
                  } else {
                    const ambientes = Array.isArray(project?.ambientes) ? project.ambientes : []
                    const psp = Array.isArray(project?.produtos_servicos)
                      ? project.produtos_servicos
                      : []
                    productNames = [
                      ...ambientes.map((a: any) => ({ name: a?.nome, is_outsourced: false })),
                      ...psp.map((p: any) => ({ name: p?.nome, is_outsourced: false })),
                    ].filter((p) => Boolean(p?.name))
                  }

                  const isAlert = project?.produtos_servicos_projeto?.some(
                    (p: any) =>
                      p?.is_outsourced ||
                      p?.status_analise === 'aguardando_consultor' ||
                      p?.status_analise === 'item_terceirizado',
                  )

                  // Spec Etapa 4: Sinal PROGRAMADO Sxx
                  const semanaProgramada = project?.produtos_servicos_projeto?.find(
                    (p: any) => p?.semana_planejada_producao,
                  )?.semana_planejada_producao
                  const badgeProgramacao = getBadgeProgramacaoSemana(semanaProgramada)

                  return (
                    <div
                      key={project.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('projectId', project.id)
                        setDraggingId(project.id)
                      }}
                      onDragEnd={() => setDraggingId(null)}
                      onClick={() => navigate(`/pcp/analise-tecnica/${project.id}`)}
                      className={cn(
                        'p-4 rounded-lg shadow-sm border-2 cursor-pointer transition-all group relative',
                        isAlert
                          ? 'bg-orange-50 text-orange-950 border-orange-200 hover:border-orange-300 dark:bg-orange-950/20 dark:text-orange-300 dark:border-orange-500/50 dark:shadow-[0_0_15px_rgba(249,115,22,0.3)] dark:hover:border-orange-400'
                          : 'bg-card text-card-foreground border-border hover:border-primary/50 dark:border-cyan-500/50 dark:shadow-[0_0_15px_rgba(6,182,212,0.3)] dark:hover:border-cyan-400',
                        draggingId === project.id && 'opacity-50 ring-2 ring-primary',
                      )}
                    >
                      <div className="absolute top-3 right-3 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {canArchive && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button
                                className="text-muted-foreground hover:text-amber-600 transition-colors p-1.5 rounded hover:bg-amber-600/10 disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={(e) => e.stopPropagation()}
                                disabled={archivingId === project.id}
                                title="Arquivar Projeto"
                              >
                                <Archive className="h-4 w-4" />
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Arquivar Projeto?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  O projeto e todos os seus ambientes serão arquivados da Análise
                                  Técnica. Esta ação não afeta Produção ou Montagem. Você poderá
                                  restaurá-lo na aba Arquivados.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleArchiveProject(project.id)
                                  }}
                                  className="bg-amber-600 hover:bg-amber-700 text-white border-none"
                                >
                                  Arquivar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}

                        {isAdmin && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button
                                className="text-muted-foreground hover:text-destructive transition-colors p-1.5 rounded hover:bg-destructive/10"
                                onClick={(e) => e.stopPropagation()}
                                title="Excluir Projeto"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir Projeto?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Só é possível excluir projetos sem venda registrada, sem
                                  financeiro e sem produção iniciada; nos demais casos use Arquivar.
                                  O cadastro do cliente permanece.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDeleteProject(project.id)
                                  }}
                                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground border-none"
                                >
                                  Confirmar Exclusão
                                </AlertDialogAction>
                              </AlertDialogFooter>{' '}
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>

                      {badgeProgramacao && (
                        <div className="flex items-center mb-1.5">
                          <span
                            className={cn(
                              'text-[9px] font-bold px-1.5 py-0.5 rounded border leading-none',
                              badgeProgramacao.isCurrent
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-400/50'
                                : 'bg-muted text-muted-foreground border-border',
                            )}
                            title={badgeProgramacao.label}
                          >
                            {badgeProgramacao.label}
                          </span>
                        </div>
                      )}

                      <h4 className="font-semibold text-sm mb-3 pr-14 line-clamp-2">
                        {clientName}
                      </h4>

                      <div className="space-y-2 mb-3">
                        <div className="flex items-center text-xs text-muted-foreground">
                          <DollarSign className="w-3.5 h-3.5 mr-2 opacity-70" />
                          <span className="font-medium text-foreground">
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            }).format(project.valor_total || 0)}
                          </span>
                        </div>
                        <div className="flex items-center text-xs text-muted-foreground">
                          <User className="w-3.5 h-3.5 mr-2 opacity-70" />
                          <span className="truncate">{consultantName}</span>
                        </div>
                        {project.data_prevista_entrega && (
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Calendar className="w-3.5 h-3.5 mr-2 opacity-70" />
                            {format(new Date(project.data_prevista_entrega), 'dd/MM/yyyy')}
                          </div>
                        )}
                      </div>

                      {productNames.length > 0 && (
                        <div className="pt-3 border-t border-border">
                          <div className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5 tracking-wider">
                            Itens do Projeto ({productNames.length})
                          </div>
                          <div className="flex flex-col gap-1 w-full">
                            {productNames.slice(0, 5).map((item, idx: number) => (
                              <div
                                key={idx}
                                className={cn(
                                  'text-xs px-2 py-1 rounded w-full break-words leading-tight border',
                                  item.is_outsourced
                                    ? 'bg-orange-100 border-orange-200 text-orange-900 dark:bg-orange-900/30 dark:border-orange-500/30 dark:text-orange-200'
                                    : 'bg-muted/50 border-border text-foreground',
                                )}
                              >
                                • {item.name}
                              </div>
                            ))}
                            {productNames.length > 5 && (
                              <div className="text-muted-foreground text-xs pl-2 italic">
                                + {productNames.length - 5} item(ns)...
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
