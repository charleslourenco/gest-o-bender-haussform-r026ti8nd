import { useMemo, useState, useEffect, useCallback } from 'react'
import { Transaction } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Landmark, AlertCircle } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, XAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { fetchContasBancarias, ContaBancaria } from '@/services/contas-bancarias'

interface CustomTooltipProps {
  active?: boolean
  payload?: any[]
  label?: string
}

function CustomChartTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) {
    return null
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  return (
    <div className="bg-white dark:bg-zinc-900 shadow-lg rounded-lg border border-border p-2.5 text-xs">
      <p className="font-semibold mb-1.5 text-foreground">{label}</p>
      <div className="space-y-1">
        {payload.map((item: any, idx: number) => {
          const isReceita = item.dataKey === 'receitas'
          const name = isReceita ? 'Receitas' : 'Despesas'
          const color = isReceita ? '#10b981' : '#f43f5e'
          return (
            <div key={idx} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-sm inline-block shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="text-muted-foreground">{name}:</span>
              </div>
              <span className="font-medium text-foreground">
                {formatCurrency(Number(item.value) || 0)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface FinanceiroDashboardProps {
  transactions: Transaction[]
  contasBancarias?: ContaBancaria[]
}

function FinanceiroDashboardContent({
  transactions,
  contasBancarias: initialContas,
}: FinanceiroDashboardProps) {
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  const today = new Date().toISOString().split('T')[0]

  const safeTransactions = Array.isArray(transactions) ? transactions : []
  const [contasBancarias, setContasBancarias] = useState<ContaBancaria[]>(initialContas || [])
  const [loadingContas, setLoadingContas] = useState(!initialContas || initialContas.length === 0)

  const loadContas = useCallback(async () => {
    try {
      setLoadingContas(true)
      const data = await fetchContasBancarias()
      setContasBancarias(data)
    } catch {
      // Falha silenciosa no card, mantém array vazio
    } finally {
      setLoadingContas(false)
    }
  }, [])

  useEffect(() => {
    if (initialContas !== undefined) {
      setContasBancarias(initialContas)
      setLoadingContas(false)
    } else {
      loadContas()
    }
  }, [initialContas, loadContas])

  const saldoBancosReal = useMemo(() => {
    return (contasBancarias || [])
      .filter((c) => c.status !== false)
      .reduce((sum, c) => sum + (Number(c.saldo_atual) || 0), 0)
  }, [contasBancarias])

  const { receitasHoje, despesasHoje } = useMemo(() => {
    let rH = 0,
      dH = 0
    safeTransactions.forEach((t) => {
      const statusLower = (t.status || '').toLowerCase()
      if (statusLower === 'a_classificar' || statusLower === 'agrupado') return

      const amount = Number(t.amount) || 0
      if (t.dueDate === today && statusLower !== 'pago') {
        if (t.type === 'receita') rH += amount
        else dH += amount
      }
    })
    return { receitasHoje: rH, despesasHoje: dH }
  }, [safeTransactions, today])

  const chartData = useMemo(() => {
    const groups: Record<string, { receitas: number; despesas: number }> = {}
    safeTransactions.forEach((t) => {
      const statusLower = (t.status || '').toLowerCase()
      if (statusLower === 'a_classificar' || statusLower === 'agrupado') return

      const date = t.paidDate || t.dueDate
      if (!date || typeof date !== 'string') return
      const month = date.substring(0, 7)
      if (!groups[month]) groups[month] = { receitas: 0, despesas: 0 }
      const amount = Number(t.amount) || 0
      if (t.type === 'receita') groups[month].receitas += amount
      else groups[month].despesas += amount
    })
    return Object.entries(groups)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, data]) => ({ month, ...data }))
  }, [safeTransactions])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Saldo Atualizado</CardTitle>
            <Landmark className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                saldoBancosReal >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {loadingContas ? 'Carregando...' : formatCurrency(saldoBancosReal)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Soma das contas bancárias ativas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Receber Hoje (Pendente)
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {formatCurrency(receitasHoje)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Pagar Hoje (Pendente)
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">{formatCurrency(despesasHoje)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fluxo Mensal (Receitas vs Despesas)</CardTitle>
        </CardHeader>
        <CardContent className="h-[350px]">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.slice(-6)}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                  content={<CustomChartTooltip />}
                />
                <Bar dataKey="receitas" fill="#10b981" radius={[4, 4, 0, 0]} name="Receitas" />
                <Bar dataKey="despesas" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Despesas" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-gray-500">
              Sem dados suficientes para exibir o fluxo mensal.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export function FinanceiroDashboard({ transactions, contasBancarias }: FinanceiroDashboardProps) {
  return (
    <ErrorBoundary
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[300px] p-6 text-center bg-card rounded-lg border border-border">
          <AlertCircle className="w-8 h-8 text-destructive mb-2" />
          <p className="text-sm font-medium text-foreground">
            Não foi possível carregar o dashboard financeiro.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Tente atualizar os filtros ou recarregar a página.
          </p>
        </div>
      }
    >
      <FinanceiroDashboardContent transactions={transactions} contasBancarias={contasBancarias} />
    </ErrorBoundary>
  )
}
