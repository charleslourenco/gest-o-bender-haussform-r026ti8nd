import { useState, useEffect } from 'react'
import {
  fetchProducaoArquivados,
  desarquivarProducao,
  fetchMontagemArquivados,
  desarquivarMontagem,
  fetchAnaliseArquivados,
  desarquivarAnalise,
} from '@/services/arquivamento'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface KanbanArquivadosProps {
  archiveFlag: 'arquivado_producao' | 'arquivado_montagem' | 'arquivado_analise'
}

export function KanbanArquivados({ archiveFlag }: KanbanArquivadosProps) {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const isProducao = archiveFlag === 'arquivado_producao'
  const isAnalise = archiveFlag === 'arquivado_analise'
  const fetchData = isProducao
    ? fetchProducaoArquivados
    : isAnalise
      ? fetchAnaliseArquivados
      : fetchMontagemArquivados
  const unarchiveFn = isProducao
    ? desarquivarProducao
    : isAnalise
      ? desarquivarAnalise
      : desarquivarMontagem

  const loadData = async () => {
    try {
      setLoading(true)
      const data = await fetchData()
      setItems(data || [])
    } catch (e: any) {
      toast.error('Erro ao carregar arquivados: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [archiveFlag])

  const handleUnarchive = async (id: string) => {
    try {
      await unarchiveFn(id)
      toast.success('Item desarquivado com sucesso!')
      loadData()
    } catch (e: any) {
      toast.error('Erro ao desarquivar: ' + e.message)
    }
  }

  const getClienteNome = (item: any) => {
    if (item?.clientes?.nome) return item.clientes.nome
    if (item?.formulario_comercial?.nome_cliente) return item.formulario_comercial.nome_cliente
    if (item?.formulario_comercial?.clientes?.nome) return item.formulario_comercial.clientes.nome
    return 'Avulso'
  }

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground font-medium">Carregando...</div>
  }

  return (
    <div className="p-4 h-full overflow-auto">
      <div className="bg-card rounded-md shadow-sm border border-border overflow-hidden">
        <Table>
          <TableHeader className="bg-card">
            <TableRow className="hover:bg-card border-border">
              <TableHead className="text-white font-semibold">Código</TableHead>
              <TableHead className="text-white font-semibold">Cliente</TableHead>
              <TableHead className="text-white font-semibold">Ambiente</TableHead>
              <TableHead className="text-white font-semibold">Status</TableHead>
              <TableHead className="text-white font-semibold">Data</TableHead>
              <TableHead className="text-white font-semibold text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhum item arquivado.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow
                  key={item.id}
                  className="bg-card hover:bg-muted/50 text-card-foreground border-b border-border"
                >
                  <TableCell className="font-medium whitespace-nowrap">
                    {item?.codigo_rastreio || '-'}
                  </TableCell>
                  <TableCell className="font-medium">{getClienteNome(item)}</TableCell>
                  <TableCell>{item?.nome_produto ?? 'Sem nome'}</TableCell>
                  <TableCell className="text-sm">{item?.status_analise || '-'}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {item?.atualizado_em ? format(new Date(item.atualizado_em), 'dd/MM/yyyy') : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUnarchive(item.id)}
                      className="text-primary hover:text-primary/80 hover:bg-primary/5"
                    >
                      <RotateCcw className="w-4 h-4 mr-1" />
                      Desarquivar
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
