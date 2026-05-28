import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function AdminPage() {
  const [config, setConfig] = useState<any>(null)
  const { toast } = useToast()

  useEffect(() => {
    const fetchConfig = async () => {
      const { data } = await supabase
        .from('configuracoes_sistema')
        .select('*')
        .limit(1)
        .maybeSingle()
      if (data) setConfig(data)
    }
    fetchConfig()
  }, [])

  const handleSave = async () => {
    if (!config) return
    const { error } = await supabase
      .from('configuracoes_sistema')
      .update({
        markup_vista: config.markup_vista,
        markup_prazo: config.markup_prazo,
      })
      .eq('id', config.id)

    if (error) {
      toast({ title: 'Erro', description: 'Não foi possível salvar', variant: 'destructive' })
    } else {
      toast({ title: 'Sucesso', description: 'Configurações salvas' })
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-midnight-navy">Administração do Sistema</h1>
      <Tabs defaultValue="markup" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="markup">Markup Global</TabsTrigger>
        </TabsList>

        <TabsContent value="markup">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Markup</CardTitle>
              <CardDescription>
                Defina os multiplicadores padrão para os cálculos dos orçamentos (À Vista e A
                Prazo).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {config ? (
                <>
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="vista">Markup À Vista (Multiplicador)</Label>
                      <Input
                        id="vista"
                        type="number"
                        step="0.01"
                        value={config.markup_vista}
                        onChange={(e) =>
                          setConfig({ ...config, markup_vista: parseFloat(e.target.value) })
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="prazo">Markup A Prazo (Multiplicador)</Label>
                      <Input
                        id="prazo"
                        type="number"
                        step="0.01"
                        value={config.markup_prazo}
                        onChange={(e) =>
                          setConfig({ ...config, markup_prazo: parseFloat(e.target.value) })
                        }
                      />
                    </div>
                  </div>
                  <Button onClick={handleSave} className="bg-steel-blue hover:bg-midnight-navy">
                    Salvar Configurações
                  </Button>
                </>
              ) : (
                <div className="h-24 flex items-center justify-center text-muted-foreground">
                  Carregando configurações...
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
