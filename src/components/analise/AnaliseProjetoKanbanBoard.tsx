import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useNavigate } from 'react-router-dom'
import { Calendar, User, DollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

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
        produtos_servicos_projeto (nome_produto)
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
    <div className="flex-1 overflow-hidden flex flex-col h-full w-full bg-[#0B1B2E]">
      <div className="px-4 py-2.5 bg-[#132A46] border-b border-slate-800 flex justify-between items-center shadow-sm z-10 shrink-0">
        <h2 className="font-bold text-base text-white">Projetos em Análise</h2>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-thumb]:bg-slate-600 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-800">
        <div className="flex gap-4 p-4 h-full w-max items-stretch">
          {columnsData.map((col) => (
            <div
              key={col.id}
              className={cn(
                'flex flex-col w-[340px] bg-[#0F243B] rounded-lg border border-[#1A3D63] shrink-0 h-full',
                dragOverCol === col.id && 'bg-[#132A46] border-primary/50',
              )}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOverCol(col.id)
              }}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              <div className="p-3 border-b border-[#1A3D63] flex items-center justify-between bg-[#132A46] rounded-t-lg">
                <h3 className="font-semibold text-sm text-white">{col.title}</h3>
                <span className="bg-white/10 text-slate-300 text-xs px-2 py-0.5 rounded-full font-medium">
                  {col.items.length}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-3 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-600 [&::-webkit-scrollbar-thumb]:rounded-full">
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

                  let productNames: string[] = []
                  if (
                    project.produtos_servicos_projeto &&
                    project.produtos_servicos_projeto.length > 0
                  ) {
                    productNames = project.produtos_servicos_projeto.map((p: any) => p.nome_produto)
                  } else {
                    const ambientes = Array.isArray(project.ambientes) ? project.ambientes : []
                    const psp = Array.isArray(project.produtos_servicos)
                      ? project.produtos_servicos
                      : []
                    productNames = [
                      ...ambientes.map((a: any) => a.nome),
                      ...psp.map((p: any) => p.nome),
                    ].filter(Boolean)
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
                        'bg-[#1A3D63] p-4 rounded-lg shadow-sm border border-transparent cursor-pointer hover:border-blue-400/50 hover:shadow-md transition-all group',
                        draggingId === project.id && 'opacity-50 ring-2 ring-blue-500',
                      )}
                    >
                      <h4 className="font-semibold text-sm text-white mb-3 line-clamp-2">
                        {clientName}
                      </h4>

                      <div className="space-y-2 mb-3">
                        <div className="flex items-center text-xs text-slate-300">
                          <DollarSign className="w-3.5 h-3.5 mr-2 text-slate-400" />
                          <span className="font-medium">
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            }).format(project.valor_total || 0)}
                          </span>
                        </div>
                        <div className="flex items-center text-xs text-slate-300">
                          <User className="w-3.5 h-3.5 mr-2 text-slate-400" />
                          <span className="truncate">{consultantName}</span>
                        </div>
                        {project.data_prevista_entrega && (
                          <div className="flex items-center text-xs text-slate-300">
                            <Calendar className="w-3.5 h-3.5 mr-2 text-slate-400" />
                            {format(new Date(project.data_prevista_entrega), 'dd/MM/yyyy')}
                          </div>
                        )}
                      </div>

                      {productNames.length > 0 && (
                        <div className="pt-3 border-t border-slate-600/50">
                          <div className="text-[10px] font-semibold text-slate-400 uppercase mb-1.5 tracking-wider">
                            Itens do Projeto ({productNames.length})
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {productNames.slice(0, 3).map((name: string, idx: number) => (
                              <span
                                key={idx}
                                className="bg-white/10 text-slate-200 text-[10px] px-1.5 py-0.5 rounded truncate max-w-[120px]"
                              >
                                {name}
                              </span>
                            ))}
                            {productNames.length > 3 && (
                              <span className="bg-white/10 text-slate-300 text-[10px] px-1.5 py-0.5 rounded">
                                +{productNames.length - 3}
                              </span>
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
