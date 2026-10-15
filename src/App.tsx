import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import Layout from './components/Layout'
import { lazy, Suspense } from 'react'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const LeadsSemOrigem = lazy(() => import('./pages/LeadsSemOrigem'))
const Comercial = lazy(() => import('./pages/Comercial'))
const AreaClientes = lazy(() => import('./pages/AreaClientes'))
const Financeiro = lazy(() => import('./pages/Financeiro'))
const DocumentacaoLead = lazy(() => import('./pages/DocumentacaoLead'))
const Users = lazy(() => import('./pages/Users'))
const AdminPage = lazy(() => import('./pages/admin/Admin'))
const Pcp = lazy(() => import('./pages/Pcp'))
const AnaliseTecnica = lazy(() => import('./pages/AnaliseTecnica'))
const AnaliseTecnicaDetalhe = lazy(() => import('./pages/AnaliseTecnicaDetalhe'))
const Producao = lazy(() => import('./pages/Producao'))
const Montagem = lazy(() => import('./pages/Montagem'))
const Acompanhamentos = lazy(() => import('./pages/Acompanhamentos'))
const NotFound = lazy(() => import('./pages/NotFound'))
const EstoqueCompras = lazy(() => import('./pages/EstoqueCompras'))
const GestaoPessoas = lazy(() => import('./pages/GestaoPessoas'))
import { AppProvider } from './stores/main'
import { AuthProvider } from './hooks/use-auth'
const Login = lazy(() => import('./pages/Login'))
const Signup = lazy(() => import('./pages/Signup'))
const AssinaturaPage = lazy(() => import('./pages/AssinaturaPage'))
const AssinarEnvelopePage = lazy(() => import('./pages/AssinarEnvelopePage'))
const BaixaRetalho = lazy(() => import('./pages/BaixaRetalho'))
const BaixaAlocacao = lazy(() => import('./pages/BaixaAlocacao'))
const RecebimentoCaixa = lazy(() => import('./pages/RecebimentoCaixa'))
const RecebimentoItemCliente = lazy(() => import('./pages/RecebimentoItemCliente'))
import { ProtectedRoute } from './components/ProtectedRoute'
import { ThemeProvider } from './components/theme-provider'
import { ErrorBoundary } from './components/ErrorBoundary'
import { SessionExpiredAlert } from './components/SessionExpiredAlert'

function RedirectAnaliseDetalhe() {
  const { id } = useParams()
  return <Navigate to={id ? `/pcp/analise-tecnica/${id}` : '/pcp/analise-tecnica'} replace />
}

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
    <AuthProvider>
      <AppProvider>
        <BrowserRouter>
          <TooltipProvider>
            <Toaster />
            <Sonner position="top-center" duration={5000} />
            <SessionExpiredAlert />
            <Suspense
              fallback={
                <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground text-sm">
                  Carregando...
                </div>
              }
            >
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/assinatura/:id" element={<AssinaturaPage />} />
                <Route path="/assinar-envelope/:id" element={<AssinarEnvelopePage />} />
                <Route path="/baixa-retalho/:id" element={<BaixaRetalho />} />
                <Route path="/baixa-alocacao/:id" element={<BaixaAlocacao />} />
                <Route path="/recebimento-caixa/:id" element={<RecebimentoCaixa />} />
                <Route path="/recebimento-item-cliente/:id" element={<RecebimentoItemCliente />} />
                <Route
                  element={
                    <ProtectedRoute>
                      <Layout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route
                    path="/leads-sem-origem"
                    element={
                      <ErrorBoundary source="LeadsSemOrigem">
                        <LeadsSemOrigem />
                      </ErrorBoundary>
                    }
                  />
                  <Route
                    path="/comercial"
                    element={
                      <ErrorBoundary>
                        <Comercial />
                      </ErrorBoundary>
                    }
                  />
                  <Route
                    path="/comercial/documentacao/:id"
                    element={
                      <ErrorBoundary>
                        <DocumentacaoLead />
                      </ErrorBoundary>
                    }
                  />
                  <Route path="/usuarios" element={<Users />} />
                  <Route path="/clientes" element={<AreaClientes />} />
                  <Route path="/clientes/:id" element={<AreaClientes />} />
                  {/* Hub de Operações em /pcp */}
                  <Route
                    path="/pcp"
                    element={
                      <ErrorBoundary source="PCP Layout">
                        <Pcp />
                      </ErrorBoundary>
                    }
                  >
                    <Route
                      path="analise-tecnica"
                      element={
                        <ErrorBoundary source="PCP AnaliseTecnica">
                          <AnaliseTecnica />
                        </ErrorBoundary>
                      }
                    />
                    <Route
                      path="analise-tecnica/:id"
                      element={
                        <ErrorBoundary source="PCP AnaliseTecnicaDetalhe">
                          <AnaliseTecnicaDetalhe />
                        </ErrorBoundary>
                      }
                    />
                    <Route
                      path="producao"
                      element={
                        <ErrorBoundary source="PCP Producao">
                          <Producao />
                        </ErrorBoundary>
                      }
                    />
                    <Route
                      path="montagem"
                      element={
                        <ErrorBoundary source="PCP Montagem">
                          <Montagem />
                        </ErrorBoundary>
                      }
                    />
                  </Route>

                  {/* Redirects permanentes para manter retrocompatibilidade com links e favoritos */}
                  <Route
                    path="/analise-tecnica"
                    element={<Navigate to="/pcp/analise-tecnica" replace />}
                  />
                  <Route path="/analise-tecnica/:id" element={<RedirectAnaliseDetalhe />} />
                  <Route path="/producao" element={<Navigate to="/pcp/producao" replace />} />
                  <Route path="/montagem" element={<Navigate to="/pcp/montagem" replace />} />

                  <Route
                    path="/financeiro"
                    element={
                      <ErrorBoundary source="Financeiro Page Root">
                        <Financeiro />
                      </ErrorBoundary>
                    }
                  />
                  <Route
                    path="/acompanhamentos"
                    element={
                      <ErrorBoundary>
                        <Acompanhamentos />
                      </ErrorBoundary>
                    }
                  />
                  <Route path="/estoque-compras" element={<EstoqueCompras />} />
                  <Route path="/gestao-pessoas" element={<GestaoPessoas />} />
                  <Route path="/gestao-pessoas/:tipo/:id" element={<GestaoPessoas />} />
                  <Route path="/admin" element={<AdminPage />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </TooltipProvider>
        </BrowserRouter>
      </AppProvider>
    </AuthProvider>
  </ThemeProvider>
)

export default App
