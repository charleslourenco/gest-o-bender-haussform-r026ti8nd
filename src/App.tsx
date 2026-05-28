import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Comercial from './pages/Comercial'
import AreaClientes from './pages/AreaClientes'
import ListasMateriaisList from './pages/listas-materiais/index'
import NovaListaMateriais from './pages/listas-materiais/nova'
import Financeiro from './pages/Financeiro'
import DocumentacaoLead from './pages/DocumentacaoLead'
import Users from './pages/Users'
import AdminPage from './pages/admin/Admin'
import AnaliseTecnica from './pages/AnaliseTecnica'
import Producao from './pages/Producao'
import Montagem from './pages/Montagem'
import NotFound from './pages/NotFound'
import EstoqueCompras from './pages/EstoqueCompras'
import GestaoPessoas from './pages/GestaoPessoas'
import OrcamentosEngenhariaList from './pages/orcamentos/OrcamentosEngenhariaList'
import OrcamentosEngenhariaDetail from './pages/orcamentos/OrcamentosEngenhariaDetail'
import { AppProvider } from './stores/main'
import { AuthProvider } from './hooks/use-auth'
import Login from './pages/Login'
import Signup from './pages/Signup'
import AssinaturaPage from './pages/AssinaturaPage'
import BaixaRetalho from './pages/BaixaRetalho'
import { ProtectedRoute } from './components/ProtectedRoute'

const App = () => (
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
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/comercial" element={<Comercial />} />
              <Route path="/comercial/documentacao/:id" element={<DocumentacaoLead />} />
              <Route path="/listas-materiais" element={<ListasMateriaisList />} />
              <Route path="/listas-materiais/nova" element={<NovaListaMateriais />} />
              <Route path="/listas-materiais/:id" element={<NovaListaMateriais />} />
              <Route path="/orcamentos" element={<OrcamentosEngenhariaList />} />
              <Route path="/orcamentos/novo" element={<OrcamentosEngenhariaDetail />} />
              <Route path="/orcamentos/:id" element={<OrcamentosEngenhariaDetail />} />
              <Route path="/usuarios" element={<Users />} />
              <Route path="/clientes" element={<AreaClientes />} />
              <Route path="/clientes/:id" element={<AreaClientes />} />
              <Route path="/financeiro" element={<Financeiro />} />
              <Route path="/analise-tecnica" element={<AnaliseTecnica />} />
              <Route path="/producao" element={<Producao />} />
              <Route path="/montagem" element={<Montagem />} />
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
)

export default App
