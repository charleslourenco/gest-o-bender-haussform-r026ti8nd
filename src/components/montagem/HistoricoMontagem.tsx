import { useState, useEffect, useCallback, useMemo } from 'react'
import { Loader2, History, User, Package, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { fetchHistoricoMontagem, type HistoricoMontagemRecord } from '@/services/historico-montagem'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function HistoricoMontagem() {
  const [records, setRecords] = useState<HistoricoMontagemRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const result = await fetchHistoricoMontagem()
      setRecords(Array.isArray(result) ? result : [])
    } catch (e: any) {
      toast.error('Erro ao carregar histórico: ' + (e?.message || ''))
      setRecords([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filtered = useMemo(() => {
    if (!search.trim()) return records
    const q = search.toLowerCase()
    return records.filter(
      (r) =>
        (r?.montador_nome || '').toLowerCase().includes(q) ||
        (r?.card_nome || '').toLowerCase().includes(q) ||
        (r?.cliente_nome || '').toLowerCase().includes(q) ||
        (r?.acao || '').toLowerCase().includes(q),
    )
  }, [records, search])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-card shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Histórico de Montagem</h2>
          </div>
          <Button size="sm" variant="outline" onClick={loadData} disabled={loading}>
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
        </div>
        <div className="mt-3 relative">
          <Input
            placeholder="Buscar por montador, card, cliente ou ação..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-background"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <History className="w-10 h-10 mb-3 opacity-40" />
            <p>Nenhum registro encontrado.</p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-2">
            {filtered.map((r) => (
              <div
                key={r.id}
                className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-foreground">
                      {r.montador_nome || '—'}
                    </span>
                    <Badge
                      variant={r.acao === 'alocado' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {r.acao}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                    <Package className="w-3 h-3 shrink-0" />
                    <span className="truncate">{r.card_nome || '—'}</span>
                    {r.cliente_nome && <span className="truncate">· {r.cliente_nome}</span>}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                  {formatDate(r.criado_em)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
