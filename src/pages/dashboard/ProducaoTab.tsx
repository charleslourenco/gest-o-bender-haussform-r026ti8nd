import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Factory } from 'lucide-react'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import type { DashboardData } from './types'

const producaoPhases = ['aguardando_plano_corte', 'router', 'coladeira', 'bancada', 'embalagem']
const COLORS = ['#3b82f6', '#10b981', '#ea580c', '#ef4444', '#8b5cf6']

const formatFase = (fase: string) =>
  fase
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')

export function ProducaoTab({ data }: { data: DashboardData }) {
  const projetos = data.projetos.filter((p) => producaoPhases.includes(p.status_analise))
  const total = projetos.length

  const fasesMap: Record<string, number> = {}
  projetos.forEach((p) => {
    const fase = formatFase(p.status_analise)
    fasesMap[fase] = (fasesMap[fase] || 0) + 1
  })

  const fasesData = Object.entries(fasesMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-card-foreground">
              Projetos na Produção
            </CardTitle>
            <Factory className="h-5 w-5 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-card-foreground">{total}</div>
            <p className="text-xs text-muted-foreground font-medium mt-1">
              Ambientes em fabricação
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-card-foreground">
              Distribuição por Máquina/Fase
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {fasesData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                Sem dados
              </div>
            ) : (
              <ChartContainer config={{}} className="h-full w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={fasesData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      label={({ name, value }) => `${name} (${value})`}
                    >
                      {fasesData.map((_, index) => (
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

        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-card-foreground">Volume por Etapa</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ChartContainer config={{}} className="h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={fasesData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} fontSize={12} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" name="Projetos" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
