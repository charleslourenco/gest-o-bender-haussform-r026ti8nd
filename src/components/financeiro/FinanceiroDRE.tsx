import { useMemo } from 'react'
import { Transaction } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function FinanceiroDRE({ transactions }: { transactions: Transaction[] }) {
  const dreData = useMemo(() => {
    const groups: Record<string, { receitas: number; despesas: number }> = {}
    transactions.forEach((t) => {
      const date = t.paidDate || t.dueDate
      if (!date) return
      const month = date.substring(0, 7)
      if (!groups[month]) groups[month] = { receitas: 0, despesas: 0 }
      if (t.type === 'receita') groups[month].receitas += t.amount
      else groups[month].despesas += t.amount
    })

    return Object.entries(groups)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([month, data]) => ({
        month,
        ...data,
        lucro: data.receitas - data.despesas,
        margem: data.receitas > 0 ? ((data.receitas - data.despesas) / data.receitas) * 100 : 0,
      }))
  }, [transactions])

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Demonstrativo de Resultados (DRE Simplificado)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mês/Competência</TableHead>
                <TableHead className="text-right">Receitas Brutas</TableHead>
                <TableHead className="text-right">Despesas Operacionais</TableHead>
                <TableHead className="text-right">Lucro/Prejuízo</TableHead>
                <TableHead className="text-right">Margem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dreData.map((row) => (
                <TableRow key={row.month}>
                  <TableCell className="font-medium">{row.month}</TableCell>
                  <TableCell className="text-right text-emerald-600 font-medium">
                    {formatCurrency(row.receitas)}
                  </TableCell>
                  <TableCell className="text-right text-rose-600 font-medium">
                    {formatCurrency(row.despesas)}
                  </TableCell>
                  <TableCell
                    className={`text-right font-bold ${row.lucro >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}
                  >
                    {formatCurrency(row.lucro)}
                  </TableCell>
                  <TableCell className="text-right">{row.margem.toFixed(1)}%</TableCell>
                </TableRow>
              ))}
              {dreData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-gray-500">
                    Nenhum dado para exibir no DRE.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
