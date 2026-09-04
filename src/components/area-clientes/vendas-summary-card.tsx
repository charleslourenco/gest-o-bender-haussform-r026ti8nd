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
      <Card className="relative overflow-hidden cursor-default transition-all duration-200 ease-out border-l-4 border-l-emerald-500 border-border/70 hover:border-emerald-500/80 hover:-translate-y-1 hover:shadow-[0_12px_24px_-6px_rgba(16,185,129,0.15),0_4px_12px_-2px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_12px_28px_-6px_rgba(16,185,129,0.25),0_4px_12px_-2px_rgba(0,0,0,0.4)] hover:bg-card/90 hover:backdrop-blur-md group">
        <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gradient-to-br from-white/40 via-transparent to-emerald-500/5 dark:from-white/10 dark:to-emerald-500/10" />
        <CardContent className="p-4 flex items-center gap-3 relative z-10">
          <div className="bg-emerald-100 dark:bg-emerald-950/60 p-2.5 rounded-lg shrink-0 group-hover:scale-105 transition-transform duration-200">
            <Wallet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
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

      <Card className="relative overflow-hidden cursor-default transition-all duration-200 ease-out border-l-4 border-l-blue-500 border-border/70 hover:border-blue-500/80 hover:-translate-y-1 hover:shadow-[0_12px_24px_-6px_rgba(59,130,246,0.15),0_4px_12px_-2px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_12px_28px_-6px_rgba(59,130,246,0.25),0_4px_12px_-2px_rgba(0,0,0,0.4)] hover:bg-card/90 hover:backdrop-blur-md group">
        <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gradient-to-br from-white/40 via-transparent to-blue-500/5 dark:from-white/10 dark:to-blue-500/10" />
        <CardContent className="p-4 flex items-center gap-3 relative z-10">
          <div className="bg-blue-100 dark:bg-blue-950/60 p-2.5 rounded-lg shrink-0 group-hover:scale-105 transition-transform duration-200">
            <ShoppingCart className="w-5 h-5 text-blue-600 dark:text-blue-400" />
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

      <Card className="relative overflow-hidden cursor-default transition-all duration-200 ease-out border-l-4 border-l-amber-500 border-border/70 hover:border-amber-500/80 hover:-translate-y-1 hover:shadow-[0_12px_24px_-6px_rgba(245,158,11,0.15),0_4px_12px_-2px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_12px_28px_-6px_rgba(245,158,11,0.25),0_4px_12px_-2px_rgba(0,0,0,0.4)] hover:bg-card/90 hover:backdrop-blur-md group">
        <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gradient-to-br from-white/40 via-transparent to-amber-500/5 dark:from-white/10 dark:to-amber-500/10" />
        <CardContent className="p-4 flex items-center gap-3 relative z-10">
          <div className="bg-amber-100 dark:bg-amber-950/60 p-2.5 rounded-lg shrink-0 group-hover:scale-105 transition-transform duration-200">
            <TrendingUp className="w-5 h-5 text-amber-600 dark:text-amber-400" />
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
