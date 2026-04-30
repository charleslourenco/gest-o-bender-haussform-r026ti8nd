import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function Signup() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const { signUp } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('A senha deve ter no mínimo 8 caracteres.')
      return
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }

    setIsLoading(true)

    const { error: signUpError } = await signUp(email, password, name)

    if (signUpError) {
      if (signUpError.message.includes('already registered')) {
        setError('Este e-mail já está em uso.')
      } else {
        setError('Ocorreu um erro ao criar a conta. Tente novamente.')
      }
      setIsLoading(false)
    } else {
      toast({
        title: 'Conta criada com sucesso!',
        description: 'Faça login para continuar.',
      })
      navigate('/login')
    }
  }

  return (
    <div className="min-h-screen bg-bender-navy flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
        <div className="flex items-center gap-2 mb-8">
          <div className="h-10 w-10 bg-bender-steel rounded-lg flex items-center justify-center">
            <span className="text-bender-navy font-bold text-xl">B</span>
          </div>
          <h2 className="text-3xl font-extrabold text-bender-offwhite">Bender Haussform</h2>
        </div>
        <h2 className="mt-6 text-center text-2xl font-bold text-bender-offwhite">Crie sua conta</h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-bender-navy py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-bender-denim">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-500/10 border border-red-500 text-red-500 text-sm p-3 rounded-md">
                {error}
              </div>
            )}

            <div>
              <Label htmlFor="name" className="block text-sm font-medium text-bender-offwhite">
                Nome completo
              </Label>
              <div className="mt-1">
                <Input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-bender-pale text-bender-navy border-none focus-visible:ring-bender-steel placeholder:text-bender-navy/50"
                  placeholder="João Silva"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email" className="block text-sm font-medium text-bender-offwhite">
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
                  className="bg-bender-pale text-bender-navy border-none focus-visible:ring-bender-steel placeholder:text-bender-navy/50"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password" className="block text-sm font-medium text-bender-offwhite">
                Senha
              </Label>
              <div className="mt-1">
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-bender-pale text-bender-navy border-none focus-visible:ring-bender-steel placeholder:text-bender-navy/50"
                  placeholder="Mínimo 8 caracteres"
                />
              </div>
            </div>

            <div>
              <Label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-bender-offwhite"
              >
                Confirme a senha
              </Label>
              <div className="mt-1">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-bender-pale text-bender-navy border-none focus-visible:ring-bender-steel placeholder:text-bender-navy/50"
                  placeholder="Repita sua senha"
                />
              </div>
            </div>

            <div>
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-bender-denim hover:bg-bender-denim/90 text-bender-offwhite"
              >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Criar conta
              </Button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-bender-denim" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-bender-navy text-bender-steel">Já tem conta?</span>
              </div>
            </div>

            <div className="mt-6 text-center">
              <Link
                to="/login"
                className="font-medium text-bender-steel hover:text-bender-pale transition-colors"
              >
                Entrar agora
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
