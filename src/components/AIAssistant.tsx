import { useEffect, useState, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Sparkles, MessageSquare, Send, X } from 'lucide-react'

import catarinaImg from '@/assets/catarina-6d3e7.png'
import zenaideImg from '@/assets/zenaide-fa35c.png'
import ottoImg from '@/assets/seu-otto-648df.png'
import edithImg from '@/assets/dona-edith-20a11.png'
import { Input } from './ui/input'

const CHARACTERS = {
  catarina: {
    name: 'Catarina',
    role: 'Comercial & Clientes',
    img: catarinaImg,
    theme: 'border-pink-500 shadow-pink-500/30',
  },
  edith: {
    name: 'Dona Edith',
    role: 'Financeiro',
    img: edithImg,
    theme: 'border-emerald-500 shadow-emerald-500/30',
  },
  otto: {
    name: 'Seu Otto',
    role: 'PCP & Análise Técnica',
    img: ottoImg,
    theme: 'border-blue-500 shadow-blue-500/30',
  },
  zenaide: {
    name: 'Zenaide',
    role: 'Compras & Estoque',
    img: zenaideImg,
    theme: 'border-purple-500 shadow-purple-500/30',
  },
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export function AIAssistant() {
  const location = useLocation()
  const [character, setCharacter] = useState<keyof typeof CHARACTERS | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [hasNewMessage, setHasNewMessage] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const path = location.pathname

    let newChar: keyof typeof CHARACTERS | null = null

    if (path.startsWith('/comercial') || path.startsWith('/clientes')) {
      newChar = 'catarina'
    } else if (path.startsWith('/financeiro')) {
      newChar = 'edith'
    } else if (
      path.startsWith('/analise-tecnica') ||
      path.startsWith('/dashboard') ||
      path.startsWith('/producao') ||
      path.startsWith('/montagem') ||
      path.startsWith('/pcp')
    ) {
      newChar = 'otto'
    } else if (path.startsWith('/estoque') || path.startsWith('/compras')) {
      newChar = 'zenaide'
    }

    if (character !== newChar) {
      setCharacter(newChar)
      setMessages([])
      setIsOpen(false) // Start closed by default
      setHasNewMessage(false)
    }
  }, [location.pathname, character])

  const fetchAIResponse = async (userMsg?: string) => {
    setIsLoading(true)
    try {
      const history = messages.length > 0 ? messages : undefined
      const isEdith = character === 'edith'

      let aiMessage = ''

      if (isEdith) {
        const today = new Date().toISOString().split('T')[0]
        const [{ data: pagar }, { data: receber }, { data: assinaturas }, { data: formularios }] =
          await Promise.all([
            supabase
              .from('contas_pagar')
              .select('fornecedor, valor, data_vencimento, descricao, categoria, status_pagamento')
              .eq('data_vencimento', today)
              .neq('status_pagamento', 'pago'),
            supabase
              .from('contas_receber')
              .select('cliente_id, valor, data_vencimento, descricao, categoria, status_pagamento')
              .eq('data_vencimento', today)
              .neq('status_pagamento', 'pago'),
            supabase
              .from('assinaturas')
              .select('id, documento_nome, signatario_nome, data_assinatura')
              .eq('status', 'assinado')
              .order('data_assinatura', { ascending: false })
              .limit(5),
            supabase
              .from('formulario_comercial')
              .select('id, cliente:clientes(nome), valor_total, pagamentos')
              .order('criado_em', { ascending: false })
              .limit(5),
          ])

        const { data } = await supabase.functions.invoke('financeiro-ai', {
          body: {
            action: 'command',
            payload: {
              text: userMsg,
              currentDate: today,
              history,
              context: {
                pagar,
                receber,
                assinaturasPendentes: assinaturas,
                contratosRecentes: formularios,
              },
            },
          },
        })

        aiMessage = data?.message || ''

        let aiMessageCleaned = aiMessage

        const processAction = async (actionData: any) => {
          const { data: userData } = await supabase.auth.getUser()
          if (actionData.acao === 'criar_pagamento') {
            const fornecedor = actionData.dados.credor_devedor || 'Desconhecido'
            const valor = actionData.dados.valor || 0
            const dataVenc = actionData.dados.data_vencimento || today

            const { data: existentes } = await supabase
              .from('contas_pagar')
              .select('id')
              .eq('fornecedor', fornecedor)
              .eq('valor', valor)
              .eq('data_vencimento', dataVenc)

            if (existentes && existentes.length > 0) {
              console.log('Lançamento ignorado por duplicidade (pagamento)')
              return
            }

            await supabase.from('contas_pagar').insert({
              user_id: userData.user?.id,
              fornecedor: actionData.dados.credor_devedor || 'Desconhecido',
              valor: actionData.dados.valor || 0,
              data_vencimento: actionData.dados.data_vencimento || today,
              descricao: actionData.dados.descricao,
              categoria: actionData.dados.categoria,
              meio_pagamento: actionData.dados.meio_pagamento,
              antecipado: actionData.dados.antecipado || false,
            })
            window.dispatchEvent(new Event('financeiro-refresh'))
          } else if (actionData.acao === 'criar_recebimento') {
            let clienteId = null
            if (actionData.dados.credor_devedor) {
              const { data: clientes } = await supabase
                .from('clientes')
                .select('id')
                .ilike('nome', `%${actionData.dados.credor_devedor}%`)
                .limit(1)
                .maybeSingle()
              if (clientes) clienteId = clientes.id
            }

            const valor = actionData.dados.valor || 0
            const dataVenc = actionData.dados.data_vencimento || today

            let query = supabase
              .from('contas_receber')
              .select('id')
              .eq('valor', valor)
              .eq('data_vencimento', dataVenc)

            if (clienteId) {
              query = query.eq('cliente_id', clienteId)
            }

            const { data: existentes } = await query

            if (existentes && existentes.length > 0) {
              console.log('Lançamento ignorado por duplicidade (recebimento)')
              return
            }

            await supabase.from('contas_receber').insert({
              user_id: userData.user?.id,
              cliente_id: clienteId,
              descricao:
                actionData.dados.descricao || `Recebimento de ${actionData.dados.credor_devedor}`,
              valor: actionData.dados.valor || 0,
              data_vencimento: actionData.dados.data_vencimento || today,
              categoria: actionData.dados.categoria,
              meio_pagamento: actionData.dados.meio_pagamento,
              antecipado: actionData.dados.antecipado || false,
              numero_parcela: '1/1',
            })
            window.dispatchEvent(new Event('financeiro-refresh'))
          }
        }

        const jsonRegex = /```json\n([\s\S]*?)\n```/g
        let match
        while ((match = jsonRegex.exec(aiMessage)) !== null) {
          try {
            const parsed = JSON.parse(match[1])
            if (parsed.acoes && Array.isArray(parsed.acoes)) {
              for (const act of parsed.acoes) {
                await processAction(act)
              }
            } else if (parsed.acao) {
              await processAction(parsed)
            }
          } catch (e) {
            console.error('Failed to parse JSON', e)
          }
        }
        aiMessageCleaned = aiMessageCleaned.replace(/```json\n[\s\S]*?\n```/g, '').trim()

        const strayJsonMatch = aiMessageCleaned.match(/({[\s\S]*"acao(es)?"[\s\S]*})/)
        if (strayJsonMatch) {
          try {
            const parsed = JSON.parse(strayJsonMatch[1])
            if (parsed.acoes && Array.isArray(parsed.acoes)) {
              for (const act of parsed.acoes) {
                await processAction(act)
              }
            } else if (parsed.acao) {
              await processAction(parsed)
            }
            aiMessageCleaned = aiMessageCleaned.replace(strayJsonMatch[1], '').trim()
          } catch {
            /* intentionally ignored */
          }
        }

        aiMessage = aiMessageCleaned
      } else {
        const { data } = await supabase.functions.invoke('assistant-intelligence', {
          body: {
            character: CHARACTERS[character!].name,
            moduleName: CHARACTERS[character!].role,
            contextData: {
              path: location.pathname,
              dreContext: {
                regimeCompetencia:
                  'Receitas e despesas contadas no mês a que pertencem pela data de vencimento ou realização do serviço.',
                regimeCaixa:
                  'Conta pelo que efetivamente entrou ou saiu da conta bancária (data de quitação/pagamento).',
                calculoDRE:
                  'Calculado por natureza contábil (receita, imposto, custo direto/CPV, despesa operacional, resultado financeiro), rateio por projeto e plano de contas.',
              },
            },
            userMessage: userMsg,
            chatHistory: history,
          },
        })
        aiMessage = data?.message || ''
      }

      if (aiMessage) {
        setMessages((prev) => [...prev, { role: 'assistant', content: aiMessage.trim() }])
        setHasNewMessage(!isOpen)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (character && messages.length === 0 && !isLoading) {
      fetchAIResponse()
    }
  }, [character, messages.length])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isOpen, isLoading])

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!inputValue.trim() || isLoading) return
    const newMsg = inputValue.trim()
    setInputValue('')
    setMessages((prev) => [...prev, { role: 'user', content: newMsg }])
    await fetchAIResponse(newMsg)
  }

  const toggleAssistant = () => {
    setIsOpen(!isOpen)
    if (!isOpen) {
      setHasNewMessage(false)
    }
  }

  if (!character) return null

  const charData = CHARACTERS[character]

  return (
    <>
      {isOpen && (
        <div className="fixed bottom-24 right-4 z-[100] w-[calc(100%-2rem)] md:w-[380px] bg-white rounded-2xl shadow-xl border border-gray-100 flex flex-col overflow-hidden animate-fade-in-up origin-bottom-right">
          <div className="flex items-center justify-between p-3 border-b bg-gray-50/50">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-500" />
              <h4 className="font-semibold text-sm text-gray-800">{charData.name}</h4>
            </div>
            <button
              onClick={toggleAssistant}
              className="text-gray-400 hover:text-gray-600 transition-colors rounded-full p-1 hover:bg-gray-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div
            ref={scrollRef}
            className="p-3 max-h-[350px] overflow-y-auto flex flex-col gap-3 min-h-[80px]"
          >
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  'text-sm p-2.5 rounded-xl max-w-[85%] leading-relaxed',
                  m.role === 'user'
                    ? 'bg-blue-600 text-white self-end rounded-br-sm'
                    : 'bg-gray-100 text-gray-800 self-start rounded-bl-sm',
                )}
              >
                {m.content}
              </div>
            ))}
            {isLoading && (
              <div className="bg-gray-100 text-gray-800 self-start rounded-xl p-3 rounded-bl-sm flex gap-1 items-center h-9">
                <span
                  className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
                  style={{ animationDelay: '0ms' }}
                />
                <span
                  className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
                  style={{ animationDelay: '150ms' }}
                />
                <span
                  className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
                  style={{ animationDelay: '300ms' }}
                />
              </div>
            )}
          </div>

          <form
            onSubmit={handleSend}
            className="p-2 border-t flex gap-2 items-center bg-[hsl(240_4%_16%)] shrink-0"
          >
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={`Fale com ${charData.name}...`}
              className="h-9 text-sm text-white placeholder:text-gray-400 focus-visible:ring-1 border-gray-200 bg-[hsl(240_4%_16%)]"
            />
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="p-2 bg-blue-600 text-white rounded-md disabled:opacity-50 hover:bg-blue-700 transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      <div className="fixed bottom-4 right-4 z-50 flex items-end justify-center group">
        <button
          onClick={toggleAssistant}
          className="relative transition-transform hover:scale-105 active:scale-95 flex items-end justify-center"
        >
          <img
            src={charData.img}
            alt={charData.name}
            className={cn(
              'w-auto object-contain drop-shadow-xl origin-bottom transition-all max-h-[120px] xl:max-h-[140px] 2xl:max-h-[160px]',
              isOpen
                ? 'translate-y-0 opacity-100'
                : 'translate-y-2 opacity-90 hover:opacity-100 hover:translate-y-0',
            )}
          />
          {hasNewMessage && !isOpen && (
            <div className="absolute top-0 right-0 flex items-center justify-center h-6 w-6 bg-red-500 rounded-full border-2 border-white animate-bounce text-white z-10 shadow-md">
              <MessageSquare className="h-3 w-3" fill="currentColor" />
            </div>
          )}
        </button>
      </div>
    </>
  )
}
