import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { fetchLeads, fetchUsers, updateLead, moveLeadToClient } from '@/services/comercial'
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

const MOCK_MESSAGES = [
  {
    id: 1,
    sender: 'ai',
    text: 'Olá! Sou a Catarina, assistente virtual da Bender Haussform. Como posso ajudar?',
    timestamp: '10:00',
  },
  {
    id: 2,
    sender: 'client',
    text: 'Gostaria de saber mais sobre projetos sob medida.',
    timestamp: '10:05',
  },
  {
    id: 3,
    sender: 'ai',
    text: 'Perfeito! Qual ambiente você gostaria de planejar?',
    timestamp: '10:06',
  },
  { id: 4, sender: 'client', text: 'Minha cozinha e talvez a sala de estar.', timestamp: '10:10' },
  {
    id: 5,
    sender: 'ai',
    text: 'Ótima escolha! Um dos nossos consultores entrará em contato em breve para entender melhor os detalhes.',
    timestamp: '10:11',
  },
]

export function ConversasView() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)

  const [tipoConversaFilter, setTipoConversaFilter] = useState('Todas')
  const [statusFilter, setStatusFilter] = useState('Todos')

  const [updating, setUpdating] = useState(false)

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
        setSelectedLead({ ...selectedLead, ...data })
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
                {MOCK_MESSAGES.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender === 'client' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 shadow-sm relative ${
                        msg.sender === 'client'
                          ? 'bg-[#dcf8c6] text-gray-800 rounded-tr-none'
                          : 'bg-white text-gray-800 rounded-tl-none'
                      }`}
                    >
                      <p className="text-sm leading-relaxed">{msg.text}</p>
                      <span className="text-[10px] text-gray-500 block text-right mt-1 font-medium">
                        {msg.timestamp}
                      </span>
                    </div>
                  </div>
                ))}
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
                  onChange={(e) => setSelectedLead({ ...selectedLead, categoria: e.target.value })}
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
                  onChange={(e) => setSelectedLead({ ...selectedLead, origem: e.target.value })}
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
