import { useEffect, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

export function EstoqueLista() {
  const [items, setItems] = useState<any[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function fetchItems() {
      const { data } = await supabase
        .from('estoque_itens' as any)
        .select('*')
        .order('nome')
      if (data) setItems(data)
    }
    fetchItems()
  }, [])

  const filteredItems = items.filter(
    (i) =>
      i.nome.toLowerCase().includes(search.toLowerCase()) ||
      i.categoria?.toLowerCase().includes(search.toLowerCase()),
  )

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  return (
    <div className="space-y-4 bg-white p-6 rounded-xl border">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar item ou categoria..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button className="bg-steel-blue hover:bg-dark-denim">
          <Plus className="h-4 w-4 mr-2" /> Novo Item
        </Button>
      </div>

      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Quantidade</TableHead>
              <TableHead className="text-right">V. Unitário</TableHead>
              <TableHead className="text-right">V. Total</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.nome}</TableCell>
                <TableCell>{item.categoria || '-'}</TableCell>
                <TableCell className="text-right">
                  {item.quantidade} <span className="text-xs text-gray-500">{item.unidade}</span>
                </TableCell>
                <TableCell className="text-right">{formatCurrency(item.valor_unitario)}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(item.quantidade * item.valor_unitario)}
                </TableCell>
                <TableCell className="text-center">
                  {item.quantidade <= item.estoque_minimo ? (
                    <Badge
                      variant="destructive"
                      className="bg-amber-500/10 text-amber-600 border-amber-200"
                    >
                      Estoque Baixo
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="bg-emerald-50 text-emerald-600 border-emerald-200"
                    >
                      Normal
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {filteredItems.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  Nenhum item encontrado no estoque.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
