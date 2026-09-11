import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Lead } from '@/types'
import { supabase } from '@/lib/supabase/client'
import { fetchLeads, fetchUsers, createLead, updateLead, deleteLead } from '@/services/comercial'
import { arquivarLead } from '@/services/arquivamento'
import { subscribeSharedTable } from '@/lib/comercial-realtime'
import {
  AtendimentoAbaConfig,
  ATENDIMENTO_ABAS,
  getLeadAba,
  parseLeadMetadados,
  stringifyLeadMetadados,
  cleanColumnTitle,
  LeadMetadados,
  ORIGENS_LEAD,
  exigeNomePessoa,
  getRotuloNomePessoa,
} from './constants'
import { CardAtendimento } from './CardAtendimento'
import { ModalAtendimento } from './ModalAtendimento'
import { ConfirmSellModal } from './ConfirmSellModal'
import { DeleteLeadModal } from './DeleteLeadModal'
import { PendenciasAtendimento, type PendingConversationItem } from './PendenciasAtendimento'
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
  const auth = useAuth()
  const user = auth?.user
  const authLoading = auth?.loading ?? false

  const safeAba = useMemo(() => {
    if (aba && typeof aba === 'object' && Array.isArray(aba.colunas)) {
      return aba
    }
    return ATENDIMENTO_ABAS[0]
  }, [aba])

  const [leads, setLeads] = useState<Lead[]>([])
  const [users, setUsers] = useState<Array<{ id: string; nome: string }>>([])
  const [loading, setLoading] = useState(true)

  // Unread badge counts per lead
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  // Last preview message per lead
  const [lastMessages, setLastMessages] = useState<
    Record<string, { content: string; created_at: string }>
  >({})

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
  const [quickOrigem, setQuickOrigem] = useState<string>('Instagram')
  const [quickOrigemPessoa, setQuickOrigemPessoa] = useState('')

  const scrollRef = useRef<HTMLDivElement>(null)
  const leadsRef = useRef<Lead[]>([])
  leadsRef.current = leads
  const usersRef = useRef<Array<{ id: string; nome: string }>>([])
  usersRef.current = users

  // Limpar contagem de não lidas e pendência quando abrir o modal de conversa
  const handleOpenLeadModal = async (lead: Lead) => {
    if (!lead || !lead.id) return
    setUnreadCounts((prev) => {
      if (!prev[lead.id]) return prev
      const copy = { ...prev }
      delete copy[lead.id]
      return copy
    })
    // Se lead estiver com status_atendimento = 'aguardando_resposta', limpar imediatamente no banco e no estado
    if (lead.status_atendimento === 'aguardando_resposta') {
      handleUpdateLead(lead.id, {
        status_atendimento: 'em_atendimento',
        atualizado_em: new Date().toISOString(),
      } as any)
    }
    setSelectedLeadForModal(lead)
  }

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Cache global/estável em WeakMap para parsing de metadados de leads
  const metaCacheRef = useRef<WeakMap<Lead, ReturnType<typeof parseLeadMetadados>>>(new WeakMap())
  const getCachedMeta = (l: Lead) => {
    let cached = metaCacheRef.current.get(l)
    if (!cached) {
      cached = parseLeadMetadados((l as any)?.notas_pessoais)
      metaCacheRef.current.set(l, cached)
    }
    return cached
  }

  // Carregar dados
  const isFetchingRef = useRef(false)
  const pendingRefetchRef = useRef(false)

  const loadData = async (silent = false) => {
    if (isFetchingRef.current) {
      pendingRefetchRef.current = true
      return
    }
    isFetchingRef.current = true
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

      // Carregar prévias da última mensagem das conversas pendentes
      const pendingLeads = safeLeads.filter(
        (l: any) =>
          l &&
          l.status_atendimento === 'aguardando_resposta' &&
          !l.excluido &&
          !l.arquivado_comercial,
      )

      if (pendingLeads.length > 0) {
        try {
          const pendingIds = pendingLeads.map((l: any) => l.id).filter(Boolean)
          const { data: recentMsgs } = await supabase
            .from('whatsapp_messages' as any)
            .select('lead_id, content, created_at')
            .in('lead_id', pendingIds)
            .order('created_at', { ascending: false })

          if (Array.isArray(recentMsgs)) {
            const map: Record<string, { content: string; created_at: string }> = {}
            for (const m of recentMsgs) {
              if (m.lead_id && !map[m.lead_id]) {
                map[m.lead_id] = {
                  content: m.content || '',
                  created_at: m.created_at || '',
                }
              }
            }
            setLastMessages((prev) => ({ ...prev, ...map }))
          }
        } catch (msgErr) {
          console.warn('Erro ao carregar prévias de mensagens pendentes:', msgErr)
        }
      }

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
      isFetchingRef.current = false
      if (!silent) setLoading(false)
      if (pendingRefetchRef.current) {
        pendingRefetchRef.current = false
        loadData(true)
      }
    }
  }

  // Refetch com debounce para evitar tempestade de requisições ao banco
  const debouncedRefetch = () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(() => {
      loadData(true)
    }, 400)
  }

  useEffect(() => {
    let isMounted = true
    loadData()

    // Inscrição no canal compartilhado singleton para leads
    const unsubscribeLeads = subscribeSharedTable('leads', '*', (payload: any) => {
      if (!isMounted) return

      // Tratamento imediato de UPDATE no estado local
      if (payload?.eventType === 'UPDATE' && payload?.new) {
        const updatedRow = payload.new
        const leadId = updatedRow.id
        const consultorId =
          updatedRow.consultor_id || updatedRow.responsavel_id || updatedRow.responsavel

        // Descobrir nome do consultor/responsável pelos users conhecidos
        let consultorObj: { nome: string } | null = null
        if (consultorId) {
          const currentUsers = usersRef.current || []
          const matchedUser = currentUsers.find((u) => u.id === consultorId)
          if (matchedUser) {
            consultorObj = { nome: matchedUser.nome }
          } else if (updatedRow.responsavel_nome) {
            consultorObj = { nome: updatedRow.responsavel_nome }
          }
        }

        setLeads((prevLeads) =>
          prevLeads.map((l) => {
            if (l.id !== leadId) return l
            return {
              ...l,
              ...updatedRow,
              ...(consultorId !== undefined
                ? {
                    consultor_id: consultorId,
                    consultor: consultorObj ?? (consultorId ? l.consultor : null),
                  }
                : {}),
              ...(updatedRow.responsavel_nome
                ? { consultor: { nome: updatedRow.responsavel_nome } }
                : {}),
            }
          }),
        )

        setSelectedLeadForModal((curr) => {
          if (!curr || curr.id !== leadId) return curr
          return {
            ...curr,
            ...updatedRow,
            ...(consultorId !== undefined
              ? {
                  consultor_id: consultorId,
                  consultor: consultorObj ?? (consultorId ? (curr as any).consultor : null),
                }
              : {}),
            ...(updatedRow.responsavel_nome
              ? { consultor: { nome: updatedRow.responsavel_nome } }
              : {}),
          } as any
        })
      }

      // Sincroniza dados gerais com debounce
      debouncedRefetch()
    })

    // Inscrição no canal compartilhado singleton apenas para INSERTs de whatsapp_messages
    const unsubscribeMsgs = subscribeSharedTable(
      'whatsapp_messages',
      'INSERT',
      async (payload: any) => {
        try {
          if (!isMounted) return
          const newMsg = payload?.new as any
          if (!newMsg) return

          // Ignorar mensagens de saída enviadas por operadores humanos/sistema
          const isClientInbound =
            newMsg.direction === 'inbound' ||
            newMsg.sender_type === 'cliente' ||
            newMsg.sender_type === 'lead'

          if (!isClientInbound) return

          // Localizar o lead correspondente
          const currentList = Array.isArray(leadsRef.current) ? leadsRef.current : []
          let matchedLead = currentList.find(
            (l) => l && (l.id === newMsg.lead_id || (newMsg.phone && l.telefone === newMsg.phone)),
          )

          // Se não encontrou no estado em memória, buscar do banco
          if (!matchedLead && (newMsg.lead_id || newMsg.phone)) {
            try {
              let query = supabase
                .from('leads')
                .select(
                  'id, nome, telefone, consultor_id, categoria, status, notas_pessoais, consultor:users!leads_consultor_id_fkey(nome)',
                )
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

            // Atualizar prévia da última mensagem no estado
            if (newMsg.content) {
              setLastMessages((prev) => ({
                ...prev,
                [matchedLead!.id]: {
                  content: newMsg.content,
                  created_at: newMsg.created_at || new Date().toISOString(),
                },
              }))
            }

            // Atualizar status_atendimento localmente para 'aguardando_resposta' para refletir imediatamente na pill
            setLeads((prev) =>
              prev.map((l) =>
                l.id === matchedLead!.id
                  ? {
                      ...l,
                      status_atendimento: 'aguardando_resposta',
                      atualizado_em: newMsg.created_at || new Date().toISOString(),
                    }
                  : l,
              ),
            )

            // Determinar a aba a que o lead pertence
            const targetAba = getLeadAba(matchedLead)
            const leadName = matchedLead.nome || 'Lead'
            const abaTitle = targetAba?.titulo || 'Atendimentos'

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
        } catch (innerErr) {
          console.warn('Erro ao processar mensagem realtime:', innerErr)
        }
      },
    )

    return () => {
      isMounted = false
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      unsubscribeLeads()
      unsubscribeMsgs()
    }
  }, [aba.id])

  // Atualizar Lead (reutilizável)
  const handleUpdateLead = async (id: string, updates: Partial<Lead>) => {
    try {
      // Obter nome do consultor se consultor_id foi alterado
      let consultorObj: { nome: string } | null | undefined = undefined
      if ('consultor_id' in updates) {
        if (!updates.consultor_id) {
          consultorObj = null
        } else {
          const matchedUser = users.find((u) => u.id === updates.consultor_id)
          consultorObj = matchedUser ? { nome: matchedUser.nome } : null
        }
      }

      const mergedUpdates = {
        ...updates,
        ...(consultorObj !== undefined ? { consultor: consultorObj } : {}),
      }

      // Otimista
      setLeads((prev) =>
        prev.map((l) =>
          l.id === id ? { ...l, ...mergedUpdates, atualizado_em: new Date().toISOString() } : l,
        ),
      )
      if (selectedLeadForModal?.id === id) {
        setSelectedLeadForModal((prev) => (prev ? { ...prev, ...mergedUpdates } : null))
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

  // Mover card para outra aba e coluna específica via Dropdown de 2 níveis
  const handleMoveToAbaColuna = async (lead: Lead, targetAbaId: string, targetColuna: string) => {
    if (!lead || !lead.id) return

    const targetAba = ATENDIMENTO_ABAS.find((a) => a.id === targetAbaId)
    if (!targetAba) return

    try {
      const { notas, meta } = parseLeadMetadados((lead as any)?.notas_pessoais)
      const newMeta: LeadMetadados = {
        ...meta,
        origem_aba: safeAba.id,
        encaminhado_para_aba: targetAbaId,
        encaminhado_em: new Date().toISOString(),
      }
      const newNotasPessoais = stringifyLeadMetadados(notas, newMeta)

      await handleUpdateLead(lead.id, {
        status: targetColuna,
        categoria: targetAba.categoriaPadrao,
        notas_pessoais: newNotasPessoais,
      } as any)

      toast.success(`Card movido para "${targetAba.titulo} > ${cleanColumnTitle(targetColuna)}"`)
    } catch (err: any) {
      console.error('Erro ao mover card:', err)
      toast.error('Erro ao mover lead')
    }
  }

  // Encaminhar card para outra aba
  const handleForwardLead = async (leadId: string, destinoAbaId: string) => {
    const lead = leads.find((l) => l.id === leadId)
    if (!lead) return

    const destinoAba = ATENDIMENTO_ABAS.find((a) => a.id === destinoAbaId)
    if (!destinoAba) return

    try {
      const { notas, meta } = parseLeadMetadados((lead as any)?.notas_pessoais)
      const newMeta: LeadMetadados = {
        ...meta,
        origem_aba: safeAba.id,
        encaminhado_para_aba: destinoAbaId,
        encaminhado_em: new Date().toISOString(),
      }
      const newNotasPessoais = stringifyLeadMetadados(notas, newMeta)

      // Ao encaminhar para uma aba de destino, o lead assume a primeira coluna da aba de destino
      const targetCol = destinoAba.colunas[0] || 'Novo contato'

      await handleUpdateLead(leadId, {
        status: targetCol,
        categoria: destinoAba.categoriaPadrao,
        notas_pessoais: newNotasPessoais,
      } as any)

      toast.success(`Card encaminhado com sucesso para "${destinoAba.titulo}"!`)
    } catch (err: any) {
      console.error('Erro ao encaminhar card:', err)
      toast.error('Erro ao encaminhar lead')
    }
  }

  // Arquivar (somente na aba atual via notas_pessoais)
  const handleArchiveLead = async (id: string) => {
    const lead = leads.find((l) => l.id === id)
    if (!lead) return
    try {
      const { notas, meta } = parseLeadMetadados((lead as any)?.notas_pessoais)
      const currentArquivamentos = Array.isArray(meta.arquivamentos) ? [...meta.arquivamentos] : []
      if (!currentArquivamentos.some((a) => a.aba === safeAba.id)) {
        currentArquivamentos.push({
          aba: safeAba.id,
          data: new Date().toISOString(),
        })
      }
      const newMeta: LeadMetadados = {
        ...meta,
        arquivamentos: currentArquivamentos,
      }
      const newNotasPessoais = stringifyLeadMetadados(notas, newMeta)

      await handleUpdateLead(id, {
        notas_pessoais: newNotasPessoais,
      } as any)

      if (selectedLeadForModal?.id === id) setSelectedLeadForModal(null)
      toast.success(`Lead arquivado da aba "${safeAba.titulo}"!`)
    } catch (err: any) {
      toast.error('Erro ao arquivar lead: ' + (err?.message || 'Falha ao salvar'))
    }
  }

  // Deletar (somente na aba atual via notas_pessoais)
  const handleConfirmDelete = async () => {
    if (!leadToDelete) return
    const id = leadToDelete.id
    try {
      const { notas, meta } = parseLeadMetadados((leadToDelete as any)?.notas_pessoais)
      const currentExclusoes = Array.isArray(meta.exclusoes) ? [...meta.exclusoes] : []
      if (!currentExclusoes.some((e) => e.aba === safeAba.id)) {
        currentExclusoes.push({
          aba: safeAba.id,
          data: new Date().toISOString(),
        })
      }
      const newMeta: LeadMetadados = {
        ...meta,
        exclusoes: currentExclusoes,
      }
      const newNotasPessoais = stringifyLeadMetadados(notas, newMeta)

      await handleUpdateLead(id, {
        notas_pessoais: newNotasPessoais,
      } as any)

      if (selectedLeadForModal?.id === id) setSelectedLeadForModal(null)
      setLeadToDelete(null)
      toast.success(`Lead excluído da aba "${safeAba.titulo}"!`)
    } catch (err: any) {
      toast.error('Erro ao excluir: ' + (err?.message || 'Falha ao excluir'))
    }
  }

  // Criar Novo Lead Rápido
  const handleCreateQuickLead = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickNome.trim() || !quickTelefone.trim()) {
      toast.error('Preencha nome e telefone')
      return
    }

    if (exigeNomePessoa(quickOrigem) && !quickOrigemPessoa.trim()) {
      toast.error('Informe o nome da pessoa para a origem selecionada')
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

      const initialStatus = safeAba.colunas[0] || 'Novo contato'
      const initialCategoria = safeAba.categoriaPadrao || 'Comercial'

      await createLead({
        nome: quickNome.trim(),
        telefone: phoneDigits,
        origem: quickOrigem || 'A definir',
        origem_pessoa: exigeNomePessoa(quickOrigem) ? quickOrigemPessoa.trim() : null,
        status: initialStatus,
        categoria: initialCategoria,
        criado_por_nome: userName,
        kanban_ativo: true,
      })

      setQuickNome('')
      setQuickTelefone('')
      setQuickOrigem('Instagram')
      setQuickOrigemPessoa('')
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

        const { meta } = getCachedMeta(l)

        // Verificação de exclusão/arquivamento NA ABA ATUAL
        const isExcluidoNaAbaAtual =
          Array.isArray(meta?.exclusoes) &&
          meta.exclusoes.some((e: any) => e && e.aba === safeAba.id)
        if (isExcluidoNaAbaAtual) return false

        const isArquivadoNaAbaAtual =
          Array.isArray(meta?.arquivamentos) &&
          meta.arquivamentos.some((a: any) => a && a.aba === safeAba.id)
        if (isArquivadoNaAbaAtual) return false

        const cat = typeof l.categoria === 'string' ? l.categoria.trim() : 'Comercial'
        const status = typeof l.status === 'string' ? l.status.trim() : ''

        // Se o card foi encaminhado para uma aba específica, ele pertence EXCLUSIVAMENTE àquela aba de destino.
        // Ele NÃO deve aparecer na aba de origem nem em nenhuma outra aba.
        if (meta?.encaminhado_para_aba) {
          if (meta.encaminhado_para_aba !== safeAba.id) {
            return false
          }
        } else {
          // Card NÃO encaminhado: verificar a qual aba pertence naturalmente por categoria/status
          let belongsNaturally = false

          if (safeAba.id === 'novo-contato') {
            belongsNaturally =
              status === 'Novo contato' ||
              status === 'Novo Contato' ||
              status === 'Novo Lead' ||
              status === 'Novo' ||
              status === 'Encaminhado Para' ||
              (cat === 'Comercial' && !l.kanban_ativo)
          } else if (safeAba.id === 'lead-consultoria') {
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
              consultoriaStatuses.includes(status)
          } else if (safeAba.id === 'lead-followup') {
            belongsNaturally =
              cat.toLowerCase() === 'follow up' ||
              status === 'Follow up' ||
              status === 'Encaminhado p/ Consultoria'
          } else if (safeAba.id === 'curriculos') {
            belongsNaturally =
              cat.toLowerCase() === 'currículo' ||
              cat.toLowerCase() === 'curriculo' ||
              status === 'Candidato' ||
              status === 'Encaminhado p/ RH'
          } else if (safeAba.id === 'lead-orcamentos') {
            belongsNaturally =
              cat.toLowerCase() === 'orçamento' ||
              cat.toLowerCase() === 'orcamento' ||
              status === 'Novo Orçamento' ||
              status === 'Em andamento'
          } else if (safeAba.id === 'fornecedores') {
            belongsNaturally =
              cat.toLowerCase() === 'fornecedor' || status === 'Encaminhado p/ Setor de Compras'
          } else if (safeAba.id === 'parceiros') {
            belongsNaturally =
              cat.toLowerCase() === 'parceiro' ||
              cat.toLowerCase() === 'arquiteto externo' ||
              cat.toLowerCase() === 'equipe'
          } else if (safeAba.id === 'assistencia') {
            belongsNaturally =
              cat.toLowerCase() === 'assistência' || cat.toLowerCase() === 'assistencia'
          }

          if (!belongsNaturally) return false
        }

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
  }, [leads, safeAba.id, safeAba.categoriaPadrao, search, responsavelFilter])

  // Lista de conversas com pendência persistentes (status_atendimento = 'aguardando_resposta' no banco)
  const pendingConversations = useMemo((): PendingConversationItem[] => {
    if (!Array.isArray(leads)) return []

    return leads
      .filter((l) => {
        if (!l || !l.id) return false
        if (l.excluido || l.arquivado_comercial) return false
        return l.status_atendimento === 'aguardando_resposta'
      })
      .map((lead) => {
        const lastMsg = lastMessages[lead.id]
        const fallbackText = lead.status
          ? `Aguardando resposta em ${lead.status}`
          : 'Nova mensagem do WhatsApp'
        const previewMessage = lastMsg?.content || fallbackText
        const timestamp =
          lastMsg?.created_at || lead.atualizado_em || lead.criado_em || new Date().toISOString()
        const targetAba = getLeadAba(lead)

        return {
          leadId: lead.id,
          leadName: lead.nome || 'Lead sem nome',
          previewMessage,
          timestamp,
          unreadCount: unreadCounts[lead.id] || 1,
          abaTitle: targetAba?.titulo || undefined,
          telefone: lead.telefone || undefined,
          lead,
        }
      })
      .sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime() || 0
        const timeB = new Date(b.timestamp).getTime() || 0
        return timeB - timeA // mais recentes primeiro
      })
  }, [leads, lastMessages, unreadCounts])

  // Agrupamento memoizado dos leads por coluna para evitar .filter() a cada render/coluna
  const leadsByColumn = useMemo(() => {
    const map = new Map<string, Lead[]>()
    const colunas = Array.isArray(safeAba?.colunas) ? safeAba.colunas : []
    colunas.forEach((c) => map.set(c, []))

    const getColForLead = (l: Lead): string => {
      const s = typeof l.status === 'string' ? l.status.trim() : ''
      const sLower = s.toLowerCase()

      const exactMatch = colunas.find((c) => c.trim().toLowerCase() === sLower)
      if (exactMatch) return exactMatch

      if (sLower.includes('encaminhado')) {
        const encaminhadoCol = colunas.find((c) => c.toLowerCase().includes('encaminhado'))
        if (encaminhadoCol) return encaminhadoCol
      }

      return colunas[0] || 'Novo contato'
    }

    if (Array.isArray(tabLeads)) {
      tabLeads.forEach((l) => {
        if (!l || typeof l !== 'object') return
        const col = getColForLead(l)
        const currentList = map.get(col)
        if (currentList) {
          currentList.push(l)
        } else {
          map.set(col, [l])
        }
      })
    }

    return map
  }, [tabLeads, safeAba.colunas])

  if (authLoading || (loading && leads.length === 0)) {
    return (
      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        {Array.isArray(safeAba?.colunas) &&
          safeAba.colunas.map((c) => (
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
      {safeAba?.id === 'novo-contato' && (
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

      {/* Caixa/Pill persistente de conversas com pendência */}
      <div className="px-4 pt-2 shrink-0">
        <PendenciasAtendimento
          items={pendingConversations}
          onOpenLead={(lead) => {
            if (onOpenLeadGlobal) {
              onOpenLeadGlobal(lead)
            } else {
              handleOpenLeadModal(lead)
            }
          }}
        />
      </div>

      {/* Modal / Popover de Criação Rápida */}
      {isCreatingQuickLead && (
        <div className="bg-card border-b p-3 px-4 shadow-sm shrink-0 flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <form
            onSubmit={handleCreateQuickLead}
            className="flex items-center gap-3 flex-1 flex-wrap"
          >
            <span className="text-xs font-bold text-foreground shrink-0">
              Novo em {safeAba.titulo} ({safeAba.colunas[0]}):
            </span>
            <Input
              required
              placeholder="Nome do cliente *"
              value={quickNome}
              onChange={(e) => setQuickNome(e.target.value)}
              className="h-8 text-xs w-48"
              autoFocus
            />
            <Input
              required
              placeholder="WhatsApp com DDD *"
              value={quickTelefone}
              onChange={(e) => setQuickTelefone(e.target.value)}
              className="h-8 text-xs w-40"
            />
            <div className="w-36">
              <Select value={quickOrigem} onValueChange={(v) => setQuickOrigem(v)}>
                <SelectTrigger className="h-8 text-xs bg-background">
                  <SelectValue placeholder="Origem *" />
                </SelectTrigger>
                <SelectContent>
                  {ORIGENS_LEAD.map((orig) => (
                    <SelectItem key={orig} value={orig} className="text-xs">
                      {orig}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {exigeNomePessoa(quickOrigem) && (
              <Input
                required
                placeholder={`${getRotuloNomePessoa(quickOrigem)} *`}
                value={quickOrigemPessoa}
                onChange={(e) => setQuickOrigemPessoa(e.target.value)}
                className="h-8 text-xs w-48 border-amber-500/50 focus:border-amber-500"
              />
            )}
            <div className="flex items-center gap-1.5">
              <Button type="submit" size="sm" className="h-8 text-xs">
                Adicionar
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsCreatingQuickLead(false)
                  setQuickOrigem('Instagram')
                  setQuickOrigemPessoa('')
                }}
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
          {Array.isArray(safeAba?.colunas) &&
            safeAba.colunas.map((coluna) => {
              const colLeads = leadsByColumn.get(coluna) || []

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
                    'w-80 shrink-0 flex flex-col rounded-xl bg-[#F8F9FA] dark:bg-[#161B22] border border-border/70 transition-colors',
                    isDropTarget && 'bg-primary/5 border-primary/50 ring-2 ring-primary/20',
                  )}
                >
                  {/* Cabeçalho da Coluna */}
                  <div className="p-3 border-b border-border/60 flex items-center justify-between shrink-0 bg-transparent rounded-t-xl">
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
                            currentAba={safeAba}
                            users={users}
                            isDragging={draggingId === lead.id}
                            unreadCount={
                              unreadCounts[lead.id] ||
                              (lead.status_atendimento === 'aguardando_resposta' ? 1 : 0)
                            }
                            onDragStart={(e) => handleDragStart(e, lead.id)}
                            onDragEnd={handleDragEnd}
                            onClick={() => handleOpenLeadModal(lead)}
                            onUpdateLead={handleUpdateLead}
                            onArchive={handleArchiveLead}
                            onDelete={() => setLeadToDelete(lead)}
                            onForward={handleForwardLead}
                            onMoveTo={(targetAbaId, targetColuna) =>
                              handleMoveToAbaColuna(lead, targetAbaId, targetColuna)
                            }
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
        <ErrorBoundary fallback={null}>
          <ModalAtendimento
            lead={selectedLeadForModal}
            currentAba={safeAba}
            users={users}
            open={Boolean(selectedLeadForModal)}
            onClose={() => setSelectedLeadForModal(null)}
            onUpdateLead={handleUpdateLead}
            onTriggerSellModal={(l) => {
              setSelectedLeadForModal(null)
              setLeadToSell(l)
            }}
          />
        </ErrorBoundary>
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
