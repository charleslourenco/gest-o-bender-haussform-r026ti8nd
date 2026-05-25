import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { ScrollArea } from '@/components/ui/scroll-area'

export function Indicators({ leads }: { leads: any[] }) {
  const totalLeads = leads.length
  const vendas = leads.filter((l) => l.status === 'Vendido').length
  const perdidos = leads.filter((l) => l.status === 'Perdido').length
  const conversao = totalLeads > 0 ? ((vendas / totalLeads) * 100).toFixed(1) : '0.0'

  const statusCounts = leads.reduce((acc: any, lead) => {
    const status = lead.status || 'Novo Lead'
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {})

  const chartData = Object.keys(statusCounts)
    .map((key) => ({
      status: key,
      quantidade: statusCounts[key],
    }))
    .sort((a, b) => b.quantidade - a.quantidade)

  const chartConfig = {
    quantidade: { label: 'Leads', color: 'hsl(var(--primary))' },
  }

  return (
    <ScrollArea className="h-full pr-4">
      <div className="grid gap-4 md:grid-cols-3 pb-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalLeads}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{conversao}%</div>
            <p className="text-xs text-muted-foreground mt-1">Leads convertidos em Venda</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendas Realizadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{vendas}</div>
          </CardContent>
        </Card>

        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>Distribuição de Leads por Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="w-full min-h-[350px] max-h-[400px]">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="status"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  fontSize={12}
                />
                <YAxis tickLine={false} axisLine={false} tickMargin={10} fontSize={12} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="quantidade" fill="var(--color-quantidade)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  )
}
