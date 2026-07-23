import { useMemo } from 'react'
import { Transaction } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, XAxis, Tooltip } from 'recharts'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'

const chartConfig = {
  receitas: { label: 'Receitas', color: '#10b981' },
  despesas: { label: 'Despesas', color: '#f43f5e' },
}

export function FinanceiroDashboard({ transactions }: { transactions: Transaction[] }) {
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  const today = new Date().toISOString().split('T')[0]

  const safeTransactions = Array.isArray(transactions) ? transactions : []

  const { receitasHoje, despesasHoje, saldoPrevisto } = useMemo(() => {
    let rH = 0,
      dH = 0,
      saldo = 0
    safeTransactions.forEach((t) => {
      const amount = Number(t.amount) || 0
      if (t.status === 'pago') {
        saldo += t.type === 'receita' ? amount : -amount
      }
      if (t.dueDate === today && t.status !== 'pago') {
        if (t.type === 'receita') rH += amount
        else dH += amount
      }
    })
    return { receitasHoje: rH, despesasHoje: dH, saldoPrevisto: saldo }
  }, [safeTransactions, today])

  const chartData = useMemo(() => {
    const groups: Record<string, { receitas: number; despesas: number }> = {}
    safeTransactions.forEach((t) => {
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
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(saldoPrevisto)}</div>
            <p className="text-xs text-gray-500 mt-1">Baseado em lançamentos pagos</p>
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
            <ChartContainer config={chartConfig} className="w-full h-full">
              <BarChart data={chartData.slice(-6)}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <Tooltip cursor={false} content={<ChartTooltipContent />} />
                <Bar dataKey="receitas" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="despesas" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
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
