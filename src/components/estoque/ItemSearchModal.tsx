import { useState, useEffect, useCallback } from 'react'
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
import { Search, PackageX, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export interface InventoryItem {
  id: string
  nome: string
  unidade: string
  quantidade: number
}

interface ItemSearchModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (item: InventoryItem) => void
  title?: string
}

export function ItemSearchModal({
  open,
  onOpenChange,
  onSelect,
  title = 'Buscar Item no Estoque',
}: ItemSearchModalProps) {
  const [search, setSearch] = useState('')
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchItems = useCallback(
    async (searchTerm: string) => {
      setLoading(true)
      setError(null)
      try {
        let query = supabase
          .from('estoque_itens')
          .select('id, nome, unidade, quantidade')
          .order('nome')
        if (searchTerm.trim()) {
          query = query.ilike('nome', `%${searchTerm.trim()}%`)
        }
        const { data, error: fetchError } = await query.limit(50)
        if (fetchError) throw fetchError
        setItems((data as InventoryItem[]) || [])
      } catch (e: any) {
        setError(e.message || 'Erro ao carregar itens do estoque.')
        toast({
          title: 'Erro ao carregar estoque',
          description: e.message,
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    },
    [toast],
  )

  useEffect(() => {
    if (!open) {
      setSearch('')
      setItems([])
      setError(null)
      return
    }
    fetchItems('')
  }, [open, fetchItems])

  useEffect(() => {
    if (!open) return
    const delay = setTimeout(() => {
      fetchItems(search)
    }, 300)
    return () => clearTimeout(delay)
  }, [search, open, fetchItems])

  const handleSelect = (item: InventoryItem) => {
    onSelect(item)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <div className="relative mb-4">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome do item..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>
          <div className="max-h-[400px] overflow-y-auto rounded-md border">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead className="text-right">Disponível</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Carregando itens...
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {!loading && error && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-red-500">
                      {error}
                    </TableCell>
                  </TableRow>
                )}
                {!loading && !error && items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <PackageX className="w-8 h-8 opacity-50" />
                        <span>Nenhum item encontrado no estoque.</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {!loading &&
                  !error &&
                  items.map((item) => (
                    <TableRow
                      key={item.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSelect(item)}
                    >
                      <TableCell className="font-medium">{item.nome}</TableCell>
                      <TableCell>{item.unidade}</TableCell>
                      <TableCell className="text-right">{Number(item.quantidade || 0)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSelect(item)
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
