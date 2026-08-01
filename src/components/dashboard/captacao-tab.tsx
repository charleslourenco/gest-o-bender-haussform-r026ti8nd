import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Target, CheckCircle } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { DashboardData } from './types'

export function CaptacaoTab({ data }: { data: DashboardData }) {
  const chartConfig = {
    value: { label: 'Leads' },
  }

  const pieData = data.chartOrigem.map((item, index) => ({
    ...item,
    fill: `hsl(var(--chart-${(index % 5) + 1}))`,
  }))

  return (
    <div className="space-y-6 animate-in fade-in-up duration-500">
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="bg-off-white border-2 border-steel-blue/20 shadow-sm hover:border-steel-blue/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-midnight-navy">Total de Leads</CardTitle>
            <Users className="h-5 w-5 text-steel-blue" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-dark-denim">{data.totalLeads}</div>
            <p className="text-xs text-steel-blue font-medium mt-1">Captações no período</p>
          </CardContent>
        </Card>

        <Card className="bg-off-white border-2 border-steel-blue/20 shadow-sm hover:border-steel-blue/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-midnight-navy">
              Leads Convertidos
            </CardTitle>
            <CheckCircle className="h-5 w-5 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-dark-denim">{data.leadsVendidos}</div>
            <p className="text-xs text-steel-blue font-medium mt-1">Tornaram-se clientes</p>
          </CardContent>
        </Card>

        <Card className="bg-off-white border-2 border-steel-blue/20 shadow-sm hover:border-steel-blue/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-midnight-navy">
              Taxa de Conversão
            </CardTitle>
            <Target className="h-5 w-5 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-dark-denim">{data.taxaConversaoLead}%</div>
            <p className="text-xs text-steel-blue font-medium mt-1">Eficiência de vendas</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-off-white border-2 border-steel-blue/20 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-off-white">Origem dos Leads</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <div className="p-8 text-center text-midnight-navy/60 font-medium">
                Nenhum dado no período.
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      label
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
