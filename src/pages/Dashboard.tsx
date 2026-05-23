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
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

import type { DashboardData } from './dashboard/types'
import { CaptacaoTab } from './dashboard/CaptacaoTab'
import { ComercialTab } from './dashboard/ComercialTab'
import { AnaliseTab } from './dashboard/AnaliseTab'
import { ProducaoTab } from './dashboard/ProducaoTab'
import { MontagemTab } from './dashboard/MontagemTab'

export default function Dashboard() {
  const [date, setDate] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: new Date(),
  })
  const [data, setData] = useState<DashboardData>({ leads: [], forms: [], projetos: [] })
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

        setData({
          leads: resLeads.data || [],
          projetos: resProj.data || [],
          forms: resForms.data || [],
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
    <div className="p-6 space-y-6 animate-in fade-in duration-300">
      <div className="bg-midnight-navy p-6 rounded-xl shadow-sm">
        <div className="flex items-center gap-4">
          <Presentation className="h-10 w-10 text-emerald-400 hidden sm:block" />
          <div>
            <h1 className="text-[32px] font-bold text-off-white">Dashboard Integrado</h1>
            <p className="text-pale-cornflower mt-1">Inteligência Operacional Bender Haussform</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-full sm:w-[280px] justify-start text-left font-normal bg-white text-midnight-navy hover:bg-pale-cornflower/20',
                !date && 'text-muted-foreground',
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date?.from ? (
                date.to ? (
                  <>
                    {format(date.from, 'dd/MM/yyyy', { locale: ptBR })} -{' '}
                    {format(date.to, 'dd/MM/yyyy', { locale: ptBR })}
                  </>
                ) : (
                  format(date.from, 'dd/MM/yyyy', { locale: ptBR })
                )
              ) : (
                <span>Filtrar período</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-off-white border-steel-blue/20" align="end">
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
        <Tabs defaultValue="captacao" className="w-full">
          <TabsList className="bg-pale-cornflower/20 p-1 rounded-xl mb-6 flex flex-wrap h-auto gap-2">
            <TabsTrigger
              value="captacao"
              className="rounded-lg data-[state=active]:bg-midnight-navy data-[state=active]:text-off-white"
            >
              Captação de Leads
            </TabsTrigger>
            <TabsTrigger
              value="comercial"
              className="rounded-lg data-[state=active]:bg-midnight-navy data-[state=active]:text-off-white"
            >
              Comercial
            </TabsTrigger>
            <TabsTrigger
              value="analise"
              className="rounded-lg data-[state=active]:bg-midnight-navy data-[state=active]:text-off-white"
            >
              Análise Técnica
            </TabsTrigger>
            <TabsTrigger
              value="producao"
              className="rounded-lg data-[state=active]:bg-midnight-navy data-[state=active]:text-off-white"
            >
              Produção
            </TabsTrigger>
            <TabsTrigger
              value="montagem"
              className="rounded-lg data-[state=active]:bg-midnight-navy data-[state=active]:text-off-white"
            >
              Montagem
            </TabsTrigger>
          </TabsList>

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
        </Tabs>
      )}
    </div>
  )
}
