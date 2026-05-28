import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function MarkupSettings() {
  const [config, setConfig] = useState<{
    id: string
    markup_vista: number
    markup_prazo: number
  } | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    supabase
      .from('configuracoes_sistema')
      .select('*')
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) setConfig(data)
      })
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
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Sucesso', description: 'Configurações de markup salvas com sucesso.' })
    }
  }

  if (!config) return <div className="p-8">Carregando configurações...</div>

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-midnight-navy">Markup e Precificação</h1>
        <p className="text-sm text-gray-500">
          Ajuste as margens globais utilizadas no sistema de orçamento.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuração Global</CardTitle>
          <CardDescription>
            Defina os divisores globais para cálculo de preço. (ex: 0.40 para aplicar 60% de margem
            no custo).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Markup À Vista (Divisor)</Label>
            <Input
              type="number"
              step="0.01"
              value={config.markup_vista}
              onChange={(e) => setConfig({ ...config, markup_vista: parseFloat(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label>Markup A Prazo (Divisor)</Label>
            <Input
              type="number"
              step="0.01"
              value={config.markup_prazo}
              onChange={(e) => setConfig({ ...config, markup_prazo: parseFloat(e.target.value) })}
            />
          </div>
          <Button onClick={handleSave} className="w-full">
            Salvar Configurações
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
