import { useState, useEffect, useRef } from 'react'
import { Lead } from '@/types'
import { supabase } from '@/lib/supabase/client'
import { fetchLeads, fetchUsers, updateLead } from '@/services/comercial'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Loader2,
  AlertCircle,
  GripVertical,
  User,
  Phone,
  Search,
  Clock,
  MoveRight,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface ColumnDef {
  id: string
  title: string
  statusValues: string[]
}

const ASSISTENCIA_COLUMNS: ColumnDef[] = [
  {
    id: 'nova_assistencia',
    title: 'Nova Assistência',
    statusValues: ['Nova Assistência', 'Novo', 'nova_assistencia'],
  },
  {
    id: 'em_andamento',
    title: 'Em andamento',
    statusValues: ['Em andamento', 'Em Atendimento', 'Em andamento', 'em_andamento'],
  },
  {
    id: 'concluida',
    title: 'Concluída',
    statusValues: ['Concluída', 'Concluido', 'Resolvido', 'concluida', 'concluido'],
  },
]

function getColumnIdForStatus(status?: string | null): string {
  if (!status) return 'nova_assistencia'
  const norm = status.trim().toLowerCase()

  if (
    norm === 'novo' ||
    norm === 'nova assistência' ||
    norm === 'nova assistencia' ||
    norm === 'nova_assistencia'
  ) {
    return 'nova_assistencia'
  }
  if (norm === 'em atendimento' || norm === 'em andamento' || norm === 'em_andamento') {
    return 'em_andamento'
  }
  if (
    norm === 'resolvido' ||
    norm === 'concluída' ||
    norm === 'concluida' ||
    norm === 'concluido'
  ) {
    return 'concluida'
  }

  // fallback para a primeira coluna
  return 'nova_assistencia'
}

function getDefaultStatusForColumn(colId: string): string {
  if (colId === 'nova_assistencia') return 'Novo'
  if (colId === 'em_andamento') return 'Em Atendimento'
  if (colId === 'concluida') return 'Resolvido'
  return 'Novo'
}

function TimeInColumn({ dateStr }: { dateStr?: string | null }) {
  const [timeStr, setTimeStr] = useState<string>('')

  useEffect(() => {
    const calc = () => {
      if (!dateStr) {
        setTimeStr('')
        return
      }
      const startMs = new Date(dateStr).getTime()
      if (isNaN(startMs)) {
        setTimeStr('')
        return
      }
      const diffInMs = Date.now() - startMs
      if (diffInMs < 0) {
        setTimeStr('⏱️ < 1h')
        return
      }

      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))
      const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))

      if (diffInDays > 0) {
        setTimeStr(`⏱️ ${diffInDays}d`)
      } else if (diffInHours > 0) {
        setTimeStr(`⏱️ ${diffInHours}h`)
      } else {
        setTimeStr(`⏱️ < 1h`)
      }
    }

    calc()
    const interval = setInterval(calc, 60000)
    return () => clearInterval(interval)
  }, [dateStr])

  if (!timeStr) return null
  return (
    <span className="text-[10px] text-muted-foreground font-medium leading-none">{timeStr}</span>
  )
}

export function KanbanAssistencia() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [users, setUsers] = useState<Array<{ id: string; nome: string }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filtros
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedConsultant, setSelectedConsultant] = useState('all')
  const [dragOverColId, setDragOverColId] = useState<string | null>(null)

  // Scroll horizontal suave com drag
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const scrollSpeedRef = useRef(0)
  const animationRef = useRef<number | null>(null)

  const startAutoScroll = () => {
    if (!animationRef.current) {
      const scroll = () => {
        if (scrollContainerRef.current && scrollSpeedRef.current !== 0) {
          scrollContainerRef.current.scrollLeft += scrollSpeedRef.current
        }
        animationRef.current = requestAnimationFrame(scroll)
      }
      animationRef.current = requestAnimationFrame(scroll)
    }
  }

  const stopAutoScroll = () => {
    scrollSpeedRef.current = 0
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
  }

  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      setError(null)
      const [allLeadsData, usersData] = await Promise.all([fetchLeads(), fetchUsers()])

      const safeLeads = Array.isArray(allLeadsData) ? allLeadsData : []
      const safeUsers = Array.isArray(usersData) ? usersData : []

      // Filtrar para categoria Assistência, arquivado_comercial is not true, excluido is not true
      const filtered = safeLeads.filter((l: any) => {
        if (!l || typeof l !== 'object') return false
        if (l.arquivado_comercial || l.excluido) return false
        const cat = typeof l.categoria === 'string' ? l.categoria.trim().toLowerCase() : ''
        return cat === 'assistência' || cat === 'assistencia'
      })

      setLeads(filtered)
      setUsers(safeUsers)
    } catch (err: any) {
      console.error('Erro ao carregar kanban de assistência:', err)
      setError(err?.message || 'Erro ao carregar dados')
      if (!silent) toast.error('Erro ao carregar assistências')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true
    loadData()

    const channel = supabase
      .channel('kanban_assistencia_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        if (isMounted) loadData(true)
      })
      .subscribe()

    return () => {
      isMounted = false
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    const handleGlobalDrop = () => stopAutoScroll()
    window.addEventListener('dragend', handleGlobalDrop)
    window.addEventListener('drop', handleGlobalDrop)
    return () => {
      window.removeEventListener('dragend', handleGlobalDrop)
      window.removeEventListener('drop', handleGlobalDrop)
    }
  }, [])

  const handleStatusChange = async (leadId: string, targetColId: string) => {
    const targetStatus = getDefaultStatusForColumn(targetColId)
    const currentLead = leads.find((l) => l.id === leadId)
    if (!currentLead) return

    // Otimista
    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId
          ? { ...l, status: targetStatus, atualizado_em: new Date().toISOString() }
          : l,
      ),
    )

    try {
      await updateLead(leadId, {
        status: targetStatus,
        atualizado_em: new Date().toISOString(),
      } as any)
      toast.success('Status atualizado com sucesso!')
    } catch (err: any) {
      console.error('Erro ao atualizar status:', err)
      toast.error('Erro ao atualizar status: ' + err.message)
      loadData(true)
    }
  }

  const handleAssignConsultant = async (leadId: string, consultantId: string | null) => {
    const selectedUser = users.find((u) => u.id === consultantId)
    // Otimista
    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId
          ? {
              ...l,
              consultor_id: consultantId,
              consultor: selectedUser ? { nome: selectedUser.nome } : null,
              atualizado_em: new Date().toISOString(),
            }
          : l,
      ),
    )

    try {
      await updateLead(leadId, {
        consultor_id: consultantId,
        atualizado_em: new Date().toISOString(),
      } as any)
      toast.success('Responsável atribuído com sucesso!')
    } catch (err: any) {
      console.error('Erro ao atribuir responsável:', err)
      toast.error('Erro ao atribuir responsável: ' + err.message)
      loadData(true)
    }
  }

  // Drag and Drop
  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData('leadId', leadId)
    setTimeout(() => {
      if (e.target instanceof HTMLElement) {
        e.target.classList.add('opacity-50', 'ring-2', 'ring-primary')
      }
    }, 0)
  }

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.target instanceof HTMLElement) {
      e.target.classList.remove('opacity-50', 'ring-2', 'ring-primary')
    }
    setDragOverColId(null)
  }

  const handleContainerDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!scrollContainerRef.current) return

    const container = scrollContainerRef.current
    const rect = container.getBoundingClientRect()
    const x = e.clientX - rect.left
    const scrollThreshold = 100
    const maxScrollSpeed = 15

    let speed = 0
    if (x < scrollThreshold) {
      speed = -maxScrollSpeed * (1 - Math.max(0, x) / scrollThreshold)
    } else if (rect.width - x < scrollThreshold) {
      speed = maxScrollSpeed * (1 - Math.max(0, rect.width - x) / scrollThreshold)
    }

    if (speed !== 0) {
      scrollSpeedRef.current = speed
      startAutoScroll()
    } else {
      stopAutoScroll()
    }
  }

  const handleContainerDragLeave = (e: React.DragEvent) => {
    const rect = scrollContainerRef.current?.getBoundingClientRect()
    if (rect) {
      if (
        e.clientX <= rect.left ||
        e.clientX >= rect.right ||
        e.clientY <= rect.top ||
        e.clientY >= rect.bottom
      ) {
        stopAutoScroll()
      }
    } else {
      stopAutoScroll()
    }
  }

  const handleDragOverCol = (e: React.DragEvent, colId: string) => {
    e.preventDefault()
    setDragOverColId(colId)
  }

  const handleDragLeaveCol = (e: React.DragEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    if (
      e.clientX <= rect.left ||
      e.clientX >= rect.right ||
      e.clientY <= rect.top ||
      e.clientY >= rect.bottom
    ) {
      setDragOverColId(null)
    }
  }

  const handleDrop = async (e: React.DragEvent, targetColId: string) => {
    e.preventDefault()
    setDragOverColId(null)
    const leadId = e.dataTransfer.getData('leadId')
    if (!leadId) return

    const lead = leads.find((l) => l.id === leadId)
    if (!lead) return

    const currentColId = getColumnIdForStatus(lead.status)
    if (currentColId === targetColId) return

    await handleStatusChange(leadId, targetColId)
  }

  // Filtragem
  const filteredLeads = leads.filter((lead) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const matchName = (lead.nome || '').toLowerCase().includes(q)
      const matchPhone = (lead.telefone || '').includes(q)
      if (!matchName && !matchPhone) return false
    }

    if (selectedConsultant !== 'all') {
      if (selectedConsultant === 'unassigned' && lead.consultor_id) return false
      if (selectedConsultant !== 'unassigned' && lead.consultor_id !== selectedConsultant)
        return false
    }

    return true
  })

  const uniqueConsultantIds = Array.from(
    new Set(leads.map((l) => l.consultor_id).filter(Boolean)),
  ) as string[]

  if (loading && leads.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-12">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground font-medium">Carregando assistências...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-12 text-center bg-background">
        <div className="bg-destructive/10 p-4 rounded-full mb-4">
          <AlertCircle className="h-10 w-10 text-destructive" />
        </div>
        <h3 className="mb-2 text-xl font-bold text-foreground">Erro ao carregar Assistência</h3>
        <p className="text-sm text-muted-foreground max-w-md">{error}</p>
        <Button onClick={() => loadData()} className="mt-4" variant="outline">
          Tentar novamente
        </Button>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      {/* Header com Filtros */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-6 py-3 bg-card border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            Quadro de solicitações de assistência técnica e pós-obra
          </p>
          <Badge variant="secondary" className="bg-muted text-foreground font-bold">
            {filteredLeads.length}
          </Badge>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Buscar nome ou tel..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs bg-muted/30 border-input text-foreground"
            />
          </div>

          <Select value={selectedConsultant} onValueChange={setSelectedConsultant}>
            <SelectTrigger className="h-8 text-xs w-full sm:w-44 bg-muted/30 border-input text-foreground">
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                Todos Responsáveis
              </SelectItem>
              <SelectItem value="unassigned" className="text-xs">
                Não atribuído
              </SelectItem>
              {uniqueConsultantIds.map((id) => {
                const userObj = users.find((u) => u.id === id)
                return (
                  <SelectItem key={id} value={id} className="text-xs">
                    {userObj ? userObj.nome : id}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Kanban Board Columns Container */}
      <div className="flex flex-col h-full flex-1 overflow-hidden">
        <div
          ref={scrollContainerRef}
          onDragOver={handleContainerDragOver}
          onDragLeave={handleContainerDragLeave}
          className="w-full overflow-x-auto overflow-y-hidden flex flex-row items-stretch gap-4 px-6 pb-4 pt-4 custom-scrollbar flex-1 min-h-0"
        >
          {ASSISTENCIA_COLUMNS.map((col) => {
            const colLeads = filteredLeads.filter(
              (lead) => getColumnIdForStatus(lead.status) === col.id,
            )
            const isDropTarget = dragOverColId === col.id

            return (
              <div
                key={col.id}
                className={cn(
                  'w-[320px] min-w-[320px] rounded-xl border border-border transition-colors duration-200 shrink-0 flex flex-col h-full bg-muted/30',
                  isDropTarget && 'bg-accent/50 ring-2 ring-primary/50',
                )}
                onDragOver={(e) => handleDragOverCol(e, col.id)}
                onDragLeave={handleDragLeaveCol}
                onDrop={(e) => handleDrop(e, col.id)}
              >
                {/* Cabeçalho da Coluna */}
                <div className="flex items-center justify-between border-b border-border px-4 py-3 sticky top-0 z-10 shadow-sm shrink-0 bg-muted/50 rounded-t-xl">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground text-sm uppercase tracking-wider">
                      {col.title}
                    </h3>
                  </div>
                  <Badge variant="secondary" className="bg-card text-primary font-bold shadow-sm">
                    {colLeads.length}
                  </Badge>
                </div>

                {/* Lista de Cards da Coluna */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar flex flex-col min-h-[150px]">
                  {colLeads.map((lead) => {
                    const consultorNome =
                      lead.consultor?.nome ||
                      users.find((u) => u.id === lead.consultor_id)?.nome ||
                      ''
                    const currentLeadColId = getColumnIdForStatus(lead.status)

                    return (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, lead.id)}
                        onDragEnd={handleDragEnd}
                        className={cn(
                          'group relative cursor-grab active:cursor-grabbing transition-all duration-200',
                          'bg-card text-card-foreground p-2 rounded-md shadow-sm hover:shadow-md w-full flex flex-col gap-1.5 border-2',
                          'border-border hover:border-primary/50 dark:border-cyan-500/50 dark:shadow-[0_0_15px_rgba(6,182,212,0.4)] dark:hover:border-cyan-400',
                        )}
                      >
                        {/* Ações de Hover (MoveRight + Grip) */}
                        <div className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 z-10 text-muted-foreground/50 bg-card rounded">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                onClick={(e) => e.stopPropagation()}
                                onPointerDown={(e) => e.stopPropagation()}
                                className="p-1 rounded transition-colors text-muted-foreground/50 hover:text-primary hover:bg-primary/10"
                                title="Mover para"
                              >
                                <MoveRight className="h-3.5 w-3.5" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="min-w-[160px]"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <DropdownMenuLabel className="text-xs font-semibold">
                                Mover para
                              </DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {ASSISTENCIA_COLUMNS.map((c) => (
                                <DropdownMenuItem
                                  key={c.id}
                                  className={cn(
                                    'text-xs',
                                    c.id === currentLeadColId && 'opacity-50 pointer-events-none',
                                  )}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (c.id !== currentLeadColId) {
                                      handleStatusChange(lead.id, c.id)
                                    }
                                  }}
                                >
                                  {c.title}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>

                          <div className="p-1 cursor-grab active:cursor-grabbing">
                            <GripVertical className="h-3.5 w-3.5" />
                          </div>
                        </div>

                        {/* Topo do Card: Nome do Cliente + Telefone */}
                        <div className="pr-12 flex flex-col gap-0.5">
                          <h4
                            className="font-semibold leading-tight text-foreground text-sm truncate"
                            title={lead.nome || 'Sem nome'}
                          >
                            {lead.nome || 'Sem nome'}
                          </h4>
                          {lead.telefone && (
                            <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
                              <Phone className="w-3 h-3 shrink-0 opacity-70" />
                              <span className="truncate">{lead.telefone}</span>
                            </div>
                          )}
                        </div>

                        {/* Linha de Tempo na Coluna / Responsável */}
                        <div className="flex items-center justify-between mt-auto pt-0.5">
                          <div className="flex items-center gap-2">
                            <TimeInColumn dateStr={(lead as any).atualizado_em || lead.criado_em} />
                          </div>
                          {consultorNome && (
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground truncate max-w-[120px]">
                              <User className="h-3 w-3 shrink-0 text-primary" />
                              <span className="truncate" title={consultorNome}>
                                {consultorNome}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Dropdowns de Mudança de Status e Responsável */}
                        <div
                          className="border-t border-border pt-1.5 gap-1 flex flex-col"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Dropdown Status */}
                          <Select
                            value={currentLeadColId}
                            onValueChange={(val) => handleStatusChange(lead.id, val)}
                          >
                            <SelectTrigger className="h-6 text-[10px] w-full bg-muted/30 border-input text-foreground focus:ring-1 focus:ring-ring px-2">
                              <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                              {ASSISTENCIA_COLUMNS.map((c) => (
                                <SelectItem key={c.id} value={c.id} className="text-[10px] py-1">
                                  {c.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {/* Dropdown Responsável */}
                          <Select
                            value={lead.consultor_id || 'unassigned'}
                            onValueChange={(val) =>
                              handleAssignConsultant(lead.id, val === 'unassigned' ? null : val)
                            }
                          >
                            <SelectTrigger className="h-6 text-[10px] px-2 w-full bg-muted/30 border-input text-foreground focus:ring-1 focus:ring-ring">
                              <SelectValue placeholder="Atribuir responsável..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem
                                value="unassigned"
                                className="text-[10px] py-1 text-muted-foreground"
                              >
                                Não atribuído
                              </SelectItem>
                              {users.map((u) => (
                                <SelectItem key={u.id} value={u.id} className="text-[10px] py-1">
                                  {u.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )
                  })}

                  {colLeads.length === 0 && (
                    <div className="flex-1 min-h-[120px] h-full flex items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/20 pointer-events-none">
                      <p className="text-sm font-medium text-muted-foreground">
                        Solte os cards aqui
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
