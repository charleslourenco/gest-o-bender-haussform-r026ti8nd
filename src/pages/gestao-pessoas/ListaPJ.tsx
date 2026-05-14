import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function ListaPJ() {
  const [data, setData] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const fetchData = async () => {
    let q = supabase.from('parceiros_pj').select('*').order('razao_social')
    if (search) q = q.ilike('razao_social', `%${search}%`)
    const { data: res } = await q
    if (res) setData(res)
  }

  useEffect(() => {
    fetchData()
  }, [search])

  return (
    <div className="flex flex-col h-full bg-card rounded-xl border border-border shadow-sm p-4">
      <div className="flex justify-between items-center mb-4 gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <Input
            placeholder="Buscar parceiro PJ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => navigate('/gestao-pessoas/pj/novo')} className="shrink-0">
          <Plus className="w-4 h-4 mr-2 hidden sm:block" /> Novo Parceiro PJ
        </Button>
      </div>

      <div className="flex-1 overflow-auto rounded-md border border-border">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Razão Social</TableHead>
              <TableHead>CNPJ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 && (
              <TableRow>
                <TableCell colSpan={2} className="text-center text-muted-foreground py-10">
                  Nenhum parceiro encontrado.
                </TableCell>
              </TableRow>
            )}
            {data.map((item: any) => (
              <TableRow
                key={item.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => navigate(`/gestao-pessoas/pj/${item.id}`)}
              >
                <TableCell className="font-medium">{item.razao_social}</TableCell>
                <TableCell>{item.cnpj || '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
