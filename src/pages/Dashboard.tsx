import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Target,
  Users,
  Activity,
  CheckCircle,
  BarChart3,
  TrendingUp,
  Presentation,
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { Skeleton } from '@/components/ui/skeleton'

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [leads30d, setLeads30d] = useState(0)
  const [leadsQualificados, setLeadsQualificados] = useState(0)
  const [projetosVendidos, setProjetosVendidos] = useState(0)
  const [vendasPorConsultor, setVendasPorConsultor] = useState<{ nome: string; total: number }[]>(
    [],
  )
  const [projetosAndamento, setProjetosAndamento] = useState(0)
  const [fasesProjetos, setFasesProjetos] = useState<{ fase: string; total: number }[]>([])

  useEffect(() => {
    async function fetchData() {
      try {
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        const dateStr = thirtyDaysAgo.toISOString()

        // 1. Leads em 30 dias
        const { count: leadsCount } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .gte('criado_em', dateStr)

        if (leadsCount !== null) setLeads30d(leadsCount)

        // 2. Leads qualificados (status não é 'Novo Lead')
        const { count: qualificadosCount } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .gte('criado_em', dateStr)
          .neq('status', 'Novo Lead')

        if (qualificadosCount !== null) setLeadsQualificados(qualificadosCount)

        // 3 & 4. Projetos Vendidos e Quem Vendeu
        const { data: vendas } = await supabase
          .from('leads')
          .select('criado_por_nome, consultor_id, users(nome)')
          .not('data_venda', 'is', null)
          .gte('data_venda', dateStr)

        if (vendas) {
          setProjetosVendidos(vendas.length)

          const consultores: Record<string, number> = {}
          for (const v of vendas as any[]) {
            const nome = v.users?.nome || v.criado_por_nome || 'Consultor Indefinido'
            consultores[nome] = (consultores[nome] || 0) + 1
          }

          setVendasPorConsultor(
            Object.entries(consultores)
              .map(([nome, total]) => ({ nome, total }))
              .sort((a, b) => b.total - a.total),
          )
        }

        // 5 & 6. Projetos em Andamento e em cada fase
        const { data: projetos } = await supabase
          .from('produtos_servicos_projeto')
          .select('status_analise')

        if (projetos) {
          const andamento = projetos.filter(
            (p) => p.status_analise !== 'finalizado_montagem' && p.status_analise !== 'Concluído',
          )
          setProjetosAndamento(andamento.length)

          const fases: Record<string, number> = {}
          for (const p of andamento) {
            fases[p.status_analise] = (fases[p.status_analise] || 0) + 1
          }

          setFasesProjetos(
            Object.entries(fases)
              .map(([fase, total]) => ({ fase, total }))
              .sort((a, b) => b.total - a.total),
          )
        }
      } catch (error) {
        console.error('Erro ao carregar dados do dashboard', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const formatFase = (fase: string) => {
    return fase
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  }

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-300">
      <div className="bg-midnight-navy p-6 rounded-xl shadow-sm flex items-center gap-4">
        <Presentation className="h-10 w-10 text-emerald-400 hidden sm:block" />
        <div>
          <h1 className="text-[32px] font-bold text-off-white">Dashboard</h1>
          <p className="text-pale-cornflower mt-1">Visão em tempo real da operação e desempenho</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-32 w-full rounded-xl bg-steel-blue/20" />
            <Skeleton className="h-32 w-full rounded-xl bg-steel-blue/20" />
            <Skeleton className="h-32 w-full rounded-xl bg-steel-blue/20" />
            <Skeleton className="h-32 w-full rounded-xl bg-steel-blue/20" />
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-64 w-full rounded-xl bg-steel-blue/20" />
            <Skeleton className="h-64 w-full rounded-xl bg-steel-blue/20" />
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-off-white border-2 border-steel-blue/20 shadow-sm hover:border-steel-blue/50 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-bold text-midnight-navy">
                  Leads (30 Dias)
                </CardTitle>
                <Users className="h-5 w-5 text-steel-blue" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-dark-denim">{leads30d}</div>
                <p className="text-xs text-steel-blue font-medium mt-1">
                  Total de captações recentes
                </p>
              </CardContent>
            </Card>

            <Card className="bg-off-white border-2 border-steel-blue/20 shadow-sm hover:border-steel-blue/50 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-bold text-midnight-navy">
                  Leads Qualificados
                </CardTitle>
                <Target className="h-5 w-5 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-dark-denim">{leadsQualificados}</div>
                <p className="text-xs text-steel-blue font-medium mt-1">Avançaram no funil (30d)</p>
              </CardContent>
            </Card>

            <Card className="bg-off-white border-2 border-steel-blue/20 shadow-sm hover:border-steel-blue/50 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-bold text-midnight-navy">
                  Projetos Vendidos
                </CardTitle>
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-dark-denim">{projetosVendidos}</div>
                <p className="text-xs text-steel-blue font-medium mt-1">
                  Fechamentos nos últimos 30 dias
                </p>
              </CardContent>
            </Card>

            <Card className="bg-off-white border-2 border-steel-blue/20 shadow-sm hover:border-steel-blue/50 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-bold text-midnight-navy">
                  Projetos em Andamento
                </CardTitle>
                <Activity className="h-5 w-5 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black text-dark-denim">{projetosAndamento}</div>
                <p className="text-xs text-steel-blue font-medium mt-1">Na fábrica/montagem hoje</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="bg-off-white border-2 border-steel-blue/20 shadow-sm flex flex-col h-full max-h-[400px]">
              <CardHeader className="border-b border-steel-blue/10 bg-pale-cornflower/20">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-steel-blue" />
                  <CardTitle className="text-lg font-bold text-midnight-navy">
                    Performance de Vendas (30 Dias)
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-0">
                {vendasPorConsultor.length === 0 ? (
                  <div className="p-8 text-center text-midnight-navy/60 font-medium">
                    Nenhuma venda registrada nos últimos 30 dias.
                  </div>
                ) : (
                  <ul className="divide-y divide-steel-blue/10">
                    {vendasPorConsultor.map((v, i) => (
                      <li
                        key={i}
                        className="flex justify-between items-center p-4 hover:bg-pale-cornflower/10 transition-colors"
                      >
                        <span className="font-semibold text-midnight-navy flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-steel-blue/10 flex items-center justify-center text-steel-blue text-sm">
                            {i + 1}º
                          </div>
                          {v.nome}
                        </span>
                        <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-sm font-bold">
                          {v.total} {v.total === 1 ? 'venda' : 'vendas'}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card className="bg-off-white border-2 border-steel-blue/20 shadow-sm flex flex-col h-full max-h-[400px]">
              <CardHeader className="border-b border-steel-blue/10 bg-pale-cornflower/20">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-steel-blue" />
                  <CardTitle className="text-lg font-bold text-midnight-navy">
                    Distribuição por Fase (Fábrica)
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-0">
                {fasesProjetos.length === 0 ? (
                  <div className="p-8 text-center text-midnight-navy/60 font-medium">
                    Nenhum projeto em andamento no momento.
                  </div>
                ) : (
                  <ul className="divide-y divide-steel-blue/10">
                    {fasesProjetos.map((f, i) => (
                      <li
                        key={i}
                        className="flex justify-between items-center p-4 hover:bg-pale-cornflower/10 transition-colors"
                      >
                        <span className="font-medium text-midnight-navy">{formatFase(f.fase)}</span>
                        <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm font-bold">
                          {f.total} {f.total === 1 ? 'item' : 'itens'}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
