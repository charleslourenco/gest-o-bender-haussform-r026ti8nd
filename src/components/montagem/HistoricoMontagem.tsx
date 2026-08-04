import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  fetchHistoricoMontagem,
  fetchMontadores,
  HistoricoMontagemRecord,
  MontadorOption,
} from '@/services/historico-montagem'
import { exportToCSV, formatDateForFilename } from '@/lib/csv-export'
import {
  HistoricoFilters,
  HistoricoFiltros,
  DEFAULT_FILTROS,
  applyFiltros,
} from './HistoricoFilters'

export function HistoricoMontagem() {
  const [records, setRecords] = useState<HistoricoMontagemRecord[]>([])
  const [montadores, setMontadores] = useState<MontadorOption[]>([])
  const [loading, setLoading] = useState(true)
  const [filtros, setFiltros] = useState<HistoricoFiltros>(DEFAULT_FILTROS)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [histData, montData] = await Promise.all([fetchHistoricoMontagem(), fetchMontadores()])
      setRecords(histData)
      setMontadores(montData)
    } catch (e: any) {
      toast.error('Erro ao carregar histórico: ' + e.message)
      setRecords([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filteredRecords = useMemo(() => applyFiltros(records, filtros), [records, filtros])

  const handleExport = () => {
    if (filteredRecords.length === 0) {
      toast.warning('Não há registros para exportar.')
      return
    }
    const headers = ['Data/Hora', 'Card', 'Montador', 'Ação', 'Cliente']
    const rows = filteredRecords.map((r) => [
      new Date(r.criado_em).toLocaleString('pt-BR'),
      r.card_nome || '-',
      r.montador_nome || '-',
      r.acao === 'alocado' ? 'Alocado' : 'Desalocado',
      r.cliente_nome || '-',
    ])
    exportToCSV(`historico-montagem-${formatDateForFilename()}.csv`, headers, rows)
    toast.success('Histórico exportado com sucesso!')
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-card shrink-0 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-foreground">Histórico de Montagem</h2>
          <Button
            size="sm"
            onClick={handleExport}
            disabled={loading || filteredRecords.length === 0}
          >
            <Download className="w-4 h-4 mr-1.5" />
            Exportar Histórico
          </Button>
        </div>
        <HistoricoFilters
          filtros={filtros}
          onChange={setFiltros}
          montadores={montadores}
          onClear={() => setFiltros(DEFAULT_FILTROS)}
        />
      </div>

      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="bg-card rounded-md shadow-sm border border-border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead className="font-semibold">Data/Hora</TableHead>
                  <TableHead className="font-semibold">Card</TableHead>
                  <TableHead className="font-semibold">Cliente</TableHead>
                  <TableHead className="font-semibold">Montador</TableHead>
                  <TableHead className="font-semibold">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Nenhum registro encontrado com os filtros atuais.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecords.map((r) => (
                    <TableRow key={r.id} className="hover:bg-muted/50 border-b border-border">
                      <TableCell className="whitespace-nowrap text-sm">
                        {new Date(r.criado_em).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>
                      <TableCell className="font-medium text-sm">{r.card_nome || '-'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {r.cliente_nome || '-'}
                      </TableCell>
                      <TableCell className="text-sm">{r.montador_nome || '-'}</TableCell>
                      <TableCell>
                        <span
                          className={
                            r.acao === 'alocado'
                              ? 'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/15 text-emerald-600'
                              : 'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-500/15 text-orange-600'
                          }
                        >
                          {r.acao === 'alocado' ? 'Alocado' : 'Desalocado'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}
