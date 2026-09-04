import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Users2,
  Briefcase,
  Truck,
  Wrench,
  Cake,
  Calendar,
  Hourglass,
  Clock,
  Building,
  UserCheck,
} from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import type { GestaoPessoasMetrics } from './types'

export function GestaoPessoasTab({ data }: { data: GestaoPessoasMetrics }) {
  const [activeList, setActiveList] = useState<'clt' | 'pj' | 'fornecedores'>('clt')

  const {
    total_clt,
    total_pj,
    total_montadores,
    total_fornecedores,
    idade_media_clt,
    tempo_medio_meses_clt,
    lista_clt,
    lista_pj,
    lista_fornecedores,
    aniversariantes,
    distribuicao_tempo_casa,
  } = data

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' })
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 4 Cards de Contagem do Efetivo: CLT, PJ/Parceiros, Montadores, Fornecedores */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Colaboradores CLT
            </CardTitle>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Users2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-foreground">{total_clt}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Equipe direta de fábrica e escritório
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Parceiros PJ
            </CardTitle>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Briefcase className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-foreground">{total_pj}</div>
            <p className="text-xs text-muted-foreground mt-1">Prestadores e empresas parceiras</p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Montadores Credenciados
            </CardTitle>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Wrench className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-foreground">{total_montadores}</div>
            <p className="text-xs text-muted-foreground mt-1">Equipes de montagem ativas</p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Fornecedores Cadastrados
            </CardTitle>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Truck className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-foreground">{total_fornecedores}</div>
            <p className="text-xs text-muted-foreground mt-1">Matéria-prima, insumos e serviços</p>
          </CardContent>
        </Card>
      </div>

      {/* Linha 1: Idade Média, Tempo Médio de Casa e Aniversariantes do Mês */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Métricas de Idade & Tempo de Casa CLT */}
        <Card className="border-border shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Tempo de Casa & Perfil Etário
            </CardTitle>
            <CardDescription>Indicadores de retenção e média da equipe CLT</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3.5 rounded-lg border border-border bg-muted/30 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-semibold uppercase">
                  Tempo Médio de Casa (CLT)
                </p>
                <p className="text-2xl font-black text-foreground mt-0.5">
                  {tempo_medio_meses_clt} <span className="text-sm font-semibold">meses</span>
                </p>
              </div>
              <div className="p-2.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Hourglass className="h-5 w-5" />
              </div>
            </div>

            <div className="p-3.5 rounded-lg border border-border bg-muted/30 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-semibold uppercase">
                  Idade Média da Equipe
                </p>
                <p className="text-2xl font-black text-foreground mt-0.5">
                  {idade_media_clt} <span className="text-sm font-semibold">anos</span>
                </p>
              </div>
              <div className="p-2.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <UserCheck className="h-5 w-5" />
              </div>
            </div>

            {/* Destaque do mais antigo */}
            {lista_clt.length > 0 && (
              <div className="text-xs text-muted-foreground bg-primary/5 p-3 rounded-md border border-primary/20">
                ⭐ <strong>Mais antigo de casa:</strong> {lista_clt[0].nome_completo} (desde{' '}
                {formatDate(lista_clt[0].data_admissao)})
              </div>
            )}
          </CardContent>
        </Card>

        {/* Distribuição por Faixa de Tempo de Casa */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Distribuição por Tempo de Casa
            </CardTitle>
            <CardDescription>Tempo de permanência dos colaboradores CLT</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[220px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={distribuicao_tempo_casa}
                  margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis
                    dataKey="faixa"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10, fill: 'currentColor' }}
                    angle={-20}
                    textAnchor="end"
                    height={40}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: 'currentColor' }}
                    className="text-muted-foreground"
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload as any
                        return (
                          <div className="bg-popover border border-border p-2 rounded shadow text-xs">
                            <p className="font-bold text-foreground">{d.faixa}</p>
                            <p className="text-primary font-semibold">Colaboradores: {d.total}</p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Bar dataKey="total" fill="#0284c7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Aniversariantes do Mês */}
        <Card className="border-border shadow-sm flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Cake className="h-4 w-4 text-pink-500" />
              Aniversariantes do Mês
            </CardTitle>
            <CardDescription>Celebrações da equipe no mês vigente</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto max-h-[240px] pt-1">
            {aniversariantes.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground py-8">
                Nenhum aniversariante neste mês
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {aniversariantes.map((niver, idx) => (
                  <li key={idx} className="py-2.5 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-xs text-foreground">{niver.nome}</p>
                      <span className="text-[10px] text-muted-foreground">{niver.tipo}</span>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-xs font-bold text-pink-600 dark:text-pink-400 border-pink-200"
                    >
                      Dia {niver.dia_mes}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Linha 2: Listas Ordenadas Antigo -> Recente (CLT, PJ, Fornecedores) */}
      <Card className="border-border shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Building className="h-5 w-5 text-primary" />
              Antiguidade e Tempo de Relacionamento (Mais Antigo → Mais Recente)
            </CardTitle>
            <CardDescription>
              Histórico cronológico de admissão e cadastro da empresa
            </CardDescription>
          </div>

          <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-lg border border-border">
            <Button
              size="sm"
              variant={activeList === 'clt' ? 'default' : 'ghost'}
              className="h-8 text-xs font-medium gap-1 px-3"
              onClick={() => setActiveList('clt')}
            >
              <Users2 className="h-3.5 w-3.5" />
              Equipe CLT ({total_clt})
            </Button>
            <Button
              size="sm"
              variant={activeList === 'pj' ? 'default' : 'ghost'}
              className="h-8 text-xs font-medium gap-1 px-3"
              onClick={() => setActiveList('pj')}
            >
              <Briefcase className="h-3.5 w-3.5" />
              Parceiros PJ ({total_pj})
            </Button>
            <Button
              size="sm"
              variant={activeList === 'fornecedores' ? 'default' : 'ghost'}
              className="h-8 text-xs font-medium gap-1 px-3"
              onClick={() => setActiveList('fornecedores')}
            >
              <Truck className="h-3.5 w-3.5" />
              Fornecedores ({total_fornecedores})
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {activeList === 'clt' && (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border">
                  <tr>
                    <th className="py-2.5 px-3 w-12 text-center">#</th>
                    <th className="py-2.5 px-3">Colaborador CLT</th>
                    <th className="py-2.5 px-3">Data Admissão</th>
                    <th className="py-2.5 px-3 text-right">Tempo de Casa</th>
                    <th className="py-2.5 px-3 text-right">Idade</th>
                    <th className="py-2.5 px-3">Telefone</th>
                    <th className="py-2.5 px-3">Município</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {lista_clt.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-2.5 px-3 text-center text-muted-foreground font-semibold">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-foreground">
                        {item.nome_completo}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-foreground">
                        {formatDate(item.data_admissao)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-primary">
                        {item.meses_empresa != null ? `${item.meses_empresa} meses` : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right text-muted-foreground">
                        {item.idade != null ? `${item.idade} anos` : '-'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-muted-foreground">
                        {item.telefone || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground">{item.municipio || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeList === 'pj' && (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border">
                  <tr>
                    <th className="py-2.5 px-3 w-12 text-center">#</th>
                    <th className="py-2.5 px-3">Razão Social</th>
                    <th className="py-2.5 px-3">CNPJ</th>
                    <th className="py-2.5 px-3">Sócio Responsável</th>
                    <th className="py-2.5 px-3">Cadastrado Em</th>
                    <th className="py-2.5 px-3 text-right">Meses Parceria</th>
                    <th className="py-2.5 px-3">Telefone</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {lista_pj.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-2.5 px-3 text-center text-muted-foreground font-semibold">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-foreground">{item.razao_social}</td>
                      <td className="py-2.5 px-3 font-mono text-muted-foreground">
                        {item.cnpj || '-'}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-foreground">
                        {item.socio_nome || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground">
                        {formatDate(item.criado_em)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                        {item.meses_parceria != null ? `${item.meses_parceria} meses` : '-'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-muted-foreground">
                        {item.telefone || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeList === 'fornecedores' && (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/60 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border">
                  <tr>
                    <th className="py-2.5 px-3 w-12 text-center">#</th>
                    <th className="py-2.5 px-3">Razão Social / Nome Fantasia</th>
                    <th className="py-2.5 px-3">CNPJ</th>
                    <th className="py-2.5 px-3">Cadastrado Em</th>
                    <th className="py-2.5 px-3">Município</th>
                    <th className="py-2.5 px-3">Telefone</th>
                    <th className="py-2.5 px-3">E-mail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {lista_fornecedores.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-2.5 px-3 text-center text-muted-foreground font-semibold">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-foreground">
                        <div>{item.razao_social}</div>
                        {item.nome_fantasia && (
                          <div className="text-[10px] font-normal text-muted-foreground">
                            {item.nome_fantasia}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-muted-foreground">
                        {item.cnpj || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground">
                        {formatDate(item.criado_em)}
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground">{item.municipio || '-'}</td>
                      <td className="py-2.5 px-3 font-mono text-muted-foreground">
                        {item.telefone || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground">{item.email || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
