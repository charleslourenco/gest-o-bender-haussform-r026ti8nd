import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { notifySessionExpired } from '@/lib/supabase/auth-recovery'

interface AuthContextType {
  user: User | null
  session: Session | null
  permissions: Record<string, string>
  isAdmin: boolean
  signUp: (email: string, password: string, name: string) => Promise<{ error: any }>
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<{ error: any }>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [permissions, setPermissions] = useState<Record<string, string>>({})
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPermissions = async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from('matriz_permissoes')
          .select('modulo, nivel_acesso')
          .eq('usuario_id', userId)

        if (!error && data) {
          const perms: Record<string, string> = {}
          data.forEach((p) => {
            const modName = p.modulo === 'Área de Clientes' ? 'Clientes' : p.modulo

            const currentLevel = perms[modName]
            const newLevel = p.nivel_acesso

            const levels = { Admin: 4, Editor: 3, Leitor: 2, 'Sem Acesso': 1 }
            const currentScore = currentLevel ? levels[currentLevel as keyof typeof levels] || 0 : 0
            const newScore = levels[newLevel as keyof typeof levels] || 0

            if (newScore > currentScore) {
              perms[modName] = newLevel
            }
          })
          setPermissions(perms)
        }
      } catch (err) {
        console.error('Error fetching permissions', err)
      }
    }

    const fetchIsAdmin = async (userId: string) => {
      try {
        const { data, error } = await supabase.rpc('is_admin', { user_id: userId })
        if (!error) {
          setIsAdmin(data === true)
        } else {
          setIsAdmin(false)
        }
      } catch (err) {
        console.error('Error checking admin status', err)
        setIsAdmin(false)
      }
    }

    const handleSession = (sessionObj: Session | null) => {
      setSession(sessionObj)
      setUser(sessionObj?.user ?? null)

      if (sessionObj?.user) {
        Promise.all([fetchPermissions(sessionObj.user.id), fetchIsAdmin(sessionObj.user.id)]).then(
          () => {
            setLoading(false)
          },
        )
      } else {
        setPermissions({})
        setIsAdmin(false)
        setLoading(false)
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, sessionObj) => {
      // Sync only inside onAuthStateChange callback
      handleSession(sessionObj)
    })

    supabase.auth.getSession().then(({ data: { session: sessionObj } }) => {
      handleSession(sessionObj)
    })

    // Listener para visibilitychange e focus:
    // Ao voltar para a aba ou janela após hibernação/troca de abas,
    // verifica se a sessão expirou ou está perto de expirar (< 60s).
    // Se necessário, renova o token via supabase.auth.refreshSession()
    // e emite 'auth_session_restored' ou 'auth_session_expired'.
    let isRefreshing = false
    let lastCheckTime = Date.now()

    const checkAndRefreshSessionOnWake = async () => {
      // Não executar se estiver em background
      if (typeof document !== 'undefined' && document.hidden) return

      // Evita disparos múltiplos muito rápidos (< 2s)
      const now = Date.now()
      if (now - lastCheckTime < 2000 || isRefreshing) return
      lastCheckTime = now

      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) {
          console.warn('[use-auth] Erro ao obter sessão ao voltar para a aba:', error)
          notifySessionExpired()
          return
        }

        const currentSess = data?.session
        if (!currentSess) {
          // Usuário não tem sessão ativa; se havia estado de sessão antes, alertar
          return
        }

        const expiresAtSec = currentSess.expires_at || 0
        const nowSec = Math.floor(Date.now() / 1000)
        // Se já expirou ou expira nos próximos 60 segundos
        const needsRefresh = expiresAtSec <= nowSec + 60

        if (needsRefresh) {
          isRefreshing = true
          console.info(
            '[use-auth] Token expirado ou próximo de expirar ao reativar aba. Renovando...',
          )
          const { data: refreshData, error: refreshErr } = await supabase.auth.refreshSession()

          if (refreshErr || !refreshData.session) {
            console.error('[use-auth] Falha na renovação automática do token:', refreshErr)
            notifySessionExpired()
          } else {
            console.info('[use-auth] Sessão restaurada com sucesso.')
            handleSession(refreshData.session)
            window.dispatchEvent(
              new CustomEvent('auth_session_restored', {
                detail: { session: refreshData.session },
              }),
            )
          }
        }
      } catch (wakeErr) {
        console.warn('[use-auth] Erro inesperado ao checar sessão ao voltar para a aba:', wakeErr)
      } finally {
        isRefreshing = false
      }
    }

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkAndRefreshSessionOnWake()
      }
    }

    const handleWindowFocus = () => {
      checkAndRefreshSessionOnWake()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleWindowFocus)

    return () => {
      subscription.unsubscribe()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleWindowFocus)
    }
  }, [])

  const signUp = async (email: string, password: string, name: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nome: name },
      },
    })
    return { error }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  return (
    <AuthContext.Provider
      value={{ user, session, permissions, isAdmin, signUp, signIn, signOut, loading }}
    >
      {children}
    </AuthContext.Provider>
  )
}
