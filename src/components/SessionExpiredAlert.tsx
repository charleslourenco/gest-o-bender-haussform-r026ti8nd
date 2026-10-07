import { useState, useEffect } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertTriangle, LogIn, RefreshCw, X } from 'lucide-react'
import { refreshSupabaseSession, redirectToLogin } from '@/lib/supabase/auth-recovery'

/**
 * Componente global de aviso de sessão expirada.
 * Escuta o evento global 'auth_session_expired' e exibe um banner/aviso fixo de alta visibilidade
 * em qualquer tela do app, prevenindo que o usuário visualize uma tela vazia silenciosa.
 * Oferece as ações de tentar restaurar a sessão no local ou redirecionar para o login
 * preservando a rota atual de retorno (pathname + search).
 */
export function SessionExpiredAlert() {
  const [expired, setExpired] = useState(false)
  const [returnTo, setReturnTo] = useState<string>('')
  const [isRetrying, setIsRetrying] = useState(false)

  useEffect(() => {
    const handleExpired = (e: Event) => {
      const customEvent = e as CustomEvent<{ returnTo?: string }>
      const current =
        customEvent.detail?.returnTo || `${window.location.pathname}${window.location.search}`
      setReturnTo(current)
      try {
        sessionStorage.setItem('auth_return_to', current)
      } catch (err) {
        // ignore
      }
      setExpired(true)
    }

    const handleRestored = () => {
      setExpired(false)
      setIsRetrying(false)
    }

    window.addEventListener('auth_session_expired', handleExpired)
    window.addEventListener('auth_session_restored', handleRestored)

    return () => {
      window.removeEventListener('auth_session_expired', handleExpired)
      window.removeEventListener('auth_session_restored', handleRestored)
    }
  }, [])

  if (!expired) return null

  const handleRetry = async () => {
    setIsRetrying(true)
    try {
      const ok = await refreshSupabaseSession()
      if (ok) {
        setExpired(false)
        window.dispatchEvent(
          new CustomEvent('auth_session_restored', {
            detail: { returnTo },
          }),
        )
      } else {
        // Se ainda não recuperou, direciona
        redirectToLogin(returnTo)
      }
    } finally {
      setIsRetrying(false)
    }
  }

  const handleLogin = () => {
    redirectToLogin(returnTo)
  }

  return (
    <aside
      role="alert"
      aria-live="assertive"
      className="fixed bottom-4 right-4 left-4 md:left-auto md:max-w-md z-[9999] animate-in fade-in slide-in-from-bottom-4 duration-300 pointer-events-auto"
    >
      <Alert className="border-amber-500/80 bg-amber-50 dark:bg-amber-950/95 text-amber-950 dark:text-amber-100 shadow-xl border-2">
        <div className="flex items-start gap-3 w-full">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <AlertTitle className="font-bold text-sm text-amber-900 dark:text-amber-200">
                Sessão expirada
              </AlertTitle>
              <button
                type="button"
                onClick={() => setExpired(false)}
                className="text-amber-700 hover:text-amber-950 dark:text-amber-400 dark:hover:text-amber-100 p-0.5 rounded transition-colors"
                title="Fechar aviso"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <AlertDescription className="text-xs text-amber-800 dark:text-amber-300/90 mt-1">
              Sua sessão de acesso expirou devido ao tempo de inatividade. Renove a conexão ou faça
              login novamente para visualizar todos os dados.
            </AlertDescription>
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                variant="default"
                onClick={handleLogin}
                className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white border-none shadow-xs gap-1.5 font-medium"
              >
                <LogIn className="h-3.5 w-3.5" />
                Entrar novamente
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleRetry}
                disabled={isRetrying}
                className="h-8 text-xs border-amber-600/50 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/50 gap-1.5"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
                {isRetrying ? 'Tentando renovar...' : 'Tentar reconectar'}
              </Button>
            </div>
          </div>
        </div>
      </Alert>
    </aside>
  )
}
