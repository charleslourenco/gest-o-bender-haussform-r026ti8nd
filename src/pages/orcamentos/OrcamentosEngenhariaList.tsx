import { useEffect, useState } from 'react'
import { Plus, Trash2, Edit, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
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
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export default function OrcamentosEngenhariaList() {
  const navigate = useNavigate()
  const [orcamentos, setOrcamentos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const fetchOrcamentos = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('orcamentos_engenharia')
      .select('*, cliente:clientes(nome)')
      .order('criado_em', { ascending: false })

    if (error) toast.error('Erro ao buscar orçamentos')
    else setOrcamentos(data || [])

    setLoading(false)
  }

  useEffect(() => {
    fetchOrcamentos()
  }, [])

  const handleDelete = async () => {
    if (!deleteId) return
    const { error } = await supabase.from('orcamentos_engenharia').delete().eq('id', deleteId)
    if (error) {
      toast.error('Erro ao excluir orçamento')
    } else {
      toast.success('Orçamento excluído com sucesso')
      fetchOrcamentos()
    }
    setDeleteId(null)
  }

  const filteredOrcamentos = orcamentos.filter((o) => {
    const nome = o.nome?.toLowerCase() || ''
    const clienteNome = (o.cliente?.nome || o.cliente_nome_manual || '').toLowerCase()
    const q = searchQuery.toLowerCase()
    return nome.includes(q) || clienteNome.includes(q)
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Orçamentos de Engenharia
        </h1>
        <p className="text-gray-500 mt-2">Gerencie seus projetos e custos reais</p>
        <div className="mt-4">
          <Button onClick={() => navigate('/orcamentos/novo')}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Orçamento
          </Button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-6">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar orçamento ou cliente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome do Projeto</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filteredOrcamentos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    Nenhum orçamento encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrcamentos.map((orcamento) => (
                  <TableRow key={orcamento.id}>
                    <TableCell className="font-medium text-gray-900">{orcamento.nome}</TableCell>
                    <TableCell className="text-gray-600">
                      {orcamento.cliente?.nome || orcamento.cliente_nome_manual || 'Não informado'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={orcamento.status === 'Aprovado' ? 'default' : 'secondary'}>
                        {orcamento.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {new Date(orcamento.criado_em).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/orcamentos/${orcamento.id}`)}
                        >
                          <Edit className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(orcamento.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir orçamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O orçamento e todos os seus itens serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
