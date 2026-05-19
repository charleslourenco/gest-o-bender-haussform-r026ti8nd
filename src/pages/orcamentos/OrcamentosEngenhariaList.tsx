import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Plus, Calculator, Trash2, Edit } from 'lucide-react'
import { format } from 'date-fns'
import { useToast } from '@/hooks/use-toast'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default function OrcamentosEngenhariaList() {
  const [orcamentos, setOrcamentos] = useState<any[]>([])
  const navigate = useNavigate()
  const { toast } = useToast()

  const loadData = () => {
    supabase
      .from('orcamentos_engenharia')
      .select('*, clientes(nome)')
      .order('criado_em', { ascending: false })
      .then(({ data }) => setOrcamentos(data || []))
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleCreate = async () => {
    const { data } = await supabase
      .from('orcamentos_engenharia')
      .insert({ nome: 'Novo Orçamento', cliente_nome_manual: 'Cliente' })
      .select()
      .single()
    if (data) navigate(`/orcamentos/${data.id}`)
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (!window.confirm('Tem certeza que deseja excluir este orçamento?')) return

    const { error } = await supabase.from('orcamentos_engenharia').delete().eq('id', id)
    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Orçamento excluído' })
      loadData()
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calculator className="w-6 h-6" /> Orçamentos e Materiais por Projeto
        </h1>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" /> Novo Orçamento
        </Button>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome do Projeto</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data de Criação</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orcamentos.map((orc) => (
              <TableRow
                key={orc.id}
                className="cursor-pointer hover:bg-accent/50"
                onClick={() => navigate(`/orcamentos/${orc.id}`)}
              >
                <TableCell className="font-medium text-lg">{orc.nome}</TableCell>
                <TableCell>
                  {orc.cliente_nome_manual || orc.clientes?.nome || 'Sem cliente'}
                </TableCell>
                <TableCell>
                  <span className="bg-accent/50 px-3 py-1 rounded-full text-xs font-medium">
                    {orc.status}
                  </span>
                </TableCell>
                <TableCell>{format(new Date(orc.criado_em), 'dd/MM/yyyy')}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/orcamentos/${orc.id}`)
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={(e) => handleDelete(e, orc.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {orcamentos.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="p-12 text-center text-muted-foreground">
                  Nenhum orçamento encontrado. Crie o primeiro!
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
