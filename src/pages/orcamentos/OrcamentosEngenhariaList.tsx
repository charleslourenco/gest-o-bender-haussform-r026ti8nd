import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Plus, FileText, FileBarChart, Trash2, Edit, Loader2 } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function OrcamentosEngenhariaList() {
  const [orcamentos, setOrcamentos] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [exportingId, setExportingId] = useState<string | null>(null)

  const loadOrcamentos = async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('orcamentos_engenharia')
      .select(
        '*, clientes(nome), orcamentos_ambientes(orcamentos_itens(quantidade, custo_unitario))',
      )
      .order('criado_em', { ascending: false })

    if (error) {
      toast.error('Erro ao carregar orçamentos: ' + error.message)
    } else {
      setOrcamentos(data || [])
    }
    setIsLoading(false)
  }

  useEffect(() => {
    loadOrcamentos()
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este orçamento?')) return
    const { error } = await supabase.from('orcamentos_engenharia').delete().eq('id', id)
    if (error) {
      toast.error('Erro ao excluir: ' + error.message)
    } else {
      toast.success('Orçamento excluído!')
      loadOrcamentos()
    }
  }

  const handleExportPdf = async (id: string, format: 'analytic' | 'synthetic') => {
    try {
      setExportingId(id)
      const { data, error } = await supabase.functions.invoke('export-pdf-document', {
        body: { orcamento_id: id, format },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)

      const linkSource = `data:application/pdf;base64,${data.pdfBase64}`
      const downloadLink = document.createElement('a')
      downloadLink.href = linkSource
      downloadLink.download = `Orcamento_${format}_${id.substring(0, 8)}.pdf`
      downloadLink.click()
      toast.success('PDF gerado com sucesso!')
    } catch (e: any) {
      toast.error('Erro ao gerar PDF: ' + e.message)
    } finally {
      setExportingId(null)
    }
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  const getValorVista = (orc: any) => {
    let custo = 0
    orc.orcamentos_ambientes?.forEach((amb: any) => {
      amb.orcamentos_itens?.forEach((it: any) => {
        custo += (Number(it.custo_unitario) || 0) * (Number(it.quantidade) || 0)
      })
    })
    return custo / (orc.markup_divisor_vista || 0.4)
  }

  return (
    <div className="flex-1 p-6 space-y-6 bg-gray-50/50 h-full overflow-auto">
      <div className="flex justify-between items-center bg-[#0B1A28] text-white p-6 rounded-xl shadow-lg">
        <div>
          <h1 className="text-2xl font-bold">Orçamentos de Engenharia</h1>
          <p className="text-gray-300">Gerencie projetos e precificação</p>
        </div>
        <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Link to="/orcamentos/novo">
            <Plus className="w-4 h-4 mr-2" />
            Novo Orçamento
          </Link>
        </Button>
      </div>

      <div className="bg-white rounded-xl border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome do Projeto</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Valor Total (À Vista)</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : orcamentos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Nenhum orçamento encontrado.
                </TableCell>
              </TableRow>
            ) : (
              orcamentos.map((orc) => (
                <TableRow key={orc.id}>
                  <TableCell className="font-medium">{orc.nome}</TableCell>
                  <TableCell>{orc.cliente_nome_manual || orc.clientes?.nome || 'N/I'}</TableCell>
                  <TableCell>{new Date(orc.criado_em).toLocaleDateString('pt-BR')}</TableCell>
                  <TableCell className="font-medium text-emerald-700">
                    {formatCurrency(getValorVista(orc))}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExportPdf(orc.id, 'analytic')}
                        disabled={exportingId === orc.id}
                        title="Exportar Analítico"
                      >
                        {exportingId === orc.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                        ) : (
                          <FileText className="w-4 h-4 text-blue-600" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExportPdf(orc.id, 'synthetic')}
                        disabled={exportingId === orc.id}
                        title="Exportar Sintético"
                      >
                        {exportingId === orc.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                        ) : (
                          <FileBarChart className="w-4 h-4 text-emerald-600" />
                        )}
                      </Button>
                      <Button variant="outline" size="sm" asChild title="Editar">
                        <Link to={`/orcamentos/${orc.id}`}>
                          <Edit className="w-4 h-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(orc.id)}
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
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
  )
}
