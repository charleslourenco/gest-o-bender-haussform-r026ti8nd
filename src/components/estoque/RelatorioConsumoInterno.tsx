import { useEffect, useState, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Factory,
  Calendar,
  DollarSign,
  Package,
  Layers,
  Inbox,
  Loader2,
  RefreshCw,
  Search,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export interface ConsumoInternoItem {
  id: string
  item_id: string
  descricao: string
  marca: string | null
  unidade: string
  quantidade: number
  valor_unitario: number
  valor_total: number
  data_baixa: string | null
  baixado_por: string | null
  criado_em: string
}

function getDefaultPeriod() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate()
  return {
    inicio: `${year}-${month}-01`,
    fim: `${year}-${month}-${String(lastDay).padStart(2, '0')}`,
  }
}

function formatDate(iso: string | null) {
  if (!iso) return '-'
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return '-'
    return d.toLocaleDateString('pt-BR')
  } catch {
    return '-'
  }
}

export function RelatorioConsumoInterno() {
  const defaultDates = useMemo(() => getDefaultPeriod(), [])
  const [dataInicio, setDataInicio] = useState(defaultDates.inicio)
  const [dataFim, setDataFim] = useState(defaultDates.fim)
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(false)
  const [itens, setItens] = useState<ConsumoInternoItem[]>([])

  const carregarDados = useCallback(async () => {
    setLoading(true)
    try {
      // Alocações com destino = 'consumo_interno' e status = 'baixado' (ou baixado_em preenchido)
      let query = supabase
        .from('estoque_alocacoes')
        .select(
          `
          id,
          item_id,
          quantidade,
          status,
          destino,
          baixado_em,
          baixado_por,
          criado_em,
          valor_unitario_congelado,
          valor_total_congelado,
          item:estoque_itens(
            id,
            nome,
            marca,
            unidade,
            valor_unitario
          )
        `,
        )
        .eq('destino', 'consumo_interno')
        .eq('status', 'baixado')

      if (dataInicio) {
        query = query.gte('baixado_em', `${dataInicio}T00:00:00.000Z`)
      }
      if (dataFim) {
        query = query.lte('baixado_em', `${dataFim}T23:59:59.999Z`)
      }

      query = query.order('baixado_em', { ascending: false })

      const { data, error } = await query

      if (error) {
        console.error('Erro ao buscar consumo interno:', error)
        setItens([])
        return
      }

      const rows: ConsumoInternoItem[] = (data || []).map((row: any) => {
        const itemRel = Array.isArray(row.item) ? row.item[0] : row.item
        const qtd = Number(row.quantidade) || 0
        const unitItem = Number(itemRel?.valor_unitario) || 0
        const unit =
          row.valor_unitario_congelado !== null && row.valor_unitario_congelado !== undefined
            ? Number(row.valor_unitario_congelado)
            : unitItem
        const total =
          row.valor_total_congelado !== null && row.valor_total_congelado !== undefined
            ? Number(row.valor_total_congelado)
            : Math.round(qtd * unit * 100) / 100

        return {
          id: row.id,
          item_id: row.item_id,
          descricao: itemRel?.nome || 'Item não especificado',
          marca: itemRel?.marca || null,
          unidade: itemRel?.unidade || 'un',
          quantidade: qtd,
          valor_unitario: unit,
          valor_total: total,
          data_baixa: row.baixado_em || row.criado_em,
          baixado_por: row.baixado_por || null,
          criado_em: row.criado_em,
        }
      })

      setItens(rows)
    } catch (err) {
      console.error('Falha geral ao carregar consumo interno:', err)
      setItens([])
    } finally {
      setLoading(false)
    }
  }, [dataInicio, dataFim])

  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  const itensFiltrados = useMemo(() => {
    if (!busca.trim()) return itens
    const b = busca.toLowerCase().trim()
    return itens.filter(
      (it) =>
        it.descricao.toLowerCase().includes(b) ||
        (it.marca && it.marca.toLowerCase().includes(b)) ||
        (it.baixado_por && it.baixado_por.toLowerCase().includes(b)),
    )
  }, [itens, busca])

  const totalConsumidoPeriodo = useMemo(() => {
    return itensFiltrados.reduce((acc, it) => acc + (Number(it.valor_total) || 0), 0)
  }, [itensFiltrados])

  const totalQuantidadePeriodo = useMemo(() => {
    return itensFiltrados.reduce((acc, it) => acc + (Number(it.quantidade) || 0), 0)
  }, [itensFiltrados])

  const totalItensDistintos = useMemo(() => {
    return new Set(itensFiltrados.map((it) => it.item_id)).size
  }, [itensFiltrados])

  return (
    <div className="space-y-4">
      {/* Cabeçalho do Bloco / Relatório */}
      <Card className="border border-border/80 shadow-sm bg-card">
        <CardHeader className="pb-3 border-b border-border/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Factory className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Consumo Interno do Período</CardTitle>
                <CardDescription className="text-xs">
                  Materiais baixados para uso da fábrica e manutenção interna (não entram no DRE de
                  projetos de clientes).
                </CardDescription>
              </div>
            </div>
            <Badge
              variant="outline"
              className="w-fit text-xs font-medium border-amber-500/30 text-amber-700 dark:text-amber-300 bg-amber-500/5"
            >
              Somente Leitura • Fase 2
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          {/* Barra de Filtros: Período e Busca */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Data Inicial (Baixa)
              </label>
              <Input
                type="date"
                className="h-9 text-xs"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Data Final (Baixa)
              </label>
              <Input
                type="date"
                className="h-9 text-xs"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-1">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5" />
                Filtrar Item / Marca
              </label>
              <Input
                placeholder="Buscar por descrição..."
                className="h-9 text-xs"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 text-xs flex-1"
                onClick={() => {
                  const def = getDefaultPeriod()
                  setDataInicio(def.inicio)
                  setDataFim(def.fim)
                  setBusca('')
                }}
              >
                Mês Atual
              </Button>
              <Button
                variant="default"
                size="sm"
                className="h-9 text-xs"
                disabled={loading}
                onClick={carregarDados}
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
          </div>

          {/* Cards de Resumo de Totais */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="p-3 rounded-lg border border-border/80 bg-muted/30">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                Total Consumido no Período
              </span>
              <div className="mt-2 text-2xl font-bold text-foreground">
                {formatCurrency(totalConsumidoPeriodo)}
              </div>
              <span className="text-[11px] text-muted-foreground">
                Soma de valor total congelado das baixas
              </span>
            </div>

            <div className="p-3 rounded-lg border border-border/80 bg-muted/30">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                Quantidade de Itens Consumidos
              </span>
              <div className="mt-2 text-2xl font-bold text-foreground">
                {totalQuantidadePeriodo} un
              </div>
              <span className="text-[11px] text-muted-foreground">
                Volume físico total baixado para uso interno
              </span>
            </div>

            <div className="p-3 rounded-lg border border-border/80 bg-muted/30">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Materiais Distintos
              </span>
              <div className="mt-2 text-2xl font-bold text-foreground">{totalItensDistintos}</div>
              <span className="text-[11px] text-muted-foreground">
                Tipos de materiais utilizados na fábrica
              </span>
            </div>
          </div>

          {/* Tabela de Consumo ou Estado Vazio Amigável */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Registros de Baixa — Consumo Interno ({itensFiltrados.length})
              </h4>
              {loading && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                  Carregando...
                </div>
              )}
            </div>

            {itensFiltrados.length === 0 && !loading ? (
              <div className="p-10 text-center rounded-lg border border-dashed border-border/80 bg-muted/10 space-y-2">
                <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-2">
                  <Inbox className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-foreground">
                  Nenhum registro de consumo interno encontrado
                </p>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Alocações marcadas com o destino &quot;Consumo interno (uso da fábrica)&quot; que
                  forem baixadas no estoque aparecerão aqui com preço congelado e rastreabilidade
                  total.
                </p>
              </div>
            ) : (
              <div className="border border-border rounded-lg overflow-x-auto bg-background">
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-bold">Data da Baixa</TableHead>
                      <TableHead className="font-bold">Item / Descrição</TableHead>
                      <TableHead className="font-bold">Marca</TableHead>
                      <TableHead className="font-bold text-center">Qtd</TableHead>
                      <TableHead className="font-bold text-right">Valor Unit. Congelado</TableHead>
                      <TableHead className="font-bold text-right">Valor Total Congelado</TableHead>
                      <TableHead className="font-bold text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itensFiltrados.map((item) => (
                      <TableRow key={item.id} className="hover:bg-muted/40 transition-colors">
                        <TableCell className="whitespace-nowrap font-medium text-muted-foreground">
                          {formatDate(item.data_baixa)}
                        </TableCell>
                        <TableCell
                          className="font-semibold text-foreground max-w-[280px] truncate"
                          title={item.descricao}
                        >
                          {item.descricao}
                        </TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {item.marca || '-'}
                        </TableCell>
                        <TableCell className="text-center font-bold whitespace-nowrap">
                          {item.quantidade} {item.unidade}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap text-muted-foreground">
                          {formatCurrency(item.valor_unitario)}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap font-bold text-foreground">
                          {formatCurrency(item.valor_total)}
                        </TableCell>
                        <TableCell className="text-center whitespace-nowrap">
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
                          >
                            Consumo Interno
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {itensFiltrados.length > 0 && (
                      <TableRow className="bg-muted/70 font-bold border-t-2 border-border">
                        <TableCell
                          colSpan={3}
                          className="text-right text-xs uppercase tracking-wider"
                        >
                          TOTAL CONSUMIDO NO PERÍODO:
                        </TableCell>
                        <TableCell className="text-center text-xs font-extrabold text-foreground whitespace-nowrap">
                          {totalQuantidadePeriodo} un
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          —
                        </TableCell>
                        <TableCell className="text-right text-sm font-extrabold text-foreground whitespace-nowrap">
                          {formatCurrency(totalConsumidoPeriodo)}
                        </TableCell>
                        <TableCell />
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
