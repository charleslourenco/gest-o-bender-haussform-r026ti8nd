import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Hammer } from 'lucide-react'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts'
import type { DashboardData } from './types'

const montagemPhases = ['expedicao', 'transporte', 'montagem', 'assistencia', 'concluido']

const formatFase = (fase: string) =>
  fase
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')

export function MontagemTab({ data }: { data: DashboardData }) {
  const projetos = data.projetos.filter((p) => montagemPhases.includes(p.status_analise))
  const ativos = projetos.filter((p) => p.status_analise !== 'concluido').length

  const fasesMap: Record<string, number> = {}
  const equipesMap: Record<string, number> = {}

  projetos.forEach((p) => {
    const fase = formatFase(p.status_analise)
    fasesMap[fase] = (fasesMap[fase] || 0) + 1

    const equipe = p.analista?.nome || 'Equipe Externa / Não Atribuído'
    equipesMap[equipe] = (equipesMap[equipe] || 0) + 1
  })

  const fasesData = Object.entries(fasesMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  const equipesData = Object.entries(equipesMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-card-foreground">
              Em Expedição/Montagem
            </CardTitle>
            <Hammer className="h-5 w-5 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-card-foreground">{ativos}</div>
            <p className="text-xs text-muted-foreground font-medium mt-1">
              Ambientes em campo ou expedidos
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-card-foreground">Projetos por Etapa</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ChartContainer config={{}} className="h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={fasesData} margin={{ bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" fontSize={12} angle={-45} textAnchor="end" height={60} />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" name="Projetos" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-card-foreground">
              Montagens por Equipe/Responsável
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ChartContainer config={{}} className="h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={equipesData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={120} fontSize={12} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" name="Projetos" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
