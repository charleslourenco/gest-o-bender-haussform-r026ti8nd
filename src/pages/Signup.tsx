import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function Signup() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-bender-navy flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
        <div className="flex items-center gap-2 mb-8">
          <div className="h-10 w-10 bg-bender-steel rounded-lg flex items-center justify-center">
            <span className="text-bender-navy font-bold text-xl">B</span>
          </div>
          <h2 className="text-3xl font-extrabold text-bender-offwhite">Bender Haussform</h2>
        </div>
        <h2 className="mt-2 text-center text-2xl font-bold text-bender-offwhite">
          Auto-cadastro Desativado
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-bender-navy py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-bender-denim space-y-6 text-center">
          <p className="text-sm text-bender-steel leading-relaxed">
            O auto-cadastro público de novas contas foi desativado por motivos de segurança. Novos
            usuários só podem ser cadastrados através de convite ou criação direta por um
            administrador do sistema.
          </p>

          <div className="pt-2">
            <Button
              onClick={() => navigate('/login')}
              className="w-full bg-bender-denim hover:bg-bender-denim/90 text-bender-offwhite font-medium"
            >
              Voltar ao Login
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
