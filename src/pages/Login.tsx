import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [empresa, setEmpresa] = useState<{
    nome: string
    logo_url: string | null
    atualizado_em?: string
  } | null>(null)

  useEffect(() => {
    async function fetchEmpresa() {
      const { data } = await supabase
        .from('empresa')
        .select('nome, logo_url, atualizado_em')
        .order('criado_em', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (data) {
        setEmpresa(data)
      }
    }
    fetchEmpresa()

    const handleBrandingUpdated = () => fetchEmpresa()
    window.addEventListener('branding_updated', handleBrandingUpdated)
    return () => window.removeEventListener('branding_updated', handleBrandingUpdated)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    const { error: signInError } = await signIn(email, password)

    if (signInError) {
      setError('Credenciais inválidas. Verifique seu e-mail e senha.')
      setIsLoading(false)
    } else {
      navigate('/')
    }
  }

  return (
    <div className="min-h-screen bg-midnight-navy flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
        <div className="flex items-center justify-center gap-2 mb-8 w-full min-h-[64px]">
          {empresa?.logo_url ? (
            <img
              src={`${empresa.logo_url}${empresa.logo_url.includes('?') ? '&' : '?'}t=${empresa.atualizado_em ? new Date(empresa.atualizado_em).getTime() : Date.now()}`}
              alt={empresa.nome || 'Logo da Empresa'}
              className="max-h-16 w-full object-contain logo-always-light"
            />
          ) : (
            <>
              <div className="h-10 w-10 bg-steel-blue rounded-lg flex items-center justify-center">
                <span className="text-off-white font-bold text-xl">
                  {empresa?.nome ? empresa.nome.charAt(0).toUpperCase() : 'B'}
                </span>
              </div>
              <h2 className="text-3xl font-extrabold text-off-white">
                {empresa?.nome || 'Bender Haussform'}
              </h2>
            </>
          )}
        </div>
        <h2 className="mt-6 text-center text-2xl font-bold text-off-white">Acesse sua conta</h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-midnight-navy py-8 px-4 shadow sm:rounded-lg sm:px-10 border-2 border-steel-blue">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-steel-blue text-off-white text-sm p-4 rounded-lg font-semibold">
                {error}
              </div>
            )}

            <div>
              <Label htmlFor="email" className="block text-sm font-semibold text-off-white mb-2">
                E-mail
              </Label>
              <div className="mt-1">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-pale-cornflower text-midnight-navy border-2 border-steel-blue focus-visible:ring-0 focus-visible:border-[3px] focus-visible:border-dark-denim placeholder:text-midnight-navy/50 h-[44px] px-4 rounded-lg transition-colors duration-200"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password" className="block text-sm font-semibold text-off-white mb-2">
                Senha
              </Label>
              <div className="mt-1">
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-pale-cornflower text-midnight-navy border-2 border-steel-blue focus-visible:ring-0 focus-visible:border-[3px] focus-visible:border-dark-denim placeholder:text-midnight-navy/50 h-[44px] px-4 rounded-lg transition-colors duration-200"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-dark-denim hover:opacity-90 text-off-white h-[44px] rounded-lg transition-opacity duration-200 font-semibold"
              >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Entrar
              </Button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-steel-blue" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-midnight-navy text-pale-cornflower font-medium">
                  Ainda não tem conta?
                </span>
              </div>
            </div>

            <div className="mt-6 text-center">
              <Link
                to="/signup"
                className="font-semibold text-pale-cornflower hover:text-off-white transition-colors duration-200"
              >
                Criar nova conta
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
