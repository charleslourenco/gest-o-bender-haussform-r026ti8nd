import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Search, Edit, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { FornecedorFormSheet } from './FornecedorFormSheet'
import { maskCnpj, maskPhone } from './utils'

export function ListaFornecedores() {
  const [fornecedores, setFornecedores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [selectedFornecedor, setSelectedFornecedor] = useState<any>(null)

  useEffect(() => {
    fetchFornecedores()
  }, [])

  async function fetchFornecedores() {
    setLoading(true)
    const { data } = await supabase.from('fornecedores').select('*').order('razao_social')
    setFornecedores(data || [])
    setLoading(false)
  }

  const filtered = fornecedores.filter(
    (f) =>
      f.razao_social?.toLowerCase().includes(search.toLowerCase()) ||
      f.nome_fantasia?.toLowerCase().includes(search.toLowerCase()) ||
      f.cnpj?.includes(search),
  )

  const handleEdit = (f: any) => {
    setSelectedFornecedor(f)
    setSheetOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este fornecedor?')) return
    await supabase.from('fornecedores').delete().eq('id', id)
    fetchFornecedores()
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-4">
        <div className="relative w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Buscar fornecedor..."
            className="pl-9 bg-gray-50 border-transparent focus-visible:bg-white"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button
          onClick={() => {
            setSelectedFornecedor(null)
            setSheetOpen(true)
          }}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Fornecedor
        </Button>
      </div>
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader className="bg-gray-50/50 sticky top-0 z-10 backdrop-blur-sm">
            <TableRow>
              <TableHead>Razão Social</TableHead>
              <TableHead>Nome Fantasia</TableHead>
              <TableHead>CNPJ</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead className="w-24 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-gray-500">
                  Carregando fornecedores...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-gray-500">
                  Nenhum fornecedor encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium text-gray-900">{f.razao_social}</TableCell>
                  <TableCell className="text-gray-600">{f.nome_fantasia || '-'}</TableCell>
                  <TableCell className="text-gray-600 whitespace-nowrap">
                    {maskCnpj(f.cnpj)}
                  </TableCell>
                  <TableCell className="text-gray-600 whitespace-nowrap">
                    {maskPhone(f.telefone)}
                  </TableCell>
                  <TableCell className="text-gray-600">{f.email || '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-blue-600"
                        onClick={() => handleEdit(f)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-rose-600"
                        onClick={() => handleDelete(f.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <FornecedorFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        fornecedor={selectedFornecedor}
        onSave={fetchFornecedores}
      />
    </div>
  )
}
