import { useState, useEffect } from 'react'
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
import { useToast } from '@/hooks/use-toast'
import { FileText, Plus, Edit, Trash2 } from 'lucide-react'

export default function OrcamentosEngenhariaList() {
  const [orcamentos, setOrcamentos] = useState<any[]>([])
  const { toast } = useToast()

  const load = async () => {
    const { data } = await supabase
      .from('orcamentos_engenharia')
      .select('*, cliente:clientes(nome)')
      .order('criado_em', { ascending: false })
    if (data) setOrcamentos(data)
  }

  useEffect(() => {
    load()
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este orçamento?')) return
    await supabase.from('orcamentos_engenharia').delete().eq('id', id)
    load()
  }

  const exportPdf = async (id: string, format: string) => {
    toast({ title: 'Gerando PDF...', description: 'Aguarde um instante.' })
    const { data, error } = await supabase.functions.invoke('export-pdf-document', {
      body: { orcamento_id: id, format },
    })

    if (error || !data?.pdfBase64) {
      return toast({ title: 'Erro', description: 'Falha ao gerar o PDF.', variant: 'destructive' })
    }

    const link = document.createElement('a')
    link.href = `data:application/pdf;base64,${data.pdfBase64}`
    link.download = `Orcamento_${format}_${id.substring(0, 8)}.pdf`
    link.click()
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-midnight-navy">Orçamentos de Engenharia</h1>
          <p className="text-sm text-gray-500">Gerencie orçamentos, cotações e gere PDFs.</p>
        </div>
        <Button asChild>
          <Link to="/orcamentos/novo">
            <Plus className="w-4 h-4 mr-2" /> Novo Orçamento
          </Link>
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome do Projeto</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Modo</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orcamentos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  Nenhum orçamento encontrado.
                </TableCell>
              </TableRow>
            ) : (
              orcamentos.map((orc) => (
                <TableRow key={orc.id}>
                  <TableCell className="font-medium">{orc.nome}</TableCell>
                  <TableCell>{orc.cliente?.nome || 'Não Vinculado'}</TableCell>
                  <TableCell>{orc.status}</TableCell>
                  <TableCell className="capitalize">{orc.modo_preco || 'Vista'}</TableCell>
                  <TableCell>{new Date(orc.criado_em).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportPdf(orc.id, 'analytic')}
                      title="Exportar Analítico"
                    >
                      <FileText className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportPdf(orc.id, 'synthetic')}
                      title="Exportar Sintético"
                    >
                      <FileText className="w-4 h-4 text-blue-600" />
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/orcamentos/${orc.id}`}>
                        <Edit className="w-4 h-4" />
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(orc.id)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
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
