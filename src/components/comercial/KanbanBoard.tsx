import { useState, useEffect, useMemo } from 'react'
import {
  Target,
  Search,
  Users,
  CheckCircle2,
  CalendarDays,
  LayoutDashboard,
  List,
  ArrowUpDown,
} from 'lucide-react'
import { KanbanColumn } from './KanbanColumn'
import { LeadModal } from './LeadModal'
import { ConfirmSellModal } from './ConfirmSellModal'
import { DeleteLeadModal } from './DeleteLeadModal'
import { fetchLeads, fetchUsers, createLead, updateLead, deleteLead } from '@/services/comercial'
import { useToast } from '@/hooks/use-toast'
import { Lead } from '@/types'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const COLUMNS = [
  'Novo Lead',
  'Aguardando Consultor',
  'Contactado',
  'Em Nutrição',
  'Designar Consultor',
  'Consultoria Inicial',
  'Projeto',
  'Apresentação',
  'Negociação',
  'Ação Gerente',
  'Stand By',
  'Vendido',
  'Perdido',
]

export function KanbanBoard() {
  const { user } = useAuth()
  const [leads, setLeads] = useState<Lead[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [consultantFilter, setConsultantFilter] = useState('')
  const [activeCol, setActiveCol] = useState(COLUMNS[0])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')
  const [collapsedCols, setCollapsedCols] = useState<string[]>([])
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(
    null,
  )

  const [formOpen, setFormOpen] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null)
  const [leadToSell, setLeadToSell] = useState<Lead | null>(null)

  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverCol, setDragOverCol] = useState<string | null>(null)

  const { toast } = useToast()

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [lData, uData] = await Promise.all([fetchLeads(), fetchUsers()])
      setLeads(lData)
      setUsers(uData)
      setError(null)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    const channel = supabase
      .channel('leads_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => loadData())
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(handler)
  }, [search])

  const handleSaveLead = async (data: any) => {
    try {
      if (editingLead) {
        await updateLead(editingLead.id, data)
        toast({
          description: 'Lead atualizado com sucesso!',
          className: 'bg-dark-denim text-off-white border-none p-4 rounded-lg',
        })
      } else {
        const userName = user?.user_metadata?.nome || user?.email?.split('@')[0] || 'Desconhecido'
        await createLead({
          ...data,
          status: 'Novo Lead',
          ordem: leads.filter((l) => l.status === 'Novo Lead').length,
          criado_por_nome: userName,
        })
        toast({
          description: 'Lead criado com sucesso!',
          className: 'bg-dark-denim text-off-white border-none p-4 rounded-lg',
        })
      }
      setFormOpen(false)
      setEditingLead(null)
      loadData()
    } catch (e: any) {
      toast({
        description: e.message,
        variant: 'destructive',
        className: 'bg-steel-blue text-off-white border-none p-4 rounded-lg',
      })
    }
  }

  const handleConfirmDelete = async () => {
    if (!leadToDelete) return
    try {
      await deleteLead(leadToDelete.id)
      toast({
        description: 'Lead deletado com sucesso!',
        className: 'bg-dark-denim text-off-white border-none p-4 rounded-lg',
      })
      setLeadToDelete(null)
      loadData()
    } catch (e: any) {
      toast({
        description: e.message,
        variant: 'destructive',
        className: 'bg-steel-blue text-off-white border-none p-4 rounded-lg',
      })
    }
  }

  const handleDrop = async (e: React.DragEvent, status: string) => {
    e.preventDefault()
    setDragOverCol(null)
    setDraggingId(null)

    const id = e.dataTransfer.getData('leadId')
    if (!id) return

    const lead = leads.find((l) => l.id === id)
    if (!lead || lead.status === status) return

    const newOrder = leads.filter((l) => l.status === status).length
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status, ordem: newOrder } : l)))
    await updateLead(id, { status, ordem: newOrder })

    if (status === 'Vendido') {
      setLeadToSell({ ...lead, status: 'Vendido' })
    }
  }

  const filteredLeads = useMemo(
    () =>
      leads.filter((l) => {
        const matchS =
          l.nome.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          l.email.toLowerCase().includes(debouncedSearch.toLowerCase())
        const matchO = sourceFilter ? l.origem === sourceFilter : true
        const matchCat = categoryFilter ? l.categoria === categoryFilter : true
        const matchC = consultantFilter ? l.consultor_id === consultantFilter : true
        return matchS && matchO && matchCat && matchC
      }),
    [leads, debouncedSearch, sourceFilter, categoryFilter, consultantFilter],
  )

  const sortedLeads = useMemo(() => {
    const sortable = [...filteredLeads]
    if (sortConfig !== null) {
      sortable.sort((a: any, b: any) => {
        let aVal = a[sortConfig.key]
        let bVal = b[sortConfig.key]

        if (sortConfig.key === 'consultor') {
          aVal = a.consultor?.nome || ''
          bVal = b.consultor?.nome || ''
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }
    return sortable
  }, [filteredLeads, sortConfig])

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc'
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const toggleCollapse = (col: string) => {
    setCollapsedCols((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col],
    )
  }

  // KPIs
  const totalLeads = leads.length
  const activeLeads = leads.filter((l) => l.kanban_ativo !== false).length
  const newThisMonth = leads.filter((l) => {
    const d = new Date(l.criado_em)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length
  const convertedLeads = leads.filter((l) => l.status === 'Vendido').length
  const conversionRate = totalLeads ? Math.round((convertedLeads / totalLeads) * 100) : 0

  if (isLoading) {
    return (
      <div className="flex gap-4 h-full">
        {COLUMNS.map((c) => (
          <div
            key={c}
            className="flex-1 min-w-[300px] h-full bg-pale-cornflower animate-pulse rounded-lg"
          ></div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-pale-cornflower p-6 rounded-lg text-center border-2 border-steel-blue">
        <p className="text-midnight-navy font-bold text-[18px] mb-4">{error}</p>
        <button
          onClick={loadData}
          className="bg-dark-denim text-off-white px-6 py-3 rounded-lg hover:opacity-90 min-h-[44px] transition-opacity duration-200"
        >
          Tentar Novamente
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 shrink-0">
        <div className="bg-white border border-gray-100 p-4 rounded-xl flex items-center gap-4 shadow-sm">
          <div className="bg-midnight-navy/10 p-3 rounded-lg shrink-0">
            <Users className="w-6 h-6 text-midnight-navy" />
          </div>
          <div>
            <p className="text-sm text-steel-blue font-medium leading-tight">Total Leads</p>
            <p className="text-2xl font-bold text-midnight-navy leading-none mt-1">{totalLeads}</p>
          </div>
        </div>
        <div className="bg-white border border-gray-100 p-4 rounded-xl flex items-center gap-4 shadow-sm">
          <div className="bg-emerald-500/10 p-3 rounded-lg shrink-0">
            <Target className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm text-steel-blue font-medium leading-tight">Leads Ativos</p>
            <p className="text-2xl font-bold text-midnight-navy leading-none mt-1">{activeLeads}</p>
          </div>
        </div>
        <div className="bg-white border border-gray-100 p-4 rounded-xl flex items-center gap-4 shadow-sm">
          <div className="bg-blue-500/10 p-3 rounded-lg shrink-0">
            <CalendarDays className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-steel-blue font-medium leading-tight">Novos (Mês)</p>
            <p className="text-2xl font-bold text-midnight-navy leading-none mt-1">
              {newThisMonth}
            </p>
          </div>
        </div>
        <div className="bg-white border border-gray-100 p-4 rounded-xl flex items-center gap-4 shadow-sm">
          <div className="bg-amber-500/10 p-3 rounded-lg shrink-0">
            <CheckCircle2 className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <p className="text-sm text-steel-blue font-medium leading-tight">Conversão</p>
            <p className="text-2xl font-bold text-midnight-navy leading-none mt-1">
              {conversionRate}%
            </p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl shadow-sm mb-6 shrink-0 flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between border border-gray-100">
        <div className="flex items-center gap-2 w-full xl:w-auto bg-pale-cornflower p-1 rounded-lg">
          <button
            onClick={() => setViewMode('kanban')}
            className={cn(
              'flex-1 xl:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-md font-medium transition-all',
              viewMode === 'kanban'
                ? 'bg-white shadow-sm text-midnight-navy'
                : 'text-steel-blue hover:text-midnight-navy',
            )}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Kanban</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'flex-1 xl:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-md font-medium transition-all',
              viewMode === 'list'
                ? 'bg-white shadow-sm text-midnight-navy'
                : 'text-steel-blue hover:text-midnight-navy',
            )}
          >
            <List className="w-4 h-4" />
            <span>Lista</span>
          </button>
        </div>

        <div className="flex-1 flex flex-col md:flex-row flex-wrap gap-3 w-full xl:w-auto justify-end">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-steel-blue pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar lead..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 bg-gray-50 border border-gray-200 text-midnight-navy rounded-lg px-3 py-2 text-sm outline-none focus:border-dark-denim focus:ring-1 focus:ring-dark-denim transition-all"
            />
          </div>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="bg-gray-50 border border-gray-200 text-midnight-navy rounded-lg px-3 py-2 text-sm outline-none focus:border-dark-denim transition-all cursor-pointer min-w-[140px]"
          >
            <option value="">Origem (Todas)</option>
            <option value="Instagram">Instagram</option>
            <option value="Google">Google</option>
            <option value="WhatsApp">WhatsApp</option>
            <option value="Indicação">Indicação</option>
            <option value="Outro">Outro</option>
          </select>
          <select
            value={consultantFilter}
            onChange={(e) => setConsultantFilter(e.target.value)}
            className="bg-gray-50 border border-gray-200 text-midnight-navy rounded-lg px-3 py-2 text-sm outline-none focus:border-dark-denim transition-all cursor-pointer min-w-[150px]"
          >
            <option value="">Consultor (Todos)</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nome}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              setEditingLead(null)
              setFormOpen(true)
            }}
            className="bg-dark-denim text-white px-4 py-2 rounded-lg hover:opacity-90 font-medium transition-opacity shadow-sm text-sm"
          >
            + Novo Lead
          </button>
        </div>
      </div>

      {/* Content */}
      {leads.length === 0 && !debouncedSearch && !sourceFilter && !consultantFilter ? (
        <div className="bg-white p-12 rounded-xl shadow-sm text-center flex flex-col items-center justify-center m-auto max-w-lg w-full border border-gray-100">
          <Target className="w-12 h-12 text-steel-blue mb-4" />
          <h2 className="text-midnight-navy font-bold text-[24px] mb-2">Nenhum lead cadastrado</h2>
          <p className="text-steel-blue mb-6">
            Comece adicionando seu primeiro lead para gerenciar seu funil de vendas.
          </p>
          <button
            onClick={() => {
              setEditingLead(null)
              setFormOpen(true)
            }}
            className="bg-dark-denim text-white px-6 py-3 rounded-lg hover:opacity-90 font-medium transition-opacity shadow-sm"
          >
            Adicionar Primeiro Lead
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          {viewMode === 'kanban' ? (
            <>
              <div className="md:hidden mb-4 shrink-0">
                <select
                  className="w-full bg-pale-cornflower border-2 border-steel-blue text-midnight-navy rounded-lg px-4 py-3 min-h-[44px] outline-none focus:border-dark-denim focus:ring-1 focus:ring-dark-denim font-bold transition-all duration-200"
                  value={activeCol}
                  onChange={(e) => setActiveCol(e.target.value)}
                >
                  {COLUMNS.map((c) => (
                    <option key={c} value={c}>
                      {c} ({filteredLeads.filter((l) => l.status === c).length})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col md:flex-row gap-4 overflow-x-auto pb-4 flex-1 items-start h-full scrollbar-hide">
                {COLUMNS.map((col) => (
                  <KanbanColumn
                    key={col}
                    title={col}
                    leads={filteredLeads.filter((l) => l.status === col)}
                    isVisible={activeCol === col}
                    isCollapsed={collapsedCols.includes(col)}
                    onToggleCollapse={() => toggleCollapse(col)}
                    isDragOver={dragOverCol === col}
                    onDragOver={(e) => {
                      e.preventDefault()
                      if (dragOverCol !== col && !collapsedCols.includes(col)) setDragOverCol(col)
                    }}
                    onDragLeave={() => setDragOverCol(null)}
                    onDrop={(e) => handleDrop(e, col)}
                    onDragStart={(e, id) => {
                      e.dataTransfer.setData('leadId', id)
                      setDraggingId(id)
                    }}
                    onDragEnd={() => {
                      setDraggingId(null)
                      setDragOverCol(null)
                    }}
                    draggingId={draggingId}
                    onEdit={(l) => {
                      setEditingLead(l)
                      setFormOpen(true)
                    }}
                    onDelete={(l) => setLeadToDelete(l)}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 h-full overflow-auto shadow-sm">
              <Table>
                <TableHeader className="bg-gray-50/80 sticky top-0 z-10 backdrop-blur-sm">
                  <TableRow>
                    <TableHead
                      className="font-semibold text-midnight-navy cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('nome')}
                    >
                      <div className="flex items-center gap-1">
                        Nome <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="font-semibold text-midnight-navy cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('email')}
                    >
                      <div className="flex items-center gap-1">
                        E-mail <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="font-semibold text-midnight-navy cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('telefone')}
                    >
                      <div className="flex items-center gap-1">
                        Telefone <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="font-semibold text-midnight-navy cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('origem')}
                    >
                      <div className="flex items-center gap-1">
                        Origem <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="font-semibold text-midnight-navy cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center gap-1">
                        Status <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="font-semibold text-midnight-navy cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort('consultor')}
                    >
                      <div className="flex items-center gap-1">
                        Consultor <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </TableHead>
                    <TableHead className="text-right font-semibold text-midnight-navy">
                      Ações
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedLeads.length > 0 ? (
                    sortedLeads.map((lead) => (
                      <TableRow key={lead.id} className="hover:bg-gray-50/50">
                        <TableCell className="font-medium text-midnight-navy">
                          {lead.nome}
                        </TableCell>
                        <TableCell className="text-steel-blue">{lead.email}</TableCell>
                        <TableCell className="text-steel-blue">{lead.telefone}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-pale-cornflower text-dark-denim">
                            {lead.origem.replace('WhatsApp - ', '')}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border border-gray-200 bg-white text-midnight-navy">
                            {lead.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-steel-blue">
                          {lead.consultor?.nome || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <button
                            onClick={() => {
                              setEditingLead(lead)
                              setFormOpen(true)
                            }}
                            className="text-steel-blue hover:text-dark-denim font-medium text-sm transition-colors"
                          >
                            Editar
                          </button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center text-steel-blue">
                        Nenhum lead encontrado com os filtros atuais.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {(formOpen || editingLead) && (
        <LeadModal
          lead={editingLead}
          users={users}
          onClose={() => {
            setFormOpen(false)
            setEditingLead(null)
          }}
          onSave={handleSaveLead}
        />
      )}
      {leadToDelete && (
        <DeleteLeadModal onClose={() => setLeadToDelete(null)} onConfirm={handleConfirmDelete} />
      )}
      {leadToSell && <ConfirmSellModal lead={leadToSell} onClose={() => setLeadToSell(null)} />}
    </div>
  )
}
