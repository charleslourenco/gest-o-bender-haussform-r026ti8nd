import { useState, useEffect } from 'react'
import { fetchAcompanhamentosArquivados, desarquivarAcompanhamento } from '@/services/arquivamento'
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
import { RotateCcw } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'

export function AcompanhamentosArquivados() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const loadData = async () => {
    try {
      setLoading(true)
      const data = await fetchAcompanhamentosArquivados()
      setItems(data || [])
    } catch (e: any) {
      toast({ description: 'Erro ao carregar arquivados: ' + e.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleUnarchive = async (id: string) => {
    try {
      await desarquivarAcompanhamento(id)
      toast({ description: 'Acompanhamento desarquivado com sucesso!' })
      loadData()
    } catch (e: any) {
      toast({ description: 'Erro ao desarquivar: ' + e.message, variant: 'destructive' })
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Carregando...</div>
  }

  return (
    <div className="border rounded-md overflow-auto">
      <Table>
        <TableHeader className="sticky top-0 bg-background z-10">
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Data</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium font-mono text-xs">{item.codigo_projeto}</TableCell>
              <TableCell>{item.nome_cliente}</TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {item.tipo_acompanhamento}
              </TableCell>
              <TableCell>
                <Badge variant="outline">{item.status_atual}</Badge>
              </TableCell>
              <TableCell className="text-sm">
                {format(new Date(item.data_atualizacao), 'dd/MM/yyyy')}
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" onClick={() => handleUnarchive(item.id)}>
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Desarquivar
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {items.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                Nenhum acompanhamento arquivado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
