import { useState, useMemo } from 'react'
import { Transaction } from '@/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Calendar,
  Layers,
  ChevronRight,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  FileSpreadsheet,
  FolderKanban,
  AlertCircle,
} from 'lucide-react'

export type RegimeType = 'caixa' | 'competencia'

interface DRELayerBreakdown {
  receitaBruta: number
  impostos: number
  receitaLiquida: number
  custosDiretos: number
  lucroBruto: number
  despesasOperacionais: number
  ebitda: number
  resultadoFinanceiro: number
  resultadoLiquido: number
  margemBruta: number // lucroBruto / receitaBruta * 100
  margemEbitda: number // ebitda / receitaBruta * 100
  margemLiquida: number // resultadoLiquido / receitaBruta * 100
  // Detalhes por categoria ou lançamentos
  detalhesPorCategoria: {
    receita: Record<string, number>
    imposto: Record<string, number>
    custo_direto: Record<string, number>
    despesa_fixa: Record<string, number>
    financeiro: Record<string, number>
  }
}

function calculateDRE(
  transactions: Transaction[],
  regime: RegimeType,
  targetMonth?: string,
): DRELayerBreakdown {
  const result: DRELayerBreakdown = {
    receitaBruta: 0,
    impostos: 0,
    receitaLiquida: 0,
    custosDiretos: 0,
    lucroBruto: 0,
    despesasOperacionais: 0,
    ebitda: 0,
    resultadoFinanceiro: 0,
    resultadoLiquido: 0,
    margemBruta: 0,
    margemEbitda: 0,
    margemLiquida: 0,
    detalhesPorCategoria: {
      receita: {},
      imposto: {},
      custo_direto: {},
      despesa_fixa: {},
      financeiro: {},
    },
  }

  transactions.forEach((t) => {
    const statusLower = (t.status || '').toLowerCase()
    if (statusLower === 'a_classificar' || statusLower === 'agrupado') return

    // Regime filter:
    // Caixa = data_pagamento (paidDate). Se não tiver pago, ignora para regime de caixa estrito.
    // Competência = data_vencimento (dueDate). Se não tiver vencimento, fallback para data de criação ou ignora.
    let dateStr: string | null = null
    if (regime === 'caixa') {
      dateStr = t.paidDate || null
    } else {
      dateStr = t.dueDate || (t.createdAt ? t.createdAt.substring(0, 10) : null)
    }

    if (!dateStr) return

    const month = dateStr.substring(0, 7)
    if (targetMonth && month !== targetMonth) return

    const amount = Math.abs(Number(t.amount) || 0)
    const categoryName = t.category || (t.type === 'receita' ? 'Vendas Gerais' : 'Despesas Gerais')

    // Determinar natureza contábil
    let nat = (t.natureza || '').toLowerCase()
    if (!nat) {
      if (t.type === 'receita') nat = 'receita'
      else nat = 'custo_direto'
    }

    if (nat === 'receita' || (t.type === 'receita' && nat !== 'financeiro')) {
      result.receitaBruta += amount
      result.detalhesPorCategoria.receita[categoryName] =
        (result.detalhesPorCategoria.receita[categoryName] || 0) + amount
    } else if (nat === 'imposto') {
      result.impostos += amount
      result.detalhesPorCategoria.imposto[categoryName] =
        (result.detalhesPorCategoria.imposto[categoryName] || 0) + amount
    } else if (nat === 'custo_direto') {
      result.custosDiretos += amount
      result.detalhesPorCategoria.custo_direto[categoryName] =
        (result.detalhesPorCategoria.custo_direto[categoryName] || 0) + amount
    } else if (nat === 'despesa_fixa') {
      result.despesasOperacionais += amount
      result.detalhesPorCategoria.despesa_fixa[categoryName] =
        (result.detalhesPorCategoria.despesa_fixa[categoryName] || 0) + amount
    } else if (nat === 'financeiro') {
      if (t.type === 'receita') {
        result.resultadoFinanceiro += amount
      } else {
        result.resultadoFinanceiro -= amount
      }
      result.detalhesPorCategoria.financeiro[categoryName] =
        (result.detalhesPorCategoria.financeiro[categoryName] || 0) + amount
    } else {
      // Fallback para despesa operacional se não reconhecido
      result.despesasOperacionais += amount
      result.detalhesPorCategoria.despesa_fixa[categoryName] =
        (result.detalhesPorCategoria.despesa_fixa[categoryName] || 0) + amount
    }
  })

  // Camadas estruturadas DRE
  result.receitaLiquida = result.receitaBruta - result.impostos
  result.lucroBruto = result.receitaLiquida - result.custosDiretos
  result.ebitda = result.lucroBruto - result.despesasOperacionais
  result.resultadoLiquido = result.ebitda + result.resultadoFinanceiro

  if (result.receitaBruta > 0) {
    result.margemBruta = (result.lucroBruto / result.receitaBruta) * 100
    result.margemEbitda = (result.ebitda / result.receitaBruta) * 100
    result.margemLiquida = (result.resultadoLiquido / result.receitaBruta) * 100
  }

  return result
}

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
}

function formatPercent(val: number): string {
  return `${val >= 0 ? '+' : ''}${val.toFixed(1)}%`
}

function formatPercentBase(val: number, base: number): string {
  if (!base || base === 0) return '-'
  const pct = (val / base) * 100
  return `${pct.toFixed(1)}%`
}

function getMonthName(monthStr: string): string {
  if (!monthStr || !monthStr.includes('-')) return monthStr
  const [year, month] = monthStr.split('-')
  const months = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ]
  const idx = parseInt(month, 10) - 1
  return `${months[idx] || month}/${year}`
}

function getPreviousMonth(monthStr: string): string {
  if (!monthStr || !monthStr.includes('-')) return ''
  const [yearStr, mStr] = monthStr.split('-')
  let y = parseInt(yearStr, 10)
  let m = parseInt(mStr, 10) - 1
  if (m < 1) {
    m = 12
    y -= 1
  }
  return `${y}-${String(m).padStart(2, '0')}`
}

function getSameMonthLastYear(monthStr: string): string {
  if (!monthStr || !monthStr.includes('-')) return ''
  const [yearStr, mStr] = monthStr.split('-')
  const y = parseInt(yearStr, 10) - 1
  return `${y}-${mStr}`
}

function calcVariation(
  current: number,
  previous: number,
): { value: number; percent: number | null } {
  const diff = current - previous
  if (previous === 0) {
    return { value: diff, percent: current === 0 ? 0 : null }
  }
  const pct = (diff / Math.abs(previous)) * 100
  return { value: diff, percent: pct }
}

export interface ProjetoDRESummary {
  projetoId: string
  clienteNome: string
  projetoNome: string
  receita: number
  cpv: number
  margemValor: number
  margemPercent: number
  temCusto: boolean
  parcelasCount: number
  custosCount: number
}

export function FinanceiroDRE({ transactions }: { transactions: Transaction[] }) {
  const [regime, setRegime] = useState<RegimeType>('competencia')
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({})

  // Extrair todos os meses disponíveis de acordo com o regime escolhido
  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>()
    transactions.forEach((t) => {
      const statusLower = (t.status || '').toLowerCase()
      if (statusLower === 'a_classificar' || statusLower === 'agrupado') return

      let dateStr: string | null = null
      if (regime === 'caixa') {
        dateStr = t.paidDate || null
      } else {
        dateStr = t.dueDate || (t.createdAt ? t.createdAt.substring(0, 10) : null)
      }

      if (dateStr && dateStr.length >= 7) {
        monthSet.add(dateStr.substring(0, 7))
      }
    })

    return Array.from(monthSet).sort((a, b) => b.localeCompare(a))
  }, [transactions, regime])

  // Mês selecionado para o comparativo detalhado (default: mês mais recente disponível ou mês atual)
  const [selectedMonth, setSelectedMonth] = useState<string>('')

  // Sincronizar selectedMonth quando a lista de meses mudar
  const currentSelectedMonth = useMemo(() => {
    if (selectedMonth && availableMonths.includes(selectedMonth)) {
      return selectedMonth
    }
    const todayMonth = new Date().toISOString().substring(0, 7)
    if (availableMonths.includes(todayMonth)) {
      return todayMonth
    }
    return availableMonths[0] || todayMonth
  }, [selectedMonth, availableMonths])

  // Cálculo do DRE total acumulado
  const totalDRE = useMemo(() => {
    return calculateDRE(transactions, regime)
  }, [transactions, regime])

  // DRE por mês
  const monthlyDREs = useMemo(() => {
    return availableMonths.map((m) => ({
      month: m,
      dre: calculateDRE(transactions, regime, m),
    }))
  }, [availableMonths, transactions, regime])

  // Comparativo de período para o mês selecionado
  const comparativeData = useMemo(() => {
    const mAtual = currentSelectedMonth
    const mAnterior = getPreviousMonth(mAtual)
    const mAnoAnterior = getSameMonthLastYear(mAtual)

    const dreAtual = calculateDRE(transactions, regime, mAtual)
    const dreAnterior = calculateDRE(transactions, regime, mAnterior)
    const dreAnoAnterior = calculateDRE(transactions, regime, mAnoAnterior)

    return {
      mesAtual: mAtual,
      mesAnterior: mAnterior,
      mesAnoAnterior: mAnoAnterior,
      dreAtual,
      dreAnterior,
      dreAnoAnterior,
      varMesAnterior: {
        receitaBruta: calcVariation(dreAtual.receitaBruta, dreAnterior.receitaBruta),
        receitaLiquida: calcVariation(dreAtual.receitaLiquida, dreAnterior.receitaLiquida),
        lucroBruto: calcVariation(dreAtual.lucroBruto, dreAnterior.lucroBruto),
        ebitda: calcVariation(dreAtual.ebitda, dreAnterior.ebitda),
        resultadoLiquido: calcVariation(dreAtual.resultadoLiquido, dreAnterior.resultadoLiquido),
      },
      varAnoAnterior: {
        receitaBruta: calcVariation(dreAtual.receitaBruta, dreAnoAnterior.receitaBruta),
        receitaLiquida: calcVariation(dreAtual.receitaLiquida, dreAnoAnterior.receitaLiquida),
        lucroBruto: calcVariation(dreAtual.lucroBruto, dreAnoAnterior.lucroBruto),
        ebitda: calcVariation(dreAtual.ebitda, dreAnoAnterior.ebitda),
        resultadoLiquido: calcVariation(dreAtual.resultadoLiquido, dreAnoAnterior.resultadoLiquido),
      },
    }
  }, [currentSelectedMonth, transactions, regime])

  const toggleMonthExpand = (m: string) => {
    setExpandedMonths((prev) => ({ ...prev, [m]: !prev[m] }))
  }

  // DRE por Projeto: agrupar receitas e custos por projeto respeitando o regime e filtro de período já aplicado nas transações
  const drePorProjeto = useMemo(() => {
    const map = new Map<
      string,
      {
        projetoId: string
        clienteNome: string
        projetoNome: string
        receita: number
        cpv: number
        parcelasCount: number
        custosCount: number
      }
    >()

    // Somar CPV total global no período para verificar se há custos
    let totalCpvPeriodo = 0
    let totalCpvVinculado = 0
    let totalCpvNaoVinculado = 0
    let qtdCustosNaoVinculados = 0

    transactions.forEach((t) => {
      const statusLower = (t.status || '').toLowerCase()
      if (statusLower === 'a_classificar' || statusLower === 'agrupado') return

      let dateStr: string | null = null
      if (regime === 'caixa') {
        dateStr = t.paidDate || null
      } else {
        dateStr = t.dueDate || (t.createdAt ? t.createdAt.substring(0, 10) : null)
      }
      if (!dateStr) return

      const amount = Math.abs(Number(t.amount) || 0)

      let nat = (t.natureza || '').toLowerCase()
      if (!nat) {
        if (t.type === 'receita') nat = 'receita'
        else nat = 'custo_direto'
      }

      // Processar custos diretos (CPV)
      if (t.type === 'despesa' && nat === 'custo_direto') {
        totalCpvPeriodo += amount

        if (t.formulario_comercial_id) {
          totalCpvVinculado += amount
          const projId = t.formulario_comercial_id
          const cliNome = t.clienteNome || 'Cliente'
          const projNome = t.projetoNome || `Projeto #${projId.substring(0, 8).toUpperCase()}`

          const existing = map.get(projId)
          if (existing) {
            existing.cpv += amount
            existing.custosCount += 1
            if (
              existing.clienteNome === 'Cliente não identificado' &&
              cliNome !== 'Cliente não identificado'
            ) {
              existing.clienteNome = cliNome
            }
          } else {
            map.set(projId, {
              projetoId: projId,
              clienteNome: cliNome,
              projetoNome: projNome,
              receita: 0,
              cpv: amount,
              parcelasCount: 0,
              custosCount: 1,
            })
          }
        } else {
          totalCpvNaoVinculado += amount
          qtdCustosNaoVinculados += 1
        }
      }

      // Processar receitas
      if (nat === 'receita' || (t.type === 'receita' && nat !== 'financeiro')) {
        const projId = t.formulario_comercial_id || 'sem_projeto'
        const cliNome = t.clienteNome || t.entityName || 'Cliente não identificado'
        const projNome =
          t.projetoNome ||
          (t.formulario_comercial_id
            ? `Projeto #${t.formulario_comercial_id.substring(0, 8).toUpperCase()}`
            : 'Receitas sem projeto vinculado')

        const existing = map.get(projId)
        if (existing) {
          existing.receita += amount
          existing.parcelasCount += 1
          if (
            existing.clienteNome === 'Cliente não identificado' &&
            cliNome !== 'Cliente não identificado'
          ) {
            existing.clienteNome = cliNome
          }
          if (
            existing.projetoNome === 'Projeto sem vínculo' &&
            projNome !== 'Projeto sem vínculo'
          ) {
            existing.projetoNome = projNome
          }
        } else {
          map.set(projId, {
            projetoId: projId,
            clienteNome: cliNome,
            projetoNome: projNome,
            receita: amount,
            cpv: 0,
            parcelasCount: 1,
            custosCount: 0,
          })
        }
      }
    })

    const list: ProjetoDRESummary[] = Array.from(map.values()).map((item) => {
      const margemValor = item.receita - item.cpv
      const margemPercent =
        item.receita > 0 ? (margemValor / item.receita) * 100 : item.cpv > 0 ? -100 : 0
      const temCusto = item.cpv > 0
      return {
        ...item,
        margemValor,
        margemPercent,
        temCusto,
      }
    })

    // Ordenar decrescente por receita, depois por cpv se receita for igual
    list.sort((a, b) => {
      if (b.receita !== a.receita) return b.receita - a.receita
      return b.cpv - a.cpv
    })

    const totalReceita = list.reduce((acc, curr) => acc + curr.receita, 0)
    const totalCpv = list.reduce((acc, curr) => acc + curr.cpv, 0)
    const totalMargemValor = totalReceita - totalCpv
    const totalMargemPercent = totalReceita > 0 ? (totalMargemValor / totalReceita) * 100 : 0
    const totalParcelas = list.reduce((acc, curr) => acc + curr.parcelasCount, 0)
    const totalCustos = list.reduce((acc, curr) => acc + curr.custosCount, 0)

    return {
      itens: list,
      totalReceita,
      totalCpv,
      totalMargemValor,
      totalMargemPercent,
      totalParcelas,
      totalCustos,
      totalCpvPeriodo,
      totalCpvVinculado,
      totalCpvNaoVinculado,
      qtdCustosNaoVinculados,
    }
  }, [transactions, regime])

  function renderVariationBadge(
    v: { value: number; percent: number | null },
    isGoodWhenPositive = true,
  ) {
    if (v.percent === null) {
      if (v.value === 0) {
        return (
          <span className="inline-flex items-center text-xs text-muted-foreground font-medium">
            <Minus className="w-3 h-3 mr-0.5" /> 0%
          </span>
        )
      }
      return (
        <span className="inline-flex items-center text-xs font-semibold text-muted-foreground">
          {v.value > 0 ? '+Novo' : '-Novo'}
        </span>
      )
    }

    const isPositive = v.percent > 0
    const isZero = v.percent === 0
    if (isZero) {
      return (
        <span className="inline-flex items-center text-xs text-muted-foreground font-medium">
          <Minus className="w-3 h-3 mr-0.5" /> 0.0%
        </span>
      )
    }

    const isFavorable = isGoodWhenPositive ? isPositive : !isPositive
    const colorClass = isFavorable
      ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40'
      : 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40'

    return (
      <span
        className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold ${colorClass}`}
      >
        {isPositive ? (
          <ArrowUpRight className="w-3.5 h-3.5 mr-0.5 shrink-0" />
        ) : (
          <ArrowDownRight className="w-3.5 h-3.5 mr-0.5 shrink-0" />
        )}
        {Math.abs(v.percent).toFixed(1)}%
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header com Controles de Regime e Seleção de Mês */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-primary" />
                <CardTitle className="text-xl">
                  Demonstrativo do Resultado do Exercício (DRE)
                </CardTitle>
              </div>
              <CardDescription className="mt-1">
                Estrutura contábil em camadas gerenciais calculada a partir do plano de contas e
                natureza dos lançamentos.
              </CardDescription>
            </div>

            {/* Controles: Regime & Mês Comparativo */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center bg-muted/60 p-1 rounded-lg border">
                <span className="text-xs font-medium text-muted-foreground px-2">Regime:</span>
                <Tabs value={regime} onValueChange={(v) => setRegime(v as RegimeType)}>
                  <TabsList className="h-7 bg-background">
                    <TabsTrigger value="competencia" className="text-xs px-2.5 h-6">
                      Competência
                    </TabsTrigger>
                    <TabsTrigger value="caixa" className="text-xs px-2.5 h-6">
                      Caixa
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {availableMonths.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground font-medium">
                    Mês Comparativo:
                  </span>
                  <select
                    className="h-8 px-2.5 text-xs bg-background border rounded-md font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    value={currentSelectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                  >
                    {availableMonths.map((m) => (
                      <option key={m} value={m}>
                        {getMonthName(m)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Cards de Destaque da Estrutura Geral (Total Selecionado / Acumulado) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Receita Bruta Total</span>
              <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                {regime}
              </Badge>
            </div>
            <p className="text-2xl font-bold text-foreground mt-1.5">
              {formatCurrency(totalDRE.receitaBruta)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">100% da base faturada</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Lucro Bruto</span>
              <Badge
                variant="outline"
                className="text-[10px] font-semibold text-blue-600 dark:text-blue-400"
              >
                Margem {totalDRE.margemBruta.toFixed(1)}%
              </Badge>
            </div>
            <p className="text-2xl font-bold text-foreground mt-1.5">
              {formatCurrency(totalDRE.lucroBruto)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Após deduzir impostos e CPV</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>EBITDA / LAJIDA</span>
              <Badge
                variant="outline"
                className="text-[10px] font-semibold text-purple-600 dark:text-purple-400"
              >
                Margem {totalDRE.margemEbitda.toFixed(1)}%
              </Badge>
            </div>
            <p className="text-2xl font-bold text-foreground mt-1.5">
              {formatCurrency(totalDRE.ebitda)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Antes de resultado financeiro</p>
          </CardContent>
        </Card>

        <Card
          className={`border-l-4 shadow-sm ${
            totalDRE.resultadoLiquido >= 0 ? 'border-l-emerald-600' : 'border-l-rose-600'
          }`}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Resultado Líquido</span>
              <Badge
                variant="outline"
                className={`text-[10px] font-semibold ${
                  totalDRE.resultadoLiquido >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                Margem {totalDRE.margemLiquida.toFixed(1)}%
              </Badge>
            </div>
            <p
              className={`text-2xl font-bold mt-1.5 ${
                totalDRE.resultadoLiquido >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatCurrency(totalDRE.resultadoLiquido)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Resultado final do período</p>
          </CardContent>
        </Card>
      </div>

      {/* BLOCO 1: Comparativo de Período (Mês Atual vs Anterior vs Ano Anterior) */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3 border-b bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <CardTitle className="text-base font-semibold">
                Análise Comparativa — {getMonthName(comparativeData.mesAtual)}
              </CardTitle>
            </div>
            <span className="text-xs text-muted-foreground">
              Comparação direta com {getMonthName(comparativeData.mesAnterior)} e{' '}
              {getMonthName(comparativeData.mesAnoAnterior)}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="min-w-[220px] font-bold">Camada DRE</TableHead>
                  <TableHead className="text-right font-bold">
                    {getMonthName(comparativeData.mesAtual)} (Atual)
                  </TableHead>
                  <TableHead className="text-right">
                    {getMonthName(comparativeData.mesAnterior)} (Mês Ant.)
                  </TableHead>
                  <TableHead className="text-center">Var. Mês Ant.</TableHead>
                  <TableHead className="text-right">
                    {getMonthName(comparativeData.mesAnoAnterior)} (Ano Ant.)
                  </TableHead>
                  <TableHead className="text-center">Var. Ano Ant.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* 1. Receita Bruta */}
                <TableRow className="hover:bg-muted/50">
                  <TableCell className="font-semibold text-foreground">
                    Receita Bruta (natureza: receita)
                  </TableCell>
                  <TableCell className="text-right font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(comparativeData.dreAtual.receitaBruta)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatCurrency(comparativeData.dreAnterior.receitaBruta)}
                  </TableCell>
                  <TableCell className="text-center">
                    {renderVariationBadge(comparativeData.varMesAnterior.receitaBruta, true)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatCurrency(comparativeData.dreAnoAnterior.receitaBruta)}
                  </TableCell>
                  <TableCell className="text-center">
                    {renderVariationBadge(comparativeData.varAnoAnterior.receitaBruta, true)}
                  </TableCell>
                </TableRow>

                {/* 2. (-) Impostos sobre Vendas */}
                <TableRow className="text-sm text-muted-foreground">
                  <TableCell className="pl-6">
                    (-) Impostos sobre Vendas (natureza: imposto)
                  </TableCell>
                  <TableCell className="text-right text-purple-600 dark:text-purple-400">
                    {comparativeData.dreAtual.impostos > 0
                      ? `-${formatCurrency(comparativeData.dreAtual.impostos)}`
                      : formatCurrency(0)}
                  </TableCell>
                  <TableCell className="text-right">
                    {comparativeData.dreAnterior.impostos > 0
                      ? `-${formatCurrency(comparativeData.dreAnterior.impostos)}`
                      : formatCurrency(0)}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-xs text-muted-foreground">-</span>
                  </TableCell>
                  <TableCell className="text-right">
                    {comparativeData.dreAnoAnterior.impostos > 0
                      ? `-${formatCurrency(comparativeData.dreAnoAnterior.impostos)}`
                      : formatCurrency(0)}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-xs text-muted-foreground">-</span>
                  </TableCell>
                </TableRow>

                {/* Subtotal: Receita Líquida */}
                <TableRow className="bg-muted/30 font-medium">
                  <TableCell className="pl-4 font-semibold text-foreground">
                    (=) Receita Líquida
                  </TableCell>
                  <TableCell className="text-right font-semibold text-foreground">
                    {formatCurrency(comparativeData.dreAtual.receitaLiquida)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatCurrency(comparativeData.dreAnterior.receitaLiquida)}
                  </TableCell>
                  <TableCell className="text-center">
                    {renderVariationBadge(comparativeData.varMesAnterior.receitaLiquida, true)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatCurrency(comparativeData.dreAnoAnterior.receitaLiquida)}
                  </TableCell>
                  <TableCell className="text-center">
                    {renderVariationBadge(comparativeData.varAnoAnterior.receitaLiquida, true)}
                  </TableCell>
                </TableRow>

                {/* 3. (-) CPV / Custos Diretos */}
                <TableRow className="text-sm text-muted-foreground">
                  <TableCell className="pl-6">
                    (-) CPV / Custos Diretos (natureza: custo_direto)
                  </TableCell>
                  <TableCell className="text-right text-amber-600 dark:text-amber-400">
                    {comparativeData.dreAtual.custosDiretos > 0
                      ? `-${formatCurrency(comparativeData.dreAtual.custosDiretos)}`
                      : formatCurrency(0)}
                  </TableCell>
                  <TableCell className="text-right">
                    {comparativeData.dreAnterior.custosDiretos > 0
                      ? `-${formatCurrency(comparativeData.dreAnterior.custosDiretos)}`
                      : formatCurrency(0)}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-xs text-muted-foreground">-</span>
                  </TableCell>
                  <TableCell className="text-right">
                    {comparativeData.dreAnoAnterior.custosDiretos > 0
                      ? `-${formatCurrency(comparativeData.dreAnoAnterior.custosDiretos)}`
                      : formatCurrency(0)}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-xs text-muted-foreground">-</span>
                  </TableCell>
                </TableRow>

                {/* Subtotal: Lucro Bruto */}
                <TableRow className="bg-muted/40 font-semibold">
                  <TableCell className="pl-4 text-foreground">(=) Lucro Bruto</TableCell>
                  <TableCell className="text-right text-blue-600 dark:text-blue-400 font-bold">
                    {formatCurrency(comparativeData.dreAtual.lucroBruto)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatCurrency(comparativeData.dreAnterior.lucroBruto)}
                  </TableCell>
                  <TableCell className="text-center">
                    {renderVariationBadge(comparativeData.varMesAnterior.lucroBruto, true)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatCurrency(comparativeData.dreAnoAnterior.lucroBruto)}
                  </TableCell>
                  <TableCell className="text-center">
                    {renderVariationBadge(comparativeData.varAnoAnterior.lucroBruto, true)}
                  </TableCell>
                </TableRow>

                {/* 4. (-) Despesas Operacionais */}
                <TableRow className="text-sm text-muted-foreground">
                  <TableCell className="pl-6">
                    (-) Despesas Operacionais (natureza: despesa_fixa)
                  </TableCell>
                  <TableCell className="text-right text-rose-600 dark:text-rose-400">
                    {comparativeData.dreAtual.despesasOperacionais > 0
                      ? `-${formatCurrency(comparativeData.dreAtual.despesasOperacionais)}`
                      : formatCurrency(0)}
                  </TableCell>
                  <TableCell className="text-right">
                    {comparativeData.dreAnterior.despesasOperacionais > 0
                      ? `-${formatCurrency(comparativeData.dreAnterior.despesasOperacionais)}`
                      : formatCurrency(0)}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-xs text-muted-foreground">-</span>
                  </TableCell>
                  <TableCell className="text-right">
                    {comparativeData.dreAnoAnterior.despesasOperacionais > 0
                      ? `-${formatCurrency(comparativeData.dreAnoAnterior.despesasOperacionais)}`
                      : formatCurrency(0)}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-xs text-muted-foreground">-</span>
                  </TableCell>
                </TableRow>

                {/* Subtotal: EBITDA */}
                <TableRow className="bg-muted/40 font-semibold">
                  <TableCell className="pl-4 text-purple-700 dark:text-purple-400">
                    (=) EBITDA / LAJIDA
                  </TableCell>
                  <TableCell className="text-right text-purple-700 dark:text-purple-400 font-bold">
                    {formatCurrency(comparativeData.dreAtual.ebitda)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatCurrency(comparativeData.dreAnterior.ebitda)}
                  </TableCell>
                  <TableCell className="text-center">
                    {renderVariationBadge(comparativeData.varMesAnterior.ebitda, true)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatCurrency(comparativeData.dreAnoAnterior.ebitda)}
                  </TableCell>
                  <TableCell className="text-center">
                    {renderVariationBadge(comparativeData.varAnoAnterior.ebitda, true)}
                  </TableCell>
                </TableRow>

                {/* 5. (+/-) Resultado Financeiro */}
                <TableRow className="text-sm text-muted-foreground">
                  <TableCell className="pl-6">
                    (+/-) Resultado Financeiro (natureza: financeiro)
                  </TableCell>
                  <TableCell
                    className={`text-right ${
                      comparativeData.dreAtual.resultadoFinanceiro >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {formatCurrency(comparativeData.dreAtual.resultadoFinanceiro)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(comparativeData.dreAnterior.resultadoFinanceiro)}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-xs text-muted-foreground">-</span>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(comparativeData.dreAnoAnterior.resultadoFinanceiro)}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-xs text-muted-foreground">-</span>
                  </TableCell>
                </TableRow>

                {/* Final: Resultado Líquido */}
                <TableRow className="bg-primary/5 font-bold border-t-2 border-border">
                  <TableCell className="text-base text-foreground font-bold">
                    (=) Resultado Líquido
                  </TableCell>
                  <TableCell
                    className={`text-right text-base font-bold ${
                      comparativeData.dreAtual.resultadoLiquido >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {formatCurrency(comparativeData.dreAtual.resultadoLiquido)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground font-semibold">
                    {formatCurrency(comparativeData.dreAnterior.resultadoLiquido)}
                  </TableCell>
                  <TableCell className="text-center">
                    {renderVariationBadge(comparativeData.varMesAnterior.resultadoLiquido, true)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground font-semibold">
                    {formatCurrency(comparativeData.dreAnoAnterior.resultadoLiquido)}
                  </TableCell>
                  <TableCell className="text-center">
                    {renderVariationBadge(comparativeData.varAnoAnterior.resultadoLiquido, true)}
                  </TableCell>
                </TableRow>

                {/* Margem Líquida */}
                <TableRow className="text-xs text-muted-foreground">
                  <TableCell className="font-medium">
                    Margem Líquida (% sobre Receita Bruta)
                  </TableCell>
                  <TableCell className="text-right font-bold text-foreground">
                    {comparativeData.dreAtual.margemLiquida.toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-right">
                    {comparativeData.dreAnterior.margemLiquida.toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-center">-</TableCell>
                  <TableCell className="text-right">
                    {comparativeData.dreAnoAnterior.margemLiquida.toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-center">-</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* BLOCO 2: DRE em Camadas por Mês (Visão Histórica / Agrupamento Mensal) */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3 border-b bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-base font-semibold">
                DRE em Camadas — Histórico Mensal
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Abra cada mês para visualizar as camadas contábeis detalhadas e a composição por
                categoria.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8"
                onClick={() => {
                  const allOpen = monthlyDREs.every((m) => expandedMonths[m.month])
                  const nextState: Record<string, boolean> = {}
                  monthlyDREs.forEach((m) => {
                    nextState[m.month] = !allOpen
                  })
                  setExpandedMonths(nextState)
                }}
              >
                {monthlyDREs.every((m) => expandedMonths[m.month])
                  ? 'Recolher Todos'
                  : 'Expandir Todos'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {monthlyDREs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 text-muted-foreground/60" />
              Nenhum lançamento encontrado para o regime selecionado (
              {regime === 'caixa' ? 'Regime de Caixa' : 'Regime de Competência'}).
            </div>
          ) : (
            <div className="divide-y divide-border">
              {monthlyDREs.map(({ month, dre }) => {
                const isExpanded = !!expandedMonths[month]

                return (
                  <div key={month} className="transition-colors">
                    {/* Linha Resumo do Mês (Header do Acordeão) */}
                    <div
                      onClick={() => toggleMonthExpand(month)}
                      className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer hover:bg-muted/40"
                    >
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground transition-transform"
                          aria-label="Expandir mês"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-primary" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                        <div>
                          <span className="font-bold text-base text-foreground">
                            {getMonthName(month)}
                          </span>
                          <span className="text-xs text-muted-foreground ml-2">({month})</span>
                        </div>
                      </div>

                      {/* Métricas rápidas no header da linha */}
                      <div className="flex flex-wrap items-center gap-4 text-xs">
                        <div>
                          <span className="text-muted-foreground">Rec. Bruta: </span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(dre.receitaBruta)}
                          </span>
                        </div>
                        <div className="hidden sm:block text-muted-foreground/40">•</div>
                        <div>
                          <span className="text-muted-foreground">Lucro Bruto: </span>
                          <span className="font-semibold text-blue-600 dark:text-blue-400">
                            {formatCurrency(dre.lucroBruto)}
                          </span>
                          <span className="text-muted-foreground ml-1">
                            ({dre.margemBruta.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="hidden sm:block text-muted-foreground/40">•</div>
                        <div>
                          <span className="text-muted-foreground">EBITDA: </span>
                          <span className="font-semibold text-purple-600 dark:text-purple-400">
                            {formatCurrency(dre.ebitda)}
                          </span>
                          <span className="text-muted-foreground ml-1">
                            ({dre.margemEbitda.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="hidden sm:block text-muted-foreground/40">•</div>
                        <div>
                          <span className="text-muted-foreground">Resultado Líquido: </span>
                          <span
                            className={`font-bold ${
                              dre.resultadoLiquido >= 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {formatCurrency(dre.resultadoLiquido)}
                          </span>
                          <span className="text-muted-foreground ml-1">
                            ({dre.margemLiquida.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Conteúdo Expandido do Mês (Tabela Completa em Camadas) */}
                    {isExpanded && (
                      <div className="p-4 pt-0 bg-muted/10 border-t">
                        <div className="rounded-lg border bg-card overflow-hidden my-2">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/30 text-xs">
                                <TableHead className="w-[45%]">Estrutura DRE / Camada</TableHead>
                                <TableHead className="text-right w-[25%]">Valor (R$)</TableHead>
                                <TableHead className="text-right w-[15%]">
                                  % s/ Rec. Bruta
                                </TableHead>
                                <TableHead className="text-right w-[15%]">Margem</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody className="text-sm">
                              {/* 1. Receita Bruta */}
                              <TableRow className="font-semibold bg-emerald-500/5 hover:bg-emerald-500/10">
                                <TableCell className="text-emerald-700 dark:text-emerald-400 font-bold">
                                  (+) Receita Operacional Bruta
                                </TableCell>
                                <TableCell className="text-right text-emerald-600 dark:text-emerald-400 font-bold">
                                  {formatCurrency(dre.receitaBruta)}
                                </TableCell>
                                <TableCell className="text-right font-medium">100.0%</TableCell>
                                <TableCell className="text-right">-</TableCell>
                              </TableRow>

                              {/* Detalhes de Receita */}
                              {Object.entries(dre.detalhesPorCategoria.receita).map(
                                ([cat, val]) => (
                                  <TableRow
                                    key={`rec-${cat}`}
                                    className="text-xs text-muted-foreground"
                                  >
                                    <TableCell className="pl-8">{cat}</TableCell>
                                    <TableCell className="text-right">
                                      {formatCurrency(val)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {formatPercentBase(val, dre.receitaBruta)}
                                    </TableCell>
                                    <TableCell className="text-right">-</TableCell>
                                  </TableRow>
                                ),
                              )}

                              {/* 2. (-) Impostos sobre Vendas */}
                              <TableRow className="text-muted-foreground hover:bg-muted/30">
                                <TableCell className="pl-6 text-purple-700 dark:text-purple-400">
                                  (-) Impostos sobre Vendas (DAS / ICMS / ISS / PIS / COFINS)
                                </TableCell>
                                <TableCell className="text-right text-purple-600 dark:text-purple-400">
                                  {dre.impostos > 0
                                    ? `-${formatCurrency(dre.impostos)}`
                                    : formatCurrency(0)}
                                </TableCell>
                                <TableCell className="text-right">
                                  {dre.impostos > 0
                                    ? formatPercentBase(dre.impostos, dre.receitaBruta)
                                    : '0.0%'}
                                </TableCell>
                                <TableCell className="text-right">-</TableCell>
                              </TableRow>

                              {/* Detalhes de Impostos */}
                              {Object.entries(dre.detalhesPorCategoria.imposto).map(
                                ([cat, val]) => (
                                  <TableRow
                                    key={`imp-${cat}`}
                                    className="text-xs text-muted-foreground"
                                  >
                                    <TableCell className="pl-10">{cat}</TableCell>
                                    <TableCell className="text-right">
                                      -{formatCurrency(val)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {formatPercentBase(val, dre.receitaBruta)}
                                    </TableCell>
                                    <TableCell className="text-right">-</TableCell>
                                  </TableRow>
                                ),
                              )}

                              {/* Subtotal: Receita Líquida */}
                              <TableRow className="bg-muted/40 font-medium">
                                <TableCell className="pl-4 font-semibold text-foreground">
                                  (=) Receita Operacional Líquida
                                </TableCell>
                                <TableCell className="text-right font-semibold text-foreground">
                                  {formatCurrency(dre.receitaLiquida)}
                                </TableCell>
                                <TableCell className="text-right font-semibold">
                                  {formatPercentBase(dre.receitaLiquida, dre.receitaBruta)}
                                </TableCell>
                                <TableCell className="text-right">-</TableCell>
                              </TableRow>

                              {/* 3. (-) Custos Diretos / CPV */}
                              <TableRow className="text-muted-foreground hover:bg-muted/30">
                                <TableCell className="pl-6 text-amber-700 dark:text-amber-400">
                                  (-) Custos dos Produtos e Serviços Vendidos (CPV / Mão de Obra
                                  Direta)
                                </TableCell>
                                <TableCell className="text-right text-amber-600 dark:text-amber-400">
                                  {dre.custosDiretos > 0
                                    ? `-${formatCurrency(dre.custosDiretos)}`
                                    : formatCurrency(0)}
                                </TableCell>
                                <TableCell className="text-right">
                                  {dre.custosDiretos > 0
                                    ? formatPercentBase(dre.custosDiretos, dre.receitaBruta)
                                    : '0.0%'}
                                </TableCell>
                                <TableCell className="text-right">-</TableCell>
                              </TableRow>

                              {/* Detalhes de Custos Diretos */}
                              {Object.entries(dre.detalhesPorCategoria.custo_direto).map(
                                ([cat, val]) => (
                                  <TableRow
                                    key={`cpv-${cat}`}
                                    className="text-xs text-muted-foreground"
                                  >
                                    <TableCell className="pl-10">{cat}</TableCell>
                                    <TableCell className="text-right">
                                      -{formatCurrency(val)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {formatPercentBase(val, dre.receitaBruta)}
                                    </TableCell>
                                    <TableCell className="text-right">-</TableCell>
                                  </TableRow>
                                ),
                              )}

                              {/* Subtotal: Lucro Bruto */}
                              <TableRow className="bg-blue-500/10 font-bold">
                                <TableCell className="pl-4 text-blue-800 dark:text-blue-300">
                                  (=) Lucro Bruto
                                </TableCell>
                                <TableCell className="text-right text-blue-700 dark:text-blue-400 font-bold">
                                  {formatCurrency(dre.lucroBruto)}
                                </TableCell>
                                <TableCell className="text-right font-bold text-blue-700 dark:text-blue-400">
                                  {formatPercentBase(dre.lucroBruto, dre.receitaBruta)}
                                </TableCell>
                                <TableCell className="text-right font-bold text-blue-700 dark:text-blue-400">
                                  {dre.margemBruta.toFixed(1)}%
                                </TableCell>
                              </TableRow>

                              {/* 4. (-) Despesas Operacionais / Fixas */}
                              <TableRow className="text-muted-foreground hover:bg-muted/30">
                                <TableCell className="pl-6 text-rose-700 dark:text-rose-400">
                                  (-) Despesas Fixas e Operacionais (Administrativas, Comerciais,
                                  Gerais)
                                </TableCell>
                                <TableCell className="text-right text-rose-600 dark:text-rose-400">
                                  {dre.despesasOperacionais > 0
                                    ? `-${formatCurrency(dre.despesasOperacionais)}`
                                    : formatCurrency(0)}
                                </TableCell>
                                <TableCell className="text-right">
                                  {dre.despesasOperacionais > 0
                                    ? formatPercentBase(dre.despesasOperacionais, dre.receitaBruta)
                                    : '0.0%'}
                                </TableCell>
                                <TableCell className="text-right">-</TableCell>
                              </TableRow>

                              {/* Detalhes de Despesas Fixas */}
                              {Object.entries(dre.detalhesPorCategoria.despesa_fixa).map(
                                ([cat, val]) => (
                                  <TableRow
                                    key={`df-${cat}`}
                                    className="text-xs text-muted-foreground"
                                  >
                                    <TableCell className="pl-10">{cat}</TableCell>
                                    <TableCell className="text-right">
                                      -{formatCurrency(val)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {formatPercentBase(val, dre.receitaBruta)}
                                    </TableCell>
                                    <TableCell className="text-right">-</TableCell>
                                  </TableRow>
                                ),
                              )}

                              {/* Subtotal: EBITDA */}
                              <TableRow className="bg-purple-500/10 font-bold">
                                <TableCell className="pl-4 text-purple-800 dark:text-purple-300">
                                  (=) EBITDA (Resultado Operacional Antes dos Juros e Tributos)
                                </TableCell>
                                <TableCell className="text-right text-purple-700 dark:text-purple-400 font-bold">
                                  {formatCurrency(dre.ebitda)}
                                </TableCell>
                                <TableCell className="text-right font-bold text-purple-700 dark:text-purple-400">
                                  {formatPercentBase(dre.ebitda, dre.receitaBruta)}
                                </TableCell>
                                <TableCell className="text-right font-bold text-purple-700 dark:text-purple-400">
                                  {dre.margemEbitda.toFixed(1)}%
                                </TableCell>
                              </TableRow>

                              {/* 5. (+/-) Resultado Financeiro */}
                              <TableRow className="text-muted-foreground hover:bg-muted/30">
                                <TableCell className="pl-6 text-sky-700 dark:text-sky-400">
                                  (+/-) Resultado Financeiro Líquido (Tarifas, Rendimentos, Juros)
                                </TableCell>
                                <TableCell
                                  className={`text-right ${
                                    dre.resultadoFinanceiro >= 0
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : 'text-rose-600 dark:text-rose-400'
                                  }`}
                                >
                                  {formatCurrency(dre.resultadoFinanceiro)}
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatPercentBase(dre.resultadoFinanceiro, dre.receitaBruta)}
                                </TableCell>
                                <TableCell className="text-right">-</TableCell>
                              </TableRow>

                              {/* Final: Resultado Líquido do Exercício */}
                              <TableRow
                                className={`font-bold border-t-2 ${
                                  dre.resultadoLiquido >= 0
                                    ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                                    : 'bg-rose-500/10 text-rose-800 dark:text-rose-300'
                                }`}
                              >
                                <TableCell className="text-base font-bold">
                                  (=) Resultado Líquido do Mês
                                </TableCell>
                                <TableCell
                                  className={`text-right text-base font-bold ${
                                    dre.resultadoLiquido >= 0
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : 'text-rose-600 dark:text-rose-400'
                                  }`}
                                >
                                  {formatCurrency(dre.resultadoLiquido)}
                                </TableCell>
                                <TableCell className="text-right font-bold">
                                  {formatPercentBase(dre.resultadoLiquido, dre.receitaBruta)}
                                </TableCell>
                                <TableCell
                                  className={`text-right font-bold ${
                                    dre.resultadoLiquido >= 0
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : 'text-rose-600 dark:text-rose-400'
                                  }`}
                                >
                                  {dre.margemLiquida.toFixed(1)}%
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* BLOCO 2.5: PARTE 2 & 3 — DRE por Projeto (visão com CPV e Margem Reais por Projeto) */}
      <Card className="shadow-sm border-border/70">
        <CardHeader className="pb-3 border-b bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <FolderKanban className="w-5 h-5 text-primary" />
              <div>
                <CardTitle className="text-base font-semibold">
                  DRE por Projeto (Modelo Híbrido)
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Receita por projeto e cliente, custos vinculados via estoque ou manual e margem de
                  contribuição (Regime: {regime === 'caixa' ? 'Caixa' : 'Competência'}).
                </CardDescription>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <Badge variant="outline" className="font-normal bg-background">
                {drePorProjeto.itens.length}{' '}
                {drePorProjeto.itens.length === 1 ? 'projeto encontrado' : 'projetos encontrados'}
              </Badge>
              {drePorProjeto.totalCpvVinculado > 0 && (
                <Badge
                  variant="outline"
                  className="font-normal text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30"
                >
                  CPV Vinculado: {formatCurrency(drePorProjeto.totalCpvVinculado)}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Alerta informativo sobre custos pendentes de vínculo */}
          {drePorProjeto.totalCpvNaoVinculado > 0 && (
            <div className="p-3 bg-amber-500/10 border-b border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Atenção:</strong> Existem{' '}
                  <strong>{formatCurrency(drePorProjeto.totalCpvNaoVinculado)}</strong> em custos
                  diretos ({drePorProjeto.qtdCustosNaoVinculados} lançamentos no período){' '}
                  <strong>não vinculados a projeto</strong>.
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                Você pode vincular manualmente editando o lançamento em contas a pagar.
              </span>
            </div>
          )}

          {drePorProjeto.itens.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              <FolderKanban className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
              Nenhum projeto ou movimentação encontrada para o período e regime selecionados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 text-xs">
                    <TableHead className="font-bold min-w-[200px]">Cliente</TableHead>
                    <TableHead className="font-bold min-w-[220px]">Projeto</TableHead>
                    <TableHead className="text-right font-bold min-w-[130px]">Receita</TableHead>
                    <TableHead className="text-right font-bold min-w-[130px]">CPV</TableHead>
                    <TableHead className="text-right font-bold min-w-[140px]">
                      Margem (R$)
                    </TableHead>
                    <TableHead className="text-right font-bold min-w-[100px]">Margem (%)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-sm">
                  {drePorProjeto.itens.map((p) => {
                    const isSemProjeto = p.projetoId === 'sem_projeto'
                    return (
                      <TableRow key={p.projetoId} className="hover:bg-muted/40 transition-colors">
                        <TableCell className="font-medium text-foreground">
                          {p.clienteNome}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span
                              className={`font-semibold ${isSemProjeto ? 'text-muted-foreground italic' : 'text-foreground'}`}
                            >
                              {p.projetoNome}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {p.parcelasCount > 0 && (
                                <span>
                                  {p.parcelasCount} {p.parcelasCount === 1 ? 'receita' : 'receitas'}
                                </span>
                              )}
                              {p.parcelasCount > 0 && p.custosCount > 0 && <span> • </span>}
                              {p.custosCount > 0 && (
                                <span className="text-amber-700 dark:text-amber-400 font-medium">
                                  {p.custosCount}{' '}
                                  {p.custosCount === 1 ? 'custo vinculado' : 'custos vinculados'}
                                </span>
                              )}
                              {p.parcelasCount === 0 && p.custosCount === 0 && (
                                <span>Sem movimentações</span>
                              )}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(p.receita)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {p.cpv > 0 ? (
                            <span className="text-amber-600 dark:text-amber-400 font-medium">
                              -{formatCurrency(p.cpv)}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground/60">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-foreground">
                          <span
                            className={
                              p.margemValor >= 0
                                ? 'text-foreground'
                                : 'text-rose-600 dark:text-rose-400'
                            }
                          >
                            {formatCurrency(p.margemValor)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <span
                              className={`font-bold ${
                                p.margemPercent >= 0
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              {p.margemPercent.toFixed(1)}%
                            </span>
                            {!p.temCusto && (
                              <span
                                title="Sem CPV específico vinculado a este projeto no período"
                                className="inline-flex cursor-help text-muted-foreground hover:text-foreground"
                              >
                                <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
                {/* Rodapé com Totalizador Geral */}
                <tfoot>
                  <TableRow className="bg-muted/60 font-bold border-t-2 border-border text-foreground">
                    <TableCell className="font-bold">Total Projetos com Vínculo</TableCell>
                    <TableCell className="text-xs text-muted-foreground font-medium">
                      {drePorProjeto.itens.length}{' '}
                      {drePorProjeto.itens.length === 1 ? 'projeto' : 'projetos'} (
                      {drePorProjeto.totalParcelas} receitas / {drePorProjeto.totalCustos} custos)
                    </TableCell>
                    <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(drePorProjeto.totalReceita)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-amber-600 dark:text-amber-400">
                      {drePorProjeto.totalCpv > 0
                        ? `-${formatCurrency(drePorProjeto.totalCpv)}`
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {formatCurrency(drePorProjeto.totalMargemValor)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {drePorProjeto.totalMargemPercent.toFixed(1)}%
                    </TableCell>
                  </TableRow>
                </tfoot>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* BLOCO 3: Resumo Total Acumulado do Período */}
      <Card className="border-border/60 shadow-sm bg-muted/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center justify-between">
            <span>DRE Consolidado — Total Geral Acumulado</span>
            <Badge variant="secondary" className="font-normal text-xs">
              {regime === 'caixa' ? 'Regime de Caixa' : 'Regime de Competência'}
            </Badge>
          </CardTitle>
          <CardDescription className="text-xs">
            Visão consolidada de todas as camadas sobre o período filtrado.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="font-bold">Camada Geral</TableHead>
                  <TableHead className="text-right font-bold">Total Acumulado</TableHead>
                  <TableHead className="text-right font-bold">% sobre Rec. Bruta</TableHead>
                  <TableHead className="text-right font-bold">Margem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="font-semibold">
                  <TableCell className="text-emerald-700 dark:text-emerald-400 font-bold">
                    (+) Receita Bruta Total
                  </TableCell>
                  <TableCell className="text-right text-emerald-600 dark:text-emerald-400 font-bold">
                    {formatCurrency(totalDRE.receitaBruta)}
                  </TableCell>
                  <TableCell className="text-right">100.0%</TableCell>
                  <TableCell className="text-right">-</TableCell>
                </TableRow>

                <TableRow className="text-sm text-muted-foreground">
                  <TableCell className="pl-6">(-) Impostos sobre Vendas</TableCell>
                  <TableCell className="text-right text-purple-600 dark:text-purple-400">
                    {totalDRE.impostos > 0
                      ? `-${formatCurrency(totalDRE.impostos)}`
                      : formatCurrency(0)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatPercentBase(totalDRE.impostos, totalDRE.receitaBruta)}
                  </TableCell>
                  <TableCell className="text-right">-</TableCell>
                </TableRow>

                <TableRow className="bg-muted/20 font-medium">
                  <TableCell className="pl-4 font-semibold text-foreground">
                    (=) Receita Líquida
                  </TableCell>
                  <TableCell className="text-right font-semibold text-foreground">
                    {formatCurrency(totalDRE.receitaLiquida)}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatPercentBase(totalDRE.receitaLiquida, totalDRE.receitaBruta)}
                  </TableCell>
                  <TableCell className="text-right">-</TableCell>
                </TableRow>

                <TableRow className="text-sm text-muted-foreground">
                  <TableCell className="pl-6">(-) CPV / Custos Diretos</TableCell>
                  <TableCell className="text-right text-amber-600 dark:text-amber-400">
                    {totalDRE.custosDiretos > 0
                      ? `-${formatCurrency(totalDRE.custosDiretos)}`
                      : formatCurrency(0)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatPercentBase(totalDRE.custosDiretos, totalDRE.receitaBruta)}
                  </TableCell>
                  <TableCell className="text-right">-</TableCell>
                </TableRow>

                <TableRow className="bg-blue-500/10 font-bold">
                  <TableCell className="pl-4 text-blue-800 dark:text-blue-300">
                    (=) Lucro Bruto
                  </TableCell>
                  <TableCell className="text-right text-blue-700 dark:text-blue-400 font-bold">
                    {formatCurrency(totalDRE.lucroBruto)}
                  </TableCell>
                  <TableCell className="text-right font-bold text-blue-700 dark:text-blue-400">
                    {formatPercentBase(totalDRE.lucroBruto, totalDRE.receitaBruta)}
                  </TableCell>
                  <TableCell className="text-right font-bold text-blue-700 dark:text-blue-400">
                    {totalDRE.margemBruta.toFixed(1)}%
                  </TableCell>
                </TableRow>

                <TableRow className="text-sm text-muted-foreground">
                  <TableCell className="pl-6">(-) Despesas Operacionais / Fixas</TableCell>
                  <TableCell className="text-right text-rose-600 dark:text-rose-400">
                    {totalDRE.despesasOperacionais > 0
                      ? `-${formatCurrency(totalDRE.despesasOperacionais)}`
                      : formatCurrency(0)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatPercentBase(totalDRE.despesasOperacionais, totalDRE.receitaBruta)}
                  </TableCell>
                  <TableCell className="text-right">-</TableCell>
                </TableRow>

                <TableRow className="bg-purple-500/10 font-bold">
                  <TableCell className="pl-4 text-purple-800 dark:text-purple-300">
                    (=) EBITDA / LAJIDA
                  </TableCell>
                  <TableCell className="text-right text-purple-700 dark:text-purple-400 font-bold">
                    {formatCurrency(totalDRE.ebitda)}
                  </TableCell>
                  <TableCell className="text-right font-bold text-purple-700 dark:text-purple-400">
                    {formatPercentBase(totalDRE.ebitda, totalDRE.receitaBruta)}
                  </TableCell>
                  <TableCell className="text-right font-bold text-purple-700 dark:text-purple-400">
                    {totalDRE.margemEbitda.toFixed(1)}%
                  </TableCell>
                </TableRow>

                <TableRow className="text-sm text-muted-foreground">
                  <TableCell className="pl-6">(+/-) Resultado Financeiro Líquido</TableCell>
                  <TableCell
                    className={`text-right ${
                      totalDRE.resultadoFinanceiro >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {formatCurrency(totalDRE.resultadoFinanceiro)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatPercentBase(totalDRE.resultadoFinanceiro, totalDRE.receitaBruta)}
                  </TableCell>
                  <TableCell className="text-right">-</TableCell>
                </TableRow>

                <TableRow
                  className={`font-bold border-t-2 ${
                    totalDRE.resultadoLiquido >= 0
                      ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'
                      : 'bg-rose-500/15 text-rose-800 dark:text-rose-300'
                  }`}
                >
                  <TableCell className="text-base font-bold">
                    (=) Resultado Líquido Consolidado
                  </TableCell>
                  <TableCell
                    className={`text-right text-base font-bold ${
                      totalDRE.resultadoLiquido >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {formatCurrency(totalDRE.resultadoLiquido)}
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {formatPercentBase(totalDRE.resultadoLiquido, totalDRE.receitaBruta)}
                  </TableCell>
                  <TableCell
                    className={`text-right font-bold ${
                      totalDRE.resultadoLiquido >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {totalDRE.margemLiquida.toFixed(1)}%
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
