import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Comercial from './pages/Comercial'
import AreaClientes from './pages/AreaClientes'
import Financeiro from './pages/Financeiro'
import DocumentacaoLead from './pages/DocumentacaoLead'
import Users from './pages/Users'
import AdminPage from './pages/admin/Admin'
import AnaliseTecnica from './pages/AnaliseTecnica'
import AnaliseTecnicaDetalhe from './pages/AnaliseTecnicaDetalhe'
import Producao from './pages/Producao'
import Montagem from './pages/Montagem'
import Acompanhamentos from './pages/Acompanhamentos'
import NotFound from './pages/NotFound'
import EstoqueCompras from './pages/EstoqueCompras'
import GestaoPessoas from './pages/GestaoPessoas'
import { AppProvider } from './stores/main'
import { AuthProvider } from './hooks/use-auth'
import Login from './pages/Login'
import Signup from './pages/Signup'
import AssinaturaPage from './pages/AssinaturaPage'
import BaixaRetalho from './pages/BaixaRetalho'
import RecebimentoCaixa from './pages/RecebimentoCaixa'
import RecebimentoItemCliente from './pages/RecebimentoItemCliente'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ThemeProvider } from './components/theme-provider'
import { ErrorBoundary } from './components/ErrorBoundary'

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
    <AuthProvider>
      <AppProvider>
        <BrowserRouter future={{ v7_startTransition: false, v7_relativeSplatPath: false }}>
          <TooltipProvider>
            <Toaster />
            <Sonner position="top-center" duration={5000} />
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/assinatura/:id" element={<AssinaturaPage />} />
              <Route path="/baixa-retalho/:id" element={<BaixaRetalho />} />
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
                <Route path="/financeiro" element={<Financeiro />} />
                <Route
                  path="/analise-tecnica"
                  element={
                    <ErrorBoundary>
                      <AnaliseTecnica />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/analise-tecnica/:id"
                  element={
                    <ErrorBoundary>
                      <AnaliseTecnicaDetalhe />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/producao"
                  element={
                    <ErrorBoundary>
                      <Producao />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/montagem"
                  element={
                    <ErrorBoundary>
                      <Montagem />
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
          </TooltipProvider>
        </BrowserRouter>
      </AppProvider>
    </AuthProvider>
  </ThemeProvider>
)

export default App
