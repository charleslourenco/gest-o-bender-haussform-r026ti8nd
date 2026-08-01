import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Target } from 'lucide-react'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import type { DashboardData } from './types'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316']

export function CaptacaoTab({ data }: { data: DashboardData }) {
  const comercialLeads = data.leads.filter((l) => l.categoria === 'Comercial')
  const totalLeads = comercialLeads.length
  const convertidos = comercialLeads.filter((l) => l.status === 'Vendido').length
  const txConversao = totalLeads ? ((convertidos / totalLeads) * 100).toFixed(1) : '0.0'

  const originCount = comercialLeads.reduce((acc: any, lead) => {
    const origin = lead.origem || 'Outros'
    acc[origin] = (acc[origin] || 0) + 1
    return acc
  }, {})

  const originData = Object.entries(originCount)
    .map(([name, value]) => ({ name, value: value as number }))
    .sort((a, b) => b.value - a.value)

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="bg-midnight-navy border-2 border-midnight-navy">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-off-white">Total de Leads</CardTitle>
            <Users className="h-5 w-5 text-off-white" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-off-white">{totalLeads}</div>
            <p className="text-xs text-off-white font-medium mt-1">Captações no período</p>
          </CardContent>
        </Card>
        <Card className="bg-midnight-navy border-2 border-midnight-navy">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-off-white">Convertidos</CardTitle>
            <Target className="h-5 w-5 text-off-white" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-off-white">{convertidos}</div>
            <p className="text-xs text-off-white font-medium mt-1">Viraram clientes</p>
          </CardContent>
        </Card>
        <Card className="bg-midnight-navy border-2 border-midnight-navy">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-off-white">Taxa de Conversão</CardTitle>
            <Target className="h-5 w-5 text-off-white" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-off-white">{txConversao}%</div>
            <p className="text-xs text-off-white font-medium mt-1">Média do período</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-2 border-steel-blue/20">
          <CardHeader>
            <CardTitle className="text-lg text-off-white">Origem dos Leads</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {originData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-steel-blue">
                Sem dados
              </div>
            ) : (
              <ChartContainer config={{}} className="h-full w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={originData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {originData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
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
