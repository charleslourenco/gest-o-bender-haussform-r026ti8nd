import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2, Save } from 'lucide-react'

export default function ConfigurarMarkup() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [vista, setVista] = useState('1.00000')
  const [prazo, setPrazo] = useState('1.00000')

  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('configuracoes')
          .select('chave, valor')
          .in('chave', ['markup_vista', 'markup_prazo'])

        if (error) {
          console.error(error)
          return
        }

        if (data) {
          const v = data.find((d) => d.chave === 'markup_vista')?.valor
          const p = data.find((d) => d.chave === 'markup_prazo')?.valor
          if (v) setVista(Number(v).toFixed(5))
          if (p) setPrazo(Number(p).toFixed(5))
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleSave = async () => {
    try {
      setSaving(true)

      const numVista = Number(vista)
      const numPrazo = Number(prazo)

      if (isNaN(numVista) || isNaN(numPrazo)) {
        toast.error('Valores inválidos. Use apenas números e ponto.')
        return
      }

      const saveKey = async (chave: string, valor: string) => {
        const { data, error } = await supabase
          .from('configuracoes')
          .update({ valor })
          .eq('chave', chave)
          .select()
        if (error || !data || data.length === 0) {
          const { error: insErr } = await supabase.from('configuracoes').insert({ chave, valor })
          if (insErr) {
            localStorage.setItem(chave, valor)
          }
        }
      }

      await saveKey('markup_vista', numVista.toFixed(5))
      await saveKey('markup_prazo', numPrazo.toFixed(5))

      toast.success('Markups atualizados com sucesso!')
    } catch (err: any) {
      toast.error('Erro ao salvar markups. Salvo localmente.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h2 className="text-xl font-semibold">Configuração de Markup</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Defina os índices multiplicadores padrão para orçamentos. Suporta até 5 casas decimais de
          precisão.
        </p>
      </div>

      <div className="grid gap-6">
        <div className="grid gap-3 p-5 border rounded-lg bg-card">
          <Label htmlFor="markup_vista" className="text-base font-medium">
            Markup - Pagamento à Vista
          </Label>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <Input
              id="markup_vista"
              type="number"
              step="0.00001"
              value={vista}
              onChange={(e) => setVista(e.target.value)}
              className="max-w-[200px] font-mono"
            />
            <span className="text-sm text-muted-foreground">Ex: 2.34500 (Custo × 2.34500)</span>
          </div>
        </div>

        <div className="grid gap-3 p-5 border rounded-lg bg-card">
          <Label htmlFor="markup_prazo" className="text-base font-medium">
            Markup - Pagamento a Prazo
          </Label>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <Input
              id="markup_prazo"
              type="number"
              step="0.00001"
              value={prazo}
              onChange={(e) => setPrazo(e.target.value)}
              className="max-w-[200px] font-mono"
            />
            <span className="text-sm text-muted-foreground">Ex: 2.50000 (Custo × 2.50000)</span>
          </div>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} size="lg">
        {saving ? (
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        ) : (
          <Save className="mr-2 h-5 w-5" />
        )}
        Salvar Configurações
      </Button>
    </div>
  )
}
