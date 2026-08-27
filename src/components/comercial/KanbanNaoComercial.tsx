import { useState, useEffect, useMemo } from 'react'
import { Inbox, Search } from 'lucide-react'
import { KanbanColumn } from './KanbanColumn'
import { LeadModal } from './LeadModal'
import { fetchLeads, fetchUsers, updateLead } from '@/services/comercial'
import { useToast } from '@/hooks/use-toast'
import { Lead } from '@/types'
import { supabase } from '@/lib/supabase/client'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { createPortal } from 'react-dom'
import {
  COLUMNS,
  NAO_COMERCIAL_COLUMNS,
  NAO_COMERCIAL_CATEGORIAS,
  isCategoriaComercial,
} from './constants'

interface KanbanNaoComercialProps {
  toolbarPortal?: HTMLDivElement | null
  isActive?: boolean
}

export function KanbanNaoComercial({ toolbarPortal, isActive = true }: KanbanNaoComercialProps) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [activeCol, setActiveCol] = useState(NAO_COMERCIAL_COLUMNS[0])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [collapsedCols, setCollapsedCols] = useState<string[]>([])

  const [formOpen, setFormOpen] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)

  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverCol, setDragOverCol] = useState<string | null>(null)

  const { toast } = useToast()

  const loadData = async (isSilent = false) => {
    try {
      if (!isSilent) setIsLoading(true)
      const [lData, uData] = await Promise.all([fetchLeads(), fetchUsers()])
      setLeads(lData)
      setUsers(uData)
      setError(null)
    } catch (e: any) {
      console.error('Error loading Não Comercial data:', e)
      if (!isSilent) setError(e.message || 'Erro ao carregar dados.')
    } finally {
      if (!isSilent) setIsLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true
    loadData()
    const channel = supabase
      .channel('nao_comercial_leads_changes')
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
    const handler = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(handler)
  }, [search])

  const handleSaveLead = async (data: any) => {
    try {
      if (editingLead) {
        await updateLead(editingLead.id, data)
        toast({ description: 'Contato atualizado com sucesso!' })
      }
      setFormOpen(false)
      setEditingLead(null)
      loadData()
    } catch (e: any) {
      toast({ description: e.message, variant: 'destructive' })
    }
  }

  const handleStatusChange = async (id: string, newStatus: string) => {
    const lead = leads.find((l) => l.id === id)
    if (!lead || lead.status === newStatus) return
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status: newStatus } : l)))
    try {
      await updateLead(id, { status: newStatus })
    } catch (e: any) {
      toast({ description: 'Erro ao mover contato.', variant: 'destructive' })
      loadData()
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
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)))
    await updateLead(id, { status })
  }

  const filteredLeads = useMemo(
    () =>
      leads.filter((l) => {
        if (!l.kanban_ativo) return false
        if ((l as any).arquivado_comercial) return false
        if (isCategoriaComercial(l.categoria)) return false
        const matchS =
          (l.nome || '').toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          (l.email || '').toLowerCase().includes(debouncedSearch.toLowerCase())
        const matchCat = categoryFilter ? l.categoria === categoryFilter : true
        return matchS && matchCat
      }),
    [leads, debouncedSearch, categoryFilter],
  )

  // Blindagem: status null/undefined ou desconhecido (não está nem em NAO_COMERCIAL_COLUMNS
  // nem em COLUMNS) cai na coluna 'Novo' como fallback. Status comerciais válidos não
  // são jogados em 'Novo' (continuam sem coluna própria neste kanban).
  const leadsForCol = (col: string) =>
    filteredLeads.filter((l) => {
      const status = l.status
      if (!status || (!NAO_COMERCIAL_COLUMNS.includes(status) && !COLUMNS.includes(status))) {
        return col === 'Novo'
      }
      return NAO_COMERCIAL_COLUMNS.includes(status) && status === col
    })

  const toggleCollapse = (col: string) => {
    setCollapsedCols((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col],
    )
  }

  if (isLoading) {
    return (
      <div className="flex gap-4 h-full">
        {NAO_COMERCIAL_COLUMNS.map((c) => (
          <div
            key={c}
            className="flex-1 min-w-[300px] h-full bg-muted/50 border animate-pulse rounded-lg"
          />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-card p-6 rounded-lg text-center border">
        <p className="text-foreground font-bold text-lg mb-4">{error}</p>
        <button
          onClick={() => loadData()}
          className="bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 min-h-[44px] transition-colors"
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
          placeholder="Buscar contato..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 bg-background border border-input text-foreground placeholder:text-muted-foreground rounded-md px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring transition-all"
        />
      </div>
      <select
        value={categoryFilter}
        onChange={(e) => setCategoryFilter(e.target.value)}
        className="bg-background border border-input text-foreground rounded-md px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring transition-all cursor-pointer min-w-[160px]"
      >
        <option value="">Categoria (Todas)</option>
        {NAO_COMERCIAL_CATEGORIAS.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </>
  )

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {toolbarPortal instanceof Element && isActive ? createPortal(controls, toolbarPortal) : null}

      {filteredLeads.length === 0 && !debouncedSearch && !categoryFilter ? (
        <div className="bg-card p-12 rounded-xl shadow-sm text-center flex flex-col items-center justify-center m-auto max-w-lg w-full border">
          <Inbox className="w-12 h-12 text-muted-foreground mb-4" />
          <h2 className="text-foreground font-bold text-2xl mb-2">Nenhum contato não comercial</h2>
          <p className="text-muted-foreground mb-6">
            Contatos categorizados como Currículo, Parceiro, Fornecedor, entre outros, aparecerão
            aqui automaticamente. Use o botão "Mover para Não Comercial" nos cards do kanban
            Comercial.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="md:hidden mb-4 shrink-0">
            <select
              className="w-full bg-background border border-input text-foreground rounded-lg px-4 py-3 min-h-[44px] outline-none focus:border-primary focus:ring-2 focus:ring-ring font-medium transition-all"
              value={activeCol}
              onChange={(e) => setActiveCol(e.target.value)}
            >
              {NAO_COMERCIAL_COLUMNS.map((c) => (
                <option key={c} value={c}>
                  {c} ({leadsForCol(c).length})
                </option>
              ))}
            </select>
          </div>
          <ScrollArea className="flex-1 w-full kanban-scroll-wrapper">
            <div className="flex flex-col md:flex-row gap-4 pb-4 flex-1 items-stretch h-full w-max min-w-full">
              {NAO_COMERCIAL_COLUMNS.map((col) => (
                <KanbanColumn
                  key={col}
                  title={col}
                  leads={leadsForCol(col)}
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
                  onStatusChange={handleStatusChange}
                  columns={NAO_COMERCIAL_COLUMNS}
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
    </div>
  )
}
