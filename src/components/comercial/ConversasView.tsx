import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import {
  fetchLeads,
  fetchUsers,
  updateLead,
  moveLeadToClient,
  fetchLeadMessages,
} from '@/services/comercial'
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
import { COLUMNS } from './constants'
import { Loader2 } from 'lucide-react'

interface Lead {
  id: string
  nome: string
  email: string
  telefone: string
  tipo_conversa: string | null
  status: string
  categoria: string
  origem: string
  consultor_id: string | null
  consultor?: { nome: string }
}

interface User {
  id: string
  nome: string
}

export function ConversasView() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)

  const [messages, setMessages] = useState<any[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)

  const [tipoConversaFilter, setTipoConversaFilter] = useState('Todas')
  const [statusFilter, setStatusFilter] = useState('Todos')

  const [updating, setUpdating] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadData()
    const channel = supabase
      .channel('conversas_leads_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        loadData()
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const loadData = async () => {
    try {
      const [leadsData, usersData] = await Promise.all([fetchLeads(), fetchUsers()])
      setLeads(leadsData as any)
      setUsers(usersData)
      setSelectedLead((current) => {
        if (!current) return null
        const updated = leadsData.find((l: any) => l.id === current.id)
        return updated ? (updated as any) : current
      })
    } catch (error) {
      console.error(error)
      toast.error('Erro ao carregar dados')
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
      console.error(error)
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

  const filteredLeads = leads.filter((l) => {
    if (tipoConversaFilter !== 'Todas' && l.tipo_conversa !== tipoConversaFilter) return false
    if (statusFilter !== 'Todos' && l.status !== statusFilter) return false
    return true
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

  return (
    <div className="flex h-full w-full bg-white">
      {/* LEFT PANEL - 30% */}
      <div className="w-[30%] border-r border-gray-200 flex flex-col bg-slate-50/50">
        <div className="p-4 border-b border-gray-200 bg-white">
          <h2 className="font-bold text-sm text-gray-500 mb-4 tracking-wider">CONVERSAS</h2>
          <div className="space-y-3">
            <Select value={tipoConversaFilter} onValueChange={setTipoConversaFilter}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Tipo de Conversa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todas">Todas as Conversas</SelectItem>
                <SelectItem value="Lead Comercial">Lead Comercial</SelectItem>
                <SelectItem value="RH">RH</SelectItem>
                <SelectItem value="Fornecedor">Fornecedor</SelectItem>
                <SelectItem value="Suporte Interno">Suporte Interno</SelectItem>
                <SelectItem value="Atendimento">Atendimento</SelectItem>
                <SelectItem value="Outro">Outro</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos os Status</SelectItem>
                <SelectItem value="Novo Lead">Novo Lead</SelectItem>
                <SelectItem value="Aguardando Consultor">Aguardando Consultor</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {filteredLeads.map((lead) => (
              <button
                key={lead.id}
                onClick={() => setSelectedLead(lead)}
                className={`w-full text-left p-3 rounded-md transition-colors ${
                  selectedLead?.id === lead.id
                    ? 'bg-blue-100 text-blue-900 shadow-sm border border-blue-200'
                    : 'hover:bg-white text-gray-700 hover:shadow-sm border border-transparent'
                }`}
              >
                <div className="font-medium truncate">{lead.nome}</div>
                <div className="text-xs mt-1 opacity-70 truncate">
                  {lead.tipo_conversa || 'Sem tipo'} • {lead.status}
                </div>
              </button>
            ))}
            {filteredLeads.length === 0 && (
              <div className="text-center p-4 text-gray-500 text-sm">Nenhum lead encontrado</div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* CENTRAL PANEL - 50% */}
      <div className="w-[50%] border-r border-gray-200 flex flex-col bg-[#e5ddd5]/30">
        {selectedLead ? (
          <>
            <div className="p-4 bg-white border-b border-gray-200 shadow-sm z-10 flex items-center gap-3">
              <div className="flex-1">
                <h3 className="font-bold text-gray-900">{selectedLead.nome}</h3>
                <div className="text-xs text-gray-500 font-medium">
                  Status: {selectedLead.status}
                </div>
              </div>
            </div>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4 max-w-2xl mx-auto pb-4">
                {loadingMessages ? (
                  <div className="flex justify-center items-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : messages.length > 0 ? (
                  (() => {
                    const parsedMessages: any[] = []
                    messages.forEach((msg, index) => {
                      const text = msg.content || msg.text || msg.body || ''
                      const lines = text.split('\n')
                      let currentMsg: any = null

                      const pushCurrent = () => {
                        if (currentMsg && currentMsg.content.trim()) {
                          parsedMessages.push(currentMsg)
                        }
                      }

                      lines.forEach((line: string, lineIndex: number) => {
                        const trimmedLine = line.trim()
                        if (trimmedLine.startsWith('[Cliente]:')) {
                          pushCurrent()
                          currentMsg = {
                            id: `${msg.id}-${index}-${lineIndex}`,
                            sender: 'Cliente',
                            content: trimmedLine.substring(10).trim(),
                            timestamp: msg.created_at,
                            align: 'right',
                            bgColor: 'bg-gray-800',
                            textColor: 'text-white',
                            isSystem: false,
                          }
                        } else if (trimmedLine.startsWith('[Catarina]:')) {
                          pushCurrent()
                          currentMsg = {
                            id: `${msg.id}-${index}-${lineIndex}`,
                            sender: 'Catarina',
                            content: trimmedLine.substring(11).trim(),
                            timestamp: msg.created_at,
                            align: 'left',
                            bgColor: 'bg-gray-200',
                            textColor: 'text-gray-800',
                            isSystem: false,
                          }
                        } else if (trimmedLine.startsWith('[Ana]:')) {
                          pushCurrent()
                          currentMsg = {
                            id: `${msg.id}-${index}-${lineIndex}`,
                            sender: 'Ana',
                            content: trimmedLine.substring(6).trim(),
                            timestamp: msg.created_at,
                            align: 'left',
                            bgColor: 'bg-gray-200',
                            textColor: 'text-gray-800',
                            isSystem: false,
                          }
                        } else {
                          if (currentMsg) {
                            currentMsg.content += '\n' + line
                          } else {
                            // Default parsing for messages without prefixes
                            const isClient =
                              msg.sender_type === 'lead' ||
                              (msg.direction === 'inbound' && msg.sender_type !== 'system')
                            const isSystem = msg.sender_type === 'system'
                            const isAssistant = msg.sender_type === 'assistant'

                            currentMsg = {
                              id: `${msg.id}-${index}-${lineIndex}`,
                              sender:
                                msg.sender_name ||
                                (isAssistant ? 'Catarina' : isClient ? 'Cliente' : 'Equipe'),
                              content: line,
                              timestamp: msg.created_at,
                              align: isSystem ? 'center' : isClient ? 'right' : 'left',
                              bgColor: isSystem
                                ? 'bg-gray-100'
                                : isClient
                                  ? 'bg-gray-800'
                                  : 'bg-gray-200',
                              textColor: isSystem
                                ? 'text-gray-600'
                                : isClient
                                  ? 'text-white'
                                  : 'text-gray-800',
                              isSystem,
                            }
                          }
                        }
                      })
                      pushCurrent()
                    })

                    const rendered = parsedMessages.map((msg) => {
                      if (msg.isSystem || msg.align === 'center') {
                        return (
                          <div key={msg.id} className="flex justify-center my-4">
                            <div className="bg-gray-100 text-gray-600 rounded-lg p-3 text-sm max-w-[90%] border border-gray-200 text-center">
                              <span className="text-[10px] font-bold text-gray-500 mb-1 block uppercase">
                                {msg.sender || 'Sistema'}
                              </span>
                              <p className="whitespace-pre-wrap">{msg.content}</p>
                              <span className="text-[10px] text-gray-400 mt-2 block">
                                {msg.timestamp
                                  ? new Date(msg.timestamp).toLocaleString('pt-BR')
                                  : ''}
                              </span>
                            </div>
                          </div>
                        )
                      }

                      return (
                        <div
                          key={msg.id}
                          className={`flex ${msg.align === 'right' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg p-3 shadow-sm relative ${msg.bgColor} ${msg.textColor} ${
                              msg.align === 'right' ? 'rounded-tr-none' : 'rounded-tl-none'
                            }`}
                          >
                            <span
                              className={`text-[10px] font-bold mb-1 block uppercase tracking-wider ${
                                msg.align === 'right' ? 'text-gray-300' : 'text-gray-500'
                              }`}
                            >
                              {msg.sender}
                            </span>
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">
                              {msg.content}
                            </p>
                            <span
                              className={`text-[10px] block text-right mt-1 font-medium ${
                                msg.align === 'right' ? 'text-gray-400' : 'text-gray-500'
                              }`}
                            >
                              {msg.timestamp
                                ? new Date(msg.timestamp).toLocaleTimeString('pt-BR', {
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
                  <div className="text-center p-4 text-gray-500 text-sm">
                    Nenhuma mensagem na conversa.
                  </div>
                )}
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            Selecione um lead para ver a conversa
          </div>
        )}
      </div>

      {/* RIGHT PANEL - 20% */}
      <div className="w-[20%] flex flex-col bg-slate-50/30">
        <div className="p-4 border-b border-gray-200 bg-white">
          <h2 className="font-bold text-sm text-gray-500 tracking-wider">DETALHES</h2>
        </div>

        {selectedLead ? (
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase">
                  Tipo de Conversa
                </label>
                <Select
                  disabled={updating}
                  value={selectedLead.tipo_conversa || 'unassigned'}
                  onValueChange={(val) => {
                    const newVal = val === 'unassigned' ? null : val
                    handleUpdateLead(selectedLead.id, { tipo_conversa: newVal })
                  }}
                >
                  <SelectTrigger className="h-9 bg-white">
                    <SelectValue placeholder="Selecione um tipo..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Sem classificação</SelectItem>
                    <SelectItem value="Lead Comercial">Lead Comercial</SelectItem>
                    <SelectItem value="RH">RH</SelectItem>
                    <SelectItem value="Fornecedor">Fornecedor</SelectItem>
                    <SelectItem value="Suporte Interno">Suporte Interno</SelectItem>
                    <SelectItem value="Atendimento">Atendimento</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase">Status</label>
                <Select
                  disabled={updating}
                  value={selectedLead.status}
                  onValueChange={(val) => handleUpdateLead(selectedLead.id, { status: val })}
                >
                  <SelectTrigger className="h-9 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COLUMNS.map((col) => (
                      <SelectItem key={col} value={col}>
                        {col}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase">Categoria</label>
                <Input
                  disabled={updating}
                  value={selectedLead.categoria || ''}
                  onChange={(e) =>
                    setSelectedLead((prev) =>
                      prev ? { ...prev, categoria: e.target.value } : null,
                    )
                  }
                  onBlur={(e) => {
                    if (e.target.value !== leads.find((l) => l.id === selectedLead.id)?.categoria) {
                      handleUpdateLead(selectedLead.id, { categoria: e.target.value })
                    }
                  }}
                  className="h-9 bg-white"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase">Origem</label>
                <Input
                  disabled={updating}
                  value={selectedLead.origem || ''}
                  onChange={(e) =>
                    setSelectedLead((prev) => (prev ? { ...prev, origem: e.target.value } : null))
                  }
                  onBlur={(e) => {
                    if (e.target.value !== leads.find((l) => l.id === selectedLead.id)?.origem) {
                      handleUpdateLead(selectedLead.id, { origem: e.target.value })
                    }
                  }}
                  className="h-9 bg-white"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase">Consultor</label>
                <Select
                  disabled={updating}
                  value={selectedLead.consultor_id || 'unassigned'}
                  onValueChange={(val) => {
                    const newVal = val === 'unassigned' ? null : val
                    handleUpdateLead(selectedLead.id, { consultor_id: newVal })
                  }}
                >
                  <SelectTrigger className="h-9 bg-white">
                    <SelectValue placeholder="Selecione um consultor..." />
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

              <div className="pt-4 border-t border-gray-200 space-y-3">
                <Button
                  disabled={updating}
                  variant="outline"
                  className="w-full justify-center bg-white"
                  onClick={() => {
                    if (!selectedLead.consultor_id) {
                      toast.error('Selecione um consultor primeiro')
                      return
                    }
                    handleUpdateLead(selectedLead.id, { status: 'Designar Consultor' })
                  }}
                >
                  Passar para Consultor
                </Button>

                <Button
                  disabled={updating}
                  variant="outline"
                  className="w-full justify-center bg-white"
                  onClick={() => toast.info('Funcionalidade de agendamento em desenvolvimento')}
                >
                  Agendar
                </Button>

                <Button
                  disabled={updating}
                  className="w-full justify-center bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={handleGerarDossie}
                >
                  Gerar Dossiê
                </Button>
              </div>
            </div>
          </ScrollArea>
        ) : (
          <div className="flex-1 flex p-4 text-sm text-center text-gray-400 items-center justify-center">
            Selecione um lead para ver os detalhes
          </div>
        )}
      </div>
    </div>
  )
}
