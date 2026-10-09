import React, { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase/client'
import { runWithAuthRecovery } from '@/lib/supabase/auth-recovery'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertTriangle,
  TrendingUp,
  Send,
  Briefcase,
  Calculator,
  RefreshCw,
  Info,
  DollarSign,
  UserX,
  Users,
  Calendar,
  Layers,
  AlertCircle,
  HelpCircle,
} from 'lucide-react'
import type { DateRangeProps } from './AtendimentosTab'
import { PendenciasCadastro } from './PendenciasCadastro'

export interface FunilRealTriagem {
  chegaram: number
  outros_assuntos: number
  comerciais: number
  despachados: number
  para_consultoria: number
  para_orcamento: number
  perdidos_na_triagem: number
  nao_e_lead: number
  em_aberto_no_quadro: number
  sem_desfecho_fora_do_quadro: number
  despachados_sem_data_registrada: number
  taxa_despacho: number | null
  taxa_despacho_resolvidos: number | null
}

export interface FunilRealEtapa {
  entraram: number
  vindos_da_triagem: number
  cadastrados_direto: number
  com_data_de_entrada_aproximada: number
  vendidos: number
  valor_vendido: number
  vendido_sem_contrato: number
  perdidos: number
  em_aberto_no_quadro: number
  sem_desfecho_fora_do_quadro: number
  orcamento_concluido_sem_desfecho: number
  taxa_conversao: number | null
  taxa_conversao_resolvidos: number | null
}

export interface FunilRealVendasPorMes {
  mes: string
  quantidade: number
  valor: number
  no_funil: number
  fora_do_funil: number
}

export interface FunilRealVendasPorConsultor {
  consultor: string
  quantidade: number
  valor: number
}

export interface FunilRealVendas {
  quantidade: number
  valor: number
  ticket_medio: number | null
  ticket_mediano: number | null
  no_funil: {
    quantidade: number
    valor: number
  }
  fora_do_funil: {
    quantidade: number
    valor: number
  }
  por_mes: FunilRealVendasPorMes[]
  por_consultor: FunilRealVendasPorConsultor[]
}

export interface FunilRealPerdaMotivo {
  fase: string
  motivo: string
  quantidade: number
}

export interface FunilRealPerdas {
  total: number
  por_fase: Record<string, number>
  por_motivo: FunilRealPerdaMotivo[]
}

export interface FunilRealOrigemItem {
  origem: string
  chegaram: number
  despachados: number
  taxa_despacho: number | null
  vendas: number
  valor: number
}

export interface FunilRealConsultorItem {
  consultor: string
  caminho: string
  entraram: number
  vendidos: number
  perdidos: number
  em_aberto: number
  valor: number
  taxa_conversao: number | null
}

export interface FunilRealPendenciasHoje {
  vendido_sem_contrato: number
  contrato_sem_status_vendido: number
  contrato_em_cadastro_excluido: number
  consultoria_no_quadro_sem_responsavel: number
  sem_desfecho_fora_do_quadro: number
  comercial_no_quadro_sem_origem: number
  perdidos_sem_data_da_perda: number
  erros_de_registro: number
}

export interface FunilRealResponse {
  avisos: string[]
  periodo?: {
    inicio: string
    fim: string
  }
  gerado_em?: string
  triagem: FunilRealTriagem
  consultoria: FunilRealEtapa
  orcamento: FunilRealEtapa
  vendas: FunilRealVendas
  perdas: FunilRealPerdas
  origens: FunilRealOrigemItem[]
  consultores: FunilRealConsultorItem[]
  pendencias_hoje: FunilRealPendenciasHoje
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

function formatCurrency(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return 'R$ 0,00'
  return currencyFormatter.format(val)
}

function formatTaxa(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return 'sem dado'
  return `${val.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
}

function formatNumero(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '0'
  return val.toLocaleString('pt-BR')
}

function formatMesPt(mesAno: string): string {
  if (!mesAno) return '-'
  const parts = mesAno.split('-')
  if (parts.length === 2) {
    const [ano, mes] = parts
    const meses = [
      'Jan',
      'Fev',
      'Mar',
      'Abr',
      'Mai',
      'Jun',
      'Jul',
      'Ago',
      'Set',
      'Out',
      'Nov',
      'Dez',
    ]
    const idx = parseInt(mes, 10) - 1
    if (idx >= 0 && idx < 12) {
      return `${meses[idx]}/${ano}`
    }
  }
  return mesAno
}

const FASE_NOMES: Record<string, string> = {
  triagem: 'Novo Contato (SDR)',
  novo_contato: 'Novo Contato (SDR)',
  consultoria: 'Consultoria',
  orcamento: 'Orçamentos',
  orcamentos: 'Orçamentos',
  followup: 'Follow up',
}

function getFaseNome(fase: string): string {
  const chave = (fase || '').toLowerCase().trim()
  return FASE_NOMES[chave] || (fase ? fase.charAt(0).toUpperCase() + fase.slice(1) : 'Geral')
}

export function FunilRealSubTab({ dateRange }: { dateRange?: DateRangeProps }) {
  const [data, setData] = useState<FunilRealResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      let p_inicio = '2026-01-01'
      let p_fim = format(new Date(), 'yyyy-MM-dd')

      if (dateRange?.from) {
        p_inicio = format(new Date(dateRange.from), 'yyyy-MM-dd')
      }
      if (dateRange?.to) {
        p_fim = format(new Date(dateRange.to), 'yyyy-MM-dd')
      }

      const res = await runWithAuthRecovery<FunilRealResponse>(() =>
        supabase.rpc('painel_funil_real', {
          p_inicio,
          p_fim,
        }),
      )

      if (res.error) {
        console.error('[FunilRealSubTab] Erro ao carregar painel_funil_real:', res.error)
        setError(res.error.message || 'Erro ao carregar dados do Funil Real.')
      } else if (res.data) {
        // PostgREST pode devolver objeto diretamente ou como JSON parsed
        const parsed = (
          typeof res.data === 'string' ? JSON.parse(res.data) : res.data
        ) as FunilRealResponse
        setData(parsed)
      } else {
        setError('Nenhum dado retornado da função.')
      }
    } catch (err: any) {
      console.error('[FunilRealSubTab] Exceção ao consultar painel_funil_real:', err)
      setError(err?.message || 'Erro inesperado ao consultar dados do Funil Real.')
    } finally {
      setLoading(false)
    }
  }, [dateRange?.from, dateRange?.to])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <Skeleton className="h-20 w-full rounded-xl" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-36 w-full rounded-xl" />
          <Skeleton className="h-36 w-full rounded-xl" />
          <Skeleton className="h-36 w-full rounded-xl" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <Card className="border-destructive/40 bg-destructive/5 p-8 text-center shadow-sm">
        <div className="flex flex-col items-center justify-center gap-3">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <h3 className="text-base font-bold text-destructive">Falha ao carregar Funil Real</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            {error || 'Não foi possível obter os dados calculados pelo banco de dados.'}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            className="mt-2 gap-2 border-destructive/30 hover:bg-destructive/10"
          >
            <RefreshCw className="h-4 w-4" />
            Tentar novamente
          </Button>
        </div>
      </Card>
    )
  }

  const {
    avisos = [],
    triagem,
    consultoria,
    orcamento,
    vendas,
    perdas,
    origens = [],
    consultores = [],
  } = data

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. CAIXA DE AVISOS */}
      {avisos && avisos.length > 0 && (
        <div className="rounded-xl border border-amber-300/80 bg-amber-50/90 dark:border-amber-900/60 dark:bg-amber-950/30 p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-500 text-white shrink-0 mt-0.5 shadow-sm">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-extrabold text-amber-800 dark:text-amber-300 tracking-wider">
                  Avisos Metodológicos do Funil Real
                </span>
                <Badge
                  variant="outline"
                  className="border-amber-400 text-amber-800 dark:text-amber-300 bg-amber-100/60 dark:bg-amber-900/40 text-[10px] py-0 px-2 font-bold"
                >
                  {avisos.length} {avisos.length === 1 ? 'aviso' : 'avisos'}
                </Badge>
              </div>
              <ul className="text-xs sm:text-sm text-amber-900 dark:text-amber-200 list-disc list-inside space-y-1 font-medium">
                {avisos.map((aviso, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {aviso}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* BLOCO: PENDÊNCIAS DE CADASTRO (RPC painel_pendencias_listas) */}
      <PendenciasCadastro />

      {/* 2. TRÊS CARDS GRANDES LADO A LADO */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Card 1: Taxa de Despacho (Triagem) */}
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-semibold text-muted-foreground">
                Taxa de despacho
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                despachados de comerciais
              </CardDescription>
            </div>
            <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
              <Send className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-3xl font-extrabold text-foreground">
              {formatTaxa(triagem?.taxa_despacho)}
            </div>
            <div className="flex items-center justify-between text-xs pt-2 border-t border-border">
              <span className="text-muted-foreground font-medium">Entre resolvidos:</span>
              <span className="font-bold text-foreground">
                {formatTaxa(triagem?.taxa_despacho_resolvidos)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Conversão de Consultoria */}
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-semibold text-muted-foreground">
                Conversão de consultoria
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">vendidos de entraram</CardDescription>
            </div>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
              <Briefcase className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-3xl font-extrabold text-foreground">
              {formatTaxa(consultoria?.taxa_conversao)}
            </div>
            <div className="flex items-center justify-between text-xs pt-2 border-t border-border">
              <span className="text-muted-foreground font-medium">Entre resolvidos:</span>
              <span className="font-bold text-foreground">
                {formatTaxa(consultoria?.taxa_conversao_resolvidos)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Conversão de Orçamento */}
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-semibold text-muted-foreground">
                Conversão de orçamento
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">vendidos de entraram</CardDescription>
            </div>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
              <Calculator className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-3xl font-extrabold text-foreground">
              {formatTaxa(orcamento?.taxa_conversao)}
            </div>
            <div className="flex items-center justify-between text-xs pt-2 border-t border-border">
              <span className="text-muted-foreground font-medium">Entre resolvidos:</span>
              <span className="font-bold text-foreground">
                {formatTaxa(orcamento?.taxa_conversao_resolvidos)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. ABAIXO DE CADA CARD, A COMPOSIÇÃO EM LISTA */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Composição: Triagem */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Send className="h-4 w-4 text-primary" />
                Composição: Triagem
              </CardTitle>
              <Badge variant="outline" className="text-xs font-semibold">
                {formatNumero(triagem?.chegaram)} chegaram
              </Badge>
            </div>
            <CardDescription className="text-xs mt-0.5">
              {formatNumero(triagem?.comerciais)} comerciais (
              {formatNumero(triagem?.outros_assuntos)} outros)
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-3">
            <ul className="divide-y divide-border text-xs">
              <li className="py-2 flex items-center justify-between font-medium">
                <span className="text-muted-foreground">Despachados p/ consultoria</span>
                <span className="font-bold text-foreground">
                  {formatNumero(triagem?.para_consultoria)}
                </span>
              </li>
              <li className="py-2 flex items-center justify-between font-medium">
                <span className="text-muted-foreground">Despachados p/ orçamento</span>
                <span className="font-bold text-foreground">
                  {formatNumero(triagem?.para_orcamento)}
                </span>
              </li>
              <li className="py-2 flex items-center justify-between font-medium">
                <span className="text-muted-foreground">Perdidos na triagem</span>
                <span className="font-bold text-rose-600 dark:text-rose-400">
                  {formatNumero(triagem?.perdidos_na_triagem)}
                </span>
              </li>
              <li className="py-2 flex items-center justify-between font-medium">
                <span className="text-muted-foreground">Não é lead</span>
                <span className="font-semibold text-foreground">
                  {formatNumero(triagem?.nao_e_lead)}
                </span>
              </li>
              <li className="py-2 flex items-center justify-between font-medium">
                <span className="text-muted-foreground">Em aberto no quadro</span>
                <span className="font-semibold text-amber-600 dark:text-amber-400">
                  {formatNumero(triagem?.em_aberto_no_quadro)}
                </span>
              </li>
              <li className="py-2 flex items-center justify-between font-medium">
                <span className="text-muted-foreground">Sem desfecho fora do quadro</span>
                <span className="font-semibold text-amber-600 dark:text-amber-400">
                  {formatNumero(triagem?.sem_desfecho_fora_do_quadro)}
                </span>
              </li>
              <li className="py-2 flex items-center justify-between font-medium">
                <span className="text-muted-foreground">Outros assuntos</span>
                <span className="font-semibold text-muted-foreground">
                  {formatNumero(triagem?.outros_assuntos)}
                </span>
              </li>
              {triagem?.despachados_sem_data_registrada ? (
                <li className="py-2 flex items-center justify-between font-medium text-[11px] text-muted-foreground/80">
                  <span>Despachados sem data reg.</span>
                  <span>{formatNumero(triagem.despachados_sem_data_registrada)}</span>
                </li>
              ) : null}
            </ul>
          </CardContent>
        </Card>

        {/* Composição: Consultoria */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Composição: Consultoria
              </CardTitle>
              <Badge variant="outline" className="text-xs font-semibold">
                {formatNumero(consultoria?.entraram)} entraram
              </Badge>
            </div>
            <CardDescription className="text-xs mt-0.5">
              Valor vendido:{' '}
              <strong className="text-foreground">
                {formatCurrency(consultoria?.valor_vendido)}
              </strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-3">
            <ul className="divide-y divide-border text-xs">
              <li className="py-2 flex items-center justify-between font-medium">
                <span className="text-muted-foreground">Vendidos</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {formatNumero(consultoria?.vendidos)}
                </span>
              </li>
              <li className="py-2 flex items-center justify-between font-medium">
                <span className="text-muted-foreground">Vendido sem contrato</span>
                <span className="font-semibold text-amber-600 dark:text-amber-400">
                  {formatNumero(consultoria?.vendido_sem_contrato)}
                </span>
              </li>
              <li className="py-2 flex items-center justify-between font-medium">
                <span className="text-muted-foreground">Perdidos</span>
                <span className="font-bold text-rose-600 dark:text-rose-400">
                  {formatNumero(consultoria?.perdidos)}
                </span>
              </li>
              <li className="py-2 flex items-center justify-between font-medium">
                <span className="text-muted-foreground">Em aberto no quadro</span>
                <span className="font-semibold text-amber-600 dark:text-amber-400">
                  {formatNumero(consultoria?.em_aberto_no_quadro)}
                </span>
              </li>
              <li className="py-2 flex items-center justify-between font-medium">
                <span className="text-muted-foreground">Sem desfecho fora do quadro</span>
                <span className="font-semibold text-amber-600 dark:text-amber-400">
                  {formatNumero(consultoria?.sem_desfecho_fora_do_quadro)}
                </span>
              </li>
              <li className="py-2 flex items-center justify-between font-medium">
                <span className="text-muted-foreground">Cadastrados direto</span>
                <span className="font-semibold text-foreground">
                  {formatNumero(consultoria?.cadastrados_direto)}
                </span>
              </li>
              <li className="py-2 flex items-center justify-between font-medium">
                <span className="text-muted-foreground">Com data aproximada</span>
                <span className="font-semibold text-foreground">
                  {formatNumero(consultoria?.com_data_de_entrada_aproximada)}
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Composição: Orçamento */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Calculator className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                Composição: Orçamento
              </CardTitle>
              <Badge variant="outline" className="text-xs font-semibold">
                {formatNumero(orcamento?.entraram)} entraram
              </Badge>
            </div>
            <CardDescription className="text-xs mt-0.5">
              Valor vendido:{' '}
              <strong className="text-foreground">
                {formatCurrency(orcamento?.valor_vendido)}
              </strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-3">
            <ul className="divide-y divide-border text-xs">
              <li className="py-2 flex items-center justify-between font-medium">
                <span className="text-muted-foreground">Vendidos</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {formatNumero(orcamento?.vendidos)}
                </span>
              </li>
              <li className="py-2 flex items-center justify-between font-medium">
                <span className="text-muted-foreground">Vendido sem contrato</span>
                <span className="font-semibold text-amber-600 dark:text-amber-400">
                  {formatNumero(orcamento?.vendido_sem_contrato)}
                </span>
              </li>
              <li className="py-2 flex items-center justify-between font-medium">
                <span className="text-muted-foreground">Perdidos</span>
                <span className="font-bold text-rose-600 dark:text-rose-400">
                  {formatNumero(orcamento?.perdidos)}
                </span>
              </li>
              <li className="py-2 flex items-center justify-between font-medium">
                <span className="text-muted-foreground">Em aberto no quadro</span>
                <span className="font-semibold text-amber-600 dark:text-amber-400">
                  {formatNumero(orcamento?.em_aberto_no_quadro)}
                </span>
              </li>
              <li className="py-2 flex items-center justify-between font-medium">
                <span className="text-muted-foreground">Orçamento concluído sem desfecho</span>
                <span className="font-semibold text-amber-600 dark:text-amber-400">
                  {formatNumero(orcamento?.orcamento_concluido_sem_desfecho)}
                </span>
              </li>
              <li className="py-2 flex items-center justify-between font-medium">
                <span className="text-muted-foreground">Sem desfecho fora do quadro</span>
                <span className="font-semibold text-amber-600 dark:text-amber-400">
                  {formatNumero(orcamento?.sem_desfecho_fora_do_quadro)}
                </span>
              </li>
              <li className="py-2 flex items-center justify-between font-medium">
                <span className="text-muted-foreground">Cadastrados direto</span>
                <span className="font-semibold text-foreground">
                  {formatNumero(orcamento?.cadastrados_direto)}
                </span>
              </li>
              <li className="py-2 flex items-center justify-between font-medium">
                <span className="text-muted-foreground">Com data aproximada</span>
                <span className="font-semibold text-foreground">
                  {formatNumero(orcamento?.com_data_de_entrada_aproximada)}
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* 4. BLOCO: VENDAS DO PERÍODO (PELA DATA DO CONTRATO) */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                Vendas do período (pela data do contrato)
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Contratos com data de assinatura dentro do intervalo selecionado
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-semibold">
                {formatNumero(vendas?.quantidade)} {vendas?.quantidade === 1 ? 'venda' : 'vendas'}
              </Badge>
              <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold">
                {formatCurrency(vendas?.valor)}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-6">
          {/* Métricas Principais de Vendas */}
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <div className="p-3.5 rounded-lg border border-border bg-card">
              <span className="text-xs text-muted-foreground font-medium block">Quantidade</span>
              <span className="text-2xl font-extrabold text-foreground mt-1 block">
                {formatNumero(vendas?.quantidade)}
              </span>
            </div>
            <div className="p-3.5 rounded-lg border border-border bg-card">
              <span className="text-xs text-muted-foreground font-medium block">Valor total</span>
              <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 block truncate">
                {formatCurrency(vendas?.valor)}
              </span>
            </div>
            <div className="p-3.5 rounded-lg border border-border bg-card">
              <span className="text-xs text-muted-foreground font-medium block">Ticket médio</span>
              <span className="text-2xl font-extrabold text-foreground mt-1 block truncate">
                {formatCurrency(vendas?.ticket_medio)}
              </span>
            </div>
            <div className="p-3.5 rounded-lg border border-border bg-card">
              <span className="text-xs text-muted-foreground font-medium block">
                Ticket mediano
              </span>
              <span className="text-2xl font-extrabold text-foreground mt-1 block truncate">
                {formatCurrency(vendas?.ticket_mediano)}
              </span>
            </div>
          </div>

          {/* Duas Linhas Separadas: Pelo funil e Recompra / venda direta */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="p-4 rounded-lg border border-border bg-muted/30 flex items-center justify-between">
              <div>
                <span className="text-xs uppercase font-extrabold text-muted-foreground tracking-wider block">
                  Pelo funil
                </span>
                <span className="text-sm text-muted-foreground mt-0.5 block">
                  Origens captadas no fluxo comercial
                </span>
              </div>
              <div className="text-right">
                <span className="text-lg font-extrabold text-foreground block">
                  {formatNumero(vendas?.no_funil?.quantidade)}{' '}
                  {vendas?.no_funil?.quantidade === 1 ? 'venda' : 'vendas'}
                </span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block">
                  {formatCurrency(vendas?.no_funil?.valor)}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-border bg-muted/30 flex items-center justify-between">
              <div>
                <span className="text-xs uppercase font-extrabold text-muted-foreground tracking-wider block">
                  Recompra / venda direta
                </span>
                <span className="text-sm text-muted-foreground mt-0.5 block">
                  Vendas fora do funil comercial ativo
                </span>
              </div>
              <div className="text-right">
                <span className="text-lg font-extrabold text-foreground block">
                  {formatNumero(vendas?.fora_do_funil?.quantidade)}{' '}
                  {vendas?.fora_do_funil?.quantidade === 1 ? 'venda' : 'vendas'}
                </span>
                <span className="text-xs font-bold text-muted-foreground block">
                  {formatCurrency(vendas?.fora_do_funil?.valor)}
                </span>
              </div>
            </div>
          </div>

          {/* Duas Tabelas: Por Mês e Por Consultor */}
          <div className="grid gap-6 lg:grid-cols-2 items-start">
            {/* Tabela de Vendas por Mês */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                Vendas por Mês
              </h4>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Mês</th>
                      <th className="py-2.5 px-3 text-right font-semibold">Qtd</th>
                      <th className="py-2.5 px-3 text-right font-semibold">Valor</th>
                      <th className="py-2.5 px-3 text-right font-semibold">No Funil</th>
                      <th className="py-2.5 px-3 text-right font-semibold">Fora Funil</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-card">
                    {(vendas?.por_mes || []).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-muted-foreground">
                          Nenhuma venda no período
                        </td>
                      </tr>
                    ) : (
                      vendas.por_mes.map((m) => (
                        <tr key={m.mes} className="hover:bg-muted/30 transition-colors">
                          <td className="py-2 px-3 font-semibold text-foreground">
                            {formatMesPt(m.mes)}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-foreground">
                            {m.quantidade}
                          </td>
                          <td className="py-2 px-3 text-right font-medium text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(m.valor)}
                          </td>
                          <td className="py-2 px-3 text-right font-medium text-foreground">
                            {m.no_funil}
                          </td>
                          <td className="py-2 px-3 text-right font-medium text-muted-foreground">
                            {m.fora_do_funil}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tabela de Vendas por Consultor */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-primary" />
                Vendas por Consultor
              </h4>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Consultor</th>
                      <th className="py-2.5 px-3 text-right font-semibold">Qtd</th>
                      <th className="py-2.5 px-3 text-right font-semibold">Valor Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-card">
                    {(vendas?.por_consultor || []).length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-4 text-center text-muted-foreground">
                          Nenhuma venda associada a consultor
                        </td>
                      </tr>
                    ) : (
                      vendas.por_consultor.map((c) => (
                        <tr key={c.consultor} className="hover:bg-muted/30 transition-colors">
                          <td className="py-2 px-3 font-semibold text-foreground truncate max-w-[180px]">
                            {c.consultor || 'Não atribuído'}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-foreground">
                            {c.quantidade}
                          </td>
                          <td className="py-2 px-3 text-right font-medium text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(c.valor)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 5. TABELA ORIGENS E TABELA CONSULTORES */}
      <div className="grid gap-6 lg:grid-cols-2 items-start">
        {/* Tabela Origens */}
        <Card className="border-border shadow-sm min-w-0">
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  Origens
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Chegada, taxa de despacho e conversão em vendas
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs font-semibold">
                {origens.length} {origens.length === 1 ? 'origem' : 'origens'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-3">
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[540px] text-xs text-left">
                <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Origem</th>
                    <th className="py-2.5 px-3 text-right font-semibold whitespace-nowrap">
                      Chegaram
                    </th>
                    <th className="py-2.5 px-3 text-right font-semibold whitespace-nowrap">
                      Despachados
                    </th>
                    <th className="py-2.5 px-3 text-right font-semibold whitespace-nowrap">
                      Tx. despacho
                    </th>
                    <th className="py-2.5 px-3 text-right font-semibold whitespace-nowrap">
                      Vendas
                    </th>
                    <th className="py-2.5 px-3 text-right font-semibold whitespace-nowrap">
                      Valor
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {origens.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-muted-foreground">
                        Nenhuma origem registrada
                      </td>
                    </tr>
                  ) : (
                    origens.map((item) => (
                      <tr key={item.origem} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2 px-3 font-semibold text-foreground whitespace-nowrap">
                          {item.origem || 'A definir'}
                        </td>
                        <td className="py-2 px-3 text-right font-medium text-foreground whitespace-nowrap">
                          {item.chegaram}
                        </td>
                        <td className="py-2 px-3 text-right font-medium text-foreground whitespace-nowrap">
                          {item.despachados}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-foreground whitespace-nowrap">
                          {formatTaxa(item.taxa_despacho)}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          {item.vendas}
                        </td>
                        <td className="py-2 px-3 text-right font-medium text-muted-foreground whitespace-nowrap">
                          {formatCurrency(item.valor)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Tabela Consultores */}
        <Card className="border-border shadow-sm min-w-0">
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Consultores
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Desempenho por consultor e caminho de atendimento
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs font-semibold">
                {consultores.length} {consultores.length === 1 ? 'registro' : 'registros'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-3">
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[640px] text-xs text-left">
                <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Consultor</th>
                    <th className="py-2.5 px-3 font-semibold whitespace-nowrap">Caminho</th>
                    <th className="py-2.5 px-3 text-right font-semibold whitespace-nowrap">
                      Entraram
                    </th>
                    <th className="py-2.5 px-3 text-right font-semibold whitespace-nowrap">
                      Vendidos
                    </th>
                    <th className="py-2.5 px-3 text-right font-semibold whitespace-nowrap">
                      Perdidos
                    </th>
                    <th className="py-2.5 px-3 text-right font-semibold whitespace-nowrap">
                      Em aberto
                    </th>
                    <th className="py-2.5 px-3 text-right font-semibold whitespace-nowrap">
                      Valor
                    </th>
                    <th className="py-2.5 px-3 text-right font-semibold whitespace-nowrap">
                      Tx. conversão
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {consultores.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-4 text-center text-muted-foreground">
                        Nenhum consultor registrado no período
                      </td>
                    </tr>
                  ) : (
                    consultores.map((c, idx) => (
                      <tr
                        key={`${c.consultor}-${c.caminho}-${idx}`}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <td className="py-2 px-3 font-semibold text-foreground whitespace-nowrap">
                          {c.consultor || 'Não atribuído'}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <Badge
                            variant="outline"
                            className="text-[10px] py-0 px-1 font-semibold uppercase"
                          >
                            {c.caminho}
                          </Badge>
                        </td>
                        <td className="py-2 px-3 text-right font-medium text-foreground whitespace-nowrap">
                          {c.entraram}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          {c.vendidos}
                        </td>
                        <td className="py-2 px-3 text-right font-medium text-rose-600 dark:text-rose-400 whitespace-nowrap">
                          {c.perdidos}
                        </td>
                        <td className="py-2 px-3 text-right font-medium text-amber-600 dark:text-amber-400 whitespace-nowrap">
                          {c.em_aberto}
                        </td>
                        <td className="py-2 px-3 text-right font-medium text-muted-foreground whitespace-nowrap">
                          {formatCurrency(c.valor)}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-foreground whitespace-nowrap">
                          {formatTaxa(c.taxa_conversao)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 6. BLOCO PERDAS DO PERÍODO */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <UserX className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                Perdas do período
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Total de oportunidades perdidas por fase e motivo
              </CardDescription>
            </div>
            <Badge
              variant="outline"
              className="text-xs font-semibold text-rose-600 dark:text-rose-400 self-start sm:self-auto"
            >
              Total: {formatNumero(perdas?.total)} {perdas?.total === 1 ? 'perda' : 'perdas'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-6">
          {/* Perdas por fase */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-primary" />
              Perdas por Fase
            </h4>
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
              {Object.keys(perdas?.por_fase || {}).length === 0 ? (
                <p className="text-xs text-muted-foreground col-span-full py-2">
                  Nenhuma perda por fase no período
                </p>
              ) : (
                Object.entries(perdas.por_fase).map(([fase, qtd]) => (
                  <div
                    key={fase}
                    className="p-3 rounded-lg border border-border bg-card flex flex-col justify-between"
                  >
                    <span className="text-xs text-muted-foreground font-medium truncate">
                      {getFaseNome(fase)}
                    </span>
                    <span className="text-xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">
                      {qtd} {qtd === 1 ? 'perda' : 'perdas'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Tabela de Motivos de Perda */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
              Tabela de Motivos
            </h4>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Fase</th>
                    <th className="py-2.5 px-3 font-semibold">Motivo</th>
                    <th className="py-2.5 px-3 text-right font-semibold">Quantidade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {(perdas?.por_motivo || []).length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-4 text-center text-muted-foreground">
                        Nenhum motivo de perda registrado
                      </td>
                    </tr>
                  ) : (
                    perdas.por_motivo.map((item, idx) => (
                      <tr
                        key={`${item.fase}-${item.motivo}-${idx}`}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <td className="py-2 px-3">
                          <Badge
                            variant="outline"
                            className="text-[10px] py-0 px-1 font-semibold uppercase"
                          >
                            {getFaseNome(item.fase)}
                          </Badge>
                        </td>
                        <td className="py-2 px-3 font-semibold text-foreground">
                          {item.motivo || 'Não informado'}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-rose-600 dark:text-rose-400">
                          {item.quantidade}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
