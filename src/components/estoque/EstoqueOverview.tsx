import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Package, AlertTriangle, FileText, TrendingUp } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

export function EstoqueOverview() {
  const [stats, setStats] = useState({
    totalItens: 0,
    itensBaixoEstoque: 0,
    valorEstoque: 0,
    pedidosPendentes: 0,
  })

  useEffect(() => {
    async function loadStats() {
      const { data: itens } = await supabase.from('estoque_itens' as any).select('*')
      const { data: pedidos } = await supabase
        .from('pedidos_compra' as any)
        .select('*')
        .eq('status', 'pendente')

      if (itens) {
        const baixoEstoque = itens.filter((i: any) => i.quantidade <= i.estoque_minimo).length
        const valorTotal = itens.reduce(
          (acc: number, i: any) => acc + i.quantidade * i.valor_unitario,
          0,
        )
        setStats({
          totalItens: itens.length,
          itensBaixoEstoque: baixoEstoque,
          valorEstoque: valorTotal,
          pedidosPendentes: pedidos?.length || 0,
        })
      }
    }
    loadStats()
  }, [])

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Itens em Estoque</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalItens}</div>
          <p className="text-xs text-muted-foreground">Tipos de produtos cadastrados</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Valor Estimado</CardTitle>
          <TrendingUp className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(stats.valorEstoque)}</div>
          <p className="text-xs text-muted-foreground">Capital imobilizado atual</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Alertas de Reposição</CardTitle>
          <AlertTriangle
            className={`h-4 w-4 ${stats.itensBaixoEstoque > 0 ? 'text-amber-500' : 'text-muted-foreground'}`}
          />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.itensBaixoEstoque}</div>
          <p className="text-xs text-muted-foreground">Itens abaixo do estoque mínimo</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pedidos Pendentes</CardTitle>
          <FileText className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.pedidosPendentes}</div>
          <p className="text-xs text-muted-foreground">Aguardando recebimento/validação</p>
        </CardContent>
      </Card>
    </div>
  )
}
