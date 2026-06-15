import { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

interface Props {
  children?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] w-full h-full p-6 text-center animate-in fade-in zoom-in duration-300">
          <div className="bg-red-50 p-4 rounded-full mb-4">
            <AlertCircle className="h-10 w-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Algo deu errado</h2>
          <p className="text-slate-600 mb-6 max-w-md">
            Ocorreu um erro inesperado nesta página. Por favor, tente recarregar ou volte para a
            página inicial.
          </p>
          <div className="flex gap-4">
            <Button onClick={() => window.location.reload()}>Recarregar página</Button>
            <Button variant="outline" onClick={() => (window.location.href = '/')}>
              Voltar ao início
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
