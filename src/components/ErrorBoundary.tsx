import { Component, ErrorInfo, ReactNode } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children?: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo })
    console.error('Uncaught error in component:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] h-full w-full p-6 text-center">
          <div className="bg-destructive/10 p-4 rounded-full mb-4">
            <AlertCircle className="w-10 h-10 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Algo deu errado</h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            Ocorreu um erro inesperado ao carregar esta área. Tente recarregar a página ou voltar
            mais tarde.
          </p>
          <div className="flex gap-4">
            <Button
              onClick={() => this.setState({ hasError: false, error: null })}
              variant="outline"
            >
              Tentar Novamente
            </Button>
            <Button onClick={() => window.location.reload()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Recarregar Página
            </Button>
          </div>
          {this.state.error && (
            <div className="mt-8 p-4 bg-muted/50 rounded-lg max-w-2xl text-left overflow-auto text-xs text-muted-foreground border border-border space-y-2">
              <p className="font-mono font-bold text-destructive">{this.state.error.toString()}</p>
              {this.state.error.stack && (
                <pre className="font-mono text-[11px] whitespace-pre-wrap opacity-80 max-h-40 overflow-y-auto">
                  {this.state.error.stack}
                </pre>
              )}
              {this.state.errorInfo?.componentStack && (
                <details className="mt-2 text-muted-foreground">
                  <summary className="cursor-pointer font-medium hover:underline text-[11px]">
                    Component Stack
                  </summary>
                  <pre className="font-mono text-[10px] whitespace-pre-wrap opacity-70 mt-1 max-h-40 overflow-y-auto">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>
          )}
        </div>
      )
    }

    return this.props.children
  }
}
