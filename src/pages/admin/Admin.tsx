import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { BrandingTab } from './BrandingTab'
import { TemplatesTab } from './TemplatesTab'
import { DocumentosTab } from './DocumentosTab'

export default function AdminPage() {
  const { user } = useAuth()
  const [permission, setPermission] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchPerm() {
      if (!user) return
      const { data } = await supabase
        .from('matriz_permissoes')
        .select('nivel_acesso')
        .eq('usuario_id', user.id)
        .eq('modulo', 'Administrativo')
        .single()

      if (data) {
        setPermission(data.nivel_acesso)
      } else {
        const { data: isAdmin } = await supabase.rpc('is_admin', { user_id: user.id })
        if (isAdmin) setPermission('Admin')
        else setPermission('Sem Acesso')
      }
      setLoading(false)
    }
    fetchPerm()
  }, [user])

  if (loading) {
    return (
      <div className="p-8 space-y-4 bg-bender-offwhite min-h-screen">
        <Skeleton className="h-12 w-full bg-bender-pale" />
        <Skeleton className="h-64 w-full bg-bender-pale" />
      </div>
    )
  }

  if (permission !== 'Editor' && permission !== 'Admin') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bender-offwhite">
        <h2 className="text-2xl font-bold text-bender-navy">
          Você não tem permissão para acessar este módulo.
        </h2>
      </div>
    )
  }

  return (
    <div className="flex-1 bg-bender-offwhite min-h-full">
      <div className="bg-bender-navy p-6">
        <h1 className="text-[32px] font-bold text-bender-offwhite">Administrativo</h1>
      </div>
      <div className="p-6">
        <Tabs defaultValue="branding" className="w-full">
          <TabsList className="bg-bender-pale mb-6">
            <TabsTrigger
              value="branding"
              className="data-[state=active]:bg-bender-denim data-[state=active]:text-bender-offwhite text-bender-navy font-semibold"
            >
              Branding
            </TabsTrigger>
            <TabsTrigger
              value="templates"
              className="data-[state=active]:bg-bender-denim data-[state=active]:text-bender-offwhite text-bender-navy font-semibold"
            >
              Templates
            </TabsTrigger>
            <TabsTrigger
              value="documentos"
              className="data-[state=active]:bg-bender-denim data-[state=active]:text-bender-offwhite text-bender-navy font-semibold"
            >
              Documentos Obrigatórios
            </TabsTrigger>
          </TabsList>

          <TabsContent value="branding">
            <BrandingTab />
          </TabsContent>
          <TabsContent value="templates">
            <TemplatesTab />
          </TabsContent>
          <TabsContent value="documentos">
            <DocumentosTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
