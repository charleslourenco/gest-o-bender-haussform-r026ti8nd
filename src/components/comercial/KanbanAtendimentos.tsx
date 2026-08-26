import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Lead } from '@/types'
import { supabase } from '@/lib/supabase/client'
import { fetchLeads, fetchUsers, createLead, updateLead, deleteLead } from '@/services/comercial'
import { arquivarLead } from '@/services/arquivamento'
import {
  AtendimentoAbaConfig,
  ATENDIMENTO_ABAS,
  getLeadAba,
  parseLeadMetadados,
  stringifyLeadMetadados,
  cleanColumnTitle,
  LeadMetadados,
} from './constants'
import { CardAtendimento } from './CardAtendimento'
import { ModalAtendimento } from './ModalAtendimento'
import { ConfirmSellModal } from './ConfirmSellModal'
import { DeleteLeadModal } from './DeleteLeadModal'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Search, ChevronLeft, ChevronRight, User, Phone, Inbox, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { useAuth } from '@/hooks/use-auth'

export interface KanbanAtendimentosProps {
  aba: AtendimentoAbaConfig
  toolbarPortal?: HTMLDivElement | null
  isActive?: boolean
  onOpenLeadGlobal?: (lead: Lead) => void
}

export function KanbanAtendimentos({
  aba,
  toolbarPortal,
  isActive = true,
  onOpenLeadGlobal,
}: KanbanAtendimentosProps) {
  const { user, loading: authLoading } = useAuth()
  const [leads, setLeads] = useState<Lead[]>([])
  const [users, setUsers] = useState<Array<{ id: string; nome: string }>>([])
  const [loading, setLoading] = useState(true)

  // Unread badge counts per lead
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})

  // Filtros
  const [search, setSearch] = useState('')
  const [responsavelFilter, setResponsavelFilter] = useState('all')

  // Drag and Drop
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverCol, setDragOverCol] = useState<string | null>(null)

  // Modais
  const [selectedLeadForModal, setSelectedLeadForModal] = useState<Lead | null>(null)
  const [leadToSell, setLeadToSell] = useState<Lead | null>(null)
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null)

  // Novo Lead rápido
  const [isCreatingQuickLead, setIsCreatingQuickLead] = useState(false)
  const [quickNome, setQuickNome] = useState('')
  const [quickTelefone, setQuickTelefone] = useState('')

  const scrollRef = useRef<HTMLDivElement>(null)
  const leadsRef = useRef<Lead[]>([])
  leadsRef.current = leads

  // Limpar contagem de não lidas quando abrir o modal de conversa
  const handleOpenLeadModal = (lead: Lead) => {
    if (lead?.id) {
      setUnreadCounts((prev) => {
        if (!prev[lead.id]) return prev
        const copy = { ...prev }
        delete copy[lead.id]
        return copy
      })
    }
    setSelectedLeadForModal(lead)
  }

  // Carregar dados
  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      const [leadsRes, usersRes] = await Promise.allSettled([fetchLeads(), fetchUsers()])
      const leadsData = leadsRes.status === 'fulfilled' ? leadsRes.value : []
      const usersData = usersRes.status === 'fulfilled' ? usersRes.value : []

      if (leadsRes.status === 'rejected') {
        console.error('Erro ao buscar leads:', leadsRes.reason)
      }
      if (usersRes.status === 'rejected') {
        console.error('Erro ao buscar users:', usersRes.reason)
      }

      const safeLeads = Array.isArray(leadsData) ? leadsData : []
      const safeUsers = Array.isArray(usersData) ? usersData : []
      setLeads(safeLeads)
      setUsers(safeUsers)

      // Atualizar lead selecionado no modal se estiver aberto
      setSelectedLeadForModal((curr) => {
        if (!curr) return null
        const updated = safeLeads.find((l: any) => l.id === curr.id)
        return updated ? (updated as any) : curr
      })
    } catch (err: any) {
      console.error('Erro ao carregar leads do Kanban:', err)
      if (!silent) toast.error('Erro ao carregar atendimentos')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true
    loadData()

    const channelId = `${aba.id}_${Math.random().toString(36).substring(2, 9)}`

    // Realtime channel para leads com identificador único da aba
    const leadsChannel = supabase
      .channel(`kanban_leads_${channelId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        if (isMounted) loadData(true)
      })
      .subscribe()

    // Realtime channel para novas mensagens do WhatsApp
    const msgChannel = supabase
      .channel(`kanban_msgs_${channelId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'whatsapp_messages' },
        async (payload) => {
          if (!isMounted) return
          const newMsg = payload.new as any
          if (!newMsg) return

          // Ignorar mensagens de saída enviadas por operadores humanos/sistema
          const isClientInbound =
            newMsg.direction === 'inbound' ||
            newMsg.sender_type === 'cliente' ||
            newMsg.sender_type === 'lead'

          if (!isClientInbound) return

          // Localizar o lead correspondente
          const currentList = leadsRef.current
          let matchedLead = currentList.find(
            (l) => l.id === newMsg.lead_id || (newMsg.phone && l.telefone === newMsg.phone),
          )

          // Se não encontrou no estado em memória, buscar do banco
          if (!matchedLead && (newMsg.lead_id || newMsg.phone)) {
            try {
              let query = supabase
                .from('leads')
                .select('*, consultor:users!leads_consultor_id_fkey(nome)')
              if (newMsg.lead_id) {
                query = query.eq('id', newMsg.lead_id)
              } else if (newMsg.phone) {
                query = query.eq('telefone', newMsg.phone)
              }
              const { data: leadFound } = await query.maybeSingle()
              if (leadFound) matchedLead = leadFound as any
            } catch (err) {
              console.error('Erro ao localizar lead da mensagem:', err)
            }
          }

          if (matchedLead) {
            // Incrementar badge visual de mensagens não lidas
            setUnreadCounts((prev) => ({
              ...prev,
              [matchedLead!.id]: (prev[matchedLead!.id] || 0) + 1,
            }))

            // Determinar a aba a que o lead pertence
            const targetAba = getLeadAba(matchedLead)
            const leadName = matchedLead.nome || 'Lead'
            const abaTitle = targetAba.titulo || 'Atendimentos'

            // Disparar o toast com auto-dismiss de 8 segundos e clique para abrir modal
            const toastMessage = `🟢 ${leadName} (${abaTitle}) mandou nova mensagem`
            const previewText = newMsg.content
              ? `"${newMsg.content.substring(0, 70)}${newMsg.content.length > 70 ? '...' : ''}"`
              : undefined

            toast(toastMessage, {
              description: previewText,
              duration: 8000,
              action: {
                label: 'Ver Conversa',
                onClick: () => {
                  if (onOpenLeadGlobal) {
                    onOpenLeadGlobal(matchedLead!)
                  } else {
                    handleOpenLeadModal(matchedLead!)
                  }
                },
              },
            })
          }
        },
      )
      .subscribe()

    return () => {
      isMounted = false
      leadsChannel.unsubscribe()
      msgChannel.unsubscribe()
      supabase.removeChannel(leadsChannel)
      supabase.removeChannel(msgChannel)
    }
  }, [aba.id])

  // Atualizar Lead (reutilizável)
  const handleUpdateLead = async (id: string, updates: Partial<Lead>) => {
    try {
      // Otimista
      setLeads((prev) =>
        prev.map((l) =>
          l.id === id ? { ...l, ...updates, atualizado_em: new Date().toISOString() } : l,
        ),
      )
      if (selectedLeadForModal?.id === id) {
        setSelectedLeadForModal((prev) => (prev ? { ...prev, ...updates } : null))
      }

      await updateLead(id, updates)

      // Se moveu para vendido, acionar modal de venda
      if (updates.status === 'Vendido') {
        const leadObj = leads.find((l) => l.id === id)
        if (leadObj) {
          setLeadToSell({ ...leadObj, ...updates, status: 'Vendido' })
        }
      }
    } catch (err: any) {
      console.error('Erro ao atualizar lead:', err)
      toast.error('Erro ao atualizar card')
      loadData(true)
    }
  }

  // Encaminhar card para outra aba
  const handleForwardLead = async (leadId: string, destinoAbaId: string) => {
    const lead = leads.find((l) => l.id === leadId)
    if (!lead) return

    const destinoAba = ATENDIMENTO_ABAS.find((a) => a.id === destinoAbaId)
    if (!destinoAba) return

    try {
      const { notas, meta } = parseLeadMetadados((lead as any).notas_pessoais)
      const newMeta: LeadMetadados = {
        ...meta,
        origem_aba: aba.id,
        encaminhado_para_aba: destinoAbaId,
        encaminhado_em: new Date().toISOString(),
      }
      const newNotasPessoais = stringifyLeadMetadados(notas, newMeta)

      // Se a aba de origem tiver coluna "Encaminhado Para" ou similar, coloca lá
      const encaminhadoCol =
        aba.colunas.find((c) => c.toLowerCase().includes('encaminhado')) ||
        aba.colunas[aba.colunas.length - 1]

      await updateLead(leadId, {
        status: encaminhadoCol,
        categoria: destinoAba.categoriaPadrao,
        notas_pessoais: newNotasPessoais,
      } as any)

      toast.success(`Card encaminhado com sucesso para "${destinoAba.titulo}"!`)
      loadData(true)
    } catch (err: any) {
      console.error('Erro ao encaminhar card:', err)
      toast.error('Erro ao encaminhar lead')
    }
  }

  // Arquivar
  const handleArchiveLead = async (id: string) => {
    try {
      await arquivarLead(id)
      setLeads((prev) => prev.filter((l) => l.id !== id))
      if (selectedLeadForModal?.id === id) setSelectedLeadForModal(null)
      toast.success('Lead arquivado com sucesso!')
    } catch (err: any) {
      toast.error('Erro ao arquivar lead: ' + err.message)
    }
  }

  // Deletar
  const handleConfirmDelete = async () => {
    if (!leadToDelete) return
    try {
      await deleteLead(leadToDelete.id)
      setLeads((prev) => prev.filter((l) => l.id !== leadToDelete.id))
      if (selectedLeadForModal?.id === leadToDelete.id) setSelectedLeadForModal(null)
      setLeadToDelete(null)
      toast.success('Lead excluído!')
    } catch (err: any) {
      toast.error('Erro ao excluir: ' + err.message)
    }
  }

  // Criar Novo Lead Rápido
  const handleCreateQuickLead = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickNome.trim() || !quickTelefone.trim()) {
      toast.error('Preencha nome e telefone')
      return
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const currentAuthUser = user || sessionData?.session?.user
      const userName =
        currentAuthUser?.user_metadata?.nome || currentAuthUser?.email?.split('@')[0] || 'Sistema'

      let phoneDigits = quickTelefone.replace(/\D/g, '')
      if (phoneDigits.length === 10)
        phoneDigits = '55' + phoneDigits.slice(0, 2) + '9' + phoneDigits.slice(2)
      else if (phoneDigits.length === 11) phoneDigits = '55' + phoneDigits
      else if (phoneDigits.length === 12 && phoneDigits.startsWith('55'))
        phoneDigits = '55' + phoneDigits.slice(2, 4) + '9' + phoneDigits.slice(4)

      const initialStatus = aba.colunas[0]
      const initialCategoria = aba.categoriaPadrao

      await createLead({
        nome: quickNome.trim(),
        telefone: phoneDigits,
        origem: 'WhatsApp',
        status: initialStatus,
        categoria: initialCategoria,
        criado_por_nome: userName,
        kanban_ativo: true,
      })

      setQuickNome('')
      setQuickTelefone('')
      setIsCreatingQuickLead(false)
      toast.success('Lead adicionado com sucesso!')
      loadData(true)
    } catch (err: any) {
      toast.error('Erro ao criar lead: ' + err.message)
    }
  }

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('leadId', id)
    setDraggingId(id)
  }

  const handleDragEnd = () => {
    setDraggingId(null)
    setDragOverCol(null)
  }

  const handleDrop = async (e: React.DragEvent, targetCol: string) => {
    e.preventDefault()
    setDragOverCol(null)
    setDraggingId(null)

    const id = e.dataTransfer.getData('leadId')
    if (!id) return

    const lead = leads.find((l) => l.id === id)
    if (!lead || lead.status === targetCol) return

    await handleUpdateLead(id, { status: targetCol })
  }

  // Filtragem dos Leads pertencentes a esta Aba
  const tabLeads = useMemo(() => {
    if (!Array.isArray(leads)) return []
    return leads.filter((l) => {
      try {
        if (!l || typeof l !== 'object') return false
        if ((l as any).arquivado_comercial || (l as any).excluido) return false

        const cat = typeof l.categoria === 'string' ? l.categoria.trim() : 'Comercial'
        const status = typeof l.status === 'string' ? l.status.trim() : ''
        const { meta } = parseLeadMetadados((l as any).notas_pessoais)

        // Regra 1: Se este card foi encaminhado PARA esta aba
        const isForwardedToThisAba = Boolean(
          meta?.encaminhado_para_aba && meta.encaminhado_para_aba === aba.id,
        )

        // Regra 2: Se o card foi encaminhado DAQUI para outra aba
        const isForwardedFromThisAba = Boolean(meta?.origem_aba && meta.origem_aba === aba.id)

        // Regra 3: Pertence naturalmente a esta aba por categoria/status
        let belongsNaturally = false

        if (aba.id === 'novo-contato') {
          belongsNaturally =
            status === 'Novo contato' ||
            status === 'Novo Contato' ||
            status === 'Novo Lead' ||
            status === 'Novo' ||
            (cat === 'Comercial' && !l.kanban_ativo)
        } else if (aba.id === 'lead-consultoria') {
          const consultoriaStatuses = [
            'Consultoria Inicial',
            'Projeto',
            'Apresentação',
            'Negociação',
            'Stand By',
            'Vendido',
            'Perdido',
            'Aguardando Consultor',
            'Ação Gerente',
            'Designar Consultor',
          ]
          belongsNaturally =
            (cat === 'Comercial' || cat === 'Já é Cliente') &&
            (consultoriaStatuses.includes(status) || Boolean(l.kanban_ativo))
        } else if (aba.id === 'lead-followup') {
          belongsNaturally =
            cat.toLowerCase() === 'follow up' ||
            status === 'Follow up' ||
            status === 'Encaminhado p/ Consultoria'
        } else if (aba.id === 'curriculos') {
          belongsNaturally =
            cat.toLowerCase() === 'currículo' ||
            cat.toLowerCase() === 'curriculo' ||
            status === 'Candidato' ||
            status === 'Encaminhado p/ RH'
        } else if (aba.id === 'lead-orcamentos') {
          belongsNaturally =
            cat.toLowerCase() === 'orçamento' ||
            cat.toLowerCase() === 'orcamento' ||
            status === 'Novo Orçamento' ||
            status === 'Em andamento'
        } else if (aba.id === 'fornecedores') {
          belongsNaturally =
            cat.toLowerCase() === 'fornecedor' || status === 'Encaminhado p/ Setor de Compras'
        } else if (aba.id === 'parceiros') {
          belongsNaturally =
            cat.toLowerCase() === 'parceiro' ||
            cat.toLowerCase() === 'arquiteto externo' ||
            cat.toLowerCase() === 'equipe'
        } else if (aba.id === 'assistencia') {
          belongsNaturally =
            cat.toLowerCase() === 'assistência' || cat.toLowerCase() === 'assistencia'
        }

        const isMatch = belongsNaturally || isForwardedToThisAba || isForwardedFromThisAba
        if (!isMatch) return false

        // Aplicar filtros de busca e responsável
        if (search) {
          const q = search.toLowerCase()
          const matchName = String(l.nome || '')
            .toLowerCase()
            .includes(q)
          const matchTel = String(l.telefone || '').includes(q)
          if (!matchName && !matchTel) return false
        }

        if (responsavelFilter !== 'all') {
          if (responsavelFilter === 'unassigned') {
            if (l.consultor_id) return false
          } else {
            if (l.consultor_id !== responsavelFilter) return false
          }
        }

        return true
      } catch (err) {
        console.error('Erro ao processar lead no filtro da aba:', err)
        return false
      }
    })
  }, [leads, aba.id, aba.categoriaPadrao, search, responsavelFilter])

  if (authLoading || (loading && leads.length === 0)) {
    return (
      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        {Array.isArray(aba?.colunas) &&
          aba.colunas.map((c) => (
            <div
              key={c}
              className="w-80 shrink-0 h-full bg-muted/40 animate-pulse rounded-xl border border-border/70"
            />
          ))}
      </div>
    )
  }

  // Scroll horizontal buttons
  const handleScroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return
    const amount = dir === 'left' ? -350 : 350
    scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' })
  }

  // Controles da toolbar no topo
  const controls = (
    <div className="flex items-center gap-2">
      <div className="relative w-40 lg:w-56">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Buscar nome/tel..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 pl-8 text-xs"
        />
      </div>

      <Select value={responsavelFilter} onValueChange={setResponsavelFilter}>
        <SelectTrigger className="h-8 text-xs w-36 lg:w-44">
          <SelectValue placeholder="Responsável" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos Responsáveis</SelectItem>
          <SelectItem value="unassigned">Não atribuído</SelectItem>
          {users.map((u) => (
            <SelectItem key={u.id} value={u.id} className="text-xs">
              {u.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Botão (+) exclusivo da aba 01 - Novo Contato */}
      {aba?.id === 'novo-contato' && (
        <Button
          size="sm"
          onClick={() => setIsCreatingQuickLead(true)}
          className="h-8 w-8 p-0 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center shrink-0 shadow-sm"
          title="Novo Contato"
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} />
        </Button>
      )}
    </div>
  )

  return (
    <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
      {toolbarPortal instanceof Element && isActive && createPortal(controls, toolbarPortal)}

      {/* Modal / Popover de Criação Rápida */}
      {isCreatingQuickLead && (
        <div className="bg-card border-b p-3 px-4 shadow-sm shrink-0 flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <form
            onSubmit={handleCreateQuickLead}
            className="flex items-center gap-3 flex-1 flex-wrap"
          >
            <span className="text-xs font-bold text-foreground shrink-0">
              Novo em {aba.titulo} ({aba.colunas[0]}):
            </span>
            <Input
              required
              placeholder="Nome do cliente *"
              value={quickNome}
              onChange={(e) => setQuickNome(e.target.value)}
              className="h-8 text-xs max-w-xs"
              autoFocus
            />
            <Input
              required
              placeholder="WhatsApp com DDD *"
              value={quickTelefone}
              onChange={(e) => setQuickTelefone(e.target.value)}
              className="h-8 text-xs max-w-xs"
            />
            <div className="flex items-center gap-1.5">
              <Button type="submit" size="sm" className="h-8 text-xs">
                Adicionar
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsCreatingQuickLead(false)}
                className="h-8 text-xs"
              >
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Kanban Board Columns Container */}
      <div className="flex-1 overflow-hidden relative">
        <div
          ref={scrollRef}
          className="h-full w-full overflow-x-auto overflow-y-hidden p-4 flex gap-4 scroll-smooth"
        >
          {Array.isArray(aba?.colunas) &&
            aba.colunas.map((coluna, colIdx) => {
              // Filtrar os leads que pertencem a esta coluna específica da aba
              const colLeads = Array.isArray(tabLeads)
                ? tabLeads.filter((l) => {
                    try {
                      if (!l || typeof l !== 'object') return false
                      const status = typeof l.status === 'string' ? l.status.trim() : ''
                      const { meta } = parseLeadMetadados((l as any).notas_pessoais)

                      // Se a coluna for de encaminhado
                      const isEncaminhadoCol =
                        typeof coluna === 'string' && coluna.toLowerCase().includes('encaminhado')

                      if (isEncaminhadoCol) {
                        return (
                          status === coluna ||
                          status.toLowerCase().includes('encaminhado') ||
                          meta?.encaminhado_para_aba !== undefined
                        )
                      }

                      // Se este card foi encaminhado para esta aba e está na primeira coluna
                      if (meta?.encaminhado_para_aba === aba.id && colIdx === 0) {
                        if (status === coluna || !aba.colunas.includes(status)) return true
                      }

                      // Mapeamento normal
                      if (status === coluna) return true

                      // Compatibilidade de status legados na primeira coluna da aba correspondente
                      if (colIdx === 0) {
                        if (
                          aba.id === 'lead-consultoria' &&
                          (status === 'Novo Lead' ||
                            status === 'Aguardando Consultor' ||
                            status === 'Designar Consultor')
                        ) {
                          return true
                        }
                        if (aba.id === 'novo-contato' && status === 'Novo Lead') {
                          return true
                        }
                        if (
                          !aba.colunas.includes(status) &&
                          !status.toLowerCase().includes('encaminhado')
                        ) {
                          return true
                        }
                      }

                      return false
                    } catch (err) {
                      console.error('Erro ao processar lead no filtro de coluna:', err)
                      return false
                    }
                  })
                : []

              const isDropTarget = dragOverCol === coluna

              return (
                <div
                  key={coluna}
                  onDragOver={(e) => {
                    e.preventDefault()
                    if (dragOverCol !== coluna) setDragOverCol(coluna)
                  }}
                  onDragLeave={() => setDragOverCol(null)}
                  onDrop={(e) => handleDrop(e, coluna)}
                  className={cn(
                    'w-80 shrink-0 flex flex-col rounded-xl bg-muted/40 border border-border/70 transition-colors',
                    isDropTarget && 'bg-primary/5 border-primary/50 ring-2 ring-primary/20',
                  )}
                >
                  {/* Cabeçalho da Coluna */}
                  <div className="p-3 border-b border-border/60 flex items-center justify-between shrink-0 bg-background/50 rounded-t-xl">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-xs text-foreground tracking-wide uppercase">
                        {cleanColumnTitle(coluna)}
                      </h3>
                      <span className="text-[11px] font-bold bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                        {colLeads.length}
                      </span>
                    </div>
                  </div>

                  {/* Lista de Cards da Coluna */}
                  <div className="flex-1 p-2.5 overflow-y-auto space-y-2.5 min-h-[150px]">
                    <ErrorBoundary
                      fallback={
                        <div className="p-3 text-xs text-destructive bg-destructive/10 rounded-lg text-center">
                          Erro ao exibir cards desta coluna
                        </div>
                      }
                    >
                      {colLeads.map((lead) => (
                        <ErrorBoundary
                          key={lead.id}
                          fallback={
                            <div className="p-2 text-xs text-destructive border border-destructive/30 rounded bg-destructive/5 mb-2">
                              Erro ao exibir card {lead.nome || lead.id}
                            </div>
                          }
                        >
                          <CardAtendimento
                            lead={lead}
                            currentAba={aba}
                            users={users}
                            isDragging={draggingId === lead.id}
                            unreadCount={unreadCounts[lead.id] || 0}
                            onDragStart={(e) => handleDragStart(e, lead.id)}
                            onDragEnd={handleDragEnd}
                            onClick={() => handleOpenLeadModal(lead)}
                            onUpdateLead={handleUpdateLead}
                            onArchive={handleArchiveLead}
                            onDelete={() => setLeadToDelete(lead)}
                            onForward={handleForwardLead}
                          />
                        </ErrorBoundary>
                      ))}

                      {colLeads.length === 0 && (
                        <div className="h-32 border-2 border-dashed border-border/60 rounded-lg flex flex-col items-center justify-center text-muted-foreground/60 text-xs gap-1">
                          <Inbox className="w-5 h-5 stroke-[1.5]" />
                          <span>Nenhum card</span>
                        </div>
                      )}
                    </ErrorBoundary>
                  </div>
                </div>
              )
            })}
        </div>

        {/* Botões de Rolagem Lateral Desktop */}
        <div className="hidden md:flex items-center gap-1 absolute bottom-4 right-6 z-10 bg-background/90 backdrop-blur-sm border shadow-md rounded-lg p-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => handleScroll('left')}
            title="Rolar para a esquerda"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => handleScroll('right')}
            title="Rolar para a direita"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* MODAL DETALHADO (WhatsApp + Anotações + Timeline) */}
      {selectedLeadForModal && (
        <ModalAtendimento
          lead={selectedLeadForModal}
          currentAba={aba}
          users={users}
          open={Boolean(selectedLeadForModal)}
          onClose={() => setSelectedLeadForModal(null)}
          onUpdateLead={handleUpdateLead}
          onTriggerSellModal={(l) => {
            setSelectedLeadForModal(null)
            setLeadToSell(l)
          }}
        />
      )}

      {/* Modal de Fechamento de Venda (Dossiê/Contrato) */}
      {leadToSell && (
        <ConfirmSellModal
          lead={leadToSell}
          onClose={() => {
            setLeadToSell(null)
            loadData(true)
          }}
        />
      )}

      {/* Modal de Exclusão de Lead */}
      {leadToDelete && (
        <DeleteLeadModal onClose={() => setLeadToDelete(null)} onConfirm={handleConfirmDelete} />
      )}
    </div>
  )
}
