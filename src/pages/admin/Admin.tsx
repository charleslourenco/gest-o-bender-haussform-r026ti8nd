import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { HasPermission } from '@/components/HasPermission'
import { ShieldAlert, Building, FileText, Users as UsersIcon, ShieldCheck } from 'lucide-react'
import { EmpresaTab } from './EmpresaTab'
import { TemplatesTab } from './TemplatesTab'
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
        <div className="bg-midnight-navy p-6 rounded-xl shadow-sm">
          <div className="flex items-center gap-4">
            <Building className="h-10 w-10 text-emerald-400 hidden sm:block" />
            <div>
              <h1 className="text-[32px] font-bold text-off-white">Administrativo</h1>
              <p className="text-pale-cornflower mt-1 font-normal">
                Gestão da Empresa, Templates e Acessos
              </p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="empresa" className="w-full space-y-6">
          <TabsList className="bg-white border border-steel-blue/20 p-1 rounded-lg shadow-sm flex-wrap h-auto">
            <TabsTrigger
              value="empresa"
              className="data-[state=active]:bg-midnight-navy data-[state=active]:text-off-white rounded-md flex items-center gap-2"
            >
              <Building className="h-4 w-4" /> Empresa
            </TabsTrigger>
            <TabsTrigger
              value="templates"
              className="data-[state=active]:bg-midnight-navy data-[state=active]:text-off-white rounded-md flex items-center gap-2"
            >
              <FileText className="h-4 w-4" /> Templates
            </TabsTrigger>
            <TabsTrigger
              value="usuarios"
              className="data-[state=active]:bg-midnight-navy data-[state=active]:text-off-white rounded-md flex items-center gap-2"
            >
              <UsersIcon className="h-4 w-4" /> Usuários
            </TabsTrigger>
            <TabsTrigger
              value="permissoes"
              className="data-[state=active]:bg-midnight-navy data-[state=active]:text-off-white rounded-md flex items-center gap-2"
            >
              <ShieldCheck className="h-4 w-4" /> Permissões
            </TabsTrigger>
          </TabsList>

          <TabsContent value="empresa" className="m-0">
            <EmpresaTab />
          </TabsContent>
          <TabsContent value="templates" className="m-0">
            <TemplatesTab />
          </TabsContent>

          <TabsContent value="usuarios" className="m-0">
            <div className="flex flex-col items-center justify-center py-20 text-center border border-steel-blue/20 rounded-xl bg-off-white shadow-sm">
              <UsersIcon className="h-16 w-16 text-steel-blue mb-4" />
              <h3 className="text-2xl font-bold text-midnight-navy mb-2">Gestão de Usuários</h3>
              <p className="text-midnight-navy/70 mb-6 max-w-md">
                O gerenciamento de usuários foi movido para um módulo dedicado para melhor
                organização e acesso rápido.
              </p>
              <Button asChild className="bg-dark-denim text-off-white hover:bg-dark-denim/90">
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
