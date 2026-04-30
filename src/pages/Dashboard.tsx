import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Target, Users, Wallet, Activity } from 'lucide-react'

export default function Dashboard() {
  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-300">
      <div className="bg-midnight-navy p-6 rounded-xl shadow-sm">
        <h1 className="text-[32px] font-bold text-off-white">Dashboard</h1>
        <p className="text-pale-cornflower mt-1">Visão geral do sistema Bender</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-off-white border-2 border-steel-blue/20 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-midnight-navy">Leads Ativos</CardTitle>
            <Target className="h-4 w-4 text-steel-blue" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-dark-denim">45</div>
            <p className="text-xs text-steel-blue font-medium mt-1">+12 desde ontem</p>
          </CardContent>
        </Card>
        <Card className="bg-off-white border-2 border-steel-blue/20 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-midnight-navy">Vendas do Mês</CardTitle>
            <Wallet className="h-4 w-4 text-steel-blue" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-dark-denim">R$ 142.500</div>
            <p className="text-xs text-steel-blue font-medium mt-1">
              +15% em relação ao mês anterior
            </p>
          </CardContent>
        </Card>
        <Card className="bg-off-white border-2 border-steel-blue/20 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-midnight-navy">Novos Clientes</CardTitle>
            <Users className="h-4 w-4 text-steel-blue" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-dark-denim">8</div>
            <p className="text-xs text-steel-blue font-medium mt-1">Este mês</p>
          </CardContent>
        </Card>
        <Card className="bg-off-white border-2 border-steel-blue/20 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-midnight-navy">
              Projetos em Andamento
            </CardTitle>
            <Activity className="h-4 w-4 text-steel-blue" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-dark-denim">12</div>
            <p className="text-xs text-steel-blue font-medium mt-1">2 em atraso</p>
          </CardContent>
        </Card>
      </div>

      <div className="bg-pale-cornflower/30 border-2 border-steel-blue/20 rounded-xl p-12 text-center">
        <Activity className="h-16 w-16 text-steel-blue mx-auto mb-4 opacity-50" />
        <h3 className="text-2xl font-bold text-midnight-navy mb-2">Gráficos em Desenvolvimento</h3>
        <p className="text-midnight-navy/70">
          Os gráficos de origem de leads e saúde financeira serão implementados na próxima etapa.
        </p>
      </div>
    </div>
  )
}
