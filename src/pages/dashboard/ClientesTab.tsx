import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  DollarSign,
  TrendingUp,
  ArrowDownRight,
  ArrowUpRight,
  Award,
  ShoppingBag,
  AlertCircle,
  HelpCircle,
  Percent,
  Clock,
  UserCheck,
} from 'lucide-react'
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import type { ClientesMetrics, RankingConsultorItem, ConsultorDesempenho } from './types'

type SortMode = 'valor' | 'ticket' | 'quantidade'
type DesempenhoSortMode = 'conversao' | 'ciclo' | 'leads' | 'vendidos'

export function ClientesTab({ data }: { data: ClientesMetrics }) {
  const [sortMode, setSortMode] = useState<SortMode>('valor')
  const [desempenhoSort, setDesempenhoSort] = useState<DesempenhoSortMode>('conversao')

  const {
    novos_clientes,
    valor_vendido,
    valor_vendido_fechado,
    ticket_medio,
    ticket_mediana,
    menor_ticket,
    maior_ticket,
    total_formularios_valor,
    total_formularios_vendidos,
    maior_ticket_percentual,
    ranking_consultores,
    por_consultor = [],
  } = data

  // Mediana e indicadores de distorção
  const medianaValor = ticket_mediana ?? ticket_medio
  const pctMaiorTicket =
    maior_ticket_percentual ?? (valor_vendido > 0 ? (maior_ticket / valor_vendido) * 100 : 0)
  // Avisar se um único registro tiver mais de 50% ou se houver grande discrepância entre média e mediana
  const isDistorcidoMaiorTicket = pctMaiorTicket >= 50
  const isDistorcidoMediaMediana = medianaValor > 0 && ticket_medio > medianaValor * 1.8

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(val || 0)

  const formatCurrencyFull = (val: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val || 0)

  // Consultores ordenados dinamicamente pelos 3 modos solicitados
  const sortedConsultores = useMemo(() => {
    const list = [...ranking_consultores]
    if (sortMode === 'valor') {
      return list.sort((a, b) => b.valor_total - a.valor_total)
    }
    if (sortMode === 'ticket') {
      return list.sort((a, b) => b.ticket_medio - a.ticket_medio)
    }
    if (sortMode === 'quantidade') {
      return list.sort((a, b) => b.vendas - a.vendas)
    }
    return list
  }, [ranking_consultores, sortMode])

  // Total de vendas fechadas somadas no ranking
  const totalContratos = ranking_consultores.reduce((acc, cur) => acc + cur.vendas, 0)

  // Consultores para o bloco de Desempenho (Taxa de Conversão & Ciclo Médio)
  const sortedDesempenho = useMemo(() => {
    const list = [...por_consultor]
    if (desempenhoSort === 'conversao') {
      return list.sort((a, b) => {
        if (b.taxa_conversao !== a.taxa_conversao) {
          return b.taxa_conversao - a.taxa_conversao
        }
        return b.vendidos - a.vendidos
      })
    }
    if (desempenhoSort === 'ciclo') {
      return list.sort((a, b) => {
        // ciclo menor é mais ágil, mas nulos ficam no final
        if (a.ciclo_medio_dias === null && b.ciclo_medio_dias === null) return 0
        if (a.ciclo_medio_dias === null) return 1
        if (b.ciclo_medio_dias === null) return -1
        return a.ciclo_medio_dias - b.ciclo_medio_dias
      })
    }
    if (desempenhoSort === 'leads') {
      return list.sort((a, b) => b.total_leads - a.total_leads)
    }
    if (desempenhoSort === 'vendidos') {
      return list.sort((a, b) => b.vendidos - a.vendidos)
    }
    return list
  }, [por_consultor, desempenhoSort])

  // Identificar consultor com melhor conversão:
  // - Elegíveis: total_leads >= 5 e vendidos >= 1
  // - Critério: maior taxa_conversao; desempate por mais vendidos
  // - Apenas UM consultor recebe o selo
  const melhorConversaoConsultor = useMemo(() => {
    const elegiveis = por_consultor.filter((c) => c.total_leads >= 5 && c.vendidos >= 1)
    if (elegiveis.length === 0) return null

    const ordenados = [...elegiveis].sort((a, b) => {
      if (b.taxa_conversao !== a.taxa_conversao) {
        return b.taxa_conversao - a.taxa_conversao
      }
      return b.vendidos - a.vendidos
    })

    return ordenados[0] || null
  }, [por_consultor])

  const totalLeadsPeriodo = por_consultor.reduce((acc, c) => acc + c.total_leads, 0)
  const totalVendidosPeriodo = por_consultor.reduce((acc, c) => acc + c.vendidos, 0)
  const taxaGeralPeriodo =
    totalLeadsPeriodo > 0 ? ((totalVendidosPeriodo / totalLeadsPeriodo) * 100).toFixed(1) : '0.0'

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Alerta de distorção de ticket caso um registro seja atípico */}
      {(isDistorcidoMaiorTicket || isDistorcidoMediaMediana) && (
        <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/70 dark:border-blue-900/40 dark:bg-blue-950/20 flex items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="text-foreground">
              {isDistorcidoMaiorTicket ? (
                <>
                  <strong>Atenção estatística:</strong> O maior ticket (
                  {formatCurrencyFull(maior_ticket)}) representa {pctMaiorTicket.toFixed(1)}% do
                  valor total. A <strong>mediana ({formatCurrency(medianaValor)})</strong> reflete
                  melhor o padrão habitual de vendas.
                </>
              ) : (
                <>
                  <strong>Variação de ticket:</strong> O ticket médio (
                  {formatCurrency(ticket_medio)}) está puxado por grandes projetos (maior:{' '}
                  {formatCurrency(maior_ticket)}). A{' '}
                  <strong>mediana ({formatCurrency(medianaValor)})</strong> representa o centro da
                  distribuição.
                </>
              )}
            </span>
          </div>
          <Badge
            variant="outline"
            className="border-blue-300 text-blue-700 dark:text-blue-300 bg-blue-100/50 shrink-0"
          >
            Mediana: {formatCurrency(medianaValor)}
          </Badge>
        </div>
      )}

      {/* 5 Cards de Métricas Principais: Novos Clientes, Formulários com Valor (ex-Valor Vendido), Ticket Médio + Mediana, Menor, Maior */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Novos Clientes
            </CardTitle>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-foreground">{novos_clientes}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Cadastrados no módulo Clientes</p>
          </CardContent>
        </Card>

        {/* Item 4: Distinção clara de Formulários com Valor vs Vendas Fechadas */}
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-1">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
                Total em Formulários
              </CardTitle>
              <TooltipProvider>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label="Detalhes de formulários com valor"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <HelpCircle className="h-3 w-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-xs">
                    <p className="font-bold">Formulários com Valor Preenchido</p>
                    <p className="text-muted-foreground mt-0.5">
                      Soma dos formulários comerciais com valor &gt; 0 (
                      {total_formularios_valor ?? 0} no total, dos quais{' '}
                      {total_formularios_vendidos ?? totalContratos} são de leads com status
                      &quot;Vendido&quot; somando{' '}
                      {formatCurrencyFull(valor_vendido_fechado ?? valor_vendido)}).
                    </p>
                  </TooltipContent>
                </UITooltip>
              </TooltipProvider>
            </div>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(valor_vendido)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center justify-between">
              <span>{total_formularios_valor ?? totalContratos} formulários c/ valor</span>
              {total_formularios_vendidos !== undefined && (
                <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                  ({total_formularios_vendidos} fechados)
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        {/* Item 4: Exibir Mediana junto do Ticket Médio */}
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Ticket Médio & Mediana
            </CardTitle>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-foreground">
              {formatCurrency(ticket_medio)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center justify-between">
              <span>
                Mediana: <strong className="text-foreground">{formatCurrency(medianaValor)}</strong>
              </span>
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Menor Ticket
            </CardTitle>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <ArrowDownRight className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
              {formatCurrency(menor_ticket)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Menor projeto formulado</p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Maior Ticket
            </CardTitle>
            <div className="p-2 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-teal-600 dark:text-teal-400">
              {formatCurrency(maior_ticket)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center justify-between">
              <span>Maior projeto</span>
              {pctMaiorTicket > 0 && (
                <span className="text-[10px] text-teal-700 dark:text-teal-300 font-semibold">
                  ({pctMaiorTicket.toFixed(0)}% do total)
                </span>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Seção Principal: Ranking de Consultores com Três Ordenações Alternáveis */}
      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-500" />
              Ranking de Consultores e Desempenho Comercial
            </CardTitle>
            <CardDescription>
              Volume de vendas, receita gerada, ticket médio e extremos por consultor
            </CardDescription>
          </div>

          {/* Botões das 3 Ordenações Alternáveis */}
          <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-lg border border-border">
            <Button
              size="sm"
              variant={sortMode === 'valor' ? 'default' : 'ghost'}
              className="h-8 text-xs font-medium gap-1 px-3"
              onClick={() => setSortMode('valor')}
            >
              <DollarSign className="h-3.5 w-3.5" />
              Por Valor
            </Button>
            <Button
              size="sm"
              variant={sortMode === 'ticket' ? 'default' : 'ghost'}
              className="h-8 text-xs font-medium gap-1 px-3"
              onClick={() => setSortMode('ticket')}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              Por Ticket Médio
            </Button>
            <Button
              size="sm"
              variant={sortMode === 'quantidade' ? 'default' : 'ghost'}
              className="h-8 text-xs font-medium gap-1 px-3"
              onClick={() => setSortMode('quantidade')}
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              Por Quantidade
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Gráfico Comparativo das 3 métricas */}
          <div className="h-[260px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={sortedConsultores}
                margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis
                  dataKey="consultor"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: 'currentColor' }}
                  angle={-20}
                  textAnchor="end"
                  height={45}
                  className="text-muted-foreground"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `R$ ${(val / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 11, fill: 'currentColor' }}
                  className="text-muted-foreground"
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const c = payload[0].payload as RankingConsultorItem
                      return (
                        <div className="bg-popover border border-border p-3 rounded-lg shadow-md text-xs space-y-1">
                          <p className="font-bold text-foreground">{c.consultor}</p>
                          <p className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            Total Vendido: {formatCurrencyFull(c.valor_total)}
                          </p>
                          <p className="text-purple-600 dark:text-purple-400">
                            Ticket Médio: {formatCurrencyFull(c.ticket_medio)}
                          </p>
                          <p className="text-blue-600 dark:text-blue-400">
                            Vendas Concluídas: <strong>{c.vendas}</strong>
                          </p>
                          <div className="pt-1 border-t border-border flex justify-between gap-4 text-muted-foreground">
                            <span>Menor: {formatCurrency(c.menor_ticket)}</span>
                            <span>Maior: {formatCurrency(c.maior_ticket)}</span>
                          </div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar
                  dataKey={
                    sortMode === 'valor'
                      ? 'valor_total'
                      : sortMode === 'ticket'
                        ? 'ticket_medio'
                        : 'valor_total'
                  }
                  name={sortMode === 'ticket' ? 'Ticket Médio (R$)' : 'Valor Vendido (R$)'}
                  fill={sortMode === 'ticket' ? '#8b5cf6' : '#10b981'}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Tabela Detalhada com Posição no Ranking */}
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border">
                <tr>
                  <th className="py-2.5 px-3 text-center w-12">#</th>
                  <th className="py-2.5 px-3">Consultor</th>
                  <th className="py-2.5 px-3 text-right">Formulários com Valor</th>
                  <th className="py-2.5 px-3 text-right">Total Vendido</th>
                  <th className="py-2.5 px-3 text-right">Ticket Médio</th>
                  <th className="py-2.5 px-3 text-right">Mediana</th>
                  <th className="py-2.5 px-3 text-right">Menor Ticket</th>
                  <th className="py-2.5 px-3 text-right">Maior Ticket</th>
                  <th className="py-2.5 px-3 text-center">Part. Receita</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {sortedConsultores.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted-foreground">
                      Nenhuma venda registrada no período selecionado
                    </td>
                  </tr>
                ) : (
                  sortedConsultores.map((c, index) => {
                    const share =
                      valor_vendido > 0 ? ((c.valor_total / valor_vendido) * 100).toFixed(1) : '0.0'

                    return (
                      <tr key={c.consultor} className="hover:bg-muted/40 transition-colors">
                        <td className="py-2.5 px-3 text-center">
                          {index === 0 ? (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white font-bold text-[10px]">
                              1
                            </span>
                          ) : index === 1 ? (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-400 text-white font-bold text-[10px]">
                              2
                            </span>
                          ) : index === 2 ? (
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-700 text-white font-bold text-[10px]">
                              3
                            </span>
                          ) : (
                            <span className="text-muted-foreground font-medium">{index + 1}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-foreground">{c.consultor}</td>
                        <td className="py-2.5 px-3 text-right font-medium">
                          <Badge variant="outline" className="font-semibold text-foreground">
                            {c.vendas} {c.vendas === 1 ? 'formulário' : 'formulários'}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrencyFull(c.valor_total)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-purple-600 dark:text-purple-400">
                          {formatCurrencyFull(c.ticket_medio)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-muted-foreground">
                          {formatCurrency(c.ticket_mediana ?? c.ticket_medio)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-muted-foreground">
                          {formatCurrency(c.menor_ticket)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-foreground">
                          {formatCurrency(c.maior_ticket)}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-foreground">
                          {share}%
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Seção Nova: Desempenho por Consultor (Taxa de Conversão e Ciclo Médio) */}
      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" />
              Desempenho por Consultor: Taxa de Conversão & Ciclo Médio
            </CardTitle>
            <CardDescription>
              Acompanhamento de eficiência comercial: volume de leads designados, vendas, taxa de
              conversão e velocidade de fechamento em dias
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-lg border border-border">
              <Button
                size="sm"
                variant={desempenhoSort === 'conversao' ? 'default' : 'ghost'}
                className="h-8 text-xs font-medium gap-1 px-3"
                onClick={() => setDesempenhoSort('conversao')}
              >
                <Percent className="h-3.5 w-3.5" />
                Por Conversão
              </Button>
              <Button
                size="sm"
                variant={desempenhoSort === 'ciclo' ? 'default' : 'ghost'}
                className="h-8 text-xs font-medium gap-1 px-3"
                onClick={() => setDesempenhoSort('ciclo')}
              >
                <Clock className="h-3.5 w-3.5" />
                Por Ciclo
              </Button>
              <Button
                size="sm"
                variant={desempenhoSort === 'leads' ? 'default' : 'ghost'}
                className="h-8 text-xs font-medium gap-1 px-3"
                onClick={() => setDesempenhoSort('leads')}
              >
                <Users className="h-3.5 w-3.5" />
                Por Leads
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Mini-Cards de Resumo de Conversão e Ciclo no Período */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="p-3.5 rounded-lg border border-border bg-muted/20 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase">
                  Leads Atribuídos
                </p>
                <p className="text-xl font-bold text-foreground mt-0.5">{totalLeadsPeriodo}</p>
                <p className="text-[10px] text-muted-foreground">distribuídos entre consultores</p>
              </div>
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Users className="h-4 w-4" />
              </div>
            </div>

            <div className="p-3.5 rounded-lg border border-border bg-muted/20 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase">
                  Total de Vendas
                </p>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {totalVendidosPeriodo}
                </p>
                <p className="text-[10px] text-muted-foreground">leads convertidos no período</p>
              </div>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <ShoppingBag className="h-4 w-4" />
              </div>
            </div>

            <div className="p-3.5 rounded-lg border border-border bg-muted/20 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase">
                  Conversão Geral
                </p>
                <p className="text-xl font-bold text-foreground mt-0.5">{taxaGeralPeriodo}%</p>
                <p className="text-[10px] text-muted-foreground">média da equipe no período</p>
              </div>
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Percent className="h-4 w-4" />
              </div>
            </div>
          </div>

          {/* Tabela de Desempenho por Consultor */}
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border">
                <tr>
                  <th className="py-2.5 px-3 text-center w-12">#</th>
                  <th className="py-2.5 px-3">Consultor</th>
                  <th className="py-2.5 px-3 text-right">Nº de Leads</th>
                  <th className="py-2.5 px-3 text-right">Vendidos</th>
                  <th className="py-2.5 px-3 text-right">Taxa de Conversão</th>
                  <th className="py-2.5 px-3 text-right">Ciclo Direto</th>
                  <th className="py-2.5 px-3 text-right">Ciclo c/ StandBy</th>
                  <th className="py-2.5 px-3 text-right">Valor Total</th>{' '}
                  <th className="py-2.5 px-3 text-right">Ticket Médio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {sortedDesempenho.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-muted-foreground">
                      Nenhum consultor com leads no período
                    </td>
                  </tr>
                ) : (
                  sortedDesempenho.map((item, idx) => {
                    const isTopConversion =
                      melhorConversaoConsultor !== null &&
                      item.consultor === melhorConversaoConsultor.consultor

                    return (
                      <tr key={item.consultor} className="hover:bg-muted/40 transition-colors">
                        <td className="py-2.5 px-3 text-center font-medium text-muted-foreground">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-foreground">
                          <div className="flex items-center gap-2">
                            <span>{item.consultor}</span>
                            {isTopConversion && (
                              <TooltipProvider>
                                <UITooltip>
                                  <TooltipTrigger asChild>
                                    <Badge
                                      variant="outline"
                                      className="border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 text-[10px] py-0 px-1.5 h-4 font-semibold cursor-default"
                                    >
                                      Melhor conversão
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs">
                                    <p>
                                      Maior taxa entre consultores com 5 leads ou mais no período
                                    </p>
                                  </TooltipContent>
                                </UITooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-foreground">
                          {item.total_leads}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                          {item.vendidos}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-foreground">
                          <span
                            className={
                              item.taxa_conversao >= 30
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : item.taxa_conversao > 0
                                  ? 'text-foreground'
                                  : 'text-muted-foreground'
                            }
                          >
                            {item.taxa_conversao.toLocaleString('pt-BR', {
                              minimumFractionDigits: 1,
                              maximumFractionDigits: 1,
                            })}
                            %
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-foreground">
                          {item.ciclo_medio_dias !== null && item.ciclo_medio_dias !== undefined ? (
                            <span className="inline-flex items-center gap-1 justify-end font-semibold text-blue-600 dark:text-blue-400">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              {item.ciclo_medio_dias.toLocaleString('pt-BR', {
                                minimumFractionDigits: 1,
                                maximumFractionDigits: 1,
                              })}{' '}
                              dias
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-foreground">
                          {item.ciclo_medio_com_standby !== null &&
                          item.ciclo_medio_com_standby !== undefined ? (
                            <span className="inline-flex items-center gap-1 justify-end font-semibold text-amber-600 dark:text-amber-400">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              {item.ciclo_medio_com_standby.toLocaleString('pt-BR', {
                                minimumFractionDigits: 1,
                                maximumFractionDigits: 1,
                              })}{' '}
                              dias
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-foreground">
                          {item.valor_total > 0 ? formatCurrencyFull(item.valor_total) : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-foreground">
                          {item.ticket_medio > 0 ? formatCurrencyFull(item.ticket_medio) : '—'}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
