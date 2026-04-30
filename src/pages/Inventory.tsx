import { useState } from 'react'
import { Package, Search, Plus, AlertCircle, Filter } from 'lucide-react'
import { useAppStore } from '@/stores/main'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

export default function Inventory() {
  const { inventory } = useAppStore()
  const [searchTerm, setSearchTerm] = useState('')

  const filteredInventory = inventory.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const getStatusInfo = (qty: number, min: number) => {
    if (qty <= min)
      return {
        label: 'Estoque Baixo',
        color: 'bg-destructive/10 text-destructive border-destructive/20',
        icon: true,
      }
    if (qty <= min * 1.5)
      return {
        label: 'Atenção',
        color: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
        icon: false,
      }
    return {
      label: 'Adequado',
      color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
      icon: false,
    }
  }

  const totalValue = inventory.reduce((acc, item) => acc + item.quantity * item.price, 0)

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-secondary">Estoque</h1>
          <p className="text-muted-foreground">Controle de insumos e matérias-primas.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right mr-4 hidden sm:block">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
              Valor em Estoque
            </p>
            <p className="text-xl font-bold text-secondary">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                totalValue,
              )}
            </p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Novo Item
          </Button>
        </div>
      </div>

      <Card className="shadow-sm border-slate-200">
        <CardContent className="p-0">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center gap-4 bg-slate-50/50 rounded-t-lg">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar materiais, ferragens..."
                className="pl-9 bg-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" className="w-full sm:w-auto bg-white">
              <Filter className="mr-2 h-4 w-4" /> Filtros
            </Button>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[300px]">Item</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[200px]">Nível de Estoque</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                  <TableHead className="text-right">Preço Unit.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInventory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      Nenhum item encontrado no estoque.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInventory.map((item) => {
                    const status = getStatusInfo(item.quantity, item.minStock)
                    const percentage = Math.min(100, (item.quantity / (item.minStock * 3)) * 100)

                    return (
                      <TableRow key={item.id} className="group hover:bg-slate-50/80">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-md bg-slate-100 flex items-center justify-center shrink-0">
                              <Package className="h-4 w-4 text-slate-500" />
                            </div>
                            <span className="font-medium text-secondary">{item.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs bg-white text-slate-600">
                            {item.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`font-normal border ${status.color}`}>
                            {status.icon && <AlertCircle className="mr-1 h-3 w-3" />}
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress
                              value={percentage}
                              className={status.icon ? 'text-destructive' : ''}
                              indicatorClassName={status.icon ? 'bg-destructive' : 'bg-primary'}
                            />
                            <span className="text-xs text-muted-foreground w-12 text-right">
                              Min: {item.minStock}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-medium text-secondary text-base">
                            {item.quantity}
                          </span>
                          <span className="text-xs text-muted-foreground ml-1">{item.unit}</span>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground text-sm">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(item.price)}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
