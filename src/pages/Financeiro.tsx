import { useEffect, useState, useCallback } from 'react'
import { Wallet } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { supabase } from '@/lib/supabase/client'
import { Transaction } from '@/types'
import { FinanceiroDashboard } from '@/components/financeiro/FinanceiroDashboard'
import { FinanceiroMovimentacoes } from '@/components/financeiro/FinanceiroMovimentacoes'
import { FinanceiroDRE } from '@/components/financeiro/FinanceiroDRE'
import { useToast } from '@/hooks/use-toast'

export default function Financeiro() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const fetchData = useCallback(async () => {
    try {
      const [receberRes, pagarRes] = await Promise.all([
        supabase.from('contas_receber').select('*, cliente:clientes!inner(nome)'),
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
        entityName: r.cliente?.nome || 'Cliente não identificado',
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

  if (loading)
    return <div className="p-6 text-gray-500 animate-pulse">Carregando Módulo Financeiro...</div>

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-300 h-full flex flex-col">
      <div className="bg-midnight-navy p-6 rounded-xl shadow-sm shrink-0 flex items-center gap-4">
        <Wallet className="h-10 w-10 text-emerald-400 hidden sm:block" />
        <div>
          <h1 className="text-[32px] font-bold text-off-white">Financeiro Inteligente</h1>
          <p className="text-pale-cornflower mt-1">Gerenciado com apoio da assistente Edith</p>
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
            <FinanceiroDashboard transactions={transactions} />
          </TabsContent>
          <TabsContent value="movimentacoes" className="m-0 border-none outline-none">
            <FinanceiroMovimentacoes transactions={transactions} onRefresh={fetchData} />
          </TabsContent>
          <TabsContent value="dre" className="m-0 border-none outline-none">
            <FinanceiroDRE transactions={transactions} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
