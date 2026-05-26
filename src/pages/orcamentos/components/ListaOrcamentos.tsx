import { useState, useEffect } from 'react'
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
import { Trash2, FileText, Eye, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Link } from 'react-router-dom'
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

export default function ListaOrcamentos({ onNovo }: { onNovo: () => void }) {
  const [orcamentos, setOrcamentos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const fetchOrcamentos = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('orcamentos')
        .select(`
          id,
          nome,
          valor_total,
          status,
          data_criacao,
          clientes ( nome )
        `)
        .order('data_criacao', { ascending: false })

      if (error) throw error
      setOrcamentos(data || [])
    } catch (err: any) {
      toast.error('Erro ao carregar orçamentos: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrcamentos()
  }, [])

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      const { error: errItens } = await supabase
        .from('itens_orcamento')
        .delete()
        .eq('orcamento_id', deleteId)
      if (errItens) throw errItens

      const { error } = await supabase.from('orcamentos').delete().eq('id', deleteId)
      if (error) throw error

      toast.success('Orçamento excluído com sucesso')
      setOrcamentos((prev) => prev.filter((o) => o.id !== deleteId))
    } catch (err: any) {
      toast.error('Erro ao excluir: ' + err.message)
    } finally {
      setDeleteId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Orçamentos Recentes</h2>
        <Button onClick={onNovo}>Criar Novo Orçamento</Button>
      </div>

      {loading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : orcamentos.length === 0 ? (
        <div className="text-center p-12 border border-dashed rounded-lg bg-muted/20">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">Nenhum orçamento encontrado</h3>
          <p className="text-muted-foreground mb-4">
            Você ainda não possui orçamentos cadastrados.
          </p>
          <Button onClick={onNovo} variant="outline">
            Criar meu primeiro orçamento
          </Button>
        </div>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título / Referência</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Valor Total</TableHead>
                <TableHead className="w-[100px] text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orcamentos.map((orc) => (
                <TableRow key={orc.id}>
                  <TableCell className="font-medium">{orc.nome || 'Sem título'}</TableCell>
                  <TableCell>{orc.clientes?.nome || 'Cliente não informado'}</TableCell>
                  <TableCell>{new Date(orc.data_criacao).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                      {orc.status || 'Rascunho'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                      orc.valor_total || 0,
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center gap-2">
                      <Button variant="ghost" size="icon" asChild title="Visualizar Detalhes">
                        <Link to={`/orcamentos/${orc.id}`}>
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(orc.id)}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Orçamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir permanentemente este orçamento? Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Sim, Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
