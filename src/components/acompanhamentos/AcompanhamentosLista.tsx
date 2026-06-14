import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Search, Trash2, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'

export function AcompanhamentosLista() {
  const [items, setItems] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const { toast } = useToast()

  const fetchItems = async () => {
    const { data } = await supabase
      .from('acompanhamentos')
      .select('*, responsaveis_acompanhamentos(nome)')
      .order('data_criacao', { ascending: false })
    if (data) setItems(data)
  }

  useEffect(() => {
    fetchItems()
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir este acompanhamento?')) return
    const { error } = await supabase.from('acompanhamentos').delete().eq('id', id)
    if (error) toast({ title: 'Erro', variant: 'destructive' })
    else {
      toast({ title: 'Excluído com sucesso' })
      fetchItems()
    }
  }

  const filtered = items.filter(
    (i) =>
      i.nome_cliente?.toLowerCase().includes(search.toLowerCase()) ||
      i.codigo_projeto?.toLowerCase().includes(search.toLowerCase()) ||
      i.tipo_acompanhamento?.toLowerCase().includes(search.toLowerCase()) ||
      i.responsaveis_acompanhamentos?.nome?.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="relative w-72 shrink-0">
        <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
        <Input
          placeholder="Buscar projetos..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="border rounded-md flex-1 overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead>Status Atual</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium font-mono text-xs">
                  {item.codigo_projeto}
                </TableCell>
                <TableCell>{item.nome_cliente}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {item.tipo_acompanhamento}
                </TableCell>
                <TableCell className="text-sm">
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                    {format(new Date(item.data_criacao), 'dd/MM/yyyy')}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{item.status_atual}</Badge>
                </TableCell>
                <TableCell>{item.responsaveis_acompanhamentos?.nome || '-'}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Nenhum projeto de acompanhamento encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
