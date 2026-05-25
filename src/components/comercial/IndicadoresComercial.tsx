import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { Users, CheckCircle, Clock, Target } from 'lucide-react'

export function IndicadoresComercial() {
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState<any>({
    totalLeads: 0,
    vendidos: 0,
    taxaConversao: 0,
    emAndamento: 0,
  })
  const [statusData, setStatusData] = useState<any[]>([])
  const [originData, setOriginData] = useState<any[]>([])

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const { data: leads, error } = await supabase.from('leads').select('status, origem')
        if (error || !leads) {
          setLoading(false)
          return
        }

        const total = leads.length
        const vendidos = leads.filter((l) => l.status === 'Vendido').length
        const emAndamento = leads.filter((l) => !['Vendido', 'Perdido'].includes(l.status)).length

        setMetrics({
          totalLeads: total,
          vendidos,
          taxaConversao: total > 0 ? ((vendidos / total) * 100).toFixed(1) : 0,
          emAndamento,
        })

        const sCount = leads.reduce((acc: any, l) => {
          const s = l.status || 'Sem Status'
          acc[s] = (acc[s] || 0) + 1
          return acc
        }, {})
        setStatusData(Object.keys(sCount).map((k) => ({ status: k, total: sCount[k] })))

        const oCount = leads.reduce((acc: any, l) => {
          const o = l.origem || 'Desconhecida'
          acc[o] = (acc[o] || 0) + 1
          return acc
        }, {})
        setOriginData(Object.keys(oCount).map((k) => ({ origem: k, total: oCount[k] })))

        setLoading(false)
      } catch (err) {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const COLORS = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
  ]

  const chartConfig = {
    total: {
      label: 'Total de Leads',
      color: 'hsl(var(--primary))',
    },
  }

  return (
    <div className="space-y-6 pb-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-steel-blue/20 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-midnight-navy">Total de Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-midnight-navy">{metrics.totalLeads}</div>
          </CardContent>
        </Card>
        <Card className="border-steel-blue/20 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-midnight-navy">Leads Vendidos</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{metrics.vendidos}</div>
          </CardContent>
        </Card>
        <Card className="border-steel-blue/20 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-midnight-navy">
              Taxa de Conversão
            </CardTitle>
            <Target className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{metrics.taxaConversao}%</div>
          </CardContent>
        </Card>
        <Card className="border-steel-blue/20 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-midnight-navy">Em Andamento</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{metrics.emAndamento}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-steel-blue/20 shadow-sm">
          <CardHeader>
            <CardTitle className="text-midnight-navy">Leads por Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData} margin={{ top: 20, right: 30, left: 20, bottom: 25 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="status"
                    tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis tick={{ fill: 'hsl(var(--foreground))' }} allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="total" fill="var(--color-total)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="border-steel-blue/20 shadow-sm">
          <CardHeader>
            <CardTitle className="text-midnight-navy">Leads por Origem</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={originData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="total"
                    nameKey="origem"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {originData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
