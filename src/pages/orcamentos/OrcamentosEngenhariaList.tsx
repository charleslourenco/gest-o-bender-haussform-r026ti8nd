import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Trash2, Plus, Edit, FileText } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useToast } from '@/hooks/use-toast'

export default function OrcamentosEngenhariaList() {
  const [orcamentos, setOrcamentos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const fetchOrcamentos = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('orcamentos_engenharia')
      .select('*, cliente:clientes(nome)')
      .order('criado_em', { ascending: false })

    if (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os orçamentos',
        variant: 'destructive',
      })
    } else {
      setOrcamentos(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchOrcamentos()
  }, [])

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('orcamentos_engenharia').delete().eq('id', id)
    if (error) {
      toast({ title: 'Erro', description: 'Erro ao excluir orçamento', variant: 'destructive' })
    } else {
      toast({ title: 'Sucesso', description: 'Orçamento excluído com sucesso' })
      fetchOrcamentos()
    }
  }

  return (
    <div className="h-[calc(100vh-2rem)] md:h-screen flex flex-col bg-off-white p-6 space-y-6 animate-in fade-in duration-300">
      <div className="bg-midnight-navy p-6 rounded-xl shadow-sm shrink-0 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <FileText className="h-10 w-10 text-emerald-400 hidden sm:block" />
          <div>
            <h1 className="text-off-white font-bold text-[32px]">Orçamentos</h1>
            <p className="text-pale-cornflower mt-1">Gestão de orçamentos de engenharia</p>
          </div>
        </div>
        <Button asChild className="bg-emerald-500 hover:bg-emerald-600 text-white">
          <Link to="/orcamentos/novo">
            <Plus className="w-4 h-4 mr-2" /> Novo Orçamento
          </Link>
        </Button>
      </div>

      <div className="flex-1 overflow-hidden min-h-0 bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="overflow-auto h-full p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data de Criação</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-gray-500">
                    Carregando orçamentos...
                  </TableCell>
                </TableRow>
              ) : orcamentos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-gray-500">
                    Nenhum orçamento encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                orcamentos.map((orc) => {
                  const clienteNome = Array.isArray(orc.cliente)
                    ? orc.cliente[0]?.nome
                    : orc.cliente?.nome
                  return (
                    <TableRow key={orc.id}>
                      <TableCell className="font-medium">{orc.nome}</TableCell>
                      <TableCell>{clienteNome || orc.cliente_nome_manual || '-'}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800">
                          {orc.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        {format(new Date(orc.criado_em), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="icon" asChild>
                            <Link to={`/orcamentos/${orc.id}`}>
                              <Edit className="w-4 h-4 text-gray-600" />
                            </Link>
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                className="hover:bg-red-50 hover:text-red-600 border-red-200"
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Tem certeza que deseja excluir este orçamento?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita. O orçamento "{orc.nome}" será
                                  permanentemente removido do sistema.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-red-500 hover:bg-red-600"
                                  onClick={() => handleDelete(orc.id)}
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
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
    </div>
  )
}
