import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { X, Sparkles, MessageSquare } from 'lucide-react'

import catarinaImg from '@/assets/catarina-6d3e7.png'
import zenaideImg from '@/assets/zenaide-fa35c.png'

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
    img: 'https://img.usecurling.com/ppl/thumbnail?gender=female&seed=2', // Placeholder
    theme: 'border-emerald-500 shadow-emerald-500/30',
  },
  otto: {
    name: 'Seu Otto',
    role: 'PCP & Análise Técnica',
    img: 'https://img.usecurling.com/ppl/thumbnail?gender=male&seed=3', // Placeholder
    theme: 'border-blue-500 shadow-blue-500/30',
  },
  zenaide: {
    name: 'Zenaide',
    role: 'Compras & Estoque',
    img: zenaideImg,
    theme: 'border-purple-500 shadow-purple-500/30',
  },
}

export function AIAssistant() {
  const location = useLocation()
  const [character, setCharacter] = useState<keyof typeof CHARACTERS | null>(null)
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [isHidden, setIsHidden] = useState(false)
  const [hasNewMessage, setHasNewMessage] = useState(true)

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

    setCharacter(newChar)
    setIsOpen(false)
    setMessage('')
    setIsHidden(false)
    setHasNewMessage(true)
  }, [location.pathname])

  useEffect(() => {
    if (!character || !isOpen || message) return

    async function fetchMessage() {
      setIsLoading(true)
      try {
        const { data, error } = await supabase.functions.invoke('assistant-intelligence', {
          body: {
            character: CHARACTERS[character!].name,
            moduleName: CHARACTERS[character!].role,
            contextData: { path: location.pathname },
          },
        })
        if (data?.message) {
          setMessage(data.message)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMessage()
  }, [character, isOpen, location.pathname, message])

  const toggleAssistant = () => {
    setIsOpen(!isOpen)
    if (!isOpen) {
      setHasNewMessage(false)
    }
  }

  if (!character || isHidden) return null

  const charData = CHARACTERS[character]

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-end justify-end">
      {isOpen && (
        <div className="animate-fade-in-up mb-4 mr-4 w-72 bg-white rounded-2xl p-4 shadow-xl border border-gray-100 relative">
          <button
            onClick={() => setIsOpen(false)}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors p-1"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-blue-500" />
            <h4 className="font-semibold text-sm text-gray-800">{charData.name}</h4>
          </div>

          {isLoading ? (
            <div className="flex gap-1 items-center h-10 px-2">
              <span
                className="w-2 h-2 rounded-full bg-blue-400 animate-bounce"
                style={{ animationDelay: '0ms' }}
              />
              <span
                className="w-2 h-2 rounded-full bg-blue-400 animate-bounce"
                style={{ animationDelay: '150ms' }}
              />
              <span
                className="w-2 h-2 rounded-full bg-blue-400 animate-bounce"
                style={{ animationDelay: '300ms' }}
              />
            </div>
          ) : (
            <p className="text-sm text-gray-600 leading-relaxed min-h-10">
              {message || 'Olá! Estou aqui para ajudar com qualquer dúvida nesta tela.'}
            </p>
          )}

          <div className="absolute -bottom-2 right-8 w-4 h-4 bg-white border-b border-r border-gray-100 transform rotate-45" />
        </div>
      )}

      <div className="relative">
        <button
          onClick={toggleAssistant}
          className={cn(
            'relative h-16 w-16 md:h-20 md:w-20 rounded-full overflow-hidden border-[3px] shadow-lg transition-transform hover:scale-105 active:scale-95 bg-white',
            isOpen ? charData.theme : 'border-gray-200',
          )}
        >
          <img
            src={charData.img}
            alt={charData.name}
            className="h-full w-full object-cover object-top bg-gradient-to-b from-slate-50 to-slate-100"
          />
        </button>

        {hasNewMessage && !isOpen && (
          <div className="absolute -top-1 -right-1 flex items-center justify-center h-6 w-6 bg-red-500 rounded-full border-2 border-white animate-bounce text-white">
            <MessageSquare className="h-3 w-3" fill="currentColor" />
          </div>
        )}

        {!isOpen && (
          <button
            onClick={() => setIsHidden(true)}
            className="absolute -top-1 -left-1 bg-gray-800 text-white rounded-full p-1 shadow hover:bg-gray-700 transition-colors z-10"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  )
}
