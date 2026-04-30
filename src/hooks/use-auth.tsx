import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'

interface AuthContextType {
  user: User | null
  session: Session | null
  permissions: Record<string, string>
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
            perms[p.modulo] = p.nivel_acesso
          })
          setPermissions(perms)
        }
      } catch (err) {
        console.error('Error fetching permissions', err)
      }
    }

    const handleSession = (sessionObj: Session | null) => {
      setSession(sessionObj)
      setUser(sessionObj?.user ?? null)

      if (sessionObj?.user) {
        fetchPermissions(sessionObj.user.id).then(() => {
          setLoading(false)
        })
      } else {
        setPermissions({})
        setLoading(false)
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, sessionObj) => {
      handleSession(sessionObj)
    })

    supabase.auth.getSession().then(({ data: { session: sessionObj } }) => {
      handleSession(sessionObj)
    })

    return () => subscription.unsubscribe()
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
    <AuthContext.Provider value={{ user, session, permissions, signUp, signIn, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  )
}
