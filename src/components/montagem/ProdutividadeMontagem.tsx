import { useState, useEffect, useCallback } from 'react'
import { Loader2, ChevronRight, User } from 'lucide-react'
import { toast } from 'sonner'
import { fetchMontadores, type MontadorOption } from '@/services/historico-montagem'
import { ProdutividadeDetalheModal } from '@/components/montagem/ProdutividadeDetalheModal'
import { Button } from '@/components/ui/button'

export function ProdutividadeMontagem() {
  const [montadores, setMontadores] = useState<MontadorOption[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMontador, setSelectedMontador] = useState<{
    id: string
    nome: string
  } | null>(null)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const result = await fetchMontadores()
      setMontadores(Array.isArray(result) ? result : [])
    } catch (e: any) {
      toast.error('Erro ao carregar montadores: ' + (e?.message || 'desconhecido'))
      setMontadores([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleRowClick = (m: MontadorOption) => {
    if (!m || !m.id) return
    setSelectedMontador({
      id: String(m.id),
      nome: m.nome_completo ?? 'Montador',
    })
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-card shrink-0">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-foreground">Relatório de Produtividade</h2>
          <Button size="sm" variant="outline" onClick={loadData} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Atualizar'}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !montadores || montadores.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <User className="w-10 h-10 mb-3 opacity-40" />
            <p>Nenhum montador encontrado.</p>
          </div>
        ) : (
          <div className="bg-card rounded-md shadow-sm border border-border overflow-hidden max-w-2xl mx-auto">
            <div className="divide-y divide-border">
              {montadores.map((m) => (
                <button
                  key={String(m.id ?? '')}
                  onClick={() => handleRowClick(m)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <span className="font-medium text-foreground">{m.nome_completo || '—'}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <ProdutividadeDetalheModal
        open={!!selectedMontador}
        onOpenChange={(open) => {
          if (!open) setSelectedMontador(null)
        }}
        montadorId={selectedMontador?.id ?? null}
        montadorNome={selectedMontador?.nome ?? null}
      />
    </div>
  )
}
