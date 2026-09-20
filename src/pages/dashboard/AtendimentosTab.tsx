import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  Target,
  TrendingUp,
  CalendarDays,
  Clock,
  Sparkles,
  PieChart as PieIcon,
  BarChart3,
  AlertTriangle,
  Info,
} from 'lucide-react'
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  PieChart,
  Pie,
} from 'recharts'
import type { AtendimentosMetrics } from './types'

const ORIGIN_COLORS = [
  '#25d366', // whatsapp green
  '#e1306c', // instagram pink
  '#8b5cf6', // indicação purple
  '#0284c7', // recompra blue
  '#4285f4', // google blue
  '#f59e0b', // corretor amber
  '#f97316', // porta orange
  '#06b6d4', // arquiteto cyan
  '#3b82f6', // bender conecta blue
  '#10b981', // assistência emerald
  '#64748b', // a definir slate
]

const STATUS_LABELS: Record<string, { label: string; badge: string }> = {
  em_atendimento: {
    label: 'Em Atendimento',
    badge: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
  },
  aguardando_resposta: {
    label: 'Aguardando Resposta',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  },
  nao_informado: {
    label: 'Não Informado',
    badge: 'bg-muted text-muted-foreground',
  },
  // Fallbacks de compatibilidade caso haja legados
  não_informado: {
    label: 'Não Informado',
    badge: 'bg-muted text-muted-foreground',
  },
}

export function AtendimentosTab({ data }: { data: AtendimentosMetrics }) {
  const {
    total_leads,
    convertidos,
    taxa_conversao,
    media_dia,
    vendas_com_data_qtd,
    vendas_total_para_cobertura,
    status_atendimento,
    origens,
    evolucao_mensal,
    dias_semana,
  } = data

  // Achar melhor origem por conversão com pelo menos 1 lead (exceto 'A definir' para destacar canal real)
  const origensComLeads = origens.filter((o) => o.total > 0)
  const origensOficiaisValidas = origensComLeads.filter((o) => o.origem !== 'A definir')
  const melhorOrigem =
    [...origensOficiaisValidas].sort((a, b) => b.taxa - a.taxa)[0] || origensComLeads[0]

  // Dados do balde 'A definir' para Alerta de Dívida de Preenchimento (Item 3)
  const origemADefinir = origens.find((o) => o.origem === 'A definir')
  const temADefinirComLeads = origemADefinir && origemADefinir.total > 0

  // Cobertura de data_venda (Item 5)
  const qtdVendasData = vendas_com_data_qtd ?? 0
  const qtdVendasTotal = vendas_total_para_cobertura ?? convertidos

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Item 3: Alerta de Origem Não Informada ("A definir") - Dívida de preenchimento */}
      {temADefinirComLeads && (
        <div className="p-4 rounded-xl border border-amber-300/80 bg-amber-50/90 dark:border-amber-900/60 dark:bg-amber-950/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500 text-white shrink-0 shadow-sm mt-0.5 sm:mt-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs uppercase font-extrabold text-amber-800 dark:text-amber-300 tracking-wider">
                  Atenção: Origem Não Registrada
                </span>
                <Badge
                  variant="outline"
                  className="border-amber-400 text-amber-800 dark:text-amber-300 bg-amber-100/60 dark:bg-amber-900/40 text-[10px] py-0 px-2 font-bold"
                >
                  {origemADefinir.taxa}% de conversão
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-amber-900 dark:text-amber-200 mt-1 font-medium">
                Existem{' '}
                <strong className="font-extrabold text-amber-950 dark:text-amber-100">
                  {origemADefinir.total} leads comerciais
                </strong>{' '}
                cadastrados como &quot;A definir&quot; ({origemADefinir.convertidos} deles já
                viraram vendas). Como esses leads têm altíssima conversão, cobre o preenchimento da
                origem pela equipe para identificar quais canais estão gerando esse retorno.
              </p>
            </div>
          </div>
          <div className="shrink-0 text-xs text-amber-800 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-900/50 px-3 py-1.5 rounded-md border border-amber-200 dark:border-amber-800 font-semibold self-stretch sm:self-auto text-center">
            {origemADefinir.convertidos}/{origemADefinir.total} fechados
          </div>
        </div>
      )}

      {/* 4 Cards de Métricas Principais */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">
              Leads no Período
            </CardTitle>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Users className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-foreground">{total_leads}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 font-medium">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              Média de <strong className="text-foreground">{media_dia}</strong> leads por dia
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">
              Vendas Concluídas
            </CardTitle>
            <div className="flex items-center gap-1.5">
              {/* Item 5: Tooltip discreto de cobertura de data_venda */}
              <TooltipProvider>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label="Cobertura de dados de vendas"
                      className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-xs">
                    <p className="font-semibold">Cobertura de Data da Venda</p>
                    <p className="text-muted-foreground mt-0.5">
                      {qtdVendasData} de {qtdVendasTotal} vendas possuem a data registrada no lead.
                      Análises temporais por data de fechamento são parciais.
                    </p>
                  </TooltipContent>
                </UITooltip>
              </TooltipProvider>

              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Target className="h-5 w-5" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-foreground">{convertidos}</div>
            <p className="text-xs text-muted-foreground mt-1 font-medium flex items-center justify-between">
              <span>Leads comerciais convertidos</span>
              {qtdVendasTotal > 0 && (
                <span className="text-[10px] text-muted-foreground/80 font-normal">
                  ({qtdVendasData}/{qtdVendasTotal} c/ data)
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">
              Taxa de Conversão Geral
            </CardTitle>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-foreground">{taxa_conversao}%</div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              Proporção comercial total
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">
              Melhor Origem
            </CardTitle>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Sparkles className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate text-foreground">
              {melhorOrigem ? melhorOrigem.origem : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              {melhorOrigem ? (
                <>
                  <strong className="text-emerald-600 dark:text-emerald-400">
                    {melhorOrigem.taxa}%
                  </strong>{' '}
                  de conversão ({melhorOrigem.convertidos}/{melhorOrigem.total})
                </>
              ) : (
                'Sem leads no período'
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Linha 1: Gráfico de Evolução Mensal (Leads Entrados x Vendidos) + Status Atendimento */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Evolução Mensal: Leads Entrados × Vendidos
              </CardTitle>
              <CardDescription>Acompanhamento histórico recente mês a mês</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full pt-4">
              {evolucao_mensal.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  Sem dados para o período selecionado
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={evolucao_mensal}
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis
                      dataKey="mes"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12, fill: 'currentColor' }}
                      className="text-muted-foreground"
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12, fill: 'currentColor' }}
                      className="text-muted-foreground"
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const dataItem = payload[0].payload as any
                          const tx =
                            dataItem.leads > 0
                              ? ((dataItem.vendidos / dataItem.leads) * 100).toFixed(1)
                              : '0'
                          return (
                            <div className="bg-popover border border-border p-3 rounded-lg shadow-md text-xs space-y-1">
                              <p className="font-bold text-foreground">{dataItem.mes}</p>
                              <p className="text-blue-600 dark:text-blue-400">
                                Leads Entrados: <strong>{dataItem.leads}</strong>
                              </p>
                              <p className="text-emerald-600 dark:text-emerald-400">
                                Vendas Fechadas: <strong>{dataItem.vendidos}</strong>
                              </p>
                              <p className="text-muted-foreground font-medium pt-1 border-t border-border">
                                Conversão no mês: <strong>{tx}%</strong>
                              </p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Legend
                      verticalAlign="top"
                      height={36}
                      formatter={(value) => (
                        <span className="text-xs font-medium text-foreground">{value}</span>
                      )}
                    />
                    <Bar
                      dataKey="leads"
                      name="Leads Entrados"
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="vendidos"
                      name="Vendas Concluídas"
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Status de Atendimento */}
        <Card className="border-border shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Status de Atendimento
            </CardTitle>
            <CardDescription>Distribuição atual da triagem de leads</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            {status_atendimento.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
                Nenhum lead com status no período
              </div>
            ) : (
              <div className="space-y-3">
                {status_atendimento.map((item) => {
                  const meta = STATUS_LABELS[item.status] || {
                    label: item.status.replace(/_/g, ' '),
                    badge: 'bg-muted text-muted-foreground',
                  }
                  const pct = total_leads > 0 ? ((item.count / total_leads) * 100).toFixed(0) : '0'

                  return (
                    <div
                      key={item.status}
                      className="p-3 rounded-lg border border-border bg-muted/30 flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <span
                          className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-md ${meta.badge}`}
                        >
                          {meta.label}
                        </span>
                        <div className="text-xs text-muted-foreground">
                          {pct}% do total de leads
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xl font-extrabold text-foreground">{item.count}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Linha 2: Frequência por Dia da Semana + Tabela das 8 Origens Oficiais */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Leads por dia da semana */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              Frequência por Dia da Semana
            </CardTitle>
            <CardDescription>Dias com maior entrada de contatos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[260px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dias_semana} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis
                    dataKey="dia"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: 'currentColor' }}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: 'currentColor' }}
                    className="text-muted-foreground"
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload as any
                        return (
                          <div className="bg-popover border border-border p-2 rounded shadow text-xs">
                            <p className="font-bold text-foreground">{d.dia}</p>
                            <p className="text-blue-600 dark:text-blue-400">
                              Leads: <strong>{d.total}</strong>
                            </p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Bar dataKey="total" name="Leads" fill="#6366f1" radius={[4, 4, 0, 0]}>
                    {dias_semana.map((entry, index) => (
                      <Cell
                        key={`cell-dow-${index}`}
                        fill={
                          entry.total === Math.max(...dias_semana.map((d) => d.total))
                            ? '#4f46e5'
                            : '#818cf8'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Origens Oficiais × Conversão */}
        <Card className="lg:col-span-2 border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <PieIcon className="h-4 w-4 text-primary" />
                Origem × Conversão
              </CardTitle>
              <CardDescription>
                Relação entre canal de captação e taxa de fechamento de contratos
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-12 gap-4 items-center">
              {/* Gráfico Donut de Origens */}
              <div className="md:col-span-4 h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={origensComLeads}
                      dataKey="total"
                      nameKey="origem"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={2}
                    >
                      {origensComLeads.map((_, index) => (
                        <Cell
                          key={`cell-pie-${index}`}
                          fill={ORIGIN_COLORS[index % ORIGIN_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload as any
                          return (
                            <div className="bg-popover border border-border p-2 rounded shadow text-xs">
                              <p className="font-bold text-foreground">{item.origem}</p>
                              <p>Total: {item.total} leads</p>
                              <p className="text-emerald-600 font-semibold">
                                Vendas: {item.convertidos} ({item.taxa}%)
                              </p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Tabela de Origens Oficiais */}
              <div className="md:col-span-8 overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border">
                    <tr>
                      <th className="py-2 px-3">Origem Oficial</th>
                      <th className="py-2 px-3 text-right">Leads</th>
                      <th className="py-2 px-3 text-right">Vendas</th>
                      <th className="py-2 px-3 text-right">Conversão</th>
                      <th className="py-2 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {origens.map((item, idx) => (
                      <tr
                        key={item.origem}
                        className={`hover:bg-muted/30 transition-colors ${
                          item.origem === 'A definir' ? 'bg-amber-500/5' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 font-semibold text-foreground flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                            style={{ backgroundColor: ORIGIN_COLORS[idx % ORIGIN_COLORS.length] }}
                          />
                          <span className="flex items-center gap-1.5">
                            {item.origem}
                            {item.origem === 'A definir' && item.total > 0 && (
                              <Badge
                                variant="outline"
                                className="text-[9px] py-0 px-1.5 border-amber-300 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50"
                              >
                                Preenchimento pendente
                              </Badge>
                            )}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-foreground">
                          {item.total}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-emerald-600 dark:text-emerald-400">
                          {item.convertidos}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-foreground">
                          {item.taxa}%
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {item.taxa >= 30 ? (
                            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 hover:bg-emerald-100 text-[10px] py-0">
                              Alta
                            </Badge>
                          ) : item.taxa > 0 ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] py-0 text-amber-600 border-amber-300"
                            >
                              Média
                            </Badge>
                          ) : item.total > 0 ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] py-0 text-muted-foreground"
                            >
                              0%
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-[10px]">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
