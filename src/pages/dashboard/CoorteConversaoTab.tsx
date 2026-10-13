import { useState, useEffect, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Skeleton } from '@/components/ui/skeleton'
import {
  TrendingUp,
  Clock,
  Target,
  Users,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  Info,
  CalendarDays,
  Sparkles,
  GitBranch,
} from 'lucide-react'
import { fetchDadosCoorte, processarCoortes, RawLeadCoorte } from '@/services/coortes'

import { supabase } from '@/lib/supabase/client'
import { runWithAuthRecovery } from '@/lib/supabase/auth-recovery'
import type { AtendimentosMetrics, FullDashboardMetrics } from './types'

interface CoorteConversaoTabProps {
  atendimentosMetrics?: AtendimentosMetrics
}

export function CoorteConversaoTab({ atendimentosMetrics }: CoorteConversaoTabProps = {}) {
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [rawLeads, setRawLeads] = useState<RawLeadCoorte[]>([])
  const [historicoMap, setHistoricoMap] = useState<Set<string>>(new Set())
  const [historicoPerdasMap, setHistoricoPerdasMap] = useState<Map<string, string>>(new Map())

  // Métricas da RPC para leads comerciais válidos (fallback se não fornecido via prop)
  const [rpcAtendimentos, setRpcAtendimentos] = useState<AtendimentosMetrics | null>(
    atendimentosMetrics || null,
  )

  // Filtros
  const [consultorId, setConsultorId] = useState<string>('todos')
  const [origemFiltro, setOrigemFiltro] = useState<string>('todas')
  const [janelaMeses, setJanelaMeses] = useState<number>(12)

  const carregarDados = async () => {
    setLoading(true)
    setErrorMessage(null)
    try {
      const p1 = fetchDadosCoorte()
      // Se não recebemos as métricas via prop, busca diretamente via RPC com todo o histórico
      const p2 = atendimentosMetrics
        ? Promise.resolve(null)
        : runWithAuthRecovery<FullDashboardMetrics>(() =>
            supabase.rpc('get_dashboard_metrics', {
              p_start_date: null,
              p_end_date: null,
            }),
          )

      const [{ leads, historicoMap: hMap, historicoPerdasMap: pMap }, rpcRes] = await Promise.all([
        p1,
        p2,
      ])

      setRawLeads(leads)
      setHistoricoMap(hMap)
      setHistoricoPerdasMap(pMap)

      if (rpcRes?.data?.atendimentos) {
        setRpcAtendimentos(rpcRes.data.atendimentos)
      }
    } catch (err: unknown) {
      console.error('[CoorteConversaoTab] Erro ao carregar dados:', err)
      const msg =
        err instanceof Error
          ? err.message
          : 'Não foi possível carregar os dados de coortes. Verifique a conexão com o banco.'
      setErrorMessage(
        msg || 'Não foi possível carregar os dados de coortes. Verifique a conexão com o banco.',
      )
    } finally {
      setLoading(false)
    }
  }

  // Sincroniza se a prop mudar
  useEffect(() => {
    if (atendimentosMetrics) {
      setRpcAtendimentos(atendimentosMetrics)
    }
  }, [atendimentosMetrics])

  useEffect(() => {
    carregarDados()
  }, [])

  // Processar dados no cliente
  const resultado = useMemo(() => {
    return processarCoortes(rawLeads, historicoMap, {
      consultorId: consultorId === 'todos' ? null : consultorId,
      origem: origemFiltro === 'todas' ? null : origemFiltro,
      mesesJanela: janelaMeses,
      historicoPerdasMap,
    })
  }, [rawLeads, historicoMap, historicoPerdasMap, consultorId, origemFiltro, janelaMeses])

  const {
    coortes,
    max_defasagem,
    total_vendas_geral,
    total_chegados_geral,
    total_iniciaram_geral,
    total_perdidos_geral,
    total_abertos_geral,
    taxa_conversao_geral,
    consultores_disponiveis,
    origens_disponiveis,
  } = resultado

  // Valor de leads chegados a exibir no card:
  // Usa o valor da RPC get_dashboard_metrics para leads comerciais válidos.
  // Se não houver filtro na tela e as métricas da RPC estiverem disponíveis:
  // usa total_leads (ou performance_periodo.leads_chegados); se a prop fornecida veio do filtro do dashboard,
  // performance_periodo.leads_chegados reflete o período (ex: 30d -> 110, histórico -> 278).
  // Caso contrário ou se houver filtro específico ativo na coorte, mantém total_chegados_geral da coorte como fallback.
  const totalChegadosCard = useMemo(() => {
    if (rpcAtendimentos) {
      // Se não há filtro de consultor nem de origem específico aplicado na coorte:
      if (consultorId === 'todos' && origemFiltro === 'todas') {
        const rpcValor =
          rpcAtendimentos.performance_periodo?.leads_chegados ?? rpcAtendimentos.total_leads
        if (typeof rpcValor === 'number' && rpcValor > 0) {
          return rpcValor
        }
      }
    }
    return total_chegados_geral
  }, [rpcAtendimentos, consultorId, origemFiltro, total_chegados_geral])

  const subtituloChegadosCard = useMemo(() => {
    if (rpcAtendimentos && consultorId === 'todos' && origemFiltro === 'todas') {
      return 'Total histórico da esteira comercial (leads comerciais válidos)'
    }
    return 'Soma das safras exibidas (não excluídos)'
  }, [rpcAtendimentos, consultorId, origemFiltro])

  // Limpar filtros
  const handleLimparFiltros = () => {
    setConsultorId('todos')
    setOrigemFiltro('todas')
    setJanelaMeses(12)
  }

  const temFiltroAtivo = consultorId !== 'todos' || origemFiltro !== 'todas' || janelaMeses !== 12

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-24 w-full rounded-xl bg-muted" />
          <Skeleton className="h-24 w-full rounded-xl bg-muted" />
          <Skeleton className="h-24 w-full rounded-xl bg-muted" />
          <Skeleton className="h-24 w-full rounded-xl bg-muted" />
        </div>
        <Skeleton className="h-96 w-full rounded-xl bg-muted" />
      </div>
    )
  }

  if (errorMessage) {
    return (
      <Card className="border-destructive/30 bg-destructive/5 p-8 text-center max-w-xl mx-auto my-6">
        <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto mb-3">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-foreground mb-1">Erro ao carregar Coortes</h3>
        <p className="text-xs text-muted-foreground mb-4">{errorMessage}</p>
        <Button onClick={carregarDados} size="sm" variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Tentar novamente
        </Button>
      </Card>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Banner Explicativo de Coorte com Aviso de Maturidade */}
      <div className="p-4 rounded-xl border border-blue-200/80 bg-blue-50/70 dark:border-blue-900/50 dark:bg-blue-950/20 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-blue-600 text-white shrink-0 shadow-sm mt-0.5">
            <GitBranch className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs uppercase font-extrabold text-blue-900 dark:text-blue-300 tracking-wider">
                Análise de Coorte de Conversão
              </span>
              <Badge
                variant="outline"
                className="border-blue-300 text-blue-800 dark:text-blue-300 bg-blue-100/60 dark:bg-blue-900/40 text-[10px] font-bold"
              >
                Crédito ao Mês de Chegada (criado_em)
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-blue-950 dark:text-blue-100 mt-1 font-medium leading-relaxed">
              Os leads são agrupados pelo mês em que <strong>entraram no sistema</strong>. Quando um
              lead chegado em um mês fecha a venda meses depois, a venda é creditada à coorte de
              origem e distribuída nas colunas de defasagem (<strong>M+0, M+1, M+2...</strong>).
            </p>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2 self-stretch md:self-auto justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={carregarDados}
            className="text-xs gap-1.5 h-8 border-blue-300 hover:bg-blue-100 dark:border-blue-800"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Barra de Filtros: Consultor, Origem e Janela de Meses */}
      <Card className="border-border shadow-sm p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-muted-foreground mr-1">Filtros:</span>

            {/* Filtro Consultor */}
            <div className="min-w-[180px]">
              <Select value={consultorId} onValueChange={setConsultorId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Todos os consultores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos" className="text-xs">
                    Todos os Consultores ({consultores_disponiveis.length})
                  </SelectItem>
                  {consultores_disponiveis.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro Origem */}
            <div className="min-w-[160px]">
              <Select value={origemFiltro} onValueChange={setOrigemFiltro}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Todas as origens" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas" className="text-xs">
                    Todas as Origens ({origens_disponiveis.length})
                  </SelectItem>
                  {origens_disponiveis.map((orig) => (
                    <SelectItem key={orig} value={orig} className="text-xs">
                      {orig}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Janela de Meses */}
            <div className="min-w-[140px]">
              <Select
                value={String(janelaMeses)}
                onValueChange={(val) => setJanelaMeses(parseInt(val, 10))}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Janela de tempo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6" className="text-xs">
                    Últimos 6 meses
                  </SelectItem>
                  <SelectItem value="12" className="text-xs">
                    Últimos 12 meses
                  </SelectItem>
                  <SelectItem value="24" className="text-xs">
                    Últimos 24 meses
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {temFiltroAtivo && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLimparFiltros}
                className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1 px-2"
              >
                <RotateCcw className="h-3 w-3" />
                Limpar filtros
              </Button>
            )}
          </div>

          <div className="text-xs text-muted-foreground">
            Exibindo <strong>{coortes.length}</strong> safras mensais
          </div>
        </div>
      </Card>

      {/* 4 Cards Resumo das Coortes */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground">
              Total de Leads Chegados
            </CardTitle>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-extrabold text-foreground">
              {totalChegadosCard}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 font-medium">
              {subtituloChegadosCard}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground">
              Iniciaram Consultoria
            </CardTitle>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <CalendarDays className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-extrabold text-foreground">
              {total_iniciaram_geral}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 font-medium">
              Leads que entraram no funil consultivo
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground">
              Vendas Creditadas às Safras
            </CardTitle>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Target className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-extrabold text-foreground">
              {total_vendas_geral}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 font-medium">
              Leads com data_venda preenchida
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground">
              Conversão Geral da Coorte
            </CardTitle>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-extrabold text-purple-600 dark:text-purple-400">
              {taxa_conversao_geral}%
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 font-medium">
              Vendas totais ÷ Leads chegados no período
            </p>
          </CardContent>
        </Card>
      </div>

      {/* SEÇÃO 1: TABELA DE COORTES (FUNIL COMPLETO POR MÊS DE CHEGADA) */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3 border-b border-border/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                (1) Tabela de Coortes — Mês de Chegada (criado_em)
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Acompanhamento do destino final de cada grupo de leads conforme o mês de entrada.
                Vendas creditadas ao mês de chegada do lead.
              </CardDescription>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge
                variant="outline"
                className="text-[11px] py-0.5 px-2 border-amber-300 text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 font-semibold"
              >
                ⚠️ Coortes recentes em formação
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {coortes.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              Nenhuma coorte encontrada com os filtros selecionados.
            </div>
          ) : (
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border">
                <tr>
                  <th className="py-2.5 px-3">Mês de Chegada (Safra)</th>
                  <th className="py-2.5 px-3 text-right">Chegados</th>
                  <th className="py-2.5 px-3 text-right">Iniciaram Consultoria</th>
                  <th className="py-2.5 px-3 text-right">Vendidos</th>
                  <th className="py-2.5 px-3 text-right">Perdidos</th>
                  <th className="py-2.5 px-3 text-right">Em Aberto</th>
                  <th className="py-2.5 px-3 text-right font-bold text-foreground">
                    Conversão (Chegados)
                  </th>
                  <th className="py-2.5 px-3 text-right">Conv. (Consultoria)</th>
                  <th className="py-2.5 px-3 text-right">Ciclo Médio</th>
                  <th className="py-2.5 px-3 text-right">Ciclo Mediano</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {coortes.map((linha) => {
                  return (
                    <tr
                      key={linha.mes_iso}
                      className={`hover:bg-muted/40 transition-colors ${
                        linha.is_mes_corrente
                          ? 'bg-blue-50/30 dark:bg-blue-950/20 font-medium'
                          : linha.is_maturidade_recente
                            ? 'bg-amber-50/20 dark:bg-amber-950/10'
                            : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 font-semibold text-foreground">
                        <div className="flex items-center gap-2">
                          <span>{linha.mes_label}</span>
                          {linha.is_maturidade_recente && (
                            <TooltipProvider>
                              <UITooltip>
                                <TooltipTrigger asChild>
                                  <Badge
                                    variant="outline"
                                    className="text-[9px] py-0 px-1.5 border-amber-400 text-amber-800 dark:text-amber-300 bg-amber-100/60 dark:bg-amber-900/30 font-bold uppercase cursor-help"
                                  >
                                    {linha.is_mes_corrente ? 'Em formação' : 'Parcial'}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs text-xs">
                                  <p className="font-semibold">Coorte em formação</p>
                                  <p className="text-muted-foreground mt-0.5">
                                    Os leads desta safra ainda estão passando pelo ciclo de vendas.
                                    A conversão parcial tende a subir nos próximos meses.
                                  </p>
                                </TooltipContent>
                              </UITooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-right font-medium text-foreground">
                        {linha.total_chegados}
                      </td>

                      <td className="py-2.5 px-3 text-right text-indigo-600 dark:text-indigo-400 font-medium">
                        {linha.iniciaram_consultoria}
                      </td>

                      <td className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {linha.vendidos}
                      </td>

                      <td className="py-2.5 px-3 text-right text-rose-600 dark:text-rose-400">
                        {linha.perdidos}
                      </td>

                      <td className="py-2.5 px-3 text-right text-muted-foreground">
                        {linha.em_aberto}
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="font-extrabold text-foreground">
                            {linha.taxa_conversao}%
                          </span>
                          {linha.taxa_conversao >= 15 ? (
                            <span className="text-[10px] text-emerald-600 font-bold">▲</span>
                          ) : linha.is_maturidade_recente ? (
                            <span className="text-[10px] text-amber-500 font-bold">⏳</span>
                          ) : null}
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-right text-muted-foreground font-medium">
                        {linha.iniciaram_consultoria > 0
                          ? `${linha.taxa_conversao_consultoria}%`
                          : '—'}
                      </td>

                      <td className="py-2.5 px-3 text-right text-muted-foreground font-mono">
                        {linha.ciclo_medio_dias !== null
                          ? `${linha.ciclo_medio_dias.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} d`
                          : '—'}
                      </td>

                      <td className="py-2.5 px-3 text-right text-muted-foreground font-mono">
                        {linha.ciclo_mediano_dias !== null
                          ? `${linha.ciclo_mediano_dias.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} d`
                          : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="bg-muted/30 border-t-2 border-border font-bold text-foreground">
                <tr>
                  <td className="py-2.5 px-3">Total Consolidado</td>
                  <td className="py-2.5 px-3 text-right">{total_chegados_geral}</td>
                  <td className="py-2.5 px-3 text-right text-indigo-600 dark:text-indigo-400">
                    {total_iniciaram_geral}
                  </td>
                  <td className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400">
                    {total_vendas_geral}
                  </td>
                  <td className="py-2.5 px-3 text-right text-rose-600 dark:text-rose-400">
                    {total_perdidos_geral}
                  </td>
                  <td className="py-2.5 px-3 text-right">{total_abertos_geral}</td>
                  <td className="py-2.5 px-3 text-right text-purple-600 dark:text-purple-400 font-extrabold">
                    {taxa_conversao_geral}%
                  </td>
                  <td className="py-2.5 px-3 text-right text-muted-foreground">
                    {total_iniciaram_geral > 0
                      ? `${(Math.round((total_vendas_geral / total_iniciaram_geral) * 1000) / 10).toFixed(1)}%`
                      : '—'}
                  </td>
                  <td className="py-2.5 px-3 text-right text-muted-foreground">—</td>
                  <td className="py-2.5 px-3 text-right text-muted-foreground">—</td>
                </tr>
              </tfoot>
            </table>
          )}
        </CardContent>
      </Card>

      {/* SEÇÃO 2: MATRIZ DE DEFASAGEM (M+0, M+1, M+2...) */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3 border-b border-border/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                (2) Matriz de Defasagem de Vendas (M+0, M+1, M+2...)
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Distribuição das vendas pelo tempo decorrido entre a data de chegada do lead e a
                data do fechamento (data_venda − criado_em).
              </CardDescription>
            </div>
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground cursor-help self-start sm:self-auto">
                    <Info className="h-3.5 w-3.5" />
                    <span>O que é M+X?</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-xs">
                  <p className="font-semibold">Colunas de Defasagem (Meses)</p>
                  <p className="text-muted-foreground mt-0.5">
                    <strong>M+0:</strong> Venda fechada no próprio mês de chegada do lead.
                    <br />
                    <strong>M+1:</strong> Fechada 1 mês após a chegada.
                    <br />
                    <strong>M+2:</strong> Fechada 2 meses após a chegada, e assim por diante.
                  </p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {coortes.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              Sem dados disponíveis para a matriz de defasagem.
            </div>
          ) : (
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border">
                <tr>
                  <th className="py-2.5 px-3">Safra (Mês de Chegada)</th>
                  <th className="py-2.5 px-3 text-right">Chegados</th>
                  <th className="py-2.5 px-3 text-right font-bold text-foreground">Total Vendas</th>
                  {Array.from({ length: max_defasagem + 1 }).map((_, idx) => (
                    <th key={idx} className="py-2.5 px-3 text-center min-w-[70px]">
                      M+{idx}
                    </th>
                  ))}
                  <th className="py-2.5 px-3 text-right">Conversão Acumulada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {coortes.map((linha) => {
                  return (
                    <tr
                      key={`matriz-${linha.mes_iso}`}
                      className={`hover:bg-muted/40 transition-colors ${
                        linha.is_mes_corrente
                          ? 'bg-blue-50/30 dark:bg-blue-950/20'
                          : linha.is_maturidade_recente
                            ? 'bg-amber-50/20 dark:bg-amber-950/10'
                            : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 font-semibold text-foreground">
                        <div className="flex items-center gap-1.5">
                          <span>{linha.mes_label}</span>
                          {linha.is_maturidade_recente && (
                            <Badge
                              variant="outline"
                              className="text-[9px] py-0 px-1 border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950/30"
                            >
                              ⏳
                            </Badge>
                          )}
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-right font-medium text-foreground">
                        {linha.total_chegados}
                      </td>

                      <td className="py-2.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {linha.vendidos}
                      </td>

                      {Array.from({ length: max_defasagem + 1 }).map((_, mIdx) => {
                        const qtd = linha.vendas_por_defasagem[mIdx] || 0
                        const temVenda = qtd > 0
                        return (
                          <td key={mIdx} className="py-2.5 px-3 text-center">
                            {temVenda ? (
                              <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-extrabold text-xs">
                                {qtd}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/40 font-mono">—</span>
                            )}
                          </td>
                        )
                      })}

                      <td className="py-2.5 px-3 text-right font-extrabold text-purple-600 dark:text-purple-400">
                        {linha.taxa_conversao}%
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="bg-muted/30 border-t-2 border-border font-bold text-foreground">
                <tr>
                  <td className="py-2.5 px-3">Total Vendas por Defasagem</td>
                  <td className="py-2.5 px-3 text-right">{total_chegados_geral}</td>
                  <td className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400">
                    {total_vendas_geral}
                  </td>
                  {Array.from({ length: max_defasagem + 1 }).map((_, mIdx) => {
                    const somaCol = coortes.reduce(
                      (acc, c) => acc + (c.vendas_por_defasagem[mIdx] || 0),
                      0,
                    )
                    return (
                      <td key={mIdx} className="py-2.5 px-3 text-center font-bold text-foreground">
                        {somaCol > 0 ? somaCol : '0'}
                      </td>
                    )
                  })}
                  <td className="py-2.5 px-3 text-right text-purple-600 dark:text-purple-400 font-extrabold">
                    {taxa_conversao_geral}%
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </CardContent>
      </Card>

      {/* SEÇÃO 3: NOTAS METODOLÓGICAS & REGRAS DE MATURIDADE */}
      <Card className="border-border/80 bg-muted/20">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-foreground uppercase tracking-wider">
            <Sparkles className="h-4 w-4 text-primary" />
            Notas Metodológicas e Regras Consolidadas
          </div>
          <div className="grid gap-2 sm:grid-cols-2 text-xs text-muted-foreground">
            <div className="space-y-1">
              <p>
                • <strong>Critério de Venda:</strong> Lead com <code>data_venda</code> preenchida
                (sem fallback para <code>criado_em</code>).
              </p>
              <p>
                • <strong>Crédito à Coorte:</strong> Toda venda é creditada ao mês de chegada (
                <code>criado_em</code>) do lead, independentemente de quando o fechamento ocorreu.
              </p>
            </div>
            <div className="space-y-1">
              <p>
                • <strong>Filtro de Exclusão:</strong> Leads marcados com{' '}
                <code>excluido = true</code> ficam 100% fora de todas as métricas.
              </p>
              <p>
                • <strong>Maturidade das Safras:</strong> Coortes com menos de 60 dias de existência
                ainda possuem leads vivos em negociação. A taxa final consolida após a maturação do
                ciclo.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
