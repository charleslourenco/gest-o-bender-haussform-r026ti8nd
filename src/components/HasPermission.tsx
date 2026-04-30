import { ReactNode } from 'react'
import { useAuth } from '@/hooks/use-auth'

interface HasPermissionProps {
  module: string
  allowedLevels?: string[]
  children: ReactNode
  fallback?: ReactNode
}

export function HasPermission({
  module,
  allowedLevels = ['Leitor', 'Editor', 'Admin'],
  children,
  fallback = null,
}: HasPermissionProps) {
  const { permissions, user, loading } = useAuth()

  if (loading || !user) return <>{fallback}</>

  const userLevel = permissions[module]

  // Super Admin ou Admin do módulo tem acesso a tudo dentro dele
  if (userLevel === 'Admin') return <>{children}</>

  // Verifica se possui nível de acesso suficiente configurado
  if (userLevel && allowedLevels.includes(userLevel)) {
    return <>{children}</>
  }

  return <>{fallback}</>
}
