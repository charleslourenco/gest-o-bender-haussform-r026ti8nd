import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Plus, Search, FileText, Trash2, Edit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

export default function OrcamentosEngenhariaList() {
  const navigate = useNavigate()
  const [orcamentos, setOrcamentos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const loadOrcamentos = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('orcamentos_engenharia')
        .select(`
          *,
          cliente:clientes(nome)
        `)
        .order('criado_em', { ascending: false })

      if (error) throw error
      setOrcamentos(data || [])
    } catch (error: any) {
      toast.error('Erro ao carregar orçamentos: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrcamentos()
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este orçamento permanentemente?')) return

    try {
      const { error } = await supabase.from('orcamentos_engenharia').delete().eq('id', id)

      if (error) throw error
      toast.success('Orçamento excluído com sucesso')
      loadOrcamentos()
    } catch (error: any) {
      toast.error('Erro ao excluir orçamento: ' + error.message)
    }
  }

  const filteredOrcamentos = orcamentos.filter((orc) => {
    const nome = orc.nome?.toLowerCase() || ''
    const cliObj = Array.isArray(orc.cliente) ? orc.cliente[0] : orc.cliente
    const cliNome = (cliObj?.nome || orc.cliente_nome_manual || '').toLowerCase()
    const term = searchTerm.toLowerCase()
    return nome.includes(term) || cliNome.includes(term)
  })

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Orçamentos de Engenharia</h1>
          <p className="text-slate-500">Gerencie seus projetos e custos reais</p>
        </div>
        <Button
          onClick={() => navigate('/orcamentos/novo')}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Orçamento
        </Button>
      </div>

      <div className="flex items-center gap-2 bg-white p-2 rounded-lg border shadow-sm max-w-md">
        <Search className="w-5 h-5 text-slate-400 ml-2" />
        <Input
          placeholder="Buscar por nome ou cliente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border-0 focus-visible:ring-0 shadow-none"
        />
      </div>

      <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome / Descrição</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                  Carregando orçamentos reais...
                </TableCell>
              </TableRow>
            ) : filteredOrcamentos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                  Nenhum orçamento encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filteredOrcamentos.map((orc) => {
                const cliObj = Array.isArray(orc.cliente) ? orc.cliente[0] : orc.cliente
                return (
                  <TableRow key={orc.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-emerald-600" />
                        {orc.nome}
                      </div>
                    </TableCell>
                    <TableCell>
                      {cliObj?.nome || orc.cliente_nome_manual || 'Não informado'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          orc.status === 'Aprovado'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : orc.status === 'Rascunho'
                              ? 'bg-slate-50 text-slate-700 border-slate-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                        }
                      >
                        {orc.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(orc.criado_em).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/orcamentos/${orc.id}`)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDelete(orc.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
