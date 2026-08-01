import { useEffect, useState, useCallback, useMemo } from 'react'
import { Wallet, Search } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { supabase } from '@/lib/supabase/client'
import { Transaction } from '@/types'
import { FinanceiroDashboard } from '@/components/financeiro/FinanceiroDashboard'
import {
  FinanceiroMovimentacoes,
  ExtendedTransaction,
} from '@/components/financeiro/FinanceiroMovimentacoes'
import { FinanceiroDRE } from '@/components/financeiro/FinanceiroDRE'
import { ContasBancariasTab } from '@/components/financeiro/ContasBancariasTab'
import { useToast } from '@/hooks/use-toast'
import { NovaContaPagarDialog } from '@/components/financeiro/NovaContaPagarDialog'
import { NovaContaReceberDialog } from '@/components/financeiro/NovaContaReceberDialog'
import { Input } from '@/components/ui/input'

export default function Financeiro() {
  const [transactions, setTransactions] = useState<ExtendedTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [globalSearch, setGlobalSearch] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const { toast } = useToast()

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [receberRes, pagarRes] = await Promise.all([
        supabase.from('contas_receber').select('*, cliente:clientes(nome)'),
        supabase
          .from('contas_pagar' as any)
          .select('*')
          .neq('status_pagamento', 'Agrupado'),
      ])

      if (receberRes.error) throw receberRes.error
      if (pagarRes.error && pagarRes.error.code !== '42P01') throw pagarRes.error

      const recebimentos = (receberRes.data || []).map((r: any) => ({
        id: r.id,
        type: 'receita' as const,
        description: r.descricao || `Referente à parcela ${r.numero_parcela || ''}`,
        category: r.categoria || 'Venda de Projetos',
        amount: Number(r.valor),
        dueDate: r.data_vencimento,
        paidDate: r.data_pagamento,
        status: r.status_pagamento,
        source: r,
        createdAt: r.criado_em,
        entityName: Array.isArray(r.cliente)
          ? r.cliente[0]?.nome
          : r.cliente?.nome || 'Cliente não identificado',
        meioPagamento: r.meio_pagamento,
        antecipado: r.antecipado,
        comprovanteUrl: r.comprovante_url,
        grupoId: r.grupo_id,
        observacoes: r.observacoes,
        contaBancariaId: r.conta_bancaria_id,
      }))

      const pagamentos = (pagarRes.data || []).map((p: any) => ({
        id: p.id,
        type: 'despesa' as const,
        description: p.descricao || 'Despesa',
        category: p.categoria || 'Geral',
        amount: Number(p.valor),
        dueDate: p.data_vencimento,
        paidDate: p.data_pagamento,
        status: p.status_pagamento,
        source: p,
        createdAt: p.criado_em,
        entityName: p.fornecedor || 'Fornecedor',
        meioPagamento: p.meio_pagamento,
        antecipado: p.antecipado,
        comprovanteUrl: p.comprovante_url,
        notaFiscalId: p.nota_fiscal_id,
        grupoId: p.grupo_id,
        observacoes: p.observacoes,
        contaBancariaId: p.conta_bancaria_id,
      }))

      setTransactions(
        [...recebimentos, ...pagamentos].sort((a, b) => {
          const aTime = a.dueDate ? new Date(a.dueDate).getTime() : 0
          const bTime = b.dueDate ? new Date(b.dueDate).getTime() : 0
          return bTime - aTime
        }),
      )
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os lançamentos.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (startDate && (t.dueDate || '') < startDate) return false
      if (endDate && (t.dueDate || '') > endDate) return false

      if (globalSearch) {
        const term = globalSearch.toLowerCase()
        const matches =
          t.description?.toLowerCase().includes(term) ||
          t.entityName?.toLowerCase().includes(term) ||
          t.category?.toLowerCase().includes(term) ||
          t.status?.toLowerCase().includes(term) ||
          t.amount.toString().includes(term)

        if (!matches) return false
      }

      return true
    })
  }, [transactions, startDate, endDate, globalSearch])

  if (loading && transactions.length === 0)
    return (
      <div className="pt-0 pb-6 px-6 text-gray-500 animate-pulse">
        Carregando Módulo Financeiro...
      </div>
    )

  return (
    <div className="pt-0 pb-6 px-6 animate-in fade-in duration-300 h-full flex flex-col">
      <Tabs defaultValue="dashboard" className="flex-1 flex flex-col min-h-0 w-full mt-0">
        <div className="flex flex-row items-center justify-between w-full bg-midnight-navy text-off-white px-4 py-3 mb-4 rounded-md mt-0 flex-nowrap overflow-x-auto overflow-y-hidden gap-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="flex flex-row items-center gap-2 shrink-0 whitespace-nowrap">
            <div className="flex items-center gap-2 mr-2">
              <Wallet className="w-5 h-5 text-off-white" />
              <h2 className="text-lg font-bold text-off-white">Financeiro</h2>
            </div>
            <TabsList className="bg-off-white/10 border-none h-9">
              <TabsTrigger
                value="dashboard"
                className="data-[state=active]:bg-off-white/20 data-[state=active]:text-off-white text-off-white/60"
              >
                Visão Geral
              </TabsTrigger>
              <TabsTrigger
                value="movimentacoes"
                className="data-[state=active]:bg-off-white/20 data-[state=active]:text-off-white text-off-white/60"
              >
                Lançamentos & IA
              </TabsTrigger>
              <TabsTrigger
                value="dre"
                className="data-[state=active]:bg-off-white/20 data-[state=active]:text-off-white text-off-white/60"
              >
                DRE
              </TabsTrigger>
              <TabsTrigger
                value="contas"
                className="data-[state=active]:bg-off-white/20 data-[state=active]:text-off-white text-off-white/60"
              >
                Contas Bancárias
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex flex-row items-center gap-2 shrink-0 whitespace-nowrap">
            <div className="relative min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-off-white" />
              <Input
                placeholder="Busca global..."
                className="pl-9 bg-off-white/10 border-off-white/20 text-off-white placeholder:text-off-white/50 h-9 w-40 [color-scheme:dark]"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
              />
            </div>
            <Input
              type="date"
              className="bg-off-white/10 border-off-white/20 text-off-white h-9 w-36 [color-scheme:dark]"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              title="Data Inicial"
            />
            <span className="text-off-white text-sm">até</span>
            <Input
              type="date"
              className="bg-off-white/10 border-off-white/20 text-off-white h-9 w-36 [color-scheme:dark]"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              title="Data Final"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 mb-4 w-full">
          <div className="[&_button]:!bg-red-600 [&_button]:!text-white [&_button:hover]:!bg-red-700 transition-colors rounded-md shadow-sm">
            <NovaContaPagarDialog onRefresh={fetchData} />
          </div>
          <div className="[&_button]:!bg-emerald-600 [&_button]:!text-white [&_button:hover]:!bg-emerald-700 transition-colors rounded-md shadow-sm">
            <NovaContaReceberDialog onRefresh={fetchData} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-20 min-h-0 w-full">
          <TabsContent value="dashboard" className="m-0 border-none outline-none">
            <FinanceiroDashboard transactions={filteredTransactions as Transaction[]} />
          </TabsContent>
          <TabsContent value="movimentacoes" className="m-0 border-none outline-none">
            <FinanceiroMovimentacoes transactions={filteredTransactions} onRefresh={fetchData} />
          </TabsContent>
          <TabsContent value="dre" className="m-0 border-none outline-none">
            <FinanceiroDRE transactions={filteredTransactions as Transaction[]} />
          </TabsContent>
          <TabsContent value="contas" className="m-0 border-none outline-none">
            <ContasBancariasTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
