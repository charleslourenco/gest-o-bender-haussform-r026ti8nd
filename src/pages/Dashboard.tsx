import { useState, useEffect } from 'react'
import { format, startOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarIcon, Presentation } from 'lucide-react'
import { DateRange } from 'react-day-picker'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'

import type { DashboardData as BaseDashboardData } from './dashboard/types'
import { CaptacaoTab } from './dashboard/CaptacaoTab'

interface DashboardData extends BaseDashboardData {
  contasPagarCount?: number | null
  solicitacoesCompraCount?: number | null
}
import { ComercialTab } from './dashboard/ComercialTab'
import { AnaliseTab } from './dashboard/AnaliseTab'
import { ProducaoTab } from './dashboard/ProducaoTab'
import { MontagemTab } from './dashboard/MontagemTab'

export default function Dashboard() {
  const [date, setDate] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: new Date(),
  })
  const [data, setData] = useState<DashboardData>({
    leads: [],
    forms: [],
    projetos: [],
    contasPagarCount: null,
    solicitacoesCompraCount: null,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const from = date?.from ? date.from.toISOString() : undefined
        const to = date?.to ? new Date(date.to.setHours(23, 59, 59, 999)).toISOString() : undefined

        let queryLeads = supabase
          .from('leads')
          .select('*, consultor:users!leads_consultor_id_fkey(nome)')
        if (from) queryLeads = queryLeads.gte('criado_em', from)
        if (to) queryLeads = queryLeads.lte('criado_em', to)

        let queryProj = supabase
          .from('produtos_servicos_projeto')
          .select(
            '*, analista:users!produtos_servicos_projeto_analista_id_fkey(nome), cliente:clientes(nome)',
          )
        if (from) queryProj = queryProj.gte('atualizado_em', from)
        if (to) queryProj = queryProj.lte('atualizado_em', to)

        const queryForms = supabase.from('formulario_comercial').select('lead_id, valor_total')

        const [resLeads, resProj, resForms] = await Promise.all([queryLeads, queryProj, queryForms])

        // Robust data fetching for Solicitações de Compra Pendentes using HEAD request properly
        let solicitacoesCompraCount: number | null = null
        try {
          const { count, error } = await supabase
            .from('solicitacoes_compra')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'Pendente')

          if (error) {
            console.warn('[Dashboard] Supabase error fetching solicitacoes_compra:', error)
            solicitacoesCompraCount = 0
          } else {
            solicitacoesCompraCount = count ?? 0
          }
        } catch (err) {
          console.warn('[Dashboard] Exception fetching solicitacoes_compra:', err)
          solicitacoesCompraCount = 0
        }

        // Robust data fetching for Accounts Payable (Contas a Pagar)
        let contasPagarCount: number | null = null
        try {
          const targetDate = to || new Date().toISOString()

          // Using a standard GET request with raw fetch to ensure we can validate
          // the response before JSON.parse, preventing "Unexpected end of JSON input"
          const { data: sessionData } = await supabase.auth.getSession()
          const token = sessionData.session?.access_token || ''
          const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/contas_pagar`)
          url.searchParams.append('status_pagamento', 'eq.aguardando')
          url.searchParams.append('data_vencimento', `lte.${targetDate}`)
          url.searchParams.append('select', '*')
          url.searchParams.append('limit', '1')

          const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${token}`,
              Prefer: 'count=exact',
            },
          })

          const textBody = await response.text()

          // Parsing Safety: Add validation to ensure that JSON.parse is only called if the response body is not empty
          if (textBody && textBody.trim().length > 0) {
            try {
              const data = JSON.parse(textBody)
              const contentRange = response.headers.get('content-range')
              if (contentRange) {
                contasPagarCount = parseInt(contentRange.split('/')[1], 10)
              } else {
                contasPagarCount = Array.isArray(data) ? data.length : 0
              }
            } catch (parseError) {
              console.warn('[Dashboard] Invalid JSON response:', parseError)
              contasPagarCount = 0
            }
          } else {
            contasPagarCount = 0
          }
        } catch (fetchError) {
          // Resilience: keep functional if connection is unstable
          console.warn(
            '[Dashboard] Network error fetching contas_pagar (Backend disconnected?):',
            fetchError,
          )
        }

        setData({
          leads: resLeads.data || [],
          projetos: resProj.data || [],
          forms: resForms.data || [],
          contasPagarCount,
          solicitacoesCompraCount,
        })
      } catch (error) {
        console.error('Erro ao carregar dados', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [date])

  return (
    <div className="pt-0 pb-6 px-6 h-full flex flex-col animate-in fade-in duration-300">
      <Tabs defaultValue="captacao" className="w-full flex-1 flex flex-col min-h-0 mt-0">
        <div className="flex flex-row items-center w-full bg-[#0A1931] text-white px-4 py-3 rounded-md mt-0 flex-nowrap overflow-x-auto overflow-y-hidden gap-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="flex flex-row items-center gap-2 shrink-0 whitespace-nowrap">
            <div className="flex items-center gap-2 mr-2">
              <Presentation className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-bold text-white">Dashboard Integrado</h2>
            </div>
            <TabsList className="bg-white/10 border-none h-9">
              <TabsTrigger
                value="captacao"
                className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/60"
              >
                Captação de Leads
              </TabsTrigger>
              <TabsTrigger
                value="comercial"
                className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/60"
              >
                Comercial
              </TabsTrigger>
              <TabsTrigger
                value="analise"
                className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/60"
              >
                Análise Técnica
              </TabsTrigger>
              <TabsTrigger
                value="producao"
                className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/60"
              >
                Produção
              </TabsTrigger>
              <TabsTrigger
                value="montagem"
                className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/60"
              >
                Montagem
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        <div className="flex flex-row items-center justify-end w-full px-1 py-3 mb-2 flex-wrap gap-4">
          <div className="flex flex-row items-center gap-3 shrink-0 whitespace-nowrap">
            <div className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-md h-9 border border-border">
              <span className="text-muted-foreground text-sm font-medium">Contas a Pagar:</span>
              {loading ? (
                <Skeleton className="h-5 w-8" />
              ) : data.contasPagarCount === null ? (
                <span className="text-destructive text-sm font-medium">Erro</span>
              ) : (
                <span className="font-bold text-foreground">{data.contasPagarCount}</span>
              )}
            </div>

            <div className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-md h-9 border border-border">
              <span className="text-muted-foreground text-sm font-medium">
                Solicitações Pendentes:
              </span>
              {loading ? (
                <Skeleton className="h-5 w-8" />
              ) : data.solicitacoesCompraCount === null ? (
                <span className="text-destructive text-sm font-medium">Erro</span>
              ) : (
                <span className="font-bold text-foreground">{data.solicitacoesCompraCount}</span>
              )}
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-9 px-3 border-border text-foreground hover:bg-muted"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date?.from ? (
                    date.to ? (
                      <span className="text-sm font-normal">
                        {format(date.from, 'dd/MM/yyyy', { locale: ptBR })} -{' '}
                        {format(date.to, 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                    ) : (
                      <span className="text-sm font-normal">
                        {format(date.from, 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                    )
                  ) : (
                    <span className="text-sm font-normal">Filtrar período</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 border-border" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={date?.from}
                  selected={date}
                  onSelect={setDate}
                  numberOfMonths={2}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 w-full">
          {loading ? (
            <div className="space-y-6">
              <Skeleton className="h-12 w-full max-w-2xl rounded-lg bg-steel-blue/20" />
              <div className="grid gap-6 md:grid-cols-3">
                <Skeleton className="h-32 w-full rounded-xl bg-steel-blue/20" />
                <Skeleton className="h-32 w-full rounded-xl bg-steel-blue/20" />
                <Skeleton className="h-32 w-full rounded-xl bg-steel-blue/20" />
              </div>
              <Skeleton className="h-96 w-full rounded-xl bg-steel-blue/20" />
            </div>
          ) : (
            <>
              <TabsContent value="captacao" className="mt-0">
                <CaptacaoTab data={data} />
              </TabsContent>
              <TabsContent value="comercial" className="mt-0">
                <ComercialTab data={data} />
              </TabsContent>
              <TabsContent value="analise" className="mt-0">
                <AnaliseTab data={data} />
              </TabsContent>
              <TabsContent value="producao" className="mt-0">
                <ProducaoTab data={data} />
              </TabsContent>
              <TabsContent value="montagem" className="mt-0">
                <MontagemTab data={data} />
              </TabsContent>
            </>
          )}
        </div>
      </Tabs>
    </div>
  )
}
