import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AcompanhamentosKanban } from '@/components/acompanhamentos/AcompanhamentosKanban'
import { AcompanhamentosLista } from '@/components/acompanhamentos/AcompanhamentosLista'
import { AcompanhamentosResponsaveis } from '@/components/acompanhamentos/AcompanhamentosResponsaveis'
import { AcompanhamentosArquivados } from '@/components/acompanhamentos/AcompanhamentosArquivados'
import { ClipboardCheck } from 'lucide-react'

export default function Acompanhamentos() {
  const { user, permissions } = useAuth()
  const navigate = useNavigate()

  const isSuperAdmin = user?.email === 'admin@bender.com'
  const accessLevel = isSuperAdmin ? 'Admin' : permissions['Acompanhamentos']

  useEffect(() => {
    if (!user) return
    if (!accessLevel || accessLevel === 'Sem Acesso' || accessLevel === 'Nenhum') {
      navigate('/dashboard', { replace: true })
    }
  }, [user, accessLevel, navigate])

  if (!accessLevel || accessLevel === 'Sem Acesso' || accessLevel === 'Nenhum') {
    return null
  }

  const isAdmin = accessLevel === 'Admin'

  return (
    <div className="flex-1 flex flex-col h-full bg-background p-6">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <ClipboardCheck className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Acompanhamentos</h1>
        </div>
      </div>

      <Tabs defaultValue="kanban" className="flex-1 flex flex-col min-h-0">
        <TabsList className="w-fit mb-4 shrink-0">
          <TabsTrigger value="kanban">Quadro Kanban</TabsTrigger>
          <TabsTrigger value="lista">Lista de Projetos</TabsTrigger>
          <TabsTrigger value="arquivados">Arquivados</TabsTrigger>
          {isAdmin && <TabsTrigger value="responsaveis">Gestão de Responsáveis</TabsTrigger>}
        </TabsList>

        <TabsContent
          value="kanban"
          className="flex-1 min-h-0 data-[state=active]:flex flex-col m-0 p-0 border-none outline-none focus-visible:ring-0"
        >
          <AcompanhamentosKanban />
        </TabsContent>

        <TabsContent
          value="lista"
          className="flex-1 min-h-0 data-[state=active]:flex flex-col m-0 p-0 border-none outline-none focus-visible:ring-0"
        >
          <AcompanhamentosLista />
        </TabsContent>

        <TabsContent
          value="arquivados"
          className="flex-1 min-h-0 data-[state=active]:flex flex-col m-0 p-0 border-none outline-none focus-visible:ring-0"
        >
          <AcompanhamentosArquivados />
        </TabsContent>

        {isAdmin && (
          <TabsContent
            value="responsaveis"
            className="flex-1 min-h-0 data-[state=active]:flex flex-col m-0 p-0 border-none outline-none focus-visible:ring-0"
          >
            <AcompanhamentosResponsaveis />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
