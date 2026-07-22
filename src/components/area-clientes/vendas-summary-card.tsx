import { Card, CardContent } from '@/components/ui/card'
import { Wallet, ShoppingCart, TrendingUp } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

interface VendasSummaryCardProps {
  totalVendido: number
  numVendas: number
  loading: boolean
}

export function VendasSummaryCard({ totalVendido, numVendas, loading }: VendasSummaryCardProps) {
  const ticketMedio = numVendas > 0 ? totalVendido / numVendas : 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
      <Card className="shadow-sm border-l-4 border-l-emerald-500">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="bg-emerald-100 p-2.5 rounded-lg shrink-0">
            <Wallet className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground font-medium">💰 Total Vendido</p>
            {loading ? (
              <Skeleton className="h-6 w-28 mt-1" />
            ) : (
              <p className="text-lg font-bold text-foreground truncate">
                {formatCurrency(totalVendido)}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-l-4 border-l-blue-500">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="bg-blue-100 p-2.5 rounded-lg shrink-0">
            <ShoppingCart className="w-5 h-5 text-blue-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground font-medium">📊 Vendas</p>
            {loading ? (
              <Skeleton className="h-6 w-16 mt-1" />
            ) : (
              <p className="text-lg font-bold text-foreground">{numVendas}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-l-4 border-l-amber-500">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="bg-amber-100 p-2.5 rounded-lg shrink-0">
            <TrendingUp className="w-5 h-5 text-amber-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground font-medium">📈 Ticket Médio</p>
            {loading ? (
              <Skeleton className="h-6 w-28 mt-1" />
            ) : (
              <p className="text-lg font-bold text-foreground">
                {numVendas > 0 ? formatCurrency(ticketMedio) : '—'}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
