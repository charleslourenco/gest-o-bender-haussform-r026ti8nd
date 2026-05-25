import { useState, useEffect } from 'react'
import { fetchLeads } from '@/services/comercial'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, CheckCircle2, Clock, AlertCircle, TrendingUp, BarChart } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

export function ComercialIndicators() {
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchLeads()
        setLeads(data || [])
      } catch (error) {
        console.error('Erro ao buscar leads:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-[60px] mb-2" />
              <Skeleton className="h-3 w-[120px]" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const totalLeads = leads.length
  const leadsVendido = leads.filter((l) => l.status === 'Vendido').length
  const leadsEmAndamento = leads.filter((l) => !['Vendido', 'Perdido'].includes(l.status)).length
  const leadsPerdido = leads.filter((l) => l.status === 'Perdido').length

  const taxaConversao = totalLeads > 0 ? ((leadsVendido / totalLeads) * 100).toFixed(1) : '0.0'

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">Total de Leads</CardTitle>
            <div className="bg-blue-100 p-2 rounded-full">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-midnight-navy">{totalLeads}</div>
            <p className="text-xs text-gray-500 mt-1 font-medium">Registrados no sistema</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">Em Andamento</CardTitle>
            <div className="bg-amber-100 p-2 rounded-full">
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-midnight-navy">{leadsEmAndamento}</div>
            <p className="text-xs text-gray-500 mt-1 font-medium">Oportunidades ativas</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">Vendidos</CardTitle>
            <div className="bg-emerald-100 p-2 rounded-full">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-midnight-navy">{leadsVendido}</div>
            <div className="flex items-center mt-1 text-xs text-emerald-600 font-medium">
              <TrendingUp className="w-3 h-3 mr-1" />
              Taxa de conversão: {taxaConversao}%
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">Perdidos</CardTitle>
            <div className="bg-red-100 p-2 rounded-full">
              <AlertCircle className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-midnight-navy">{leadsPerdido}</div>
            <p className="text-xs text-gray-500 mt-1 font-medium">Negócios não fechados</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="border-b border-gray-100">
          <div className="flex items-center gap-2">
            <BarChart className="w-5 h-5 text-midnight-navy" />
            <CardTitle className="text-lg font-semibold text-midnight-navy">
              Origem dos Leads
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {Object.entries(
              leads.reduce(
                (acc, lead) => {
                  const origem = lead.origem || 'Desconhecida'
                  acc[origem] = (acc[origem] || 0) + 1
                  return acc
                },
                {} as Record<string, number>,
              ),
            )
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .map(([origem, count]) => (
                <div key={origem} className="flex items-center">
                  <div className="w-32 text-sm font-medium text-gray-700 truncate" title={origem}>
                    {origem}
                  </div>
                  <div className="flex-1 ml-4">
                    <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-pale-cornflower"
                        style={{ width: `${Math.max(1, ((count as number) / totalLeads) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-12 text-right text-sm font-bold text-midnight-navy ml-4">
                    {count as number}
                  </div>
                </div>
              ))}

            {leads.length === 0 && (
              <div className="text-center text-gray-500 py-4">Sem dados de origem para exibir.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
