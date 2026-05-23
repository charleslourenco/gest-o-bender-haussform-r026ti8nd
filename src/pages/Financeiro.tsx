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
import { useToast } from '@/hooks/use-toast'
import { NovaContaPagarSheet } from '@/components/financeiro/NovaContaPagarSheet'
import { NovaContaReceberSheet } from '@/components/financeiro/NovaContaReceberSheet'
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
        supabase.from('contas_pagar' as any).select('*'),
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
      }))

      setTransactions(
        [...recebimentos, ...pagamentos].sort(
          (a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime(),
        ),
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
      if (startDate && t.dueDate < startDate) return false
      if (endDate && t.dueDate > endDate) return false

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
    return <div className="p-6 text-gray-500 animate-pulse">Carregando Módulo Financeiro...</div>

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-300 h-full flex flex-col">
      <div className="bg-midnight-navy p-6 rounded-xl shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <Wallet className="h-10 w-10 text-emerald-400 hidden sm:block" />
          <div>
            <h1 className="text-[32px] font-bold text-off-white">Financeiro Inteligente</h1>
            <p className="text-pale-cornflower mt-1">Gerenciado com apoio da assistente Edith</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-end shrink-0">
        <NovaContaPagarSheet onRefresh={fetchData} />
        <NovaContaReceberSheet onRefresh={fetchData} />
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Busca global (nome, valor, categoria...)"
            className="pl-9"
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <Input
            type="date"
            className="w-full sm:w-40"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            title="Data Inicial"
          />
          <span className="text-gray-400 text-sm font-medium">até</span>
          <Input
            type="date"
            className="w-full sm:w-40"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            title="Data Final"
          />
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="flex-1 flex flex-col min-h-0">
        <TabsList className="w-full justify-start bg-white p-1 border-b rounded-none shrink-0 overflow-x-auto">
          <TabsTrigger value="dashboard">Visão Geral</TabsTrigger>
          <TabsTrigger value="movimentacoes">Lançamentos & IA</TabsTrigger>
          <TabsTrigger value="dre">DRE</TabsTrigger>
        </TabsList>
        <div className="flex-1 overflow-y-auto mt-4 pb-20">
          <TabsContent value="dashboard" className="m-0 border-none outline-none">
            <FinanceiroDashboard transactions={filteredTransactions as Transaction[]} />
          </TabsContent>
          <TabsContent value="movimentacoes" className="m-0 border-none outline-none">
            <FinanceiroMovimentacoes transactions={filteredTransactions} onRefresh={fetchData} />
          </TabsContent>
          <TabsContent value="dre" className="m-0 border-none outline-none">
            <FinanceiroDRE transactions={filteredTransactions as Transaction[]} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
