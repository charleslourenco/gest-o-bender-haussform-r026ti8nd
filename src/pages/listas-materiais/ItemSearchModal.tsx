import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

interface ItemSearchModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (item: any) => void
}

export function ItemSearchModal({ open, onOpenChange, onSelect }: ItemSearchModalProps) {
  const [search, setSearch] = useState('')
  const [items, setItems] = useState<any[]>([])

  useEffect(() => {
    if (!open) return
    const fetchItems = async () => {
      let q = supabase.from('estoque_itens').select('id, nome, unidade, quantidade').order('nome')
      if (search) q = q.ilike('nome', `%${search}%`)
      const { data } = await q.limit(20)
      if (data) setItems(data)
    }
    const delay = setTimeout(fetchItems, 300)
    return () => clearTimeout(delay)
  }, [search, open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Buscar Item no Estoque</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <div className="relative mb-4">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead className="text-right">Disp.</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.nome}</TableCell>
                    <TableCell>{item.unidade}</TableCell>
                    <TableCell className="text-right">{item.quantidade}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => {
                          onSelect(item)
                          onOpenChange(false)
                        }}
                      >
                        Adicionar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
