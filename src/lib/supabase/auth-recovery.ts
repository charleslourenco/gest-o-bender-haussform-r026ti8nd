import { supabase } from './client'

/**
 * Verifica se um erro retornado pelo Supabase/PostgREST/Auth indica
 * problema de autenticação, JWT inválido, expirado ou sessão ausente.
 */
export function isAuthSessionError(error: any): boolean {
  if (!error) return false

  const status = error.status || error.statusCode || error.code
  const message = (error.message || error.error_description || error.details || '')
    .toString()
    .toLowerCase()
  const code = (error.code || '').toString().toUpperCase()

  // Códigos de erro HTTP ou PostgREST comuns para JWT/sessão inválida
  if (status === 401 || status === 403 || status === '401' || status === '403') return true
  if (code === 'PGRST301' || code === '401' || code === 'INVALID_JWT') return true

  // Padrões de texto típicos
  const authPatterns = [
    'jwt expired',
    'jwt is expired',
    'invalid jwt',
    'invalid claim',
    'token is expired',
    'invalid_token',
    'invalid_refresh_token',
    'refresh token not found',
    'session from cookies was not found',
    'no current session',
    'auth session missing',
    'not authenticated',
    'unauthorized',
    'pgrst301',
    'bearer token',
    'failed to fetch', // as vezes CORS apos 401 em gateways
  ]

  return authPatterns.some((pattern) => message.includes(pattern))
}

export interface RunWithAuthRecoveryOptions {
  redirectOnFailure?: boolean
  returnTo?: string
}

export interface RunWithAuthRecoveryResult<T> {
  data: T | null
  error: any
  recovered: boolean
  sessionExpired: boolean
}

let refreshPromise: Promise<boolean> | null = null

/**
 * Tenta renovar a sessão Supabase com deduplicação de chamadas simultâneas.
 * Retorna true se a sessão estiver válida/renovada com sucesso.
 */
export async function refreshSupabaseSession(): Promise<boolean> {
  if (refreshPromise) {
    return refreshPromise
  }

  refreshPromise = (async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession()
      if (error || !data.session) {
        // Tentar obter sessão como fallback
        const { data: sessionData, error: sessionErr } = await supabase.auth.getSession()
        if (sessionErr || !sessionData.session) {
          return false
        }
        return true
      }
      return true
    } catch (err) {
      console.warn('[auth-recovery] Falha ao tentar refreshSession():', err)
      return false
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

/**
 * Executa uma operação assíncrona com interceptação de erros de autenticação/sessão.
 * Se a primeira tentativa falhar com erro de autenticação, tenta renovar a sessão
 * automaticamente UMA vez e repete a operação.
 * Se a renovação falhar, sinaliza sessionExpired = true e pode redirecionar.
 */
export async function runWithAuthRecovery<T>(
  operation: () => Promise<{ data?: T | null; error?: any }>,
  options?: RunWithAuthRecoveryOptions,
): Promise<RunWithAuthRecoveryResult<T>> {
  try {
    const firstAttempt = await operation()

    if (!firstAttempt.error) {
      return {
        data: firstAttempt.data ?? null,
        error: null,
        recovered: false,
        sessionExpired: false,
      }
    }

    // Se houve erro e ele indica sessão inválida/expirada
    if (isAuthSessionError(firstAttempt.error)) {
      console.warn(
        '[auth-recovery] Erro de autenticação detectado, tentando refresh automático da sessão...',
        firstAttempt.error,
      )

      const refreshed = await refreshSupabaseSession()
      if (refreshed) {
        console.info('[auth-recovery] Sessão renovada com sucesso! Repetindo operação...')
        const retryAttempt = await operation()
        if (!retryAttempt.error) {
          return {
            data: retryAttempt.data ?? null,
            error: null,
            recovered: true,
            sessionExpired: false,
          }
        }
        // Se ainda falhou após refresh bem-sucedido, retornar o erro mas sessionExpired = false (pois o token renovou)
        return {
          data: retryAttempt.data ?? null,
          error: retryAttempt.error,
          recovered: true,
          sessionExpired: isAuthSessionError(retryAttempt.error),
        }
      }

      // Sessão irrecuperável
      console.error('[auth-recovery] Sessão irrecuperável ou refresh token inválido.')
      if (options?.redirectOnFailure) {
        redirectToLogin(options.returnTo)
      }

      return {
        data: null,
        error: firstAttempt.error,
        recovered: false,
        sessionExpired: true,
      }
    }

    // Erro comum de negócio / query
    return {
      data: firstAttempt.data ?? null,
      error: firstAttempt.error,
      recovered: false,
      sessionExpired: false,
    }
  } catch (err: any) {
    if (isAuthSessionError(err)) {
      console.warn('[auth-recovery] Exceção de autenticação capturada:', err)
      const refreshed = await refreshSupabaseSession()
      if (refreshed) {
        try {
          const retryAttempt = await operation()
          return {
            data: retryAttempt.data ?? null,
            error: retryAttempt.error ?? null,
            recovered: true,
            sessionExpired: retryAttempt.error ? isAuthSessionError(retryAttempt.error) : false,
          }
        } catch (retryErr) {
          return {
            data: null,
            error: retryErr,
            recovered: true,
            sessionExpired: isAuthSessionError(retryErr),
          }
        }
      }

      if (options?.redirectOnFailure) {
        redirectToLogin(options.returnTo)
      }

      return {
        data: null,
        error: err,
        recovered: false,
        sessionExpired: true,
      }
    }

    return {
      data: null,
      error: err,
      recovered: false,
      sessionExpired: false,
    }
  }
}

/**
 * Redireciona o usuário para /login preservando a rota de retorno via sessionStorage ou state
 */
export function redirectToLogin(customReturnTo?: string): void {
  const currentPath = customReturnTo || `${window.location.pathname}${window.location.search}`
  try {
    sessionStorage.setItem('auth_return_to', currentPath)
  } catch (e) {
    // ignore
  }

  // Notificar componentes interessados
  window.dispatchEvent(
    new CustomEvent('auth_session_expired', {
      detail: { returnTo: currentPath },
    }),
  )

  const loginUrl = `/login?returnTo=${encodeURIComponent(currentPath)}`
  window.location.href = loginUrl
}
