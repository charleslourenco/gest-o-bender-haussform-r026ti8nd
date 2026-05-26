import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/hooks/use-auth'
import ListaOrcamentos from './components/ListaOrcamentos'
import NovoOrcamentoTab from './components/NovoOrcamentoTab'
import ConfigurarMarkup from './components/ConfigurarMarkup'

export default function OrcamentosEngenhariaList() {
  const [activeTab, setActiveTab] = useState('lista')
  const { user, permissions } = useAuth()

  const isSuperAdmin = user?.email === 'admin@bender.com'
  const isAdmin =
    isSuperAdmin ||
    permissions['Comercial'] === 'Admin' ||
    permissions['Administrativo'] === 'Admin'

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col gap-1 mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Gestão de Orçamentos</h1>
        <p className="text-muted-foreground">
          Gerencie seus orçamentos, crie novos manualmente ou via planilha e configure os markups de
          venda.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6 grid w-full grid-cols-2 md:w-[600px] md:grid-cols-3">
          <TabsTrigger value="lista">Lista de Orçamentos</TabsTrigger>
          <TabsTrigger value="novo">[+ Novo Orçamento]</TabsTrigger>
          {isAdmin && <TabsTrigger value="markup">Configurar Markup</TabsTrigger>}
        </TabsList>

        <div className="mt-4 bg-card border border-border rounded-xl shadow-sm p-6 min-h-[500px]">
          <TabsContent value="lista" className="m-0 focus-visible:outline-none">
            <ListaOrcamentos onNovo={() => setActiveTab('novo')} />
          </TabsContent>

          <TabsContent value="novo" className="m-0 focus-visible:outline-none">
            <NovoOrcamentoTab onSuccess={() => setActiveTab('lista')} />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="markup" className="m-0 focus-visible:outline-none">
              <ConfigurarMarkup />
            </TabsContent>
          )}
        </div>
      </Tabs>
    </div>
  )
}
