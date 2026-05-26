import { useState, useEffect, useMemo } from 'react'
import { Target, Search } from 'lucide-react'
import { KanbanColumn } from './KanbanColumn'
import { LeadModal } from './LeadModal'
import { ConfirmSellModal } from './ConfirmSellModal'
import { DeleteLeadModal } from './DeleteLeadModal'
import { fetchLeads, fetchUsers, createLead, updateLead, deleteLead } from '@/services/comercial'
import { useToast } from '@/hooks/use-toast'
import { Lead } from '@/types'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'

import { COLUMNS } from './constants'

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
  const [collapsedCols, setCollapsedCols] = useState<string[]>([])

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

  const handleStatusChange = async (id: string, newStatus: string) => {
    const lead = leads.find((l) => l.id === id)
    if (!lead || lead.status === newStatus) return

    const newOrder = leads.filter((l) => l.status === newStatus).length
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status: newStatus, ordem: newOrder } : l)),
    )

    try {
      await updateLead(id, { status: newStatus, ordem: newOrder })
      if (newStatus === 'Vendido') {
        setLeadToSell({ ...lead, status: 'Vendido' })
      }
    } catch (e: any) {
      toast({
        description: 'Erro ao mover lead.',
        variant: 'destructive',
      })
      loadData()
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

  const toggleCollapse = (col: string) => {
    setCollapsedCols((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col],
    )
  }

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
      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl shadow-sm mb-6 shrink-0 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between border border-gray-100">
        <div className="flex-1 flex flex-col md:flex-row flex-wrap gap-3 w-full justify-end">
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
        <div className="flex-1 overflow-hidden flex flex-col">
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
          <ScrollArea className="flex-1 w-full kanban-scroll-wrapper">
            <div className="flex flex-col md:flex-row gap-4 pb-4 flex-1 items-stretch h-full w-max min-w-full">
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
                  onStatusChange={handleStatusChange}
                  columns={COLUMNS}
                />
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
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
