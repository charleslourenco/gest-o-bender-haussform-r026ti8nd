import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Edit2, Trash2 } from 'lucide-react'

interface TemplatesTableProps {
  templates: any[]
  onEdit: (t: any) => void
  onRefresh: () => void
}

export function TemplatesTable({ templates, onEdit, onRefresh }: TemplatesTableProps) {
  const { toast } = useToast()

  const handleDelete = async (tpl: any) => {
    if (!window.confirm('Tem certeza que deseja deletar este template?')) return
    try {
      if (tpl.arquivo_url && !tpl.arquivo_url.startsWith('http')) {
        await supabase.storage.from('bender_templates').remove([tpl.arquivo_url])
      }
      const { error } = await supabase.from('templates').delete().eq('id', tpl.id)
      if (error) throw error
      toast({
        title: 'Deletado com sucesso',
        className: 'bg-dark-denim text-off-white border-none',
      })
      onRefresh()
    } catch (err: any) {
      toast({ title: 'Erro ao deletar', description: err.message, variant: 'destructive' })
    }
  }

  if (templates.length === 0) {
    return <div className="text-center p-8 text-midnight-navy/60">Nenhum template cadastrado.</div>
  }

  return (
    <div className="border border-steel-blue/20 rounded-lg overflow-hidden">
      <Table>
        <TableHeader className="bg-pale-cornflower">
          <TableRow>
            <TableHead className="font-semibold text-midnight-navy">Nome</TableHead>
            <TableHead className="font-semibold text-midnight-navy">Tipo</TableHead>
            <TableHead className="font-semibold text-midnight-navy">Status</TableHead>
            <TableHead className="text-right font-semibold text-midnight-navy">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {templates.map((tpl) => (
            <TableRow
              key={tpl.id}
              className="border-b-steel-blue/20 bg-off-white hover:bg-pale-cornflower/30"
            >
              <TableCell className="font-medium text-midnight-navy">
                {tpl.nome}
                {tpl.descricao && (
                  <p className="text-xs text-midnight-navy/60 font-normal">{tpl.descricao}</p>
                )}
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className="bg-steel-blue/10 text-midnight-navy border-steel-blue/30"
                >
                  {tpl.tipo}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={
                    tpl.status === 'ativo'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      : 'bg-gray-100 text-gray-800 border-gray-200'
                  }
                >
                  {tpl.status === 'ativo' ? 'Ativo' : 'Inativo'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(tpl)}
                    className="text-steel-blue hover:text-dark-denim hover:bg-pale-cornflower"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(tpl)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
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
  )
}
