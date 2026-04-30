import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { BrandingTab } from './BrandingTab'
import { TemplatesTab } from './TemplatesTab'
import { DocumentosTab } from './DocumentosTab'
import { ShieldAlert } from 'lucide-react'

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
      <div className="p-6 space-y-6 bg-bender-offwhite min-h-screen">
        <Skeleton className="h-[80px] w-full bg-bender-pale rounded-none" />
        <Skeleton className="h-[60px] w-full max-w-md bg-bender-pale rounded-lg" />
        <Skeleton className="h-64 w-full bg-bender-pale rounded-lg" />
      </div>
    )
  }

  if (permission !== 'Editor' && permission !== 'Admin') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bender-offwhite p-6">
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          <ShieldAlert className="h-16 w-16 text-bender-steel" />
          <h2 className="text-[24px] font-bold text-bender-navy">
            Você não tem permissão para acessar este módulo.
          </h2>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 bg-bender-offwhite min-h-full pb-12">
      <div className="bg-bender-navy p-6">
        <h1 className="text-[32px] font-bold text-bender-offwhite">Administrativo</h1>
      </div>
      <div className="p-6">
        <Tabs defaultValue="branding" className="w-full">
          <TabsList className="bg-bender-pale w-full flex flex-col sm:flex-row h-auto p-0 rounded-lg sm:rounded-t-lg sm:rounded-b-none gap-2 sm:gap-0 mb-6 overflow-hidden">
            <TabsTrigger
              value="branding"
              className="w-full sm:w-auto bg-bender-steel text-bender-offwhite data-[state=active]:bg-bender-denim data-[state=active]:text-bender-offwhite hover:bg-bender-denim/80 px-6 py-3 rounded-lg sm:rounded-t-lg sm:rounded-b-none transition-colors text-base font-semibold min-h-[44px]"
            >
              Branding
            </TabsTrigger>
            <TabsTrigger
              value="templates"
              className="w-full sm:w-auto bg-bender-steel text-bender-offwhite data-[state=active]:bg-bender-denim data-[state=active]:text-bender-offwhite hover:bg-bender-denim/80 px-6 py-3 rounded-lg sm:rounded-t-lg sm:rounded-b-none transition-colors text-base font-semibold min-h-[44px]"
            >
              Templates
            </TabsTrigger>
            <TabsTrigger
              value="documentos"
              className="w-full sm:w-auto bg-bender-steel text-bender-offwhite data-[state=active]:bg-bender-denim data-[state=active]:text-bender-offwhite hover:bg-bender-denim/80 px-6 py-3 rounded-lg sm:rounded-t-lg sm:rounded-b-none transition-colors text-base font-semibold min-h-[44px]"
            >
              Documentos Obrigatórios
            </TabsTrigger>
          </TabsList>

          <TabsContent value="branding" className="outline-none focus-visible:ring-0">
            <BrandingTab />
          </TabsContent>
          <TabsContent value="templates" className="outline-none focus-visible:ring-0">
            <TemplatesTab />
          </TabsContent>
          <TabsContent value="documentos" className="outline-none focus-visible:ring-0">
            <DocumentosTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
