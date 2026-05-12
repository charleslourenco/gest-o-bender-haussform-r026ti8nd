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
import Producao from './pages/Producao'
import Montagem from './pages/Montagem'
import NotFound from './pages/NotFound'
import { AppProvider } from './stores/main'
import { AuthProvider } from './hooks/use-auth'
import Login from './pages/Login'
import Signup from './pages/Signup'
import AssinaturaPage from './pages/AssinaturaPage'
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
              <Route path="/usuarios" element={<Users />} />
              <Route path="/clientes" element={<AreaClientes />} />
              <Route path="/clientes/:id" element={<AreaClientes />} />
              <Route path="/financeiro" element={<Financeiro />} />
              <Route path="/analise-tecnica" element={<AnaliseTecnica />} />
              <Route path="/producao" element={<Producao />} />
              <Route path="/montagem" element={<Montagem />} />
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
