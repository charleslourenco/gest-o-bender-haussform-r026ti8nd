import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Layers,
  Users,
  Clock,
  AlertTriangle,
  Flame,
  Wrench,
  UserCheck,
  CheckCircle2,
  Workflow,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts'
import type { PcpMetrics } from './types'

const FASE_NOMES: Record<string, string> = {
  iniciar: 'Iniciar Análise',
  reuniao_analise: 'Reunião de Análise',
  medida_fina: 'Medida Fina',
  pendencia: 'Pendência',
  aguardando_liberacao: 'Aguardando Liberação',
  item_terceirizado: 'Item Terceirizado',
  montagem: 'Montagem',
  router: 'Router CNC',
  bancada: 'Bancada',
  aguardando_agenda: 'Aguardando Agenda',
  aguardando_plano_corte: 'Aguardando Plano de Corte',
  concluido: 'Concluído',
  caderno_tecnico: 'Caderno Técnico',
  inicio_montagem: 'Início Montagem',
}

export function PcpTab({ data }: { data: PcpMetrics }) {
  const {
    total_ambientes,
    total_clientes,
    ambientes_por_cliente,
    tempo_total_medio_dias,
    taxa_pendencias,
    fases_ambientes,
    tempo_fases,
    carga_analista,
    carga_montagem,
  } = data

  const formatFaseNome = (fase: string) => FASE_NOMES[fase] || fase.replace(/_/g, ' ')

  // Identificar gargalo real no tempo de fases (apenas com amostras >= 3 e media_dias válido)
  const gargaloItem = tempo_fases.find((f) => f.is_gargalo && f.media_dias !== null)

  // Filtrar fases que possuem dados reais para o gráfico
  const fasesComTempo = tempo_fases
    .filter((f) => f.media_dias !== null && f.transicoes_registradas > 0)
    .map((f) => ({
      ...f,
      media_dias: f.media_dias ?? 0,
    }))

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 4 Cards de Métricas Principais: Ambientes, Clientes PCP, Tempo Total Médio, Taxa Pendências */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Total de Ambientes
            </CardTitle>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Layers className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-foreground">{total_ambientes}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Distribuídos em <strong className="text-foreground">{total_clientes}</strong> clientes
              ({ambientes_por_cliente} amb/cliente)
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Clientes Ativos no PCP
            </CardTitle>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-foreground">{total_clientes}</div>
            <p className="text-xs text-muted-foreground mt-1">Projetos com ambientes em fluxo</p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Tempo Médio Total
            </CardTitle>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Clock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            {tempo_total_medio_dias !== null &&
            tempo_total_medio_dias !== undefined &&
            tempo_total_medio_dias > 0 ? (
              <>
                <div className="text-3xl font-extrabold text-foreground">
                  {tempo_total_medio_dias} <span className="text-base font-semibold">dias</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Ciclo médio real (entrada → conclusão de ambientes)
                </p>
              </>
            ) : (
              <>
                <div className="text-xl font-bold text-muted-foreground">Sem dados suficientes</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Aguardando histórico de conclusão no período
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Taxa de Pendências / Assistência
            </CardTitle>
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-rose-600 dark:text-rose-400">
              {taxa_pendencias}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Ambientes travados por pendências técnicas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Destaque Visual do Gargalo Real ou aviso se amostra for insuficiente */}
      {gargaloItem ? (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/70 dark:border-rose-900/50 dark:bg-rose-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-rose-600 text-white shadow-sm shrink-0">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs uppercase font-extrabold text-rose-700 dark:text-rose-300 tracking-wider">
                  Gargalo Operacional Real Identificado
                </span>
                <Badge variant="destructive" className="text-[10px] py-0 px-2">
                  Maior tempo com amostra confiável
                </Badge>
              </div>
              <p className="text-sm font-semibold text-foreground mt-0.5">
                Fase:{' '}
                <strong className="text-rose-700 dark:text-rose-300">
                  {formatFaseNome(gargaloItem.fase)}
                </strong>{' '}
                — Média real de{' '}
                <strong className="text-rose-700 dark:text-rose-300">
                  {gargaloItem.media_dias} dias
                </strong>{' '}
                ({gargaloItem.transicoes_registradas} transições registradas)
              </p>
            </div>
          </div>
          <div className="text-xs text-muted-foreground bg-background/80 dark:bg-background/40 px-3 py-1.5 rounded-md border border-border shrink-0">
            Calculado via transições reais em{' '}
            <code className="font-mono text-foreground">kanban_historico</code> (amostra &ge; 3)
          </div>
        </div>
      ) : (
        <div className="p-3.5 rounded-xl border border-border bg-muted/40 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            <strong>Gargalo Operacional:</strong> Sem dados suficientes de transições registradas no
            período para determinar o gargalo (mínimo de 3 transições por fase).
          </span>
          <Badge variant="outline" className="text-[10px]">
            Sem dados suficientes
          </Badge>
        </div>
      )}

      {/* Linha 1: Tempo Médio por Fase (kanban_historico) + Ambientes por Fase (fases reais) */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Tempo Médio por Fase com Destaque de Gargalo */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Tempo Médio por Fase (em dias)
            </CardTitle>
            <CardDescription>
              Média de permanência calculada pelo histórico de movimentações kanban
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[320px] w-full pt-2">
              {fasesComTempo.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-sm text-muted-foreground gap-2">
                  <Clock className="h-8 w-8 text-muted-foreground/50" />
                  <p className="font-medium">Sem dados suficientes de transições</p>
                  <p className="text-xs text-muted-foreground max-w-xs text-center">
                    Não há transições kanban suficientes no período selecionado para calcular o
                    tempo médio por fase.
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={fasesComTempo}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                    <XAxis
                      type="number"
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${v}d`}
                      tick={{ fontSize: 11, fill: 'currentColor' }}
                      className="text-muted-foreground"
                    />
                    <YAxis
                      dataKey="fase"
                      type="category"
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={formatFaseNome}
                      width={130}
                      tick={{ fontSize: 11, fill: 'currentColor' }}
                      className="text-muted-foreground"
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload as any
                          return (
                            <div className="bg-popover border border-border p-2.5 rounded shadow-md text-xs space-y-1">
                              <p className="font-bold text-foreground">
                                {formatFaseNome(item.fase)}
                              </p>
                              <p
                                className={
                                  item.is_gargalo ? 'text-rose-600 font-bold' : 'text-primary'
                                }
                              >
                                Tempo Médio: <strong>{item.media_dias} dias</strong>
                              </p>
                              <p className="text-muted-foreground text-[10px]">
                                Base: {item.transicoes_registradas} transições registradas
                              </p>
                              {item.is_gargalo && (
                                <Badge variant="destructive" className="text-[10px] py-0 mt-1">
                                  Principal Gargalo Operacional
                                </Badge>
                              )}
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Bar dataKey="media_dias" name="Dias" radius={[0, 4, 4, 0]}>
                      {fasesComTempo.map((entry, index) => (
                        <Cell
                          key={`cell-tempo-${index}`}
                          fill={entry.is_gargalo ? '#ef4444' : '#6366f1'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Ambientes por Fase Real (Snapshot atual do fluxo) */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Workflow className="h-4 w-4 text-primary" />
              Ambientes por Fase do Processo
            </CardTitle>
            <CardDescription>
              Volume real atual de cada etapa no chão de fábrica e engenharia
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[320px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={fases_ambientes}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                  <XAxis
                    type="number"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: 'currentColor' }}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    dataKey="fase"
                    type="category"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatFaseNome}
                    width={130}
                    tick={{ fontSize: 11, fill: 'currentColor' }}
                    className="text-muted-foreground"
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload as any
                        const pct =
                          total_ambientes > 0
                            ? ((item.count / total_ambientes) * 100).toFixed(1)
                            : '0'
                        return (
                          <div className="bg-popover border border-border p-2.5 rounded shadow text-xs space-y-1">
                            <p className="font-bold text-foreground">{formatFaseNome(item.fase)}</p>
                            <p className="text-primary">
                              Ambientes: <strong>{item.count}</strong> ({pct}%)
                            </p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Bar dataKey="count" name="Ambientes" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Linha 2: Carga por Analista Técnico + Carga por Equipe de Montagem Correta */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Carga por Analista */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-primary" />
              Carga por Analista Técnico
            </CardTitle>
            <CardDescription>
              Volume de ambientes e clientes sob responsabilidade de cada analista
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border">
                  <tr>
                    <th className="py-2.5 px-3">Analista Técnico</th>
                    <th className="py-2.5 px-3 text-right">Ambientes</th>
                    <th className="py-2.5 px-3 text-right">Clientes</th>
                    <th className="py-2.5 px-3 text-right">Média Amb/Cliente</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {carga_analista.map((item) => {
                    const media =
                      item.clientes > 0 ? (item.ambientes / item.clientes).toFixed(1) : '0.0'
                    return (
                      <tr key={item.analista} className="hover:bg-muted/40 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-foreground">
                          {item.analista}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-foreground">
                          {item.ambientes}
                        </td>
                        <td className="py-2.5 px-3 text-right text-muted-foreground font-medium">
                          {item.clientes}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-primary">{media}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Carga por Equipe de Montagem Correta */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Wrench className="h-4 w-4 text-emerald-600" />
              Carga por Equipe de Montagem
            </CardTitle>
            <CardDescription>Alocações ativas via montadores e escala de montagem</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border">
                  <tr>
                    <th className="py-2.5 px-3">Montador / Equipe</th>
                    <th className="py-2.5 px-3">Telefone</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Ambientes Alocados</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {carga_montagem.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-muted-foreground">
                        Nenhum montador cadastrado
                      </td>
                    </tr>
                  ) : (
                    carga_montagem.map((item) => (
                      <tr key={item.montador} className="hover:bg-muted/40 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-foreground">
                          {item.montador}
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground font-mono">
                          {item.telefone || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <Badge
                            variant="outline"
                            className={
                              item.status === 'Disponível'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                                : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
                            }
                          >
                            {item.status || 'Disponível'}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-foreground">
                          <span className="inline-flex items-center gap-1">
                            {item.ambientes_alocados > 0 && (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            )}
                            {item.ambientes_alocados}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
