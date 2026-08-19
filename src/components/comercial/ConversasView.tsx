import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '@/lib/supabase/client'
import {
  fetchLeads,
  fetchUsers,
  updateLead,
  moveLeadToClient,
  fetchLeadMessages,
  sendWhatsAppMessage,
} from '@/services/comercial'
import { Phone as PhoneIcon } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { COLUMNS, isCategoriaComercial } from './constants'
import {
  Loader2,
  Sparkles,
  User as UserIcon,
  Calendar as CalendarIcon,
  X,
  ArrowRightLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { DateRange } from 'react-day-picker'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface Lead {
  id: string
  nome: string
  email: string
  telefone: string
  status: string
  categoria: string
  origem: string
  consultor_id: string | null
  consultor?: { nome: string }
  notas?: string | null
  created_at?: string
  kanban_ativo?: boolean
  status_atendimento?: string
}

interface User {
  id: string
  nome: string
}

interface ConversasViewProps {
  toolbarPortal?: HTMLDivElement | null
  isActive?: boolean
}

const categoriaDotClass = (cat?: string | null): string => {
  switch (cat) {
    case 'Comercial':
    case 'Já é Cliente':
      return 'bg-blue-500'
    case 'Currículo':
      return 'bg-green-500'
    case 'Parceiro':
      return 'bg-purple-500'
    case 'Fornecedor':
    case 'Arquiteto Externo':
    case 'Equipe':
    case 'Assistência':
      return 'bg-orange-500'
    default:
      return 'bg-gray-400'
  }
}

export function ConversasView({ toolbarPortal, isActive = true }: ConversasViewProps = {}) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [lastMessageAt, setLastMessageAt] = useState<Record<string, string>>({})

  const [messages, setMessages] = useState<any[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)

  const [categoriaFilter, setCategoriaFilter] = useState('Todas')
  const [statusFilter, setStatusFilter] = useState('Todos')
  const [nameSearch, setNameSearch] = useState('')
  const [date, setDate] = useState<DateRange | undefined>()

  const [updating, setUpdating] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let isMounted = true
    loadData()
    const channel = supabase
      .channel('conversas_leads_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        if (isMounted) loadData(true)
      })
      .subscribe()
    const msgChannel = supabase
      .channel('conversas_messages_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_messages' }, () => {
        if (isMounted) loadLastMessageTimes()
      })
      .subscribe()
    return () => {
      isMounted = false
      supabase.removeChannel(channel)
      supabase.removeChannel(msgChannel)
    }
  }, [])

  const loadLastMessageTimes = async () => {
    try {
      const { data } = await supabase
        .from('whatsapp_messages' as any)
        .select('lead_id, phone, created_at')
        .order('created_at', { ascending: false })
        .limit(1000)
      const map: Record<string, string> = {}
      for (const m of data || []) {
        const key = m.lead_id ? m.lead_id : `phone:${m.phone}`
        if (!map[key]) map[key] = m.created_at
      }
      setLastMessageAt(map)
    } catch (e) {
      // ignore — sort falls back to lead timestamps
    }
  }

  const loadData = async (isSilent = false) => {
    try {
      const [leadsData, usersData] = await Promise.all([fetchLeads(), fetchUsers()])
      setLeads(leadsData as any)
      setUsers(usersData)
      setSelectedLead((current) => {
        if (!current) return null
        const updated = leadsData.find((l: any) => l.id === current.id)
        return updated ? (updated as any) : current
      })
      loadLastMessageTimes()
    } catch (error) {
      console.error('Error loading Conversas data:', error)
      if (!isSilent) toast.error('Erro ao carregar dados')
    }
  }

  const loadMessages = useCallback(async (leadId: string, phone: string, isSilent = false) => {
    if (!isSilent) {
      setLoadingMessages(true)
      setMessages([]) // Immediately clear previous messages to prevent frozen data
    }
    try {
      const data = await fetchLeadMessages(leadId, phone)
      setMessages(data || [])
    } catch (error) {
      console.error('Error fetching messages:', error)
      if (!isSilent) setMessages([])
    } finally {
      if (!isSilent) setLoadingMessages(false)
    }
  }, [])

  // Synchronize center panel messages when a new lead is selected
  useEffect(() => {
    if (selectedLead?.id) {
      loadMessages(selectedLead.id, selectedLead.telefone)
    } else {
      setMessages([])
    }
  }, [selectedLead?.id, selectedLead?.telefone, loadMessages])

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Real-time synchronization for new whatsapp messages
  useEffect(() => {
    if (!selectedLead?.id) return

    const channel = supabase
      .channel(`messages_sub_${selectedLead.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_messages',
        },
        (payload: any) => {
          const newMsg = payload.new
          if (
            newMsg &&
            (newMsg.lead_id === selectedLead.id || newMsg.phone === selectedLead.telefone)
          ) {
            // Silent reload to prevent UI flicker
            loadMessages(selectedLead.id, selectedLead.telefone, true)
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedLead?.id, selectedLead?.telefone, loadMessages])

  const filteredLeads = leads
    .filter((l) => {
      if (statusFilter !== 'Todos' && l.status !== statusFilter) return false
      if (categoriaFilter !== 'Todas' && l.categoria !== categoriaFilter) return false
      if (nameSearch && !l.nome?.toLowerCase().includes(nameSearch.toLowerCase())) return false

      if (date?.from && l.created_at) {
        const leadDate = new Date(l.created_at)
        const from = new Date(date.from)
        from.setHours(0, 0, 0, 0)
        if (leadDate < from) return false
      }

      if (date?.to && l.created_at) {
        const leadDate = new Date(l.created_at)
        // Include the entire end day
        const to = new Date(date.to)
        to.setHours(23, 59, 59, 999)
        if (leadDate > to) return false
      }

      return true
    })
    .sort((a, b) => {
      const ta =
        lastMessageAt[a.id] ||
        lastMessageAt[`phone:${a.telefone}`] ||
        (a as any).atualizado_em ||
        (a as any).criado_em ||
        a.created_at ||
        ''
      const tb =
        lastMessageAt[b.id] ||
        lastMessageAt[`phone:${b.telefone}`] ||
        (b as any).atualizado_em ||
        (b as any).criado_em ||
        b.created_at ||
        ''
      return tb.localeCompare(ta)
    })

  const handleUpdateLead = async (id: string, data: Partial<Lead>) => {
    try {
      setUpdating(true)
      await updateLead(id, data)
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...data } : l)))
      if (selectedLead?.id === id) {
        setSelectedLead((prev) => (prev ? { ...prev, ...data } : null))
      }
      toast.success('Lead atualizado com sucesso')
    } catch (error) {
      console.error(error)
      toast.error('Erro ao atualizar lead')
    } finally {
      setUpdating(false)
    }
  }

  const handleGerarDossie = async () => {
    if (!selectedLead) return
    try {
      setUpdating(true)
      const { data } = await supabase.auth.getSession()
      const userId = data.session?.user.id
      if (!userId) throw new Error('Usuário não autenticado')

      await moveLeadToClient(selectedLead, userId)
      toast.success('Dossiê gerado com sucesso!')
      loadData()
      setSelectedLead(null)
    } catch (error: any) {
      console.error(error)
      toast.error('Erro ao gerar dossiê: ' + error.message)
    } finally {
      setUpdating(false)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedLead) return
    try {
      setSendingMessage(true)

      const trimmed = newMessage.trim()
      const result = await sendWhatsAppMessage(selectedLead.id, selectedLead.telefone, trimmed)

      // Real-time feedback: add the persisted message to the thread immediately
      if (result?.message) {
        setMessages((prev) => [...prev, result.message])
      }

      // Silently update attendance status (no toast noise)
      await supabase
        .from('leads')
        .update({ status_atendimento: 'em_atendimento', atualizado_em: new Date().toISOString() })
        .eq('id', selectedLead.id)
      setLeads((prev) =>
        prev.map((l) =>
          l.id === selectedLead.id ? { ...l, status_atendimento: 'em_atendimento' } : l,
        ),
      )
      setSelectedLead((prev) => (prev ? { ...prev, status_atendimento: 'em_atendimento' } : null))

      setNewMessage('')
      toast.success('Mensagem enviada')
    } catch (error) {
      console.error(error)
      toast.error('Erro ao enviar mensagem')
    } finally {
      setSendingMessage(false)
    }
  }

  const getStatusClasses = (status?: string, isSelected?: boolean) => {
    switch (status) {
      case 'aguardando_resposta':
        return `border-l-[5px] border-l-[#FFA500] ${!isSelected ? 'bg-[#FFA500]/5 hover:bg-[#FFA500]/10' : ''}`
      case 'em_atendimento':
        return `border-l-[5px] border-l-[#0066CC] ${!isSelected ? 'bg-[#0066CC]/5 hover:bg-[#0066CC]/10' : ''}`
      case 'respondida':
        return `border-l-[5px] border-l-[#00AA00] ${!isSelected ? 'bg-[#00AA00]/5 hover:bg-[#00AA00]/10' : ''}`
      case 'finalizada':
        return `border-l-[5px] border-l-[#CCCCCC] ${!isSelected ? 'bg-[#CCCCCC]/5 hover:bg-[#CCCCCC]/10' : ''}`
      case 'arquivada':
        return `border-l-[5px] border-l-[#999999] opacity-60 ${!isSelected ? 'bg-[#999999]/5 hover:bg-[#999999]/10' : ''}`
      default:
        return 'border-l-[5px] border-l-transparent'
    }
  }

  return (
    <div className="flex h-full w-full bg-background">
      {isActive &&
        toolbarPortal instanceof Element &&
        createPortal(
          <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-300">
            <Input
              placeholder="Buscar nome..."
              value={nameSearch}
              onChange={(e) => setNameSearch(e.target.value)}
              className="h-9 w-[150px] lg:w-[200px]"
            />

            <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
              <SelectTrigger className="h-9 w-[140px] lg:w-[180px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todas">Todas as Categorias</SelectItem>
                <SelectItem value="Comercial">Comercial</SelectItem>
                <SelectItem value="Já é Cliente">Já é Cliente</SelectItem>
                <SelectItem value="Fornecedor">Fornecedor</SelectItem>
                <SelectItem value="Assistência">Assistência</SelectItem>
                <SelectItem value="Currículo">Currículo</SelectItem>
                <SelectItem value="Arquiteto Externo">Arquiteto Externo</SelectItem>
                <SelectItem value="Parceiro">Parceiro</SelectItem>
                <SelectItem value="Equipe">Equipe</SelectItem>
                <SelectItem value="Outros Assuntos">Outros Assuntos</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-[140px] lg:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos os Status</SelectItem>
                <SelectItem value="Novo Contato">Novo Contato</SelectItem>
                <SelectItem value="Aguardando Consultor">Aguardando Consultor</SelectItem>
                <SelectItem value="Contactado">Contactado</SelectItem>
                <SelectItem value="Em Nutrição">Em Nutrição</SelectItem>
                <SelectItem value="Designar Consultor">Designar Consultor</SelectItem>
                <SelectItem value="Consultoria Inicial">Consultoria Inicial</SelectItem>
                <SelectItem value="Projeto Apresentação">Projeto Apresentação</SelectItem>
                <SelectItem value="Negociação">Negociação</SelectItem>
                <SelectItem value="Ação Gerente">Ação Gerente</SelectItem>
                <SelectItem value="Stand By">Stand By</SelectItem>
                <SelectItem value="Vendido">Vendido</SelectItem>
                <SelectItem value="Perdido">Perdido</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant="outline"
                    className={cn(
                      'justify-start text-left font-normal bg-background h-9 px-3 w-[200px] lg:w-[240px]',
                      !date && 'text-muted-foreground',
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                    <span className="truncate text-xs">
                      {date?.from ? (
                        date.to ? (
                          <>
                            {format(date.from, 'dd/MM/yyyy')} - {format(date.to, 'dd/MM/yyyy')}
                          </>
                        ) : (
                          format(date.from, 'dd/MM/yyyy')
                        )
                      ) : (
                        <span>Filtrar por data</span>
                      )}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={date?.from}
                    selected={date}
                    onSelect={setDate}
                    numberOfMonths={1}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
              {date && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={() => setDate(undefined)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>,
          toolbarPortal,
        )}

      {/* LEFT PANEL - 30% */}
      <div className="w-[30%] border-r border-border flex flex-col bg-muted/10">
        <div className="p-4 border-b border-border bg-background shrink-0">
          <h2 className="font-bold text-sm text-muted-foreground tracking-wider">CONVERSAS</h2>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {filteredLeads.map((lead) => {
              const isSelected = selectedLead?.id === lead.id
              const statusClasses = getStatusClasses(lead.status_atendimento, isSelected)

              return (
                <button
                  key={lead.id}
                  onClick={() => setSelectedLead(lead)}
                  data-status={lead.status_atendimento}
                  className={cn(
                    'w-full text-left p-3 rounded-md transition-colors border dark:border-cyan-500',
                    isSelected
                      ? 'bg-secondary text-secondary-foreground shadow-sm border-border dark:border-cyan-400'
                      : 'text-foreground hover:shadow-sm border-transparent hover:border-border/50 dark:border-cyan-500/50 dark:hover:border-cyan-400',
                    statusClasses,
                  )}
                >
                  <div className="font-medium truncate flex items-center gap-2">
                    <span
                      className={cn(
                        'h-2.5 w-2.5 rounded-full shrink-0',
                        categoriaDotClass(lead.categoria),
                      )}
                      title={lead.categoria || 'Sem categoria'}
                    />
                    <span className="truncate">{lead.nome}</span>
                  </div>
                  <div className="text-xs mt-1 opacity-70 truncate flex items-center gap-1">
                    <PhoneIcon className="w-3 h-3 opacity-60 shrink-0" />
                    <span className="truncate">{lead.telefone || 'Sem telefone'}</span>
                  </div>
                  <div className="text-[10px] mt-0.5 opacity-60 truncate">
                    {lead.categoria || 'Sem categoria'} •{' '}
                    {lead.status?.replace('Consultor', 'Responsável')}
                  </div>
                </button>
              )
            })}
            {filteredLeads.length === 0 && (
              <div className="text-center p-4 text-muted-foreground text-sm">
                Nenhum lead encontrado
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* CENTRAL PANEL - 50% */}
      <div className="w-[50%] border-r border-border flex flex-col bg-[#EFEAE2] dark:bg-[#0b141a] relative">
        {selectedLead ? (
          <>
            <div className="p-4 bg-background border-b border-border shadow-sm z-10 flex items-center gap-3 shrink-0">
              <div className="flex-1 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-foreground flex items-center gap-2">
                    {selectedLead.nome}
                    {selectedLead.kanban_ativo && (
                      <span className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                        Kanban
                      </span>
                    )}
                  </h3>
                  <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                    <PhoneIcon className="w-3 h-3 opacity-60" />
                    <span>{selectedLead.telefone || 'Sem telefone'}</span>
                    <span className="opacity-40">•</span>
                    <span>{selectedLead.status?.replace('Consultor', 'Responsável')}</span>
                  </div>
                </div>
              </div>
            </div>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4 max-w-2xl mx-auto pb-4">
                {loadingMessages ? (
                  <div className="flex justify-center items-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : messages.length > 0 ? (
                  (() => {
                    const rendered = messages.map((msg) => {
                      const isClient =
                        msg.sender_type === 'lead' ||
                        msg.sender_type === 'cliente' ||
                        (msg.direction === 'inbound' && msg.sender_type !== 'system')
                      const isSystem = msg.sender_type === 'system'
                      const isAssistant =
                        msg.sender_type === 'catarina' || msg.sender_type === 'assistant'
                      const isAna = msg.sender_type === 'ana'

                      const parsedMsg = {
                        id: msg.id,
                        sender:
                          msg.sender_name ||
                          (isAssistant
                            ? 'Catarina'
                            : isAna
                              ? 'Ana'
                              : isClient
                                ? 'Cliente'
                                : 'Equipe'),
                        content: msg.content || msg.text || msg.body || '',
                        timestamp: msg.created_at,
                        align: isSystem ? 'center' : isClient ? 'left' : 'right',
                        isSystem,
                        isClient,
                        isAssistant,
                        isAna,
                      }

                      if (parsedMsg.isSystem || parsedMsg.align === 'center') {
                        return (
                          <div key={parsedMsg.id} className="flex justify-center my-4">
                            <div className="bg-muted text-muted-foreground rounded-lg p-3 text-sm max-w-[90%] border border-border text-center">
                              <span className="text-[10px] font-bold mb-1 block uppercase opacity-70">
                                {parsedMsg.sender || 'Sistema'}
                              </span>
                              <p className="whitespace-pre-wrap">{parsedMsg.content}</p>
                              <span className="text-[10px] opacity-50 mt-2 block">
                                {parsedMsg.timestamp
                                  ? new Date(parsedMsg.timestamp).toLocaleString('pt-BR')
                                  : ''}
                              </span>
                            </div>
                          </div>
                        )
                      }

                      return (
                        <div
                          key={parsedMsg.id}
                          className={`flex ${parsedMsg.align === 'right' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={cn(
                              'max-w-[80%] p-3 shadow-sm relative text-[13px] leading-relaxed whitespace-pre-wrap',
                              parsedMsg.align === 'right'
                                ? 'rounded-l-xl rounded-br-sm rounded-tr-xl bg-[#DCF8C6] dark:bg-[#005c4b] text-[#303030] dark:text-[#e9edef]'
                                : 'rounded-r-xl rounded-bl-sm rounded-tl-xl bg-white dark:bg-[#202c33] text-[#303030] dark:text-[#e9edef] border border-black/5 dark:border-white/5',
                            )}
                          >
                            <div className="flex items-center gap-1.5 mb-1.5">
                              {parsedMsg.isAssistant && (
                                <Sparkles className="w-3.5 h-3.5 opacity-70" />
                              )}
                              {parsedMsg.isAna && <UserIcon className="w-3.5 h-3.5 opacity-70" />}
                              <span
                                className={cn(
                                  'text-[10px] font-bold uppercase tracking-wider',
                                  'text-[#667781] dark:text-[#8696a0]',
                                )}
                              >
                                {parsedMsg.sender}
                              </span>
                            </div>
                            <p>{parsedMsg.content}</p>
                            <span
                              className={cn(
                                'text-[10px] block text-right mt-2 font-medium',
                                'text-[#667781] dark:text-[#8696a0]',
                              )}
                            >
                              {parsedMsg.timestamp
                                ? new Date(parsedMsg.timestamp).toLocaleTimeString('pt-BR', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : ''}
                            </span>
                          </div>
                        </div>
                      )
                    })

                    return (
                      <>
                        {rendered}
                        <div ref={messagesEndRef} />
                      </>
                    )
                  })()
                ) : (
                  <div className="text-center p-4 text-muted-foreground text-sm">
                    Nenhuma mensagem na conversa.
                  </div>
                )}
              </div>
            </ScrollArea>
            <div className="p-4 bg-background border-t border-border shrink-0 flex items-center gap-2">
              <Input
                placeholder="Digite sua mensagem para o cliente..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
                disabled={sendingMessage}
                className="flex-1"
              />
              <Button onClick={handleSendMessage} disabled={!newMessage.trim() || sendingMessage}>
                {sendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enviar'}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Selecione um lead para ver a conversa
          </div>
        )}
      </div>

      {/* RIGHT PANEL - 20% */}
      <div className="w-[20%] flex flex-col bg-muted/10">
        <div className="p-4 border-b border-border bg-background">
          <h2 className="font-bold text-sm text-muted-foreground tracking-wider">DETALHES</h2>
        </div>

        {selectedLead ? (
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">
                  Status
                </label>
                <Select
                  disabled={updating}
                  value={selectedLead.status}
                  onValueChange={(val) => handleUpdateLead(selectedLead.id, { status: val })}
                >
                  <SelectTrigger className="h-9 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COLUMNS.map((col: string) => (
                      <SelectItem key={col} value={col}>
                        {col.replace('Consultor', 'Responsável')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">
                  Categoria
                </label>
                <Select
                  disabled={updating}
                  value={selectedLead.categoria || 'unassigned'}
                  onValueChange={(val) => {
                    const newVal = val === 'unassigned' ? null : val
                    const updates: Partial<Lead> = { categoria: newVal as string }
                    if (newVal === 'Comercial') {
                      updates.kanban_ativo = true
                    }
                    handleUpdateLead(selectedLead.id, updates)
                  }}
                >
                  <SelectTrigger className="h-9 bg-background">
                    <SelectValue placeholder="Selecione uma categoria..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Sem classificação</SelectItem>
                    <SelectItem value="Comercial">Comercial</SelectItem>
                    <SelectItem value="Já é Cliente">Já é Cliente</SelectItem>
                    <SelectItem value="Fornecedor">Fornecedor</SelectItem>
                    <SelectItem value="Assistência">Assistência</SelectItem>
                    <SelectItem value="Currículo">Currículo</SelectItem>
                    <SelectItem value="Arquiteto Externo">Arquiteto Externo</SelectItem>
                    <SelectItem value="Parceiro">Parceiro</SelectItem>
                    <SelectItem value="Equipe">Equipe</SelectItem>
                    <SelectItem value="Outros Assuntos">Outros Assuntos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">
                  Origem
                </label>
                <Select
                  disabled={updating}
                  value={selectedLead.origem || 'unassigned'}
                  onValueChange={(val) => {
                    const newVal = val === 'unassigned' ? null : val
                    handleUpdateLead(selectedLead.id, { origem: newVal })
                  }}
                >
                  <SelectTrigger className="h-9 bg-background">
                    <SelectValue placeholder="Selecione uma origem..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Sem origem</SelectItem>
                    <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                    <SelectItem value="Instagram">Instagram</SelectItem>
                    <SelectItem value="Google">Google</SelectItem>
                    <SelectItem value="Facebook">Facebook</SelectItem>
                    <SelectItem value="Parceiros">Parceiros</SelectItem>
                    <SelectItem value="Corretor">Corretor</SelectItem>
                    <SelectItem value="Arquiteto">Arquiteto</SelectItem>
                    <SelectItem value="Outdoor">Outdoor</SelectItem>
                    <SelectItem value="Recompra">Recompra</SelectItem>
                    <SelectItem value="Indicação">Indicação</SelectItem>
                    <SelectItem value="Porta">Porta</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">
                  Status de Atendimento
                </label>
                <Select
                  disabled={updating}
                  value={selectedLead.status_atendimento || 'aguardando_resposta'}
                  onValueChange={(val) =>
                    handleUpdateLead(selectedLead.id, { status_atendimento: val })
                  }
                >
                  <SelectTrigger className="h-9 bg-background">
                    <SelectValue placeholder="Status atendimento..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aguardando_resposta">Aguardando Resposta</SelectItem>
                    <SelectItem value="em_atendimento">Em Atendimento</SelectItem>
                    <SelectItem value="respondida">Respondida</SelectItem>
                    <SelectItem value="finalizada">Finalizada</SelectItem>
                    <SelectItem value="arquivada">Arquivada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">
                  Responsável
                </label>
                <Select
                  disabled={updating}
                  value={selectedLead.consultor_id || 'unassigned'}
                  onValueChange={(val) => {
                    const newVal = val === 'unassigned' ? null : val
                    handleUpdateLead(selectedLead.id, { consultor_id: newVal })
                  }}
                >
                  <SelectTrigger className="h-9 bg-background">
                    <SelectValue placeholder="Selecione um responsável..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Não designado</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">
                  Notas / Resumo IA
                </label>
                <textarea
                  disabled={updating}
                  value={selectedLead.notas || ''}
                  onChange={(e) =>
                    setSelectedLead((prev) => (prev ? { ...prev, notas: e.target.value } : null))
                  }
                  onBlur={(e) => {
                    if (e.target.value !== leads.find((l) => l.id === selectedLead.id)?.notas) {
                      handleUpdateLead(selectedLead.id, { notas: e.target.value })
                    }
                  }}
                  className="w-full text-sm bg-yellow-50/50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800/50 rounded-md p-3 outline-none focus:border-yellow-400 dark:focus:border-yellow-600 focus:ring-1 focus:ring-yellow-400 resize-y min-h-[100px] placeholder:text-yellow-700/40 dark:placeholder:text-yellow-200/30 text-yellow-950 dark:text-yellow-100 shadow-sm"
                  placeholder="Anotações ou resumo gerado pela IA..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">
                  Notas Pessoais
                </label>
                <textarea
                  disabled={updating}
                  value={(selectedLead as any).notas_pessoais || ''}
                  onChange={(e) =>
                    setSelectedLead((prev) =>
                      prev ? ({ ...prev, notas_pessoais: e.target.value } as any) : null,
                    )
                  }
                  onBlur={(e) => {
                    if (
                      e.target.value !==
                      (leads.find((l) => l.id === selectedLead.id) as any)?.notas_pessoais
                    ) {
                      handleUpdateLead(selectedLead.id, { notas_pessoais: e.target.value } as any)
                    }
                  }}
                  className="w-full text-sm bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/50 rounded-md p-3 outline-none focus:border-blue-400 dark:focus:border-blue-600 focus:ring-1 focus:ring-blue-400 resize-y min-h-[80px] placeholder:text-blue-700/40 dark:placeholder:text-blue-200/30 text-blue-950 dark:text-blue-100 shadow-sm"
                  placeholder="Anotações internas (não lidas pela IA)..."
                />
              </div>

              <div className="pt-4 border-t border-border space-y-3">
                {!selectedLead.kanban_ativo && (
                  <Button
                    disabled={updating}
                    variant="secondary"
                    className="w-full justify-center"
                    onClick={() => handleUpdateLead(selectedLead.id, { kanban_ativo: true })}
                  >
                    Ativar no Kanban
                  </Button>
                )}
                {isCategoriaComercial(selectedLead.categoria) && (
                  <Button
                    disabled={updating}
                    variant="outline"
                    className="w-full justify-center bg-background"
                    onClick={() => {
                      handleUpdateLead(selectedLead.id, {
                        categoria: 'Outros Assuntos',
                        status: 'Novo',
                      })
                      toast.success('Lead movido para Não Comercial')
                    }}
                  >
                    <ArrowRightLeft className="w-4 h-4 mr-2" />
                    Mover para Não Comercial
                  </Button>
                )}
                <Button
                  disabled={updating}
                  variant="outline"
                  className="w-full justify-center bg-background"
                  onClick={() => {
                    if (!selectedLead.consultor_id) {
                      toast.error('Selecione um responsável primeiro')
                      return
                    }
                    handleUpdateLead(selectedLead.id, { status: 'Designar Consultor' })
                  }}
                >
                  Passar para Responsável
                </Button>

                <Button
                  disabled={updating}
                  variant="outline"
                  className="w-full justify-center bg-background"
                  onClick={() => toast.info('Funcionalidade de agendamento em desenvolvimento')}
                >
                  Agendar
                </Button>

                <Button
                  disabled={updating}
                  className="w-full justify-center"
                  onClick={handleGerarDossie}
                >
                  Gerar Dossiê
                </Button>
              </div>
            </div>
          </ScrollArea>
        ) : (
          <div className="flex-1 flex p-4 text-sm text-center text-muted-foreground items-center justify-center">
            Selecione um lead para ver os detalhes
          </div>
        )}
      </div>
    </div>
  )
}
