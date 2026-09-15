import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Lead } from '@/types'
import { supabase } from '@/lib/supabase/client'
import { fetchLeadMessages, sendWhatsAppMessage } from '@/services/comercial'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  MessageCircle,
  FileText,
  History,
  Send,
  Loader2,
  Sparkles,
  User as UserIcon,
  Phone,
  Calendar,
  Clock,
  CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  ATENDIMENTO_ABAS,
  AtendimentoAbaConfig,
  ORIGENS_LEAD,
  exigeNomePessoa,
  getRotuloNomePessoa,
  parseLeadMetadados,
  stringifyLeadMetadados,
} from './constants'

export interface ModalAtendimentoProps {
  lead: Lead | null
  currentAba: AtendimentoAbaConfig
  users: Array<{ id: string; nome: string }>
  open: boolean
  onClose: () => void
  onUpdateLead: (id: string, updates: Partial<Lead>) => Promise<void> | void
  onTriggerSellModal?: (lead: Lead) => void
}

interface TimelineItem {
  id: string
  titulo: string
  descricao: string
  data: string
  usuarioNome?: string
  icone: 'status' | 'forward' | 'created' | 'note' | 'message'
  duracao?: string
}

export function ModalAtendimento({
  lead,
  currentAba,
  users,
  open,
  onClose,
  onUpdateLead,
  onTriggerSellModal,
}: ModalAtendimentoProps) {
  const [activeTab, setActiveTab] = useState<'conversas' | 'anotacoes' | 'timeline'>('conversas')

  // WhatsApp Messages
  const [messages, setMessages] = useState<any[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Origem e Origem Pessoa
  const [origemVal, setOrigemVal] = useState<string>(lead?.origem || 'A definir')
  const [origemPessoaVal, setOrigemPessoaVal] = useState<string>(lead?.origem_pessoa || '')
  const [updatingOrigem, setUpdatingOrigem] = useState(false)

  // Notas e Notas Pessoais
  const [notasIa, setNotasIa] = useState('')
  const [notasPessoaisClean, setNotasPessoaisClean] = useState('')
  const [savingNotas, setSavingNotas] = useState(false)

  // Timeline
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([])
  const [loadingTimeline, setLoadingTimeline] = useState(false)

  // Metadados
  const { notas: rawNotasClean, meta } = useMemo(
    () => parseLeadMetadados((lead as any)?.notas_pessoais),
    [(lead as any)?.notas_pessoais],
  )

  useEffect(() => {
    if (lead) {
      setOrigemVal(lead.origem || 'A definir')
      setOrigemPessoaVal(lead.origem_pessoa || '')
      setNotasIa(lead.notas || '')
      setNotasPessoaisClean(rawNotasClean || '')
    }
  }, [
    lead?.id,
    lead?.origem,
    lead?.origem_pessoa,
    (lead as any)?.notas_pessoais,
    lead?.notas,
    rawNotasClean,
  ])

  // Limpar status_atendimento pendente no banco ao abrir a conversa do lead
  useEffect(() => {
    if (!open || !lead?.id) return

    // Se o lead estiver aguardando resposta no banco, atualizar para 'em_atendimento'
    if (lead.status_atendimento === 'aguardando_resposta') {
      const clearPendency = async () => {
        try {
          await onUpdateLead(lead.id, {
            status_atendimento: 'em_atendimento',
            atualizado_em: new Date().toISOString(),
          } as any)
        } catch (err) {
          console.warn('Erro ao limpar pendência ao abrir modal do lead:', err)
        }
      }
      clearPendency()
    }
  }, [open, lead?.id, lead?.status_atendimento, onUpdateLead])

  // Carregar mensagens do WhatsApp
  const loadMessages = useCallback(
    async (silent = false) => {
      if (!lead?.id) return
      if (!silent) setLoadingMessages(true)
      try {
        const data = await fetchLeadMessages(lead.id, lead.telefone)
        setMessages(data || [])
      } catch (err) {
        console.error('Erro ao buscar mensagens:', err)
      } finally {
        if (!silent) setLoadingMessages(false)
      }
    },
    [lead?.id, lead?.telefone],
  )

  useEffect(() => {
    if (open && lead?.id) {
      loadMessages()
    } else {
      setMessages([])
    }
  }, [open, lead?.id, loadMessages])

  // Scroll automatico para a ultima mensagem
  useEffect(() => {
    if (messages.length > 0 && activeTab === 'conversas') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, activeTab])

  // Inscricao Realtime de Mensagens
  useEffect(() => {
    if (!open || !lead?.id) return

    let channel: any = null
    const uniqueChannelName = `modal_messages_${lead.id}_${Math.random().toString(36).substring(2, 9)}`
    try {
      if (supabase && typeof supabase.channel === 'function') {
        channel = supabase
          .channel(uniqueChannelName)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'whatsapp_messages' },
            (payload: any) => {
              try {
                const newMsg = payload?.new
                if (
                  newMsg &&
                  (newMsg.lead_id === lead.id || (lead.telefone && newMsg.phone === lead.telefone))
                ) {
                  loadMessages(true)
                }
              } catch (err) {
                console.warn('Erro no callback de realtime de mensagens:', err)
              }
            },
          )
          .subscribe((status: any, err: any) => {
            if (err || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              console.warn('Realtime modal_messages channel status/error:', status, err)
            }
          })
      }
    } catch (err) {
      console.warn('Falha ao inicializar canal Realtime modal_messages:', err)
    }

    return () => {
      if (channel) {
        try {
          channel.unsubscribe?.()
        } catch (e) {
          console.warn('Erro ao cancelar inscrição de modal_messages channel:', e)
        }
        try {
          supabase.removeChannel(channel)
        } catch (e) {
          console.warn('Erro ao remover modal_messages channel:', e)
        }
      }
    }
  }, [open, lead?.id, lead?.telefone, loadMessages])

  // Carregar Timeline de eventos
  const loadTimeline = useCallback(async () => {
    if (!lead?.id) return
    setLoadingTimeline(true)
    try {
      const items: TimelineItem[] = []

      if (lead.criado_em) {
        items.push({
          id: `create-${lead.id}`,
          titulo: 'Lead Criado no Sistema',
          descricao: `Lead registrado via ${lead.origem || 'WhatsApp'}${
            lead.criado_por_nome ? ` por ${lead.criado_por_nome}` : ''
          }. Estágio inicial: "${lead.status || '-'}".`,
          data: lead.criado_em,
          usuarioNome: lead.criado_por_nome || undefined,
          icone: 'created',
        })
      }

      const { data: notifs } = await supabase
        .from('notificacoes')
        .select('*')
        .like('link', `%lead_id=${lead.id}%`)
        .order('criado_em', { ascending: false })

      if (notifs && notifs.length > 0) {
        notifs.forEach((n) => {
          if (n?.criado_em) {
            items.push({
              id: n.id,
              titulo: n.titulo || 'Movimentação de Estágio',
              descricao: n.mensagem || '',
              data: n.criado_em,
              icone: 'status',
            })
          }
        })
      }

      if (meta?.encaminhado_para_aba && meta?.encaminhado_em) {
        const dest = ATENDIMENTO_ABAS.find((a) => a.id === meta.encaminhado_para_aba)
        items.push({
          id: `forward-${lead.id}`,
          titulo: 'Card Encaminhado de Aba',
          descricao: `Card encaminhado para "${dest?.titulo || meta.encaminhado_para_aba}".`,
          data: meta.encaminhado_em,
          icone: 'forward',
        })
      }

      const updatedAt = (lead as any)?.atualizado_em
      if (updatedAt && updatedAt !== lead.criado_em) {
        items.push({
          id: `update-${lead.id}`,
          titulo: 'Última Atualização Registrada',
          descricao: `Status atual: "${lead.status || '-'}" | Categoria: "${
            lead.categoria || 'Comercial'
          }"`,
          data: updatedAt,
          icone: 'note',
        })
      }

      const validItems = items.filter((item) => {
        if (!item.data) return false
        const t = new Date(item.data).getTime()
        return !isNaN(t)
      })

      validItems.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())

      for (let i = 0; i < validItems.length - 1; i++) {
        const dCurrent = new Date(validItems[i].data).getTime()
        const dPrev = new Date(validItems[i + 1].data).getTime()
        if (isNaN(dCurrent) || isNaN(dPrev)) continue
        const diffMs = Math.max(0, dCurrent - dPrev)
        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
        const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24)
        const mins = Math.floor((diffMs / 1000 / 60) % 60)

        let durStr = ''
        if (days > 0) durStr += `${days}d `
        if (hours > 0 || days > 0) durStr += `${hours}h `
        durStr += `${mins}m`
        validItems[i].duracao = durStr
      }

      setTimelineItems(validItems)
    } catch (err) {
      console.error('Erro ao carregar timeline:', err)
    } finally {
      setLoadingTimeline(false)
    }
  }, [lead, meta])

  useEffect(() => {
    if (open && activeTab === 'timeline') {
      loadTimeline()
    }
  }, [open, activeTab, loadTimeline])

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !lead) return
    const textToSend = newMessage.trim()
    try {
      setSendingMessage(true)
      const res = await sendWhatsAppMessage(lead.id, lead.telefone, textToSend)
      if (res?.message) {
        setMessages((prev) => [...prev, res.message])
      }
      setNewMessage('')
      toast.success('Mensagem enviada com sucesso!')

      await onUpdateLead(lead.id, {
        status_atendimento: 'em_atendimento',
      } as any)
    } catch (err: any) {
      console.error(err)
      toast.error('Erro ao enviar mensagem: ' + (err.message || 'Falha na conexão'))
    } finally {
      setSendingMessage(false)
    }
  }

  const handleOrigemChange = async (newOrigem: string) => {
    if (!lead || newOrigem === origemVal) return
    setOrigemVal(newOrigem)
    const requiresPessoa = exigeNomePessoa(newOrigem)
    const newOrigemPessoa = requiresPessoa ? origemPessoaVal : null
    if (!requiresPessoa) {
      setOrigemPessoaVal('')
    }
    try {
      setUpdatingOrigem(true)
      await onUpdateLead(lead.id, {
        origem: newOrigem,
        origem_pessoa: newOrigemPessoa,
      } as any)
      toast.success('Origem atualizada!')
    } catch (err: any) {
      toast.error('Erro ao atualizar origem: ' + (err.message || 'Falha'))
    } finally {
      setUpdatingOrigem(false)
    }
  }

  const handleOrigemPessoaBlur = async () => {
    if (!lead) return
    const trimmed = origemPessoaVal.trim() || null
    if (trimmed === (lead.origem_pessoa || null)) return
    try {
      setUpdatingOrigem(true)
      await onUpdateLead(lead.id, {
        origem_pessoa: trimmed,
      } as any)
      toast.success('Origem atualizada!')
    } catch (err: any) {
      toast.error('Erro ao salvar nome da pessoa: ' + (err.message || 'Falha'))
    } finally {
      setUpdatingOrigem(false)
    }
  }

  const handleSaveNotas = async () => {
    if (!lead) return
    try {
      setSavingNotas(true)
      const newNotasPessoais = stringifyLeadMetadados(notasPessoaisClean, meta)
      await onUpdateLead(lead.id, {
        notas: notasIa,
        notas_pessoais: newNotasPessoais,
      } as any)
      toast.success('Anotações salvas!')
    } catch (err: any) {
      toast.error('Erro ao salvar anotações: ' + err.message)
    } finally {
      setSavingNotas(false)
    }
  }

  if (!lead) return null

  const consultorRaw = (lead as any)?.consultor || (lead as any)?.users
  const consultorNome = Array.isArray(consultorRaw)
    ? consultorRaw[0]?.nome
    : typeof consultorRaw === 'object' && consultorRaw !== null
      ? (consultorRaw as any).nome
      : typeof (lead as any)?.consultor === 'string'
        ? (lead as any).consultor
        : undefined
  const colunas = Array.isArray(currentAba?.colunas) ? currentAba.colunas : []

  return (
    <ErrorBoundary fallback={null}>
      <Dialog open={Boolean(open)} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-5xl w-[95vw] h-[85vh] p-0 flex flex-col gap-0 overflow-hidden bg-background">
          <DialogHeader className="p-4 sm:p-5 border-b bg-muted/30 shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-xl font-bold text-foreground">
                  {lead.nome || 'Lead sem nome'}
                </DialogTitle>
                <Badge variant="outline" className="bg-background text-xs font-semibold">
                  {lead.status || 'Sem status'}
                </Badge>
                <Badge variant="secondary" className="text-xs font-semibold">
                  {currentAba?.titulo || 'Atendimentos'}
                </Badge>
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-primary" />
                  <strong className="font-mono text-foreground">{lead.telefone || 'Nenhum'}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <UserIcon className="w-3.5 h-3.5" />
                  <span>Responsável: </span>
                  <strong className="text-foreground">{consultorNome || 'Não atribuído'}</strong>
                </span>
                <div className="flex items-center gap-1.5 py-0.5">
                  <span className="shrink-0 font-medium text-muted-foreground">Origem:</span>
                  <div className="w-36">
                    <Select
                      disabled={updatingOrigem}
                      value={origemVal}
                      onValueChange={handleOrigemChange}
                    >
                      <SelectTrigger className="h-7 text-xs bg-background/80 px-2 py-0">
                        <SelectValue placeholder="Origem" />
                      </SelectTrigger>
                      <SelectContent>
                        {ORIGENS_LEAD.map((orig) => (
                          <SelectItem key={orig} value={orig} className="text-xs">
                            {orig}
                          </SelectItem>
                        ))}
                        {/* Caso o lead possua uma origem legada ainda não convertida, exibi-la para não quebrar a UI */}
                        {origemVal && !(ORIGENS_LEAD as readonly string[]).includes(origemVal) && (
                          <SelectItem value={origemVal} className="text-xs">
                            {origemVal}
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  {exigeNomePessoa(origemVal) && (
                    <Input
                      disabled={updatingOrigem}
                      placeholder={`${getRotuloNomePessoa(origemVal)}...`}
                      value={origemPessoaVal}
                      onChange={(e) => setOrigemPessoaVal(e.target.value)}
                      onBlur={handleOrigemPessoaBlur}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.currentTarget.blur()
                        }
                      }}
                      className="h-7 text-xs w-44 bg-background/80 border-amber-500/50 focus:border-amber-500 px-2 py-0"
                    />
                  )}
                </div>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Criado em: </span>
                  <strong className="text-foreground">
                    {(() => {
                      if (!lead.criado_em) return 'N/D'
                      try {
                        const d = new Date(lead.criado_em)
                        return isNaN(d.getTime())
                          ? 'N/D'
                          : format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                      } catch {
                        return 'N/D'
                      }
                    })()}
                  </strong>
                </span>
              </div>
            </div>

            {colunas.includes('Vendido') && lead.status !== 'Vendido' && onTriggerSellModal && (
              <Button
                size="sm"
                onClick={() => {
                  onTriggerSellModal(lead)
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shrink-0 font-semibold"
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" /> Fechar Venda
              </Button>
            )}
          </DialogHeader>

          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as any)}
            className="flex-1 flex flex-col min-h-0 h-full overflow-hidden"
          >
            <div className="px-4 sm:px-5 pt-3 pb-2 border-b bg-background shrink-0">
              <TabsList className="bg-muted/60 p-1">
                <TabsTrigger value="conversas" className="flex items-center gap-2 font-semibold">
                  <MessageCircle className="w-4 h-4 text-emerald-600" />
                  Conversas
                  {messages.length > 0 && (
                    <span className="ml-1 text-[10px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold px-1.5 py-0.2 rounded-full">
                      {messages.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="anotacoes" className="flex items-center gap-2 font-semibold">
                  <FileText className="w-4 h-4 text-amber-600" />
                  Anotações
                </TabsTrigger>
                <TabsTrigger value="timeline" className="flex items-center gap-2 font-semibold">
                  <History className="w-4 h-4 text-blue-600" />
                  Timeline
                </TabsTrigger>
              </TabsList>
            </div>

            {/* TAB 1: CONVERSAS WHATSAPP */}
            <TabsContent
              value="conversas"
              className="flex-1 flex flex-col min-h-0 h-full m-0 p-0 overflow-hidden bg-[#EFEAE2] dark:bg-[#0b141a] data-[state=inactive]:hidden"
            >
              <ErrorBoundary
                fallback={
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    Erro ao carregar mensagens desta conversa.
                  </div>
                }
              >
                <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 sm:px-8 sm:py-5">
                  <div className="space-y-4 max-w-4xl w-full mx-auto pb-4">
                    {loadingMessages ? (
                      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
                        <Loader2 className="w-7 h-7 animate-spin text-primary" />
                        <span className="text-xs">Carregando histórico do WhatsApp...</span>
                      </div>
                    ) : messages.length > 0 ? (
                      messages.map((msg, i) => {
                        const isTeam =
                          msg.sender_type === 'user' ||
                          msg.sender_type === 'ana' ||
                          msg.direction === 'outbound'
                        const isSystem = msg.sender_type === 'system'
                        const isAssistant =
                          msg.sender_type === 'catarina' || msg.sender_type === 'assistant'
                        const isAna = msg.sender_type === 'ana'
                        const isClient =
                          !isTeam &&
                          !isSystem &&
                          !isAssistant &&
                          (msg.sender_type === 'lead' ||
                            msg.sender_type === 'cliente' ||
                            msg.direction === 'inbound')

                        const senderLabel =
                          msg.sender_name ||
                          (isAssistant
                            ? 'Catarina (IA)'
                            : isAna
                              ? 'Equipe'
                              : isClient
                                ? lead.nome || 'Cliente'
                                : 'Equipe')

                        if (isSystem) {
                          return (
                            <div key={msg.id || i} className="flex justify-center my-3">
                              <div className="bg-background/90 backdrop-blur-sm text-muted-foreground rounded-lg p-2.5 text-xs max-w-[85%] border shadow-xs text-center">
                                <span className="text-[10px] font-bold uppercase tracking-wider block opacity-70 mb-0.5">
                                  {senderLabel}
                                </span>
                                <p className="whitespace-pre-wrap">
                                  {msg.content || msg.text || ''}
                                </p>
                                {msg.created_at && (
                                  <span className="text-[10px] opacity-60 block mt-1">
                                    {(() => {
                                      try {
                                        const d = new Date(msg.created_at)
                                        return isNaN(d.getTime())
                                          ? ''
                                          : format(d, 'dd/MM/yyyy HH:mm')
                                      } catch {
                                        return ''
                                      }
                                    })()}
                                  </span>
                                )}
                              </div>
                            </div>
                          )
                        }

                        return (
                          <div
                            key={msg.id || i}
                            className={cn(
                              'flex w-full',
                              isClient ? 'justify-start' : 'justify-end',
                            )}
                          >
                            <div
                              className={cn(
                                'max-w-[85%] sm:max-w-[78%] md:max-w-[72%] p-3.5 shadow-sm relative text-[13.5px] leading-relaxed whitespace-pre-wrap',
                                !isClient
                                  ? 'rounded-l-2xl rounded-br-sm rounded-tr-2xl bg-[#DCF8C6] dark:bg-[#005c4b] text-[#111b21] dark:text-[#e9edef]'
                                  : 'rounded-r-2xl rounded-bl-sm rounded-tl-2xl bg-white dark:bg-[#202c33] text-[#111b21] dark:text-[#e9edef] border border-black/5 dark:border-white/5',
                              )}
                            >
                              <div className="flex items-center gap-1.5 mb-1.5">
                                {isAssistant && (
                                  <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-300" />
                                )}
                                {isAna && <UserIcon className="w-3.5 h-3.5 opacity-70" />}
                                <span
                                  className={cn(
                                    'text-[11px] font-bold tracking-wide',
                                    isAssistant
                                      ? 'text-purple-700 dark:text-purple-300'
                                      : 'text-[#54656f] dark:text-[#8696a0]',
                                  )}
                                >
                                  {senderLabel}
                                </span>
                              </div>
                              <p className="break-words">
                                {msg.content || msg.text || msg.body || ''}
                              </p>
                              <span
                                className={cn(
                                  'text-[10px] block text-right mt-1.5 font-medium',
                                  'text-[#667781] dark:text-[#8696a0]',
                                )}
                              >
                                {(() => {
                                  if (!msg.created_at) return ''
                                  try {
                                    const d = new Date(msg.created_at)
                                    return isNaN(d.getTime())
                                      ? ''
                                      : format(d, 'HH:mm', { locale: ptBR })
                                  } catch {
                                    return ''
                                  }
                                })()}
                              </span>
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <div className="text-center py-16 text-muted-foreground text-sm bg-background/70 rounded-xl p-8 border shadow-xs max-w-lg mx-auto">
                        <MessageCircle className="w-10 h-10 mx-auto mb-3 opacity-40 text-primary" />
                        <p className="font-semibold text-foreground">
                          Nenhuma mensagem registrada no WhatsApp.
                        </p>
                        <p className="text-xs text-muted-foreground mt-1.5">
                          Você pode iniciar uma conversa enviando uma mensagem no campo abaixo.
                        </p>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </div>

                <div className="p-3 sm:p-4 bg-background border-t shrink-0 flex items-center gap-2">
                  <Input
                    placeholder="Digite uma mensagem para responder pelo WhatsApp..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                    disabled={sendingMessage}
                    className="flex-1 text-sm bg-muted/20 h-10"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sendingMessage}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 h-10 px-4 font-semibold"
                  >
                    {sendingMessage ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-1.5 sm:inline hidden" /> Enviar
                      </>
                    )}
                  </Button>
                </div>
              </ErrorBoundary>
            </TabsContent>

            {/* TAB 2: ANOTAÇÕES */}
            <TabsContent
              value="anotacoes"
              className="flex-1 flex flex-col min-h-0 h-full m-0 p-4 sm:p-6 overflow-y-auto bg-background data-[state=inactive]:hidden"
            >
              <div className="max-w-3xl w-full mx-auto space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Notas / Resumo da IA
                  </label>
                  <textarea
                    value={notasIa}
                    onChange={(e) => setNotasIa(e.target.value)}
                    rows={4}
                    placeholder="Resumo gerado pela IA ou observações gerais..."
                    className="w-full bg-yellow-50/40 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800/50 text-yellow-950 dark:text-yellow-100 rounded-lg p-3 text-sm outline-none focus:ring-1 focus:ring-yellow-400 placeholder:text-yellow-700/40 resize-y shadow-xs"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-500" /> Anotações Internas / Notas
                    Pessoais
                  </label>
                  <textarea
                    value={notasPessoaisClean}
                    onChange={(e) => setNotasPessoaisClean(e.target.value)}
                    rows={5}
                    placeholder="Anotações internas sobre o cliente, preferências, detalhes do projeto..."
                    className="w-full bg-blue-50/40 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/50 text-blue-950 dark:text-blue-100 rounded-lg p-3 text-sm outline-none focus:ring-1 focus:ring-blue-400 placeholder:text-blue-700/40 resize-y shadow-xs"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handleSaveNotas}
                    disabled={savingNotas}
                    className="bg-primary text-primary-foreground font-semibold"
                  >
                    {savingNotas ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Salvar Anotações
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* TAB 3: TIMELINE VERTICAL */}
            <TabsContent
              value="timeline"
              className="flex-1 flex flex-col min-h-0 h-full m-0 p-4 sm:p-6 overflow-y-auto bg-background data-[state=inactive]:hidden"
            >
              <ErrorBoundary
                fallback={
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    Erro ao carregar histórico da timeline.
                  </div>
                }
              >
                <div className="max-w-2xl w-full mx-auto">
                  <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                    <History className="w-4 h-4 text-primary" /> Histórico de Movimentações
                  </h3>

                  {loadingTimeline ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      <span className="text-xs">Carregando histórico...</span>
                    </div>
                  ) : timelineItems.length > 0 ? (
                    <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                      {timelineItems.map((item, idx) => (
                        <div key={item.id || idx} className="relative group">
                          <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-background border-2 border-primary flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-primary" />
                          </div>

                          <div className="bg-card border rounded-lg p-3.5 shadow-xs space-y-1 hover:border-primary/50 transition-colors">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <h4 className="font-semibold text-sm text-foreground">
                                {item.titulo}
                              </h4>
                              <span className="text-[11px] text-muted-foreground font-mono flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {(() => {
                                  if (!item.data) return ''
                                  try {
                                    const d = new Date(item.data)
                                    return isNaN(d.getTime())
                                      ? ''
                                      : format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                                  } catch {
                                    return ''
                                  }
                                })()}
                              </span>
                            </div>

                            <p className="text-xs text-foreground/85 leading-relaxed">
                              {item.descricao}
                            </p>

                            {item.duracao && (
                              <div className="text-[10px] text-muted-foreground pt-1 flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5 opacity-70" />
                                <span>
                                  Tempo neste estágio:{' '}
                                  <strong className="text-foreground">{item.duracao}</strong>
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground text-sm border rounded-lg p-6">
                      <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="font-medium">Nenhum evento registrado na timeline.</p>
                    </div>
                  )}
                </div>
              </ErrorBoundary>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </ErrorBoundary>
  )
}
