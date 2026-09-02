import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { HasPermission } from '@/components/HasPermission'
import {
  ShieldAlert,
  Building,
  FileText,
  Users as UsersIcon,
  ShieldCheck,
  BookOpen,
  Landmark,
} from 'lucide-react'
import { EmpresaTab } from './EmpresaTab'
import { TemplatesTab } from './TemplatesTab'
import { PlanoContasTab } from './PlanoContasTab'
import { ConfiguracoesFiscaisTab } from './ConfiguracoesFiscaisTab'
import { PermissionsMatrix } from '@/components/users/PermissionsMatrix'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'

export default function AdminPage() {
  return (
    <HasPermission
      module="Administrativo"
      allowedLevels={['Editor', 'Admin']}
      fallback={
        <div className="flex h-full min-h-[60vh] items-center justify-center p-8 text-center bg-pale-cornflower/20">
          <div className="flex flex-col items-center gap-4 border-2 border-steel-blue/20 p-8 rounded-xl bg-off-white max-w-md shadow-sm">
            <ShieldAlert className="h-16 w-16 text-steel-blue" />
            <h2 className="text-2xl font-bold tracking-tight text-midnight-navy">Acesso Negado</h2>
            <p className="text-midnight-navy/70 font-medium">
              Você não tem permissão para acessar este módulo. Contate o administrador.
            </p>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-6 p-4 md:p-8 w-full max-w-[1400px] mx-auto animate-in fade-in duration-300">
        <div className="bg-midnight-navy p-6 rounded-xl">
          <div className="flex items-center gap-4">
            <Building className="h-10 w-10 text-off-white hidden sm:block" />
            <div>
              <h1 className="text-[32px] font-bold text-off-white">
                Administrativo & Configurações
              </h1>
              <p className="text-off-white/70 mt-1 font-normal">
                Gestão da Empresa, Plano de Contas, Configurações Fiscais, Templates e Acessos
              </p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="empresa" className="w-full space-y-6">
          <TabsList className="bg-midnight-navy p-1 rounded-lg flex-wrap h-auto gap-1">
            <TabsTrigger
              value="empresa"
              className="data-[state=active]:bg-dark-denim data-[state=active]:text-off-white text-off-white/70 rounded-md flex items-center gap-2"
            >
              <Building className="h-4 w-4" /> Empresa
            </TabsTrigger>
            <TabsTrigger
              value="plano-contas"
              className="data-[state=active]:bg-dark-denim data-[state=active]:text-off-white text-off-white/70 rounded-md flex items-center gap-2"
            >
              <BookOpen className="h-4 w-4" /> Plano de Contas
            </TabsTrigger>
            <TabsTrigger
              value="fiscal"
              className="data-[state=active]:bg-dark-denim data-[state=active]:text-off-white text-off-white/70 rounded-md flex items-center gap-2"
            >
              <Landmark className="h-4 w-4" /> Configurações Fiscais
            </TabsTrigger>
            <TabsTrigger
              value="templates"
              className="data-[state=active]:bg-dark-denim data-[state=active]:text-off-white text-off-white/70 rounded-md flex items-center gap-2"
            >
              <FileText className="h-4 w-4" /> Templates
            </TabsTrigger>
            <TabsTrigger
              value="usuarios"
              className="data-[state=active]:bg-dark-denim data-[state=active]:text-off-white text-off-white/70 rounded-md flex items-center gap-2"
            >
              <UsersIcon className="h-4 w-4" /> Usuários
            </TabsTrigger>
            <TabsTrigger
              value="permissoes"
              className="data-[state=active]:bg-dark-denim data-[state=active]:text-off-white text-off-white/70 rounded-md flex items-center gap-2"
            >
              <ShieldCheck className="h-4 w-4" /> Permissões
            </TabsTrigger>
          </TabsList>

          <TabsContent value="empresa" className="m-0">
            <EmpresaTab />
          </TabsContent>
          <TabsContent value="plano-contas" className="m-0">
            <PlanoContasTab />
          </TabsContent>
          <TabsContent value="fiscal" className="m-0">
            <ConfiguracoesFiscaisTab />
          </TabsContent>
          <TabsContent value="templates" className="m-0">
            <TemplatesTab />
          </TabsContent>

          <TabsContent value="usuarios" className="m-0">
            <div className="flex flex-col items-center justify-center py-20 text-center rounded-xl bg-midnight-navy">
              <UsersIcon className="h-16 w-16 text-off-white mb-4" />
              <h3 className="text-2xl font-bold text-off-white mb-2">Gestão de Usuários</h3>
              <p className="text-off-white/70 mb-6 max-w-md">
                O gerenciamento de usuários foi movido para um módulo dedicado para melhor
                organização e acesso rápido.
              </p>
              <Button
                asChild
                className="bg-dark-denim text-off-white hover:bg-dark-denim/90 border border-steel-blue/40"
              >
                <Link to="/usuarios">Acessar Módulo de Usuários</Link>
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="permissoes" className="m-0">
            <PermissionsMatrix />
          </TabsContent>
        </Tabs>
      </div>
    </HasPermission>
  )
}
