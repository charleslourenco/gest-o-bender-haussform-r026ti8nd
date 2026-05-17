import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileSearch } from 'lucide-react'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts'
import type { DashboardData } from './types'

const analisePhases = [
  'iniciar',
  'medida_fina',
  'reuniao_analise',
  'caderno_tecnico',
  'lista_materiais',
]

const formatFase = (fase: string) =>
  fase
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')

export function AnaliseTab({ data }: { data: DashboardData }) {
  const projetos = data.projetos.filter((p) => analisePhases.includes(p.status_analise))
  const total = projetos.length

  const analistasMap: Record<string, number> = {}
  const fasesMap: Record<string, number> = {}

  projetos.forEach((p) => {
    const analista = p.analista?.nome || 'Sem Analista'
    analistasMap[analista] = (analistasMap[analista] || 0) + 1

    const fase = formatFase(p.status_analise)
    fasesMap[fase] = (fasesMap[fase] || 0) + 1
  })

  const analistasData = Object.entries(analistasMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  const fasesData = Object.entries(fasesMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-off-white border-2 border-steel-blue/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-midnight-navy">
              Projetos em Análise
            </CardTitle>
            <FileSearch className="h-5 w-5 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-dark-denim">{total}</div>
            <p className="text-xs text-steel-blue font-medium mt-1">Ambientes sendo trabalhados</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-2 border-steel-blue/20">
          <CardHeader>
            <CardTitle className="text-lg text-midnight-navy">Atendimentos por Analista</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ChartContainer config={{}} className="h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analistasData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} fontSize={12} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" name="Projetos" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="border-2 border-steel-blue/20">
          <CardHeader>
            <CardTitle className="text-lg text-midnight-navy">Projetos por Fase (Funil)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ChartContainer config={{}} className="h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={fasesData} margin={{ bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" fontSize={12} angle={-45} textAnchor="end" height={60} />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" name="Projetos" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
