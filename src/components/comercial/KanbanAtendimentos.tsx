import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Lead } from '@/types'
import { supabase } from '@/lib/supabase/client'
import { buscarTodasPaginas } from '@/lib/supabase/buscar-todas-paginas'
import {
  fetchLeads,
  fetchUsers,
  createLead,
  updateLead,
  salvarNotasLead,
} from '@/services/comercial'
import { subscribeSharedTable } from '@/lib/comercial-realtime'
import { formatConsultorOptionLabel } from '@/lib/consultor-utils'
import {
  AtendimentoAbaConfig,
  ATENDIMENTO_ABAS,
  getLeadAba,
  leadBelongsToAba,
  parseLeadMetadados,
  stringifyLeadMetadados,
  cleanColumnTitle,
  LeadMetadados,
  ORIGENS_LEAD,
  exigeNomePessoa,
  nomePessoaObrigatorio,
  getRotuloNomePessoa,
  isStatusPerdido,
  isStatusVendido,
  isAbaComercial,
  isCardEmAberto,
} from './constants'
import { CardAtendimento } from './CardAtendimento'
import { ModalAtendimento } from './ModalAtendimento'
import { ConfirmSellModal } from './ConfirmSellModal'
import { DeleteLeadModal } from './DeleteLeadModal'
import { SaidaDoQuadroModal, MotivoSaidaQuadro } from './SaidaDoQuadroModal'
import { MotivoPerdaModal, MotivoPerdaConfirmData } from './MotivoPerdaModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Plus, Search, ChevronLeft, ChevronRight, Inbox } from 'lucide-react'
import { toast } from 'sonner'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { useAuth } from '@/hooks/use-auth'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface DuplicateLeadInfo {
  id: string
  nome: string | null
  status: string | null
  criado_em: string | null
}

interface PendingQuickLeadPayload {
  nome: string
  telefone: string
  origem: string
  origem_pessoa: string | null
  duplicates: DuplicateLeadInfo[]
}

// Helper para formatação de data segura no padrão pt-BR
function safeFormatDatePtBr(dateStr?: string | null): string {
  if (!dateStr) return '—'
  try {
    const d = parseISO(dateStr)
    return format(d, 'dd/MM/yyyy HH:mm', { locale: ptBR })
  } catch {
    return dateStr
  }
}

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
  const [users, setUsers] = useState<
    Array<{
      id: string
      nome: string
      eh_consultor?: boolean | null
      ex_colaborador?: boolean | null
    }>
  >([])
  const [loading, setLoading] = useState(true)

  // Unread badge counts per lead
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  // Last preview message per lead
  const [lastMessages, setLastMessages] = useState<
    Record<string, { content: string; created_at: string; sender_type?: string }>
  >({})

  // Filtros
  const [search, setSearch] = useState('')
  const [responsavelFilter, setResponsavelFilter] = useState('all')
  const [origemFilter, setOrigemFilter] = useState('all')
  const [onlyPending, setOnlyPending] = useState(false)

  // Drag and Drop
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverCol, setDragOverCol] = useState<string | null>(null)

  // Modais
  const [selectedLeadForModal, setSelectedLeadForModal] = useState<Lead | null>(null)
  const [leadToSell, setLeadToSell] = useState<Lead | null>(null)
  const [pendingVenda, setPendingVenda] = useState<{
    lead: Lead
    pendingUpdates?: {
      categoria?: string
      notas_pessoais?: string
    }
  } | null>(null)
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null)
  const [leadForSaida, setLeadForSaida] = useState<Lead | null>(null)
  const [pendingPerda, setPendingPerda] = useState<{
    lead: Lead
    targetStatus: string
    etapaAnterior: string
    targetAbaId?: string
    targetCategoria?: string
  } | null>(null)

  // Estado para exigir origem do lead no momento do despacho (da aba novo-contato para consultoria ou orçamentos)
  const [pendingDespachoOrigem, setPendingDespachoOrigem] = useState<{
    lead: Lead
    targetAbaId: string
    targetColuna: string
    targetCategoria: string
    origemAbaId: string
    tipoAcao: 'forward' | 'moveTo'
  } | null>(null)
  const [despachoOrigem, setDespachoOrigem] = useState<string>('')
  const [despachoOrigemPessoa, setDespachoOrigemPessoa] = useState<string>('')
  const [isSubmittingDespachoOrigem, setIsSubmittingDespachoOrigem] = useState<boolean>(false)

  // Novo Lead rápido
  const isComercialTab = useMemo(() => {
    return (
      safeAba.id === 'novo-contato' ||
      safeAba.id === 'lead-consultoria' ||
      safeAba.id === 'lead-orcamentos' ||
      safeAba.categoriaPadrao === 'Comercial' ||
      safeAba.categoriaPadrao === 'Orçamento'
    )
  }, [safeAba.id, safeAba.categoriaPadrao])

  const [isCreatingQuickLead, setIsCreatingQuickLead] = useState(false)
  const [quickNome, setQuickNome] = useState('')
  const [quickTelefone, setQuickTelefone] = useState('')
  const [quickOrigem, setQuickOrigem] = useState<string>('')
  const [quickOrigemPessoa, setQuickOrigemPessoa] = useState('')
  const [pendingQuickLead, setPendingQuickLead] = useState<PendingQuickLeadPayload | null>(null)
  const [isConfirmingQuickLead, setIsConfirmingQuickLead] = useState(false)

  // Reset/ajusta origem default ao mudar de aba ou abrir criação rápida
  useEffect(() => {
    if (isComercialTab) {
      setQuickOrigem('')
    } else {
      setQuickOrigem('A definir')
    }
    setQuickOrigemPessoa('')
  }, [isComercialTab, safeAba.id])

  const scrollRef = useRef<HTMLDivElement>(null)
  const leadsRef = useRef<Lead[]>([])
  leadsRef.current = leads
  const usersRef = useRef<
    Array<{
      id: string
      nome: string
      eh_consultor?: boolean | null
      ex_colaborador?: boolean | null
    }>
  >([])
  usersRef.current = users

  // Limpar contagem de não lidas quando abrir o modal de conversa
  const handleOpenLeadModal = async (lead: Lead) => {
    if (!lead || !lead.id) return
    setUnreadCounts((prev) => {
      if (!prev[lead.id]) return prev
      const copy = { ...prev }
      delete copy[lead.id]
      return copy
    })
    setSelectedLeadForModal(lead)
  }

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Cache global/estável em WeakMap para parsing de metadados de leads
  const metaCacheRef = useRef<WeakMap<object, ReturnType<typeof parseLeadMetadados>>>(new WeakMap())
  const getCachedMeta = (l: Lead | null | undefined) => {
    if (!l || typeof l !== 'object') {
      return parseLeadMetadados('')
    }
    let cached = metaCacheRef.current.get(l as object)
    if (!cached) {
      cached = parseLeadMetadados((l as any)?.notas_pessoais)
      metaCacheRef.current.set(l as object, cached)
    }
    return cached
  }

  // Set de IDs com mensagens reais de clientes
  const [leadsWithClientMessage, setLeadsWithClientMessage] = useState<Set<string>>(new Set())

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

      // Carregar mensagens reais de cliente para todos os leads com status_atendimento = 'aguardando_resposta'
      const pendingCandidateLeads = safeLeads.filter(
        (l: any) =>
          l &&
          l.status_atendimento === 'aguardando_resposta' &&
          !l.excluido &&
          !l.arquivado_comercial,
      )

      if (pendingCandidateLeads.length > 0) {
        try {
          const pendingIds = pendingCandidateLeads.map((l: any) => l.id).filter(Boolean)
          const { data: recentMsgs } = await buscarTodasPaginas(() =>
            supabase
              .from('whatsapp_messages' as any)
              .select('lead_id, content, created_at, sender_type, direction')
              .in('lead_id', pendingIds)
              .order('created_at', { ascending: false })
              .order('id', { ascending: true }),
          )

          if (Array.isArray(recentMsgs)) {
            const map: Record<
              string,
              { content: string; created_at: string; sender_type?: string }
            > = {}
            const clientMsgLeadIds = new Set<string>()

            for (const m of recentMsgs) {
              const isClientMsg =
                m.direction === 'inbound' || m.sender_type === 'cliente' || m.sender_type === 'lead'

              if (m.lead_id && isClientMsg) {
                clientMsgLeadIds.add(m.lead_id)
                if (!map[m.lead_id]) {
                  map[m.lead_id] = {
                    content: m.content || '',
                    created_at: m.created_at || '',
                    sender_type: m.sender_type || '',
                  }
                }
              }
            }
            setLastMessages((prev) => ({ ...prev, ...map }))
            setLeadsWithClientMessage(clientMsgLeadIds)
          }
        } catch (msgErr) {
          console.warn('Erro ao carregar prévias de mensagens pendentes:', msgErr)
        }
      } else {
        setLeadsWithClientMessage(new Set())
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
            consultorObj = {
              nome: matchedUser.nome,
              ex_colaborador: matchedUser.ex_colaborador ?? false,
            } as any
          } else if (updatedRow.responsavel_nome) {
            consultorObj = { nome: updatedRow.responsavel_nome }
          }
        }

        const secundarioId = updatedRow.consultor_id_secundario ?? null
        const secundarioUser = secundarioId
          ? (usersRef.current || []).find((u) => u.id === secundarioId)
          : null
        const montarSecundario = (atual: any) => {
          if (!('consultor_id_secundario' in updatedRow)) return {}
          if (!secundarioId) return { consultor_secundario: null }
          if (secundarioUser) {
            return {
              consultor_secundario: {
                id: secundarioUser.id,
                nome: secundarioUser.nome,
                ex_colaborador: secundarioUser.ex_colaborador ?? false,
              },
            }
          }
          // usuário não está na lista: mantém o que já tinha se o consultor não mudou
          return secundarioId === atual?.consultor_id_secundario
            ? {}
            : { consultor_secundario: null }
        }

        setLeads((prevLeads) =>
          prevLeads.map((l) => {
            if (l.id !== leadId) return l
            return {
              ...l,
              ...updatedRow,
              ...montarSecundario(l),
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
            ...montarSecundario(curr),
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

      if (payload?.eventType === 'DELETE' && payload?.old?.id) {
        const removedId = payload.old.id
        setLeads((prev) => prev.filter((l) => l.id !== removedId))
      } else if (payload?.eventType !== 'UPDATE') {
        debouncedRefetch()
      }
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
            // Registrar que este lead tem mensagem real de cliente
            setLeadsWithClientMessage((prev) => {
              const next = new Set(prev)
              next.add(matchedLead!.id)
              return next
            })

            // Incrementar badge visual de mensagens não lidas
            setUnreadCounts((prev) => ({
              ...prev,
              [matchedLead!.id]: (prev[matchedLead!.id] || 0) + 1,
            }))

            // Atualizar prévia da última mensagem no estado
            if (newMsg.content || newMsg.created_at) {
              setLastMessages((prev) => ({
                ...prev,
                [matchedLead!.id]: {
                  content: newMsg.content || '',
                  created_at: newMsg.created_at || new Date().toISOString(),
                  sender_type: newMsg.sender_type || 'cliente',
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

    const handleAuthRestored = () => {
      console.info(
        '[KanbanAtendimentos] auth_session_restored detectado. Recarregando atendimentos...',
      )
      if (isMounted) loadData(true)
    }

    window.addEventListener('auth_session_restored', handleAuthRestored)

    return () => {
      isMounted = false
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      unsubscribeLeads()
      unsubscribeMsgs()
      window.removeEventListener('auth_session_restored', handleAuthRestored)
    }
  }, [aba.id])

  // Atualizar Lead (reutilizável)
  const handleUpdateLead = async (id: string, updates: Partial<Lead>) => {
    try {
      const currentLead = leads.find((l) => l.id === id)

      // Regra de Venda: quando o destino for "Vendido" e o lead ainda não estiver "Vendido",
      // NÃO gravar updateLead, NÃO fazer atualização otimista e NÃO gravar em leads_status_historico.
      // Apenas guardar alterações pendentes e abrir o ConfirmSellModal.
      if (
        updates.status &&
        isStatusVendido(updates.status) &&
        !isStatusVendido(currentLead?.status)
      ) {
        if (currentLead) {
          const pendingUpdates: { categoria?: string; notas_pessoais?: string } = {}
          if (updates.categoria) pendingUpdates.categoria = updates.categoria
          if ((updates as any).notas_pessoais !== undefined) {
            pendingUpdates.notas_pessoais = (updates as any).notas_pessoais
          }
          setPendingVenda({
            lead: currentLead,
            pendingUpdates: Object.keys(pendingUpdates).length > 0 ? pendingUpdates : undefined,
          })
        }
        return
      }

      // Se o status estiver mudando e o NOVO status NÃO for Perdido, mas o lead TINHA motivo_perda/etapa_perda gravados
      // ou estava em Perdido, limpamos motivo_perda e etapa_perda conforme Requisito 5:
      // "Se o lead for retirado de Perdido (movido para outra coluna), limpar motivo_perda/etapa_perda para não carregar dados de perda antiga."
      const cleanPerdaUpdates: Partial<Lead> = {}
      if (
        updates.status &&
        !isStatusPerdido(updates.status) &&
        (isStatusPerdido(currentLead?.status) ||
          currentLead?.motivo_perda ||
          currentLead?.etapa_perda)
      ) {
        cleanPerdaUpdates.motivo_perda = null
        cleanPerdaUpdates.etapa_perda = null
      }

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

      const finalPayload: Partial<Lead> = {
        ...cleanPerdaUpdates,
        ...updates,
      }

      const mergedUpdates = {
        ...finalPayload,
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

      const { notas_pessoais: notasDepois, ...restoPayload } = finalPayload as any
      if (notasDepois !== undefined) {
        const notasGravadas = await salvarNotasLead(id, currentLead?.notas_pessoais, notasDepois)
        setLeads((prev) =>
          prev.map((l) => (l.id === id ? ({ ...l, notas_pessoais: notasGravadas } as any) : l)),
        )
        if (selectedLeadForModal?.id === id) {
          setSelectedLeadForModal((prev) =>
            prev ? ({ ...prev, notas_pessoais: notasGravadas } as any) : null,
          )
        }
      }
      if (Object.keys(restoPayload).length > 0) {
        await updateLead(id, restoPayload)
      }
    } catch (err: any) {
      console.error('Erro ao atualizar lead:', err)
      loadData(true)
      throw err
    }
  }

  // Helper: checa se precisa exigir origem do lead no momento do despacho
  const checkPrecisaOrigemDespacho = (
    lead: Lead,
    targetAbaId: string,
    targetColuna: string,
  ): boolean => {
    // Apenas quando o card parte da aba novo-contato
    if (safeAba.id !== 'novo-contato') return false

    // Destino deve ser lead-consultoria ou lead-orcamentos
    if (targetAbaId !== 'lead-consultoria' && targetAbaId !== 'lead-orcamentos') return false

    // NÃO aplicar a regra quando o destino for coluna de perdido
    if (isStatusPerdido(targetColuna)) return false

    // NÃO aplicar se for coluna "SDR: Não é lead"
    const tColLower = (targetColuna || '').trim().toLowerCase()
    if (tColLower === 'sdr: não é lead' || tColLower === 'sdr: nao e lead') return false

    // Verificar origem atual do lead
    const orig = (lead.origem || '').trim().toLowerCase()
    const semOrigem = !orig || orig === 'a definir' || orig === 'sem origem'
    return semOrigem
  }

  // Mover card para outra aba e coluna específica via Dropdown de 2 níveis
  const handleMoveToAbaColuna = async (lead: Lead, targetAbaId: string, targetColuna: string) => {
    if (!lead || !lead.id) return

    const targetAba = ATENDIMENTO_ABAS.find((a) => a.id === targetAbaId)
    if (!targetAba) return

    // Se o destino for uma coluna de Perdido, interceptar com o modal de motivo de perda!
    if (isStatusPerdido(targetColuna)) {
      setPendingPerda({
        lead,
        targetStatus: targetColuna,
        etapaAnterior: lead.status || safeAba.colunas[0] || 'Novo contato',
        targetAbaId,
        targetCategoria: targetAba.categoriaPadrao,
      })
      return
    }

    // Se o destino for uma coluna de Vendido e o lead ainda não estiver Vendido, interceptar com o ConfirmSellModal!
    if (isStatusVendido(targetColuna) && !isStatusVendido(lead.status)) {
      const { notas, meta } = parseLeadMetadados((lead as any)?.notas_pessoais)
      const newMeta: LeadMetadados = {
        ...meta,
        origem_aba: safeAba.id,
        encaminhado_para_aba: targetAbaId,
        encaminhado_em: new Date().toISOString(),
      }
      const newNotasPessoais = stringifyLeadMetadados(notas, newMeta)

      setPendingVenda({
        lead,
        pendingUpdates: {
          categoria: targetAba.categoriaPadrao,
          notas_pessoais: newNotasPessoais,
        },
      })
      return
    }

    // Regra PARTE B: Exigir origem do lead no despacho da aba novo-contato para consultoria/orçamentos
    if (checkPrecisaOrigemDespacho(lead, targetAbaId, targetColuna)) {
      setPendingDespachoOrigem({
        lead,
        targetAbaId,
        targetColuna,
        targetCategoria: targetAba.categoriaPadrao,
        origemAbaId: safeAba.id,
        tipoAcao: 'moveTo',
      })
      setDespachoOrigem('')
      setDespachoOrigemPessoa('')
      return
    }

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
      toast.error('Erro ao mover lead: ' + (err?.message || 'Falha ao salvar'))
    }
  }

  // Encaminhar card para outra aba
  const handleForwardLead = async (leadId: string, destinoAbaId: string) => {
    const lead = leads.find((l) => l.id === leadId)
    if (!lead) return

    const destinoAba = ATENDIMENTO_ABAS.find((a) => a.id === destinoAbaId)
    if (!destinoAba) return

    const targetCol = destinoAba.colunas[0] || 'Novo contato'

    // Regra PARTE B: Exigir origem do lead no despacho da aba novo-contato para consultoria/orçamentos
    if (checkPrecisaOrigemDespacho(lead, destinoAbaId, targetCol)) {
      setPendingDespachoOrigem({
        lead,
        targetAbaId: destinoAbaId,
        targetColuna: targetCol,
        targetCategoria: destinoAba.categoriaPadrao,
        origemAbaId: safeAba.id,
        tipoAcao: 'forward',
      })
      setDespachoOrigem('')
      setDespachoOrigemPessoa('')
      return
    }

    try {
      const { notas, meta } = parseLeadMetadados((lead as any)?.notas_pessoais)
      const newMeta: LeadMetadados = {
        ...meta,
        origem_aba: safeAba.id,
        encaminhado_para_aba: destinoAbaId,
        encaminhado_em: new Date().toISOString(),
      }
      const newNotasPessoais = stringifyLeadMetadados(notas, newMeta)

      // Ao encaminhar para uma aba de destino, o lead assume a primeira coluna da aba de destino e SAI da triagem
      await handleUpdateLead(leadId, {
        status: targetCol,
        categoria: destinoAba.categoriaPadrao,
        notas_pessoais: newNotasPessoais,
      } as any)

      toast.success(`Card encaminhado com sucesso para "${destinoAba.titulo}"!`)
    } catch (err: any) {
      console.error('Erro ao encaminhar card:', err)
      toast.error('Erro ao encaminhar lead: ' + (err?.message || 'Falha ao salvar'))
    }
  }

  // Confirmação do despacho com a origem obrigatória preenchida
  const handleConfirmDespachoOrigem = async () => {
    if (!pendingDespachoOrigem) return
    const { lead, targetAbaId, targetColuna, targetCategoria, origemAbaId, tipoAcao } =
      pendingDespachoOrigem

    if (!despachoOrigem || !despachoOrigem.trim()) {
      toast.error('Selecione a origem do lead')
      return
    }

    if (nomePessoaObrigatorio(despachoOrigem) && !despachoOrigemPessoa.trim()) {
      toast.error(`Informe o ${getRotuloNomePessoa(despachoOrigem).toLowerCase()}`)
      return
    }

    setIsSubmittingDespachoOrigem(true)
    try {
      const { notas, meta } = parseLeadMetadados((lead as any)?.notas_pessoais)
      const newMeta: LeadMetadados = {
        ...meta,
        origem_aba: origemAbaId,
        encaminhado_para_aba: targetAbaId,
        encaminhado_em: new Date().toISOString(),
      }
      const newNotasPessoais = stringifyLeadMetadados(notas, newMeta)

      const targetAba = ATENDIMENTO_ABAS.find((a) => a.id === targetAbaId)
      const nomePessoaFinal = exigeNomePessoa(despachoOrigem)
        ? despachoOrigemPessoa.trim() || null
        : null

      await handleUpdateLead(lead.id, {
        origem: despachoOrigem.trim(),
        origem_pessoa: nomePessoaFinal,
        status: targetColuna,
        categoria: targetCategoria,
        notas_pessoais: newNotasPessoais,
      } as any)

      if (tipoAcao === 'forward') {
        toast.success(`Card encaminhado com sucesso para "${targetAba?.titulo || targetAbaId}"!`)
      } else {
        toast.success(
          `Card movido para "${targetAba?.titulo || targetAbaId} > ${cleanColumnTitle(targetColuna)}"`,
        )
      }

      setPendingDespachoOrigem(null)
      setDespachoOrigem('')
      setDespachoOrigemPessoa('')
      await loadData(true)
    } catch (err: any) {
      console.error('Erro ao despachar lead com origem:', err)
      toast.error('Erro ao despachar lead: ' + (err?.message || 'Falha ao salvar'))
    } finally {
      setIsSubmittingDespachoOrigem(false)
    }
  }

  // Arquivar (somente na aba atual via notas_pessoais)
  const handleArchiveLead = async (id: string) => {
    const lead = leads.find((l) => l.id === id)
    if (!lead) return

    // Bloqueio de arquivamento para cards comerciais em aberto
    if (isAbaComercial(safeAba.id) && isCardEmAberto(lead.status)) {
      toast.error(
        'Este atendimento ainda está em aberto. Para tirar do quadro, marque como Perdido (com motivo) ou use a lixeira se não for um lead.',
      )
      return
    }

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

  // Deletar lead (clique na lixeira)
  const handleClickDeleteLead = (lead: Lead) => {
    if (isAbaComercial(safeAba.id) && isCardEmAberto(lead.status)) {
      setLeadForSaida(lead)
    } else {
      setLeadToDelete(lead)
    }
  }

  // Deletar simples (outras abas ou cards não em aberto) via notas_pessoais da aba
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

  // Desfecho escolhido no SaidaDoQuadroModal
  const handleSelectSaidaOption = async (option: MotivoSaidaQuadro) => {
    const lead = leadForSaida
    if (!lead) return

    if (option === 'perdido') {
      // Fecha a janela de saída e abre o fluxo de perda com motivo obrigatório
      setLeadForSaida(null)
      const colunaPerdido =
        safeAba.colunas.find((c) => isStatusPerdido(c)) ||
        (safeAba.id === 'novo-contato' ? 'SDR: Perdido' : 'Perdido')
      setPendingPerda({
        lead,
        targetStatus: colunaPerdido,
        etapaAnterior: lead.status || safeAba.colunas[0] || 'Novo contato',
      })
      return
    }

    // Opções: "Não é lead (engano, spam ou outro assunto)", "Cadastro repetido", "Teste"
    // Regra: gravar leads.excluido = true, manter meta.exclusoes da aba e gravar meta.exclusao_motivo
    try {
      const { notas, meta } = parseLeadMetadados((lead as any)?.notas_pessoais)
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
        exclusao_motivo: option,
      }
      const newNotasPessoais = stringifyLeadMetadados(notas, newMeta)

      // Atualização imediata no banco: excluido = true + meta com exclusão e motivo
      const { error: updErr } = await supabase
        .from('leads')
        .update({
          excluido: true,
          notas_pessoais: newNotasPessoais,
        } as any)
        .eq('id', lead.id)

      if (updErr) throw updErr

      // Remover o card do quadro local imediatamente
      setLeads((prev) => prev.filter((l) => l.id !== lead.id))
      if (selectedLeadForModal?.id === lead.id) setSelectedLeadForModal(null)
      setLeadForSaida(null)
      toast.success(`Atendimento retirado do quadro: ${option}`)
    } catch (err: any) {
      console.error('Erro ao retirar atendimento do quadro:', err)
      toast.error('Erro ao retirar atendimento: ' + (err?.message || 'Falha ao salvar'))
    }
  }

  const resetQuickLeadForm = () => {
    setQuickNome('')
    setQuickTelefone('')
    setQuickOrigem(isComercialTab ? '' : 'A definir')
    setQuickOrigemPessoa('')
    setIsCreatingQuickLead(false)
    setPendingQuickLead(null)
  }

  // Executa a criação real do lead no banco
  const executeCreateLead = async (payload: {
    nome: string
    telefone: string
    origem: string
    origem_pessoa: string | null
  }) => {
    const { data: sessionData } = await supabase.auth.getSession()
    const currentAuthUser = user || sessionData?.session?.user
    const userName =
      currentAuthUser?.user_metadata?.nome || currentAuthUser?.email?.split('@')[0] || 'Sistema'

    const initialStatus = safeAba.colunas[0] || 'Novo contato'
    const initialCategoria = safeAba.categoriaPadrao || 'Comercial'

    await createLead({
      nome: payload.nome,
      telefone: payload.telefone,
      origem: payload.origem || 'A definir',
      origem_pessoa: payload.origem_pessoa,
      status: initialStatus,
      categoria: initialCategoria,
      criado_por_nome: userName,
      kanban_ativo: true,
    })

    resetQuickLeadForm()
    toast.success('Lead adicionado com sucesso!')
    loadData(true)
  }

  const handleConfirmDuplicateLead = async () => {
    if (!pendingQuickLead) return
    setIsConfirmingQuickLead(true)
    try {
      await executeCreateLead({
        nome: pendingQuickLead.nome,
        telefone: pendingQuickLead.telefone,
        origem: pendingQuickLead.origem,
        origem_pessoa: pendingQuickLead.origem_pessoa,
      })
    } catch (err: any) {
      toast.error('Erro ao criar lead: ' + (err?.message || 'Falha na criação'))
    } finally {
      setIsConfirmingQuickLead(false)
      setPendingQuickLead(null)
    }
  }

  // Criar Novo Lead Rápido
  const handleCreateQuickLead = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickNome.trim() || !quickTelefone.trim()) {
      toast.error('Preencha nome e telefone')
      return
    }

    // Regra 1: seletor de origem começa vazio nas abas comerciais com bloqueio "Selecione a origem do lead"
    if (isComercialTab && (!quickOrigem || !quickOrigem.trim())) {
      toast.error('Selecione a origem do lead')
      return
    }

    if (nomePessoaObrigatorio(quickOrigem) && !quickOrigemPessoa.trim()) {
      toast.error('Informe o nome da pessoa para a origem selecionada')
      return
    }

    // Regra 2: validação de telefone (12–13 dígitos começando com 55, mensagem "Telefone inválido. Use DDD + número.")
    let phoneDigits = quickTelefone.replace(/\D/g, '')
    if (phoneDigits.length === 10) {
      phoneDigits = '55' + phoneDigits.slice(0, 2) + '9' + phoneDigits.slice(2)
    } else if (phoneDigits.length === 11) {
      phoneDigits = '55' + phoneDigits
    } else if (phoneDigits.length === 12 && phoneDigits.startsWith('55')) {
      phoneDigits = '55' + phoneDigits.slice(2, 4) + '9' + phoneDigits.slice(4)
    }

    if ((phoneDigits.length !== 12 && phoneDigits.length !== 13) || !phoneDigits.startsWith('55')) {
      toast.error('Telefone inválido. Use DDD + número.')
      return
    }

    const payloadData = {
      nome: quickNome.trim(),
      telefone: phoneDigits,
      origem: quickOrigem.trim() || 'A definir',
      origem_pessoa: exigeNomePessoa(quickOrigem) ? quickOrigemPessoa.trim() || null : null,
    }

    try {
      // Regra 3: aviso de telefone repetido com janela "Já existe cadastro com este telefone" listando nome/status/data
      // Buscar leads existentes com o mesmo telefone (tanto no estado quanto no banco)
      const currentDuplicates: DuplicateLeadInfo[] = []
      const seenIds = new Set<string>()

      if (Array.isArray(leads)) {
        for (const l of leads) {
          if (l && l.telefone) {
            let lDigits = String(l.telefone).replace(/\D/g, '')
            if (lDigits.length === 10) lDigits = '55' + lDigits.slice(0, 2) + '9' + lDigits.slice(2)
            else if (lDigits.length === 11) lDigits = '55' + lDigits
            else if (lDigits.length === 12 && lDigits.startsWith('55'))
              lDigits = '55' + lDigits.slice(2, 4) + '9' + lDigits.slice(4)

            if (lDigits === phoneDigits && !seenIds.has(l.id)) {
              seenIds.add(l.id)
              currentDuplicates.push({
                id: l.id,
                nome: l.nome || null,
                status: l.status || null,
                criado_em: (l as any).criado_em || null,
              })
            }
          }
        }
      }

      // Consulta complementar ao banco para telefones exatos ou equivalentes
      try {
        const { data: dbDups } = await supabase
          .from('leads')
          .select('id, nome, status, criado_em, telefone')
          .or(`telefone.eq.${phoneDigits},telefone.eq.${phoneDigits.replace(/^55/, '')}`)
          .limit(10)

        if (Array.isArray(dbDups)) {
          for (const d of dbDups) {
            if (d && !seenIds.has(d.id)) {
              seenIds.add(d.id)
              currentDuplicates.push({
                id: d.id,
                nome: d.nome || null,
                status: d.status || null,
                criado_em: d.criado_em || null,
              })
            }
          }
        }
      } catch (checkErr) {
        console.warn('Erro ao verificar duplicidade de telefone no banco:', checkErr)
      }

      if (currentDuplicates.length > 0) {
        setPendingQuickLead({
          ...payloadData,
          duplicates: currentDuplicates,
        })
        return
      }

      await executeCreateLead(payloadData)
    } catch (err: any) {
      toast.error('Erro ao criar lead: ' + (err?.message || 'Falha ao salvar'))
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

    // Se a coluna de destino for Perdido/SDR: Perdido, interceptar com o modal de motivo da perda!
    // O status só persiste se o usuário confirmar no modal preenchendo o motivo.
    // Se cancelar, nada é salvo e o card permanece na coluna/etapa anterior.
    if (isStatusPerdido(targetCol)) {
      setPendingPerda({
        lead,
        targetStatus: targetCol,
        etapaAnterior: lead.status || safeAba.colunas[0] || 'Novo contato',
      })
      return
    }

    // Se a coluna de destino for Vendido, interceptar com o modal de confirmação de venda!
    // O status e a venda só persistem se o usuário concluir com sucesso no modal ("Preparar Pasta").
    // Se cancelar ("Voltar" ou clique fora), nada é gravado e o card permanece onde estava.
    if (isStatusVendido(targetCol)) {
      setPendingVenda({
        lead,
      })
      return
    }

    try {
      await handleUpdateLead(id, { status: targetCol })
    } catch (err: any) {
      toast.error('Erro ao mover card: ' + (err?.message || 'Falha ao salvar'))
    }
  }

  // Confirmação da Venda após sucesso no ConfirmSellModal
  const handleConfirmVenda = async (
    leadId: string,
    pendingUpdates?: { categoria?: string; notas_pessoais?: string },
  ) => {
    if (
      pendingUpdates &&
      (pendingUpdates.categoria || pendingUpdates.notas_pessoais !== undefined)
    ) {
      try {
        const payload: Partial<Lead> = {}
        if (pendingUpdates.categoria) payload.categoria = pendingUpdates.categoria
        if (pendingUpdates.notas_pessoais !== undefined)
          (payload as any).notas_pessoais = pendingUpdates.notas_pessoais
        await updateLead(leadId, payload)
      } catch (err) {
        console.warn('Erro ao atualizar categoria/notas pós-venda:', err)
      }
    }
    await loadData(true)
  }

  // Confirmação do modal de Motivo de Perda
  const handleConfirmPerda = async ({ motivo_perda, etapa_perda }: MotivoPerdaConfirmData) => {
    if (!pendingPerda) return
    const { lead, targetStatus, targetAbaId, targetCategoria } = pendingPerda

    try {
      // Regra permanente: leads perdidos DEVEM manter o consultor atribuído
      // (a taxa de conversão por consultor depende disso; nunca enviar null / nunca limpar consultor_id)
      const updates: Partial<Lead> = {
        status: targetStatus,
        motivo_perda,
        etapa_perda,
        ...(lead.consultor_id ? { consultor_id: lead.consultor_id } : {}),
      }

      if (targetCategoria) {
        updates.categoria = targetCategoria
      }

      if (targetAbaId) {
        const { notas, meta } = parseLeadMetadados((lead as any)?.notas_pessoais)
        const newMeta: LeadMetadados = {
          ...meta,
          origem_aba: safeAba.id,
          encaminhado_para_aba: targetAbaId,
          encaminhado_em: new Date().toISOString(),
        }
        ;(updates as any).notas_pessoais = stringifyLeadMetadados(notas, newMeta)
      }

      await handleUpdateLead(lead.id, updates)
      toast.success(
        `Lead movido para "${cleanColumnTitle(targetStatus)}" com motivo: "${motivo_perda}"`,
      )
      setPendingPerda(null)
    } catch (err: any) {
      console.error('Erro ao registrar perda do lead:', err)
      toast.error('Erro ao salvar motivo de perda: ' + (err?.message || 'Falha ao salvar'))
      throw err
    }
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

        // Se o card foi encaminhado para uma aba específica ou pertence naturalmente
        if (!leadBelongsToAba(l, safeAba.id)) {
          return false
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

        // Filtro por Origem do Lead (incluindo 'Corretor' e demais origens)
        if (origemFilter !== 'all') {
          const rawOrigem = typeof l.origem === 'string' ? l.origem.trim().toLowerCase() : ''
          if (origemFilter === 'sem_origem') {
            if (rawOrigem !== '' && rawOrigem !== 'sem origem' && rawOrigem !== 'a definir')
              return false
          } else {
            const filterNorm = (origemFilter || '').trim().toLowerCase()
            if (rawOrigem !== filterNorm) return false
          }
        }

        // Filtro "Só pendentes": status_atendimento = 'aguardando_resposta' E com mensagem de cliente
        if (onlyPending) {
          const isPendingLead =
            l.status_atendimento === 'aguardando_resposta' && leadsWithClientMessage.has(l.id)
          if (!isPendingLead) return false
        }

        return true
      } catch (err) {
        console.error('Erro ao processar lead no filtro da aba:', err)
        return false
      }
    })
  }, [
    leads,
    safeAba.id,
    safeAba.categoriaPadrao,
    search,
    responsavelFilter,
    origemFilter,
    onlyPending,
    leadsWithClientMessage,
  ])

  // Agrupamento memoizado dos leads por coluna para evitar .filter() a cada render/coluna
  const leadsByColumn = useMemo(() => {
    const map = new Map<string, Lead[]>()
    const colunas = Array.isArray(safeAba?.colunas) ? safeAba.colunas.filter(Boolean) : []
    colunas.forEach((c) => map.set(c, []))

    const fallbackCol = colunas[0] || 'Novo contato'

    const getColForLead = (l: Lead): string => {
      if (!l || typeof l !== 'object') return fallbackCol
      const s = typeof l.status === 'string' ? l.status.trim() : ''
      if (!s) return fallbackCol
      const sLower = s.toLowerCase()

      const exactMatch = colunas.find(
        (c) => typeof c === 'string' && c.trim().toLowerCase() === sLower,
      )
      if (exactMatch) return exactMatch

      // Na aba 01 (novo-contato / SDR), garantir mapeamentos específicos
      if (safeAba?.id === 'novo-contato') {
        if (sLower === 'novo lead' || sLower === 'novo' || sLower === 'novo contato') {
          const novoCol = colunas.find(
            (c) => typeof c === 'string' && c.trim().toLowerCase() === 'novo contato',
          )
          if (novoCol) return novoCol
        }
        if (sLower === 'encaminhado para' || sLower === 'despachados') {
          const novoCol = colunas.find(
            (c) => typeof c === 'string' && c.trim().toLowerCase() === 'novo contato',
          )
          if (novoCol) return novoCol
        }
      }

      // Equivalência para a coluna "Orçamento Concluido" na aba de Orçamentos
      if (safeAba?.id === 'lead-orcamentos') {
        const orcamentoConcluidoCol = colunas.find(
          (c) => typeof c === 'string' && c.toLowerCase().includes('concluid'),
        )
        if (
          orcamentoConcluidoCol &&
          (sLower === 'encaminhado' || sLower.includes('concluid') || sLower.includes('concluído'))
        ) {
          return orcamentoConcluidoCol
        }
      }

      if (sLower.includes('encaminhado')) {
        const encaminhadoCol = colunas.find(
          (c) => typeof c === 'string' && c.toLowerCase().includes('encaminhado'),
        )
        if (encaminhadoCol) return encaminhadoCol
      }

      return fallbackCol
    }

    if (Array.isArray(tabLeads)) {
      tabLeads.forEach((l) => {
        if (!l || typeof l !== 'object' || !l.id) return
        const col = getColForLead(l)
        const currentList = map.get(col)
        if (currentList) {
          currentList.push(l)
        } else {
          // Se a coluna não existia previamente no map (caso improvável), cria a entrada
          map.set(col, [l])
        }
      })
    }

    return map
  }, [tabLeads, safeAba?.colunas, safeAba?.id])

  // Cálculo de pendências por coluna desta aba
  const pendenciasByColumn = useMemo(() => {
    const map = new Map<string, number>()
    const colunas = Array.isArray(safeAba?.colunas) ? safeAba.colunas.filter(Boolean) : []
    colunas.forEach((c) => map.set(c, 0))

    colunas.forEach((coluna) => {
      const colLeads = leadsByColumn?.get?.(coluna) || []
      const pendentesCount = Array.isArray(colLeads)
        ? colLeads.filter(
            (l) =>
              l &&
              l.status_atendimento === 'aguardando_resposta' &&
              leadsWithClientMessage?.has?.(l.id),
          ).length
        : 0
      map.set(coluna, pendentesCount)
    })

    return map
  }, [safeAba?.colunas, leadsByColumn, leadsWithClientMessage])

  // Total de pendências na aba atual
  const totalPendenciasAba = useMemo(() => {
    let sum = 0
    if (pendenciasByColumn && typeof pendenciasByColumn.forEach === 'function') {
      pendenciasByColumn.forEach((count) => {
        sum += typeof count === 'number' ? count : 0
      })
    }
    return sum
  }, [pendenciasByColumn])

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
    <div className="flex items-center gap-2 flex-wrap">
      {/* Toggle "Só pendentes" */}
      <button
        type="button"
        onClick={() => setOnlyPending((prev) => !prev)}
        className={cn(
          'h-8 px-2.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors',
          onlyPending
            ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
            : 'bg-background hover:bg-muted text-muted-foreground border-border',
        )}
        title="Filtrar visão para apenas leads com mensagens aguardando resposta"
      >
        <span
          className={cn(
            'w-2 h-2 rounded-full',
            onlyPending
              ? 'bg-white'
              : totalPendenciasAba > 0
                ? 'bg-amber-500'
                : 'bg-muted-foreground',
          )}
        />
        <span>Só pendentes</span>
        {totalPendenciasAba > 0 && (
          <span
            className={cn(
              'px-1.5 py-0.2 rounded-full text-[10px] font-bold',
              onlyPending
                ? 'bg-amber-600 text-white'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
            )}
          >
            {totalPendenciasAba}
          </span>
        )}
      </button>

      <div className="relative w-36 lg:w-48">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Buscar nome/tel..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 pl-8 text-xs"
        />
      </div>

      <Select value={responsavelFilter} onValueChange={setResponsavelFilter}>
        <SelectTrigger className="h-8 text-xs w-36 lg:w-40">
          <SelectValue placeholder="Responsável" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos Responsáveis</SelectItem>
          <SelectItem value="unassigned">Não atribuído</SelectItem>
          {Array.isArray(users) &&
            users
              .filter(
                (u) =>
                  u &&
                  typeof u === 'object' &&
                  typeof u.id === 'string' &&
                  u.id.trim() !== '' &&
                  u.eh_consultor,
              )
              .map((u) => (
                <SelectItem key={u.id.trim()} value={u.id.trim()} className="text-xs">
                  {formatConsultorOptionLabel(u)}
                </SelectItem>
              ))}
        </SelectContent>
      </Select>

      {/* Filtro por Origem (com destaque para Corretor e Bender Conecta) */}
      <Select value={origemFilter} onValueChange={setOrigemFilter}>
        <SelectTrigger className="h-8 text-xs w-36 lg:w-40">
          <SelectValue placeholder="Origem" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas Origens</SelectItem>
          <SelectItem value="Corretor" className="font-semibold text-blue-600 dark:text-blue-400">
            🤝 Corretor
          </SelectItem>
          <SelectItem
            value="Bender Conecta"
            className="font-semibold text-blue-600 dark:text-blue-400"
          >
            🔗 Bender Conecta
          </SelectItem>
          {ORIGENS_LEAD.filter((o) => o !== 'Corretor' && o !== 'Bender Conecta').map((orig) => (
            <SelectItem key={orig} value={orig} className="text-xs">
              {orig}
            </SelectItem>
          ))}
          <SelectItem value="sem_origem">Sem Origem</SelectItem>
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
      {toolbarPortal instanceof Element &&
        toolbarPortal.isConnected &&
        isActive &&
        createPortal(controls, toolbarPortal)}

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
            <div className="w-40">
              <Select value={quickOrigem} onValueChange={(v) => setQuickOrigem(v)}>
                <SelectTrigger className="h-8 text-xs bg-background">
                  <SelectValue placeholder="Origem do lead *" />
                </SelectTrigger>
                <SelectContent>
                  {!isComercialTab && (
                    <SelectItem value="A definir" className="text-xs">
                      A definir
                    </SelectItem>
                  )}
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
                required={nomePessoaObrigatorio(quickOrigem)}
                placeholder={`${getRotuloNomePessoa(quickOrigem)}${
                  nomePessoaObrigatorio(quickOrigem) ? ' *' : ' (opcional)'
                }`}
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
                onClick={resetQuickLeadForm}
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
              const colLeads = Array.isArray(leadsByColumn.get(coluna))
                ? (leadsByColumn.get(coluna) as Lead[]).filter(Boolean)
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
                      {(pendenciasByColumn.get(coluna) || 0) > 0 && (
                        <span
                          className="text-[11px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs"
                          title={`${pendenciasByColumn.get(coluna)} atendimento(s) com mensagem aguardando resposta nesta coluna`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                          {pendenciasByColumn.get(coluna)} pendente
                          {(pendenciasByColumn.get(coluna) || 0) > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Lista de Cards da Coluna */}
                  <div className="flex-1 p-2.5 overflow-y-auto space-y-2.5 min-h-[150px]">
                    <ErrorBoundary
                      source={`KanbanColumn-${coluna}`}
                      fallback={
                        <div className="p-3 text-xs text-destructive bg-destructive/10 rounded-lg text-center">
                          Erro ao exibir cards desta coluna
                        </div>
                      }
                    >
                      {colLeads.map((lead) => (
                        <ErrorBoundary
                          key={lead.id}
                          source={`CardAtendimento-${lead.id}`}
                          fallback={
                            <div className="p-3 text-xs text-muted-foreground border border-border/60 rounded-lg bg-card/60 mb-2 flex items-center justify-between gap-2 shadow-xs">
                              <span className="font-medium text-destructive">
                                Atendimento indisponível temporariamente
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 text-[11px] px-2 text-muted-foreground hover:text-foreground"
                                onClick={() => loadData(true)}
                              >
                                Tentar recarregar
                              </Button>
                            </div>
                          }
                        >
                          <CardAtendimento
                            lead={lead}
                            currentAba={safeAba}
                            users={Array.isArray(users) ? users : []}
                            isDragging={draggingId === lead.id}
                            unreadCount={
                              leadsWithClientMessage.has(lead.id) ? unreadCounts[lead.id] || 0 : 0
                            }
                            isPending={
                              lead.status_atendimento === 'aguardando_resposta' &&
                              leadsWithClientMessage.has(lead.id)
                            }
                            lastClientMsgTime={lastMessages[lead.id]?.created_at || null}
                            onDragStart={(e) => handleDragStart(e, lead.id)}
                            onDragEnd={handleDragEnd}
                            onClick={() => handleOpenLeadModal(lead)}
                            onOpenConversation={() => {
                              if (onOpenLeadGlobal) {
                                onOpenLeadGlobal(lead)
                              } else {
                                handleOpenLeadModal(lead)
                              }
                            }}
                            onUpdateLead={handleUpdateLead}
                            onArchive={handleArchiveLead}
                            onDelete={() => handleClickDeleteLead(lead)}
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
        <ErrorBoundary fallback={null} source={`ModalAtendimento-${selectedLeadForModal?.id}`}>
          <ModalAtendimento
            lead={selectedLeadForModal}
            currentAba={safeAba}
            users={users}
            open={Boolean(selectedLeadForModal)}
            onClose={() => setSelectedLeadForModal(null)}
            onUpdateLead={handleUpdateLead}
            onTriggerSellModal={(l) => {
              setSelectedLeadForModal(null)
              setPendingVenda({
                lead: l,
              })
            }}
          />
        </ErrorBoundary>
      )}

      {/* Modal de Fechamento de Venda (Dossiê/Contrato) */}
      {(pendingVenda || leadToSell) && (
        <ConfirmSellModal
          lead={(pendingVenda?.lead || leadToSell)!}
          pendingUpdates={pendingVenda?.pendingUpdates}
          onSuccess={async () => {
            const currentPending = pendingVenda
            setPendingVenda(null)
            setLeadToSell(null)
            if (currentPending?.lead?.id) {
              await handleConfirmVenda(currentPending.lead.id, currentPending.pendingUpdates)
            } else {
              await loadData(true)
            }
          }}
          onClose={() => {
            setPendingVenda(null)
            setLeadToSell(null)
          }}
        />
      )}

      {/* Modal de Exclusão de Lead (confirmação simples para outras abas / cards fechados) */}
      {leadToDelete && (
        <DeleteLeadModal onClose={() => setLeadToDelete(null)} onConfirm={handleConfirmDelete} />
      )}

      {/* Modal de Saída do Quadro (para cards comerciais em aberto) */}
      {leadForSaida && (
        <SaidaDoQuadroModal
          open={Boolean(leadForSaida)}
          lead={leadForSaida}
          onClose={() => setLeadForSaida(null)}
          onSelectOption={handleSelectSaidaOption}
        />
      )}

      {/* Modal de aviso de telefone repetido (confirmação antes de criar o lead) */}
      {pendingQuickLead && (
        <Dialog
          open={Boolean(pendingQuickLead)}
          onOpenChange={(open) => {
            if (!open) setPendingQuickLead(null)
          }}
        >
          <DialogContent className="max-w-lg bg-background border shadow-xl">
            <DialogHeader className="space-y-1.5">
              <DialogTitle className="text-lg font-bold text-foreground">
                Já existe cadastro com este telefone
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Encontramos os cadastros abaixo com o mesmo DDD + número de telefone. Confirme se
                deseja criar um novo cadastro para este cliente.
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-56 overflow-y-auto rounded-lg border border-border/70 divide-y divide-border/60">
              {pendingQuickLead.duplicates.map((d) => (
                <div key={d.id} className="px-3 py-2 text-xs flex flex-col gap-0.5">
                  <span className="font-semibold text-foreground">{d.nome || 'Sem nome'}</span>
                  <span className="text-muted-foreground">
                    Status: {d.status || '—'} · Criado em: {safeFormatDatePtBr(d.criado_em)}
                  </span>
                </div>
              ))}
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setPendingQuickLead(null)}
                disabled={isConfirmingQuickLead}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-8 text-xs"
                onClick={handleConfirmDuplicateLead}
                disabled={isConfirmingQuickLead}
              >
                {isConfirmingQuickLead ? 'Criando...' : 'Criar mesmo assim'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal de Motivo de Perda (interceptação obrigatória antes de persistir status Perdido) */}
      {pendingPerda && (
        <MotivoPerdaModal
          open={Boolean(pendingPerda)}
          lead={pendingPerda.lead}
          targetStatus={pendingPerda.targetStatus}
          etapaAnterior={pendingPerda.etapaAnterior}
          onClose={() => setPendingPerda(null)}
          onConfirm={handleConfirmPerda}
        />
      )}

      {/* Modal: "De onde veio este cliente?" (origem obrigatória ao despachar de novo-contato) */}
      {pendingDespachoOrigem && (
        <Dialog
          open={Boolean(pendingDespachoOrigem)}
          onOpenChange={(open) => {
            if (!open && !isSubmittingDespachoOrigem) {
              setPendingDespachoOrigem(null)
              setDespachoOrigem('')
              setDespachoOrigemPessoa('')
            }
          }}
        >
          <DialogContent className="max-w-md bg-background border shadow-xl">
            <DialogHeader className="space-y-1.5">
              <DialogTitle className="text-lg font-bold text-foreground">
                De onde veio este cliente?
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Para despachar este lead da triagem para atendimento comercial, selecione a origem
                de captação.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="text-xs font-semibold text-foreground/90">
                Cliente:{' '}
                <span className="font-normal">{pendingDespachoOrigem.lead.nome || 'Sem nome'}</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Origem do lead <span className="text-destructive">*</span>
                </label>
                <Select
                  value={despachoOrigem}
                  onValueChange={(val) => {
                    setDespachoOrigem(val)
                    if (!exigeNomePessoa(val)) {
                      setDespachoOrigemPessoa('')
                    }
                  }}
                  disabled={isSubmittingDespachoOrigem}
                >
                  <SelectTrigger className="h-9 text-xs bg-background">
                    <SelectValue placeholder="Selecione a origem do lead *" />
                  </SelectTrigger>
                  <SelectContent>
                    {ORIGENS_LEAD.filter((orig) => orig !== 'A definir').map((orig) => (
                      <SelectItem key={orig} value={orig} className="text-xs">
                        {orig}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {exigeNomePessoa(despachoOrigem) && (
                <div className="space-y-1.5 animate-in fade-in duration-150">
                  <label className="text-xs font-medium text-foreground">
                    {getRotuloNomePessoa(despachoOrigem)}
                    {nomePessoaObrigatorio(despachoOrigem) ? (
                      <span className="text-destructive"> *</span>
                    ) : (
                      <span className="text-muted-foreground font-normal"> (opcional)</span>
                    )}
                  </label>
                  <Input
                    required={nomePessoaObrigatorio(despachoOrigem)}
                    placeholder={`${getRotuloNomePessoa(despachoOrigem)}${
                      nomePessoaObrigatorio(despachoOrigem) ? ' *' : ' (opcional)'
                    }`}
                    value={despachoOrigemPessoa}
                    onChange={(e) => setDespachoOrigemPessoa(e.target.value)}
                    className="h-9 text-xs"
                    disabled={isSubmittingDespachoOrigem}
                    autoFocus
                  />
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 text-xs"
                onClick={() => {
                  setPendingDespachoOrigem(null)
                  setDespachoOrigem('')
                  setDespachoOrigemPessoa('')
                }}
                disabled={isSubmittingDespachoOrigem}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-9 text-xs"
                onClick={handleConfirmDespachoOrigem}
                disabled={
                  isSubmittingDespachoOrigem ||
                  !despachoOrigem ||
                  (nomePessoaObrigatorio(despachoOrigem) && !despachoOrigemPessoa.trim())
                }
              >
                {isSubmittingDespachoOrigem ? 'Despachando...' : 'Confirmar e despachar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
