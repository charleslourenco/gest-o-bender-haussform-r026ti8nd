import { useState, useEffect, useCallback } from 'react'
import { Loader2, Phone, Percent, Package, Clock, Archive, Check, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  fetchMontadorFicha,
  updateMontadorComissao,
  KANBAN_STATUS_LIST,
  STATUS_LABELS,
  type MontadorCard,
} from '@/services/montador-ficha'

interface Props {
  montadorId: string
  nomeCompleto: string
  telefone: string | null
  comissaoPercentual: number | null
  onComissaoChange: (value: number) => void
}

function formatElapsed(iso: string | null): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  if (isNaN(diff)) return '—'
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days}d ${hours % 24}h`
  if (hours > 0) return `${hours}h`
  return `${Math.floor(diff / 60000)}min`
}

export function FichaFuncional({
  montadorId,
  nomeCompleto,
  telefone,
  comissaoPercentual,
  onComissaoChange,
}: Props) {
  const [cards, setCards] = useState<MontadorCard[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [comissaoInput, setComissaoInput] = useState('')

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const result = await fetchMontadorFicha(montadorId)
      setCards(result.cards)
    } catch (e: any) {
      toast.error('Erro ao carregar ficha: ' + (e?.message || ''))
      setCards([])
    } finally {
      setLoading(false)
    }
  }, [montadorId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSave = async () => {
    const val = parseFloat(comissaoInput) || 0
    try {
      await updateMontadorComissao(montadorId, val)
      onComissaoChange(val)
      setEditing(false)
      toast.success('Comissão atualizada')
    } catch (e: any) {
      toast.error('Erro ao salvar: ' + (e?.message || ''))
    }
  }

  const grouped = [...KANBAN_STATUS_LIST, 'arquivados'].map((status) => ({
    status,
    label: STATUS_LABELS[status] || status,
    items: cards.filter((c) => c.group === status),
  }))

  return (
    <div className="bg-muted/30 p-4 space-y-4 border-t border-border animate-in fade-in duration-200">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <Label className="text-xs text-muted-foreground">Nome Completo</Label>
          <p className="text-sm font-medium text-foreground">{nomeCompleto}</p>
        </div>
        <div className="flex items-start gap-2">
          <Phone className="w-4 h-4 text-muted-foreground mt-4" />
          <div>
            <Label className="text-xs text-muted-foreground">Telefone</Label>
            <p className="text-sm font-medium text-foreground">{telefone || '—'}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Percent className="w-4 h-4 text-muted-foreground mt-4" />
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground">Comissão (%)</Label>
            {editing ? (
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  step="0.1"
                  value={comissaoInput}
                  onChange={(e) => setComissaoInput(e.target.value)}
                  className="h-7 w-20 text-sm"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                />
                <Button size="icon" className="h-7 w-7" onClick={handleSave}>
                  <Check className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => setEditing(false)}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setComissaoInput(String(comissaoPercentual ?? ''))
                  setEditing(true)
                }}
                className="text-sm font-medium text-primary hover:underline"
              >
                {comissaoPercentual != null ? `${comissaoPercentual}%` : 'Definir'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <Package className="w-4 h-4 text-primary" />
          <h4 className="text-sm font-semibold text-foreground">Relatório de Produtividade</h4>
          <Badge variant="secondary" className="text-xs">
            {cards.length} montagens
          </Badge>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : cards.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center bg-muted/20 rounded-lg">
            Nenhuma montagem atribuída a este montador.
          </p>
        ) : (
          <div className="space-y-2">
            {grouped.map(({ status, label, items }) => (
              <div key={status} className="rounded-lg border border-border overflow-hidden">
                <div className="flex items-center justify-between px-3 py-1.5 bg-muted/40 border-b border-border">
                  <span className="text-xs font-semibold text-foreground">{label}</span>
                  <Badge variant="outline" className="text-xs h-5">
                    {items.length}
                  </Badge>
                </div>
                {items.length > 0 && (
                  <div className="divide-y divide-border">
                    {items.map((item) => (
                      <div
                        key={item.card_id}
                        className="flex items-center justify-between gap-3 px-3 py-2 bg-card"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {item.nome_produto}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {item.cliente_nome || '—'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {item.arquivado && <Archive className="w-3 h-3 text-muted-foreground" />}
                          <span className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                            <Clock className="w-3 h-3" />
                            {formatElapsed(item.alocado_em)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
