import { useState, useEffect, useCallback } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Loader2, Clock, CheckCircle2, Package } from 'lucide-react'
import { toast } from 'sonner'
import {
  fetchDetalheMontador,
  formatDuracao,
  DetalheMontagemCard,
} from '@/services/detalhe-montagem'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  montadorId: string | null
  montadorNome: string | null
}

export function ProdutividadeDetalheDrawer({
  open,
  onOpenChange,
  montadorId,
  montadorNome,
}: Props) {
  const [data, setData] = useState<DetalheMontagemCard[]>([])
  const [loading, setLoading] = useState(false)

  const loadData = useCallback(async () => {
    if (!montadorId) return
    try {
      setLoading(true)
      const result = await fetchDetalheMontador(montadorId)
      setData(result)
    } catch (e: any) {
      toast.error('Erro ao carregar detalhes: ' + (e?.message || 'desconhecido'))
      setData([])
    } finally {
      setLoading(false)
    }
  }, [montadorId])

  useEffect(() => {
    if (open && montadorId) {
      loadData()
    }
    if (!open) {
      setData([])
    }
  }, [open, montadorId, loadData])

  const totalMontagens = data.length
  const totalHoras = data.reduce((sum, d) => sum + (d.duracao_horas || 0), 0)
  const emAndamento = data.filter((d) => d.em_andamento).length

  const formatDateTime = (iso: string | null): string => {
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col overflow-hidden">
        <SheetHeader className="px-5 py-4 border-b border-border shrink-0 space-y-2">
          <SheetTitle className="text-lg">{montadorNome ?? 'Montador'}</SheetTitle>
          <SheetDescription className="sr-only">
            Detalhamento de produtividade do montador
          </SheetDescription>
          <div className="flex flex-wrap gap-4 pt-1">
            <div className="flex items-center gap-1.5">
              <Package className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">
                <b>{totalMontagens}</b> montagens
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">
                <b>{formatDuracao(totalHoras)}</b> alocado
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-blue-500" />
              <span className="text-sm">
                <b>{emAndamento}</b> em andamento
              </span>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <Package className="w-10 h-10 mb-3 opacity-40" />
              <p>Nenhum histórico de alocação para este montador.</p>
            </div>
          ) : (
            <div className="bg-card rounded-md border border-border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50 sticky top-0">
                  <TableRow className="hover:bg-transparent border-border">
                    <TableHead className="font-semibold">Card</TableHead>
                    <TableHead className="font-semibold">Cliente</TableHead>
                    <TableHead className="font-semibold">Início</TableHead>
                    <TableHead className="font-semibold">Término</TableHead>
                    <TableHead className="font-semibold">Duração</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((d) => (
                    <TableRow key={d.card_id} className="hover:bg-muted/50 border-b border-border">
                      <TableCell className="font-medium text-sm">{d.card_nome}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {d.cliente_nome}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {formatDateTime(d.data_inicio)}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {d.em_andamento ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-500/15 text-blue-600">
                            Em andamento
                          </span>
                        ) : (
                          formatDateTime(d.data_fim)
                        )}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {d.em_andamento ? (
                          <span className="text-blue-600 font-medium">
                            {formatDuracao(d.duracao_horas)}
                          </span>
                        ) : (
                          formatDuracao(d.duracao_horas)
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
