import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useNavigate } from 'react-router-dom'
import { Calendar, User, DollarSign, Trash2, Archive } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { arquivarAnaliseFormulario } from '@/services/arquivamento'
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
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [dragOverCol, setDragOverCol] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [archivingId, setArchivingId] = useState<string | null>(null)
  const { toast } = useToast()
  const navigate = useNavigate()
  const [users, setUsers] = useState<any[]>([])

  const loadProjects = async () => {
    try {
      const { data: usersData } = await supabase.from('users').select('id, nome')
      if (usersData) setUsers(usersData)

      const { data, error } = await supabase
        .from('formulario_comercial')
        .select(
          `
          id,
          valor_total,
          data_prevista_entrega,
          status_analise_projeto,
          user_id,
          ambientes,
          produtos_servicos,
          arquivado_analise,
          clientes (nome),
          leads ( kanban_ativo, users (nome) ),
          produtos_servicos_projeto ( nome_produto, is_outsourced, status_analise )
        `,
        )
        .eq('arquivado_analise' as any, false)

      if (error) {
        console.error('Erro ao carregar projetos:', error)
        toast({
          title: 'Erro ao carregar projetos',
          description: error.message,
          variant: 'destructive',
        })
        setProjects([])
        setLoading(false)
        return
      }

      const mapped = (data || []).map((p: any) => ({
        ...p,
        status_analise_projeto: p.status_analise_projeto || 'iniciar',
        arquivado_analise: p.arquivado_analise ?? false,
      }))

      setProjects(mapped)
    } catch (err: any) {
      console.error('Erro inesperado ao carregar projetos:', err)
      setProjects([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProjects()

    const sub = supabase
      .channel('formulario_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'formulario_comercial' },
        loadProjects,
      )
      .subscribe()

    const handleSearch = (e: any) => setSearchQuery(e.detail?.toLowerCase() || '')
    window.addEventListener('kanban_search_change', handleSearch)

    return () => {
      supabase.removeChannel(sub)
      window.removeEventListener('kanban_search_change', handleSearch)
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

  const filteredProjects = projects.filter((p) => {
    if (!searchQuery) return true
    const clientName = p.clientes?.nome?.toLowerCase() || ''
    return clientName.includes(searchQuery)
  })

  const columnsData = PROJECT_COLUMNS.map((col) => ({
    ...col,
    items: filteredProjects.filter((p) => p.status_analise_projeto === col.id),
  }))

  if (loading) return <div className="p-8 text-muted-foreground">Carregando...</div>

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
                  let consultantName = 'Consultor não encontrado'
                  if (
                    project.leads &&
                    !Array.isArray(project.leads) &&
                    (project.leads as any).users
                  ) {
                    consultantName = (project.leads as any).users.nome
                  } else if (
                    project.leads &&
                    Array.isArray(project.leads) &&
                    project.leads[0]?.users
                  ) {
                    consultantName = project.leads[0].users.nome
                  }

                  if (!consultantName || consultantName === 'Consultor não encontrado') {
                    consultantName =
                      users.find((u) => u.id === project.user_id)?.nome ||
                      'Consultor não encontrado'
                  }

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

                  return (
                    <div
                      key={project.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('projectId', project.id)
                        setDraggingId(project.id)
                      }}
                      onDragEnd={() => setDraggingId(null)}
                      onClick={() => navigate(`/analise-tecnica/${project.id}`)}
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
                                Tem certeza que deseja excluir este projeto? Todo o formulário
                                comercial e seus itens serão removidos. O cadastro do cliente
                                permanecerá intacto.
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
                      </div>

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
