import { useState, useEffect, useCallback } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { ArrowUpDown, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  fetchProdutividadeMontadores,
  ProdutividadeMontador,
  formatTempoMedio,
} from '@/services/historico-montagem'
import { cn } from '@/lib/utils'

type SortField = 'cards_montados' | 'total_alocacoes' | 'tempo_medio_horas' | 'cards_em_andamento'

export function ProdutividadeMontagem() {
  const [data, setData] = useState<ProdutividadeMontador[]>([])
  const [loading, setLoading] = useState(true)
  const [sortField, setSortField] = useState<SortField>('cards_montados')
  const [sortDesc, setSortDesc] = useState(true)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const result = await fetchProdutividadeMontadores()
      setData(result)
    } catch (e: any) {
      toast.error('Erro ao carregar produtividade: ' + e.message)
      setData([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const sortedData = [...data].sort((a, b) => {
    const aVal = a[sortField]
    const bVal = b[sortField]
    if (aVal === null) return sortDesc ? 1 : -1
    if (bVal === null) return sortDesc ? -1 : 1
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDesc ? bVal - aVal : aVal - bVal
    }
    return sortDesc
      ? String(bVal).localeCompare(String(aVal))
      : String(aVal).localeCompare(String(bVal))
  })

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDesc(!sortDesc)
    } else {
      setSortField(field)
      setSortDesc(true)
    }
  }

  const SortHeader = ({
    field,
    label,
    className,
  }: {
    field: SortField
    label: string
    className?: string
  }) => (
    <TableHead className={cn('font-semibold', className)}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => toggleSort(field)}
        className="h-auto p-0 font-semibold hover:bg-transparent hover:text-foreground"
      >
        {label}
        <ArrowUpDown
          className={cn('w-3 h-3 ml-1.5', sortField === field ? 'opacity-100' : 'opacity-40')}
        />
      </Button>
    </TableHead>
  )

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
        ) : (
          <div className="bg-card rounded-md shadow-sm border border-border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead className="font-semibold">Montador</TableHead>
                  <SortHeader field="cards_montados" label="Cards Montados" />
                  <SortHeader field="total_alocacoes" label="Total de Alocações" />
                  <SortHeader field="tempo_medio_horas" label="Tempo Médio de Montagem" />
                  <SortHeader field="cards_em_andamento" label="Cards Em Andamento" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Nenhum montador encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedData.map((m) => (
                    <TableRow
                      key={m.montador_id}
                      className="hover:bg-muted/50 border-b border-border"
                    >
                      <TableCell className="font-medium">{m.montador_nome}</TableCell>
                      <TableCell className="text-sm">{m.cards_montados}</TableCell>
                      <TableCell className="text-sm">{m.total_alocacoes}</TableCell>
                      <TableCell className="text-sm">
                        {formatTempoMedio(m.tempo_medio_horas)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {m.cards_em_andamento > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-500/15 text-blue-600">
                            {m.cards_em_andamento}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
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
