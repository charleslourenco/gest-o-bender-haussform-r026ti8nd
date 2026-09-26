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
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  BookOpen,
  Info,
} from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { DREProjetoSimplificado } from './DREProjetoSimplificado'

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

interface DateFilterPredicate {
  (dateStr: string): boolean
}

function calculateDRE(
  transactions: Transaction[],
  regime: RegimeType,
  dateFilter?: string | DateFilterPredicate,
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

  const safeList = Array.isArray(transactions) ? transactions : []

  safeList.forEach((t) => {
    if (!t) return
    const statusLower = (t.status || '').toLowerCase()
    if (statusLower === 'a_classificar' || statusLower === 'agrupado') return

    // Regime filter:
    let dateStr: string | null = null
    if (regime === 'caixa') {
      if (statusLower !== 'pago') return
      dateStr =
        t.paidDate ||
        t.dueDate ||
        (typeof t.createdAt === 'string' ? t.createdAt.substring(0, 10) : null)
    } else {
      dateStr = t.dueDate || (typeof t.createdAt === 'string' ? t.createdAt.substring(0, 10) : null)
    }

    if (!dateStr || typeof dateStr !== 'string' || dateStr.length < 7) return

    // Filtro de data: se for string, compara prefixo (ex: "2026-08" para mês ou "2026" para ano). Se for função, invoca.
    if (typeof dateFilter === 'function') {
      if (!dateFilter(dateStr)) return
    } else if (typeof dateFilter === 'string' && dateFilter) {
      if (!dateStr.startsWith(dateFilter)) return
    }

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
  const num = Number(val) || 0
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num)
}

function formatPercent(val: number): string {
  const num = Number(val)
  if (isNaN(num) || !isFinite(num)) return '+0.0%'
  return `${num >= 0 ? '+' : ''}${num.toFixed(1)}%`
}

function formatPercentBase(val: number, base: number): string {
  const b = Number(base) || 0
  const v = Number(val) || 0
  if (!b || b === 0) return '-'
  const pct = (v / b) * 100
  if (!isFinite(pct) || isNaN(pct)) return '-'
  return `${pct.toFixed(1)}%`
}

function safeToFixed(val: number, decimals = 1): string {
  const num = Number(val)
  if (isNaN(num) || !isFinite(num)) return '0.0'
  return num.toFixed(decimals)
}

function getMonthName(monthStr: string): string {
  if (!monthStr || typeof monthStr !== 'string' || !monthStr.includes('-')) return monthStr || '—'
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
  if (isNaN(idx) || idx < 0 || idx > 11) return monthStr
  return `${months[idx] || month}/${year}`
}

function getPreviousMonth(monthStr: string): string {
  if (!monthStr || typeof monthStr !== 'string' || !monthStr.includes('-')) return ''
  const [yearStr, mStr] = monthStr.split('-')
  let y = parseInt(yearStr, 10)
  let m = parseInt(mStr, 10) - 1
  if (isNaN(y) || isNaN(m)) return ''
  if (m < 1) {
    m = 12
    y -= 1
  }
  return `${y}-${String(m).padStart(2, '0')}`
}

function getSameMonthLastYear(monthStr: string): string {
  if (!monthStr || typeof monthStr !== 'string' || !monthStr.includes('-')) return ''
  const [yearStr, mStr] = monthStr.split('-')
  const y = parseInt(yearStr, 10) - 1
  if (isNaN(y)) return ''
  return `${y}-${mStr}`
}

function calcVariation(
  current: number,
  previous: number,
): { value: number; percent: number | null } {
  const c = Number(current) || 0
  const p = Number(previous) || 0
  const diff = c - p
  if (p === 0) {
    return { value: diff, percent: c === 0 ? 0 : null }
  }
  const pct = (diff / Math.abs(p)) * 100
  if (!isFinite(pct) || isNaN(pct)) {
    return { value: diff, percent: null }
  }
  return { value: diff, percent: pct }
}

export type VisionMode = 'mes' | 'trimestre' | 'ano' | 'ytd' | 'personalizado'

const MONTH_SHORT_LABELS = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
]

const MONTH_FULL_LABELS = [
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

export function FinanceiroDRE({ transactions }: { transactions: Transaction[] }) {
  const safeTransactions = Array.isArray(transactions) ? transactions : []

  const [regime, setRegime] = useState<RegimeType>('competencia')
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({})

  // Novos controles de período
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    const currentY = new Date().getFullYear()
    return [2024, 2025, 2026].includes(currentY) ? currentY : 2026
  })
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(() => {
    return new Date().getMonth() + 1 // 1-12
  })
  const [visionMode, setVisionMode] = useState<VisionMode>('mes')
  const [customDe, setCustomDe] = useState<string>('')
  const [customAte, setCustomAte] = useState<string>('')

  // Extrair todos os meses disponíveis de acordo com o regime escolhido
  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>()
    safeTransactions.forEach((t) => {
      if (!t) return
      const statusLower = (t.status || '').toLowerCase()
      if (statusLower === 'a_classificar' || statusLower === 'agrupado') return

      let dateStr: string | null = null
      if (regime === 'caixa') {
        if (statusLower !== 'pago') return
        dateStr =
          t.paidDate ||
          t.dueDate ||
          (typeof t.createdAt === 'string' ? t.createdAt.substring(0, 10) : null)
      } else {
        dateStr =
          t.dueDate || (typeof t.createdAt === 'string' ? t.createdAt.substring(0, 10) : null)
      }

      if (dateStr && typeof dateStr === 'string' && dateStr.length >= 7) {
        const ym = dateStr.substring(0, 7)
        if (/^\d{4}-\d{2}$/.test(ym)) {
          monthSet.add(ym)
        }
      }
    })

    return Array.from(monthSet).sort((a, b) => b.localeCompare(a))
  }, [safeTransactions, regime])

  // Meses que têm lançamentos no ano selecionado
  const activeMonthsInSelectedYear = useMemo(() => {
    const prefix = `${selectedYear}-`
    const set = new Set<number>()
    availableMonths.forEach((m) => {
      if (m.startsWith(prefix)) {
        const num = parseInt(m.substring(5, 7), 10)
        if (!isNaN(num)) set.add(num)
      }
    })
    return set
  }, [availableMonths, selectedYear])

  // Trimestre atual correspondente ao mês selecionado
  const selectedQuarter = Math.ceil(selectedMonthIndex / 3) // 1, 2, 3 ou 4

  // Mês selecionado no formato YYYY-MM
  const currentMonthKey = `${selectedYear}-${String(selectedMonthIndex).padStart(2, '0')}`

  // Título e escopo do período selecionado
  const periodInfo = useMemo(() => {
    const monthName = MONTH_FULL_LABELS[selectedMonthIndex - 1] || `Mês ${selectedMonthIndex}`

    if (visionMode === 'mes') {
      return {
        title: `Análise Comparativa — ${monthName} ${selectedYear}`,
        filterCurrent: (d: string) => d.startsWith(currentMonthKey),
        filterPrevious1: (d: string) => d.startsWith(getPreviousMonth(currentMonthKey)),
        filterPrevious2: (d: string) => d.startsWith(getSameMonthLastYear(currentMonthKey)),
        labelCol1: `${monthName}/${selectedYear} (Atual)`,
        labelCol2: `${getMonthName(getPreviousMonth(currentMonthKey))} (Mês Ant.)`,
        labelCol3: `${getMonthName(getSameMonthLastYear(currentMonthKey))} (Ano Ant.)`,
        headerVarCol2: 'Var. Mês Ant.',
        headerVarCol3: 'Var. Ano Ant.',
        subtext: `Comparação direta com ${getMonthName(getPreviousMonth(currentMonthKey))} e ${getMonthName(getSameMonthLastYear(currentMonthKey))}`,
      }
    }

    if (visionMode === 'trimestre') {
      const q = selectedQuarter
      const startM = (q - 1) * 3 + 1
      const endM = q * 3
      const qMonthsCurrent = [
        `${selectedYear}-${String(startM).padStart(2, '0')}`,
        `${selectedYear}-${String(startM + 1).padStart(2, '0')}`,
        `${selectedYear}-${String(endM).padStart(2, '0')}`,
      ]

      // Trimestre anterior
      let prevQYear = selectedYear
      let prevQ = q - 1
      if (prevQ < 1) {
        prevQ = 4
        prevQYear -= 1
      }
      const prevStartM = (prevQ - 1) * 3 + 1
      const prevEndM = prevQ * 3
      const qMonthsPrev = [
        `${prevQYear}-${String(prevStartM).padStart(2, '0')}`,
        `${prevQYear}-${String(prevStartM + 1).padStart(2, '0')}`,
        `${prevQYear}-${String(prevEndM).padStart(2, '0')}`,
      ]

      // Mesmo trimestre do ano anterior
      const lastYear = selectedYear - 1
      const qMonthsLastYear = [
        `${lastYear}-${String(startM).padStart(2, '0')}`,
        `${lastYear}-${String(startM + 1).padStart(2, '0')}`,
        `${lastYear}-${String(endM).padStart(2, '0')}`,
      ]

      return {
        title: `Análise Comparativa — ${q}º Trimestre ${selectedYear} (T${q})`,
        filterCurrent: (d: string) => qMonthsCurrent.some((m) => d.startsWith(m)),
        filterPrevious1: (d: string) => qMonthsPrev.some((m) => d.startsWith(m)),
        filterPrevious2: (d: string) => qMonthsLastYear.some((m) => d.startsWith(m)),
        labelCol1: `T${q}/${selectedYear} (Atual)`,
        labelCol2: `T${prevQ}/${prevQYear} (Trim. Ant.)`,
        labelCol3: `T${q}/${lastYear} (Ano Ant.)`,
        headerVarCol2: 'Var. Trim. Ant.',
        headerVarCol3: 'Var. Ano Ant.',
        subtext: `Comparação de T${q}/${selectedYear} vs Trimestre Anterior (T${prevQ}/${prevQYear}) vs Mesmo Trimestre do Ano Anterior (T${q}/${lastYear})`,
      }
    }

    if (visionMode === 'ano') {
      const currY = String(selectedYear)
      const prevY = String(selectedYear - 1)

      return {
        title: `Análise Comparativa — Ano Completo ${selectedYear}`,
        filterCurrent: (d: string) => d.startsWith(currY),
        filterPrevious1: (d: string) => d.startsWith(prevY),
        filterPrevious2: null,
        labelCol1: `Ano ${currY} (Atual)`,
        labelCol2: `Ano ${prevY} (Ano Anterior)`,
        labelCol3: null,
        headerVarCol2: 'Var. Ano Ant.',
        headerVarCol3: null,
        subtext: `Comparação anual completa: Ano ${currY} vs Ano ${prevY}`,
      }
    }

    if (visionMode === 'ytd') {
      const currY = String(selectedYear)
      const prevY = String(selectedYear - 1)
      const maxMonth = String(selectedMonthIndex).padStart(2, '0')

      return {
        title: `Análise Comparativa — Acumulado YTD ${selectedYear} (até ${monthName})`,
        filterCurrent: (d: string) => {
          if (!d.startsWith(currY)) return false
          const m = d.substring(5, 7)
          return m <= maxMonth
        },
        filterPrevious1: (d: string) => {
          if (!d.startsWith(prevY)) return false
          const m = d.substring(5, 7)
          return m <= maxMonth
        },
        filterPrevious2: null,
        labelCol1: `YTD ${currY} (Jan–${MONTH_SHORT_LABELS[selectedMonthIndex - 1]})`,
        labelCol2: `YTD ${prevY} (Jan–${MONTH_SHORT_LABELS[selectedMonthIndex - 1]})`,
        labelCol3: null,
        headerVarCol2: 'Var. YTD Ano Ant.',
        headerVarCol3: null,
        subtext: `Comparativo de Janeiro até ${monthName} de ${currY} vs mesmo período em ${prevY}`,
      }
    }

    // Personalizado
    const deLabel = customDe || 'Início'
    const ateLabel = customAte || 'Fim'
    return {
      title: `Análise Comparativa — Período Personalizado (${deLabel} a ${ateLabel})`,
      filterCurrent: (d: string) => {
        const day = d.substring(0, 10)
        if (customDe && day < customDe) return false
        if (customAte && day > customAte) return false
        return true
      },
      filterPrevious1: null,
      filterPrevious2: null,
      labelCol1: `Período (${deLabel} a ${ateLabel})`,
      labelCol2: null,
      labelCol3: null,
      headerVarCol2: null,
      headerVarCol3: null,
      subtext: `Lançamentos filtrados entre ${deLabel} e ${ateLabel}`,
    }
  }, [
    visionMode,
    selectedYear,
    selectedMonthIndex,
    selectedQuarter,
    currentMonthKey,
    customDe,
    customAte,
  ])

  // Cálculo do DRE do período selecionado
  const periodDRE = useMemo(() => {
    return calculateDRE(safeTransactions, regime, periodInfo.filterCurrent)
  }, [safeTransactions, regime, periodInfo])

  // Cálculo do DRE total geral acumulado de toda a base
  const totalDRE = useMemo(() => {
    return calculateDRE(safeTransactions, regime)
  }, [safeTransactions, regime])

  // DRE por mês (lista de meses disponíveis com dados)
  const monthlyDREs = useMemo(() => {
    return availableMonths.map((m) => ({
      month: m,
      dre: calculateDRE(safeTransactions, regime, m),
    }))
  }, [availableMonths, safeTransactions, regime])

  // Comparativo de período calculado dinamicamente conforme o modo de visão
  const comparativeData = useMemo(() => {
    const dreAtual = periodDRE
    const dreAnterior = periodInfo.filterPrevious1
      ? calculateDRE(safeTransactions, regime, periodInfo.filterPrevious1)
      : null
    const dreAnoAnterior = periodInfo.filterPrevious2
      ? calculateDRE(safeTransactions, regime, periodInfo.filterPrevious2)
      : null

    return {
      dreAtual,
      dreAnterior,
      dreAnoAnterior,
      varMesAnterior: dreAnterior
        ? {
            receitaBruta: calcVariation(dreAtual.receitaBruta, dreAnterior.receitaBruta),
            receitaLiquida: calcVariation(dreAtual.receitaLiquida, dreAnterior.receitaLiquida),
            lucroBruto: calcVariation(dreAtual.lucroBruto, dreAnterior.lucroBruto),
            ebitda: calcVariation(dreAtual.ebitda, dreAnterior.ebitda),
            resultadoLiquido: calcVariation(
              dreAtual.resultadoLiquido,
              dreAnterior.resultadoLiquido,
            ),
          }
        : null,
      varAnoAnterior: dreAnoAnterior
        ? {
            receitaBruta: calcVariation(dreAtual.receitaBruta, dreAnoAnterior.receitaBruta),
            receitaLiquida: calcVariation(dreAtual.receitaLiquida, dreAnoAnterior.receitaLiquida),
            lucroBruto: calcVariation(dreAtual.lucroBruto, dreAnoAnterior.lucroBruto),
            ebitda: calcVariation(dreAtual.ebitda, dreAnoAnterior.ebitda),
            resultadoLiquido: calcVariation(
              dreAtual.resultadoLiquido,
              dreAnoAnterior.resultadoLiquido,
            ),
          }
        : null,
    }
  }, [periodDRE, safeTransactions, regime, periodInfo])

  const toggleMonthExpand = (m: string) => {
    setExpandedMonths((prev) => ({ ...prev, [m]: !prev[m] }))
  }

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
        {safeToFixed(Math.abs(v.percent), 1)}%
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Bloco DRE Simplificado por Projeto no Topo */}
      <DREProjetoSimplificado />

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

            {/* Controles: Regime & Popover Explicativo */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Controle de Regime reformulado e proeminente */}
              <div className="flex items-center bg-muted/80 p-1 rounded-lg border border-border shadow-xs">
                <span className="text-xs font-semibold text-muted-foreground px-2">Regime:</span>
                <Tabs value={regime} onValueChange={(v) => setRegime(v as RegimeType)}>
                  <TabsList className="h-8 bg-background/90 p-0.5">
                    <TabsTrigger
                      value="competencia"
                      className="text-xs font-semibold px-3 h-7 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shadow-xs transition-all"
                    >
                      Competência
                    </TabsTrigger>
                    <TabsTrigger
                      value="caixa"
                      className="text-xs font-semibold px-3 h-7 data-[state=active]:bg-emerald-600 data-[state=active]:text-white shadow-xs transition-all"
                    >
                      Caixa
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                {/* Botão de Ajuda '?' com Popover Explicativo */}
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      aria-label="Explicar Regime de Caixa e Competência"
                      className="ml-1.5 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                      title="Entenda a diferença entre Competência e Caixa no DRE"
                    >
                      <HelpCircle className="w-4 h-4 text-primary" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    side="bottom"
                    align="end"
                    className="w-96 max-w-[92vw] p-4 text-xs space-y-3.5 shadow-xl border-border"
                  >
                    <div className="flex items-center gap-2 border-b pb-2">
                      <BookOpen className="w-4 h-4 text-primary" />
                      <h4 className="font-bold text-sm text-foreground">
                        Entenda os Regimes Contábeis
                      </h4>
                    </div>

                    <div className="space-y-2">
                      <div className="p-2.5 rounded-md bg-blue-500/10 border border-blue-500/20">
                        <div className="flex items-center gap-1.5 font-semibold text-blue-700 dark:text-blue-400 mb-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Regime de Competência (Oficial)
                        </div>
                        <p className="text-muted-foreground leading-relaxed">
                          A receita ou despesa é contabilizada no{' '}
                          <strong>mês a que pertence</strong> (pela data de vencimento ou realização
                          do serviço). Exemplo: se um projeto foi entregue em setembro, ele entra no
                          resultado de setembro, mesmo que o cliente parcele e pague somente em
                          outubro.
                        </p>
                      </div>

                      <div className="p-2.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                        <div className="flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400 mb-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Regime de Caixa (Fluxo Financeiro)
                        </div>
                        <p className="text-muted-foreground leading-relaxed">
                          Contabiliza pelo que{' '}
                          <strong>efetivamente entrou ou saiu da conta bancária</strong> no mês
                          (data de liquidação/pagamento). Mostra o fluxo real de dinheiro em caixa
                          no período.
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t space-y-1.5 text-muted-foreground">
                      <div className="flex items-center gap-1.5 font-semibold text-foreground">
                        <Info className="w-3.5 h-3.5 text-primary" />
                        Como o DRE calcula hoje:
                      </div>
                      <p className="leading-relaxed">
                        O sistema categoriza cada lançamento pela sua{' '}
                        <strong>natureza contábil</strong> (Receita, Imposto, Custo Direto/CPV,
                        Despesa Fixa ou Financeiro), pelo{' '}
                        <strong>vínculo direto com projetos comerciais</strong> (DRE por Projeto e
                        margem por contrato) e pelo <strong>plano de contas estruturado</strong> da
                        Bender Haussform.
                      </p>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* PRIORIDADE 2: Novo Seletor Completo de Período (Ano, 12 Meses, Modo de Visão) */}
          <div className="mt-4 p-3.5 rounded-lg border border-border bg-card/60 space-y-3">
            {/* Linha superior: Modo de Visão + Seletor de Ano */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Modo de Visão:
                </span>
                <Tabs
                  value={visionMode}
                  onValueChange={(v) => setVisionMode(v as VisionMode)}
                  className="w-auto"
                >
                  <TabsList className="h-8 bg-muted/80 p-0.5">
                    <TabsTrigger value="mes" className="text-xs px-2.5 h-7">
                      Mês
                    </TabsTrigger>
                    <TabsTrigger value="trimestre" className="text-xs px-2.5 h-7">
                      Trimestre
                    </TabsTrigger>
                    <TabsTrigger value="ano" className="text-xs px-2.5 h-7">
                      Ano Completo
                    </TabsTrigger>
                    <TabsTrigger value="ytd" className="text-xs px-2.5 h-7">
                      Acumulado YTD
                    </TabsTrigger>
                    <TabsTrigger value="personalizado" className="text-xs px-2.5 h-7">
                      Personalizado
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Seletor de Ano (2024 / 2025 / 2026) */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="text-xs font-semibold text-muted-foreground">Ano Base:</span>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="h-8 px-3 text-xs font-bold bg-background border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
                >
                  <option value={2026}>2026</option>
                  <option value={2025}>2025</option>
                  <option value={2024}>2024</option>
                </select>
              </div>
            </div>

            {/* Linha intermediária: Grade de 12 chips Jan–Dez (visível para Mês, Trimestre, Acumulado YTD) */}
            {visionMode !== 'personalizado' && (
              <div className="pt-2 border-t border-border/60">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    {visionMode === 'mes' && 'Selecione o mês de referência:'}
                    {visionMode === 'trimestre' &&
                      `Trimestre ativo: T${selectedQuarter} (${MONTH_SHORT_LABELS[(selectedQuarter - 1) * 3]} a ${MONTH_SHORT_LABELS[selectedQuarter * 3 - 1]})`}
                    {visionMode === 'ano' && `Visualizando todos os 12 meses de ${selectedYear}`}
                    {visionMode === 'ytd' &&
                      `Acumulado até ${MONTH_SHORT_LABELS[selectedMonthIndex - 1]}/${selectedYear}`}
                  </span>
                  <span className="text-[11px] text-muted-foreground/75 hidden md:inline">
                    Meses esmaecidos não possuem lançamentos no regime atual
                  </span>
                </div>
                <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
                  {MONTH_SHORT_LABELS.map((label, idx) => {
                    const mNumber = idx + 1
                    const hasData = activeMonthsInSelectedYear.has(mNumber)
                    const isSelectedMonth = selectedMonthIndex === mNumber
                    const isInQuarter =
                      visionMode === 'trimestre' &&
                      mNumber >= (selectedQuarter - 1) * 3 + 1 &&
                      mNumber <= selectedQuarter * 3
                    const isInYtd = visionMode === 'ytd' && mNumber <= selectedMonthIndex
                    const isInYear = visionMode === 'ano'

                    let highlightStyle = ''
                    if (visionMode === 'mes') {
                      highlightStyle = isSelectedMonth
                        ? 'bg-primary text-primary-foreground font-bold shadow-xs border-primary'
                        : ''
                    } else if (visionMode === 'trimestre') {
                      highlightStyle = isInQuarter
                        ? 'bg-primary/20 text-primary font-bold border-primary/50'
                        : ''
                    } else if (visionMode === 'ytd') {
                      highlightStyle = isInYtd
                        ? isSelectedMonth
                          ? 'bg-primary text-primary-foreground font-bold shadow-xs border-primary'
                          : 'bg-primary/15 text-primary font-medium border-primary/40'
                        : ''
                    } else if (isInYear) {
                      highlightStyle = 'bg-muted/60 text-foreground font-medium'
                    }

                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setSelectedMonthIndex(mNumber)}
                        className={`px-2 py-1.5 text-xs rounded-md border text-center transition-all flex flex-col items-center justify-center relative ${
                          highlightStyle ||
                          (hasData
                            ? 'bg-background hover:bg-muted text-foreground border-border'
                            : 'bg-muted/20 text-muted-foreground/45 border-dashed border-border/50 hover:bg-muted/30')
                        }`}
                        title={`${MONTH_FULL_LABELS[idx]} ${selectedYear}${hasData ? ' (com lançamentos)' : ' (sem lançamentos)'}`}
                      >
                        <span className="font-semibold">{label}</span>
                        {hasData && (
                          <span
                            className={`w-1 h-1 rounded-full mt-0.5 ${
                              isSelectedMonth && visionMode === 'mes'
                                ? 'bg-primary-foreground'
                                : 'bg-emerald-500'
                            }`}
                          />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Linha para modo Personalizado (campos De / Até) */}
            {visionMode === 'personalizado' && (
              <div className="pt-2 border-t border-border/60 flex flex-wrap items-center gap-3 text-xs">
                <span className="font-semibold text-muted-foreground">Intervalo de datas:</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">De:</span>
                  <input
                    type="date"
                    value={customDe}
                    onChange={(e) => setCustomDe(e.target.value)}
                    className="h-8 px-2.5 bg-background border rounded-md text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Até:</span>
                  <input
                    type="date"
                    value={customAte}
                    onChange={(e) => setCustomAte(e.target.value)}
                    className="h-8 px-2.5 bg-background border rounded-md text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
                  />
                </div>
                {(customDe || customAte) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-muted-foreground"
                    onClick={() => {
                      setCustomDe('')
                      setCustomAte('')
                    }}
                  >
                    Limpar filtro
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Banner de Identificação Clara do Regime Ativo */}
          <div
            className={`mt-4 px-3.5 py-2.5 rounded-lg border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 transition-colors ${
              regime === 'competencia'
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-900 dark:text-blue-200'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    regime === 'competencia' ? 'bg-blue-400' : 'bg-emerald-400'
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    regime === 'competencia' ? 'bg-blue-600' : 'bg-emerald-600'
                  }`}
                />
              </span>
              <span className="text-xs font-semibold">
                Visualizando DRE em{' '}
                <strong className="underline underline-offset-2">
                  Regime de {regime === 'competencia' ? 'Competência' : 'Caixa'}
                </strong>
                :
              </span>
              <span className="text-xs opacity-90 hidden sm:inline">
                {regime === 'competencia'
                  ? 'receitas e despesas apuradas pelo vencimento/mês de competência contábil.'
                  : 'receitas e despesas apuradas pela data de efetiva liquidação/pagamento.'}
              </span>
            </div>
            <Badge
              className={`text-xs px-2.5 py-0.5 font-bold uppercase tracking-wider self-start sm:self-auto ${
                regime === 'competencia'
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              Regime de {regime === 'competencia' ? 'Competência' : 'Caixa'}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Cards de Destaque da Estrutura Geral (Total Selecionado / Acumulado) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-emerald-500 shadow-sm relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground gap-1">
              <span className="font-medium">Receita Bruta Total</span>
              <Badge
                className={`text-[11px] px-2 py-0.5 font-bold uppercase tracking-wide border shadow-2xs ${
                  regime === 'competencia'
                    ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30'
                    : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                }`}
              >
                Regime de {regime === 'competencia' ? 'Competência' : 'Caixa'}
              </Badge>
            </div>
            <p className="text-2xl font-bold text-foreground mt-2">
              {formatCurrency(totalDRE.receitaBruta)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">100% da base faturada</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 shadow-sm relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground gap-1">
              <span className="font-medium">Lucro Bruto</span>
              <div className="flex items-center gap-1.5">
                <Badge
                  className={`text-[10px] px-1.5 py-0.5 font-semibold uppercase tracking-wide border shadow-2xs ${
                    regime === 'competencia'
                      ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30'
                      : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                  }`}
                >
                  {regime === 'competencia' ? 'Competência' : 'Caixa'}
                </Badge>
                <Badge
                  variant="outline"
                  className="text-[10px] font-semibold text-blue-600 dark:text-blue-400"
                >
                  Margem {safeToFixed(totalDRE.margemBruta, 1)}%
                </Badge>
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground mt-2">
              {formatCurrency(totalDRE.lucroBruto)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Após deduzir impostos e CPV</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 shadow-sm relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground gap-1">
              <span className="font-medium">EBITDA / LAJIDA</span>
              <div className="flex items-center gap-1.5">
                <Badge
                  className={`text-[10px] px-1.5 py-0.5 font-semibold uppercase tracking-wide border shadow-2xs ${
                    regime === 'competencia'
                      ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30'
                      : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                  }`}
                >
                  {regime === 'competencia' ? 'Competência' : 'Caixa'}
                </Badge>
                <Badge
                  variant="outline"
                  className="text-[10px] font-semibold text-purple-600 dark:text-purple-400"
                >
                  Margem {safeToFixed(totalDRE.margemEbitda, 1)}%
                </Badge>
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground mt-2">
              {formatCurrency(totalDRE.ebitda)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Antes de resultado financeiro</p>
          </CardContent>
        </Card>

        <Card
          className={`border-l-4 shadow-sm relative overflow-hidden ${
            totalDRE.resultadoLiquido >= 0 ? 'border-l-emerald-600' : 'border-l-rose-600'
          }`}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground gap-1">
              <span className="font-medium">Resultado Líquido</span>
              <div className="flex items-center gap-1.5">
                <Badge
                  className={`text-[10px] px-1.5 py-0.5 font-semibold uppercase tracking-wide border shadow-2xs ${
                    regime === 'competencia'
                      ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30'
                      : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                  }`}
                >
                  {regime === 'competencia' ? 'Competência' : 'Caixa'}
                </Badge>
                <Badge
                  variant="outline"
                  className={`text-[10px] font-semibold ${
                    totalDRE.resultadoLiquido >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  Margem {safeToFixed(totalDRE.margemLiquida, 1)}%
                </Badge>
              </div>
            </div>
            <p
              className={`text-2xl font-bold mt-2 ${
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

      {/* BLOCO 1: Comparativo de Período Adaptativo (Mês / Trimestre / Ano / YTD / Personalizado) */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3 border-b bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <CardTitle className="text-base font-semibold">{periodInfo.title}</CardTitle>
            </div>
            <span className="text-xs text-muted-foreground">{periodInfo.subtext}</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 text-xs">
                  <TableHead className="min-w-[220px] font-bold">Camada DRE</TableHead>
                  <TableHead className="text-right font-bold">{periodInfo.labelCol1}</TableHead>
                  {periodInfo.labelCol2 && (
                    <TableHead className="text-right">{periodInfo.labelCol2}</TableHead>
                  )}
                  {periodInfo.headerVarCol2 && comparativeData.varMesAnterior && (
                    <TableHead className="text-center">{periodInfo.headerVarCol2}</TableHead>
                  )}
                  {periodInfo.labelCol3 && (
                    <TableHead className="text-right">{periodInfo.labelCol3}</TableHead>
                  )}
                  {periodInfo.headerVarCol3 && comparativeData.varAnoAnterior && (
                    <TableHead className="text-center">{periodInfo.headerVarCol3}</TableHead>
                  )}
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
                  {comparativeData.dreAnterior && (
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(comparativeData.dreAnterior.receitaBruta)}
                    </TableCell>
                  )}
                  {comparativeData.varMesAnterior && (
                    <TableCell className="text-center">
                      {renderVariationBadge(comparativeData.varMesAnterior.receitaBruta, true)}
                    </TableCell>
                  )}
                  {comparativeData.dreAnoAnterior && (
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(comparativeData.dreAnoAnterior.receitaBruta)}
                    </TableCell>
                  )}
                  {comparativeData.varAnoAnterior && (
                    <TableCell className="text-center">
                      {renderVariationBadge(comparativeData.varAnoAnterior.receitaBruta, true)}
                    </TableCell>
                  )}
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
                  {comparativeData.dreAnterior && (
                    <TableCell className="text-right">
                      {comparativeData.dreAnterior.impostos > 0
                        ? `-${formatCurrency(comparativeData.dreAnterior.impostos)}`
                        : formatCurrency(0)}
                    </TableCell>
                  )}
                  {comparativeData.varMesAnterior && (
                    <TableCell className="text-center">
                      <span className="text-xs text-muted-foreground">-</span>
                    </TableCell>
                  )}
                  {comparativeData.dreAnoAnterior && (
                    <TableCell className="text-right">
                      {comparativeData.dreAnoAnterior.impostos > 0
                        ? `-${formatCurrency(comparativeData.dreAnoAnterior.impostos)}`
                        : formatCurrency(0)}
                    </TableCell>
                  )}
                  {comparativeData.varAnoAnterior && (
                    <TableCell className="text-center">
                      <span className="text-xs text-muted-foreground">-</span>
                    </TableCell>
                  )}
                </TableRow>

                {/* Subtotal: Receita Líquida */}
                <TableRow className="bg-muted/30 font-medium">
                  <TableCell className="pl-4 font-semibold text-foreground">
                    (=) Receita Líquida
                  </TableCell>
                  <TableCell className="text-right font-semibold text-foreground">
                    {formatCurrency(comparativeData.dreAtual.receitaLiquida)}
                  </TableCell>
                  {comparativeData.dreAnterior && (
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(comparativeData.dreAnterior.receitaLiquida)}
                    </TableCell>
                  )}
                  {comparativeData.varMesAnterior && (
                    <TableCell className="text-center">
                      {renderVariationBadge(comparativeData.varMesAnterior.receitaLiquida, true)}
                    </TableCell>
                  )}
                  {comparativeData.dreAnoAnterior && (
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(comparativeData.dreAnoAnterior.receitaLiquida)}
                    </TableCell>
                  )}
                  {comparativeData.varAnoAnterior && (
                    <TableCell className="text-center">
                      {renderVariationBadge(comparativeData.varAnoAnterior.receitaLiquida, true)}
                    </TableCell>
                  )}
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
                  {comparativeData.dreAnterior && (
                    <TableCell className="text-right">
                      {comparativeData.dreAnterior.custosDiretos > 0
                        ? `-${formatCurrency(comparativeData.dreAnterior.custosDiretos)}`
                        : formatCurrency(0)}
                    </TableCell>
                  )}
                  {comparativeData.varMesAnterior && (
                    <TableCell className="text-center">
                      <span className="text-xs text-muted-foreground">-</span>
                    </TableCell>
                  )}
                  {comparativeData.dreAnoAnterior && (
                    <TableCell className="text-right">
                      {comparativeData.dreAnoAnterior.custosDiretos > 0
                        ? `-${formatCurrency(comparativeData.dreAnoAnterior.custosDiretos)}`
                        : formatCurrency(0)}
                    </TableCell>
                  )}
                  {comparativeData.varAnoAnterior && (
                    <TableCell className="text-center">
                      <span className="text-xs text-muted-foreground">-</span>
                    </TableCell>
                  )}
                </TableRow>

                {/* Subtotal: Lucro Bruto */}
                <TableRow className="bg-muted/40 font-semibold">
                  <TableCell className="pl-4 text-foreground">(=) Lucro Bruto</TableCell>
                  <TableCell className="text-right text-blue-600 dark:text-blue-400 font-bold">
                    {formatCurrency(comparativeData.dreAtual.lucroBruto)}
                  </TableCell>
                  {comparativeData.dreAnterior && (
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(comparativeData.dreAnterior.lucroBruto)}
                    </TableCell>
                  )}
                  {comparativeData.varMesAnterior && (
                    <TableCell className="text-center">
                      {renderVariationBadge(comparativeData.varMesAnterior.lucroBruto, true)}
                    </TableCell>
                  )}
                  {comparativeData.dreAnoAnterior && (
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(comparativeData.dreAnoAnterior.lucroBruto)}
                    </TableCell>
                  )}
                  {comparativeData.varAnoAnterior && (
                    <TableCell className="text-center">
                      {renderVariationBadge(comparativeData.varAnoAnterior.lucroBruto, true)}
                    </TableCell>
                  )}
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
                  {comparativeData.dreAnterior && (
                    <TableCell className="text-right">
                      {comparativeData.dreAnterior.despesasOperacionais > 0
                        ? `-${formatCurrency(comparativeData.dreAnterior.despesasOperacionais)}`
                        : formatCurrency(0)}
                    </TableCell>
                  )}
                  {comparativeData.varMesAnterior && (
                    <TableCell className="text-center">
                      <span className="text-xs text-muted-foreground">-</span>
                    </TableCell>
                  )}
                  {comparativeData.dreAnoAnterior && (
                    <TableCell className="text-right">
                      {comparativeData.dreAnoAnterior.despesasOperacionais > 0
                        ? `-${formatCurrency(comparativeData.dreAnoAnterior.despesasOperacionais)}`
                        : formatCurrency(0)}
                    </TableCell>
                  )}
                  {comparativeData.varAnoAnterior && (
                    <TableCell className="text-center">
                      <span className="text-xs text-muted-foreground">-</span>
                    </TableCell>
                  )}
                </TableRow>

                {/* Subtotal: EBITDA */}
                <TableRow className="bg-muted/40 font-semibold">
                  <TableCell className="pl-4 text-purple-700 dark:text-purple-400">
                    (=) EBITDA / LAJIDA
                  </TableCell>
                  <TableCell className="text-right text-purple-700 dark:text-purple-400 font-bold">
                    {formatCurrency(comparativeData.dreAtual.ebitda)}
                  </TableCell>
                  {comparativeData.dreAnterior && (
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(comparativeData.dreAnterior.ebitda)}
                    </TableCell>
                  )}
                  {comparativeData.varMesAnterior && (
                    <TableCell className="text-center">
                      {renderVariationBadge(comparativeData.varMesAnterior.ebitda, true)}
                    </TableCell>
                  )}
                  {comparativeData.dreAnoAnterior && (
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(comparativeData.dreAnoAnterior.ebitda)}
                    </TableCell>
                  )}
                  {comparativeData.varAnoAnterior && (
                    <TableCell className="text-center">
                      {renderVariationBadge(comparativeData.varAnoAnterior.ebitda, true)}
                    </TableCell>
                  )}
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
                  {comparativeData.dreAnterior && (
                    <TableCell className="text-right">
                      {formatCurrency(comparativeData.dreAnterior.resultadoFinanceiro)}
                    </TableCell>
                  )}
                  {comparativeData.varMesAnterior && (
                    <TableCell className="text-center">
                      <span className="text-xs text-muted-foreground">-</span>
                    </TableCell>
                  )}
                  {comparativeData.dreAnoAnterior && (
                    <TableCell className="text-right">
                      {formatCurrency(comparativeData.dreAnoAnterior.resultadoFinanceiro)}
                    </TableCell>
                  )}
                  {comparativeData.varAnoAnterior && (
                    <TableCell className="text-center">
                      <span className="text-xs text-muted-foreground">-</span>
                    </TableCell>
                  )}
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
                  {comparativeData.dreAnterior && (
                    <TableCell className="text-right text-muted-foreground font-semibold">
                      {formatCurrency(comparativeData.dreAnterior.resultadoLiquido)}
                    </TableCell>
                  )}
                  {comparativeData.varMesAnterior && (
                    <TableCell className="text-center">
                      {renderVariationBadge(comparativeData.varMesAnterior.resultadoLiquido, true)}
                    </TableCell>
                  )}
                  {comparativeData.dreAnoAnterior && (
                    <TableCell className="text-right text-muted-foreground font-semibold">
                      {formatCurrency(comparativeData.dreAnoAnterior.resultadoLiquido)}
                    </TableCell>
                  )}
                  {comparativeData.varAnoAnterior && (
                    <TableCell className="text-center">
                      {renderVariationBadge(comparativeData.varAnoAnterior.resultadoLiquido, true)}
                    </TableCell>
                  )}
                </TableRow>

                {/* Margem Líquida */}
                <TableRow className="text-xs text-muted-foreground">
                  <TableCell className="font-medium">
                    Margem Líquida (% sobre Receita Bruta)
                  </TableCell>
                  <TableCell className="text-right font-bold text-foreground">
                    {safeToFixed(comparativeData.dreAtual.margemLiquida, 1)}%
                  </TableCell>
                  {comparativeData.dreAnterior && (
                    <TableCell className="text-right">
                      {safeToFixed(comparativeData.dreAnterior.margemLiquida, 1)}%
                    </TableCell>
                  )}
                  {comparativeData.varMesAnterior && (
                    <TableCell className="text-center">-</TableCell>
                  )}
                  {comparativeData.dreAnoAnterior && (
                    <TableCell className="text-right">
                      {safeToFixed(comparativeData.dreAnoAnterior.margemLiquida, 1)}%
                    </TableCell>
                  )}
                  {comparativeData.varAnoAnterior && (
                    <TableCell className="text-center">-</TableCell>
                  )}
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
                            ({safeToFixed(dre.margemBruta, 1)}%)
                          </span>
                        </div>
                        <div className="hidden sm:block text-muted-foreground/40">•</div>
                        <div>
                          <span className="text-muted-foreground">EBITDA: </span>
                          <span className="font-semibold text-purple-600 dark:text-purple-400">
                            {formatCurrency(dre.ebitda)}
                          </span>
                          <span className="text-muted-foreground ml-1">
                            ({safeToFixed(dre.margemEbitda, 1)}%)
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
                            ({safeToFixed(dre.margemLiquida, 1)}%)
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
                                  {safeToFixed(dre.margemBruta, 1)}%
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
                                  {safeToFixed(dre.margemEbitda, 1)}%
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
                                  {safeToFixed(dre.margemLiquida, 1)}%
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
                    {safeToFixed(totalDRE.margemBruta, 1)}%
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
                    {safeToFixed(totalDRE.margemEbitda, 1)}%
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
                    {safeToFixed(totalDRE.margemLiquida, 1)}%
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
