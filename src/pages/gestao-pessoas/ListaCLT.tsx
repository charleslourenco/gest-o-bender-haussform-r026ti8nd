import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Plus } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { SheetCLT } from './SheetCLT'

export function ListaCLT() {
  const [data, setData] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  const fetchData = async () => {
    let q = supabase.from('equipe_clt').select('*').order('nome_completo')
    if (search) q = q.ilike('nome_completo', `%${search}%`)
    const { data: res } = await q
    if (res) setData(res)
  }

  useEffect(() => {
    fetchData()
  }, [search])

  const openNew = () => {
    setSelectedId(null)
    setIsSheetOpen(true)
  }

  const openEdit = (id: string) => {
    setSelectedId(id)
    setIsSheetOpen(true)
  }

  return (
    <div className="flex flex-col h-full bg-card rounded-xl border border-border shadow-sm p-4">
      <div className="flex justify-between items-center mb-4 gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <Input
            placeholder="Buscar colaborador pelo nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={openNew} className="shrink-0">
          <Plus className="w-4 h-4 mr-2 hidden sm:block" /> Novo Colaborador
        </Button>
      </div>

      <div className="flex-1 overflow-auto rounded-md border border-border">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Nome Completo</TableHead>
              <TableHead>Data de Admissão</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 && (
              <TableRow>
                <TableCell colSpan={2} className="text-center text-muted-foreground py-10">
                  Nenhum colaborador encontrado.
                </TableCell>
              </TableRow>
            )}
            {data.map((item: any) => (
              <TableRow
                key={item.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => openEdit(item.id)}
              >
                <TableCell className="font-medium">{item.nome_completo}</TableCell>
                <TableCell>
                  {item.data_admissao
                    ? new Date(item.data_admissao).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
                    : '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <SheetCLT
        isOpen={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        id={selectedId}
        onSaved={fetchData}
      />
    </div>
  )
}
