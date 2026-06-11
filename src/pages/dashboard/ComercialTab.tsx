import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Briefcase, DollarSign } from 'lucide-react'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts'
import type { DashboardData } from './types'

export function ComercialTab({ data }: { data: DashboardData }) {
  const totalLeads = data.leads.length

  let valorTotal = 0
  const consultoresMap: Record<string, { total: number; vendidos: number; valor: number }> = {}

  data.leads.forEach((lead) => {
    const nome = lead.consultor?.nome || 'Sem Consultor'
    if (!consultoresMap[nome]) consultoresMap[nome] = { total: 0, vendidos: 0, valor: 0 }

    consultoresMap[nome].total++

    if (lead.status === 'Vendido') {
      consultoresMap[nome].vendidos++
      const form = data.forms.find((f) => f.lead_id === lead.id)
      const valor = Number(form?.valor_total) || 0
      consultoresMap[nome].valor += valor
      valorTotal += valor
    }
  })

  const consultoresData = Object.entries(consultoresMap)
    .map(([nome, stats]) => ({
      nome,
      atendimentos: stats.total,
      vendas: stats.vendidos,
      valor: stats.valor,
      taxa: stats.total ? (stats.vendidos / stats.total) * 100 : 0,
    }))
    .sort((a, b) => b.valor - a.valor)

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="bg-off-white border-2 border-steel-blue/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-midnight-navy">
              Atendimentos Gerais
            </CardTitle>
            <Briefcase className="h-5 w-5 text-steel-blue" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-dark-denim">{totalLeads}</div>
            <p className="text-xs text-steel-blue font-medium mt-1">No período selecionado</p>
          </CardContent>
        </Card>
        <Card className="bg-off-white border-2 border-steel-blue/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-midnight-navy">Valor em Vendas</CardTitle>
            <DollarSign className="h-5 w-5 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-dark-denim">{formatCurrency(valorTotal)}</div>
            <p className="text-xs text-steel-blue font-medium mt-1">Receita gerada</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-2 border-steel-blue/20">
          <CardHeader>
            <CardTitle className="text-lg text-midnight-navy">Atendimentos por Consultor</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ChartContainer config={{}} className="h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={consultoresData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="nome" type="category" width={100} fontSize={12} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="atendimentos"
                    name="Atendimentos"
                    fill="#3b82f6"
                    radius={[0, 4, 4, 0]}
                  />
                  <Bar dataKey="vendas" name="Vendas" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="border-2 border-steel-blue/20 flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg text-midnight-navy">Desempenho por Consultor</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto">
            <ul className="divide-y divide-steel-blue/10">
              {consultoresData.map((c, i) => (
                <li key={i} className="py-3 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-midnight-navy">{c.nome}</p>
                    <p className="text-xs text-steel-blue">
                      {c.vendas} vendas / {c.atendimentos} atend.
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-600">{formatCurrency(c.valor)}</p>
                    <p className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                      Conv: {c.taxa.toFixed(1)}%
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
