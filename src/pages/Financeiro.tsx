import { useEffect, useState, useCallback, useMemo } from 'react'
import { Wallet, Search } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { supabase } from '@/lib/supabase/client'
import { Transaction } from '@/types'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { FinanceiroDashboard } from '@/components/financeiro/FinanceiroDashboard'
import {
  FinanceiroMovimentacoes,
  ExtendedTransaction,
} from '@/components/financeiro/FinanceiroMovimentacoes'
import { FinanceiroDRE } from '@/components/financeiro/FinanceiroDRE'
import { ContasBancariasTab } from '@/components/financeiro/ContasBancariasTab'
import { NotasAClassificarTab } from '@/components/financeiro/NotasAClassificarTab'
import { useToast } from '@/hooks/use-toast'
import { NovaContaPagarDialog } from '@/components/financeiro/NovaContaPagarDialog'
import { NovaContaReceberDialog } from '@/components/financeiro/NovaContaReceberDialog'
import { Input } from '@/components/ui/input'
import { fetchContasBancarias, ContaBancaria } from '@/services/contas-bancarias'

export default function Financeiro() {
  const [transactions, setTransactions] = useState<ExtendedTransaction[]>([])
  const [contasBancarias, setContasBancarias] = useState<ContaBancaria[]>([])
  const [loading, setLoading] = useState(true)
  const [globalSearch, setGlobalSearch] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const { toast } = useToast()

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [receberRes, pagarRes, contasData] = await Promise.all([
        supabase
          .from('contas_receber')
          .select(
            '*, cliente:clientes(nome), formulario_comercial:formulario_comercial(id, nome_cliente, nome_fantasia, produtos_servicos, ambientes)',
          ),
        supabase
          .from('contas_pagar' as any)
          .select(
            '*, cliente:clientes(nome), formulario_comercial:formulario_comercial(id, nome_cliente, nome_fantasia)',
          )
          .neq('status_pagamento', 'agrupado'),
        fetchContasBancarias().catch(() => [] as ContaBancaria[]),
      ])
      setContasBancarias(contasData)

      if (receberRes.error) throw receberRes.error
      if (pagarRes.error && pagarRes.error.code !== '42P01') throw pagarRes.error

      const parseSafeTime = (dateStr: string | null | undefined): number => {
        if (!dateStr || typeof dateStr !== 'string') return 0
        const t = new Date(dateStr).getTime()
        return isNaN(t) ? 0 : t
      }

      const safeIdShort = (id: any): string => {
        if (!id) return ''
        const s = String(id)
        return s.length >= 8 ? s.substring(0, 8).toUpperCase() : s.toUpperCase()
      }

      const recebimentos = (receberRes.data || []).map((r: any) => {
        const fc = Array.isArray(r?.formulario_comercial)
          ? r.formulario_comercial[0]
          : r?.formulario_comercial
        const cliName = Array.isArray(r?.cliente)
          ? r.cliente[0]?.nome
          : r?.cliente?.nome || fc?.nome_cliente || 'Cliente não identificado'

        // Extrair nome ou identificador do projeto do formulário comercial
        let projNome = 'Projeto sem vínculo'
        if (fc) {
          if (fc.nome_fantasia) {
            projNome = fc.nome_fantasia
          } else if (fc.nome_cliente) {
            projNome = `Projeto ${fc.nome_cliente}`
          } else if (fc.id) {
            projNome = `Projeto #${safeIdShort(fc.id)}`
          }
        }

        return {
          id: r?.id || crypto.randomUUID(),
          type: 'receita' as const,
          description: r?.descricao || `Referente à parcela ${r?.numero_parcela || ''}`,
          category: r?.categoria || 'Venda de Projetos',
          amount: Number(r?.valor) || 0,
          dueDate: r?.data_vencimento || null,
          paidDate: r?.data_pagamento || null,
          status: r?.status_pagamento || 'aguardando',
          source: r,
          createdAt: r?.criado_em || '',
          entityName: cliName,
          clienteNome: cliName,
          projetoNome: projNome,
          formulario_comercial_id: r?.formulario_comercial_id || null,
          meioPagamento: r?.meio_pagamento || null,
          antecipado: r?.antecipado || false,
          comprovanteUrl: r?.comprovante_url || null,
          grupoId: r?.grupo_id || null,
          observacoes: r?.observacoes || null,
          contaBancariaId: r?.conta_bancaria_id || null,
          natureza: r?.natureza || 'receita',
          categoria_id: r?.categoria_id || null,
        }
      })

      const pagamentos = (pagarRes.data || []).map((p: any) => {
        const fc = Array.isArray(p?.formulario_comercial)
          ? p.formulario_comercial[0]
          : p?.formulario_comercial
        const cliName = Array.isArray(p?.cliente)
          ? p.cliente[0]?.nome
          : p?.cliente?.nome || fc?.nome_cliente || null

        let projNome: string | null = null
        if (fc) {
          if (fc.nome_fantasia) {
            projNome = fc.nome_fantasia
          } else if (fc.nome_cliente) {
            projNome = `Projeto ${fc.nome_cliente}`
          } else if (fc.id) {
            projNome = `Projeto #${safeIdShort(fc.id)}`
          }
        }

        return {
          id: p?.id || crypto.randomUUID(),
          type: 'despesa' as const,
          description: p?.descricao || 'Despesa',
          category: p?.categoria || 'Geral',
          amount: Number(p?.valor) || 0,
          dueDate: p?.data_vencimento || null,
          paidDate: p?.data_pagamento || null,
          status: p?.status_pagamento || 'aguardando',
          source: p,
          createdAt: p?.criado_em || '',
          entityName: p?.fornecedor || 'Fornecedor',
          clienteNome: cliName,
          projetoNome: projNome,
          cliente_id: p?.cliente_id || null,
          formulario_comercial_id: p?.formulario_comercial_id || null,
          meioPagamento: p?.meio_pagamento || null,
          antecipado: p?.antecipado || false,
          comprovanteUrl: p?.comprovante_url || null,
          notaFiscalId: p?.nota_fiscal_id || null,
          grupoId: p?.grupo_id || null,
          observacoes: p?.observacoes || null,
          contaBancariaId: p?.conta_bancaria_id || null,
          natureza: p?.natureza || null,
          categoria_id: p?.categoria_id || null,
        }
      })

      setTransactions(
        [...recebimentos, ...pagamentos].sort((a, b) => {
          const aTime = a.dueDate ? parseSafeTime(a.dueDate) : parseSafeTime(a.createdAt)
          const bTime = b.dueDate ? parseSafeTime(b.dueDate) : parseSafeTime(b.createdAt)
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

  const aClassificarCount = useMemo(() => {
    if (!Array.isArray(transactions)) return 0
    return transactions.filter((t) => (t?.status || '').toLowerCase() === 'a_classificar').length
  }, [transactions])

  const filteredTransactions = useMemo(() => {
    if (!Array.isArray(transactions)) return []
    return transactions.filter((t) => {
      if (!t) return false
      const effectiveDate = t.dueDate || t.createdAt || ''
      if (startDate && effectiveDate < startDate) return false
      if (endDate && effectiveDate > endDate) return false

      if (globalSearch) {
        const term = globalSearch.toLowerCase().trim()
        if (!term) return true
        const descMatch = (t.description || '').toLowerCase().includes(term)
        const entityMatch = (t.entityName || '').toLowerCase().includes(term)
        const catMatch = (t.category || '').toLowerCase().includes(term)
        const statusMatch = (t.status || '').toLowerCase().includes(term)
        const amountMatch = String(t.amount ?? '').includes(term)

        if (!descMatch && !entityMatch && !catMatch && !statusMatch && !amountMatch) {
          return false
        }
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
        <div className="flex flex-row items-center justify-between w-full bg-midnight-navy text-off-white px-4 py-3 mb-4 rounded-md mt-0 flex-nowrap overflow-x-auto overflow-y-hidden gap-4 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
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
                value="a_classificar"
                className="data-[state=active]:bg-off-white/20 data-[state=active]:text-off-white text-off-white/60 relative"
              >
                Notas a Classificar
                {aClassificarCount > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[11px] font-semibold bg-orange-500 text-white">
                    {aClassificarCount}
                  </span>
                )}
              </TabsTrigger>{' '}
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
            <ErrorBoundary source="FinanceiroDashboard">
              <FinanceiroDashboard
                transactions={filteredTransactions as Transaction[]}
                contasBancarias={contasBancarias}
              />
            </ErrorBoundary>
          </TabsContent>
          <TabsContent value="movimentacoes" className="m-0 border-none outline-none">
            <ErrorBoundary source="FinanceiroMovimentacoes">
              <FinanceiroMovimentacoes transactions={filteredTransactions} onRefresh={fetchData} />
            </ErrorBoundary>
          </TabsContent>
          <TabsContent value="a_classificar" className="m-0 border-none outline-none">
            <ErrorBoundary source="NotasAClassificarTab">
              <NotasAClassificarTab transactions={filteredTransactions} onRefresh={fetchData} />
            </ErrorBoundary>
          </TabsContent>
          <TabsContent value="dre" className="m-0 border-none outline-none">
            <ErrorBoundary source="FinanceiroDRE">
              <FinanceiroDRE transactions={filteredTransactions as Transaction[]} />
            </ErrorBoundary>
          </TabsContent>
          <TabsContent value="contas" className="m-0 border-none outline-none">
            <ErrorBoundary source="ContasBancariasTab">
              <ContasBancariasTab />
            </ErrorBoundary>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
