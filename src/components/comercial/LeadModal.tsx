import { useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { Lead } from '@/types'
import { gerarDocumentoCliente } from '@/services/gerar-documento-cliente'
import { MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Props {
  lead: Lead | null
  users: any[]
  onClose: () => void
  onSave: (data: any) => void
}

export function LeadModal({ lead, users, onClose, onSave }: Props) {
  const [isGenerating, setIsGenerating] = useState(false)

  const formatPhone = (value: string) => {
    if (!value) return ''
    let v = value.replace(/\D/g, '')

    if (v.startsWith('55') && v.length > 11) {
      if (v.length > 13) v = v.slice(0, 13)
      if (v.length <= 4) return `+${v.slice(0, 2)} (${v.slice(2)}`
      if (v.length <= 9) return `+${v.slice(0, 2)} (${v.slice(2, 4)}) ${v.slice(4)}`
      return `+${v.slice(0, 2)} (${v.slice(2, 4)}) ${v.slice(4, 9)}-${v.slice(9)}`
    } else {
      if (v.length > 11) v = v.slice(0, 11)
      if (v.length <= 2) return v.length > 0 ? `(${v}` : v
      if (v.length <= 6) return `(${v.slice(0, 2)}) ${v.slice(2)}`
      if (v.length <= 10) return `(${v.slice(0, 2)}) ${v.slice(2, 6)}-${v.slice(6)}`
      return `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`
    }
  }

  const [telefone, setTelefone] = useState(formatPhone(lead?.telefone || ''))
  const [nome, setNome] = useState(lead?.nome || '')

  useEffect(() => {
    setTelefone(formatPhone(lead?.telefone || ''))
    setNome(lead?.nome || '')
  }, [lead])

  const handleNomeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const exceptions = ['de', 'da', 'do', 'das', 'dos', 'e']
    const formatted = e.target.value
      .split(' ')
      .map((word, index) => {
        if (word.length === 0) return word
        const lowerWord = word.toLowerCase()
        if (exceptions.includes(lowerWord) && index !== 0) {
          return lowerWord
        }
        return lowerWord.charAt(0).toUpperCase() + lowerWord.slice(1)
      })
      .join(' ')
    setNome(formatted)
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTelefone(formatPhone(e.target.value))
  }

  const handleGerarDossie = async () => {
    setIsGenerating(true)
    toast.info('Iniciando geração do dossiê... Preparando 7 templates.')
    toast.loading('Processando em paralelo...', { id: 'gerar-dossie' })

    const clienteNome = lead?.nome || 'Cliente Desconhecido'
    const vendedorNome = users.find((u) => u.id === lead?.consultor_id)?.nome || 'Não informado'

    try {
      const { data, error } = await gerarDocumentoCliente({
        cliente_id: clienteNome,
        dados_formulario: {
          Cliente: clienteNome,
          'Valor total': 'A Definir',
          'Nome de quem vendeu': vendedorNome,
        },
      })

      if (error) {
        throw new Error(error.message || 'Erro desconhecido')
      }

      toast.success('Dossiê completo! 7/7 templates gerados. Baixe na Área de Clientes.', {
        id: 'gerar-dossie',
      })
    } catch (error: any) {
      toast.error(`Falha na geração: ${error.message}`, { id: 'gerar-dossie' })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const data = Object.fromEntries(fd.entries())
    if (!data.consultor_id) data.consultor_id = null

    let phoneStr = (data.telefone as string).replace(/\D/g, '')
    if (phoneStr.length === 10) {
      phoneStr = '55' + phoneStr.slice(0, 2) + '9' + phoneStr.slice(2)
    } else if (phoneStr.length === 11) {
      phoneStr = '55' + phoneStr
    } else if (phoneStr.length === 12 && phoneStr.startsWith('55')) {
      phoneStr = '55' + phoneStr.slice(2, 4) + '9' + phoneStr.slice(4)
    }
    data.telefone = phoneStr

    onSave(data)
  }

  const parsedChat = useMemo(() => {
    const rawNotas = lead?.notas || ''
    const lines = rawNotas.split('\n')
    const chat = []
    let currentMsg: any = null

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue

      if (trimmed.startsWith('[Cliente]:')) {
        if (currentMsg) chat.push(currentMsg)
        currentMsg = { sender: 'Cliente', text: trimmed.replace('[Cliente]:', '').trim() }
      } else if (trimmed.startsWith('[Catarina]:')) {
        if (currentMsg) chat.push(currentMsg)
        currentMsg = { sender: 'Catarina', text: trimmed.replace('[Catarina]:', '').trim() }
      } else if (trimmed.startsWith('[Ana]:')) {
        if (currentMsg) chat.push(currentMsg)
        currentMsg = { sender: 'Ana', text: trimmed.replace('[Ana]:', '').trim() }
      } else if (trimmed.startsWith('[Novo Dado')) {
        if (currentMsg) chat.push(currentMsg)
        currentMsg = { sender: 'Sistema', text: trimmed }
      } else {
        if (currentMsg) {
          currentMsg.text += '\n' + trimmed
        } else {
          currentMsg = { sender: 'Sistema', text: trimmed }
        }
      }
    }
    if (currentMsg) chat.push(currentMsg)
    return chat
  }, [lead?.notas])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-midnight-navy opacity-60 transition-opacity"
        onClick={onClose}
      ></div>
      <div className="bg-off-white rounded-lg p-6 max-w-5xl w-full relative z-10 border-t-4 border-dark-denim max-h-[95vh] flex flex-col shadow-xl animate-fade-in-up">
        <h2 className="text-midnight-navy font-bold text-[24px] mb-6 shrink-0">
          {lead ? 'Detalhes do Lead' : 'Novo Lead'}
        </h2>

        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-0">
          {/* LADO ESQUERDO - FORMULÁRIO */}
          <div className="overflow-y-auto pr-2 scrollbar-thin">
            <form id="lead-form" onSubmit={handleSubmit} className="flex flex-col gap-5 pb-6">
              <div>
                <label className="block text-midnight-navy font-semibold text-[14px] mb-1.5">
                  Nome Completo *
                </label>
                <input
                  required
                  name="nome"
                  value={nome}
                  onChange={handleNomeChange}
                  className="w-full bg-pale-cornflower border-2 border-steel-blue text-midnight-navy rounded-lg px-4 py-3 min-h-[44px] outline-none focus:border-dark-denim focus:ring-1 focus:ring-dark-denim transition-all duration-200"
                />
              </div>
              <div>
                <label className="block text-midnight-navy font-semibold text-[14px] mb-1.5">
                  E-mail *
                </label>
                <input
                  required
                  type="email"
                  name="email"
                  defaultValue={lead?.email}
                  className="w-full bg-pale-cornflower border-2 border-steel-blue text-midnight-navy rounded-lg px-4 py-3 min-h-[44px] outline-none focus:border-dark-denim focus:ring-1 focus:ring-dark-denim transition-all duration-200"
                />
              </div>
              <div>
                <label className="block text-midnight-navy font-semibold text-[14px] mb-1.5">
                  Telefone *
                </label>
                <input
                  required
                  type="tel"
                  name="telefone"
                  value={telefone}
                  onChange={handlePhoneChange}
                  minLength={14}
                  maxLength={19}
                  placeholder="+55 (11) 99999-9999"
                  className="w-full bg-pale-cornflower border-2 border-steel-blue text-midnight-navy rounded-lg px-4 py-3 min-h-[44px] outline-none focus:border-dark-denim focus:ring-1 focus:ring-dark-denim transition-all duration-200"
                />
              </div>
              <div>
                <label className="block text-midnight-navy font-semibold text-[14px] mb-1.5">
                  Categoria *
                </label>
                <select
                  required
                  name="categoria"
                  defaultValue={(lead as any)?.categoria || 'Comercial'}
                  className="w-full bg-pale-cornflower border-2 border-steel-blue text-midnight-navy rounded-lg px-4 py-3 min-h-[44px] outline-none focus:border-dark-denim focus:ring-1 focus:ring-dark-denim transition-all duration-200 cursor-pointer"
                >
                  <option value="Comercial">Comercial</option>
                  <option value="Corretor(a)">Corretor(a)</option>
                  <option value="Já é cliente">Já é cliente</option>
                  <option value="Fornecedor">Fornecedor</option>
                  <option value="Assistência">Assistência</option>
                  <option value="Currículos">Currículos</option>
                  <option value="Arquiteto Externo">Arquiteto Externo</option>
                  <option value="Outros Assuntos">Outros Assuntos</option>
                  <option value="Parceiro">Parceiro</option>
                  <option value="Equipe">Equipe</option>
                </select>
              </div>
              <div>
                <label className="block text-midnight-navy font-semibold text-[14px] mb-1.5">
                  Tipo de Conversa
                </label>
                <Select name="tipo_conversa" defaultValue={lead?.tipo_conversa || undefined}>
                  <SelectTrigger className="w-full bg-pale-cornflower border-2 border-steel-blue text-midnight-navy rounded-lg px-4 py-3 min-h-[44px] outline-none focus:border-dark-denim focus:ring-1 focus:ring-dark-denim transition-all duration-200">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Lead Comercial">Lead Comercial</SelectItem>
                    <SelectItem value="RH">RH</SelectItem>
                    <SelectItem value="Fornecedor">Fornecedor</SelectItem>
                    <SelectItem value="Suporte Interno">Suporte Interno</SelectItem>
                    <SelectItem value="Atendimento">Atendimento</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-midnight-navy font-semibold text-[14px] mb-1.5">
                  Origem *
                </label>
                <select
                  required
                  name="origem"
                  defaultValue={lead?.origem || 'Instagram'}
                  className="w-full bg-pale-cornflower border-2 border-steel-blue text-midnight-navy rounded-lg px-4 py-3 min-h-[44px] outline-none focus:border-dark-denim focus:ring-1 focus:ring-dark-denim transition-all duration-200 cursor-pointer"
                >
                  <option value="Instagram">Instagram</option>
                  <option value="Google">Google</option>
                  <option value="Facebook">Facebook</option>
                  <option value="Parceiros">Parceiros</option>
                  <option value="Corretor">Corretor</option>
                  <option value="Arquiteto">Arquiteto</option>
                  <option value="Outdoor">Outdoor</option>
                  <option value="Recompra">Recompra</option>
                  <option value="Indicação">Indicação</option>
                  <option value="Porta">Porta</option>
                </select>
              </div>
              <div>
                <label className="block text-midnight-navy font-semibold text-[14px] mb-1.5">
                  Consultor Responsável
                </label>
                <select
                  name="consultor_id"
                  defaultValue={lead?.consultor_id || ''}
                  className="w-full bg-pale-cornflower border-2 border-steel-blue text-midnight-navy rounded-lg px-4 py-3 min-h-[44px] outline-none focus:border-dark-denim focus:ring-1 focus:ring-dark-denim transition-all duration-200 cursor-pointer"
                >
                  <option value="">Selecione...</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-midnight-navy font-semibold text-[14px] mb-1.5">
                  Notas Pessoais
                </label>
                <textarea
                  name="notas_pessoais"
                  defaultValue={(lead as any)?.notas_pessoais || ''}
                  rows={4}
                  className="w-full bg-pale-cornflower border-2 border-steel-blue text-midnight-navy rounded-lg px-4 py-3 outline-none focus:border-dark-denim focus:ring-1 focus:ring-dark-denim transition-all duration-200 resize-none"
                  placeholder="Anotações internas sobre o lead..."
                ></textarea>
              </div>
            </form>
          </div>

          {/* LADO DIREITO - CHAT CATARINA */}
          <div className="flex flex-col bg-pale-cornflower/30 border-2 border-steel-blue/30 rounded-lg overflow-hidden h-[400px] lg:h-auto">
            <div className="bg-steel-blue/10 p-3 border-b border-steel-blue/20 shrink-0 flex items-center justify-between">
              <h3 className="font-bold text-midnight-navy text-[14px] flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-dark-denim" />
                Conversa WhatsApp
              </h3>
              {lead && (
                <span className="text-[11px] font-bold text-steel-blue uppercase tracking-wider">
                  {lead.origem}
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 scrollbar-thin bg-off-white/50">
              {parsedChat.length > 0 ? (
                parsedChat.map((msg, i) => (
                  <div
                    key={i}
                    className={cn(
                      'p-3 rounded-lg max-w-[85%] shadow-sm',
                      msg.sender === 'Cliente'
                        ? 'bg-dark-denim text-off-white self-end rounded-tr-none'
                        : msg.sender === 'Sistema'
                          ? 'bg-amber-100/50 text-amber-900 border border-amber-200 text-[11px] self-center w-full text-center shadow-none'
                          : 'bg-pale-cornflower border border-steel-blue/30 text-midnight-navy self-start rounded-tl-none',
                    )}
                  >
                    <span
                      className={cn(
                        'text-[10px] font-bold block mb-1 opacity-70 uppercase tracking-wider',
                        msg.sender === 'Sistema' && 'hidden',
                      )}
                    >
                      {msg.sender}
                    </span>
                    <span className="text-[13px] whitespace-pre-wrap leading-relaxed">
                      {msg.text}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-steel-blue flex flex-col items-center justify-center h-full opacity-60">
                  <MessageSquare className="w-8 h-8 mb-2" />
                  <span className="text-[13px] font-medium">Nenhuma conversa registrada.</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="flex justify-end gap-4 mt-6 pt-4 border-t border-steel-blue/20 shrink-0">
          {lead && (
            <button
              type="button"
              onClick={handleGerarDossie}
              disabled={isGenerating}
              className="bg-green-600 text-off-white px-6 py-3 rounded-lg hover:bg-green-700 min-h-[44px] font-medium transition-colors duration-200 disabled:opacity-50"
            >
              {isGenerating ? 'Gerando...' : 'Gerar Dossiê'}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="bg-pale-cornflower text-midnight-navy border-2 border-steel-blue px-6 py-3 rounded-lg hover:bg-steel-blue hover:text-off-white min-h-[44px] font-bold transition-colors duration-200"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="lead-form"
            className="bg-dark-denim text-off-white px-8 py-3 rounded-lg hover:opacity-90 min-h-[44px] font-bold transition-opacity duration-200 shadow-md"
          >
            Salvar Alterações
          </button>
        </div>
      </div>
    </div>
  )
}
