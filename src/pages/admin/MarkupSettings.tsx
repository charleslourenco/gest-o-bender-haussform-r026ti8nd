import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'

export default function MarkupSettings() {
  const [markupVista, setMarkupVista] = useState<number>(0.4)
  const [markupPrazo, setMarkupPrazo] = useState<number>(0.35)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await supabase
          .from('configuracoes_sistema')
          .select('*')
          .limit(1)
          .maybeSingle()
        if (data && !error) {
          setMarkupVista(data.markup_vista)
          setMarkupPrazo(data.markup_prazo)
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const { data: config } = await supabase
        .from('configuracoes_sistema')
        .select('id')
        .limit(1)
        .maybeSingle()

      if (config?.id) {
        await supabase
          .from('configuracoes_sistema')
          .update({
            markup_vista: markupVista,
            markup_prazo: markupPrazo,
            atualizado_em: new Date().toISOString(),
          })
          .eq('id', config.id)
      } else {
        await supabase.from('configuracoes_sistema').insert({
          markup_vista: markupVista,
          markup_prazo: markupPrazo,
        })
      }
      toast({ title: 'Configurações salvas com sucesso!' })
    } catch (e) {
      toast({ title: 'Erro ao salvar configurações', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64 bg-steel-blue/20" />
        <Skeleton className="h-32 w-full bg-steel-blue/20 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-midnight-navy">Configurações de Markup</h1>
        <p className="text-sm text-steel-blue">
          Defina os divisores de markup padrão para orçamentos à vista e a prazo.
        </p>
      </div>

      <div className="bg-white p-6 rounded-xl border border-steel-blue/20 shadow-sm space-y-6">
        <div className="space-y-2">
          <Label htmlFor="markupVista" className="text-midnight-navy font-semibold">
            Markup Divisor (À Vista)
          </Label>
          <Input
            id="markupVista"
            type="number"
            step="0.01"
            value={markupVista}
            onChange={(e) => setMarkupVista(parseFloat(e.target.value))}
            className="border-steel-blue/30 focus-visible:ring-midnight-navy"
          />
          <p className="text-xs text-steel-blue">
            Ex: 0.40 significa que o custo será dividido por 0.40 (margem de 60%)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="markupPrazo" className="text-midnight-navy font-semibold">
            Markup Divisor (A Prazo)
          </Label>
          <Input
            id="markupPrazo"
            type="number"
            step="0.01"
            value={markupPrazo}
            onChange={(e) => setMarkupPrazo(parseFloat(e.target.value))}
            className="border-steel-blue/30 focus-visible:ring-midnight-navy"
          />
          <p className="text-xs text-steel-blue">
            Ex: 0.35 significa que o custo será dividido por 0.35
          </p>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-midnight-navy hover:bg-midnight-navy/90 text-white font-medium h-11"
        >
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </div>
    </div>
  )
}
