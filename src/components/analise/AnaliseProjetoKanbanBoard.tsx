import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useNavigate } from 'react-router-dom'
import { Calendar, User, DollarSign, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
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
  const { toast } = useToast()
  const navigate = useNavigate()
  const [users, setUsers] = useState<any[]>([])

  const loadProjects = async () => {
    const { data: usersData } = await supabase.from('users').select('id, nome')
    if (usersData) setUsers(usersData)

    const { data, error } = await supabase.from('formulario_comercial').select(`
        id, 
        valor_total, 
        data_prevista_entrega, 
        status_analise_projeto,
        user_id,
        ambientes,
        produtos_servicos,
        clientes (nome),
        leads (
          users (nome)
        ),
        produtos_servicos_projeto (nome_produto, is_outsourced)
      `)

    if (error) {
      console.error(error)
      return
    }

    const mapped = (data || []).map((p) => ({
      ...p,
      status_analise_projeto: p.status_analise_projeto || 'iniciar',
    }))

    setProjects(mapped)
    setLoading(false)
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

  const filteredProjects = projects.filter((p) => {
    if (!searchQuery) return true
    const clientName = p.clientes?.nome?.toLowerCase() || ''
    return clientName.includes(searchQuery)
  })

  const columnsData = PROJECT_COLUMNS.map((col) => ({
    ...col,
    items: filteredProjects.filter((p) => p.status_analise_projeto === col.id),
  }))

  if (loading) return <div className="p-8 text-slate-400">Carregando...</div>

  return (
    <div className="flex-1 overflow-hidden flex flex-col h-full w-full bg-slate-50/50">
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex gap-4 p-6 h-full w-max items-stretch">
          {columnsData.map((col) => (
            <div
              key={col.id}
              className={cn(
                'flex flex-col w-[340px] bg-slate-100/50 rounded-xl border border-slate-200 shrink-0 h-full',
                dragOverCol === col.id && 'bg-slate-100 border-primary/50',
              )}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOverCol(col.id)
              }}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-slate-100 rounded-t-xl">
                <h3 className="font-semibold text-sm text-slate-700">{col.title}</h3>
                <span className="bg-white text-slate-600 text-xs px-2 py-0.5 rounded-full font-medium shadow-sm border border-slate-200">
                  {col.items.length}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-3 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full">
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

                  let productNames: { name: string; is_outsourced: boolean }[] = []
                  if (
                    project.produtos_servicos_projeto &&
                    project.produtos_servicos_projeto.length > 0
                  ) {
                    productNames = project.produtos_servicos_projeto.map((p: any) => ({
                      name: p.nome_produto,
                      is_outsourced: p.is_outsourced === true,
                    }))
                  } else {
                    const ambientes = Array.isArray(project.ambientes) ? project.ambientes : []
                    const psp = Array.isArray(project.produtos_servicos)
                      ? project.produtos_servicos
                      : []
                    productNames = [
                      ...ambientes.map((a: any) => ({ name: a.nome, is_outsourced: false })),
                      ...psp.map((p: any) => ({ name: p.nome, is_outsourced: false })),
                    ].filter((p) => Boolean(p.name))
                  }

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
                        'bg-[#1A3D63] text-[#F6FAFD] p-4 rounded-lg shadow-sm border cursor-pointer hover:border-[#4B7BB0] hover:shadow-md transition-all group relative',
                        draggingId === project.id
                          ? 'opacity-50 ring-2 ring-blue-500 border-[#2A5282]'
                          : 'border-[#2A5282]',
                      )}
                    >
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button
                            className="absolute top-3 right-3 text-[#F6FAFD]/60 hover:text-red-400 transition-colors p-1.5 rounded hover:bg-red-500/20 opacity-0 group-hover:opacity-100"
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
                              Tem certeza que deseja excluir este projeto? Esta ação não pode ser
                              desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteProject(project.id)
                              }}
                              className="bg-red-600 hover:bg-red-700 text-white border-none"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      <h4 className="font-semibold text-sm text-[#F6FAFD] mb-3 pr-6 line-clamp-2">
                        {clientName}
                      </h4>

                      <div className="space-y-2 mb-3">
                        <div className="flex items-center text-xs text-[#F6FAFD]/80">
                          <DollarSign className="w-3.5 h-3.5 mr-2 text-[#F6FAFD]/60" />
                          <span className="font-medium">
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            }).format(project.valor_total || 0)}
                          </span>
                        </div>
                        <div className="flex items-center text-xs text-[#F6FAFD]/80">
                          <User className="w-3.5 h-3.5 mr-2 text-[#F6FAFD]/60" />
                          <span className="truncate">{consultantName}</span>
                        </div>
                        {project.data_prevista_entrega && (
                          <div className="flex items-center text-xs text-[#F6FAFD]/80">
                            <Calendar className="w-3.5 h-3.5 mr-2 text-[#F6FAFD]/60" />
                            {format(new Date(project.data_prevista_entrega), 'dd/MM/yyyy')}
                          </div>
                        )}
                      </div>

                      {productNames.length > 0 && (
                        <div className="pt-3 border-t border-[#2A5282]">
                          <div className="text-[10px] font-semibold text-[#F6FAFD]/60 uppercase mb-1.5 tracking-wider">
                            Itens do Projeto ({productNames.length})
                          </div>
                          <div className="flex flex-col gap-1 w-full">
                            {productNames.slice(0, 5).map((item, idx: number) => (
                              <div
                                key={idx}
                                className={`text-xs px-2 py-1 rounded w-full break-words leading-tight border ${
                                  item.is_outsourced
                                    ? 'bg-orange-600 border-orange-500 text-white'
                                    : 'bg-[#0F294A] border-[#2A5282] text-[#F6FAFD]'
                                }`}
                              >
                                • {item.name}
                              </div>
                            ))}
                            {productNames.length > 5 && (
                              <div className="text-[#F6FAFD]/60 text-xs pl-2 italic">
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
