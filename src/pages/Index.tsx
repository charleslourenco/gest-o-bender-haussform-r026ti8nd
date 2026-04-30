import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
} from 'recharts'
import {
  ClipboardList,
  TrendingUp,
  Hammer,
  Truck,
  Plus,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'
import { useAppStore } from '@/stores/main'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

const chartData = [
  { month: 'Jan', completed: 12, target: 15 },
  { month: 'Fev', completed: 15, target: 15 },
  { month: 'Mar', completed: 10, target: 15 },
  { month: 'Abr', completed: 22, target: 15 },
  { month: 'Mai', completed: 18, target: 15 },
  { month: 'Jun', completed: 25, target: 20 },
]

const chartConfig = {
  completed: { label: 'Concluídos', color: 'hsl(var(--primary))' },
  target: { label: 'Meta', color: 'hsl(var(--muted-foreground))' },
}

export default function Index() {
  const { projects, clients } = useAppStore()

  const activeProjects = projects.filter((p) => p.stage !== 'Finalizado').length
  const inProduction = projects.filter(
    (p) => p.stage === 'Produção' || p.stage === 'Montagem',
  ).length
  const pendingDeliveries = projects.filter((p) => p.stage === 'Montagem').length

  const recentActivities = useMemo(() => {
    return projects.slice(0, 5).map((p, i) => ({
      id: p.id,
      title: `Projeto "${p.name}" atualizado`,
      desc: `Movido para a etapa de ${p.stage}`,
      time: i === 0 ? 'Agora mesmo' : `Há ${i * 2} horas`,
      type: p.stage === 'Finalizado' ? 'success' : 'info',
    }))
  }, [projects])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-secondary">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral da sua fábrica de móveis hoje.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" className="bg-white">
            <Link to="/clientes">
              <Plus className="mr-2 h-4 w-4" /> Novo Cliente
            </Link>
          </Button>
          <Button asChild className="shadow-subtle">
            <Link to="/projetos">
              <Plus className="mr-2 h-4 w-4" /> Novo Projeto
            </Link>
          </Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Projetos Ativos
            </CardTitle>
            <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
              <ClipboardList className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-secondary">{activeProjects}</div>
            <p className="text-xs text-muted-foreground mt-1">+2 desde a última semana</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Faturamento (Mês)
            </CardTitle>
            <div className="h-8 w-8 bg-emerald-500/10 rounded-full flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-secondary">R$ 124.500</div>
            <p className="text-xs text-emerald-600 mt-1 flex items-center font-medium">
              <TrendingUp className="h-3 w-3 mr-1" /> +15% em relação ao mês anterior
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Em Produção</CardTitle>
            <div className="h-8 w-8 bg-amber-500/10 rounded-full flex items-center justify-center">
              <Hammer className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-secondary">{inProduction}</div>
            <p className="text-xs text-muted-foreground mt-1">Na marcenaria atualmente</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Entregas Pendentes
            </CardTitle>
            <div className="h-8 w-8 bg-blue-500/10 rounded-full flex items-center justify-center">
              <Truck className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-secondary">{pendingDeliveries}</div>
            <p className="text-xs text-muted-foreground mt-1">Previstas para os próximos 7 dias</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-7">
        {/* Chart */}
        <Card className="md:col-span-4 lg:col-span-5 shadow-sm">
          <CardHeader>
            <CardTitle>Histórico de Entregas</CardTitle>
            <CardDescription>Projetos concluídos nos últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent className="px-2">
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  tickMargin={10}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  tickFormatter={(v) => `${v}`}
                />
                <RechartsTooltip
                  content={<ChartTooltipContent />}
                  cursor={{ fill: 'var(--muted)' }}
                />
                <Bar
                  dataKey="completed"
                  fill="var(--color-completed)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={50}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card className="md:col-span-3 lg:col-span-2 shadow-sm flex flex-col">
          <CardHeader>
            <CardTitle>Atividades Recentes</CardTitle>
            <CardDescription>Últimas movimentações na fábrica</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="space-y-6">
              {recentActivities.map((activity, i) => (
                <div key={activity.id + i} className="flex items-start gap-4">
                  <div className="relative mt-1">
                    <div className="absolute top-6 bottom-[-24px] left-1/2 w-px -translate-x-1/2 bg-border last:hidden" />
                    {activity.type === 'success' ? (
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 ring-4 ring-white">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      </div>
                    ) : (
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 ring-4 ring-white">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium leading-none text-secondary">
                      {activity.title}
                    </p>
                    <p className="text-xs text-muted-foreground">{activity.desc}</p>
                    <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">
                      {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Access Clients */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight text-secondary">
            Clientes Ativos (Destaques)
          </h2>
          <Button variant="link" asChild className="text-primary p-0 h-auto">
            <Link to="/clientes">
              Ver todos <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clients.slice(0, 3).map((client) => (
            <Card key={client.id} className="shadow-sm hover:border-primary/50 transition-colors">
              <CardContent className="p-4 flex items-center gap-4">
                <Avatar className="h-10 w-10 border border-border">
                  <AvatarFallback className="bg-primary/10 text-primary font-bold">
                    {client.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-medium truncate">{client.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{client.email}</p>
                </div>
                <Badge variant="secondary" className="font-normal">
                  {client.totalProjects} projs
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
