import { useEffect, useState, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { X, Sparkles, MessageSquare, Send } from 'lucide-react'

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
    } else if (path.startsWith('/analise-tecnica') || path.startsWith('/dashboard')) {
      newChar = 'otto'
    } else if (path.startsWith('/estoque') || path.startsWith('/compras')) {
      newChar = 'zenaide'
    }

    if (character !== newChar) {
      setCharacter(newChar)
      setMessages([])
      setIsOpen(false)
      setHasNewMessage(true)
    }
  }, [location.pathname, character])

  const fetchAIResponse = async (userMsg?: string) => {
    setIsLoading(true)
    try {
      const history = messages.length > 0 ? messages : undefined
      const { data, error } = await supabase.functions.invoke('assistant-intelligence', {
        body: {
          character: CHARACTERS[character!].name,
          moduleName: CHARACTERS[character!].role,
          contextData: { path: location.pathname },
          userMessage: userMsg,
          chatHistory: history,
        },
      })
      if (data?.message) {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.message }])
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
    <div className="fixed bottom-20 left-[calc(var(--sidebar-width,16rem)/2)] -translate-x-1/2 z-50 flex justify-center items-end pointer-events-none">
      <div className="relative pointer-events-auto">
        <button
          onClick={toggleAssistant}
          className="relative group transition-transform hover:scale-105 active:scale-95 flex items-end"
        >
          <img
            src={charData.img}
            alt={charData.name}
            className={cn(
              'h-[calc(90vh-380px)] min-h-[100px] max-h-[400px] w-auto object-contain drop-shadow-2xl origin-bottom pb-2 transition-all',
              isOpen ? 'scale-105' : '',
            )}
          />
          {hasNewMessage && !isOpen && (
            <div className="absolute top-6 right-2 flex items-center justify-center h-6 w-6 bg-red-500 rounded-full border-2 border-white animate-bounce text-white z-10">
              <MessageSquare className="h-3 w-3" fill="currentColor" />
            </div>
          )}
        </button>
      </div>

      {isOpen && (
        <div className="animate-fade-in-up absolute bottom-8 left-[calc(100%+0.5rem)] w-80 bg-white rounded-2xl shadow-xl border border-gray-100 flex flex-col overflow-hidden pointer-events-auto z-50">
          <div className="flex items-center justify-between p-3 border-b bg-gray-50/50">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-500" />
              <h4 className="font-semibold text-sm text-gray-800">{charData.name}</h4>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div
            ref={scrollRef}
            className="p-3 max-h-60 overflow-y-auto flex flex-col gap-3 min-h-[80px]"
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
            className="p-2 border-t flex gap-2 items-center bg-white shrink-0"
          >
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={`Fale com ${charData.name}...`}
              className="h-9 text-sm focus-visible:ring-1 border-gray-200"
            />
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="p-2 bg-blue-600 text-white rounded-md disabled:opacity-50 hover:bg-blue-700 transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>

          <div className="absolute top-[calc(100%-3rem)] -left-2 w-4 h-4 bg-white border-b border-l border-gray-100 transform rotate-45 hidden md:block" />
        </div>
      )}
    </div>
  )
}
