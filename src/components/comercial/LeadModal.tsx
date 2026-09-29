import { useState, useEffect } from 'react'
import { Lead } from '@/types'
import { fetchLeadMessages } from '@/services/comercial'
import { findExistingClient } from '@/services/vendas'
import { useDebounce } from '@/hooks/use-debounce'
import { MessageSquare, AlertTriangle } from 'lucide-react'
import { ORIGENS_LEAD, exigeNomePessoa, getRotuloNomePessoa, isOrigemCorretor } from './constants'
import { cn } from '@/lib/utils'
import { formatConsultorOptionLabel } from '@/lib/consultor-utils'

interface Props {
  lead: Lead | null
  users: any[]
  onClose: () => void
  onSave: (data: any) => void
}

export function LeadModal({ lead, users, onClose, onSave }: Props) {
  const [messages, setMessages] = useState<any[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)

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
  const [email, setEmail] = useState(lead?.email || '')
  const [origem, setOrigem] = useState(lead?.origem || 'A definir')
  const [origemPessoa, setOrigemPessoa] = useState(lead?.origem_pessoa || '')

  const debouncedEmail = useDebounce(email, 400)
  const debouncedPhone = useDebounce(telefone, 400)

  useEffect(() => {
    setTelefone(formatPhone(lead?.telefone || ''))
    setNome(lead?.nome || '')
    setEmail(lead?.email || '')
    setOrigem(lead?.origem || 'A definir')
    setOrigemPessoa(lead?.origem_pessoa || '')
    setDuplicateWarning(null)
  }, [lead])

  // Real-time duplicate client search (email or phone) — never blocks
  useEffect(() => {
    const emailClean = (debouncedEmail || '').trim().toLowerCase()
    const phoneDigits = (debouncedPhone || '').replace(/\D/g, '')
    if (!emailClean && phoneDigits.length < 10) {
      setDuplicateWarning(null)
      return
    }

    let cancelled = false
    const run = async () => {
      const existing = await findExistingClient({
        email: emailClean,
        phone: phoneDigits,
      })
      if (cancelled) return
      if (existing && existing.id !== (lead as any)?.cliente_id) {
        setDuplicateWarning(existing.nome)
      } else {
        setDuplicateWarning(null)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [debouncedEmail, debouncedPhone, lead])

  useEffect(() => {
    if (lead?.id) {
      const loadMessages = async () => {
        setLoadingMessages(true)
        try {
          const data = await fetchLeadMessages(lead.id, lead.telefone)
          setMessages(data || [])
        } catch (error) {
          console.error(error)
        } finally {
          setLoadingMessages(false)
        }
      }
      loadMessages()
    } else {
      setMessages([])
    }
  }, [lead?.id, lead?.telefone])

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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const data = Object.fromEntries(fd.entries()) as any
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

    data.origem = origem
    if (exigeNomePessoa(origem)) {
      data.origem_pessoa = (origemPessoa || '').trim() || null
    } else {
      data.origem_pessoa = null
    }

    onSave(data)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>
      <div className="bg-background rounded-lg p-6 max-w-5xl w-full relative z-10 border max-h-[95vh] flex flex-col shadow-xl animate-fade-in-up">
        <h2 className="text-foreground font-bold text-[24px] mb-6 shrink-0">
          {lead ? 'Detalhes do Lead' : 'Novo Lead'}
        </h2>

        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-0">
          <div className="overflow-y-auto pr-2 scrollbar-thin">
            <form id="lead-form" onSubmit={handleSubmit} className="flex flex-col gap-5 pb-6">
              {duplicateWarning && (
                <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700/50 text-amber-900 dark:text-amber-100 rounded-lg px-4 py-3 text-[13px] font-medium shadow-sm animate-fade-in">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                  <span>
                    Cliente já cadastrado: <strong>{duplicateWarning}</strong>. Nova venda?
                    Continuar?
                  </span>
                </div>
              )}

              <div>
                <label className="block text-foreground font-semibold text-[14px] mb-1.5">
                  Nome Completo *
                </label>
                <input
                  required
                  name="nome"
                  value={nome}
                  onChange={handleNomeChange}
                  className="w-full bg-background border border-input text-foreground rounded-lg px-4 py-3 min-h-[44px] outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-200"
                />
              </div>
              <div>
                <label className="block text-foreground font-semibold text-[14px] mb-1.5">
                  E-mail{' '}
                  <span className="text-muted-foreground font-normal text-[12px]">(opcional)</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-background border border-input text-foreground rounded-lg px-4 py-3 min-h-[44px] outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-200"
                />
              </div>
              <div>
                <label className="block text-foreground font-semibold text-[14px] mb-1.5">
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
                  className="w-full bg-background border border-input text-foreground rounded-lg px-4 py-3 min-h-[44px] outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-200"
                />
              </div>
              <div>
                <label className="block text-foreground font-semibold text-[14px] mb-1.5">
                  Categoria *
                </label>
                <select
                  required
                  name="categoria"
                  defaultValue={(lead as any)?.categoria || 'Comercial'}
                  className="w-full bg-background border border-input text-foreground rounded-lg px-4 py-3 min-h-[44px] outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-200 cursor-pointer"
                >
                  <option value="Comercial">Comercial</option>
                  <option value="Já é Cliente">Já é Cliente</option>
                  <option value="Fornecedor">Fornecedor</option>
                  <option value="Assistência">Assistência</option>
                  <option value="Currículo">Currículo</option>
                  <option value="Arquiteto Externo">Arquiteto Externo</option>
                  <option value="Parceiro">Parceiro</option>
                  <option value="Equipe">Equipe</option>
                  <option value="Outros Assuntos">Outros Assuntos</option>
                </select>
              </div>
              <div>
                <label className="block text-foreground font-semibold text-[14px] mb-1.5">
                  Origem *
                </label>
                <select
                  required
                  name="origem"
                  value={origem}
                  onChange={(e) => setOrigem(e.target.value)}
                  className="w-full bg-background border border-input text-foreground rounded-lg px-4 py-3 min-h-[44px] outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-200 cursor-pointer"
                >
                  {ORIGENS_LEAD.map((orig) => (
                    <option key={orig} value={orig}>
                      {orig}
                    </option>
                  ))}
                  {/* Se o lead tiver uma origem antiga que não está na lista oficial (ex: Cadastro Direto), manter como opção para não perder */}
                  {lead?.origem && !(ORIGENS_LEAD as readonly string[]).includes(lead.origem) && (
                    <option value={lead.origem}>{lead.origem}</option>
                  )}
                </select>
              </div>

              {exigeNomePessoa(origem) && (
                <div>
                  <label className="block text-foreground font-semibold text-[14px] mb-1.5">
                    {isOrigemCorretor(origem)
                      ? 'Indicado por: (Nome do Corretor)'
                      : `${getRotuloNomePessoa(origem)} *`}
                  </label>
                  <input
                    required
                    type="text"
                    name="origem_pessoa"
                    value={origemPessoa}
                    onChange={(e) => setOrigemPessoa(e.target.value)}
                    placeholder={
                      isOrigemCorretor(origem)
                        ? 'Nome do corretor (ex: Carlos Andrade)'
                        : getRotuloNomePessoa(origem)
                    }
                    className="w-full bg-background border border-input text-foreground rounded-lg px-4 py-3 min-h-[44px] outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-200"
                  />
                </div>
              )}
              <div>
                <label className="block text-foreground font-semibold text-[14px] mb-1.5">
                  Consultor Responsável
                </label>
                <select
                  name="consultor_id"
                  defaultValue={lead?.consultor_id || ''}
                  className="w-full bg-background border border-input text-foreground rounded-lg px-4 py-3 min-h-[44px] outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-200 cursor-pointer"
                >
                  <option value="">Selecione...</option>
                  {users
                    .filter((u) => {
                      if (!u || !u.id) return false
                      if (u.eh_consultor) return true
                      if (lead?.consultor_id && u.id === lead.consultor_id) return true
                      return false
                    })
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {formatConsultorOptionLabel(u)}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-foreground font-semibold text-[14px] mb-1.5">
                  Notas / Resumo da IA
                </label>
                <textarea
                  name="notas"
                  defaultValue={(lead as any)?.notas || ''}
                  rows={4}
                  className="w-full bg-yellow-50/50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800/50 text-yellow-950 dark:text-yellow-100 rounded-lg px-4 py-3 outline-none focus:border-yellow-400 dark:focus:border-yellow-600 focus:ring-1 focus:ring-yellow-400 transition-all duration-200 resize-none shadow-sm placeholder:text-yellow-700/40 dark:placeholder:text-yellow-200/30"
                  placeholder="Anotações ou resumo gerado pela IA..."
                ></textarea>
              </div>
              <div>
                <label className="block text-foreground font-semibold text-[14px] mb-1.5">
                  Notas Pessoais
                </label>
                <textarea
                  name="notas_pessoais"
                  defaultValue={(lead as any)?.notas_pessoais || ''}
                  rows={4}
                  className="w-full bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/50 text-blue-950 dark:text-blue-100 rounded-lg px-4 py-3 outline-none focus:border-blue-400 dark:focus:border-blue-600 focus:ring-1 focus:ring-blue-400 transition-all duration-200 resize-none shadow-sm placeholder:text-blue-700/40 dark:placeholder:text-blue-200/30"
                  placeholder="Anotações internas sobre o lead..."
                ></textarea>
              </div>
            </form>
          </div>

          <div className="flex flex-col bg-muted/5 border rounded-lg overflow-hidden h-[400px] lg:h-auto">
            <div className="bg-muted p-3 border-b shrink-0 flex items-center justify-between">
              <h3 className="font-bold text-foreground text-[14px] flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                Conversa WhatsApp
              </h3>
              {lead && (
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  {lead.origem}
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 scrollbar-thin bg-background/50">
              {loadingMessages ? (
                <div className="flex justify-center items-center h-full opacity-60 text-muted-foreground text-[13px] font-medium">
                  Carregando mensagens...
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
                    (msg.sender_type === 'cliente' ||
                      msg.sender_type === 'lead' ||
                      msg.direction === 'inbound')

                  const senderName =
                    msg.sender_name ||
                    (isAssistant
                      ? 'Catarina (IA)'
                      : isTeam
                        ? isAna
                          ? 'Equipe'
                          : 'Equipe'
                        : isClient
                          ? lead?.nome || 'Cliente'
                          : 'Sistema')

                  return (
                    <div
                      key={msg.id || i}
                      className={cn(
                        'p-3 max-w-[85%] shadow-sm relative text-[13px] leading-relaxed',
                        isClient
                          ? 'bg-secondary text-secondary-foreground border border-border self-start rounded-r-xl rounded-bl-sm rounded-tl-xl'
                          : isSystem
                            ? 'bg-muted text-muted-foreground border border-border text-[11px] self-center w-full text-center rounded-lg shadow-none'
                            : isTeam
                              ? 'bg-primary text-primary-foreground self-end rounded-l-xl rounded-br-sm rounded-tr-xl'
                              : isAssistant
                                ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-900 dark:text-purple-100 border border-purple-200 dark:border-purple-800 self-end rounded-l-xl rounded-br-sm rounded-tr-xl'
                                : 'bg-muted text-foreground self-end rounded-l-xl rounded-br-sm rounded-tr-xl border',
                      )}
                    >
                      <span
                        className={cn(
                          'text-[10px] font-bold block mb-1 uppercase tracking-wider',
                          isSystem && 'hidden',
                          isClient && 'text-secondary-foreground/70',
                          isTeam && 'text-primary-foreground/70',
                          isAssistant && 'opacity-70',
                        )}
                      >
                        {senderName}
                      </span>
                      <span className="whitespace-pre-wrap">
                        {msg.content || msg.text || msg.body || ''}
                      </span>
                    </div>
                  )
                })
              ) : (
                <div className="text-muted-foreground flex flex-col items-center justify-center h-full opacity-60">
                  <MessageSquare className="w-8 h-8 mb-2" />
                  <span className="text-[13px] font-medium">Nenhuma conversa registrada.</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4 mt-6 pt-4 border-t shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="bg-muted text-foreground border border-input px-6 py-3 rounded-lg hover:bg-accent hover:text-accent-foreground min-h-[44px] font-bold transition-colors duration-200"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="lead-form"
            className="bg-primary text-primary-foreground px-8 py-3 rounded-lg hover:bg-primary/90 min-h-[44px] font-bold transition-opacity duration-200 shadow-sm"
          >
            Salvar Alterações
          </button>
        </div>
      </div>
    </div>
  )
}
