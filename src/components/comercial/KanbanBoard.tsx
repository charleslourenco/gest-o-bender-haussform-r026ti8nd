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
import { createPortal } from 'react-dom'

import { COLUMNS } from './constants'

interface KanbanBoardProps {
  toolbarPortal?: HTMLDivElement | null
  isActive?: boolean
}

export function KanbanBoard({ toolbarPortal, isActive = true }: KanbanBoardProps) {
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
        })
      } else {
        const userName = user?.user_metadata?.nome || user?.email?.split('@')[0] || 'Desconhecido'
        await createLead({
          ...data,
          status: 'Novo Lead',
          ordem: leads.filter((l) => l.kanban_ativo && l.status === 'Novo Lead').length,
          criado_por_nome: userName,
          kanban_ativo: true,
        })
        toast({
          description: 'Lead criado com sucesso!',
        })
      }
      setFormOpen(false)
      setEditingLead(null)
      loadData()
    } catch (e: any) {
      toast({
        description: e.message,
        variant: 'destructive',
      })
    }
  }

  const handleStatusChange = async (id: string, newStatus: string) => {
    const lead = leads.find((l) => l.id === id)
    if (!lead || lead.status === newStatus) return

    const newOrder = leads.filter((l) => l.kanban_ativo && l.status === newStatus).length
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
      })
      setLeadToDelete(null)
      loadData()
    } catch (e: any) {
      toast({
        description: e.message,
        variant: 'destructive',
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

    const newOrder = leads.filter((l) => l.kanban_ativo && l.status === status).length
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status, ordem: newOrder } : l)))
    await updateLead(id, { status, ordem: newOrder })

    if (status === 'Vendido') {
      setLeadToSell({ ...lead, status: 'Vendido' })
    }
  }

  const filteredLeads = useMemo(
    () =>
      leads.filter((l) => {
        if (!l.kanban_ativo) return false
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
            className="flex-1 min-w-[300px] h-full bg-muted/50 border animate-pulse rounded-lg"
          ></div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-card p-6 rounded-lg text-center border">
        <p className="text-foreground font-bold text-lg mb-4">{error}</p>
        <button
          onClick={loadData}
          className="bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 min-h-[44px] transition-colors duration-200"
        >
          Tentar Novamente
        </button>
      </div>
    )
  }

  const controls = (
    <>
      <div className="relative flex-1 min-w-[200px] max-w-md">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder="Buscar lead..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 bg-background border border-input text-foreground placeholder:text-muted-foreground rounded-md px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring transition-all"
        />
      </div>
      <select
        value={sourceFilter}
        onChange={(e) => setSourceFilter(e.target.value)}
        className="bg-background border border-input text-foreground rounded-md px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring transition-all cursor-pointer min-w-[140px]"
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
        className="bg-background border border-input text-foreground rounded-md px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring transition-all cursor-pointer min-w-[150px]"
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
        className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-1.5 rounded-md font-medium transition-colors shadow-sm text-sm border border-primary/20 whitespace-nowrap"
      >
        + Novo Lead
      </button>
    </>
  )

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {toolbarPortal && isActive ? createPortal(controls, toolbarPortal) : null}

      {/* Content */}
      {leads.length === 0 && !debouncedSearch && !sourceFilter && !consultantFilter ? (
        <div className="bg-card p-12 rounded-xl shadow-sm text-center flex flex-col items-center justify-center m-auto max-w-lg w-full border">
          <Target className="w-12 h-12 text-muted-foreground mb-4" />
          <h2 className="text-foreground font-bold text-2xl mb-2">Nenhum lead cadastrado</h2>
          <p className="text-muted-foreground mb-6">
            Comece adicionando seu primeiro lead para gerenciar seu funil de vendas.
          </p>
          <button
            onClick={() => {
              setEditingLead(null)
              setFormOpen(true)
            }}
            className="bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 font-medium transition-colors shadow-sm"
          >
            Adicionar Primeiro Lead
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="md:hidden mb-4 shrink-0">
            <select
              className="w-full bg-background border border-input text-foreground rounded-lg px-4 py-3 min-h-[44px] outline-none focus:border-primary focus:ring-2 focus:ring-ring font-medium transition-all duration-200"
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
