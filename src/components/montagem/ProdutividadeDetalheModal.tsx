import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, CheckCircle2, Clock, Package, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import {
  fetchMontadorDetalhe,
  formatDuracao,
  PHASE_ORDER,
  PHASE_LABELS,
  type ConcludedAssembly,
  type InProgressAssembly,
} from '@/services/detalhe-montagem'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  montadorId: string | null
  montadorNome: string | null
}

export function ProdutividadeDetalheModal({ open, onOpenChange, montadorId, montadorNome }: Props) {
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [concluidas, setConcluidas] = useState<ConcludedAssembly[]>([])
  const [emAndamento, setEmAndamento] = useState<InProgressAssembly[]>([])
  const [loading, setLoading] = useState(false)

  const loadData = useCallback(async () => {
    if (!montadorId) return
    try {
      setLoading(true)
      const result = await fetchMontadorDetalhe(
        montadorId,
        dataInicio || undefined,
        dataFim || undefined,
      )
      setConcluidas(result.concluidas)
      setEmAndamento(result.em_andamento)
    } catch (e: any) {
      toast.error('Erro ao carregar detalhes: ' + (e?.message || 'desconhecido'))
      setConcluidas([])
      setEmAndamento([])
    } finally {
      setLoading(false)
    }
  }, [montadorId, dataInicio, dataFim])

  useEffect(() => {
    if (open && montadorId) {
      loadData()
    }
    if (!open) {
      setConcluidas([])
      setEmAndamento([])
      setDataInicio('')
      setDataFim('')
    }
  }, [open, montadorId, loadData])

  const byPhase = useMemo(() => {
    const groups: Record<string, InProgressAssembly[]> = {}
    for (const phase of PHASE_ORDER) {
      groups[phase] = []
    }
    for (const item of emAndamento) {
      const phase = item.status || ''
      if (!groups[phase]) groups[phase] = []
      groups[phase].push(item)
    }
    return groups
  }, [emAndamento])

  const formatDate = (iso: string | null): string => {
    if (!iso) return '—'
    const d = new Date(iso)
    if (isNaN(d.getTime())) return '—'
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
  }

  const knownPhasesWithData = PHASE_ORDER.filter((phase) => (byPhase[phase] || []).length > 0)
  const unknownPhasesWithData = Object.keys(byPhase).filter(
    (p) => !(PHASE_ORDER as readonly string[]).includes(p) && (byPhase[p] || []).length > 0,
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
          <DialogTitle className="text-lg flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            {montadorNome ?? 'Montador'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Detalhamento de produtividade do montador
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-3 border-b border-border bg-muted/30 shrink-0">
          <div className="flex items-end gap-4">
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Data início</Label>
              <Input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-[160px] h-8 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Data fim</Label>
              <Input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="w-[160px] h-8 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto px-6 py-4 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <h3 className="text-base font-semibold text-foreground">
                    Montagens concluídas no período
                  </h3>
                  <span className="text-sm font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    {concluidas.length}
                  </span>
                </div>
                {concluidas.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center bg-muted/20 rounded-lg">
                    Nenhuma montagem concluída no período selecionado.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {concluidas.map((c) => (
                      <div
                        key={c.card_id}
                        className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {c.card_nome}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{c.cliente_nome}</p>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDate(c.data_conclusao)}
                          </div>
                          <div className="flex items-center gap-1 text-xs font-medium text-foreground">
                            <Clock className="w-3.5 h-3.5 text-primary" />
                            {formatDuracao(c.tempo_alocacao_horas)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <h3 className="text-base font-semibold text-foreground">
                    Montagens em andamento
                  </h3>
                  <span className="text-sm font-bold text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded-full">
                    {emAndamento.length}
                  </span>
                </div>
                {emAndamento.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center bg-muted/20 rounded-lg">
                    Nenhuma montagem em andamento.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {[...knownPhasesWithData, ...unknownPhasesWithData].map((phase) => (
                      <div key={phase} className="rounded-lg border border-border overflow-hidden">
                        <div className="flex items-center justify-between px-3 py-2 bg-muted/40 border-b border-border">
                          <span className="text-sm font-semibold text-foreground">
                            {PHASE_LABELS[phase] || phase}
                          </span>
                          <span className="text-xs font-bold text-muted-foreground bg-card px-2 py-0.5 rounded-full border border-border">
                            {(byPhase[phase] || []).length}
                          </span>
                        </div>
                        <div className="divide-y divide-border">
                          {(byPhase[phase] || []).map((item) => (
                            <div
                              key={item.card_id}
                              className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-muted/20 transition-colors"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">
                                  {item.card_nome}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {item.cliente_nome}
                                </p>
                              </div>
                              <div className="flex items-center gap-1 text-xs font-medium text-blue-600 shrink-0">
                                <Clock className="w-3.5 h-3.5" />
                                {formatDuracao(item.tempo_na_fase_horas)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
