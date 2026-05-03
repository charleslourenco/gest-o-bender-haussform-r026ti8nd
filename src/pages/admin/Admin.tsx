import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { BrandingTab } from './BrandingTab'
import { TemplatesTab } from './TemplatesTab'
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
      <div className="p-6 space-y-6 bg-background min-h-screen">
        <Skeleton className="h-[80px] w-full bg-muted rounded-none" />
        <Skeleton className="h-[60px] w-full max-w-md bg-muted rounded-lg" />
        <Skeleton className="h-64 w-full bg-muted rounded-lg" />
      </div>
    )
  }

  if (permission !== 'Editor' && permission !== 'Admin') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          <ShieldAlert className="h-16 w-16 text-muted-foreground" />
          <h2 className="text-2xl font-semibold text-foreground">
            Você não tem permissão para acessar este módulo.
          </h2>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 bg-muted/20 min-h-full pb-12">
      <div className="bg-background border-b p-6">
        <h1 className="text-2xl font-bold text-foreground">Administrativo</h1>
      </div>
      <div className="p-6">
        <Tabs defaultValue="branding" className="w-full">
          <TabsList className="bg-muted w-full flex flex-col sm:flex-row h-auto p-1 rounded-lg gap-2 sm:gap-1 mb-6">
            <TabsTrigger
              value="branding"
              className="w-full sm:w-auto data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm px-6 py-2.5 rounded-md transition-all text-sm font-medium"
            >
              Branding
            </TabsTrigger>
            <TabsTrigger
              value="templates"
              className="w-full sm:w-auto data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm px-6 py-2.5 rounded-md transition-all text-sm font-medium"
            >
              Templates
            </TabsTrigger>
          </TabsList>

          <TabsContent value="branding" className="outline-none focus-visible:ring-0">
            <BrandingTab />
          </TabsContent>
          <TabsContent value="templates" className="outline-none focus-visible:ring-0">
            <TemplatesTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
